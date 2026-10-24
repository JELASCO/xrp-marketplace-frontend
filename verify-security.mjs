/**
 * XRPHarbor End-to-End Security Verification & Live Pentest Audit Runner
 * Performs:
 *   1. Static Application Security Testing (SAST) across backend & frontend repositories
 *   2. Automated Red Team Unit & Integration Test Suite (tests/security.test.mjs)
 *   3. Live HTTP Security Header & CORS Origin Audit against production deployments
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePaths() {
  const candidates = [
    __dirname,
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
    throw new Error(`Unable to locate backendRoot (${backendRoot}) or frontendRoot (${frontendRoot})`);
  }

  return { backendRoot, frontendRoot };
}

function walkSourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(full, out);
    } else if (/\.(js|jsx|mjs|cjs|ts|tsx|json|sql)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function fetchHeadersGet(targetUrl, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) XRPHarbor-Security-Verifier/1.0',
          ...customHeaders,
        },
        rejectUnauthorized: false,
        timeout: 12000,
      },
      (res) => {
        res.resume();
        resolve({
          status: res.statusCode,
          headers: res.headers,
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout connecting to ${targetUrl}`));
    });
    req.on('error', reject);
    req.end();
  });
}

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(label, condition, detail = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    failedChecks++;
    console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  console.log('========================================================================');
  console.log('  XRPHarbor Full-Spectrum Security Verification (verify-security.mjs)');
  console.log('========================================================================');

  const { backendRoot, frontendRoot } = resolvePaths();
  console.log(`  Backend Repo : ${backendRoot}`);
  console.log(`  Frontend Repo: ${frontendRoot}`);

  // -------------------------------------------------------------------------
  // Phase 1: Static Application Security Testing (SAST)
  // -------------------------------------------------------------------------
  console.log('\n[Phase 1] Static Application Security Testing (SAST)');

  const backendGitignore = fs.readFileSync(path.join(backendRoot, '.gitignore'), 'utf8');
  const frontendGitignore = fs.readFileSync(path.join(frontendRoot, '.gitignore'), 'utf8');

  check(
    'Backend .gitignore covers .env files',
    /^\s*\.env\b/m.test(backendGitignore) && /^\s*\.env\.\*/m.test(backendGitignore)
  );
  check(
    'Frontend .gitignore covers .env files',
    /^\s*\.env\b/m.test(frontendGitignore) && /^\s*\.env\.\*/m.test(frontendGitignore)
  );

  // Scan all source code in backend/src and frontend/src for forbidden hardcoded secrets
  const FORBIDDEN_SECRETS = [
    'd9c8b5dfc9a388958e85b58d7668d78e',
    'xrpharbor-prod-fallback-jwt-secret-2026',
    'xrpharbor-escrow',
  ];

  const sourceFiles = [
    ...walkSourceFiles(path.join(backendRoot, 'src')),
    ...walkSourceFiles(path.join(frontendRoot, 'src')),
  ];

  const secretHits = [];
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const secret of FORBIDDEN_SECRETS) {
      if (content.includes(secret)) {
        secretHits.push(`${path.relative(backendRoot, file)}: ${secret}`);
      }
    }
  }
  check(
    'No hardcoded secrets exist in backend/src or frontend/src',
    secretHits.length === 0,
    secretHits.length === 0 ? `scanned ${sourceFiles.length} files` : secretHits.join(', ')
  );

  // Verify delivered_amount validation in paymentVerifier.js and routes/index.js
  const paymentVerifierCode = fs.readFileSync(
    path.join(backendRoot, 'src', 'escrow', 'paymentVerifier.js'),
    'utf8'
  );
  const routesCode = fs.readFileSync(path.join(backendRoot, 'src', 'routes', 'index.js'), 'utf8');

  check(
    'delivered_amount & tfPartialPayment validation enforced in paymentVerifier.js',
    paymentVerifierCode.includes('meta.delivered_amount') &&
      paymentVerifierCode.includes('0x00020000') &&
      paymentVerifierCode.includes('tesSUCCESS') &&
      paymentVerifierCode.includes('verifyXrplPaymentTx')
  );
  check(
    'verifyXrplPaymentTx & delivered_amount checks wired into routes/index.js',
    routesCode.includes('verifyXrplPaymentTx') &&
      routesCode.includes('verifyXrplEscrowTx') &&
      routesCode.includes('delivered_amount')
  );

  // Verify no unsanitized dangerouslySetInnerHTML or eval( in frontend/src
  const frontendSrcFiles = walkSourceFiles(path.join(frontendRoot, 'src'));
  const unsafeFrontendHits = [];
  for (const file of frontendSrcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (/\beval\s*\(/.test(content)) {
      unsafeFrontendHits.push(`${path.basename(file)}: eval(`);
    }
    const dsiMatches = content.match(/dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*([^}]+)\}\}/g) || [];
    for (const m of dsiMatches) {
      const inner = m.replace(/.*__html\s*:\s*/, '').replace(/\}\}$/, '').trim();
      const isStaticStringLiteral = /^(['"])(?:(?!\1)[^\\]|\\.)*\1$/.test(inner);
      if (!isStaticStringLiteral) {
        unsafeFrontendHits.push(`${path.basename(file)}: unsanitized ${m}`);
      }
    }
  }
  check(
    'No unsanitized dangerouslySetInnerHTML or eval( in frontend/src',
    unsafeFrontendHits.length === 0,
    unsafeFrontendHits.length === 0
      ? `scanned ${frontendSrcFiles.length} frontend files`
      : unsafeFrontendHits.join(', ')
  );

  // Verify WebGLSandboxFrame.jsx enforces sandbox="allow-scripts allow-pointer-lock" without allow-same-origin
  const sandboxCode = fs.readFileSync(
    path.join(frontendRoot, 'src', 'components', 'WebGLSandboxFrame.jsx'),
    'utf8'
  );
  const sandboxAttr = sandboxCode.match(/sandbox\s*=\s*["']([^"']+)["']/);
  check(
    'WebGLSandboxFrame.jsx enforces sandbox="allow-scripts allow-pointer-lock" without allow-same-origin',
    Boolean(
      sandboxCode.includes('sandbox="allow-scripts allow-pointer-lock"') &&
        sandboxAttr &&
        sandboxAttr[1] === 'allow-scripts allow-pointer-lock' &&
        !sandboxAttr[1].includes('allow-same-origin')
    ),
    sandboxAttr ? `sandbox="${sandboxAttr[1]}"` : 'missing sandbox attribute'
  );

  // -------------------------------------------------------------------------
  // Phase 2: Unit & Integration Test Suite Execution (tests/security.test.mjs)
  // -------------------------------------------------------------------------
  console.log('\n[Phase 2] Automated Security Unit Test Suite (tests/security.test.mjs)');

  const testFileCandidates = [
    path.join(__dirname, 'tests', 'security.test.mjs'),
    path.join(backendRoot, 'tests', 'security.test.mjs'),
    path.join(frontendRoot, 'tests', 'security.test.mjs'),
  ];
  const testFile = testFileCandidates.find((p) => fs.existsSync(p));
  check('Located tests/security.test.mjs', Boolean(testFile), testFile || 'missing');

  if (testFile) {
    const proc = spawnSync(process.execPath, [testFile], {
      cwd: path.dirname(path.dirname(testFile)),
      encoding: 'utf8',
    });
    if (proc.stdout) {
      for (const line of proc.stdout.trim().split('\n')) {
        console.log(`    ${line}`);
      }
    }
    if (proc.stderr) {
      for (const line of proc.stderr.trim().split('\n')) {
        if (!line.includes('MODULE_TYPELESS_PACKAGE_JSON') && !line.includes('Reparsing as ES module') && !line.includes('To eliminate this warning') && !line.includes('--trace-warnings')) {
          console.log(`    ${line}`);
        }
      }
    }
    check(
      'tests/security.test.mjs exited with code 0',
      proc.status === 0,
      `exit code = ${proc.status}`
    );
  }

  // -------------------------------------------------------------------------
  // Phase 3: Live HTTP Security Header & CORS Origin Audit
  // -------------------------------------------------------------------------
  console.log('\n[Phase 3] Live HTTP Security Header & CORS Audit (Origin: https://evil.example.com)');

  const targets = [
    {
      name: 'Frontend (Vercel)',
      url: 'https://xrp-marketplace-frontend.vercel.app',
    },
    {
      name: 'Backend (Railway)',
      url: 'https://xrp-marketplace-backend-production.up.railway.app/health',
    },
  ];

  for (const target of targets) {
    console.log(`\n  Auditing ${target.name}: ${target.url}`);
    try {
      const { status, headers } = await fetchHeadersGet(target.url, {
        Origin: 'https://evil.example.com',
      });

      check(`${target.name} HTTP status is 200`, status === 200, `status=${status}`);

      const hsts = headers['strict-transport-security'];
      check(
        `${target.name} Strict-Transport-Security is present`,
        Boolean(hsts && hsts.includes('max-age=')),
        hsts || 'missing'
      );

      const xcto = headers['x-content-type-options'];
      check(
        `${target.name} X-Content-Type-Options: nosniff is present`,
        typeof xcto === 'string' && xcto.toLowerCase().includes('nosniff'),
        xcto || 'missing'
      );

      const xfo = headers['x-frame-options'];
      check(
        `${target.name} X-Frame-Options is present`,
        Boolean(xfo && /^(SAMEORIGIN|DENY)$/i.test(xfo.trim())),
        xfo || 'missing'
      );

      const csp = headers['content-security-policy'];
      check(
        `${target.name} Content-Security-Policy is present`,
        Boolean(csp && csp.includes("default-src 'self'")),
        csp ? `${csp.slice(0, 60)}...` : 'missing'
      );

      const referrer = headers['referrer-policy'];
      check(
        `${target.name} Referrer-Policy is present`,
        Boolean(referrer && referrer.length > 0),
        referrer || 'missing'
      );

      const poweredBy = headers['x-powered-by'];
      check(
        `${target.name} X-Powered-By is absent`,
        poweredBy === undefined,
        poweredBy ? `found: ${poweredBy}` : 'absent'
      );

      const acao = headers['access-control-allow-origin'];
      check(
        `${target.name} Access-Control-Allow-Origin does NOT equal https://evil.example.com or *`,
        acao !== 'https://evil.example.com' && acao !== '*',
        acao ? `ACAO=${acao}` : 'ACAO header omitted for untrusted origin'
      );
    } catch (err) {
      check(`${target.name} reachable over HTTPS`, false, err.message);
    }
  }

  console.log('\n========================================================================');
  console.log(
    `  Verification Summary: ${passedChecks}/${totalChecks} checks passed (${failedChecks} failed)`
  );
  console.log('========================================================================');

  if (failedChecks > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in verify-security.mjs:', err);
  process.exit(1);
});
