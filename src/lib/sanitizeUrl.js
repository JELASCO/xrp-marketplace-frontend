/**
 * Frontend URL & HTML Sanitization Utilities for XRPHarbor
 * Mitigates DOM/Reflected/Stored XSS via malicious URLs (javascript:, data:, vbscript:, file:)
 * while preserving legitimate HTTPS links and Xaman/XUMM wallet deep links.
 */

const DANGEROUS_SVG_PATTERNS =
  /<\s*script\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|\bonload\s*=|\bonerror\s*=|\bon\w+\s*=|<\s*(iframe|object|embed|foreignObject)\b/i;

/**
 * Escapes HTML special characters (&, <, >, ", ') to prevent XSS in text contexts.
 * @param {unknown} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates and sanitizes an external or wallet deep-link URL.
 * Blocks javascript:, vbscript:, data:, file:, and relative/protocol-relative schemes.
 * Allows only https://, http:// (for localhost/links), and xumm:// / xaman:// wallet deep links.
 * @param {unknown} url
 * @returns {string | null}
 */
export function sanitizeExternalUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  // Reject control characters, angle brackets, quotes, or backticks
  if (/[\x00-\x1F\x7F<>"'`]/.test(trimmed)) return null;

  // Strip whitespace/control chars to defeat obfuscated schemes like "java\tscript:"
  const deobfuscated = trimmed.replace(/[\x00-\x20]+/g, '');
  if (
    /^(javascript|vbscript|data|file|blob|about):/i.test(deobfuscated) ||
    deobfuscated.startsWith('//') ||
    deobfuscated.startsWith('/')
  ) {
    return null;
  }

  // Allow Xaman / XUMM wallet deep links (xumm:// or xaman://)
  if (/^(xumm|xaman):\/\//i.test(trimmed)) {
    if (!/^(xumm|xaman):\/\/[A-Za-z0-9._~:/?#\[\]@!$&()*+,;=%-]+$/i.test(trimmed)) {
      return null;
    }
    if (/(javascript|vbscript|data):/i.test(trimmed)) {
      return null;
    }
    return trimmed;
  }

  // Allow explicit https:// and http:// URLs
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const protocol = parsed.protocol.toLowerCase();
      if (protocol !== 'https:' && protocol !== 'http:') return null;
      if (parsed.username || parsed.password) return null;
      if (!parsed.hostname) return null;
      return trimmed;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Validates and sanitizes an image source URL.
 * Allows https://, single-slash root-relative /, and safe data:image/(png|jpeg|jpg|gif|webp|svg+xml) URIs
 * (provided SVG data URIs do not contain <script, javascript:, onload=, onerror=).
 * @param {unknown} url
 * @returns {string | null}
 */
export function sanitizeImageUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 10 * 1024 * 1024) return null;

  // Reject raw control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(trimmed)) return null;

  const deobfuscated = trimmed.replace(/[\x00-\x20]+/g, '');
  if (/^(javascript|vbscript|file|about):/i.test(deobfuscated)) {
    return null;
  }

  // 1. Root-relative path (must start with single '/', not protocol-relative '//')
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || /[\\<>"'`\s]/.test(trimmed)) {
      return null;
    }
    return trimmed;
  }

  // 2. HTTPS image URL
  if (/^https:\/\//i.test(trimmed)) {
    if (/[<>"'`\s]/.test(trimmed)) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol.toLowerCase() !== 'https:') return null;
      if (parsed.username || parsed.password) return null;
      if (!parsed.hostname) return null;
      // Rewrite raw private R2 S3 storage URLs to our public media proxy (/api/media/...)
      if (parsed.hostname.toLowerCase().endsWith('.r2.cloudflarestorage.com')) {
        let p = parsed.pathname.replace(/^\/+/, '');
        const parts = p.split('/').filter(Boolean);
        if (parts.length > 1 && !['public', 'images', 'vault'].includes(parts[0])) {
          parts.shift();
          p = parts.join('/');
        }
        if (!p || p.startsWith('vault/') || p.includes('..')) return null;
        if (!p.startsWith('public/')) p = `public/${p}`;
        return `/api/media/${p}`;
      }
      return trimmed;
    } catch {
      return null;
    }
  }

  // 3. Safe data:image/(png|jpeg|jpg|gif|webp|svg+xml) URI
  const dataMatch = trimmed.match(
    /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml)((?:;[a-zA-Z0-9=._-]+)*),([\s\S]*)$/i
  );
  if (dataMatch) {
    const subtype = dataMatch[1].toLowerCase();
    const params = (dataMatch[2] || '').toLowerCase();
    const payload = dataMatch[3] || '';

    if (!payload) return null;

    let decoded = payload;
    try {
      decoded = decodeURIComponent(payload);
    } catch {
      // keep raw payload if not percent-encoded
    }

    if (params.includes(';base64')) {
      const compact = payload.replace(/\s+/g, '');
      if (!/^[A-Za-z0-9+/=_-]+$/.test(compact)) return null;
      try {
        if (typeof Buffer !== 'undefined') {
          decoded += '\n' + Buffer.from(compact, 'base64').toString('utf8');
        } else if (typeof atob === 'function') {
          decoded += '\n' + atob(compact);
        }
      } catch {
        return null;
      }
    }

    const combined = (payload + '\n' + decoded).replace(/[\x00-\x20]+/g, ' ');
    if (DANGEROUS_SVG_PATTERNS.test(combined) || DANGEROUS_SVG_PATTERNS.test(payload) || DANGEROUS_SVG_PATTERNS.test(decoded)) {
      return null;
    }

    if (subtype === 'svg+xml') {
      if (
        /<\s*script/i.test(decoded) ||
        /javascript\s*:/i.test(decoded) ||
        /\bonload\s*=/i.test(decoded) ||
        /\bonerror\s*=/i.test(decoded)
      ) {
        return null;
      }
    }

    return trimmed;
  }

  return null;
}

export default {
  sanitizeExternalUrl,
  sanitizeImageUrl,
  escapeHtml,
};
