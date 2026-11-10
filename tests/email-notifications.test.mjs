/**
 * XRPHarbor (xrpharbor.com) — Email Notification Security & Reliability Test Suite
 *
 * Tests BOTH Backend modules:
 *   - xrp-marketplace-backend/src/db/index.js
 *   - xrp-marketplace-backend/src/utils/piiGuard.js
 *   - xrp-marketplace-backend/src/services/emailService.js
 *   - xrp-marketplace-backend/src/services/orderNotificationDispatcher.js
 *   - xrp-marketplace-backend/src/routes/index.js
 * AND Frontend modules:
 *   - xrp-marketplace-frontend/src/lib/emailService.js
 *   - xrp-marketplace-frontend/src/lib/orderNotificationDispatcher.js
 *   - xrp-marketplace-frontend/src/app/api/[...path]/route.js
 *
 * Covers all 5 mandatory security & reliability test suites:
 *   1. Anti-Spam Rule (email_verified === false)
 *   2. OTP Security (Expired OTP, Wrong OTP, 5-Attempt Lockout, Constant-Time Comparison, & Rate Limiting)
 *   3. Zero PII Leak (stripUserPii, stripOrderPii, & HTTP endpoints)
 *   4. HTML Escaping & Phishing Defense (escapeHtml & sanitizeAppUrl)
 *   5. Fault Isolation & Idempotency (503 Outage resilience + 1x Seller / 1x Buyer deduplication)
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

function resolveBackendRoot() {
  const candidates = [
    path.resolve(frontendRoot, '../../xrp-marketplace-backend-main/xrp-marketplace-backend-main'),
    path.resolve(frontendRoot, '../xrp-marketplace-backend-main/xrp-marketplace-backend-main'),
    path.resolve(frontendRoot, '../xrp-marketplace-backend-main'),
    path.resolve(frontendRoot, '../xrp-marketplace-backend'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'src', 'routes', 'index.js'))) {
      return c;
    }
  }
  throw new Error(`Could not locate xrp-marketplace-backend repository from ${frontendRoot}`);
}

const backendRoot = resolveBackendRoot();
const requireBackend = createRequire(path.join(backendRoot, 'package.json'));
const requireFrontend = createRequire(path.join(frontendRoot, 'package.json'));

const TEST_JWT_SECRET = 'xrpharbor-email-security-test-jwt-secret-2026';
const TEST_OTP_SECRET = 'xrpharbor-email-security-test-otp-hmac-secret-2026';
process.env.JWT_SECRET = process.env.JWT_SECRET || TEST_JWT_SECRET;
process.env.EMAIL_OTP_SECRET = process.env.EMAIL_OTP_SECRET || TEST_OTP_SECRET;

// Load Backend modules
const backendDb = requireBackend('./src/db/index.js');
const backendPiiGuard = requireBackend('./src/utils/piiGuard.js');
const backendEmailService = requireBackend('./src/services/emailService.js');
const backendDispatcher = requireBackend('./src/services/orderNotificationDispatcher.js');
const backendRouter = requireBackend('./src/routes/index.js');
const express = requireBackend('express');
const jwt = requireBackend('jsonwebtoken');

// Load Frontend modules
const frontendEmailService = requireFrontend('./src/lib/emailService.js');
const frontendDispatcher = requireFrontend('./src/lib/orderNotificationDispatcher.js');
const frontendRouteMod = await import('../src/app/api/[...path]/route.js');

const FORBIDDEN_PII_KEYS = [
  'notification_email',
  'notificationEmail',
  'email',
  'buyer_email',
  'seller_email',
  'email_verification_code_hash',
  'emailVerificationCodeHash',
  'email_verification_attempts',
  'notify_on_sale',
  'notify_on_purchase',
];

function base64urlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function mintJwtToken(payload) {
  const secret = process.env.JWT_SECRET || TEST_JWT_SECRET;
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64urlEncode(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  );
  const sig = base64urlEncode(
    crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

async function callFrontendApi(method, apiPath, { body, token, headers = {} } = {}) {
  const cleanUrl = new URL(apiPath.startsWith('http') ? apiPath : `http://localhost:3000${apiPath}`);
  const pathSegments = cleanUrl.pathname
    .replace(/^\/api\/?/, '')
    .split('/')
    .filter(Boolean);

  const reqHeaders = new Headers(headers);
  if (token) {
    reqHeaders.set('authorization', `Bearer ${token}`);
  }
  let reqBody = undefined;
  if (body !== undefined) {
    reqHeaders.set('content-type', 'application/json');
    reqBody = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const req = new Request(cleanUrl.toString(), {
    method,
    headers: reqHeaders,
    body: reqBody,
  });
  req.nextUrl = cleanUrl;

  const handlerFn = frontendRouteMod[method.toUpperCase()] || frontendRouteMod.GET;
  const res = await handlerFn(req, {
    params: Promise.resolve({ path: pathSegments }),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

function assertZeroForbiddenPii(obj, contextLabel) {
  assert.ok(obj !== null && obj !== undefined, `${contextLabel}: response should not be null/undefined`);
  const serialized = JSON.stringify(obj);

  function walk(node, pathPrefix = 'root') {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, idx) => walk(item, `${pathPrefix}[${idx}]`));
      return;
    }
    for (const key of Object.keys(node)) {
      assert.equal(
        FORBIDDEN_PII_KEYS.includes(key),
        false,
        `${contextLabel}: Forbidden PII key "${key}" leaked at ${pathPrefix}.${key}`
      );
      walk(node[key], `${pathPrefix}.${key}`);
    }
  }

  walk(obj);
  assert.equal(
    serialized.includes('secret-seller-pii@example.com'),
    false,
    `${contextLabel}: Raw seller email leaked in serialized JSON`
  );
  assert.equal(
    serialized.includes('secret-buyer-pii@example.com'),
    false,
    `${contextLabel}: Raw buyer email leaked in serialized JSON`
  );
}

export async function runEmailNotificationSecurityTests({ quiet = false } = {}) {
  const results = [];
  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  async function runSuite(name, fn) {
    try {
      await fn();
      results.push({ name, passed: true });
      log(`  ✅ PASS: ${name}`);
    } catch (err) {
      results.push({ name, passed: false, error: err });
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     ${err && err.stack ? err.stack : err}`);
      throw err;
    }
  }

  log('\n================================================================================');
  log('🛡️  XRPHarbor Email Notification Security & Reliability Audit Suite');
  log('================================================================================');

  // Start ephemeral Express server for Backend HTTP route verification
  const app = express();
  app.use(express.json());
  app.use('/api', backendRouter);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const backendPort = server.address().port;
  const backendBaseUrl = `http://127.0.0.1:${backendPort}`;

  async function callBackendApi(method, apiPath, { body, token, headers = {} } = {}) {
    const reqHeaders = { ...headers };
    if (token) reqHeaders['authorization'] = `Bearer ${token}`;
    if (body !== undefined) reqHeaders['content-type'] = 'application/json';
    const res = await fetch(`${backendBaseUrl}${apiPath}`, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, headers: res.headers, text, json };
  }

  // Trigger frontend store initialization once
  await callFrontendApi('GET', '/api/listings');
  const frontendStore = globalThis.__xrpharborStore;
  assert.ok(frontendStore && Array.isArray(frontendStore.users), 'Frontend in-memory store must be initialized');

  try {
    // =========================================================================
    // SUITE 1: Anti-Spam Rule (email_verified === false)
    // =========================================================================
    await runSuite(
      'Suite 1: Anti-Spam Rule (email_verified === false) blocks unverified emails on Backend & Frontend',
      async () => {
        backendEmailService.clearTestEmailTransport();
        backendEmailService.clearCapturedEmails();

        // 1A. Backend DB test
        const sellerId = crypto.randomUUID();
        const buyerId = crypto.randomUUID();
        const listingId = crypto.randomUUID();
        const orderId = crypto.randomUUID();
        const txHash = crypto.randomBytes(32).toString('hex').toUpperCase();

        backendDb.mem.users.push(
          {
            id: sellerId,
            wallet_address: 'rUnverifiedSeller11111111111111111',
            username: 'unverified_seller',
            role: 'user',
            notification_email: 'unverified-seller@example.com',
            email_verified: false,
            notify_on_sale: true,
            notify_on_purchase: true,
          },
          {
            id: buyerId,
            wallet_address: 'rUnverifiedBuyer222222222222222222',
            username: 'unverified_buyer',
            role: 'user',
            notification_email: 'unverified-buyer@example.com',
            email_verified: false,
            notify_on_sale: true,
            notify_on_purchase: true,
          }
        );

        backendDb.mem.listings.push({
          id: listingId,
          seller_id: sellerId,
          title: 'Unverified Email Test Asset',
          price_xrp: 25,
          currency: 'XRP',
          status: 'active',
        });

        backendDb.mem.orders.push({
          id: orderId,
          listing_id: listingId,
          listing_title: 'Unverified Email Test Asset',
          buyer_id: buyerId,
          seller_id: sellerId,
          buyer_wallet_address: 'rUnverifiedBuyer222222222222222222',
          seller_wallet_address: 'rUnverifiedSeller11111111111111111',
          total_xrp: 25,
          seller_receives_xrp: 25,
          currency: 'XRP',
          status: 'escrow_locked',
          escrow_tx_hash: txHash,
          escrow_sequence: 777111,
          notification_sent_seller: false,
          notification_sent_buyer: false,
        });

        const backendRes = await backendDispatcher.dispatchOrderLifecycleEmails(
          backendDb,
          orderId,
          'escrow_locked',
          txHash
        );
        assert.equal(backendRes.sentSeller, false, 'Backend sentSeller must be false when email_verified=false');
        assert.equal(backendRes.sentBuyer, false, 'Backend sentBuyer must be false when email_verified=false');
        assert.equal(backendRes.sellerSent, false);
        assert.equal(backendRes.buyerSent, false);
        assert.equal(backendRes.sellerSkippedReason, 'seller_email_unverified');
        assert.equal(backendRes.buyerSkippedReason, 'buyer_email_unverified');
        assert.equal(
          backendEmailService.getCapturedEmails().length,
          0,
          'Zero emails must be dispatched when email_verified === false (Backend)'
        );

        // 1B. Frontend Store test
        const feOrderId = crypto.randomUUID();
        frontendStore.users.push(
          {
            id: sellerId,
            wallet_address: 'rUnverifiedSeller11111111111111111',
            username: 'unverified_seller',
            role: 'user',
            notification_email: 'unverified-seller@example.com',
            email_verified: false,
            notify_on_sale: true,
            notify_on_purchase: true,
          },
          {
            id: buyerId,
            wallet_address: 'rUnverifiedBuyer222222222222222222',
            username: 'unverified_buyer',
            role: 'user',
            notification_email: 'unverified-buyer@example.com',
            email_verified: false,
            notify_on_sale: true,
            notify_on_purchase: true,
          }
        );
        frontendStore.orders.push({
          id: feOrderId,
          listing_id: listingId,
          listing_title: 'Unverified Email Test Asset',
          buyer_id: buyerId,
          seller_id: sellerId,
          buyer_wallet_address: 'rUnverifiedBuyer222222222222222222',
          seller_wallet_address: 'rUnverifiedSeller11111111111111111',
          total_xrp: 25,
          seller_receives_xrp: 25,
          currency: 'XRP',
          status: 'escrow_locked',
          escrow_tx_hash: txHash,
          escrow_sequence: 777112,
          notification_sent_seller: false,
          notification_sent_buyer: false,
        });

        const frontendRes = await frontendDispatcher.dispatchOrderLifecycleEmails(
          frontendStore,
          feOrderId,
          'escrow_locked',
          txHash
        );
        assert.equal(frontendRes.sentSeller, false, 'Frontend sentSeller must be false when email_verified=false');
        assert.equal(frontendRes.sentBuyer, false, 'Frontend sentBuyer must be false when email_verified=false');
        assert.equal(
          frontendEmailService.getCapturedEmails().length,
          0,
          'Zero emails must be dispatched when email_verified === false (Frontend)'
        );
      }
    );

    // =========================================================================
    // SUITE 2: OTP Security (Expired OTP, Wrong OTP, 5-Attempt Lockout,
    //          Constant-Time Comparison, & Rate Limiting)
    // =========================================================================
    await runSuite(
      'Suite 2: OTP Security (Expired OTP, Wrong OTP, 5-Attempt Lockout, Constant-Time Comparison, & 3/15m Rate Limit)',
      async () => {
        backendDispatcher.resetEmailOtpRateLimits();
        frontendDispatcher.resetEmailOtpRateLimits();
        backendEmailService.clearTestEmailTransport();
        backendEmailService.clearCapturedEmails();

        // 2A. Constant-Time HMAC Comparison unit checks
        const sampleUserId = crypto.randomUUID();
        const sampleEmail = 'otp-unit@example.com';
        const validOtp = '482910';
        const expectedHash = backendDispatcher.hashOtpCode(sampleUserId, sampleEmail, validOtp);
        const feExpectedHash = frontendDispatcher.hashOtpCode(sampleUserId, sampleEmail, validOtp);
        assert.equal(expectedHash, feExpectedHash, 'Backend and Frontend hashOtpCode must produce identical HMAC-SHA256 digests');
        assert.equal(backendDispatcher.verifyOtpHashConstantTime(expectedHash, expectedHash), true);
        assert.equal(
          backendDispatcher.verifyOtpHashConstantTime(
            backendDispatcher.hashOtpCode(sampleUserId, sampleEmail, '000000'),
            expectedHash
          ),
          false
        );
        assert.equal(backendDispatcher.verifyOtpHashConstantTime('not-hex', expectedHash), false);
        assert.equal(backendDispatcher.verifyOtpHashConstantTime('abcd', expectedHash), false);

        // 2B. Test Expired OTP, Wrong OTP, 5-Attempt Lockout + 6th-attempt valid OTP rejection, and Rate Limit on BOTH Backend & Frontend
        for (const target of ['backend', 'frontend']) {
          backendDispatcher.resetEmailOtpRateLimits();
          frontendDispatcher.resetEmailOtpRateLimits();
          backendEmailService.clearCapturedEmails();

          const userId = crypto.randomUUID();
          const wallet = 'rOtpSecurityUser99999999999999999';
          const userEmail = `otp-${target}@example.com`;
          const token = mintJwtToken({ id: userId, walletAddress: wallet, role: 'user' });

          const userRecord = {
            id: userId,
            wallet_address: wallet,
            username: `otp_user_${target}`,
            role: 'user',
            notification_email: null,
            email_verified: false,
            email_verification_code_hash: null,
            email_verification_expires_at: null,
            email_verification_attempts: 0,
            notify_on_sale: true,
            notify_on_purchase: true,
          };

          if (target === 'backend') {
            backendDb.mem.users.push(userRecord);
          } else {
            frontendStore.users.push(userRecord);
          }

          const callApi = target === 'backend' ? callBackendApi : callFrontendApi;

          // Step 1: Request OTP #1 (valid)
          const req1 = await callApi('POST', '/api/notifications/email', {
            token,
            body: { email: userEmail },
            headers: { 'cf-connecting-ip': `198.51.100.${target === 'backend' ? '10' : '20'}` },
          });
          assert.equal(req1.status, 200, `[${target}] 1st OTP request should succeed (200)`);
          assert.equal(req1.json.emailVerified, false);
          assert.equal(req1.json.pendingVerification, true);

          // Force expiration in the past and verify expired OTP is rejected with 400 + expired: true and clears hash
          const expiredCode = '123456';
          userRecord.email_verification_code_hash = backendDispatcher.hashOtpCode(userId, userEmail, expiredCode);
          userRecord.email_verification_expires_at = new Date(Date.now() - 60_000).toISOString();
          userRecord.email_verification_attempts = 0;

          const expVerify = await callApi('POST', '/api/notifications/verify', {
            token,
            body: { code: expiredCode },
          });
          assert.equal(expVerify.status, 400, `[${target}] Expired OTP must return 400`);
          assert.equal(expVerify.json.expired, true, `[${target}] Expired OTP response must set expired: true`);
          assert.equal(
            userRecord.email_verification_code_hash,
            null,
            `[${target}] Expired OTP check must clear email_verification_code_hash`
          );

          // Step 2: Set a fresh, valid OTP code and test 5 wrong attempts followed by 6th attempt with the originally valid OTP
          const realOtp = '654321';
          const wrongOtp = '111111';
          userRecord.email_verification_code_hash = backendDispatcher.hashOtpCode(userId, userEmail, realOtp);
          userRecord.email_verification_expires_at = new Date(Date.now() + 15 * 60_000).toISOString();
          userRecord.email_verification_attempts = 0;

          for (let attempt = 1; attempt <= 4; attempt++) {
            const badRes = await callApi('POST', '/api/notifications/verify', {
              token,
              body: { code: wrongOtp },
            });
            assert.equal(badRes.status, 400, `[${target}] Wrong OTP attempt #${attempt} must return 400`);
            assert.equal(
              badRes.json.attemptsRemaining,
              5 - attempt,
              `[${target}] Wrong OTP attempt #${attempt} must report ${5 - attempt} attempts remaining`
            );
            assert.equal(
              userRecord.email_verification_attempts,
              attempt,
              `[${target}] email_verification_attempts must increment to ${attempt}`
            );
          }

          // 5th failed attempt -> 429 Lockout + invalidates email_verification_code_hash
          const fifthRes = await callApi('POST', '/api/notifications/verify', {
            token,
            body: { code: wrongOtp },
          });
          assert.equal(fifthRes.status, 429, `[${target}] 5th failed OTP attempt must return 429`);
          assert.equal(fifthRes.json.lockedOut, true, `[${target}] 5th failed OTP attempt must set lockedOut: true`);
          assert.equal(
            userRecord.email_verification_code_hash,
            null,
            `[${target}] 5th failed OTP attempt must invalidate email_verification_code_hash (set to null)`
          );

          // 6th attempt submitting the ORIGINALLY VALID 6-digit OTP -> MUST FAIL!
          const sixthRes = await callApi('POST', '/api/notifications/verify', {
            token,
            body: { code: realOtp },
          });
          assert.ok(
            sixthRes.status === 429 || sixthRes.status === 400,
            `[${target}] 6th attempt with originally valid OTP must fail after lockout (got ${sixthRes.status})`
          );
          assert.equal(
            userRecord.email_verified,
            false,
            `[${target}] User email_verified must remain false on 6th attempt`
          );

          // Step 3: Rate limiting on POST /api/notifications/email (3 allowed within 15m, 4th blocked with 429)
          // Note: req1 was #1; let's send #2 and #3, then verify #4 is blocked with 429
          const ipHeader = { 'cf-connecting-ip': `198.51.100.${target === 'backend' ? '10' : '20'}` };
          const req2 = await callApi('POST', '/api/notifications/email', {
            token,
            body: { email: userEmail },
            headers: ipHeader,
          });
          assert.equal(req2.status, 200, `[${target}] 2nd OTP request within 15m should succeed (200)`);

          const req3 = await callApi('POST', '/api/notifications/email', {
            token,
            body: { email: userEmail },
            headers: ipHeader,
          });
          assert.equal(req3.status, 200, `[${target}] 3rd OTP request within 15m should succeed (200)`);

          const req4 = await callApi('POST', '/api/notifications/email', {
            token,
            body: { email: userEmail },
            headers: ipHeader,
          });
          assert.equal(req4.status, 429, `[${target}] 4th OTP request within 15m must be blocked with 429 Too Many Requests`);
          assert.ok(
            Number(req4.json.retryAfterSeconds) > 0,
            `[${target}] 429 response must include positive retryAfterSeconds`
          );

          // Reset rate limits as required
          backendDispatcher.resetEmailOtpRateLimits();
          frontendDispatcher.resetEmailOtpRateLimits();
        }
      }
    );

    // =========================================================================
    // SUITE 3: Zero PII Leak
    // =========================================================================
    await runSuite(
      'Suite 3: Zero PII Leak across stripUserPii, stripOrderPii, and all User/Listing/Order HTTP Endpoints',
      async () => {
        const rawUserWithPii = {
          id: crypto.randomUUID(),
          wallet_address: 'rPiiTestSeller1111111111111111111',
          username: 'pii_test_seller',
          bio: 'Creator bio',
          email: 'secret-seller-pii@example.com',
          notification_email: 'secret-seller-pii@example.com',
          notificationEmail: 'secret-seller-pii@example.com',
          buyer_email: 'secret-buyer-pii@example.com',
          seller_email: 'secret-seller-pii@example.com',
          email_verified: true,
          emailVerified: true,
          email_verification_code_hash: 'deadbeef'.repeat(8),
          emailVerificationCodeHash: 'deadbeef'.repeat(8),
          email_verification_attempts: 3,
          email_verification_expires_at: new Date().toISOString(),
          notify_on_sale: true,
          notify_on_purchase: true,
          notification_prefs: {
            socials: { twitter: '@xrpharbor' },
            avatar_frame: 'gold',
          },
        };

        const rawOrderWithPii = {
          id: crypto.randomUUID(),
          listing_id: crypto.randomUUID(),
          buyer_id: crypto.randomUUID(),
          seller_id: rawUserWithPii.id,
          total_xrp: 50,
          status: 'escrow_locked',
          email: 'secret-seller-pii@example.com',
          notification_email: 'secret-seller-pii@example.com',
          notificationEmail: 'secret-seller-pii@example.com',
          buyer_email: 'secret-buyer-pii@example.com',
          seller_email: 'secret-seller-pii@example.com',
          email_verification_code_hash: 'deadbeef'.repeat(8),
          emailVerificationCodeHash: 'deadbeef'.repeat(8),
          email_verification_attempts: 2,
          notify_on_sale: true,
          notify_on_purchase: true,
          buyer: { ...rawUserWithPii, notification_email: 'secret-buyer-pii@example.com' },
          seller: { ...rawUserWithPii },
        };

        // Direct unit checks on backendPiiGuard
        assertZeroForbiddenPii(
          backendPiiGuard.stripUserPii(rawUserWithPii, { isSelf: false }),
          'backend stripUserPii(isSelf: false)'
        );
        assertZeroForbiddenPii(
          backendPiiGuard.stripUserPii(rawUserWithPii, { isSelf: true }),
          'backend stripUserPii(isSelf: true)'
        );
        assertZeroForbiddenPii(
          backendPiiGuard.stripOrderPii(rawOrderWithPii),
          'backend stripOrderPii(order)'
        );

        // HTTP endpoint checks on BOTH Backend and Frontend
        for (const target of ['backend', 'frontend']) {
          const sellerId = crypto.randomUUID();
          const buyerId = crypto.randomUUID();
          const listingId = crypto.randomUUID();
          const orderId = crypto.randomUUID();

          const sellerObj = {
            id: sellerId,
            wallet_address: 'rPiiHttpSeller1111111111111111111',
            username: `seller_pii_${target}`,
            role: 'user',
            is_verified: true,
            reputation_score: 4.95,
            email: 'secret-seller-pii@example.com',
            notification_email: 'secret-seller-pii@example.com',
            notificationEmail: 'secret-seller-pii@example.com',
            seller_email: 'secret-seller-pii@example.com',
            email_verified: true,
            email_verification_code_hash: 'aaaa1111'.repeat(8),
            emailVerificationCodeHash: 'aaaa1111'.repeat(8),
            email_verification_attempts: 2,
            notify_on_sale: true,
            notify_on_purchase: true,
          };

          const buyerObj = {
            id: buyerId,
            wallet_address: 'rPiiHttpBuyer22222222222222222222',
            username: `buyer_pii_${target}`,
            role: 'user',
            is_verified: false,
            reputation_score: 5.0,
            email: 'secret-buyer-pii@example.com',
            notification_email: 'secret-buyer-pii@example.com',
            notificationEmail: 'secret-buyer-pii@example.com',
            buyer_email: 'secret-buyer-pii@example.com',
            email_verified: true,
            email_verification_code_hash: 'bbbb2222'.repeat(8),
            emailVerificationCodeHash: 'bbbb2222'.repeat(8),
            email_verification_attempts: 1,
            notify_on_sale: true,
            notify_on_purchase: true,
          };

          const listingObj = {
            id: listingId,
            seller_id: sellerId,
            title: `PII Guard Listing ${target}`,
            description: 'Testing zero PII leakage',
            category: 'software',
            price_xrp: 40,
            currency: 'XRP',
            status: 'active',
            images: [],
            notification_email: 'secret-seller-pii@example.com',
            seller_email: 'secret-seller-pii@example.com',
            email_verification_code_hash: 'aaaa1111'.repeat(8),
            notify_on_sale: true,
            created_at: new Date().toISOString(),
          };

          const orderObj = {
            id: orderId,
            listing_id: listingId,
            listing_title: listingObj.title,
            buyer_id: buyerId,
            seller_id: sellerId,
            buyer_wallet_address: buyerObj.wallet_address,
            seller_wallet_address: sellerObj.wallet_address,
            total_xrp: 40,
            seller_receives_xrp: 40,
            currency: 'XRP',
            status: 'escrow_locked',
            escrow_tx_hash: crypto.randomBytes(32).toString('hex').toUpperCase(),
            escrow_sequence: 888222,
            email: 'secret-seller-pii@example.com',
            notification_email: 'secret-seller-pii@example.com',
            notificationEmail: 'secret-seller-pii@example.com',
            buyer_email: 'secret-buyer-pii@example.com',
            seller_email: 'secret-seller-pii@example.com',
            email_verification_code_hash: 'aaaa1111'.repeat(8),
            emailVerificationCodeHash: 'aaaa1111'.repeat(8),
            email_verification_attempts: 2,
            notify_on_sale: true,
            notify_on_purchase: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (target === 'backend') {
            backendDb.mem.users.push(sellerObj, buyerObj);
            backendDb.mem.listings.push(listingObj);
            backendDb.mem.orders.push(orderObj);
          } else {
            frontendStore.users.push(sellerObj, buyerObj);
            frontendStore.listings.push(listingObj);
            frontendStore.orders.push(orderObj);
          }

          const sellerToken = mintJwtToken({
            id: sellerId,
            walletAddress: sellerObj.wallet_address,
            role: 'user',
          });
          const buyerToken = mintJwtToken({
            id: buyerId,
            walletAddress: buyerObj.wallet_address,
            role: 'user',
          });
          const callApi = target === 'backend' ? callBackendApi : callFrontendApi;

          // 1. GET /api/users/:id
          const userRes = await callApi('GET', `/api/users/${sellerId}`);
          assert.equal(userRes.status, 200, `[${target}] GET /api/users/:id should return 200`);
          assertZeroForbiddenPii(userRes.json, `[${target}] GET /api/users/:id`);

          // Also check PATCH /api/users/me (isSelf: true)
          const selfRes = await callApi('PATCH', '/api/users/me', {
            token: sellerToken,
            body: { bio: 'Updated creator bio' },
          });
          assert.equal(selfRes.status, 200, `[${target}] PATCH /api/users/me should return 200`);
          assertZeroForbiddenPii(selfRes.json, `[${target}] PATCH /api/users/me (isSelf: true)`);

          // 2. GET /api/listings
          const listingsRes = await callApi('GET', '/api/listings');
          assert.equal(listingsRes.status, 200, `[${target}] GET /api/listings should return 200`);
          assertZeroForbiddenPii(listingsRes.json, `[${target}] GET /api/listings`);

          // 3. GET /api/listings/:id
          const listingRes = await callApi('GET', `/api/listings/${listingId}`);
          assert.equal(listingRes.status, 200, `[${target}] GET /api/listings/:id should return 200`);
          assertZeroForbiddenPii(listingRes.json, `[${target}] GET /api/listings/:id`);

          // 4. GET /api/orders/:id as Buyer and as Seller
          const orderBuyerRes = await callApi('GET', `/api/orders/${orderId}`, { token: buyerToken });
          assert.equal(orderBuyerRes.status, 200, `[${target}] GET /api/orders/:id (Buyer) should return 200`);
          assertZeroForbiddenPii(orderBuyerRes.json, `[${target}] GET /api/orders/:id (as Buyer)`);

          const orderSellerRes = await callApi('GET', `/api/orders/${orderId}`, { token: sellerToken });
          assert.equal(orderSellerRes.status, 200, `[${target}] GET /api/orders/:id (Seller) should return 200`);
          assertZeroForbiddenPii(orderSellerRes.json, `[${target}] GET /api/orders/:id (as Seller)`);

          // 5. GET /api/orders/mine as Buyer and as Seller
          const mineBuyerRes = await callApi('GET', '/api/orders/mine?role=buyer', { token: buyerToken });
          assert.equal(mineBuyerRes.status, 200, `[${target}] GET /api/orders/mine?role=buyer should return 200`);
          assertZeroForbiddenPii(mineBuyerRes.json, `[${target}] GET /api/orders/mine?role=buyer`);

          const mineSellerRes = await callApi('GET', '/api/orders/mine?role=seller', { token: sellerToken });
          assert.equal(mineSellerRes.status, 200, `[${target}] GET /api/orders/mine?role=seller should return 200`);
          assertZeroForbiddenPii(mineSellerRes.json, `[${target}] GET /api/orders/mine?role=seller`);
        }
      }
    );

    // =========================================================================
    // SUITE 4: HTML Escaping & Phishing Defense
    // =========================================================================
    await runSuite(
      'Suite 4: HTML Escaping & Phishing Defense (XSS payload neutralized in Seller & Buyer emails + sanitizeAppUrl)',
      async () => {
        const maliciousTitle = '<img src=x onerror=alert(1)><a href="https://evil.com">Claim</a>';
        const expectedEscaped =
          '&lt;img src=x onerror=alert(1)&gt;&lt;a href=&quot;https://evil.com&quot;&gt;Claim&lt;/a&gt;';

        for (const [label, svc] of [
          ['backend', backendEmailService],
          ['frontend', frontendEmailService],
        ]) {
          svc.clearTestEmailTransport();
          svc.clearCapturedEmails();

          assert.equal(
            svc.escapeHtml(maliciousTitle),
            expectedEscaped,
            `[${label}] escapeHtml must encode <, >, ", ', and &`
          );

          // Verify sanitizeAppUrl blocks external phishing domains, javascript: URIs, and raw R2 storage URLs
          assert.equal(
            svc.sanitizeAppUrl('https://evil.com/phishing'),
            'https://xrpharbor.com/',
            `[${label}] sanitizeAppUrl must block external domain https://evil.com`
          );
          assert.equal(
            svc.sanitizeAppUrl('javascript:alert(1)'),
            'https://xrpharbor.com/',
            `[${label}] sanitizeAppUrl must block javascript: protocol`
          );
          assert.equal(
            svc.sanitizeAppUrl('https://account123.r2.cloudflarestorage.com/vault/secret.zip'),
            'https://xrpharbor.com/',
            `[${label}] sanitizeAppUrl must block raw *.r2.cloudflarestorage.com URLs`
          );
          assert.equal(
            svc.sanitizeAppUrl('https://pub-123456.r2.dev/vault/secret.zip'),
            'https://xrpharbor.com/',
            `[${label}] sanitizeAppUrl must block raw *.r2.dev URLs`
          );
          assert.equal(
            svc.sanitizeAppUrl('/orders/11111111-1111-4111-8111-111111111111'),
            'https://xrpharbor.com/orders/11111111-1111-4111-8111-111111111111',
            `[${label}] sanitizeAppUrl must allow relative paths on https://xrpharbor.com`
          );

          const orderId = crypto.randomUUID();
          const txHash = crypto.randomBytes(32).toString('hex').toUpperCase();

          await svc.sendSellerOrderEmail({
            to: 'seller-xss-check@example.com',
            orderId,
            listingTitle: maliciousTitle,
            netAmountXrp: '95.5',
            currency: 'XRP',
            buyerWallet: 'rBuyerXssWallet111111111111111111',
            txHash,
            orderStatus: 'Escrow Locked on XRPL',
          });

          await svc.sendBuyerOrderEmail({
            to: 'buyer-xss-check@example.com',
            orderId,
            listingTitle: maliciousTitle,
            amountPaidXrp: '95.5',
            currency: 'XRP',
            sellerWallet: 'rSellerXssWallet22222222222222222',
            txHash,
            orderStatus: 'Escrow Locked — Vault Ready',
          });

          const captured = svc.getCapturedEmails();
          assert.equal(captured.length, 2, `[${label}] Should capture 1 Seller email and 1 Buyer email`);

          for (const msg of captured) {
            assert.ok(
              msg.html.includes(expectedEscaped),
              `[${label}] Email HTML to ${msg.to} must contain escaped title: ${expectedEscaped}`
            );
            assert.equal(
              msg.html.includes('<img'),
              false,
              `[${label}] Email HTML to ${msg.to} must contain ZERO raw <img tags`
            );
            assert.equal(
              msg.html.includes('<a href="https://evil.com"'),
              false,
              `[${label}] Email HTML to ${msg.to} must contain ZERO raw <a href="https://evil.com" tags`
            );
          }
        }
      }
    );

    // =========================================================================
    // SUITE 5: Fault Isolation & Idempotency
    // =========================================================================
    await runSuite(
      'Suite 5: Fault Isolation (Resend/SMTP 503 Outage never breaks XRPL webhook/confirm) & Idempotency (3 calls = 1 Seller + 1 Buyer email)',
      async () => {
        for (const target of ['backend', 'frontend']) {
          const emailSvc = target === 'backend' ? backendEmailService : frontendEmailService;
          const dispatcher = target === 'backend' ? backendDispatcher : frontendDispatcher;
          const storage = target === 'backend' ? backendDb : frontendStore;
          const callApi = target === 'backend' ? callBackendApi : callFrontendApi;

          emailSvc.clearTestEmailTransport();
          emailSvc.clearCapturedEmails();

          const sellerId = crypto.randomUUID();
          const buyerId = crypto.randomUUID();
          const listingId = crypto.randomUUID();
          const orderId = crypto.randomUUID();
          const txHash = crypto.randomBytes(32).toString('hex').toUpperCase();

          const sellerUser = {
            id: sellerId,
            wallet_address: 'rFaultSeller111111111111111111111',
            username: `fault_seller_${target}`,
            role: 'user',
            notification_email: `verified-seller-${target}@example.com`,
            email_verified: true,
            notify_on_sale: true,
            notify_on_purchase: true,
          };

          const buyerUser = {
            id: buyerId,
            wallet_address: 'rFaultBuyer2222222222222222222222',
            username: `fault_buyer_${target}`,
            role: 'user',
            notification_email: `verified-buyer-${target}@example.com`,
            email_verified: true,
            notify_on_sale: true,
            notify_on_purchase: true,
          };

          const listingItem = {
            id: listingId,
            seller_id: sellerId,
            title: `Fault Isolation & Idempotency Asset (${target})`,
            price_xrp: 88,
            currency: 'XRP',
            status: 'active',
          };

          const orderRecord = {
            id: orderId,
            listing_id: listingId,
            listing_title: listingItem.title,
            buyer_id: buyerId,
            seller_id: sellerId,
            buyer_wallet_address: buyerUser.wallet_address,
            seller_wallet_address: sellerUser.wallet_address,
            total_xrp: 88,
            seller_receives_xrp: 88,
            currency: 'XRP',
            status: 'pending',
            escrow_tx_hash: null,
            escrow_sequence: null,
            notification_sent_seller: false,
            notification_sent_buyer: false,
          };

          if (target === 'backend') {
            backendDb.mem.users.push(sellerUser, buyerUser);
            backendDb.mem.listings.push(listingItem);
            backendDb.mem.orders.push(orderRecord);
          } else {
            frontendStore.users.push(sellerUser, buyerUser);
            frontendStore.listings.push(listingItem);
            frontendStore.orders.push(orderRecord);
          }

          const buyerToken = mintJwtToken({
            id: buyerId,
            walletAddress: buyerUser.wallet_address,
            role: 'user',
          });

          // Part 1: Simulate Resend/SMTP 503 Outage
          emailSvc.setTestEmailTransport(async () => {
            throw new Error('Simulated Resend/SMTP 503 Outage');
          });

          // Verify XRPL order escrow webhook / confirmation STILL succeeds with 200 OK during email outage!
          const webhookRes = await callApi('POST', `/api/orders/${orderId}/escrow/webhook`, {
            token: buyerToken,
            body: {
              signed: true,
              txHash,
              txType: 'EscrowCreate',
              sequence: 555001,
            },
          });
          assert.equal(
            webhookRes.status,
            200,
            `[${target}] XRPL escrow webhook must succeed (200 OK) even when email provider throws 503 Outage`
          );

          // Direct call to dispatchOrderLifecycleEmails during outage must catch and not throw
          const outageDispatch = await dispatcher.dispatchOrderLifecycleEmails(
            storage,
            orderId,
            'escrow_locked',
            txHash
          );
          assert.equal(outageDispatch.ok, false, `[${target}] dispatchOrderLifecycleEmails returns ok: false during outage`);
          assert.equal(outageDispatch.sentSeller, false);
          assert.equal(outageDispatch.sentBuyer, false);
          assert.equal(
            emailSvc.getCapturedEmails().length,
            0,
            `[${target}] Zero emails captured while transport throws 503`
          );

          // Part 2: Clear failing transport and invoke dispatchOrderLifecycleEmails 3 times in a row
          emailSvc.clearTestEmailTransport();
          emailSvc.clearCapturedEmails();

          const call1 = await dispatcher.dispatchOrderLifecycleEmails(
            storage,
            orderId,
            'escrow_locked',
            txHash
          );
          assert.equal(call1.ok, true, `[${target}] 1st call after outage recovery should succeed`);
          assert.equal(call1.sentSeller, true, `[${target}] 1st call must send Seller email`);
          assert.equal(call1.sentBuyer, true, `[${target}] 1st call must send Buyer email`);

          const call2 = await dispatcher.dispatchOrderLifecycleEmails(
            storage,
            orderId,
            'escrow_locked',
            txHash
          );
          assert.equal(call2.sentSeller, false, `[${target}] 2nd call must skip Seller email (idempotent)`);
          assert.equal(call2.sentBuyer, false, `[${target}] 2nd call must skip Buyer email (idempotent)`);
          assert.equal(call2.sellerSkippedReason, 'already_sent_idempotent');
          assert.equal(call2.buyerSkippedReason, 'already_sent_idempotent');

          const call3 = await dispatcher.dispatchOrderLifecycleEmails(
            storage,
            orderId,
            'escrow_locked',
            txHash
          );
          assert.equal(call3.sentSeller, false, `[${target}] 3rd call must skip Seller email (idempotent)`);
          assert.equal(call3.sentBuyer, false, `[${target}] 3rd call must skip Buyer email (idempotent)`);

          const capturedAfter3Calls = emailSvc.getCapturedEmails();
          assert.equal(
            capturedAfter3Calls.length,
            2,
            `[${target}] Calling dispatchOrderLifecycleEmails 3 times in a row must send exactly 2 emails total (1 Seller + 1 Buyer)`
          );
          assert.equal(capturedAfter3Calls[0].to, `verified-seller-${target}@example.com`);
          assert.equal(capturedAfter3Calls[1].to, `verified-buyer-${target}@example.com`);
        }
      }
    );
  } finally {
    backendEmailService.clearTestEmailTransport();
    frontendEmailService.clearTestEmailTransport();
    backendDispatcher.resetEmailOtpRateLimits();
    frontendDispatcher.resetEmailOtpRateLimits();
    await new Promise((resolve) => server.close(() => resolve()));
  }

  log('================================================================================');
  log(`🎉 All ${results.length}/5 Email Notification Security & Reliability Suites Passed!`);
  log('================================================================================\n');

  return results;
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule) {
  runEmailNotificationSecurityTests()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
