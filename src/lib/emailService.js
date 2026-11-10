/**
 * XRPHarbor Transactional Email Engine & Phishing-Safe Templates
 *
 * Supports:
 * 1. Resend HTTP API (`RESEND_API_KEY`) -> POST https://api.resend.com/emails
 * 2. Standard SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`)
 *    via optional `nodemailer` or built-in Node `net`/`tls` SMTP client.
 * 3. Custom Test Transport Hook (`setTestEmailTransport`, `clearTestEmailTransport`,
 *    `getCapturedEmails`, `clearCapturedEmails`) for unit/integration testing & fault simulation.
 * 4. Structured Console Fallback in local development when no external provider is configured.
 */

const crypto = require('crypto');
const net = require('net');
const tls = require('tls');
const https = require('https');

const DEFAULT_FROM_EMAIL = 'XRPHarbor <notifications@xrpharbor.com>';
const DEFAULT_APP_URL = 'https://xrpharbor.com';
const MAX_CAPTURED_EMAILS = 500;

if (!globalThis.__xrpharborEmailState) {
  globalThis.__xrpharborEmailState = {
    testEmailTransport: null,
    capturedEmails: [],
  };
}

function getEmailState() {
  if (!globalThis.__xrpharborEmailState) {
    globalThis.__xrpharborEmailState = {
      testEmailTransport: null,
      capturedEmails: [],
    };
  }
  return globalThis.__xrpharborEmailState;
}

/**
 * Escapes HTML special characters to neutralize XSS and phishing HTML injection in email templates.
 * Escapes: & (&amp;), < (&lt;), > (&gt;), " (&quot;), ' (&#39;), and ` (&#96;).
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

/**
 * Truncates an XRPL wallet address for safe display (e.g. `rHb9CJ...tyTh`).
 *
 * @param {unknown} addr
 * @returns {string}
 */
function truncateWallet(addr) {
  if (addr === null || addr === undefined) return 'Unknown Wallet';
  const raw = String(addr).trim();
  if (!raw) return 'Unknown Wallet';
  if (raw.length <= 12) return raw;
  return `${raw.slice(0, 6)}...${raw.slice(-4)}`;
}

/**
 * Resolves the canonical public application origin (defaults to https://xrpharbor.com).
 *
 * @returns {string}
 */
function getCanonicalAppOrigin() {
  const candidate = (
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    DEFAULT_APP_URL
  ).trim();

  try {
    const parsed = new URL(candidate);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    if (
      (protocol === 'https:' || (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1'))) &&
      !hostname.endsWith('.r2.cloudflarestorage.com')
    ) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    // Fallback to default below
  }
  return DEFAULT_APP_URL;
}

/**
 * Ensures links in emails ONLY point to https://xrpharbor.com (or process.env.PUBLIC_APP_URL)
 * and never to attacker-supplied domains or raw R2 storage URLs.
 *
 * @param {unknown} url
 * @param {string} [defaultPath='/']
 * @returns {string}
 */
function sanitizeAppUrl(url, defaultPath = '/') {
  const baseOrigin = getCanonicalAppOrigin();
  const cleanDefaultPath =
    typeof defaultPath === 'string' && defaultPath.startsWith('/') && !defaultPath.startsWith('//')
      ? defaultPath
      : `/${String(defaultPath || '').replace(/^\/+/, '')}`;
  const fallbackUrl = `${baseOrigin}${cleanDefaultPath}`;

  if (!url || typeof url !== 'string') {
    return fallbackUrl;
  }

  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048) {
    return fallbackUrl;
  }

  // Reject control characters, angle brackets, quotes, backticks, or whitespace
  if (/[\x00-\x20\x7F<>"'`\\]/.test(trimmed)) {
    return fallbackUrl;
  }

  // Never allow R2 storage URLs, presigned S3 query params, or direct vault API routes in emails
  if (
    /r2\.cloudflarestorage\.com/i.test(trimmed) ||
    /X-Amz-Signature/i.test(trimmed) ||
    /X-Amz-Credential/i.test(trimmed) ||
    /\/api\/vault\b/i.test(trimmed) ||
    /vault:\/\//i.test(trimmed)
  ) {
    return fallbackUrl;
  }

  try {
    const baseParsed = new URL(baseOrigin);
    let parsed;
    if (trimmed.startsWith('/')) {
      if (trimmed.startsWith('//')) return fallbackUrl;
      parsed = new URL(trimmed, baseOrigin);
    } else {
      parsed = new URL(trimmed);
    }

    const allowedHosts = new Set([
      baseParsed.host.toLowerCase(),
      'xrpharbor.com',
      'www.xrpharbor.com',
    ]);

    if (
      parsed.protocol.toLowerCase() !== baseParsed.protocol.toLowerCase() &&
      parsed.protocol.toLowerCase() !== 'https:'
    ) {
      return fallbackUrl;
    }

    if (parsed.username || parsed.password) {
      return fallbackUrl;
    }

    if (!allowedHosts.has(parsed.host.toLowerCase())) {
      return fallbackUrl;
    }

    if (parsed.pathname.includes('..') || /^\/api\/vault\b/i.test(parsed.pathname)) {
      return fallbackUrl;
    }

    return `${baseOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallbackUrl;
  }
}

/**
 * Redacts an email address for safe structured console logs (e.g. `al***@example.com`).
 *
 * @param {unknown} email
 * @returns {string}
 */
function redactEmailForLog(email) {
  if (!email) return 'unknown';
  const str = Array.isArray(email) ? String(email[0] || '') : String(email);
  const parts = str.trim().split('@');
  if (parts.length !== 2) return 'redacted';
  const [local, domain] = parts;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

/**
 * Registers a custom transport function for unit/integration tests.
 *
 * @param {Function|null} fn - Async or sync function `(emailPayload) => result`
 */
function setTestEmailTransport(fn) {
  getEmailState().testEmailTransport = typeof fn === 'function' ? fn : null;
}

/**
 * Clears any registered custom test email transport.
 */
function clearTestEmailTransport() {
  getEmailState().testEmailTransport = null;
}

/**
 * Returns all captured outbound emails recorded during the current process/test run.
 *
 * @returns {Array<object>}
 */
function getCapturedEmails() {
  return [...getEmailState().capturedEmails];
}

/**
 * Clears the captured outbound emails buffer.
 */
function clearCapturedEmails() {
  getEmailState().capturedEmails.length = 0;
}

function recordCapturedEmail(entry) {
  const { capturedEmails } = getEmailState();
  capturedEmails.push(entry);
  if (capturedEmails.length > MAX_CAPTURED_EMAILS) {
    capturedEmails.shift();
  }
}

/**
 * Wraps email body HTML in XRPHarbor's responsive dark-themed layout.
 */
function renderDarkEmailLayout({ preheader, badgeText, badgeColor = '#00d4ff', titleHtml, bodyHtml, ctaLabel, ctaUrl, secondaryCtaLabel, secondaryCtaUrl, footerNoteHtml }) {
  const safePreheader = escapeHtml(preheader || '');
  const safeBadge = escapeHtml(badgeText || 'XRPHarbor Security');
  const safeBadgeColor = /^#[0-9a-fA-F]{3,8}$/.test(String(badgeColor || '')) ? badgeColor : '#00d4ff';
  const safeCtaUrl = ctaUrl ? escapeHtml(sanitizeAppUrl(ctaUrl, '/')) : '';
  const safeCtaLabel = ctaLabel ? escapeHtml(ctaLabel) : '';
  const safeSecondaryUrl = secondaryCtaUrl ? escapeHtml(sanitizeAppUrl(secondaryCtaUrl, '/')) : '';
  const safeSecondaryLabel = secondaryCtaLabel ? escapeHtml(secondaryCtaLabel) : '';
  const homeUrl = escapeHtml(sanitizeAppUrl('/', '/'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${safePreheader || 'XRPHarbor Notification'}</title>
</head>
<body style="margin:0;padding:0;background-color:#070b14;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#070b14;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;background:linear-gradient(135deg,#0f172a 0%,#111c38 100%);border-bottom:1px solid #1e293b;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <a href="${homeUrl}" style="text-decoration:none;color:#f8fafc;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
                      <span style="color:#00d4ff;">XRP</span>Harbor
                    </a>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:rgba(0,212,255,0.12);border:1px solid ${safeBadgeColor};color:${safeBadgeColor};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">
                      ${safeBadge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.35;font-weight:700;color:#f8fafc;">
                ${titleHtml}
              </h1>
              ${bodyHtml}
              ${
                safeCtaUrl && safeCtaLabel
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;margin-bottom:8px;">
                      <tr>
                        <td align="center" style="border-radius:10px;background:linear-gradient(90deg,#00d4ff 0%,#0284c7 100%);">
                          <a href="${safeCtaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#04101c;text-decoration:none;border-radius:10px;">
                            ${safeCtaLabel}
                          </a>
                        </td>
                        ${
                          safeSecondaryUrl && safeSecondaryLabel
                            ? `<td style="padding-left:12px;">
                                <a href="${safeSecondaryUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:600;color:#e2e8f0;background-color:#1e293b;border:1px solid #334155;text-decoration:none;border-radius:10px;">
                                  ${safeSecondaryLabel}
                                </a>
                              </td>`
                            : ''
                        }
                      </tr>
                    </table>`
                  : ''
              }
            </td>
          </tr>
          <!-- Anti-Phishing Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#090d16;border-top:1px solid #1e293b;color:#64748b;font-size:12px;line-height:1.6;">
              ${footerNoteHtml || ''}
              <p style="margin:8px 0 0 0;color:#64748b;">
                <strong style="color:#94a3b8;">Phishing Defense:</strong> Official links in this email only direct to <a href="${homeUrl}" style="color:#00d4ff;text-decoration:none;">${homeUrl}</a>. XRPHarbor will never ask for your wallet seed phrase, secret numbers, or private keys.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Verification OTP Email Template Builder
 *
 * @param {object} params
 * @param {string|number} params.code - 6-digit verification code
 * @param {string} params.walletAddress - Requesting XRPL wallet address
 * @param {number} [params.expiresMinutes=15] - Expiration window in minutes
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildVerificationOtpEmail({
  code,
  otp,
  verificationCode,
  walletAddress,
  wallet,
  address,
  expiresMinutes = 15,
} = {}) {
  const rawCode = String(code ?? otp ?? verificationCode ?? '').trim();
  const safeCode = escapeHtml(rawCode);
  const rawWallet = String(walletAddress ?? wallet ?? address ?? '').trim();
  const shortWallet = truncateWallet(rawWallet);
  const safeShortWallet = escapeHtml(shortWallet);
  const safeFullWallet = escapeHtml(rawWallet || 'Unknown Wallet');
  const expMins = Number.isFinite(Number(expiresMinutes)) && Number(expiresMinutes) > 0 ? Number(expiresMinutes) : 15;
  const safeExpMins = escapeHtml(expMins);
  const settingsUrl = sanitizeAppUrl('/settings', '/settings');

  const subject = `[XRPHarbor] Verification code: ${safeCode} (Wallet ${safeShortWallet})`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
      A request was made to verify this email address for XRPHarbor notifications linked to XRPL wallet <strong style="color:#f8fafc;font-family:monospace;">${safeShortWallet}</strong> (<span style="font-family:monospace;font-size:12px;color:#94a3b8;">${safeFullWallet}</span>).
    </p>
    <p style="margin:0 0 12px 0;font-size:14px;color:#94a3b8;">
      Enter the 6-digit verification code below in your XRPHarbor Settings page:
    </p>
    <div style="margin:20px 0;padding:22px 24px;background-color:#050811;border:2px solid #00d4ff;border-radius:12px;text-align:center;">
      <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;font-weight:800;letter-spacing:10px;color:#00d4ff;line-height:1.2;">
        ${safeCode}
      </div>
      <div style="margin-top:10px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">
        Expires in ${safeExpMins} minutes
      </div>
    </div>
    <div style="margin-top:20px;padding:14px 16px;background-color:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.35);border-radius:10px;color:#fca5a5;font-size:13px;line-height:1.5;">
      <strong style="color:#f87171;">Security Warning:</strong> This code expires in <strong>${safeExpMins} minutes</strong>. If you did not request this verification code as the owner of wallet <span style="font-family:monospace;">${safeShortWallet}</span>, please ignore this email and do not share this code with anyone.
    </div>
  `;

  const html = renderDarkEmailLayout({
    preheader: `Your XRPHarbor verification code is ${safeCode}. Expires in ${safeExpMins} minutes.`,
    badgeText: 'Email Verification',
    badgeColor: '#00d4ff',
    titleHtml: 'Verify Your XRPHarbor Notification Email',
    bodyHtml,
    ctaLabel: 'Open Notification Settings',
    ctaUrl: settingsUrl,
    footerNoteHtml: `<p style="margin:0;">Requested by wallet <span style="font-family:monospace;color:#cbd5e1;">${safeShortWallet}</span>.</p>`,
  });

  const text = [
    'XRPHarbor — Verify Your Notification Email',
    '==========================================',
    '',
    `Verification Code: ${safeCode}`,
    `Expires In: ${safeExpMins} minutes`,
    `Requesting Wallet: ${safeShortWallet} (${safeFullWallet})`,
    '',
    `Enter this 6-digit code at: ${settingsUrl}`,
    '',
    'SECURITY WARNING: If you did not request this verification code as the owner of this XRPL wallet, please ignore this email. Never share this code or your wallet seed phrase with anyone.',
  ].join('\n');

  return { subject, html, text };
}

/**
 * 2. Seller Order Notification Email Template Builder
 *
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.listingTitle
 * @param {string|number} params.netAmountXrp
 * @param {string} [params.currency='XRP']
 * @param {string} params.buyerWallet
 * @param {string} [params.buyerUsername]
 * @param {string} params.txHash
 * @param {string} [params.orderStatus]
 * @param {string} [params.eventType='escrow_locked']
 * @param {string} [params.memo]
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildSellerOrderEmail({
  orderId,
  id,
  listingTitle,
  title,
  itemTitle,
  productTitle,
  netAmountXrp,
  amountXrp,
  amount,
  sellerNetXrp,
  price,
  currency = 'XRP',
  settlementCurrency,
  buyerWallet,
  buyerAddress,
  buyer_wallet,
  buyerUsername,
  buyerName,
   txHash,
  escrowTxHash,
  tx_hash,
  finishTxHash,
  orderStatus,
  status,
  eventType = 'escrow_locked',
  memo,
} = {}) {
  const isCompleted =
    eventType === 'completed' ||
    eventType === 'funds_released' ||
    eventType === 'escrow_finished' ||
    /completed|released/i.test(String(orderStatus || status || ''));

  const rawTitle = String(listingTitle ?? title ?? itemTitle ?? productTitle ?? 'Digital Listing').trim();
  const safeTitle = escapeHtml(rawTitle);

  const rawAmount = String(netAmountXrp ?? sellerNetXrp ?? amountXrp ?? amount ?? price ?? '0').trim();
  const safeAmount = escapeHtml(rawAmount);

  const rawCurrency = String(settlementCurrency ?? currency ?? 'XRP').trim().toUpperCase() || 'XRP';
  const safeCurrency = escapeHtml(rawCurrency);

  const rawBuyerWallet = String(buyerWallet ?? buyerAddress ?? buyer_wallet ?? '').trim();
  const shortBuyerWallet = truncateWallet(rawBuyerWallet);
  const safeShortBuyerWallet = escapeHtml(shortBuyerWallet);
  const safeFullBuyerWallet = escapeHtml(rawBuyerWallet || 'Unknown Wallet');

  const rawBuyerUsername = String(buyerUsername ?? buyerName ?? '').trim();
  const safeBuyerUsername = escapeHtml(rawBuyerUsername);

  const rawTxHash = String(txHash ?? finishTxHash ?? escrowTxHash ?? tx_hash ?? 'Pending On-Chain Validation').trim();
  const safeTxHash = escapeHtml(rawTxHash);

  const rawOrderId = String(orderId ?? id ?? 'N/A').trim();
  const safeOrderId = escapeHtml(rawOrderId);

  const defaultStatus = isCompleted ? 'Completed — Funds Released' : 'Escrow Locked on XRPL';
  const rawStatus = String(orderStatus ?? status ?? defaultStatus).trim();
  const normalizedStatus =
    rawStatus === 'Escrow Locked' ? 'Escrow Locked on XRPL' : rawStatus;
  const safeStatus = escapeHtml(normalizedStatus);

  const safeMemo = memo ? escapeHtml(String(memo).trim()) : '';

  const dashboardUrl = sanitizeAppUrl('/dashboard', '/dashboard');
  const ordersUrl = sanitizeAppUrl('/orders', '/orders');

  const subject = isCompleted
    ? `[XRPHarbor] Sale Completed & Funds Released: ${safeTitle} (${safeAmount} ${safeCurrency})`
    : `[XRPHarbor] New Escrow Sale Locked on XRPL: ${safeTitle} (${safeAmount} ${safeCurrency})`;

  const headline = isCompleted
    ? 'Escrow Finished — Your Funds Have Been Released on XRPL'
    : 'New Order — Buyer Escrow Verified on XRPL';

  const introCopy = isCompleted
    ? `Your sale of <strong style="color:#f8fafc;">${safeTitle}</strong> is complete and the escrow funds have been released to your XRPL wallet.`
    : `Good news! A buyer has locked on-chain escrow funds on the XRP Ledger for your listing <strong style="color:#f8fafc;">${safeTitle}</strong>.`;

  const buyerLabelHtml = safeBuyerUsername
    ? `${safeBuyerUsername} (<span style="font-family:monospace;">${safeShortBuyerWallet}</span>)`
    : `<span style="font-family:monospace;">${safeShortBuyerWallet}</span>`;

  const bodyHtml = `
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
      ${introCopy}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#080d1a;border:1px solid #1e293b;border-radius:12px;padding:18px 20px;">
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Item Sold</td>
        <td align="right" style="padding:8px 0;color:#f8fafc;font-size:14px;font-weight:600;">${safeTitle}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Net Amount Verified</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#10b981;font-size:16px;font-weight:800;font-family:monospace;">${safeAmount} ${safeCurrency}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Buyer Wallet</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${buyerLabelHtml}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Order Status</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#00d4ff;font-size:13px;font-weight:700;">${safeStatus}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Order ID</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#cbd5e1;font-size:12px;font-family:monospace;">${safeOrderId}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">XRPL tx_hash</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:11px;font-family:monospace;word-break:break-all;">${safeTxHash}</td>
      </tr>
      ${
        safeMemo
          ? `<tr>
              <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Order Note</td>
              <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#cbd5e1;font-size:13px;">${safeMemo}</td>
            </tr>`
          : ''
      }
    </table>
  `;

  const html = renderDarkEmailLayout({
    preheader: `${safeStatus}: ${safeTitle} (${safeAmount} ${safeCurrency})`,
    badgeText: isCompleted ? 'Funds Released' : 'Escrow Verified',
    badgeColor: isCompleted ? '#10b981' : '#00d4ff',
    titleHtml: headline,
    bodyHtml,
    ctaLabel: 'Open Seller Dashboard',
    ctaUrl: dashboardUrl,
    secondaryCtaLabel: 'View Orders',
    secondaryCtaUrl: ordersUrl,
    footerNoteHtml: `<p style="margin:0;">Order <span style="font-family:monospace;color:#cbd5e1;">${safeOrderId}</span> • Buyer <span style="font-family:monospace;color:#cbd5e1;">${safeShortBuyerWallet}</span></p>`,
  });

  const text = [
    `XRPHarbor — ${headline}`,
    '==================================================',
    '',
    `Item: ${safeTitle}`,
    `Net Amount Verified: ${safeAmount} ${safeCurrency}`,
    `Buyer Wallet: ${safeShortBuyerWallet} (${safeFullBuyerWallet})`,
    `Order Status: ${safeStatus}`,
    `Order ID: ${safeOrderId}`,
    `XRPL tx_hash: ${safeTxHash}`,
    ...(safeMemo ? [`Order Note: ${safeMemo}`] : []),
    '',
    `Seller Dashboard: ${dashboardUrl}`,
    `Manage Orders: ${ordersUrl}`,
  ].join('\n');

  return { subject, html, text };
}

/**
 * 3. Buyer Order Confirmation & Digital Vault Ready Email Template Builder
 *
 * Explicitly NEVER embeds raw or presigned R2 storage URLs in the email;
 * always directs the buyer to https://xrpharbor.com/orders to authenticate and download
 * from the XRPHarbor Digital Vault.
 *
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.listingTitle
 * @param {string|number} params.amountPaidXrp
 * @param {string} [params.currency='XRP']
 * @param {string} [params.sellerWallet]
 * @param {string} [params.sellerUsername]
 * @param {string} params.txHash
 * @param {string} [params.orderStatus='Escrow Locked — Vault Ready']
 * @param {string} [params.eventType='escrow_locked']
 * @param {string} [params.memo]
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildBuyerOrderEmail({
  orderId,
  id,
  listingTitle,
  title,
  itemTitle,
  productTitle,
  amountPaidXrp,
  amountXrp,
  amount,
  price,
  netAmountXrp,
  currency = 'XRP',
  settlementCurrency,
  sellerWallet,
  sellerAddress,
  seller_wallet,
  sellerUsername,
  sellerName,
  txHash,
  escrowTxHash,
  tx_hash,
  finishTxHash,
  orderStatus,
  status,
  eventType = 'escrow_locked',
  memo,
} = {}) {
  const isCompleted =
    eventType === 'completed' ||
    eventType === 'funds_released' ||
    eventType === 'escrow_finished' ||
    /completed|released/i.test(String(orderStatus || status || ''));

  const rawTitle = String(listingTitle ?? title ?? itemTitle ?? productTitle ?? 'Digital Asset').trim();
  const safeTitle = escapeHtml(rawTitle);

  const rawAmount = String(amountPaidXrp ?? amountXrp ?? amount ?? price ?? netAmountXrp ?? '0').trim();
  const safeAmount = escapeHtml(rawAmount);

  const rawCurrency = String(settlementCurrency ?? currency ?? 'XRP').trim().toUpperCase() || 'XRP';
  const safeCurrency = escapeHtml(rawCurrency);

  const rawSellerWallet = String(sellerWallet ?? sellerAddress ?? seller_wallet ?? '').trim();
  const shortSellerWallet = rawSellerWallet ? truncateWallet(rawSellerWallet) : 'Verified Creator';
  const safeShortSellerWallet = escapeHtml(shortSellerWallet);

  const rawSellerUsername = String(sellerUsername ?? sellerName ?? '').trim();
  const safeSellerUsername = escapeHtml(rawSellerUsername);

  const rawTxHash = String(txHash ?? finishTxHash ?? escrowTxHash ?? tx_hash ?? 'Verified on XRPL').trim();
  const safeTxHash = escapeHtml(rawTxHash);

  const rawOrderId = String(orderId ?? id ?? 'N/A').trim();
  const safeOrderId = escapeHtml(rawOrderId);

  const defaultStatus = isCompleted ? 'Completed — Digital Vault Unlocked' : 'Escrow Locked — Vault Ready';
  const rawStatus = String(orderStatus ?? status ?? defaultStatus).trim();
  const safeStatus = escapeHtml(rawStatus);

  const safeMemo = memo ? escapeHtml(String(memo).trim()) : '';

  // Strictly route buyers to https://xrpharbor.com/orders — NEVER embed raw R2 storage URLs
  const ordersUrl = sanitizeAppUrl('/orders', '/orders');

  const subject = isCompleted
    ? `[XRPHarbor] Order Completed & Digital Vault Ready: ${safeTitle}`
    : `[XRPHarbor] Order Confirmed & Digital Vault Ready: ${safeTitle} (${safeAmount} ${safeCurrency})`;

  const headline = isCompleted
    ? 'Order Completed — Your Digital Vault Download remains Ready'
    : 'Escrow Confirmed — Your XRPHarbor Digital Vault is Ready';

  const sellerLabelHtml = safeSellerUsername
    ? `${safeSellerUsername} (<span style="font-family:monospace;">${safeShortSellerWallet}</span>)`
    : `<span style="font-family:monospace;">${safeShortSellerWallet}</span>`;

  const bodyHtml = `
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
      Your XRPL transaction for <strong style="color:#f8fafc;">${safeTitle}</strong> has been verified on-chain. Your encrypted digital package is ready for authenticated download in the <strong style="color:#00d4ff;">XRPHarbor Digital Vault</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#080d1a;border:1px solid #1e293b;border-radius:12px;padding:18px 20px;">
      <tr>
        <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Purchased Item</td>
        <td align="right" style="padding:8px 0;color:#f8fafc;font-size:14px;font-weight:600;">${safeTitle}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Amount Paid</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#00d4ff;font-size:16px;font-weight:800;font-family:monospace;">${safeAmount} ${safeCurrency}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Seller</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#e2e8f0;font-size:13px;">${sellerLabelHtml}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Order Status</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#10b981;font-size:13px;font-weight:700;">${safeStatus}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Order ID</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#cbd5e1;font-size:12px;font-family:monospace;">${safeOrderId}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">XRPL tx_hash</td>
        <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:11px;font-family:monospace;word-break:break-all;">${safeTxHash}</td>
      </tr>
      ${
        safeMemo
          ? `<tr>
              <td style="padding:8px 0;border-top:1px solid #1e293b;color:#94a3b8;font-size:13px;">Memo</td>
              <td align="right" style="padding:8px 0;border-top:1px solid #1e293b;color:#cbd5e1;font-size:13px;">${safeMemo}</td>
            </tr>`
          : ''
      }
    </table>
    <div style="margin-top:20px;padding:14px 16px;background-color:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.28);border-radius:10px;color:#cbd5e1;font-size:13px;line-height:1.5;">
      <strong style="color:#00d4ff;">Secure Digital Vault Access:</strong> For your security, direct storage links are never sent via email. Click the button below to open <a href="${escapeHtml(ordersUrl)}" style="color:#00d4ff;text-decoration:underline;">${escapeHtml(ordersUrl)}</a> and download your encrypted asset directly from the XRPHarbor Digital Vault.
    </div>
  `;

  const html = renderDarkEmailLayout({
    preheader: `${safeStatus}: Access ${safeTitle} in your XRPHarbor Digital Vault.`,
    badgeText: 'Digital Vault Ready',
    badgeColor: '#10b981',
    titleHtml: headline,
    bodyHtml,
    ctaLabel: 'Access XRPHarbor Digital Vault',
    ctaUrl: ordersUrl,
    footerNoteHtml: `<p style="margin:0;">Order <span style="font-family:monospace;color:#cbd5e1;">${safeOrderId}</span> • Verified on XRPL</p>`,
  });

  const text = [
    `XRPHarbor — ${headline}`,
    '==================================================',
    '',
    `Purchased Item: ${safeTitle}`,
    `Amount Paid: ${safeAmount} ${safeCurrency}`,
    `Seller: ${safeShortSellerWallet}`,
    `Order Status: ${safeStatus}`,
    `Order ID: ${safeOrderId}`,
    `XRPL tx_hash: ${safeTxHash}`,
    ...(safeMemo ? [`Memo: ${safeMemo}`] : []),
    '',
    `Access & Download from XRPHarbor Digital Vault: ${ordersUrl}`,
  ].join('\n');

  return { subject, html, text };
}

/**
 * Internal helper to POST JSON via fetch or native https.
 */
async function postJsonHttps(urlStr, headers, bodyObj) {
  const payload = JSON.stringify(bodyObj);
  if (typeof globalThis.fetch === 'function') {
    const res = await globalThis.fetch(urlStr, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: payload,
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return { ok: res.ok, status: res.status, data, text };
  }

  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data = null;
          try {
            data = JSON.parse(text);
          } catch {
            data = { raw: text };
          }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data,
            text,
          });
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Sends an email via Resend HTTP API (`https://api.resend.com/emails`).
 */
async function sendViaResend({ apiKey, from, to, subject, html, text }) {
  const recipients = Array.isArray(to) ? to : [to];
  const response = await postJsonHttps(
    'https://api.resend.com/emails',
    {
      Authorization: `Bearer ${apiKey}`,
    },
    {
      from,
      to: recipients,
      subject,
      html,
      text,
    }
  );

  if (!response.ok) {
    const errDetail =
      (response.data && (response.data.message || response.data.error)) ||
      response.text ||
      `HTTP ${response.status}`;
    throw new Error(`Resend API error (${response.status}): ${errDetail}`);
  }

  return {
    ok: true,
    provider: 'resend',
    messageId: (response.data && response.data.id) || `resend_${crypto.randomUUID()}`,
  };
}

/**
 * Minimal native Node `net`/`tls` SMTP client fallback when `nodemailer` is not installed.
 */
function sendViaNativeSmtp({ host, port, user, pass, from, to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    const numericPort = Number(port) || 587;
    const useImplicitTls = numericPort === 465;
    const recipient = Array.isArray(to) ? String(to[0] || '').trim() : String(to || '').trim();
    const senderMatch = String(from || '').match(/<([^>]+)>/);
    const envelopeFrom = (senderMatch ? senderMatch[1] : String(from || '')).trim();
    const boundary = `----=_XRPHarbor_${crypto.randomBytes(12).toString('hex')}`;
    const messageId = `<${crypto.randomUUID()}@xrpharbor.com>`;

    const socket = useImplicitTls
      ? tls.connect({ host, port: numericPort, rejectUnauthorized: false })
      : net.createConnection({ host, port: numericPort });

    let settled = false;
    const finish = (err, val) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {}
      if (err) reject(err);
      else resolve(val);
    };

    socket.setTimeout(10000, () => finish(new Error('SMTP connection timed out')));
    socket.on('error', (err) => finish(err));

    const commands = [`EHLO xrpharbor.com`];
    if (user && pass) {
      commands.push('AUTH LOGIN');
      commands.push(Buffer.from(String(user), 'utf8').toString('base64'));
      commands.push(Buffer.from(String(pass), 'utf8').toString('base64'));
    }
    commands.push(`MAIL FROM:<${envelopeFrom}>`);
    commands.push(`RCPT TO:<${recipient}>`);
    commands.push('DATA');

    const mimeMessage = [
      `From: ${from}`,
      `To: ${recipient}`,
      `Subject: ${String(subject || '').replace(/[\r\n]+/g, ' ')}`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      String(text || '').replace(/\r?\n\.\r?\n/g, '\r\n..\r\n'),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      String(html || '').replace(/\r?\n\.\r?\n/g, '\r\n..\r\n'),
      '',
      `--${boundary}--`,
      '.',
    ].join('\r\n');

    commands.push(mimeMessage);
    commands.push('QUIT');

    let step = 0;
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line) continue;
        // Wait until the final line of a multi-line SMTP response (4th char is space)
        if (line.length >= 4 && line[3] === '-') continue;
        const code = parseInt(line.slice(0, 3), 10);
        if (code >= 400 || Number.isNaN(code)) {
          return finish(new Error(`SMTP error (${code}): ${line}`));
        }
        if (step < commands.length) {
          const nextCmd = commands[step++];
          socket.write(`${nextCmd}\r\n`);
        } else {
          return finish(null, {
            ok: true,
            provider: 'smtp',
            messageId,
          });
        }
      }
    });
  });
}

/**
 * Sends an email via SMTP (`nodemailer` if installed, otherwise native Node SMTP).
 */
async function sendViaSmtp({ host, port, user, pass, from, to, subject, html, text }) {
  const nodemailer = globalThis.__xrpharborNodemailer || null;

  if (nodemailer && typeof nodemailer.createTransport === 'function') {
    const numericPort = Number(port) || 587;
    const transporter = nodemailer.createTransport({
      host,
      port: numericPort,
      secure: numericPort === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    return {
      ok: true,
      provider: 'smtp',
      messageId: (info && info.messageId) || `smtp_${crypto.randomUUID()}`,
    };
  }

  return sendViaNativeSmtp({ host, port, user, pass, from, to, subject, html, text });
}

/**
 * Core email dispatcher supporting Test Transport, Resend HTTP API, SMTP, and Console fallback.
 *
 * @param {object} params
 * @param {string|string[]} params.to
 * @param {string} params.subject
 * @param {string} params.html
 * @param {string} params.text
 * @param {string} [params.from]
 * @param {string} [params.template='transactional']
 * @param {object} [params.meta={}]
 * @returns {Promise<{ ok: boolean, provider: string, messageId: string }>}
 */
async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  template = 'transactional',
  meta = {},
} = {}) {
  const recipient = Array.isArray(to) ? to.filter(Boolean).join(', ') : String(to || '').trim();
  if (!recipient) {
    throw new Error('Email recipient (`to`) is required');
  }

  const fromAddress = (from || process.env.EMAIL_FROM || DEFAULT_FROM_EMAIL).trim();
  const generatedMessageId = `msg_${crypto.randomUUID()}`;
  const sentAt = new Date().toISOString();

  const emailPayload = {
    to: recipient,
    from: fromAddress,
    subject: String(subject || ''),
    html: String(html || ''),
    text: String(text || ''),
    template,
    meta,
    sentAt,
  };

  // 1. Custom Test Transport Hook (allows unit/integration tests to intercept or throw errors)
  const { testEmailTransport } = getEmailState();
  if (typeof testEmailTransport === 'function') {
    const customResult = await testEmailTransport(emailPayload);
    const messageId = (customResult && customResult.messageId) || generatedMessageId;
    const record = {
      ...emailPayload,
      provider: (customResult && customResult.provider) || 'test',
      messageId,
    };
    recordCapturedEmail(record);
    return {
      ok: true,
      provider: record.provider,
      messageId,
      ...(customResult && typeof customResult === 'object' ? customResult : {}),
    };
  }

  // 2. Resend HTTP API
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendApiKey) {
    const res = await sendViaResend({
      apiKey: resendApiKey,
      from: fromAddress,
      to: recipient,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
    });
    recordCapturedEmail({ ...emailPayload, provider: 'resend', messageId: res.messageId });
    return res;
  }

  // 3. Standard SMTP
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  if (smtpHost) {
    const res = await sendViaSmtp({
      host: smtpHost,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: fromAddress,
      to: recipient,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
    });
    recordCapturedEmail({ ...emailPayload, provider: 'smtp', messageId: res.messageId });
    return res;
  }

  // 4. Structured Console Fallback (local development)
  const record = {
    ...emailPayload,
    provider: 'console',
    messageId: generatedMessageId,
  };
  recordCapturedEmail(record);

  console.info(
    '[EmailService]',
    JSON.stringify({
      event: 'email_dispatched_console',
      provider: 'console',
      messageId: generatedMessageId,
      template,
      to: redactEmailForLog(recipient),
      subject: emailPayload.subject,
      sentAt,
    })
  );

  return {
    ok: true,
    provider: 'console',
    messageId: generatedMessageId,
  };
}

/**
 * High-level helper to build and send the 6-digit email verification OTP.
 */
async function sendVerificationOtpEmail(params = {}) {
  const { to, email, recipient, ...templateParams } = params;
  const targetTo = to || email || recipient;
  const { subject, html, text } = buildVerificationOtpEmail(templateParams);
  return sendEmail({
    to: targetTo,
    subject,
    html,
    text,
    template: 'verification_otp',
    meta: {
      walletAddress: truncateWallet(templateParams.walletAddress || templateParams.wallet),
      expiresMinutes: templateParams.expiresMinutes || 15,
    },
  });
}

/**
 * High-level helper to build and send the Seller order/escrow notification email.
 */
async function sendSellerOrderEmail(params = {}) {
  const { to, email, sellerEmail, recipient, ...templateParams } = params;
  const targetTo = to || email || sellerEmail || recipient;
  const { subject, html, text } = buildSellerOrderEmail(templateParams);
  return sendEmail({
    to: targetTo,
    subject,
    html,
    text,
    template: 'seller_order',
    meta: {
      orderId: templateParams.orderId || templateParams.id || null,
      eventType: templateParams.eventType || 'escrow_locked',
    },
  });
}

/**
 * High-level helper to build and send the Buyer order/vault confirmation email.
 */
async function sendBuyerOrderEmail(params = {}) {
  const { to, email, buyerEmail, recipient, ...templateParams } = params;
  const targetTo = to || email || buyerEmail || recipient;
  const { subject, html, text } = buildBuyerOrderEmail(templateParams);
  return sendEmail({
    to: targetTo,
    subject,
    html,
    text,
    template: 'buyer_order',
    meta: {
      orderId: templateParams.orderId || templateParams.id || null,
      eventType: templateParams.eventType || 'escrow_locked',
    },
  });
}

const EmailService = {
  escapeHtml,
  truncateWallet,
  sanitizeAppUrl,
  buildVerificationOtpEmail,
  sendVerificationOtpEmail,
  buildSellerOrderEmail,
  sendSellerOrderEmail,
  buildBuyerOrderEmail,
  sendBuyerOrderEmail,
  sendEmail,
  setTestEmailTransport,
  clearTestEmailTransport,
  getCapturedEmails,
  clearCapturedEmails,
};

module.exports = {
  escapeHtml,
  truncateWallet,
  sanitizeAppUrl,
  buildVerificationOtpEmail,
  sendVerificationOtpEmail,
  buildSellerOrderEmail,
  sendSellerOrderEmail,
  buildBuyerOrderEmail,
  sendBuyerOrderEmail,
  sendEmail,
  setTestEmailTransport,
  clearTestEmailTransport,
  getCapturedEmails,
  clearCapturedEmails,
  EmailService,
  default: EmailService,
};
