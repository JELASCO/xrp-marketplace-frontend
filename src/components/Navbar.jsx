'use client'; // v2
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../lib/store';
import { api } from '../lib/api';
import XummLoginModal from './XummLoginModal';

const NOTIF_LABELS = {
  sale_paid: 'New sale — payment locked in escrow',
  payment_released: 'Payment released to your wallet',
  new_offer: 'New offer on your listing',
  offer_accepted: 'Your offer was accepted',
  offer_declined: 'Your offer was declined',
  new_message: 'New message',
  new_inquiry: 'New inquiry on your listing',
};
const NOTIF_ICONS = { sale_paid:'💰', payment_released:'✅', new_offer:'🏷️', offer_accepted:'🤝', offer_declined:'❌', new_message:'💬', new_inquiry:'❓' };
function notifTimeAgo(d){ if(!d) return ''; const sec=Math.floor((Date.now()-new Date(d).getTime())/1000); if(sec<60) return 'just now'; if(sec<3600) return Math.floor(sec/60)+'m ago'; if(sec<86400) return Math.floor(sec/3600)+'h ago'; return Math.floor(sec/86400)+'d ago'; }

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu,  setShowMenu]  = useState(false);
  const [search,    setSearch]    = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const router = useRouter();
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showNotifs && !showMenu) return;
    function onDocClick(e) {
      if (showNotifs && notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showNotifs, showMenu]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () => api.notifications.list().then(d => { if (active) { setNotifs(d.notifications || []); setUnread(d.unread || 0); } }).catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => { active = false; clearInterval(iv); };
  }, [user]);

  function openNotifs() {
    const next = !showNotifs;
    setShowNotifs(next);
    if (next && unread > 0) {
      api.notifications.markAllRead().then(() => setUnread(0)).catch(() => {});
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) router.push('/listings?q=' + encodeURIComponent(search.trim()));
  }

  const [xrpPrice, setXrpPrice] = useState(null);
  const [priceDir, setPriceDir] = useState(null); // 'up' | 'down' | null
  useEffect(() => {
    let active = true;
    let last = null;
    const fetchPrice = () => {
      fetch('https://api.coinbase.com/v2/prices/XRP-USD/spot')
        .then(r => r.json())
        .then(d => {
          if (!active || !d || !d.data || !d.data.amount) return;
          const p = parseFloat(d.data.amount);
          if (last != null && p !== last) {
            setPriceDir(p > last ? 'up' : 'down');
            setTimeout(() => active && setPriceDir(null), 1200);
          }
          last = p;
          setXrpPrice(p);
        })
        .catch(() => {});
    };
    fetchPrice();
    const iv = setInterval(fetchPrice, 15000); // refresh every 15s
    return () => { active = false; clearInterval(iv); };
  }, []);

  return (
    <>
      <style>{`
        * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; }
        @media(max-width:640px){.xrp-nav-links{display:none!important}.xrp-price{display:none!important}}
      `}</style>
      <nav style={{background:'#f5f6f8',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(0,0,0,0.08)',position:'sticky',top:0,zIndex:50,fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 16px',height:56,display:'flex',alignItems:'center',gap:12}}>
          <Link href="/" style={{fontWeight:800,fontSize:18,color:'#14161a',textDecoration:'none',letterSpacing:'-0.02em',flexShrink:0,display:'flex',alignItems:'center',gap:8}}>
            <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
              <circle cx="32" cy="14" r="5" stroke="#2080F5" strokeWidth="3.5" fill="none"/>
              <line x1="32" y1="19" x2="32" y2="50" stroke="#2080F5" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="22" y1="24" x2="42" y2="24" stroke="#2080F5" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 14 42 Q 32 56 50 42" stroke="#2080F5" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
              <line x1="14" y1="42" x2="19" y2="38" stroke="#2080F5" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="50" y1="42" x2="45" y2="38" stroke="#2080F5" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
            <span>XRP<span style={{color:'var(--accent)'}}>Harbor</span></span>
          </Link>
          <form onSubmit={handleSearch} className="xrp-search" style={{flex:1,maxWidth:360,position:'relative'}}>
            <input className="input" style={{paddingLeft:32,fontSize:13,height:36,background:'#ffffff',border:'1px solid rgba(0,0,0,0.1)',color:'#14161a',borderRadius:8,fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'}}
              placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#8b8f96',width:14,height:14}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </form>
          <div className="xrp-nav-links" style={{display:'flex',alignItems:'center',gap:6,marginLeft:'auto'}}>
            {[{href:'/listings',label:'Marketplace'},{href:'/listings/new',label:'List Item'},{href:'/orders',label:'Orders'}].map(l=>(
              <Link key={l.href} href={l.href} style={{fontSize:13,fontWeight:500,color:'#14161a',padding:'8px 14px',borderRadius:8,textDecoration:'none',transition:'all 0.15s',border:'1px solid transparent',background:'transparent'}}
                onMouseEnter={e=>{e.currentTarget.style.color='var(--accent)';e.currentTarget.style.background='rgba(59,130,246,0.08)';e.currentTarget.style.border='1px solid rgba(59,130,246,0.15)'}}
                onMouseLeave={e=>{e.currentTarget.style.color='#14161a';e.currentTarget.style.background='transparent';e.currentTarget.style.border='1px solid transparent'}}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="xrp-price" style={{fontSize:12,fontFamily:'monospace',color:'#14161a',background:'#ffffff',border:'1px solid rgba(0,0,0,0.1)',borderRadius:6,padding:'4px 10px',whiteSpace:'nowrap'}}>
            XRP <span style={{color: priceDir==='up' ? '#34d399' : priceDir==='down' ? '#f87171' : 'var(--green)', transition:'color 0.3s'}}>{xrpPrice ? '$' + xrpPrice.toFixed(xrpPrice < 10 ? 4 : 2) : '—'}{priceDir==='up' ? ' ▲' : priceDir==='down' ? ' ▼' : ''}</span>
          </div>
          {user ? (
            <>
            <div ref={notifRef} style={{position:'relative'}}>
              <button onClick={openNotifs} aria-label="Notifications"
                style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,background:'#ffffff',border:'1px solid rgba(0,0,0,0.1)',borderRadius:8,cursor:'pointer',color:'#14161a',position:'relative',padding:0,flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unread > 0 && <span style={{position:'absolute',top:-4,right:-4,minWidth:16,height:16,padding:'0 4px',background:'#ef4444',color:'#14161a',fontSize:10,fontWeight:700,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>{unread>9?'9+':unread}</span>}
              </button>
              {showNotifs && (
                <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',width:300,maxHeight:380,overflowY:'auto',background:'var(--surface)',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',zIndex:100}}>
                  <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontSize:13,fontWeight:700,color:'var(--text)'}}>Notifications</div>
                  {notifs.length === 0 ? (
                    <div style={{padding:'24px 14px',textAlign:'center',fontSize:12,color:'var(--text3)'}}>No notifications yet</div>
                  ) : notifs.map(n => (
                    <div key={n.id} onClick={()=>{ setShowNotifs(false); const oid=n.payload&&n.payload.orderId; const lid=n.payload&&n.payload.listingId; router.push(oid?'/orders':lid?('/listing/'+lid):'/orders'); }}
                      style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:n.is_read?'transparent':'rgba(59,130,246,0.06)',display:'flex',gap:10,alignItems:'flex-start'}}>
                      <span style={{fontSize:16,lineHeight:1.2,flexShrink:0}}>{NOTIF_ICONS[n.type] || '🔔'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:'var(--text)',fontWeight:n.is_read?400:600}}>{NOTIF_LABELS[n.type] || n.type}</div>
                        {n.payload && (n.payload.message || n.payload.listingTitle) && <div style={{fontSize:11,color:'var(--text3)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.payload.message || n.payload.listingTitle}</div>}
                        <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{notifTimeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div ref={menuRef} style={{position:'relative'}}>
              <button onClick={()=>setShowMenu(v=>!v)}
                style={{display:'flex',alignItems:'center',gap:8,background:'#ffffff',border:'1px solid rgba(0,0,0,0.1)',borderRadius:8,padding:'6px 12px',cursor:'pointer',color:'#14161a',fontSize:13,fontWeight:500,minWidth:'fit-content'}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#14161a',flexShrink:0}}>
                  {user.username?.slice(0,2).toUpperCase()}
                </div>
                <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#14161a'}}>{user.username}</span>
              </button>
              {showMenu && (
                <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',width:175,background:'var(--surface)',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,padding:'5px 0',boxShadow:'0 8px 32px rgba(0,0,0,0.5)',zIndex:100}}>
                  {[{href:'/listings',label:'Marketplace'},{href:'/listings/new',label:'List an Item'},{href:'/dashboard',label:'Dashboard'},{href:'/pro',label:'⭐ Upgrade to Pro'},{href:'/favorites',label:'Favorites'},{href:'/messages',label:'Messages'},{href:`/profile/${user.id}`,label:'My Profile'},{href:'/orders',label:'My Orders'},{href:'/settings',label:'Settings'}].map(i=>(
                    <Link key={i.href} href={i.href} onClick={()=>setShowMenu(false)}
                      style={{display:'block',padding:'9px 16px',fontSize:13,color:'var(--text2)',textDecoration:'none',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.color='var(--text)';e.currentTarget.style.background='var(--surface2)'}}
                      onMouseLeave={e=>{e.currentTarget.style.color='var(--text2)';e.currentTarget.style.background='transparent'}}>
                      {i.label}
                    </Link>
                  ))}
                  {user.role==='admin' && <Link href="/admin" onClick={()=>setShowMenu(false)} style={{display:'block',padding:'9px 16px',fontSize:13,color:'var(--accent2)',textDecoration:'none'}}>Admin Panel</Link>}
                  <div style={{height:1,background:'var(--border)',margin:'4px 0'}}/>
                  <button onClick={()=>{logout();setShowMenu(false);}} style={{width:'100%',textAlign:'left',padding:'9px 16px',fontSize:13,color:'#f87171',background:'none',border:'none',cursor:'pointer'}}>
                    Sign out
                  </button>
                </div>
              )}
              </div>
            </>
          ) : (
            <button onClick={()=>setShowLogin(true)}
              style={{display:'flex',alignItems:'center',gap:6,background:'var(--accent)',color:'#14161a',border:'none',borderRadius:8,padding:'7px 14px',fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
 Connect Xumm
            </button>
          )}
        </div>
      </nav>
      {showLogin && <XummLoginModal onClose={()=>setShowLogin(false)}/>}
    </>
  );
}


function NotificationsBell() {
  const items = useNotificationsStore(s => s.items);
  const unread = useNotificationsStore(s => s.unread);
  const markRead = useNotificationsStore(s => s.markRead);
  const markAllRead = useNotificationsStore(s => s.markAllRead);
  const [open, setOpen] = useState(false);

  function labelFor(n) {
    const t = n.type;
    const p = n.payload || {};
    if (t === 'new_order') return 'New order on "' + (p.listingTitle || 'listing') + '"';
    if (t === 'order_completed') return 'Order completed';
    if (t === 'dispute_opened') return 'Dispute opened on your order';
    if (t === 'dispute_resolved') return 'Dispute resolved' + (p.favorBuyer ? ' (refunded)' : ' (released)');
    if (t === 'new_review') return 'New review (' + (p.rating || '') + 'â)';
    return t;
  }
  function timeAgo(d) {
    if (!d) return '';
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s/60) + 'm';
    if (s < 86400) return Math.floor(s/3600) + 'h';
    return Math.floor(s/86400) + 'd';
  }

  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(v=>!v)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:34,height:34,background:'var(--surface)',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,cursor:'pointer',color:'var(--text2)',position:'relative',padding:0}}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"/></svg>
        {unread > 0 && (
          <span style={{position:'absolute',top:-4,right:-4,background:'var(--red)',color:'#14161a',fontSize:10,fontWeight:700,minWidth:16,height:16,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',border:'2px solid #0a0d13'}}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:99}}/>
          <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',width:340,maxWidth:'90vw',maxHeight:440,overflow:'hidden',display:'flex',flexDirection:'column',background:'var(--surface)',border:'1px solid rgba(0,0,0,0.08)',borderRadius:10,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',zIndex:100}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} style={{background:'none',border:'none',color:'var(--accent2)',fontSize:11,cursor:'pointer',padding:0}}>Mark all read</button>
              )}
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              {items.length === 0 ? (
                <div style={{padding:'30px 16px',textAlign:'center',color:'var(--text3)',fontSize:12}}>No notifications yet</div>
              ) : items.map(n => {
                const orderId = n.payload && n.payload.orderId;
                const inner = (
                  <div style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',background:n.is_read?'transparent':'rgba(59,130,246,0.06)',display:'flex',alignItems:'flex-start',gap:8,cursor:orderId?'pointer':'default'}}>
                    {!n.is_read && <span style={{width:6,height:6,borderRadius:'50%',background:'var(--accent)',marginTop:6,flexShrink:0}}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:'var(--text)',lineHeight:1.4}}>{labelFor(n)}</div>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{timeAgo(n.created_at)} ago</div>
                    </div>
                  </div>
                );
                const onClick = () => { if (!n.is_read) markRead(n.id); setOpen(false); };
                return orderId ? (
                  <Link key={n.id} href={'/orders/' + orderId} onClick={onClick} style={{textDecoration:'none'}}>{inner}</Link>
                ) : (
                  <div key={n.id} onClick={onClick}>{inner}</div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
