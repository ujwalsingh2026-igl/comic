# Security Architecture & Threat Model

The Omniverse platform enforces an enterprise security posture designed to withstand common web vulnerabilities, credential theft, replay attacks, and financial tampering.

---

## 1. Password Security (Argon2id)

Passwords are never stored in plaintext. Passwords are validated for complexity and hashed using Argon2id:

### Password Rules
- Minimum length: 8 characters
- At least one uppercase letter (`[A-Z]`)
- At least one lowercase letter (`[a-z]`)
- At least one number (`[0-9]`)
- At least one special symbol (`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`)

### Argon2id Configuration
```typescript
{
  memoryCost: 19456, // 19 MiB memory footprint (prevents GPU/ASIC parallel brute force)
  timeCost: 2,       // 2 iterations
  outputLen: 32,     // 256-bit hash output
  parallelism: 1
}
```

---

## 2. Payment Verification & Anti-Tampering

A critical tenet of the platform is: **Never trust the frontend for payment success**.

### Cryptographic HMAC-SHA256 Verification
When a payment provider notifies the client or webhook, the backend recalculates the cryptographic signature and uses constant-time comparison to prevent timing attacks:

```typescript
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${orderId}|${paymentId}`);
  const expectedSignature = hmac.digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
```

### Protection Against Double-Spending & Replay
1. **Idempotency Keys**: Payment webhooks query the database for previously captured `providerPaymentId` records before applying state changes.
2. **Atomic Entitlements**: Order fulfillment and entitlement creation execute inside a single transactional block (`db.transaction`).

---

## 3. Session & Authentication Architecture

1. **HttpOnly, Secure Cookies**: JWT tokens are issued in HTTP-only cookies with `SameSite=Lax` and `Secure=true` in production, eliminating token access via clientside JavaScript (mitigating XSS token theft).
2. **Database-Backed Sessions**: Each login event records a session row in the database. When a user requests "Logout from all devices", all session tokens are purged immediately.
3. **Phone OTP Protection**:
   - OTP codes are 6-digit random cryptographically secure numbers.
   - Stored with database timestamps; expiration is enforced at `NOW() > expires_at`.
   - Maximum attempt counter (default: 5) prevents brute-force enumeration.
   - OTP values are marked as consumed immediately upon successful verification.
   - OTP values are strictly excluded from logging.

---

## 4. Rate Limiting Defense

The platform includes a sliding window rate limiter (`SlidingWindowRateLimiter`) targeting high-risk endpoints:

| Endpoint | Window | Max Requests | Purpose |
| :--- | :--- | :--- | :--- |
| `POST /api/auth/login` | 60 sec | 10 | Prevents credential stuffing |
| `POST /api/auth/register` | 60 sec | 5 | Prevents automated bot registrations |
| `POST /api/auth/phone/request-otp` | 60 sec | 3 | Prevents SMS bombing and SMS toll fraud |
| `POST /api/payments/*` | 60 sec | 20 | Prevents card testing attacks |
| `GET /api/content` | 60 sec | 60 | Prevents catalog scraping |

---

## 5. Audit Logging with Automatic PII Scrubbing

The `AuditService` ensures accountability for administrative actions, authentication milestones, and financial operations. 

### PII & Secret Redaction Engine
Before writing to the audit log or console, the service scrubs all keys matching sensitive patterns:
- Passwords (`password`, `passwordHash`, `newPassword`)
- Financial secrets (`secret`, `cvv`, `cardNumber`, `providerSignature`)
- Tokens & codes (`otp`, `token`, `sessionToken`, `refreshToken`)

```typescript
function redactSensitiveData(data: Record<string, any>): Record<string, any> {
  const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'secret', 'otp', 'card', 'cvv'];
  // Recursively replaces values with '[REDACTED]'
}
```

---

## 6. Content Security & Authorizations (RBAC)

Three roles are enforced across all operations:
- `USER`: Regular consumer rights; access to free content and entitled purchases.
- `MODERATOR`: Ability to flag/unflag reviews, inspect content metadata, and moderate author reports.
- `ADMIN`: Full administrative control; access to revenue metrics, role elevation, manual refunds, and system configuration.
