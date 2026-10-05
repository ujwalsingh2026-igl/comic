# Administrator Operational & Governance Guide

This guide describes operational workflows for administrators and platform moderators navigating the Omniverse administrative control plane (`/admin`).

---

## 1. Accessing the Admin Console

The administration dashboard is protected by Role-Based Access Control (RBAC). Only authenticated users with the `ADMIN` role can access `/admin` and execute administrative API actions under `/api/admin/*`.

### Initial Administrator Account
Upon running `npm run seed`, the default administrator account is generated:
- **Email**: `admin@platform.com`
- **Password**: `Admin@12345`

*Note: Change this password immediately in production after initial system deployment.*

---

## 2. Dashboard Metrics & Analytics

The `/admin` overview displays real-time health and commercial indicators:
- **Gross Revenue**: Sum of all captured order amounts.
- **Active Subscriptions**: Count of ongoing monthly and annual active subscriber accounts.
- **Total Registered Users**: Community size including active readers.
- **Published Catalog Items**: Real-time count of active comics, novels, short stories, and audiobooks.
- **Total Published Chapters**: Total volume of content installments available.

---

## 3. User Governance & Moderation

From the **User Management** tab:
1. **Inspecting Accounts**: View user emails, registration dates, verification statuses, and current assigned roles.
2. **Assigning Roles**:
   - `USER`: Regular reader privileges.
   - `MODERATOR`: Content curation, review flagging, and author verification.
   - `ADMIN`: Complete administrative control, billing access, and refunds.
3. **Suspensions & Bans**:
   - Change user status to `SUSPENDED` to revoke access.
   - When suspended, active sessions are immediately rejected by authentication middleware.

---

## 4. Processing Refunds

From the **Refunds** panel or `/api/admin/refunds`:
1. Look up the customer's `orderNumber`.
2. Confirm the reason for refund (e.g., accidental purchase, technical playback error).
3. Specify refund amount (partial or full).
4. The system executes the following atomic operations:
   - Registers a `Refund` record with administrative attribution.
   - Updates `Order` status to `REFUNDED`.
   - Automatically revokes associated `Entitlement` or `Subscription` records.
   - Writes an unalterable event entry to the `AuditLog`.

---

## 5. Security & Audit Trail Inspection

The **Audit Logs** tab exposes system events in chronological order:
- **Recorded Events**:
  - `USER_REGISTERED`
  - `USER_LOGIN`
  - `PAYMENT_ORDER_CREATED`
  - `PAYMENT_VERIFIED`
  - `REFUND_PROCESSED`
  - `USER_STATUS_UPDATED`
  - `USER_ROLE_UPDATED`
  - `USER_DELETED_GDPR`
- **Forensic Attributes**:
  - User ID and actor identity
  - Action classification and resource affected
  - Client IP address and User Agent
  - Scrubbed metadata (all credentials and secret tokens are stripped before persistence)
