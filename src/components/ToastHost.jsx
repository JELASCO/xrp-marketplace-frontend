'use client';

import { useEffect, useState, useRef } from 'react';

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    const orig = window.alert;
    window.alert = (msg) => {
      const id = ++idRef.current;
      const text = msg == null ? '' : String(msg);
      setToasts((t) => [...t, { id, text }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
    };
    return () => { window.alert = orig; };
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div style={{position:'fixed',right:16,bottom:16,zIndex:9999,display:'flex',flexDirection:'column',gap:10,maxWidth:'calc(100vw - 32px)',pointerEvents:'none'}}>
      {toasts.map((t) => (
        <div key={t.id} role="status" style={{pointerEvents:'auto',background:'#0b1b33',color:'#f3f8ff',border:'1px solid rgba(255,255,255,0.12)',borderRadius:11,padding:'12px 15px',fontSize:14,lineHeight:1.45,maxWidth:380,boxShadow:'0 8px 28px rgba(0,0,0,0.28)',animation:'xhToastIn .28s cubic-bezier(.22,.61,.36,1)',display:'flex',gap:10,alignItems:'flex-start'}}>
          <span style={{flex:1,wordBreak:'break-word'}}>{t.text}</span>
          <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} aria-label="Dismiss" style={{background:'none',border:'none',color:'#9db8de',cursor:'pointer',fontSize:16,lineHeight:1,padding:0,marginTop:1}}>×</button>
        </div>
      ))}
      <style>{'@keyframes xhToastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}'}</style>
    </div>
  );
}
