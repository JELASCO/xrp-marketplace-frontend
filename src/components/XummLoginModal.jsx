'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { sanitizeExternalUrl, sanitizeImageUrl } from '../lib/sanitizeUrl';

export default function XummLoginModal({ onClose }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [nextUrl, setNextUrl] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const setAuth = useAuthStore(s => s.setAuth);
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const uuidRef = useRef(null);

  const doVerify = useCallback(async (uuid) => {
    try {
      setStatus('verifying');
      const { token, user } = await api.auth.verify(uuid || uuidRef.current);
      setAuth(token, user);
      setStatus('success');
      clearInterval(pollRef.current);
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, [setAuth]);

  const start = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setQrUrl(null);
    try {
      const resp = await api.auth.startSignIn();
      const { uuid, qrUrl: qr, wsUrl } = resp;
      setNextUrl(sanitizeExternalUrl(resp.next || resp.nextUrl || resp.deepLink || null));
      setQrUrl(sanitizeImageUrl(qr));
      uuidRef.current = uuid;
      setStatus('pending');
      if (wsUrl) {
        try {
          wsRef.current = new WebSocket(wsUrl);
          wsRef.current.onmessage = async (evt) => {
            try {
              const msg = JSON.parse(evt.data);
              if (msg.signed === false) {
                setStatus('rejected');
                wsRef.current?.close();
                clearInterval(pollRef.current);
              }
              if (msg.signed === true) {
                wsRef.current?.close();
                await doVerify(uuid);
              }
            } catch {}
          };
        } catch {}
      }
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, [doVerify]);

  useEffect(() => {
    start();
    return () => {
      wsRef.current?.close();
      clearInterval(pollRef.current);
    };
  }, [start]);

  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(onClose, 900);
      return () => clearTimeout(t);
    }
  }, [status, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 20,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--surface, #151B2C)',
          border: '1px solid var(--border2, rgba(255,255,255,0.12))',
          borderRadius: 16,
          padding: '24px 20px',
          width: '100%',
          maxWidth: 'min(380px, calc(100vw - 24px))',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          boxSizing: 'border-box',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text, #f8fafc)' }}>Sign in with Xaman</div>
            <div style={{ fontSize: 12, color: 'var(--text3, #94a3b8)', marginTop: 2 }}>Scan with your Xaman app</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface2, rgba(255,255,255,0.06))',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text2, #cbd5e1)',
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
            <div style={{ width: 40, height: 40, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 13, color: 'var(--text3, #94a3b8)' }}>Preparing QR code...</div>
          </div>
        )}

        {status === 'pending' && sanitizeImageUrl(qrUrl) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
              <img src={sanitizeImageUrl(qrUrl)} alt="Xaman QR" style={{ width: 192, height: 192, display: 'block' }} />
            </div>
            {sanitizeExternalUrl(nextUrl) && (
              <a
                href={sanitizeExternalUrl(nextUrl)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--accent, #2080F5)', textDecoration: 'none', fontWeight: 600 }}
              >
                Open in Xaman App ↗
              </a>
            )}
            <div style={{ fontSize: 13, color: 'var(--text2, #cbd5e1)', textAlign: 'center', lineHeight: 1.6 }}>
              Open <strong style={{ color: 'var(--text, #f8fafc)' }}>Xaman</strong> on your phone and scan to sign in
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3, #94a3b8)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green, #10b981)', animation: 'pulse2 1.5s ease-in-out infinite' }} />
              Waiting for signature...
            </div>
            <button
              type="button"
              onClick={() => doVerify(uuidRef.current)}
              style={{
                width: '100%',
                background: 'var(--accent, #2080F5)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '11px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 2,
              }}
            >
              Confirm in Browser (Instant Xaman Connect)
            </button>
          </div>
        )}

        {status === 'verifying' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
            <div style={{ width: 40, height: 40, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 13, color: 'var(--text2, #cbd5e1)' }}>Verifying signature...</div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#34d399' }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#34d399' }}>Signed in successfully!</div>
          </div>
        )}

        {(status === 'rejected' || status === 'error') && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#f87171' }}>✕</div>
            <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>{status === 'rejected' ? 'Request was cancelled.' : error}</div>
            <button
              onClick={start}
              style={{
                background: 'var(--surface, #151B2C)',
                border: '1px solid var(--border2, rgba(255,255,255,0.15))',
                color: 'var(--text, #f8fafc)',
                borderRadius: 8,
                padding: '8px 18px',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
