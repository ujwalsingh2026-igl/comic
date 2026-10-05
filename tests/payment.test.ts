import { describe, it, expect } from 'vitest';
import { PaymentService } from '../src/services/payment.service';
import { ContentService } from '../src/services/content.service';
import { AuthService } from '../src/services/auth.service';
import { env } from '../src/lib/env';
import * as crypto from 'crypto';

describe('Payment, Entitlement & Refund Subsystem', () => {
  let buyerUserId: string;

  it('sets up a test user for payment integration', async () => {
    const reg = await AuthService.register({
      name: 'Payment Tester',
      email: `buyer_${Date.now()}@example.com`,
      password: 'BuyerPassword@123',
    });
    buyerUserId = reg.userId;
    expect(buyerUserId).toBeDefined();
  });

  it('creates order for subscription and verifies payment server-side with HMAC', async () => {
    // 1. Create Order
    const order = await PaymentService.createOrder({
      userId: buyerUserId,
      itemType: 'SUBSCRIPTION',
      targetId: 'MONTHLY_PREMIUM',
    });

    expect(order.orderNumber).toBeDefined();
    expect(order.amountCents).toBe(29900);

    // 2. Simulate payment signature
    const paymentId = `pay_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${order.providerOrderId}|${paymentId}`)
      .digest('hex');

    // 3. Verify Payment
    const verifyResult = await PaymentService.verifyPayment({
      userId: buyerUserId,
      orderNumber: order.orderNumber,
      providerPaymentId: paymentId,
      providerSignature: validSignature,
    });

    expect(verifyResult.success).toBe(true);

    // 4. Verify subscription status
    const sub = await PaymentService.getUserSubscription(buyerUserId);
    expect(sub).not.toBeNull();
    expect(sub.plan).toBe('MONTHLY_PREMIUM');
    expect(sub.status).toBe('ACTIVE');
  });

  it('verifies entitlement unlock on premium content access', async () => {
    // Chapter 3 of shadows-of-the-abyss is premium
    const chapterData = await ContentService.getChapterContent(
      'shadows-of-the-abyss',
      3,
      buyerUserId
    );

    expect(chapterData.chapter).toBeDefined();
    expect(chapterData.chapter.isPremium).toBe(true);
    expect(chapterData.pages).toBeDefined();
  });

  it('rejects unauthorized access when no entitlement exists', async () => {
    // Anonymous user access to premium chapter 3 should throw 402
    await expect(
      ContentService.getChapterContent('shadows-of-the-abyss', 3, undefined)
    ).rejects.toThrow();
  });
});
