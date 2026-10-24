# Cloudflare WAF, Rate Limiting & Edge Defense Blueprint (`xrpharbor.com`)

This document provides the complete, copy-paste-ready Cloudflare Edge Defense configuration for **`xrpharbor.com`** (Vercel Next.js frontend + Railway Express/PostgreSQL/XRPL backend).

All rules use Cloudflare's **Wirefilter expression syntax** and are tailored specifically to `xrpharbor.com`'s authentication, XRPL escrow, Xaman (Xumm) payload/webhook, upgrade/ad payment, upload, and admin routes.

---

## 1. Production Route & Attack Surface Map (`xrpharbor.com`)

| Route Category | Exact Production Paths | HTTP Methods | Auth / Verification Mechanism | Edge Risk Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication (Xaman Sign-In)** | `/api/auth/signin`<br>`/api/auth/verify`<br>`/api/auth/me` | `POST`, `GET` | Xaman UUID payload + JWT (`HS256` Bearer token) | High — Xaman API quota exhaustion, UUID brute-force, credential stuffing |
| **Orders & XRPL Conditional Escrow** | `/api/orders`<br>`/api/orders/mine`<br>`/api/orders/:id`<br>`/api/orders/:id/escrow/xumm-payload`<br>`/api/orders/:id/escrow/status`<br>`/api/orders/:id/escrow/confirm`<br>`/api/orders/:id/escrow/cancel`<br>`/api/orders/:id/escrow/claim`<br>`/api/orders/:id/deliver`<br>`/api/orders/:id/delivery`<br>`/api/orders/:id/cancel`<br>`/api/orders/:id/dispute`<br>`/api/orders/:id/review` | `POST`, `GET` | JWT Bearer token + XRPL `validated` ledger verification (`EscrowCreate`, `EscrowFinish`, `EscrowCancel`, `PREIMAGE-SHA-256`) | Critical — On-chain RPC node exhaustion, escrow state tampering, txHash replay attempts |
| **Upgrades & Ad Slot XRPL Payments** | `/api/upgrades/pricing`<br>`/api/upgrades/payload`<br>`/api/upgrades/checkout`<br>`/api/upgrades/:paymentId/verify`<br>`/api/ad-slots`<br>`/api/ads` | `POST`, `GET` | JWT Bearer token + XRPL `meta.delivered_amount` verification | Critical — Partial payment (`tfPartialPayment`) probes, txHash replay, Xaman payload spam |
| **Webhooks (Xaman / XRPL Callbacks)** | `/api/xumm/webhook`<br>`/api/orders/:id/escrow/webhook` | `POST` | Server-to-server callback + on-chain `verifyEscrowTx` validation | High — Webhook forgery, replay floods (must remain accessible to Xaman servers without browser `Origin` headers) |
| **Image Upload Proxy** | `/api/upload` | `POST` | JWT Bearer token + magic-byte signature validation (`PNG`/`JPEG`/`GIF`/`WEBP`, max 5 MB) | High — Bandwidth/payload exhaustion, polyglot/SVG/archive traversal probes, ImgBB API quota abuse |
| **Admin Panel & Moderation API** | `/admin`<br>`/admin/*`<br>`/api/admin/stats`<br>`/api/admin/users`<br>`/api/admin/users/:id/ban`<br>`/api/admin/users/:id/verify`<br>`/api/admin/users/:id/pro`<br>`/api/admin/listings/:id/remove`<br>`/api/admin/listings/:id/feature`<br>`/api/admin/disputes`<br>`/api/disputes/:id/resolve`<br>`/api/admin/reports`<br>`/api/admin/reports/:id/resolve`<br>`/api/admin/account-set` | `GET`, `POST`, `PATCH` | JWT Bearer token (`role === 'admin'`) | Critical — Privilege escalation probes, unauthorized dispute resolution, administrative enumeration |
| **Marketplace, Stores, Offers & Messaging** | `/api/listings*`, `/api/stores*`, `/api/users*`, `/api/offers*`, `/api/messages*`, `/api/contact*`, `/api/inquiries`, `/api/favorites*`, `/api/notifications*`, `/api/reports`, `/api/activity`, `/api/stats`, `/api/rlusd-status` | `GET`, `POST`, `PATCH`, `DELETE` | Public `GET` / JWT Bearer token for mutations | Medium — Scraping, inventory enumeration, spam offers/messages/reports |

---

## 2. Cloudflare WAF Custom Rules (1–5)

Navigate to **Cloudflare Dashboard → `xrpharbor.com` → Security → WAF → Custom rules** and create the following 5 rules in order. For each rule, click **Edit expression** and paste the exact expression block below.

---

### WAF Custom Rule 1: Block Sensitive Files & Exploit Probes
Blocks automated reconnaissance for `.env` secrets, `.git` repositories, database dumps, PHP/WordPress scanners, Next.js/Node config files, and path traversal sequences before they ever reach Vercel or Railway.

- **Rule Name:** `Rule 1 - Block Sensitive Files & Exploit Probes`
- **Action:** `Block`
- **Expression:**
```text
(http.request.uri.path contains "/.env") or
(http.request.uri.path contains "/.git") or
(http.request.uri.path contains "/.aws") or
(http.request.uri.path contains "/.ssh") or
(http.request.uri.path contains "/.vscode") or
(http.request.uri.path contains "/wp-admin") or
(http.request.uri.path contains "/wp-login") or
(http.request.uri.path contains "/wp-content") or
(http.request.uri.path contains "/xmlrpc.php") or
(http.request.uri.path contains "/phpmyadmin") or
(http.request.uri.path contains "/vendor/") or
(http.request.uri.path contains "/actuator") or
(http.request.uri.path contains "/server-status") or
(http.request.uri.path contains "..") or
(lower(http.request.uri.path) contains "%2e%2e") or
(ends_with(lower(http.request.uri.path), ".sql")) or
(ends_with(lower(http.request.uri.path), ".bak")) or
(ends_with(lower(http.request.uri.path), ".old")) or
(ends_with(lower(http.request.uri.path), ".orig")) or
(ends_with(lower(http.request.uri.path), ".swp")) or
(ends_with(lower(http.request.uri.path), ".php")) or
(ends_with(lower(http.request.uri.path), ".asp")) or
(ends_with(lower(http.request.uri.path), ".aspx")) or
(ends_with(lower(http.request.uri.path), ".jsp")) or
(ends_with(lower(http.request.uri.path), ".cgi")) or
(http.request.uri.path in {"/package.json" "/package-lock.json" "/yarn.lock" "/pnpm-lock.yaml" "/next.config.js" "/next.config.mjs" "/docker-compose.yml" "/Dockerfile"})
```

---

### WAF Custom Rule 2: Block Scanners & Automated CLI Tools
Blocks vulnerability scanners (`sqlmap`, `nikto`, `nuclei`, `nmap`, `masscan`, `gobuster`, `dirbuster`, `wfuzz`, `ffuf`, `zgrab`) and raw scripting/CLI clients (`curl`, `wget`, `python-requests`, `Go-http-client`, `axios`, `libwww-perl`) or empty User-Agents.

> [!IMPORTANT]
> **Webhook Exclusion Note:** `/api/xumm/webhook` and `/api/orders/*/escrow/webhook` are explicitly excluded so server-to-server Xaman (Xumm) webhook callbacks using custom or non-browser User-Agents are never blocked at the edge.

- **Rule Name:** `Rule 2 - Block Scanners & Automated CLI Tools`
- **Action:** `Block`
- **Expression:**
```text
(
  not (
    http.request.uri.path eq "/api/xumm/webhook" or
    (starts_with(http.request.uri.path, "/api/orders/") and ends_with(http.request.uri.path, "/escrow/webhook"))
  )
) and (
  (http.user_agent eq "") or
  (lower(http.user_agent) contains "sqlmap") or
  (lower(http.user_agent) contains "nikto") or
  (lower(http.user_agent) contains "nuclei") or
  (lower(http.user_agent) contains "nmap") or
  (lower(http.user_agent) contains "masscan") or
  (lower(http.user_agent) contains "dirbuster") or
  (lower(http.user_agent) contains "gobuster") or
  (lower(http.user_agent) contains "feroxbuster") or
  (lower(http.user_agent) contains "ffuf") or
  (lower(http.user_agent) contains "wfuzz") or
  (lower(http.user_agent) contains "zgrab") or
  (lower(http.user_agent) contains "acunetix") or
  (lower(http.user_agent) contains "nessus") or
  (lower(http.user_agent) contains "burpsuite") or
  (lower(http.user_agent) contains "hydra") or
  (lower(http.user_agent) contains "python-requests") or
  (lower(http.user_agent) contains "python-urllib") or
  (lower(http.user_agent) contains "aiohttp") or
  (lower(http.user_agent) contains "httpx") or
  (lower(http.user_agent) contains "go-http-client") or
  (lower(http.user_agent) contains "curl/") or
  (lower(http.user_agent) contains "wget/") or
  (lower(http.user_agent) contains "libwww-perl") or
  (lower(http.user_agent) contains "scrapy")
)
```

---

### WAF Custom Rule 3: Block Unauthorized API Mutations
Blocks state-changing HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) to `/api/*` that do not originate from `xrpharbor.com` (via `Origin` or `Referer` header) **and** do not carry an `Authorization` header, while explicitly permitting server-to-server Xaman webhook endpoints (`/api/xumm/webhook` and `/api/orders/*/escrow/webhook`).

- **Rule Name:** `Rule 3 - Block Unauthorized API Mutations`
- **Action:** `Block`
- **Expression:**
```text
(starts_with(http.request.uri.path, "/api/")) and
(http.request.method in {"POST" "PUT" "PATCH" "DELETE"}) and
not (
  http.request.uri.path eq "/api/xumm/webhook" or
  (starts_with(http.request.uri.path, "/api/orders/") and ends_with(http.request.uri.path, "/escrow/webhook"))
) and
not (
  (
    any(http.request.headers["origin"][*] in {
      "https://xrpharbor.com"
      "https://www.xrpharbor.com"
      "https://xrp-marketplace-frontend.vercel.app"
    })
  ) or
  (starts_with(http.referer, "https://xrpharbor.com/")) or
  (starts_with(http.referer, "https://www.xrpharbor.com/")) or
  (starts_with(http.referer, "https://xrp-marketplace-frontend.vercel.app/")) or
  ( any(len(http.request.headers["authorization"][*]) > 0) )
)
```

---

### WAF Custom Rule 4: Challenge TOR & High Threat Score IPs
Issues a non-intrusive Cloudflare Turnstile / Managed Challenge to requests originating from TOR exit nodes (`T1`) or IPs with a Cloudflare Threat Score above `15` (excluding webhook callbacks).

- **Rule Name:** `Rule 4 - Challenge TOR & High Threat Score IPs`
- **Action:** `Managed Challenge`
- **Expression:**
```text
(
  (ip.geoip.country eq "T1") or
  (cf.threat_score > 15)
) and not (
  http.request.uri.path eq "/api/xumm/webhook" or
  (starts_with(http.request.uri.path, "/api/orders/") and ends_with(http.request.uri.path, "/escrow/webhook"))
)
```

---

### WAF Custom Rule 5: Sensitive Entry Points (Admin & Upload Shield)
Protects `/admin*`, `/api/admin/*`, `/api/disputes/*/resolve`, and `/api/upload*` with a Cloudflare `Managed Challenge` whenever accessed from a suspicious IP, non-standard browser context, or direct external entry, stopping automated admin enumeration and upload flood bots before they reach application middleware.

- **Rule Name:** `Rule 5 - Sensitive Entry Points Admin & Upload Shield`
- **Action:** `Managed Challenge`
- **Expression:**
```text
(
  starts_with(http.request.uri.path, "/admin") or
  starts_with(http.request.uri.path, "/api/admin") or
  starts_with(http.request.uri.path, "/api/upload") or
  (starts_with(http.request.uri.path, "/api/disputes/") and ends_with(http.request.uri.path, "/resolve"))
) and (
  (not starts_with(http.request.uri.path, "/api/")) or
  (cf.threat_score > 5) or
  (not any(http.request.headers["origin"][*] in {
    "https://xrpharbor.com"
    "https://www.xrpharbor.com"
    "https://xrp-marketplace-frontend.vercel.app"
  }))
)
```

---

## 3. Cloudflare Rate Limiting Rules

Navigate to **Cloudflare Dashboard → `xrpharbor.com` → Security → WAF → Rate limiting rules** and configure the following two rules.

### Rate Limit Rule A: Critical Auth, XRPL Escrow, Upgrades & Upload Mutation Limit
Prevents brute-forcing Xaman sign-in UUIDs, spamming XRPL escrow/upgrade payload creation, replaying transaction hashes against the XRPL node, and flooding the image upload proxy.

- **Rule Name:** `Rate Limit 1 - Critical Auth XRPL Escrow & Upload Mutations`
- **Expression:**
```text
(http.request.method eq "POST") and (
  starts_with(http.request.uri.path, "/api/auth/") or
  (starts_with(http.request.uri.path, "/api/orders/") and contains(http.request.uri.path, "/escrow/")) or
  starts_with(http.request.uri.path, "/api/upgrades/") or
  (http.request.uri.path eq "/api/upload") or
  (http.request.uri.path eq "/api/ad-slots") or
  (http.request.uri.path eq "/api/ads")
)
```
- **Characteristics:** `IP` (`cf.connecting_ip`)
- **Rate:** **5 requests per 10 seconds** (Free plan: 5 requests / 10s; Pro/Business: 5 requests / 10s with 60s mitigation timeout)
- **Action:** `Block`
- **Response Code:** `429 Too Many Requests`
- **Custom Response Body (`application/json`):**
```json
{"error":"Rate limit exceeded for sensitive authentication, XRPL escrow, or upload endpoint. Please wait before retrying."}
```

---

### Rate Limit Rule B: General API Protection Limit
Protects all `/api/*` endpoints against catalog scraping, database query floods, and denial-of-service while allowing normal marketplace browsing and order status polling.

- **Rule Name:** `Rate Limit 2 - General API Limit`
- **Expression:**
```text
starts_with(http.request.uri.path, "/api/")
```
- **Characteristics:** `IP` (`cf.connecting_ip`)
- **Rate:** **30 requests per 10 seconds**
- **Action:** `Block`
- **Response Code:** `429 Too Many Requests`
- **Custom Response Body (`application/json`):**
```json
{"error":"Too many API requests from this IP. Please slow down and try again shortly."}
```

---

## 4. Bot, SSL/TLS & Origin Lockdown Checklist

### 4.1 Bot Defense (**Security → Bots**)
- [x] **Bot Fight Mode:** `On` (Challenges known automated bot signatures).
- [x] **Block AI Scrapers and Crawlers:** `On` (Blocks unauthorized LLM/scraper bots from harvesting seller listings and store profiles).
- [x] **JavaScript Detections:** `On` (If using Super Bot Fight Mode on Pro+, set **Definitely Automated** to `Block` and **Verified Bots** to `Allow`, while ensuring `/api/xumm/webhook` is bypassed via Custom Rule / Configuration Rule if needed).

### 4.2 SSL/TLS & Edge Certificates (**SSL/TLS → Overview & Edge Certificates**)
- [x] **SSL/TLS Encryption Mode:** `Full (Strict)` — Enforces valid CA-signed origin certificates between Cloudflare and both Vercel (`xrpharbor.com`) and Railway (`xrp-marketplace-backend-production.up.railway.app`).
- [x] **Always Use HTTPS:** `On` — Redirects all `http://` requests to `https://` at the edge.
- [x] **HTTP Strict Transport Security (HSTS):**
  - **Status:** `Enabled`
  - **Max Age Header (`max-age`):** `12 months` (`31536000` seconds)
  - **Apply HSTS policy to subdomains (`includeSubDomains`):** `On`
  - **Preload:** `On`
  - **No-Sniff Header (`X-Content-Type-Options: nosniff`):** `On`
- [x] **Minimum TLS Version:** `TLS 1.2` (Blocks legacy TLS 1.0 and TLS 1.1 connections).
- [x] **TLS 1.3:** `On` (Enables modern low-latency encryption).
- [x] **Automatic HTTPS Rewrites:** `On`.

### 4.3 Origin Lockdown (Vercel & Railway Direct-Access Prevention)
To ensure attackers cannot bypass Cloudflare WAF and Rate Limiting by sending requests directly to the Vercel deployment URL or Railway backend URL:

1. **Application-Layer Origin & Proxy Trust (Already Enforced in Code):**
   - Backend (`src/app.js` & `src/routes/index.js`) enforces `app.set('trust proxy', 1)` and keys `express-rate-limit` on `req.headers['cf-connecting-ip'] || req.ip`.
   - Strict CORS allowlist (`ALLOWED_ORIGINS`) in both `src/app.js` and `src/app/api/[...path]/route.js` rejects any browser `Origin` outside `https://xrpharbor.com`, `https://www.xrpharbor.com`, and `https://xrp-marketplace-frontend.vercel.app` with HTTP `403`.
2. **Authenticated Origin Pulls (Cloudflare SSL/TLS → Origin Server):**
   - Enable **Authenticated Origin Pulls** in Cloudflare so Cloudflare presents a client certificate on every request to your origin.
3. **Origin Shared Secret Header (Cloudflare Transform Rules → Modify Request Header):**
   - In Cloudflare **Rules → Transform Rules → Modify Request Header**, add a static secret header on all proxied requests:
     - **Header name:** `X-CF-Origin-Secret`
     - **Value:** `<64-char-random-hex-secret>`
   - Set `CF_ORIGIN_SECRET` in Railway/Vercel environment variables if enforcing strict origin-only traffic so direct requests to `*.up.railway.app` without the Cloudflare secret header can be dropped immediately.
4. **Cloudflare IP Range Allowlisting:**
   - Ensure DNS records (`A` / `CNAME` for `xrpharbor.com`, `www.xrpharbor.com`, and any API subdomain) have **Proxy status** set to **Proxied (Orange Cloud)** so origin IP addresses are never exposed in public DNS queries.
