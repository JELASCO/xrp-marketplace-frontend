'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';

export default function AdminPage() {
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [removing, setRemoving] = useState({});

  useEffect(() => {
    if (loading || !user || user.role !== 'admin') return;
    api.admin.stats().then(d => setStats(d)).catch(() => {});
    api.admin.disputes().then(d => setDisputes(Array.isArray(d) ? d : [])).catch(() => {});
  }, [user, loading]);

  const switchTab = async (t) => {
    setTab(t);
    if (t === 'listings') {
      setListingsLoading(true);
      try {
        const data = await api.listings.list({ limit: 100, offset: 0 });
        const arr = Array.isArray(data) ? data : (data && Array.isArray(data.listings) ? data.listings : []);
        setListings(arr);
      } catch(e) { setListings([]); }
      setListingsLoading(false);
    }
    if (t === 'users') {
      setUsersLoading(true);
      try {
        const data = await api.admin.users();
        setUsers(Array.isArray(data) ? data : []);
      } catch(e) { setUsers([]); }
      setUsersLoading(false);
    }
  };

  const removeListing = async (id) => {
    if (!window.confirm('Bu listing\'i kaldırmak istediğine emin misin?')) return;
    setRemoving(r => ({ ...r, [id]: true }));
    try { await api.admin.removeListing(id); setListings(ls => ls.filter(l => l.id !== id)); }
    catch(e) { alert('Hata: ' + e.message); }
    setRemoving(r => ({ ...r, [id]: false }));
  };

  const verifyUser = async (uid, verify) => {
    try {
      await api.admin.verifyUser(uid, verify);
      setUsers(us => us.map(u => u.id === uid ? { ...u, is_verified: verify } : u));
    } catch(e) { alert('Hata: ' + e.message); }
  };

  const banUser = async (uid, ban) => {
    try {
      await api.admin.banUser(uid, ban);
      setUsers(us => us.map(u => u.id === uid ? { ...u, is_banned: ban } : u));
    } catch(e) { alert('Hata: ' + e.message); }
  };

  const grantPro = async (uid, days) => {
    try {
      const r = await api.admin.grantPro(uid, days);
      setUsers(us => us.map(u => u.id === uid ? { ...u, pro_until: r.pro ? (r.proUntil || new Date(Date.now()+days*86400000).toISOString()) : null } : u));
    } catch(e) { alert('Hata: ' + e.message); }
  };

  if (loading) return <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text3)'}}>Loading...</div>;
  if (!user) return <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text3)'}}>Sign in required</div>;
  if (user.role !== 'admin') return <div style={{textAlign:'center',padding:'60px 20px',color:'#f87171'}}>Admin only</div>;

  const TABS = [{key:'dashboard',label:'📊 Dashboard'},{key:'listings',label:'📋 Listings'},{key:'disputes',label:'⚖️ Disputes'},{key:'users',label:'👥 Users'}];

  return (
    <div style={{maxWidth:1000,margin:'0 auto',padding:'24px 20px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>Admin Panel</h1>
        <div style={{display:'flex',gap:8}}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => switchTab(t.key)} style={{background:tab===t.key?'var(--accent)':'rgba(255,255,255,0.05)',color:tab===t.key?'#fff':'var(--text2)',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
            {[
              {label:'Total Users',value:stats?.totalUsers??'...'},
              {label:'Active Listings',value:stats?.activeListings??'...'},
              {label:'Completed Orders',value:stats?.completedOrders??'...'},
              {label:'Revenue (XRP)',value:stats?.totalRevenue!=null?Number(stats.totalRevenue).toFixed(2):'...'},
            ].map(s => (
              <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'20px 24px'}}>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:8}}>{s.label}</div>
                <div style={{fontSize:28,fontWeight:700,color:'var(--text)'}}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'listings' && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {listingsLoading && <div style={{textAlign:'center',padding:40,color:'var(--text3)',fontSize:13}}>Loading listings...</div>}
          {!listingsLoading && listings.length === 0 && <div style={{textAlign:'center',padding:40,color:'var(--text3)',fontSize:13}}>No active listings</div>}
          {!listingsLoading && listings.map(l => (
            <div key={l.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:48,height:48,borderRadius:8,background:'var(--bg)',flexShrink:0,overflow:'hidden'}}>
                {l.images && l.images[0] && <img src={l.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</div>
                <div style={{fontSize:12,color:'var(--text3)'}}>
                  {l.username && <span style={{marginRight:10}}>@{l.username}</span>}
                  <span style={{color:'var(--accent2)',fontWeight:600}}>{l.price_xrp!=null?Number(l.price_xrp).toLocaleString():'0'} XRP</span>
                  {l.category && <span style={{marginLeft:10}}>{l.category}</span>}
                </div>
              </div>
              <button onClick={() => removeListing(l.id)} disabled={removing[l.id]} style={{background:'rgba(239,68,68,0.1)',color:'#f87171',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {removing[l.id]?'...':'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'disputes' && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {disputes.length === 0 && <div style={{textAlign:'center',padding:40,color:'var(--text3)',fontSize:13}}>No disputes</div>}
          {disputes.map(d => (
            <div key={d.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:13,color:'var(--text)',marginBottom:4}}>{d.reason||'Dispute'}</div>
              <div style={{fontSize:12,color:'var(--text3)'}}>Status: {d.status}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {usersLoading && <div style={{textAlign:'center',padding:40,color:'var(--text3)',fontSize:13}}>Loading...</div>}
          {!usersLoading && users.length === 0 && <div style={{textAlign:'center',padding:40,color:'var(--text3)',fontSize:13}}>No users</div>}
          {!usersLoading && users.map(u => (
            <div key={u.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'var(--accent)',flexShrink:0}}>
                {(u.username||'?')[0].toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>
                  {u.username}
                  {u.is_verified && <span style={{marginLeft:6,fontSize:11,color:'var(--green)'}}>✓ Verified</span>}
                  {u.pro_until && new Date(u.pro_until) > new Date() && <span style={{marginLeft:6,fontSize:11,color:'var(--accent)'}}>⭐ Pro</span>}
                  {u.is_banned && <span style={{marginLeft:6,fontSize:11,color:'#f87171'}}>Banned</span>}
                </div>
                <div style={{fontSize:12,color:'var(--text3)'}}>{u.role} · ★ {Number(u.reputation_score||0).toFixed(1)}</div>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {u.pro_until && new Date(u.pro_until) > new Date()
                  ? <button onClick={() => grantPro(u.id,0)} style={{background:'rgba(239,68,68,0.1)',color:'#f87171',border:'none',borderRadius:8,padding:'5px 12px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Revoke Pro</button>
                  : <button onClick={() => grantPro(u.id,30)} style={{background:'rgba(59,130,246,0.12)',color:'var(--accent)',border:'none',borderRadius:8,padding:'5px 12px',fontSize:12,fontWeight:600,cursor:'pointer'}}>+30d Pro</button>}
                <button onClick={() => verifyUser(u.id,!u.is_verified)} style={{background:u.is_verified?'rgba(239,68,68,0.1)':'rgba(16,185,129,0.1)',color:u.is_verified?'#f87171':'var(--green)',border:'none',borderRadius:8,padding:'5px 12px',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  {u.is_verified?'Unverify':'✓ Verify'}
                </button>
                <button onClick={() => banUser(u.id,!u.is_banned)} style={{background:u.is_banned?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',color:u.is_banned?'var(--green)':'#f87171',border:'none',borderRadius:8,padding:'5px 12px',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  {u.is_banned?'Unban':'Ban'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
