'use client';

import React from 'react';

/**
 * Strict sandbox flags for untrusted HTML5/WebGL previews.
 * Explicitly omits allow-same-origin, allow-top-navigation, allow-popups, and allow-forms
 * so untrusted WebGL/HTML5 code executes in an opaque origin and can NEVER access
 * xrpharbor.com cookies, localStorage, or connected Xaman/XRPL wallet state.
 */
export const SANDBOX_FLAGS = 'allow-scripts allow-pointer-lock';

/**
 * Validates that a preview URL is safe to load inside the WebGL sandbox iframe.
 * Blocks javascript:, vbscript:, data:text/html, data:image/svg+xml, and non-HTTP(S) schemes.
 */
export function validateSandboxUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Preview URL is required' };
  }

  const trimmed = rawUrl.trim();
  const deobfuscated = trimmed.replace(/[\x00-\x20]+/g, '');

  if (
    /^(javascript|vbscript|file|about|ws|wss):/i.test(deobfuscated) ||
    /^data\s*:\s*(text\/html|image\/svg|application\/xhtml|application\/javascript|text\/javascript)/i.test(deobfuscated) ||
    /^data:/i.test(deobfuscated)
  ) {
    return { valid: false, error: 'Blocked unsafe URL scheme for sandbox preview' };
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    const isLocalhost =
      protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');

    if (protocol !== 'https:' && !isLocalhost) {
      return { valid: false, error: 'Only HTTPS preview URLs are permitted' };
    }

    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, error: 'Malformed preview URL' };
  }
}

export function WebGLSandboxFrame({
  src,
  title = 'HTML5 / WebGL Interactive Preview',
  width = '100%',
  height = 480,
  className = '',
  style = {},
}) {
  const validation = validateSandboxUrl(src);

  if (!validation.valid) {
    return (
      <div
        role="alert"
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width,
          height,
          padding: '1.5rem',
          borderRadius: '0.75rem',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          fontSize: '0.875rem',
          textAlign: 'center',
          ...style,
        }}
      >
        Preview blocked by sandbox security policy: {validation.error}
      </div>
    );
  }

  return (
    <iframe
      src={validation.url}
      title={title}
      width={width}
      height={height}
      className={className}
      sandbox="allow-scripts allow-pointer-lock"
      referrerPolicy="no-referrer"
      allow="fullscreen; gamepad"
      loading="lazy"
      style={{
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '0.75rem',
        backgroundColor: '#090d16',
        ...style,
      }}
    />
  );
}

export default WebGLSandboxFrame;
