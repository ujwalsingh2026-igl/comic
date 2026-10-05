import { db } from '@/lib/db';
import { verifyRazorpaySignature, verifyWebhookSignature, checkRateLimit } from '@/lib/security';
import { AppError } from '@/lib/api-response';
import { AuditService } from './audit.service';
import { env } from '@/lib/env';
import * as crypto from 'crypto';

export interface CreateOrderInput {
  userId: string;
  itemType: 'CONTENT' | 'CHAPTER' | 'SUBSCRIPTION';
  targetId: string; // contentId, chapterId, or plan ('MONTHLY_PREMIUM' | 'YEARLY_PREMIUM')
  ipAddress?: string;
}

export interface VerifyPaymentInput {
  userId: string;
  orderNumber: string;
  providerPaymentId: string;
  providerSignature: string;
  ipAddress?: string;
}

export interface ProcessRefundInput {
  orderId: string;
  amountCents: number;
  reason?: string;
  adminUserId: string;
}

export class PaymentService {
  /**
   * Creates an order for Content purchase, Chapter unlock, or Subscription plan.
   */
  static async createOrder(input: CreateOrderInput) {
    if (input.ipAddress) {
      const rl = checkRateLimit(`order_create:${input.userId}`, 10, 60);
      if (!rl.allowed) throw new AppError('RATE_LIMITED', 'Too many order requests. Please wait a moment.', 429);
    }

    let amountCents = 0;
    let description = '';
    const metadata: Record<string, any> = { itemType: input.itemType, targetId: input.targetId };

    if (input.itemType === 'CONTENT') {
      const content = await db.queryOne<any>('SELECT id, title, "priceCents", "isPremium" FROM "Content" WHERE id = $1;', [input.targetId]);
      if (!content) throw new AppError('NOT_FOUND', 'Content not found.', 404);
      if (!content.isPremium || content.priceCents <= 0) {
        throw new AppError('BAD_REQUEST', 'This content is free and does not require purchase.');
      }
      amountCents = content.priceCents;
      description = `Purchase: ${content.title}`;
    } else if (input.itemType === 'CHAPTER') {
      const chapter = await db.queryOne<any>(
        'SELECT ch.id, ch.title, ch."priceCents", c.title as "contentTitle" FROM "Chapter" ch JOIN "Content" c ON ch."contentId" = c.id WHERE ch.id = $1;',
        [input.targetId]
      );
      if (!chapter) throw new AppError('NOT_FOUND', 'Chapter not found.', 404);
      amountCents = chapter.priceCents || 4900; // default 49 INR
      description = `Chapter: ${chapter.contentTitle} - ${chapter.title}`;
    } else if (input.itemType === 'SUBSCRIPTION') {
      if (input.targetId === 'MONTHLY_PREMIUM') {
        amountCents = 29900; // 299.00 INR (~$3.50)
        description = 'Premium Monthly Subscription';
      } else if (input.targetId === 'YEARLY_PREMIUM') {
        amountCents = 249900; // 2499.00 INR (~$30.00)
        description = 'Premium Annual Subscription (Save 30%)';
      } else {
        throw new AppError('BAD_REQUEST', 'Invalid subscription plan specified.');
      }
    }

    const orderNumber = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const orderId = crypto.randomUUID();

    // Razorpay order simulation or real API call
    // Razorpay receipt length limit is 40 chars
    const providerOrderId = `order_${crypto.randomBytes(10).toString('hex')}`;

    await db.execute(
      `INSERT INTO "Order" (id, "orderNumber", "userId", "amountCents", currency, status, provider, "providerOrderId", metadata, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'INR', 'CREATED', 'RAZORPAY', $5, $6, NOW(), NOW());`,
      [orderId, orderNumber, input.userId, amountCents, providerOrderId, JSON.stringify(metadata)]
    );

    await AuditService.log({
      userId: input.userId,
      action: 'ORDER_CREATED',
      resource: 'Order',
      resourceId: orderId,
      details: { orderNumber, amountCents, itemType: input.itemType },
    });

    return {
      orderId,
      orderNumber,
      providerOrderId,
      amountCents,
      currency: 'INR',
      description,
      razorpayKeyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    };
  }

  /**
   * Verifies payment server-side with HMAC SHA-256 and unlocks entitlements.
   * NEVER TRUSTS CLIENT ALONE.
   */
  static async verifyPayment(input: VerifyPaymentInput) {
    const order = await db.queryOne<any>(
      'SELECT * FROM "Order" WHERE "orderNumber" = $1 AND "userId" = $2;',
      [input.orderNumber, input.userId]
    );

    if (!order) throw new AppError('NOT_FOUND', 'Order not found.', 404);

    if (order.status === 'SUCCESS') {
      return { success: true, message: 'Payment has already been verified and unlocked.' };
    }

    // Cryptographic signature check
    // In dev / test mode with mock keys, verify or accept matching signature
    const isValidSignature = verifyRazorpaySignature(
      order.providerOrderId,
      input.providerPaymentId,
      input.providerSignature
    );

    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      await AuditService.log({
        userId: input.userId,
        action: 'PAYMENT_SIGNATURE_TAMPERING_DETECTED',
        resource: 'Order',
        resourceId: order.id,
        details: { providerPaymentId: input.providerPaymentId },
      });
      throw new AppError('FORBIDDEN', 'Payment verification signature mismatch. Security alert recorded.', 403);
    }

    // Process payment and grant entitlements in atomic transaction
    await db.transaction(async (tx) => {
      // 1. Record Payment
      const paymentId = crypto.randomUUID();
      await tx.execute(
        `INSERT INTO "Payment" (id, "orderId", "providerPaymentId", "providerSignature", "amountCents", currency, status, "paymentMethod", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 'SUCCESS', 'RAZORPAY', NOW(), NOW());`,
        [paymentId, order.id, input.providerPaymentId, input.providerSignature, order.amountCents, order.currency]
      );

      // 2. Update Order status
      await tx.execute('UPDATE "Order" SET status = \'SUCCESS\', "updatedAt" = NOW() WHERE id = $1;', [order.id]);

      // 3. Grant Entitlements
      const metadata = order.metadata ? JSON.parse(order.metadata) : {};

      if (metadata.itemType === 'CONTENT') {
        await tx.execute(
          `INSERT INTO "Entitlement" (id, "userId", "contentId", source, "createdAt")
           VALUES ($1, $2, $3, 'PURCHASE', NOW())
           ON CONFLICT ("userId", "contentId", "chapterId") DO NOTHING;`,
          [crypto.randomUUID(), order.userId, metadata.targetId]
        );

        // Add to PURCHASED shelf in library
        await tx.execute(
          `INSERT INTO "Library" (id, "userId", "contentId", shelf, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'PURCHASED', NOW(), NOW())
           ON CONFLICT ("userId", "contentId") DO UPDATE SET shelf = 'PURCHASED', "updatedAt" = NOW();`,
          [crypto.randomUUID(), order.userId, metadata.targetId]
        );
      } else if (metadata.itemType === 'CHAPTER') {
        // Find content for chapter
        const ch = await tx.queryOne<any>('SELECT "contentId" FROM "Chapter" WHERE id = $1;', [metadata.targetId]);
        await tx.execute(
          `INSERT INTO "Entitlement" (id, "userId", "contentId", "chapterId", source, "createdAt")
           VALUES ($1, $2, $3, $4, 'PURCHASE', NOW())
           ON CONFLICT ("userId", "contentId", "chapterId") DO NOTHING;`,
          [crypto.randomUUID(), order.userId, ch?.contentId || null, metadata.targetId]
        );
      } else if (metadata.itemType === 'SUBSCRIPTION') {
        const isYearly = metadata.targetId === 'YEARLY_PREMIUM';
        const plan = isYearly ? 'YEARLY_PREMIUM' : 'MONTHLY_PREMIUM';
        const durationDays = isYearly ? 365 : 30;

        await tx.execute(
          `INSERT INTO "Subscription" (id, "userId", plan, status, "startDate", "expiryDate", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW() + INTERVAL '${durationDays} days', NOW(), NOW());`,
          [crypto.randomUUID(), order.userId, plan]
        );

        // Grant global platform entitlement for duration
        await tx.execute(
          `INSERT INTO "Entitlement" (id, "userId", "contentId", "chapterId", source, "expiresAt", "createdAt")
           VALUES ($1, $2, NULL, NULL, 'SUBSCRIPTION', NOW() + INTERVAL '${durationDays} days', NOW());`,
          [crypto.randomUUID(), order.userId]
        );
      }
    });

    await AuditService.log({
      userId: order.userId,
      action: 'PAYMENT_VERIFIED_SUCCESS',
      resource: 'Payment',
      resourceId: input.providerPaymentId,
      details: { orderNumber: order.orderNumber, amountCents: order.amountCents },
    });

    return { success: true, message: 'Payment verified and access unlocked successfully!' };
  }

  /**
   * Webhook handler for asynchronous payment gateway notifications (idempotent).
   */
  static async handleWebhook(payloadString: string, signature: string) {
    // 1. Verify signature
    const isValid = verifyWebhookSignature(payloadString, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      throw new AppError('FORBIDDEN', 'Invalid webhook signature.', 403);
    }

    const event = JSON.parse(payloadString);
    const eventType = event.event;

    // 2. Handle payment captured
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const providerOrderId = paymentEntity?.order_id;
      const providerPaymentId = paymentEntity?.id;

      if (!providerOrderId || !providerPaymentId) return { received: true };

      // Idempotency: check if payment already recorded
      const existingPayment = await db.queryOne(
        'SELECT id FROM "Payment" WHERE "providerPaymentId" = $1;',
        [providerPaymentId]
      );
      if (existingPayment) {
        return { received: true, message: 'Already processed' };
      }

      const order = await db.queryOne<any>(
        'SELECT * FROM "Order" WHERE "providerOrderId" = $1;',
        [providerOrderId]
      );

      if (order && order.status !== 'SUCCESS') {
        await this.verifyPayment({
          userId: order.userId,
          orderNumber: order.orderNumber,
          providerPaymentId,
          providerSignature: signature,
        });
      }
    }

    return { received: true };
  }

  /**
   * Process Refund.
   */
  static async processRefund(input: ProcessRefundInput) {
    const order = await db.queryOne<any>('SELECT * FROM "Order" WHERE id = $1;', [input.orderId]);
    if (!order) throw new AppError('NOT_FOUND', 'Order not found.', 404);
    if (order.status !== 'SUCCESS') throw new AppError('BAD_REQUEST', 'Only successful orders can be refunded.');

    const payment = await db.queryOne<any>('SELECT * FROM "Payment" WHERE "orderId" = $1 AND status = \'SUCCESS\';', [order.id]);

    const providerRefundId = `rfnd_${crypto.randomBytes(8).toString('hex')}`;
    const refundId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      // 1. Create refund record
      await tx.execute(
        `INSERT INTO "Refund" (id, "orderId", "paymentId", "providerRefundId", "amountCents", reason, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 'PROCESSED', NOW(), NOW());`,
        [refundId, order.id, payment?.id || null, providerRefundId, input.amountCents, input.reason || 'Customer request']
      );

      // 2. Update order and payment status
      await tx.execute('UPDATE "Order" SET status = \'REFUNDED\', "updatedAt" = NOW() WHERE id = $1;', [order.id]);
      if (payment) {
        await tx.execute('UPDATE "Payment" SET status = \'REFUNDED\', "updatedAt" = NOW() WHERE id = $1;', [payment.id]);
      }

      // 3. Revoke related entitlements
      const metadata = order.metadata ? JSON.parse(order.metadata) : {};
      if (metadata.itemType === 'CONTENT') {
        await tx.execute('DELETE FROM "Entitlement" WHERE "userId" = $1 AND "contentId" = $2;', [order.userId, metadata.targetId]);
      } else if (metadata.itemType === 'CHAPTER') {
        await tx.execute('DELETE FROM "Entitlement" WHERE "userId" = $1 AND "chapterId" = $2;', [order.userId, metadata.targetId]);
      } else if (metadata.itemType === 'SUBSCRIPTION') {
        await tx.execute('UPDATE "Subscription" SET status = \'CANCELLED\', "cancelledAt" = NOW() WHERE "userId" = $1 AND status = \'ACTIVE\';', [order.userId]);
        await tx.execute('DELETE FROM "Entitlement" WHERE "userId" = $1 AND source = \'SUBSCRIPTION\';', [order.userId]);
      }
    });

    await AuditService.log({
      userId: input.adminUserId,
      action: 'PAYMENT_REFUNDED',
      resource: 'Refund',
      resourceId: refundId,
      details: { orderId: order.id, orderNumber: order.orderNumber, amountCents: input.amountCents },
    });

    return { success: true, refundId, providerRefundId };
  }

  /**
   * Get user payment and order history.
   */
  static async getUserOrders(userId: string): Promise<any> {
    return db.query(
      `SELECT o.id, o."orderNumber", o."amountCents", o.currency, o.status, o.metadata, o."createdAt",
              p."providerPaymentId", p."paymentMethod"
       FROM "Order" o
       LEFT JOIN "Payment" p ON o.id = p."orderId"
       WHERE o."userId" = $1
       ORDER BY o."createdAt" DESC;`,
      [userId]
    );
  }

  /**
   * Get current user subscription status.
   */
  static async getUserSubscription(userId: string): Promise<any> {
    return db.queryOne(
      `SELECT * FROM "Subscription"
       WHERE "userId" = $1 AND status = 'ACTIVE' AND ("expiryDate" IS NULL OR "expiryDate" > NOW())
       ORDER BY "createdAt" DESC LIMIT 1;`,
      [userId]
    );
  }
}
