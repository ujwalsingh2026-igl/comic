# Environment Variables & Configuration Reference

This document outlines all environment variables utilized across the Omniverse platform, their security sensitivities, default fallbacks, and configuration best practices.

---

## 1. Environment Variable Catalog

| Variable | Required in Prod | Default (Dev) | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `development` | Runtime mode (`development`, `production`, `test`). |
| `PORT` | No | `3000` | HTTP port for Next.js web application. |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Public URL for asset routing and OAuth callbacks. |
| `DATABASE_URL` | Yes | `""` (Uses embedded PGlite) | PostgreSQL connection URI (`postgresql://user:pass@host:5432/dbname?sslmode=require`). |
| `REDIS_URL` | Recommended | `""` (In-memory fallback) | Redis connection URI (`redis://:password@host:6379`). |
| `JWT_SECRET` | Yes | `development_super_secret_jwt_key_...` | High-entropy string (min 32 chars) for signing session tokens. |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime duration string. |
| `RAZORPAY_KEY_ID` | Yes | `rzp_test_mock_key` | Razorpay public API key used by checkout frontend. |
| `RAZORPAY_KEY_SECRET` | Yes | `rzp_test_mock_secret` | Razorpay private secret used for HMAC verification. |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | `rzp_webhook_secret_mock` | Secret used to verify incoming webhook signatures. |
| `GOOGLE_CLIENT_ID` | If OAuth used | `""` | Google Cloud OAuth 2.0 Web Application Client ID. |
| `GOOGLE_CLIENT_SECRET` | If OAuth used | `""` | Google Cloud OAuth 2.0 Client Secret. |
| `SMS_GATEWAY_URL` | If SMS used | `""` | Endpoint for external SMS dispatch provider (e.g., Twilio / Fast2SMS). |
| `SMS_GATEWAY_API_KEY` | If SMS used | `""` | Bearer token / API key for SMS gateway provider. |
| `STORAGE_BUCKET_NAME` | Yes | `omniverse-media-dev` | Cloud storage bucket name for chapters and audio files. |
| `STORAGE_ENDPOINT` | If S3/R2 | `""` | Custom S3/Cloudflare R2 compatible endpoint URL. |
| `STORAGE_ACCESS_KEY` | Yes | `""` | Object storage IAM access key. |
| `STORAGE_SECRET_KEY` | Yes | `""` | Object storage IAM secret key. |

---

## 2. Sample `.env` Template

```ini
# Core Runtime
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Relational Database (Leave blank to use embedded PGlite during development)
DATABASE_URL=

# Cache / Rate Limiter (Optional in local development)
REDIS_URL=

# Cryptographic Token Keys (MUST BE CHANGED FOR PRODUCTION)
JWT_SECRET=super_secret_jwt_key_for_development_replace_in_production_min_32_chars
JWT_EXPIRES_IN=7d

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=rzp_test_mock_key
RAZORPAY_KEY_SECRET=rzp_test_mock_secret
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_secret_mock

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# External Media Storage
STORAGE_BUCKET_NAME=omniverse-media-dev
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
```

---

## 3. Secret Rotation Procedures

### Rotating `JWT_SECRET`
1. Update `JWT_SECRET` on server environment variables.
2. Trigger application reload.
3. Users will be asked to re-authenticate on their next request (or implement dual-key grace periods if zero-disruption session rotation is required).

### Rotating `RAZORPAY_KEY_SECRET`
1. Generate new API Key & Secret in Razorpay Dashboard.
2. Add new key to server environment variables.
3. Test a mock order creation on staging.
4. Revoke old key in Razorpay Dashboard.
