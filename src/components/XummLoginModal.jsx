'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function XummLoginModal({ onClose }) {
  const [qrUrl,  setQrUrl]  = useState(null);
  const [status, setStatus] = useState('loading');
  const [error,  setError]  = useState(null);
  const setAuth = useAuthStore(s => s.setAuth);
  const wsRef   = useRef(null);

  const start = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { uuid, qrUrl: qr, wsUrl } = await api.auth.startSignIn();
      setQrUrl(qr);
      setStatus('pending');

      if (wsUrl) {
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onmessage = async (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.signed === false) { setStatus('rejected'); wsRef.current?.close(); }
          if (msg.signed === true) {
            try {
              const { token, user } = await api.auth.verify(uuid);
              setAuth(token, user);
              setStatus('success');
            } catch(e) { setError(e.message); setStatus('error'); }
            wsRef.current?.close();
          }
        };
      }
    } catch(e) {
      setError(e.message);
      setStatus('error');
    }
  }, [setAuth]);

  useEffect(() => { start(); return () => wsRef.current?.close(); }, []);
  useEffect(() => { if (status === 'success') setTimeout(onClose, 1000); }, [status, onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Sign in with Xumm</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Preparing QR code...</p>
          </div>
        )}

        {status === 'pending' && qrUrl && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-600 text-center">Open Xumm app and scan the QR code</p>
            <img src={qrUrl} alt="Xumm QR" className="w-48 h-48 rounded-xl border border-gray-100" />
            <p className="text-xs text-gray-400">Or open on mobile with the link below</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-2xl">✓</div>
            <p className="text-sm font-medium text-green-700">Signed in successfully!</p>
          </div>
        )}

        {(status === 'rejected' || status === 'error') && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xl">✕</div>
            <p className="text-sm text-red-600">{status === 'rejected' ? 'Cancelled.' : error}</p>
            <button onClick={start} className="btn-outline btn-sm">Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}
