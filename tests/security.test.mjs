/**
 * XRPHarbor Automated Red Team & Security Verification Suite
 * Covers Subagents 1–7 Hardening Controls:
 *   1. XRPL Partial Payment (tfPartialPayment) Attack Simulation
 *   2. Failed Transaction & Replay Simulation (tx_hash & Xaman SignIn UUID)
 *   3. IDOR, Prototype Pollution & Input Validation Simulation
 *   4. Malicious Upload, Polyglot & Zip-Slip Simulation
 *   5. Frontend XSS & WebGL Sandbox Isolation Simulation
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveRepoPaths() {
  const candidates = [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
    'C:/Users/joker/.gemini/antigravity/scratch',
  ];

  let backendRoot = null;
  let frontendRoot = null;

  for (const base of candidates) {
    if (fs.existsSync(path.join(base, 'src', 'escrow', 'paymentVerifier.js'))) {
      backendRoot = base;
    }
    if (fs.existsSync(path.join(base, 'src', 'lib', 'sanitizeUrl.js'))) {
      frontendRoot = base;
    }
    const nestedBackend = path.join(base, 'xrp-marketplace-backend-main', 'xrp-marketplace-backend-main');
    if (!backendRoot && fs.existsSync(path.join(nestedBackend, 'src', 'escrow', 'paymentVerifier.js'))) {
      backendRoot = nestedBackend;
    }
    const nestedFrontend = path.join(base, 'xrp-marketplace-frontend-main', 'xrp-marketplace-frontend-main');
    if (!frontendRoot && fs.existsSync(path.join(nestedFrontend, 'src', 'lib', 'sanitizeUrl.js'))) {
      frontendRoot = nestedFrontend;
    }
  }

  if (!backendRoot || !frontendRoot) {
    throw new Error(`Could not resolve backendRoot (${backendRoot}) or frontendRoot (${frontendRoot})`);
  }

  return { backendRoot, frontendRoot };
}

const { backendRoot, frontendRoot } = resolveRepoPaths();

const paymentVerifier = require(path.join(backendRoot, 'src', 'escrow', 'paymentVerifier.js'));
const validate = require(path.join(backendRoot, 'src', 'middleware', 'validate.js'));
const uploadSecurity = require(path.join(backendRoot, 'src', 'middleware', 'uploadSecurity.js'));

const {
  TF_PARTIAL_PAYMENT,
  verifyXrplPaymentTx,
  verifyXrplEscrowTx,
  markTxHashUsed,
  isTxHashUsed,
  resetUsedTxHashes,
  registerSignInUuid,
  verifyAndConsumeSignInUuid,
  resetSignInUuids,
} = paymentVerifier;

const {
  hasPrototypePollution,
  stripPrototypePollution,
  validateListingInput,
  validateOrderInput,
  validateReviewInput,
} = validate;

const {
  detectImageMagicBytes,
  validateUploadedImage,
  sanitizeArchivePath,
  validateArchiveEntries,
} = uploadSecurity;

async function loadFrontendModules() {
  const sanitizeUrlPath = path.join(frontendRoot, 'src', 'lib', 'sanitizeUrl.js');
  const sanitizeUrlMod = await import(pathToFileURL(sanitizeUrlPath).href);

  const sandboxFilePath = path.join(frontendRoot, 'src', 'components', 'WebGLSandboxFrame.jsx');
  const sandboxRaw = fs.readFileSync(sandboxFilePath, 'utf8');
  const splitIdx = sandboxRaw.indexOf('export function WebGLSandboxFrame');
  if (splitIdx === -1) {
    throw new Error('Could not locate WebGLSandboxFrame component in WebGLSandboxFrame.jsx');
  }
  const pureJsPortion = sandboxRaw
    .slice(0, splitIdx)
    .replace(/^\s*['"]use client['"];?\s*/m, '')
    .replace(/^\s*import\s+React\s+from\s+['"]react['"];?\s*/m, '');
  const sandboxDataUri =
    'data:text/javascript;base64,' + Buffer.from(pureJsPortion, 'utf8').toString('base64');
  const sandboxMod = await import(sandboxDataUri);

  const routePath = path.join(frontendRoot, 'src', 'app', 'api', '[...path]', 'route.js');
  const routeMod = await import(pathToFileURL(routePath).href);

  return {
    sanitizeExternalUrl: sanitizeUrlMod.sanitizeExternalUrl,
    sanitizeImageUrl: sanitizeUrlMod.sanitizeImageUrl,
    escapeHtml: sanitizeUrlMod.escapeHtml,
    SANDBOX_FLAGS: sandboxMod.SANDBOX_FLAGS,
    validateSandboxUrl: sandboxMod.validateSandboxUrl,
    sandboxRaw,
    routeMod,
  };
}

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err && err.stack ? err.stack : err}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('  XRPHarbor Security Unit & Integration Test Suite');
  console.log('================================================================');

  const {
    sanitizeExternalUrl,
    sanitizeImageUrl,
    SANDBOX_FLAGS,
    validateSandboxUrl,
    sandboxRaw,
    routeMod,
  } = await loadFrontendModules();

  // ---------------------------------------------------------------------------
  // 1. XRPL Partial Payment (tfPartialPayment) Attack Simulation
  // ---------------------------------------------------------------------------
  console.log('\n[Suite 1] XRPL Partial Payment (tfPartialPayment) Attack Simulation');

  await runTest('Rejects tfPartialPayment (0x00020000) delivering 1 XRP for a 100 XRP item', () => {
    resetUsedTxHashes();
    const partialAttackTx = {
      validated: true,
      tx: {
        TransactionType: 'Payment',
        Account: 'rBuyerWallet111111111111111111111',
        Destination: 'rPlatformWallet222222222222222222',
        Amount: '100000000', // 100 XRP stated
        Flags: 0x00020000,   // tfPartialPayment
        hash: 'A'.repeat(64),
      },
      meta: {
        TransactionResult: 'tesSUCCESS',
        delivered_amount: '1000000', // Only 1 XRP actually delivered!
      },
    };

    const res = verifyXrplPaymentTx(partialAttackTx, {
      expectedXrp: 100,
      expectedDestination: 'rPlatformWallet222222222222222222',
      expectedAccount: 'rBuyerWallet111111111111111111111',
    });

    assert.equal(res.valid, false, 'Partial payment underpayment must have valid === false');
    assert.equal(res.ok, false, 'Partial payment underpayment must have ok === false');
    assert.equal(res.partialPaymentFlag, true);
    assert.match(res.error, /Partial payment exploit blocked|Insufficient delivered amount/i);
  });

  await runTest('Rejects payment when meta.delivered_amount is "unavailable" or missing', () => {
    resetUsedTxHashes();
    const unavailableTx = {
      validated: true,
      tx: {
        TransactionType: 'Payment',
        Account: 'rBuyerWallet111111111111111111111',
        Destination: 'rPlatformWallet222222222222222222',
        Amount: '100000000',
        Flags: TF_PARTIAL_PAYMENT,
        hash: 'B'.repeat(64),
      },
      meta: {
        TransactionResult: 'tesSUCCESS',
        delivered_amount: 'unavailable',
      },
    };
    const resUnavailable = verifyXrplPaymentTx(unavailableTx, { expectedXrp: 100 });
    assert.equal(resUnavailable.valid, false);
    assert.match(resUnavailable.error, /delivered_amount is missing or unavailable/i);

    const missingDeliveredTx = {
      validated: true,
      tx: {
        TransactionType: 'Payment',
        Account: 'rBuyerWallet111111111111111111111',
        Destination: 'rPlatformWallet222222222222222222',
        Amount: '100000000',
        hash: 'C'.repeat(64),
      },
      meta: {
        TransactionResult: 'tesSUCCESS',
      },
    };
    const resMissing = verifyXrplPaymentTx(missingDeliveredTx, { expectedXrp: 100 });
    assert.equal(resMissing.valid, false);
    assert.match(resMissing.error, /delivered_amount is missing or unavailable/i);
  });

  await runTest('Accepts valid full XRPL payment (delivered_amount: "100000000", validated: true, tesSUCCESS)', () => {
    resetUsedTxHashes();
    const validFullTx = {
      validated: true,
      tx: {
        TransactionType: 'Payment',
        Account: 'rBuyerWallet111111111111111111111',
        Destination: 'rPlatformWallet222222222222222222',
        Amount: '100000000',
        Flags: 0,
        hash: 'D'.repeat(64),
      },
      meta: {
        TransactionResult: 'tesSUCCESS',
        delivered_amount: '100000000',
      },
    };

    const res = verifyXrplPaymentTx(validFullTx, {
      expectedXrp: 100,
      expectedDestination: 'rPlatformWallet222222222222222222',
      expectedAccount: 'rBuyerWallet111111111111111111111',
    });

    assert.equal(res.valid, true, 'Full valid payment must have valid === true');
    assert.equal(res.ok, true);
    assert.equal(res.deliveredDrops, '100000000');
    assert.equal(res.deliveredXrp, 100);
  });

  // ---------------------------------------------------------------------------
  // 2. Failed Transaction & Replay Simulation
  // ---------------------------------------------------------------------------
  console.log('\n[Suite 2] Failed Transaction & Replay Simulation');

  await runTest('Rejects failed on-chain TransactionResult ("tecPATH_DRY") and unvalidated transactions (validated: false)', () => {
    resetUsedTxHashes();
    const failedResultTx = {
      validated: true,
      tx: {
        TransactionType: 'Payment',
        Account: 'rBuyerWallet111111111111111111111',
        Destination: 'rPlatformWallet222222222222222222',
        Amount: '100000000',
        hash: 'E'.repeat(64),
      },
      meta: {
        TransactionResult: 'tecPATH_DRY',
        delivered_amount: '100000000',
      },
    };
    const resFailed = verifyXrplPaymentTx(failedResultTx, { expectedXrp: 100 });
    assert.equal(resFailed.valid, false);
    assert.match(resFailed.error, /tecPATH_DRY/);

    const unvalidatedTx = {
      validated: false,
      tx: {
        TransactionType: 'Payment',
        Account: 'rBuyerWallet111111111111111111111',
        Destination: 'rPlatformWallet222222222222222222',
        Amount: '100000000',
        hash: 'F'.repeat(64),
      },
      meta: {
        TransactionResult: 'tesSUCCESS',
        delivered_amount: '100000000',
      },
    };
    const resUnvalidated = verifyXrplPaymentTx(unvalidatedTx, { expectedXrp: 100 });
    assert.equal(resUnvalidated.valid, false);
    assert.match(resUnvalidated.error, /not validated/i);
  });

  await runTest('Rejects duplicate tx_hash submission (markTxHashUsed & replay protection)', () => {
    resetUsedTxHashes();
    const txHash = '1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF';

    assert.equal(markTxHashUsed(txHash), true, 'First markTxHashUsed call must return true');
    assert.equal(isTxHashUsed(txHash), true, 'isTxHashUsed must report true after marking');
    assert.equal(markTxHashUsed(txHash), false, 'Second markTxHashUsed call must return false (replay blocked)');
    assert.equal(markTxHashUsed(txHash.toLowerCase()), false, 'Case-insensitive duplicate tx_hash must be blocked');

    const replayTx = {
      validated: true,
      tx: {
        TransactionType: 'Payment',
        Account: 'rBuyerWallet111111111111111111111',
        Destination: 'rPlatformWallet222222222222222222',
        Amount: '50000000',
        hash: txHash,
      },
      meta: {
        TransactionResult: 'tesSUCCESS',
        delivered_amount: '50000000',
      },
    };
    const resReplay = verifyXrplPaymentTx(replayTx, { expectedXrp: 50 });
    assert.equal(resReplay.valid, false);
    assert.equal(resReplay.replay, true);

    const replayEscrow = verifyXrplEscrowTx({
      validated: true,
      tx: {
        TransactionType: 'EscrowCreate',
        Account: 'rBuyerWallet111111111111111111111',
        Destination: 'rSellerWallet33333333333333333333',
        Amount: '50000000',
        Sequence: 101,
        hash: txHash,
      },
      meta: { TransactionResult: 'tesSUCCESS' },
    }, {
      expectedDestination: 'rSellerWallet33333333333333333333',
      expectedXrp: 50,
    });
    assert.equal(replayEscrow.valid, false);
    assert.equal(replayEscrow.replay, true);
  });

  await runTest('Rejects duplicate Xaman SignIn UUID consumption and expired UUIDs', () => {
    resetSignInUuids();
    const uuid = crypto.randomUUID();
    const now = Date.now();
    registerSignInUuid(uuid, now);

    const firstConsume = verifyAndConsumeSignInUuid(uuid, { now });
    assert.equal(firstConsume.valid, true, 'First consumption of fresh SignIn UUID must succeed');

    const secondConsume = verifyAndConsumeSignInUuid(uuid, { now: now + 1000 });
    assert.equal(secondConsume.valid, false, 'Second consumption of same SignIn UUID must fail');
    assert.equal(secondConsume.replay, true);

    const expiredUuid = crypto.randomUUID();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    registerSignInUuid(expiredUuid, tenMinutesAgo);

    const expiredCheck = verifyAndConsumeSignInUuid(expiredUuid, { now });
    assert.equal(expiredCheck.valid, false, 'Expired SignIn UUID (>5m) must be rejected');
    assert.equal(expiredCheck.expired, true);
  });

  // ---------------------------------------------------------------------------
  // 3. IDOR, Prototype Pollution & Input Validation Simulation
  // ---------------------------------------------------------------------------
  console.log('\n[Suite 3] IDOR, Prototype Pollution & Input Validation Simulation');

  await runTest('Detects and strips prototype pollution payloads and rejects polluted inputs', () => {
    const rawPolluted = JSON.parse('{"__proto__":{"isAdmin":true},"title":"Test Item","priceXrp":25}');
    assert.equal(hasPrototypePollution(rawPolluted), true, 'hasPrototypePollution must detect __proto__ own property');

    const listingRes = validateListingInput(rawPolluted);
    assert.equal(listingRes.valid, false, 'validateListingInput must reject prototype-polluted object');
    assert.equal(({}).isAdmin, undefined, 'Global Object.prototype must remain unpolluted');

    const nestedConstructor = JSON.parse('{"nested":{"constructor":{"prototype":{"pwned":true}}}}');
    assert.equal(hasPrototypePollution(nestedConstructor), true);
    stripPrototypePollution(nestedConstructor);
    assert.equal(Object.prototype.hasOwnProperty.call(nestedConstructor.nested, 'constructor'), false);
  });

  await runTest('Rejects negative/NaN prices (priceXrp: -50), invalid UUIDs, and out-of-range ratings (rating: 99)', () => {
    const negPriceRes = validateListingInput({ title: 'Valid Title', priceXrp: -50 });
    assert.equal(negPriceRes.valid, false, 'Negative priceXrp (-50) must be rejected');

    const nanPriceRes = validateListingInput({ title: 'Valid Title', priceXrp: Number.NaN });
    assert.equal(nanPriceRes.valid, false, 'NaN priceXrp must be rejected');

    const zeroPriceRes = validateListingInput({ title: 'Valid Title', priceXrp: 0 });
    assert.equal(zeroPriceRes.valid, false, 'Zero priceXrp must be rejected');

    const badOrderUuid = validateOrderInput({ listingId: 'not-a-valid-uuid-1234' });
    assert.equal(badOrderUuid.valid, false, 'Invalid listingId UUID must be rejected');

    const sqliOrderUuid = validateOrderInput({ listingId: "1' OR '1'='1" });
    assert.equal(sqliOrderUuid.valid, false, 'SQLi payload in listingId must be rejected');

    const highRatingRes = validateReviewInput({ rating: 99, comment: 'Great!' });
    assert.equal(highRatingRes.valid, false, 'Out-of-range rating (99) must be rejected');

    const lowRatingRes = validateReviewInput({ rating: 0, comment: 'Bad!' });
    assert.equal(lowRatingRes.valid, false, 'Out-of-range rating (0) must be rejected');
  });

  await runTest('Enforces IDOR authorization checks in frontend/src/app/api/[...path]/route.js (401 & 403)', async () => {
    const origFetch = globalThis.fetch;
    // Stub upstream fetch so route.js immediately exercises its built-in API security handler deterministically
    globalThis.fetch = async () => {
      throw new Error('Upstream offline in unit test');
    };

    try {
      const targetListingId = 'a1111111-1111-4111-8111-111111111101'; // Owned by user 11111111-1111-4111-8111-111111111111

      // 1. Unauthenticated DELETE /api/listings/:id -> 401
      const unauthDeleteReq = new Request(`https://xrpharbor.com/api/listings/${targetListingId}`, {
        method: 'DELETE',
      });
      const unauthDeleteRes = await routeMod.DELETE(unauthDeleteReq, {
        params: { path: ['listings', targetListingId] },
      });
      assert.equal(unauthDeleteRes.status, 401, 'Unauthenticated DELETE /api/listings/:id must return 401');

      // Obtain a valid token for an authenticated non-owner user via /api/auth/signin + /api/auth/verify
      const signInReq = new Request('https://xrpharbor.com/api/auth/signin', { method: 'POST' });
      const signInRes = await routeMod.POST(signInReq, { params: { path: ['auth', 'signin'] } });
      assert.equal(signInRes.status, 200);
      const signInData = await signInRes.json();

      const verifyReq = new Request('https://xrpharbor.com/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ uuid: signInData.uuid }),
      });
      const verifyRes = await routeMod.POST(verifyReq, { params: { path: ['auth', 'verify'] } });
      assert.equal(verifyRes.status, 200);
      const { token: attackerToken } = await verifyRes.json();
      assert.ok(attackerToken, 'Expected valid JWT for non-owner user');

      // Verify replay of the same SignIn UUID is rejected (400)
      const replayVerifyReq = new Request('https://xrpharbor.com/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ uuid: signInData.uuid }),
      });
      const replayVerifyRes = await routeMod.POST(replayVerifyReq, { params: { path: ['auth', 'verify'] } });
      assert.equal(replayVerifyRes.status, 400, 'Replayed SignIn UUID must return 400');

      // 2. Cross-user DELETE /api/listings/:id -> 403
      const crossDeleteReq = new Request(`https://xrpharbor.com/api/listings/${targetListingId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${attackerToken}` },
      });
      const crossDeleteRes = await routeMod.DELETE(crossDeleteReq, {
        params: { path: ['listings', targetListingId] },
      });
      assert.equal(crossDeleteRes.status, 403, 'Cross-user DELETE /api/listings/:id must return 403 Forbidden');

      // 3. Cross-user GET /api/orders/:id -> 403
      const victimOrderId = 'b2222222-2222-4222-8222-222222222202';
      globalThis.__xrpharborStore.orders.push({
        id: victimOrderId,
        listing_id: targetListingId,
        listing_title: 'Victim Order Item',
        buyer_id: '22222222-2222-4222-8222-222222222222',
        seller_id: '11111111-1111-4111-8111-111111111111',
        buyer_wallet_address: 'rKeyPort8M3kP9vL2nJ4wZ6cT1yB5dE7f8',
        seller_wallet_address: 'rDockMaster9X2pL4nK8vJ6wZ3cT5yB1a2',
        total_xrp: 420,
        commission_rate: 0.015,
        commission_xrp: 6.3,
        seller_receives_xrp: 413.7,
        status: 'escrow_locked',
      });

      const crossOrderGetReq = new Request(`https://xrpharbor.com/api/orders/${victimOrderId}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${attackerToken}` },
      });
      const crossOrderGetRes = await routeMod.GET(crossOrderGetReq, {
        params: { path: ['orders', victimOrderId] },
      });
      assert.equal(crossOrderGetRes.status, 403, 'Cross-user GET /api/orders/:id must return 403 Forbidden');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Malicious Upload, Polyglot & Zip-Slip Simulation
  // ---------------------------------------------------------------------------
  console.log('\n[Suite 4] Malicious Upload, Polyglot & Zip-Slip Simulation');

  await runTest('Rejects spoofed PNG/JPEG with PHP payload or Windows EXE (MZ) magic bytes', () => {
    const phpPayload = Buffer.from('<?php system($_GET["cmd"]); ?>', 'utf8');
    assert.equal(detectImageMagicBytes(phpPayload), null);
    const phpCheck = validateUploadedImage(
      'data:image/png;base64,' + phpPayload.toString('base64')
    );
    assert.equal(phpCheck.valid, false, 'Spoofed PNG with PHP payload must be rejected');

    const exePayload = Buffer.from('4d5a90000300000004000000ffff0000', 'hex'); // MZ header
    assert.equal(detectImageMagicBytes(exePayload), null);
    const exeCheck = validateUploadedImage(
      'data:image/jpeg;base64,' + exePayload.toString('base64')
    );
    assert.equal(exeCheck.valid, false, 'Spoofed JPEG with EXE MZ header must be rejected');
  });

  await runTest('Rejects valid PNG magic header followed by <script>alert(1)</script> polyglot payload', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const polyglotTail = Buffer.from('<script>alert(1)</script>', 'utf8');
    const polyglotBuf = Buffer.concat([pngHeader, polyglotTail]);

    assert.equal(detectImageMagicBytes(polyglotBuf), 'image/png', 'Raw magic bytes match PNG');
    const polyglotCheck = validateUploadedImage(polyglotBuf);
    assert.equal(polyglotCheck.valid, false, 'PNG polyglot containing <script>alert(1)</script> must be rejected');
    assert.match(polyglotCheck.error, /polyglot|embedded script/i);
  });

  await runTest('Rejects Zip-Slip archive traversal paths and symbolic link entries', () => {
    const unixTraversal = sanitizeArchivePath('../../etc/passwd');
    assert.equal(unixTraversal.valid, false, '../../etc/passwd must be rejected');

    const winTraversal = sanitizeArchivePath('..\\Windows\\System32\\cmd.exe');
    assert.equal(winTraversal.valid, false, '..\\Windows\\System32\\cmd.exe must be rejected');

    const absPath = sanitizeArchivePath('/etc/shadow');
    assert.equal(absPath.valid, false, '/etc/shadow absolute path must be rejected');

    const symlinkEntry = sanitizeArchivePath({
      name: 'assets/config.json',
      type: 'symlink',
      linkname: '/etc/passwd',
    });
    assert.equal(symlinkEntry.valid, false, 'Symlink archive entry must be rejected');

    const batchCheck = validateArchiveEntries(['safe/file.png', '../../etc/passwd']);
    assert.equal(batchCheck.valid, false, 'Archive batch containing traversal entry must be rejected');
  });

  await runTest('Accepts valid clean PNG and JPEG with randomized UUID filenames', () => {
    const cleanPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const pngRes = validateUploadedImage(cleanPng);
    assert.equal(pngRes.valid, true, 'Clean 1x1 PNG must be accepted');
    assert.equal(pngRes.mimeType, 'image/png');
    assert.match(pngRes.safeFilename, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i);

    const cleanJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
    ]);
    const jpegRes = validateUploadedImage(cleanJpeg);
    assert.equal(jpegRes.valid, true, 'Clean JPEG buffer must be accepted');
    assert.equal(jpegRes.mimeType, 'image/jpeg');
    assert.match(jpegRes.safeFilename, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i);
  });

  // ---------------------------------------------------------------------------
  // 5. Frontend XSS & Sandbox Isolation Simulation
  // ---------------------------------------------------------------------------
  console.log('\n[Suite 5] Frontend XSS & Sandbox Isolation Simulation');

  await runTest('Rejects dangerous XSS URL schemes in sanitizeExternalUrl, sanitizeImageUrl, and validateSandboxUrl', () => {
    const maliciousUrls = [
      'javascript:alert(1)',
      'java\tscript:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:image/svg+xml;utf8,<svg onload="alert(1)">',
    ];

    for (const bad of maliciousUrls) {
      assert.equal(
        sanitizeExternalUrl(bad),
        null,
        `sanitizeExternalUrl must reject: ${JSON.stringify(bad)}`
      );
      assert.equal(
        sanitizeImageUrl(bad),
        null,
        `sanitizeImageUrl must reject: ${JSON.stringify(bad)}`
      );
      const sbRes = validateSandboxUrl(bad);
      assert.equal(
        sbRes.valid,
        false,
        `validateSandboxUrl must reject: ${JSON.stringify(bad)}`
      );
    }

    // Confirm legitimate URLs still work
    assert.equal(sanitizeExternalUrl('https://xumm.app/sign/1234'), 'https://xumm.app/sign/1234');
    assert.equal(sanitizeExternalUrl('xumm://sign/1234'), 'xumm://sign/1234');
    assert.equal(
      sanitizeImageUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e'),
      'https://images.unsplash.com/photo-1542751371-adc38448a05e'
    );
    assert.equal(validateSandboxUrl('https://preview.xrpharbor.com/demo/index.html').valid, true);
  });

  await runTest('Enforces sandbox="allow-scripts allow-pointer-lock" without allow-same-origin in WebGLSandboxFrame.jsx', () => {
    assert.equal(SANDBOX_FLAGS, 'allow-scripts allow-pointer-lock');
    assert.ok(
      sandboxRaw.includes('sandbox="allow-scripts allow-pointer-lock"'),
      'WebGLSandboxFrame.jsx must explicitly set sandbox="allow-scripts allow-pointer-lock"'
    );
    assert.ok(
      !SANDBOX_FLAGS.includes('allow-same-origin'),
      'SANDBOX_FLAGS must NOT include allow-same-origin'
    );
    // Ensure no iframe sandbox attribute in WebGLSandboxFrame.jsx enables allow-same-origin
    const sandboxAttrMatch = sandboxRaw.match(/sandbox\s*=\s*["']([^"']+)["']/);
    assert.ok(sandboxAttrMatch, 'iframe sandbox attribute must be present');
    assert.ok(
      !sandboxAttrMatch[1].includes('allow-same-origin'),
      'iframe sandbox attribute must NOT contain allow-same-origin'
    );
  });

  console.log('\n================================================================');
  console.log(`  Security Tests Complete: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running security tests:', err);
  process.exit(1);
});
