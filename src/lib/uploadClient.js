// Client-side creator file & image upload engine with:
// 1. Legitimate creator filename validation (supports 1.pdf, spaces, parentheses, Unicode/Turkish chars)
// 2. Automatic client-side canvas compression for oversized cover photos (> 2.5MB)
// 3. Direct binary XMLHttpRequest streaming (bypasses Vercel's 4.5MB limit via Railway directUploadBaseUrl with automatic same-origin fallback)
// 4. Live upload progress percentage, explicit timeout, and user cancellation support

export const VAULT_ACCEPT_ATTR =
  '.zip,.rar,.7z,.tar,.gz,.tgz,.pdf,.mp3,.wav,.flac,.ogg,.m4a,.aac,.mp4,.mov,.webm,.blend,.fbx,.obj,.glb,.gltf,.stl,.unitypackage,.psd,.ai,.eps,.fig,.sketch,.procreate,.brushset,.cube,.ttf,.otf,.woff,.woff2,.epub,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.webp,.gif,.avif';

export const IMAGE_ACCEPT_ATTR =
  '.png,.jpg,.jpeg,.webp,.gif,.avif,image/png,image/jpeg,image/webp,image/gif,image/avif';

const BLOCKED_EXTS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'jsp', 'asp', 'aspx',
  'msi', 'scr', 'com', 'vbs', 'ps1', 'jar', 'js', 'mjs', 'cjs',
  'html', 'htm', 'xhtml', 'svg', 'dll', 'so', 'dylib',
]);

const ALLOWED_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif']);

const ALLOWED_VAULT_EXTS = new Set([
  'zip', 'rar', '7z', 'tar', 'gz', 'tgz',
  'pdf', 'epub', 'txt', 'md', 'json', 'csv',
  'mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac',
  'mp4', 'mov', 'webm',
  'blend', 'fbx', 'obj', 'glb', 'gltf', 'stl', 'unitypackage',
  'psd', 'ai', 'eps', 'fig', 'sketch', 'procreate', 'brushset', 'cube',
  'ttf', 'otf', 'woff', 'woff2',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif',
]);

export function validateCreatorFilenameClient(rawName, kind = 'vault') {
  if (!rawName || typeof rawName !== 'string') {
    return { valid: false, error: 'Filename is required' };
  }
  if (rawName.includes('\0') || rawName.includes('..')) {
    return { valid: false, error: 'Unsafe file name' };
  }
  const base = rawName.split(/[/\\]/).pop().trim();
  if (!base || base === '.' || base === '..') {
    return { valid: false, error: 'Invalid file name' };
  }
  const lower = base.toLowerCase();
  const isTarGz = lower.endsWith('.tar.gz');
  const lastDot = base.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === base.length - 1) {
    return { valid: false, error: 'File must have a valid extension (e.g. .pdf, .mp3, .zip, .png)' };
  }
  const ext = isTarGz ? 'tar.gz' : lower.slice(lastDot + 1);
  const simpleExt = lower.slice(lastDot + 1);
  if (BLOCKED_EXTS.has(simpleExt) || BLOCKED_EXTS.has(ext)) {
    return { valid: false, error: `Executable or script file type (.${simpleExt}) is not permitted` };
  }
  if (kind === 'image') {
    if (!ALLOWED_IMAGE_EXTS.has(simpleExt)) {
      return { valid: false, error: `Unsupported image format (.${simpleExt}). Allowed: PNG, JPG, WEBP, GIF, AVIF` };
    }
  } else {
    if (!ALLOWED_VAULT_EXTS.has(simpleExt) && !ALLOWED_VAULT_EXTS.has(ext)) {
      return { valid: false, error: `Unsupported file format (.${simpleExt})` };
    }
  }
  return { valid: true, displayName: base, ext };
}

/**
 * Compresses non-GIF images > 2.5MB in the browser using <canvas> (max 2048px)
 * so high-res camera/screenshot photos upload fast and reliably.
 */
export async function compressImageIfNeeded(file) {
  if (!file || typeof window === 'undefined' || typeof document === 'undefined') return file;
  const mime = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  const isGif = mime === 'image/gif' || name.endsWith('.gif');
  if (isGif || file.size <= 2.5 * 1024 * 1024) {
    return file;
  }
  try {
    const bitmapUrl = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = bitmapUrl;
    });
    URL.revokeObjectURL(bitmapUrl);
    const maxDim = 2048;
    let width = img.naturalWidth || img.width || 1024;
    let height = img.naturalHeight || img.height || 1024;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);
    const targetType = mime === 'image/png' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, targetType, 0.88));
    if (blob && blob.size > 0 && blob.size < file.size) {
      return new File([blob], file.name, { type: blob.type || targetType });
    }
  } catch {
    // Fallback to original file if canvas compression is unsupported
  }
  return file;
}

let cachedUploadConfig = null;

async function getUploadConfig() {
  if (cachedUploadConfig) return cachedUploadConfig;
  try {
    const res = await fetch('/api/upload-config', { method: 'GET', cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        cachedUploadConfig = data;
        return cachedUploadConfig;
      }
    }
  } catch {}
  const envUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL)
    ? String(process.env.NEXT_PUBLIC_API_URL).trim().replace(/\/+$/, '')
    : '';
  cachedUploadConfig = { directUploadBaseUrl: envUrl };
  return cachedUploadConfig;
}

function sendBinaryXhr({ url, blob, token, onProgress, onAbortRef, timeoutMs = 180000 }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (onAbortRef && typeof onAbortRef === 'object') {
      onAbortRef.current = () => {
        try { xhr.abort(); } catch {}
      };
    }

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          const pct = Math.max(1, Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      const rawText = xhr.responseText || '';
      let parsed = null;
      try {
        parsed = rawText ? JSON.parse(rawText) : {};
      } catch {
        parsed = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && parsed && (parsed.ok || parsed.url)) {
        if (typeof onProgress === 'function') onProgress(100);
        resolve(parsed);
        return;
      }

      if (xhr.status === 413) {
        reject(new Error((parsed && parsed.error) || 'File exceeds maximum upload size limit.'));
        return;
      }

      const errMsg =
        (parsed && parsed.error) ||
        (rawText && rawText.length < 180 && !rawText.trim().startsWith('<') ? rawText.trim() : null) ||
        `Upload failed (HTTP ${xhr.status || 'error'})`;
      const err = new Error(errMsg);
      err.status = xhr.status;
      reject(err);
    };

    xhr.onerror = () => {
      const err = new Error('Network error during file upload');
      err.isNetworkError = true;
      reject(err);
    };

    xhr.ontimeout = () => {
      const err = new Error('Upload timed out. Please check your connection and try again.');
      err.isTimeout = true;
      reject(err);
    };

    xhr.onabort = () => {
      const err = new Error('Upload cancelled');
      err.isAborted = true;
      reject(err);
    };

    xhr.send(blob);
  });
}

/**
 * Streams a creator image or vault file as raw binary via XMLHttpRequest.
 * Automatically routes to Railway directUploadBaseUrl when configured (bypassing Vercel's 4.5MB limit)
 * and falls back cleanly to same-origin /api/... if direct host is unreachable.
 */
export async function uploadCreatorFile(file, { kind = 'vault', onProgress, onAbortRef } = {}) {
  if (!file) throw new Error('No file selected');

  const check = validateCreatorFilenameClient(file.name, kind);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const maxBytes = kind === 'image' ? 25 * 1024 * 1024 : 250 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      kind === 'image'
        ? 'Image must be under 25MB'
        : 'Archive/file must be under 250MB (or use External Download URL for larger files)'
    );
  }

  if (typeof onProgress === 'function') onProgress(1);

  const payloadBlob = kind === 'image' ? await compressImageIfNeeded(file) : file;
  const routePath = kind === 'image' ? '/api/upload' : '/api/vault/upload';
  const query =
    `?filename=${encodeURIComponent(file.name)}` +
    `&type=${encodeURIComponent(payloadBlob.type || file.type || 'application/octet-stream')}` +
    `&size=${encodeURIComponent(String(payloadBlob.size || file.size || 0))}`;

  const cfg = await getUploadConfig();
  let directBase = (cfg && cfg.directUploadBaseUrl) ? String(cfg.directUploadBaseUrl).trim().replace(/\/+$/, '') : '';
  if (!directBase && typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith('xrpharbor.com') || host.endsWith('.vercel.app')) {
      directBase = 'https://xrp-marketplace-backend-production.up.railway.app';
    }
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('xrpmarket_token') : null;
  const candidateUrls = [];
  if (directBase) {
    candidateUrls.push(`${directBase}${routePath}${query}`);
  }
  candidateUrls.push(`${routePath}${query}`);

  let lastErr = null;
  for (let i = 0; i < candidateUrls.length; i++) {
    const targetUrl = candidateUrls[i];
    try {
      const result = await sendBinaryXhr({
        url: targetUrl,
        blob: payloadBlob,
        token,
        onProgress,
        onAbortRef,
      });
      return result;
    } catch (err) {
      lastErr = err;
      if (err && err.isAborted) throw err;
      // If validation error (400/401/403/413), do not retry on fallback URL
      if (err && (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 413)) {
        throw err;
      }
    }
  }
  throw lastErr || new Error('Upload failed');
}
