'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';

export default function AdminPage() {
  const user = useAuthStore(s => s.user);
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api.admin.stats().then(setStats).catch(()=>{});
    api.admin.disputes().then(setDisputes).catch(()=>{});
  }, [user]);

  if (!user) return <div style={{textAlign:'center',padding:'60px 20px',color:'#4a5568'}}>Sign in required</div>;
  if (user.role !== 'admin') return <div style={{textAlign:'center',padding:'60px 20px',color:'#f87171'}}>Admin only</div>;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'#e8eaf0',letterSpacing:'-0.02em'}}>Admin Panel</h1>
        <div style={{display:'flex',gap:8}}>
          {['dashboard','disputes'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{padding:'7px 14px',fontSize:13,fontWeight:500,cursor:'pointer',border:'none',borderRadius:8,fontFamily:'inherit',
              background:tab===t?'#3b82f6':'#111620',color:tab===t?'#fff':'#8892a4',outline:tab===t?'none':'1px solid rgba(255,255,255,0.08)'}}>
              {t==='dashboard'?'Dashboard':'Disputes'}{t==='disputes'&&disputes.length>0?<span style={{marginLeft:6,background:'rgba(239,68,68,0.2)',color:'#f87171',fontSize:10,padding:'1px 5px',borderRadius:20}}>{disputes.length}</span>:''}
            </button>
          ))}
        </div>
      </div>
      {tab==='dashboard' && stats && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:24}}>
            {[['Total Users',stats.totalUsers],['Active Listings',stats.activeListings],['Completed Orders',stats.completedOrders],['Commission (XRP)',Number(stats.totalRevenue).toFixed(2)]].map(([l,v])=>(
              <div key={l} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'14px 16px'}}>
                <div style={{fontSize:12,color:'#4a5568',marginBottom:5}}>{l}</div>
                <div style={{fontSize:22,fontWeight:700,color:'#e8eaf0',letterSpacing:'-0.02em'}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'16px',color:'#8892a4',fontSize:13,textAlign:'center'}}>
            More admin features coming soon — transactions, user management, ad slots
          </div>
        </div>
      )}
      {tab==='disputes' && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {disputes.length===0 && <div style={{textAlign:'center',padding:'40px',color:'#4a5568',fontSize:13}}>No open disputes 🎉</div>}
          {disputes.map(d => (
            <div key={d.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'16px'}}>
              <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:12}}>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'rgba(239,68,68,0.12)',color:'#f87171',flexShrink:0}}>Open</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'#e8eaf0',marginBottom:3}}>{d.reason}</div>
                  <div style={{fontSize:12,color:'#4a5568'}}>Buyer: {d.buyer_name} · Seller: {d.seller_name} · {Number(d.total_xrp).toLocaleString()} XRP</div>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={() => api.admin.resolveDispute(d.id,{resolution:'Refund to buyer',favorBuyer:true}).then(() => api.admin.disputes().then(setDisputes))}
                  style={{flex:1,background:'rgba(16,185,129,0.1)',color:'#34d399',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'8px',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Refund buyer</button>
                <button onClick={() => api.admin.resolveDispute(d.id,{resolution:'Release to seller',favorBuyer:false}).then(() => api.admin.disputes().then(setDisputes))}
                  style={{flex:1,background:'transparent',color:'#8892a4',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Release to seller</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}