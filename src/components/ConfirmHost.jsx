'use client';

import { useEffect, useState } from 'react';
import { _registerConfirm } from '../lib/confirm';

export default function ConfirmHost() {
  const [req, setReq] = useState(null);

  useEffect(() => {
    _registerConfirm((r) => setReq(r));
    return () => _registerConfirm(null);
  }, []);

  if (!req) return null;
  const opts = req.opts || {};
  const done = (val) => { const r = req; setReq(null); r.resolve(val); };

  return (
    <div onClick={() => done(false)} style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(8,16,30,0.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 20px 16px',maxWidth:400,width:'100%',boxShadow:'0 18px 50px rgba(0,0,0,0.35)'}}>
        <div style={{fontSize:15,lineHeight:1.5,marginBottom:18}}>{req.message}</div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={() => done(false)} style={{padding:'9px 16px',borderRadius:9,border:'1px solid var(--border)',background:'transparent',color:'var(--text)',fontSize:14,fontWeight:600,cursor:'pointer'}}>{opts.cancelText || 'Cancel'}</button>
          <button onClick={() => done(true)} style={{padding:'9px 16px',borderRadius:9,border:'none',background:opts.danger ? '#dc2626' : 'var(--accent)',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>{opts.confirmText || 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
