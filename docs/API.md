# REST API Specification

The Omniverse API exposes RESTful endpoints adhering to standard HTTP semantics. All responses are formatted in a predictable JSON envelope.

---

## 1. Response Envelope Format

### Successful Response (`2xx`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive status message"
}
```

### Error Response (`4xx` / `5xx`)
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | RATE_LIMITED | INTERNAL_ERROR",
    "message": "Human-readable explanation of error",
    "details": {}
  }
}
```

---

## 2. Authentication & Session Endpoints

### Register User
- **Method & Path**: `POST /api/auth/register`
- **Rate Limit**: 5 requests / 60 seconds
- **Request Body**:
  ```json
  {
    "name": "Jane Reader",
    "email": "jane@example.com",
    "password": "StrongPassword!123"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "email": "jane@example.com",
        "name": "Jane Reader",
        "role": "USER"
      },
      "token": "jwt_token"
    }
  }
  ```

### Email & Password Login
- **Method & Path**: `POST /api/auth/login`
- **Rate Limit**: 10 requests / 60 seconds
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "StrongPassword!123"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "email": "jane@example.com", "name": "Jane Reader", "role": "USER" },
      "token": "jwt_token"
    }
  }
  ```
  *Sets `Set-Cookie: session_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/`*

### Phone OTP Request
- **Method & Path**: `POST /api/auth/phone/request-otp`
- **Request Body**:
  ```json
  { "phone": "+1234567890" }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": { "message": "OTP dispatched successfully.", "expiresIn": 300 }
  }
  ```

### Phone OTP Verification
- **Method & Path**: `POST /api/auth/phone/verify-otp`
- **Request Body**:
  ```json
  {
    "phone": "+1234567890",
    "otp": "482910",
    "name": "Jane Reader (Optional for new registrations)"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": { "user": { ... }, "token": "jwt_token" }
  }
  ```

### Google Sign-In & Account Linking
- **Method & Path**: `POST /api/auth/google`
- **Request Body**:
  ```json
  { "idToken": "google_jwt_identity_token" }
  ```

### Logout & Global Revocation
- **Method & Path**: `POST /api/auth/logout` — Terminates current device session cookie.
- **Method & Path**: `POST /api/auth/logout-all` — Invalidates all active session rows in DB.

---

## 3. Catalog & Content Endpoints

### Homepage Feed
- **Method & Path**: `GET /api/content/feed`
- **Response** (`200 OK`): Returns `featured`, `trendingComics`, `popularNovels`, `popularAudiobooks`, `newReleases`, and `popularAuthors`.

### Global Catalog Search
- **Method & Path**: `GET /api/content`
- **Query Parameters**:
  - `q`: Search keyword
  - `type`: `COMIC` | `NOVEL` | `SHORT_STORY` | `AUDIOBOOK`
  - `genre`: Genre slug (e.g., `action`, `fantasy`)
  - `lang`: Language code (default: `en`)
  - `premium`: `true` | `false`
  - `minRating`: Number (`1.0` to `5.0`)
  - `status`: `ONGOING` | `COMPLETED`
  - `sort`: `relevance` | `newest` | `popular` | `rating`
  - `page`: Page index (default: `1`)
  - `limit`: Page size (default: `16`)

### Content Detail
- **Method & Path**: `GET /api/content/[slug]`
- **Response** (`200 OK`): Content metadata, genres, author profile, published chapters, and user access state (`hasAccess`, `isInLibrary`, `libraryShelf`, `progress`).

### Chapter Reader & Entitlement Gateway
- **Method & Path**: `GET /api/content/[slug]/chapters/[chapterNumber]`
- **Authentication**: Optional for free chapters; Mandatory for premium chapters.
- **Errors**:
  - `402 PAYMENT_REQUIRED`: User does not hold an active subscription or purchase entitlement.
  - `404 NOT_FOUND`: Chapter or content does not exist.
- **Response** (`200 OK`):
  - For Comics: `{ chapter, pages: [{ pageNumber, imageUrl, width, height }], navigation }`
  - For Novels: `{ chapter, textContent, navigation }`
  - For Audiobooks: `{ chapter, audio: { audioUrl, durationSeconds, bitRate }, navigation }`

---

## 4. Reading Progress & Library Endpoints

### Save Reading / Listening Progress
- **Method & Path**: `POST /api/reading/progress`
- **Request Body**:
  ```json
  {
    "contentId": "uuid",
    "chapterId": "uuid",
    "pageNumber": 27,
    "audioPositionSeconds": 480,
    "percentCompleted": 67.5
  }
  ```

### Resume Progress
- **Method & Path**: `GET /api/reading/resume/[contentId]`
- **Response** (`200 OK`): Last accessed chapter, page, or timestamp.

### User Library Shelves
- **Method & Path**: `GET /api/library?shelf=CURRENTLY_READING`
- **Shelves**: `CURRENTLY_READING`, `COMPLETED`, `SAVED`, `PURCHASED`, `AUDIOBOOKS`.
- **Add / Update Shelf**: `POST /api/library` (`{ contentId, shelf }`).
- **Remove from Library**: `DELETE /api/library/[contentId]`.

### Bookmarks
- **Method & Path**: `GET /api/bookmarks` — List all user bookmarks.
- **Method & Path**: `POST /api/bookmarks` — Create bookmark (`{ contentId, chapterId, pageNumber, audioTimestamp, note }`).
- **Method & Path**: `DELETE /api/bookmarks/[id]` — Delete bookmark.

---

## 5. Payments, Subscriptions & Webhooks

### Create Checkout Order
- **Method & Path**: `POST /api/payments/orders`
- **Request Body**:
  ```json
  {
    "type": "SUBSCRIPTION | CHAPTER_PURCHASE | CONTENT_PURCHASE",
    "plan": "MONTHLY_PREMIUM | ANNUAL_PREMIUM",
    "contentId": "uuid (if purchasing content)",
    "chapterId": "uuid (if purchasing chapter)"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "orderNumber": "ORD-1728139281-XYZ",
    "amountCents": 999,
    "currency": "USD",
    "providerOrderId": "order_mock_123",
    "razorpayKeyId": "rzp_test_key"
  }
  ```

### Verify Payment (Server-Side HMAC)
- **Method & Path**: `POST /api/payments/verify`
- **Request Body**:
  ```json
  {
    "orderNumber": "ORD-1728139281-XYZ",
    "providerPaymentId": "pay_mock_123",
    "providerSignature": "hmac_signature"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Payment verified and entitlement unlocked.",
    "subscriptionStatus": "ACTIVE"
  }
  ```

### Payment Gateway Webhook
- **Method & Path**: `POST /api/payments/webhook`
- **Headers**: `x-razorpay-signature: <signature>`
- **Processing**: Verifies payload signature, validates idempotency against existing `Payment` rows, transitions `Order` to `SUCCESS`, and provisions access.

---

## 6. Privacy & User Governance Endpoints

### Update Privacy Settings
- **Method & Path**: `PUT /api/users/me/privacy`
- **Request Body**:
  ```json
  {
    "isProfilePublic": false,
    "showReadingActivity": false,
    "showReviews": true,
    "allowMarketing": false
  }
  ```

### GDPR / CCPA Data Export
- **Method & Path**: `GET /api/users/me/export`
- **Response** (`200 OK`): Complete JSON package containing user profile, reading history, bookmarks, library shelves, reviews, and transaction records.

### Account Deletion & PII Anonymization
- **Method & Path**: `DELETE /api/users/me`
- **Action**: Nullifies sensitive PII, sets status to `DELETED`, wipes identities, removes active sessions, and preserves non-identifiable financial ledger records for statutory legal audit compliance.
