# XRPHarbor (`xrpharbor.com`) — Email Notification & Security Setup Guide

This document details the environment variable configuration, Cloudflare DNS authentication records (`SPF`, `DKIM`, `DMARC`, and `Return-Path`), and security architecture for the XRPHarbor transactional email notification system across **Railway** (`xrp-marketplace-backend`) and **Vercel** (`xrp-marketplace-frontend`).

---

## 1. Environment Variables (`.env`)

Configure the following environment variables in **Railway** (for `xrp-marketplace-backend`) and **Vercel** (for `xrp-marketplace-frontend` built-in API fallback):

### Option A: Resend HTTP API (Recommended Primary Transport)

```env
# Primary Transactional Email Provider (Resend REST API over HTTPS — zero external npm dependencies)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Verified Sender Identity on xrpharbor.com
EMAIL_FROM="XRPHarbor Notifications <notifications@xrpharbor.com>"

# Dedicated HMAC-SHA256 Secret for 6-Digit OTP Verification Code Binding
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
EMAIL_OTP_SECRET=replace_with_64_char_hex_csprng_secret

# Canonical Public Application URL (enforced by sanitizeAppUrl() for all email links)
PUBLIC_APP_URL=https://xrpharbor.com
```

### Option B: SMTP / Nodemailer Transport (Optional Fallback)

If `RESEND_API_KEY` is not set, the email service automatically checks for SMTP credentials:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

EMAIL_FROM="XRPHarbor Notifications <notifications@xrpharbor.com>"
EMAIL_OTP_SECRET=replace_with_64_char_hex_csprng_secret
PUBLIC_APP_URL=https://xrpharbor.com
```

### Environment Variable Reference Table

| Variable | Required | Default / Fallback | Description |
| :--- | :--- | :--- | :--- |
| `RESEND_API_KEY` | Recommended | Falls back to SMTP / JSON console log | API key for `https://api.resend.com/emails` HTTPS dispatch. |
| `SMTP_HOST` | Optional | None | SMTP server hostname (used when `RESEND_API_KEY` is unset). |
| `SMTP_PORT` | Optional | `587` (`465` TLS) | SMTP server port (`465` for implicit TLS, `587` for STARTTLS). |
| `SMTP_USER` | Optional | None | SMTP authentication username. |
| `SMTP_PASS` | Optional | None | SMTP authentication password / API token. |
| `EMAIL_FROM` | Required | `XRPHarbor Notifications <notifications@xrpharbor.com>` | RFC 5322 sender header. Must match the verified `xrpharbor.com` domain. |
| `EMAIL_OTP_SECRET` | Required | Falls back to `OTP_HMAC_SECRET` / `JWT_SECRET` | Secret key used for HMAC-SHA256 hashing of 6-digit email OTP codes. |
| `PUBLIC_APP_URL` | Required | `https://xrpharbor.com` | Canonical origin used for CTA buttons (`/orders`, `/settings`) inside emails. |

> **Development / CI Behavior**: If neither `RESEND_API_KEY` nor `SMTP_HOST` is configured, `emailService` never crashes—it logs a structured JSON event (`email_dispatched_console`) with a masked recipient address (`us***@domain.com`) so local development and automated test suites run without external credentials.

---

## 2. Cloudflare DNS Records for `xrpharbor.com`

To guarantee high inbox placement (Gmail, Outlook, ProtonMail, Apple Mail) and enforce strict anti-spoofing for `@xrpharbor.com`, add the following DNS records in the **Cloudflare Dashboard** (`xrpharbor.com` -> **DNS** -> **Records**).

> **Important**: Set Cloudflare Proxy status to **DNS Only (Grey Cloud)** for all email-related `TXT`, `MX`, and `CNAME` records.

### 2.1 SPF (Sender Policy Framework)

Authorizes Resend (and/or your SMTP relay) to send mail on behalf of `xrpharbor.com` and its Return-Path subdomain:

| Type | Name | Content / Value | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- |
| `TXT` | `@` (`xrpharbor.com`) | `v=spf1 include:_spf.resend.com ~all` | Auto | DNS Only |
| `TXT` | `send` (`send.xrpharbor.com`) | `v=spf1 include:amazonses.com ~all` | Auto | DNS Only |

*(If using a custom SMTP provider alongside Resend, include its SPF mechanism before `~all`, e.g., `v=spf1 include:_spf.resend.com include:spf.protection.outlook.com ~all`.)*

### 2.2 DKIM (DomainKeys Identified Mail)

Cryptographically signs outbound emails from `xrpharbor.com` so receiving mail servers can verify authenticity:

| Type | Name | Content / Value | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- |
| `TXT` (or `CNAME`) | `resend._domainkey` (`resend._domainkey.xrpharbor.com`) | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...` *(copy exact RSA/Ed25519 key from Resend Domain Dashboard)* | Auto | DNS Only |

*(For custom SMTP providers that issue selector CNAMEs, add the provider's `s1._domainkey` / `s2._domainkey` `CNAME` or `TXT` records with Proxy Status set to **DNS Only**.)*

### 2.3 Return-Path / Bounce Handling (`send.xrpharbor.com`)

Configures custom Return-Path alignment (`Mail-From` domain) for SPF alignment under DMARC:

| Type | Name | Content / Value | Priority | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `MX` | `send` (`send.xrpharbor.com`) | `feedback-smtp.us-east-1.amazonses.com` *(or region shown in Resend)* | `10` | Auto | DNS Only |
| `TXT` | `send` (`send.xrpharbor.com`) | `v=spf1 include:amazonses.com ~all` | — | Auto | DNS Only |

### 2.4 DMARC (Domain-based Message Authentication, Reporting & Conformance)

Instructs receiving mail servers to quarantine or reject unauthenticated spoofed emails claiming to come from `@xrpharbor.com`:

| Type | Name | Content / Value | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- |
| `TXT` | `_dmarc` (`_dmarc.xrpharbor.com`) | `v=DMARC1; p=quarantine; pct=100; adkim=s; aspf=r; rua=mailto:security@xrpharbor.com` | Auto | DNS Only |

Once SPF and DKIM alignment are verified in production for 7+ days, you can tighten the policy from `p=quarantine` to `p=reject`:
```txt
v=DMARC1; p=reject; pct=100; adkim=s; aspf=s; rua=mailto:security@xrpharbor.com
```

---

## 3. Security Architecture Overview

XRPHarbor remains a **100% Web3 Wallet-Native Marketplace** (Xaman / XRPL sign-in). Email notifications are an **optional, strictly isolated layer** engineered around 7 defense-in-depth controls:

### 3.1 Zero-PII-Leak Isolation (`piiGuard.js` & Route Sanitization)
- Email addresses (`notification_email`), verification status, OTP hashes (`email_verification_code_hash`), attempt counters (`email_verification_attempts`), and toggle flags (`notify_on_sale`, `notify_on_purchase`) are stripped by `stripUserPii()` and `stripOrderPii()`.
- Public endpoints (`GET /api/users/:id`, `GET /api/stores/:handle`, `GET /api/listings`, `GET /api/listings/:id`) and counterparty order endpoints (`GET /api/orders/:id`, `GET /api/orders/mine`) **never** expose buyer or seller email addresses.
- A user's email settings are only accessible to that authenticated wallet owner via `GET /api/notifications/settings`.
- Server logs mask recipient addresses (`us***@domain.com`) via `maskEmail()`.

### 3.2 CSPRNG 6-Digit OTP + HMAC-SHA256 Storage + Constant-Time Verification
- **Generation**: 6-digit verification codes are generated using Node's cryptographically secure pseudorandom number generator: `crypto.randomInt(100000, 1000000)`.
- **No Plaintext Storage**: Raw OTP codes are never stored in PostgreSQL or in-memory state. Only `HMAC-SHA256(EMAIL_OTP_SECRET, "${userId}:${normalizedEmail}:${code}")` is stored in `email_verification_code_hash`, binding the code to both the specific user ID and normalized email address.
- **Constant-Time Comparison**: Verification (`POST /api/notifications/verify`) compares the submitted code's HMAC digest against `email_verification_code_hash` using `crypto.timingSafeEqual(bufA, bufB)` (`verifyOtpHashConstantTime`), eliminating timing side-channel leaks.
- **15-Minute Expiry & 5-Attempt Brute-Force Lockout**:
  - Codes expire strictly after 15 minutes (`email_verification_expires_at`). Expired codes return `400 { expired: true }` and clear `email_verification_code_hash`.
  - Every failed verification attempt increments `email_verification_attempts`. On the **5th failed attempt**, the server immediately sets `email_verification_code_hash = NULL` and `email_verification_expires_at = NULL` and returns `429 { lockedOut: true }`. Even submitting the originally valid 6-digit OTP on the 6th attempt is rejected.
- **Strict Rate Limiting (3 Requests / 15 Minutes)**:
  - `POST /api/notifications/email` enforces a sliding-window rate limit of **max 3 OTP requests per 15 minutes** per authenticated `user.id` **and** per client IP (`cf-connecting-ip` / `x-forwarded-for`), returning `429 Too Many Requests` with `retryAfterSeconds` on the 4th request.

### 3.3 Mandatory Anti-Spam Rule (`email_verified === true`)
- Adding or changing an email address immediately resets `email_verified = false`.
- `dispatchOrderLifecycleEmails()` strictly enforces `email_verified === true` (plus `notify_on_sale !== false` for sellers and `notify_on_purchase !== false` for buyers). Unverified email addresses **never** receive order lifecycle emails.

### 3.4 On-Chain Verified XRPL Triggers Only
- Order lifecycle emails are dispatched **only** when:
  1. Order `status` is in `['escrow_locked', 'delivered', 'completed']` (never for `pending`, `awaiting_payment`, `awaiting_escrow`, `cancelled`, `refunded`, or `disputed`).
  2. A verified on-chain XRPL transaction hash (`escrow_tx_hash` for `EscrowCreate` or `finish_tx_hash` for `EscrowFinish`) is present.

### 3.5 Fault Isolation & Non-Blocking Dispatch
- Both individual email sends (`sendSellerOrderEmail`, `sendBuyerOrderEmail`) and the top-level `dispatchOrderLifecycleEmails()` are wrapped in non-throwing `try / catch` blocks.
- If Resend or the SMTP relay experiences a `503 Service Unavailable` or network timeout, the error is logged as a warning, the idempotency claim is rolled back so future retries can succeed, and the XRPL escrow confirmation or webhook endpoint still returns `200 OK` without interruption.

### 3.6 Idempotency & Deduplication (`email_notification_logs`)
- Before dispatching an email, `dispatchOrderLifecycleEmails()` checks `email_notification_logs` for the unique tuple `(order_id, event_type, recipient_role)` (enforced in PostgreSQL via `UNIQUE (order_id, event_type, recipient_role)` and `ON CONFLICT DO NOTHING`) as well as `orders.notification_sent_seller` / `orders.notification_sent_buyer`.
- Repeated webhook deliveries, status polling (`GET /api/orders/:id/escrow/status`), or manual confirmations (`POST /api/orders/:id/escrow/confirm`) for the same order event send **at most 1 email to the Seller and 1 email to the Buyer**.

### 3.7 HTML Escaping & Phishing Defense (`escapeHtml` & `sanitizeAppUrl`)
- All dynamic values interpolated into HTML email templates—including `listingTitle`, `buyerWallet`, `sellerWallet`, `orderId`, `txHash`, `amount`, and `memo`—pass through `escapeHtml()`, encoding `&`, `<`, `>`, `"`, and `'`.
- All CTA URLs pass through `sanitizeAppUrl()`, which restricts links to `https://xrpharbor.com` (or `PUBLIC_APP_URL`) and explicitly blocks `javascript:`, `data:`, external phishing domains, and raw Cloudflare R2 storage URLs (`*.r2.cloudflarestorage.com`, `*.r2.dev`). Digital Vault files are never attached or linked via raw R2 URLs in emails; buyers are always directed to `https://xrpharbor.com/orders` to authenticate with their XRPL wallet before downloading.

---

## 4. Running Automated Security & Functional Verification

From `xrp-marketplace-frontend`:

```bash
# Run the dedicated 5-suite Email Notification Security & Reliability test runner
node tests/email-notifications.test.mjs

# Run the full XRPHarbor Red-Team & Security Verification Suite (includes Email Notification checks)
node verify-security.mjs
```
