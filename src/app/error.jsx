'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    if (typeof console !== 'undefined') console.error(error);
  }, [error]);
  return (
    <div style={{minHeight:'60vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'40px 20px'}}>
      <div style={{fontSize:13,fontWeight:600,letterSpacing:1,color:'#d9534f',marginBottom:8}}>Something went wrong</div>
      <h1 style={{fontSize:24,fontWeight:700,color:'var(--text)',margin:'0 0 8px'}}>We hit rough waters</h1>
      <p style={{fontSize:14,color:'var(--text2)',maxWidth:400,margin:'0 0 20px',lineHeight:1.55}}>An unexpected error occurred. You can try again, or head back to the dashboard.</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
        <button onClick={() => reset()} style={{background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer',borderRadius:9,padding:'10px 18px',fontSize:14,fontWeight:600}}>Try again</button>
        <a href="/dashboard" style={{border:'1px solid var(--border)',color:'var(--text)',textDecoration:'none',borderRadius:9,padding:'10px 18px',fontSize:14,fontWeight:600}}>Dashboard</a>
      </div>
    </div>
  );
}
