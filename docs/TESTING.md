# Testing Architecture & Verification Guide

The Omniverse platform maintains an automated test suite executed with [Vitest](https://vitest.dev/). Tests cover unit logic, database transactions, cryptographic security functions, and multi-step end-to-end user workflows.

---

## 1. Test Suite Organization

| Test File | Domain | Test Cases |
| :--- | :--- | :--- |
| `tests/security.test.ts` | Cryptography & Security | Password hashing, strength validation, JWT signing/expiry, HMAC timing-safe verification, rate limiting, and PII audit log redaction. |
| `tests/auth.test.ts` | Authentication Subsystem | User registration, password verification, duplicate checks, phone OTP generation & redemption, password reset tokens. |
| `tests/payment.test.ts` | Financials & Entitlements | Subscription ordering, HMAC signature verification, entitlement provisioning, paywall enforcement, and 402 rejection. |
| `tests/content_and_privacy.test.ts` | Catalog & Privacy | Catalog search & filters, reading progress tracking, automatic library updates, bookmark notes, reviews & votes, GDPR data export, and legal-compliant account anonymization. |

---

## 2. Running Automated Tests

### Run Full Test Suite
```bash
npm test
```

### Run Tests in Watch Mode (Development)
```bash
npx vitest
```

### Run Specific Test Suite
```bash
npx vitest run tests/payment.test.ts
```

### Generate Code Coverage Report
```bash
npx vitest run --coverage
```

---

## 3. Key Integration Test Workflows

### 3.1 Payment Verification & Paywall Enforcement
```typescript
// 1. Create order
const order = await PaymentService.createSubscriptionOrder(buyerUserId, 'MONTHLY_PREMIUM');

// 2. Generate matching HMAC signature
const signature = generateTestRazorpaySignature(
  order.providerOrderId,
  'pay_test_999',
  'rzp_test_secret_mock'
);

// 3. Verify server-side
const result = await PaymentService.verifyPayment({
  userId: buyerUserId,
  orderNumber: order.orderNumber,
  providerPaymentId: 'pay_test_999',
  providerSignature: signature,
});
expect(result.success).toBe(true);

// 4. Verify chapter access unlocked
const chapter = await ContentService.getChapterContent('shadows-of-the-abyss', 3, buyerUserId);
expect(chapter.pages).toBeDefined();

// 5. Verify unauthenticated user is rejected
await expect(
  ContentService.getChapterContent('shadows-of-the-abyss', 3, undefined)
).rejects.toThrow();
```

### 3.2 GDPR Account Deletion & Anonymization
```typescript
// Deletes account while retaining non-identifiable financial ledger records
const deletion = await UserService.deleteAccount(testUserId);
expect(deletion.success).toBe(true);

// Verify user profile is scrubbed
const profile = await UserService.getProfile(testUserId);
expect(profile.user.status).toBe('DELETED');
expect(profile.user.name).toBe('Deleted User');
expect(profile.user.email).toBeNull();
```

---

## 4. CI/CD Integration

In continuous integration environments (GitHub Actions, GitLab CI), tests run against Node 20+:

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
```
