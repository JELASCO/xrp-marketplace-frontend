/**
 * XRPHarbor Order Lifecycle Email Dispatcher & OTP Cryptographic Helpers
 *
 * Enforces 4 Critical Security Invariants:
 * 1. On-Chain Verified Only:
 *    - Order status MUST be in `['escrow_locked', 'delivered', 'completed']`
 *    - Order MUST have a non-empty `escrow_tx_hash`, `finish_tx_hash`, or `txHashOverride`
 *    - Never sends emails for `pending`, `awaiting_payment`, `awaiting_escrow`, `cancelled`, `refunded`, or `disputed`
 * 2. Mandatory Email Verification (`email_verified === true`):
 *    - Seller email is ONLY sent if `seller && seller.notification_email && seller.email_verified === true && seller.notify_on_sale !== false`
 *    - Buyer email is ONLY sent if `buyer && buyer.notification_email && buyer.email_verified === true && buyer.notify_on_purchase !== false`
 *    - Users with `email_verified === false` or `null` email NEVER trigger outbound emails
 * 3. Strict Idempotency (`email_notification_logs` + `notification_sent_buyer` / `notification_sent_seller`):
 *    - Checks `(order_id, event_type, recipient_role)` in `email_notification_logs`
 *    - For `event_type === 'escrow_locked'`, also checks `order.notification_sent_seller` / `order.notification_sent_buyer`
 *    - Records idempotency log entry (`ON CONFLICT DO NOTHING`) and sets `notification_sent_seller = true` / `notification_sent_buyer = true`
 * 4. Fault Isolation (Non-Blocking `try/catch`):
 *    - Wraps individual email sends and the entire dispatcher in `try/catch` so SMTP/API errors log a warning
 *      and return `{ ok: false, error: err.message }` without EVER throwing or failing the caller's HTTP request.
 */

const crypto = require('crypto');
const {
  sendSellerOrderEmail,
  sendBuyerOrderEmail,
} = require('./emailService');

const VERIFIED_ORDER_STATUSES = new Set(['escrow_locked', 'delivered', 'completed']);
const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const OTP_RATE_LIMIT_MAX = 3; // Max 3 OTP requests per 15 minutes per user.id AND per client IP

if (!globalThis.__xrpharborEmailOtpRateLimits) {
  globalThis.__xrpharborEmailOtpRateLimits = {
    byUser: new Map(),
    byIp: new Map(),
  };
}

function getOtpRateLimitState() {
  if (!globalThis.__xrpharborEmailOtpRateLimits) {
    globalThis.__xrpharborEmailOtpRateLimits = {
      byUser: new Map(),
      byIp: new Map(),
    };
  }
  return globalThis.__xrpharborEmailOtpRateLimits;
}

/**
 * Resets the in-memory OTP rate limit state (used by automated test suites).
 */
function resetEmailOtpRateLimits() {
  const state = getOtpRateLimitState();
  state.byUser.clear();
  state.byIp.clear();
}

globalThis.__xrpharborResetEmailOtpRateLimits = resetEmailOtpRateLimits;

/**
 * Enforces max 3 OTP requests per 15 minutes per user.id AND per client IP.
 *
 * @param {string} userId
 * @param {string} [clientIp]
 * @returns {{ allowed: boolean, retryAfterSeconds: number, error?: string }}
 */
function checkEmailOtpRateLimit(userId, clientIp) {
  const state = getOtpRateLimitState();
  const now = Date.now();
  const cutoff = now - OTP_RATE_LIMIT_WINDOW_MS;

  const userKey = String(userId || 'anonymous').trim();
  const ipKey = clientIp ? String(clientIp).trim() : null;

  const userTimestamps = (state.byUser.get(userKey) || []).filter((ts) => ts > cutoff);
  state.byUser.set(userKey, userTimestamps);

  let ipTimestamps = [];
  if (ipKey) {
    ipTimestamps = (state.byIp.get(ipKey) || []).filter((ts) => ts > cutoff);
    state.byIp.set(ipKey, ipTimestamps);
  }

  if (userTimestamps.length >= OTP_RATE_LIMIT_MAX || (ipKey && ipTimestamps.length >= OTP_RATE_LIMIT_MAX)) {
    const relevantList = userTimestamps.length >= OTP_RATE_LIMIT_MAX ? userTimestamps : ipTimestamps;
    const oldest = relevantList.length > 0 ? Math.min(...relevantList) : now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + OTP_RATE_LIMIT_WINDOW_MS - now) / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
      error: 'Too many verification code requests. Please wait 15 minutes before requesting another code.',
    };
  }

  userTimestamps.push(now);
  state.byUser.set(userKey, userTimestamps);
  if (ipKey) {
    ipTimestamps.push(now);
    state.byIp.set(ipKey, ipTimestamps);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Masks an email address for safe UI display (e.g. `al***@example.com`).
 *
 * @param {unknown} email
 * @returns {string|null}
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const parts = clean.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [local, domain] = parts;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

/**
 * Validates and normalizes an email address (RFC-style format, lowercase, max 254 chars, no HTML/control chars).
 *
 * @param {unknown} rawEmail
 * @returns {{ valid: boolean, email?: string, error?: string }}
 */
function validateAndNormalizeEmail(rawEmail) {
  if (rawEmail === null || rawEmail === undefined || typeof rawEmail !== 'string') {
    return { valid: false, error: 'A valid email address is required.' };
  }
  const trimmed = rawEmail.trim();
  if (!trimmed) {
    return { valid: false, error: 'A valid email address is required.' };
  }
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address must not exceed 254 characters.' };
  }
  // Reject control characters, whitespace, angle brackets, quotes, backticks, or semicolons
  if (/[\x00-\x20\x7F<>"'`\\;\s]/.test(trimmed)) {
    return { valid: false, error: 'Invalid email address format.' };
  }
  const normalized = trimmed.toLowerCase();
  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid email address format.' };
  }
  const [local, domain] = parts;
  if (!local || local.length > 64 || !domain || domain.length < 3 || domain.length > 253) {
    return { valid: false, error: 'Invalid email address format.' };
  }
  if (
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return { valid: false, error: 'Invalid email address format.' };
  }
  const rfcEmailRegex =
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
  if (!rfcEmailRegex.test(normalized) || !/\.[a-z]{2,}$/i.test(domain)) {
    return { valid: false, error: 'Invalid email address format.' };
  }
  return { valid: true, email: normalized };
}

/**
 * Resolves the HMAC secret used to bind 6-digit OTP verification codes to `(userId, email)`.
 *
 * @returns {string}
 */
function getOtpHmacSecret() {
  return (
    process.env.EMAIL_OTP_SECRET ||
    process.env.OTP_HMAC_SECRET ||
    process.env.JWT_SECRET ||
    process.env.DATABASE_URL ||
    process.env.XUMM_API_SECRET ||
    'xrpharbor-otp-hmac-secret-v1'
  );
}

/**
 * Computes an HMAC-SHA256 hex digest for a 6-digit OTP code bound to `(userId, email)`.
 *
 * @param {string} userId
 * @param {string} email
 * @param {string|number} code
 * @returns {string}
 */
function hashOtpCode(userId, email, code) {
  const uid = String(userId || '').trim();
  const normEmail = String(email || '').trim().toLowerCase();
  const normCode = String(code || '').trim();
  return crypto
    .createHmac('sha256', getOtpHmacSecret())
    .update(`${uid}:${normEmail}:${normCode}`, 'utf8')
    .digest('hex');
}

/**
 * Compares two hex-encoded HMAC digests in constant time using `crypto.timingSafeEqual`.
 *
 * @param {unknown} actualHashHex
 * @param {unknown} storedHashHex
 * @returns {boolean}
 */
function verifyOtpHashConstantTime(actualHashHex, storedHashHex) {
  if (typeof actualHashHex !== 'string' || typeof storedHashHex !== 'string') {
    return false;
  }
  const a = actualHashHex.trim().toLowerCase();
  const b = storedHashHex.trim().toLowerCase();
  if (!a || !b || a.length !== b.length || a.length % 2 !== 0) {
    return false;
  }
  if (!/^[0-9a-f]+$/.test(a) || !/^[0-9a-f]+$/.test(b)) {
    return false;
  }
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length === 0 || bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Internal helper to resolve `dbOrStore` if omitted by caller.
 */
function resolveStorageBackend(dbOrStore) {
  if (dbOrStore && (typeof dbOrStore.query === 'function' || Array.isArray(dbOrStore.orders))) {
    return dbOrStore;
  }
  return globalThis.__xrpharborStore || null;
}

/**
 * Fetches order, buyer, seller, and listing records from either PostgreSQL/`db.query` or in-memory `store`.
 */
async function loadOrderContext(storage, orderId) {
  if (!storage || !orderId) return null;

  if (typeof storage.query === 'function') {
    const ordRes = await storage.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    let order = ordRes && ordRes.rows && ordRes.rows[0];
    if (!order && storage.mem && Array.isArray(storage.mem.orders)) {
      order = storage.mem.orders.find((o) => o.id === orderId) || null;
    }
    if (!order) return null;

    const sellerRes = order.seller_id
      ? await storage.query('SELECT * FROM users WHERE id = $1', [order.seller_id])
      : { rows: [] };
    const buyerRes = order.buyer_id
      ? await storage.query('SELECT * FROM users WHERE id = $1', [order.buyer_id])
      : { rows: [] };
    const listingRes = order.listing_id
      ? await storage.query('SELECT * FROM listings WHERE id = $1', [order.listing_id])
      : { rows: [] };

    const seller =
      (sellerRes && sellerRes.rows && sellerRes.rows[0]) ||
      (storage.mem && Array.isArray(storage.mem.users)
        ? storage.mem.users.find((u) => u.id === order.seller_id)
        : null) ||
      null;
    const buyer =
      (buyerRes && buyerRes.rows && buyerRes.rows[0]) ||
      (storage.mem && Array.isArray(storage.mem.users)
        ? storage.mem.users.find((u) => u.id === order.buyer_id)
        : null) ||
      null;
    const listing =
      (listingRes && listingRes.rows && listingRes.rows[0]) ||
      (storage.mem && Array.isArray(storage.mem.listings)
        ? storage.mem.listings.find((l) => l.id === order.listing_id)
        : null) ||
      {};

    return { mode: 'db', order, seller, buyer, listing };
  }

  if (Array.isArray(storage.orders)) {
    const order = storage.orders.find((o) => o.id === orderId) || null;
    if (!order) return null;
    const users = Array.isArray(storage.users) ? storage.users : [];
    const listings = Array.isArray(storage.listings) ? storage.listings : [];
    const seller = users.find((u) => u.id === order.seller_id) || null;
    const buyer = users.find((u) => u.id === order.buyer_id) || null;
    const listing = listings.find((l) => l.id === order.listing_id) || {};
    return { mode: 'store', order, seller, buyer, listing };
  }

  return null;
}

/**
 * Checks whether an email notification has already been logged for `(orderId, eventType, recipientRole)`.
 */
async function hasNotificationBeenLogged(storage, mode, order, eventType, recipientRole) {
  if (eventType === 'escrow_locked') {
    if (recipientRole === 'seller' && order.notification_sent_seller === true) {
      return true;
    }
    if (recipientRole === 'buyer' && order.notification_sent_buyer === true) {
      return true;
    }
  }

  if (mode === 'db') {
    const existing = await storage.query(
      'SELECT id FROM email_notification_logs WHERE order_id = $1 AND event_type = $2 AND recipient_role = $3',
      [order.id, eventType, recipientRole]
    );
    if (existing && Array.isArray(existing.rows) && existing.rows.length > 0) {
      return true;
    }
    if (storage.mem && Array.isArray(storage.mem.email_notification_logs)) {
      return storage.mem.email_notification_logs.some(
        (e) =>
          e.order_id === order.id &&
          e.event_type === eventType &&
          e.recipient_role === recipientRole
      );
    }
    return false;
  }

  if (!Array.isArray(storage.email_notification_logs)) {
    storage.email_notification_logs = [];
  }
  return storage.email_notification_logs.some(
    (e) =>
      e.order_id === order.id &&
      e.event_type === eventType &&
      e.recipient_role === recipientRole
  );
}

/**
 * Records the idempotency log entry and updates `notification_sent_seller` / `notification_sent_buyer` on the order.
 * Returns `true` if newly recorded, or `false` if a conflict/duplicate was detected.
 */
async function recordNotificationIdempotency(storage, mode, order, eventType, recipientRole, recipientUserId) {
  if (mode === 'db') {
    const insRes = await storage.query(
      'INSERT INTO email_notification_logs (order_id, event_type, recipient_role, recipient_user_id) VALUES ($1, $2, $3, $4) ON CONFLICT (order_id, event_type, recipient_role) DO NOTHING RETURNING id',
      [order.id, eventType, recipientRole, recipientUserId || null]
    );
    const inserted = Boolean(
      insRes && ((Array.isArray(insRes.rows) && insRes.rows.length > 0) || insRes.rowCount > 0)
    );
    if (!inserted) {
      return false;
    }

    if (recipientRole === 'seller') {
      order.notification_sent_seller = true;
      await storage
        .query('UPDATE orders SET notification_sent_seller = true WHERE id = $1', [order.id])
        .catch(() => {});
      if (storage.mem && Array.isArray(storage.mem.orders)) {
        const memOrd = storage.mem.orders.find((o) => o.id === order.id);
        if (memOrd) memOrd.notification_sent_seller = true;
      }
    } else if (recipientRole === 'buyer') {
      order.notification_sent_buyer = true;
      await storage
        .query('UPDATE orders SET notification_sent_buyer = true WHERE id = $1', [order.id])
        .catch(() => {});
      if (storage.mem && Array.isArray(storage.mem.orders)) {
        const memOrd = storage.mem.orders.find((o) => o.id === order.id);
        if (memOrd) memOrd.notification_sent_buyer = true;
      }
    }
    return true;
  }

  if (!Array.isArray(storage.email_notification_logs)) {
    storage.email_notification_logs = [];
  }
  const duplicate = storage.email_notification_logs.some(
    (e) =>
      e.order_id === order.id &&
      e.event_type === eventType &&
      e.recipient_role === recipientRole
  );
  if (duplicate) {
    return false;
  }
  storage.email_notification_logs.push({
    id: crypto.randomUUID(),
    order_id: order.id,
    event_type: eventType,
    recipient_role: recipientRole,
    recipient_user_id: recipientUserId || null,
    sent_at: new Date().toISOString(),
  });
  if (recipientRole === 'seller') {
    order.notification_sent_seller = true;
  } else if (recipientRole === 'buyer') {
    order.notification_sent_buyer = true;
  }
  return true;
}

/**
 * Rolls back an idempotency reservation when the underlying email transport fails (e.g. 503 outage),
 * allowing a subsequent retry to succeed once the transport recovers.
 */
async function rollbackNotificationIdempotency(storage, mode, order, eventType, recipientRole) {
  try {
    if (mode === 'db') {
      await storage
        .query(
          'DELETE FROM email_notification_logs WHERE order_id = $1 AND event_type = $2 AND recipient_role = $3',
          [order.id, eventType, recipientRole]
        )
        .catch(() => {});
      if (storage.mem && Array.isArray(storage.mem.email_notification_logs)) {
        storage.mem.email_notification_logs = storage.mem.email_notification_logs.filter(
          (e) =>
            !(
              e.order_id === order.id &&
              e.event_type === eventType &&
              e.recipient_role === recipientRole
            )
        );
      }
      if (recipientRole === 'seller') {
        order.notification_sent_seller = false;
        await storage
          .query('UPDATE orders SET notification_sent_seller = false WHERE id = $1', [order.id])
          .catch(() => {});
        if (storage.mem && Array.isArray(storage.mem.orders)) {
          const memOrd = storage.mem.orders.find((o) => o.id === order.id);
          if (memOrd) memOrd.notification_sent_seller = false;
        }
      } else if (recipientRole === 'buyer') {
        order.notification_sent_buyer = false;
        await storage
          .query('UPDATE orders SET notification_sent_buyer = false WHERE id = $1', [order.id])
          .catch(() => {});
        if (storage.mem && Array.isArray(storage.mem.orders)) {
          const memOrd = storage.mem.orders.find((o) => o.id === order.id);
          if (memOrd) memOrd.notification_sent_buyer = false;
        }
      }
      return;
    }

    if (Array.isArray(storage.email_notification_logs)) {
      storage.email_notification_logs = storage.email_notification_logs.filter(
        (e) =>
          !(
            e.order_id === order.id &&
            e.event_type === eventType &&
            e.recipient_role === recipientRole
          )
      );
    }
    if (recipientRole === 'seller') {
      order.notification_sent_seller = false;
    } else if (recipientRole === 'buyer') {
      order.notification_sent_buyer = false;
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Dispatches Seller and Buyer order lifecycle transactional emails when all 4 security invariants pass.
 *
 * @param {object} dbOrStore - Backend `db` module or Frontend `store` object
 * @param {string} orderId - UUID of the order
 * @param {string} [eventType='escrow_locked'] - `'escrow_locked'` or `'completed'`
 * @param {string|null} [txHashOverride=null] - Verified XRPL transaction hash
 * @returns {Promise<object>}
 */
async function dispatchOrderLifecycleEmails(
  dbOrStore,
  orderId,
  eventType = 'escrow_locked',
  txHashOverride = null
) {
  let resolvedDbOrStore = dbOrStore;
  let resolvedOrderId = orderId;
  let resolvedEventType = eventType;
  let resolvedTxHashOverride = txHashOverride;

  // Support calling as dispatchOrderLifecycleEmails(orderId, eventType, txHashOverride)
  if (typeof dbOrStore === 'string') {
    resolvedOrderId = dbOrStore;
    resolvedEventType = typeof orderId === 'string' ? orderId : 'escrow_locked';
    resolvedTxHashOverride = typeof eventType === 'string' ? eventType : null;
    resolvedDbOrStore = null;
  }

  const normEvent = String(resolvedEventType || 'escrow_locked').trim().toLowerCase() || 'escrow_locked';
  let sellerSent = false;
  let buyerSent = false;

  try {
    const storage = resolveStorageBackend(resolvedDbOrStore);
    if (!storage || !resolvedOrderId) {
      return {
        ok: false,
        skipped: true,
        reason: 'missing_storage_or_order_id',
        sellerSent: false,
        buyerSent: false,
        sentSeller: false,
        sentBuyer: false,
      };
    }

    const ctx = await loadOrderContext(storage, String(resolvedOrderId).trim());
    if (!ctx || !ctx.order) {
      return {
        ok: false,
        skipped: true,
        reason: 'order_not_found',
        sellerSent: false,
        buyerSent: false,
        sentSeller: false,
        sentBuyer: false,
      };
    }

    const { mode, order, seller, buyer, listing } = ctx;

    // Invariant 1: On-Chain Verified Only
    const orderStatus = String(order.status || '').trim();
    if (!VERIFIED_ORDER_STATUSES.has(orderStatus)) {
      return {
        ok: false,
        skipped: true,
        reason: 'unverified_order_status',
        status: orderStatus,
        sellerSent: false,
        buyerSent: false,
        sentSeller: false,
        sentBuyer: false,
      };
    }

    const isCompletedEvent =
      normEvent === 'completed' ||
      normEvent === 'funds_released' ||
      normEvent === 'escrow_finished';

    const effectiveTxHash = String(
      resolvedTxHashOverride ||
        (isCompletedEvent
          ? order.finish_tx_hash || order.escrow_tx_hash
          : order.escrow_tx_hash || order.finish_tx_hash) ||
        ''
    ).trim();

    if (!effectiveTxHash) {
      return {
        ok: false,
        skipped: true,
        reason: 'missing_onchain_tx_hash',
        status: orderStatus,
        sellerSent: false,
        buyerSent: false,
        sentSeller: false,
        sentBuyer: false,
      };
    }

    const listingTitle = order.listing_title || (listing && listing.title) || 'Digital Asset';
    const currency = String(
      order.settlement_currency || order.currency || (listing && listing.currency) || 'XRP'
    ).toUpperCase();
    const totalAmount =
      order.total_xrp != null
        ? order.total_xrp
        : listing && listing.price_xrp != null
          ? listing.price_xrp
          : '0';
    const sellerNetAmount =
      order.seller_receives_xrp != null ? order.seller_receives_xrp : totalAmount;
    const buyerWallet =
      order.buyer_wallet_address ||
      order.buyer_address ||
      (buyer && buyer.wallet_address) ||
      '';
    const sellerWallet =
      order.seller_wallet_address ||
      order.seller_address ||
      (seller && seller.wallet_address) ||
      '';

    const errors = [];
    let sellerSkippedReason = null;
    let buyerSkippedReason = null;

    // Invariant 2 & 3: Seller Email Check + Idempotency + Fault Isolation
    const sellerEligible = Boolean(
      seller &&
        typeof seller.notification_email === 'string' &&
        seller.notification_email.trim() &&
        seller.email_verified === true &&
        seller.notify_on_sale !== false
    );

    if (!sellerEligible) {
      sellerSkippedReason = !seller
        ? 'seller_not_found'
        : !seller.notification_email
          ? 'no_seller_email'
          : seller.email_verified !== true
            ? 'seller_email_unverified'
            : 'seller_notifications_disabled';
    } else {
      const alreadySentSeller = await hasNotificationBeenLogged(
        storage,
        mode,
        order,
        normEvent,
        'seller'
      );
      if (alreadySentSeller) {
        sellerSkippedReason = 'already_sent_idempotent';
      } else {
        const claimedSeller = await recordNotificationIdempotency(
          storage,
          mode,
          order,
          normEvent,
          'seller',
          seller.id
        );
        if (!claimedSeller) {
          sellerSkippedReason = 'already_sent_idempotent';
        } else {
          try {
            await sendSellerOrderEmail({
              to: seller.notification_email.trim(),
              orderId: order.id,
              listingTitle,
              netAmountXrp: sellerNetAmount,
              currency,
              buyerWallet,
              buyerUsername: buyer && buyer.username ? buyer.username : undefined,
              txHash: effectiveTxHash,
              orderStatus: isCompletedEvent
                ? 'Completed — Funds Released'
                : 'Escrow Locked on XRPL',
              eventType: normEvent,
            });
            sellerSent = true;
          } catch (sellerErr) {
            await rollbackNotificationIdempotency(storage, mode, order, normEvent, 'seller');
            console.warn(
              `[OrderNotificationDispatcher] Seller email failed for order ${order.id}:`,
              sellerErr && sellerErr.message ? sellerErr.message : sellerErr
            );
            errors.push(
              sellerErr && sellerErr.message
                ? sellerErr.message
                : 'Seller email dispatch failed'
            );
          }
        }
      }
    }

    // Invariant 2 & 3: Buyer Email Check + Idempotency + Fault Isolation
    const buyerEligible = Boolean(
      buyer &&
        typeof buyer.notification_email === 'string' &&
        buyer.notification_email.trim() &&
        buyer.email_verified === true &&
        buyer.notify_on_purchase !== false
    );

    if (!buyerEligible) {
      buyerSkippedReason = !buyer
        ? 'buyer_not_found'
        : !buyer.notification_email
          ? 'no_buyer_email'
          : buyer.email_verified !== true
            ? 'buyer_email_unverified'
            : 'buyer_notifications_disabled';
    } else {
      const alreadySentBuyer = await hasNotificationBeenLogged(
        storage,
        mode,
        order,
        normEvent,
        'buyer'
      );
      if (alreadySentBuyer) {
        buyerSkippedReason = 'already_sent_idempotent';
      } else {
        const claimedBuyer = await recordNotificationIdempotency(
          storage,
          mode,
          order,
          normEvent,
          'buyer',
          buyer.id
        );
        if (!claimedBuyer) {
          buyerSkippedReason = 'already_sent_idempotent';
        } else {
          try {
            await sendBuyerOrderEmail({
              to: buyer.notification_email.trim(),
              orderId: order.id,
              listingTitle,
              amountPaidXrp: totalAmount,
              currency,
              sellerWallet,
              sellerUsername: seller && seller.username ? seller.username : undefined,
              txHash: effectiveTxHash,
              orderStatus: isCompletedEvent
                ? 'Completed — Digital Vault Unlocked'
                : 'Escrow Locked — Vault Ready',
              eventType: normEvent,
            });
            buyerSent = true;
          } catch (buyerErr) {
            await rollbackNotificationIdempotency(storage, mode, order, normEvent, 'buyer');
            console.warn(
              `[OrderNotificationDispatcher] Buyer email failed for order ${order.id}:`,
              buyerErr && buyerErr.message ? buyerErr.message : buyerErr
            );
            errors.push(
              buyerErr && buyerErr.message
                ? buyerErr.message
                : 'Buyer email dispatch failed'
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      return {
        ok: false,
        error: errors[0],
        errors,
        orderId: order.id,
        eventType: normEvent,
        txHash: effectiveTxHash,
        sellerSent,
        buyerSent,
        sentSeller: sellerSent,
        sentBuyer: buyerSent,
        sellerSkippedReason,
        buyerSkippedReason,
      };
    }

    return {
      ok: true,
      orderId: order.id,
      eventType: normEvent,
      txHash: effectiveTxHash,
      sellerSent,
      buyerSent,
      sentSeller: sellerSent,
      sentBuyer: buyerSent,
      sellerSkippedReason,
      buyerSkippedReason,
    };
  } catch (err) {
    console.warn(
      '[OrderNotificationDispatcher] Non-fatal dispatch error:',
      err && err.message ? err.message : err
    );
    return {
      ok: false,
      error: (err && err.message) || 'Unexpected email dispatcher error',
      orderId: resolvedOrderId,
      eventType: normEvent,
      sellerSent,
      buyerSent,
      sentSeller: sellerSent,
      sentBuyer: buyerSent,
    };
  }
}

module.exports = {
  dispatchOrderLifecycleEmails,
  maskEmail,
  hashOtpCode,
  verifyOtpHashConstantTime,
  validateAndNormalizeEmail,
  checkEmailOtpRateLimit,
  resetEmailOtpRateLimits,
};
