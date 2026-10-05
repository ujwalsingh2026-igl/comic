# Production Deployment & Operations Guide

This guide describes how to deploy, scale, and maintain the Omniverse digital content platform in high-availability production environments.

---

## 1. Production Readiness Checklist

Before deploying publicly:
- [ ] Ensure `NODE_ENV=production` is set in the runtime environment.
- [ ] Replace `JWT_SECRET` with a 256-bit high-entropy secret string.
- [ ] Configure live PostgreSQL connection string in `DATABASE_URL` with SSL (`sslmode=require`).
- [ ] Replace `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` with live production credentials.
- [ ] Configure an external Redis instance (`REDIS_URL`) for distributed caching and rate limiting across multiple instances.
- [ ] Point media storage to AWS S3, Google Cloud Storage, or Cloudflare R2 with pre-signed URL generation.
- [ ] Enable TLS/SSL certificates (via Cloudflare, AWS CloudFront, or Let's Encrypt).
- [ ] Verify CORS, CSP, and security response headers are active.

---

## 2. Containerized Deployment (Docker)

### Dockerfile
```dockerfile
# Multi-stage Docker build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose (Stack with PostgreSQL and Redis)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:secure_db_pass@db:5432/omniverse
      - REDIS_URL=redis://cache:6379
      - JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
      - NEXT_PUBLIC_APP_URL=https://platform.com
    depends_on:
      - db
      - cache

  db:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secure_db_pass
      - POSTGRES_DB=omniverse
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  cache:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

---

## 3. Database Migration Strategy

Run database migrations during deployments using Prisma or SQL migration scripts:

```bash
# Apply schema changes to production PostgreSQL
npx prisma migrate deploy

# Alternatively, execute initial migration SQL
psql $DATABASE_URL -f prisma/migrations/20261005_init/migration.sql
```

For zero-downtime database upgrades:
1. **Expand**: Add new nullable columns or tables.
2. **Deploy**: Release application code that writes to both old and new columns.
3. **Backfill**: Run asynchronous migration scripts to copy historical data.
4. **Contract**: Remove legacy columns after verifying all nodes run new code.

---

## 4. Media Storage & CDN Architecture

Comic chapters (high-resolution WebP/AVIF panels) and audiobook MP3/M4A chunks should never be stored in the relational database or served directly from the application server.

```
+-------------------------------------------------------+
| S3 / Cloudflare R2 Bucket (Private, Non-Public Access)|
+-------------------------------------------------------+
                           ^
                           | (Signed Media Fetch)
+-------------------------------------------------------+
| Cloudflare / AWS CloudFront (CDN Edge Nodes)          |
+-------------------------------------------------------+
                           ^
                           | (Signed URL with 15m Expiration)
+-------------------------------------------------------+
| Authenticated Client Browser                          |
+-------------------------------------------------------+
```

1. **Upload**: Editors upload source files to private object storage buckets.
2. **Access Control**: The `/api/content/[slug]/chapters/[n]` route verifies user entitlement.
3. **Signed Token**: The API generates an ephemeral pre-signed URL (15 minutes time-to-live) granting read access.
4. **Delivery**: The CDN delivers cached, optimized images with byte-range streaming for audio files.

---

## 5. Horizontal Scaling & Monitoring

- **Health Checks**: Configure `/api/auth/me` or `/api/content/feed` as load balancer health check targets.
- **Log Aggregation**: Pipe standard output to Datadog, Grafana Loki, or AWS CloudWatch. PII is automatically redacted by `AuditService`.
- **Metrics**: Track active reader websocket/HTTP connections, payment conversion rates, and database connection pool utilization (`pg.Pool`).
