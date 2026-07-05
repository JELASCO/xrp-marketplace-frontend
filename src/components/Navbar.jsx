'use client'; // chart-room
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../lib/store';
import { api } from '../lib/api';
import XummLoginModal from './XummLoginModal';
import { useXrpPrice } from '../lib/xrpPrice';

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
  const pathname = usePathname();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [dark, setDark] = useState(false);
  const router = useRouter();
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    try { setDark(document.documentElement.getAttribute('data-theme') === 'dark'); } catch (e) {}
  }, []);
  function toggleTheme() {
    const next = dark ? 'light' : 'dark';
    setDark(!dark);
    try { document.documentElement.setAttribute('data-theme', next); localStorage.setItem('xrph-theme', next); } catch (e) {}
  }

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

  const { price: xrpPrice, dir: priceDir } = useXrpPrice();

  return (
    <>
      <style>{`
        @media(max-width:640px){.xrp-nav-links{display:none!important}.xrp-price{display:none!important}}
      `}</style>
      <nav style={{background:'color-mix(in srgb, var(--bg) 86%, transparent)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 16px',height:58,display:'flex',alignItems:'center',gap:12}}>
          <Link href="/" style={{textDecoration:'none',color:'var(--text)',flexShrink:0,display:'flex',alignItems:'center',gap:9}}>
            <svg width="30" height="30" viewBox="0 0 34 34" fill="none" style={{color:'var(--beacon)',flexShrink:0}} aria-hidden="true">
              <circle cx="17" cy="17" r="15.5" stroke="currentColor" strokeWidth="1.6"/>
              <circle cx="17" cy="9.4" r="2.6" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M17 12v13.4M12.4 15.2h9.2M9.2 20.2c.6 3.6 3.8 6 7.8 6s7.2-2.4 7.8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M9.2 20.2l-1.9-1.4M9.2 20.2l2.3-.4M24.8 20.2l1.9-1.4M24.8 20.2l-2.3-.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span style={{fontSize:18,fontWeight:700,letterSpacing:'-.01em'}}>
              <span style={{fontFamily:'var(--f-mono)',fontWeight:600,letterSpacing:'.04em'}}>XRP</span><span style={{fontFamily:'var(--f-serif)',fontStyle:'italic',fontSize:20,marginLeft:1}}>Harbor</span>
            </span>
          </Link>
          {pathname !== '/' && (<form onSubmit={handleSearch} className="xrp-search" style={{flex:1,maxWidth:360,position:'relative'}}>
            <input className="input" style={{paddingLeft:32,fontSize:13,height:36,background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',borderRadius:8}}
              placeholder="Search the harbor…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',width:14,height:14}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </form>)}
          <div className="xrp-nav-links" style={{display:'flex',alignItems:'center',gap:4,marginLeft:'auto'}}>
            {[{href:'/listings',label:'Marketplace'},...(user?[{href:'/dashboard',label:'Dashboard'}]:[]),{href:'/listings/new',label:'List Item'},{href:'/orders',label:'Orders'}].map(l=>(
              <Link key={l.href} href={l.href} style={{fontSize:13,fontWeight:500,color:'var(--text2)',padding:'8px 14px',borderRadius:8,textDecoration:'none',transition:'all 0.15s',border:'1px solid transparent',background:'transparent'}}
                onMouseEnter={e=>{e.currentTarget.style.color='var(--text)';e.currentTarget.style.background='var(--surface2)'}}
                onMouseLeave={e=>{e.currentTarget.style.color='var(--text2)';e.currentTarget.style.background='transparent'}}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="xrp-price" style={{fontSize:12,fontFamily:'var(--f-mono)',color:'var(--text2)',background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:6,padding:'5px 10px',whiteSpace:'nowrap'}}>
            XRP <span style={{color: priceDir==='up' ? 'var(--starboard)' : priceDir==='down' ? 'var(--port)' : 'var(--text)', transition:'color 0.3s'}}>{xrpPrice ? '$' + xrpPrice.toFixed(xrpPrice < 10 ? 4 : 2) : '—'}{priceDir==='up' ? ' ▲' : priceDir==='down' ? ' ▼' : ''}</span>
          </div>
          <button onClick={toggleTheme} aria-label="Toggle theme"
            style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,background:'transparent',border:'1px solid var(--border2)',borderRadius:'50%',cursor:'pointer',color:'var(--text2)',flexShrink:0,padding:0}}>
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            )}
          </button>
          {user ? (
            <>
            <div ref={notifRef} style={{position:'relative'}}>
              <button onClick={openNotifs} aria-label="Notifications"
                style={{display:'flex',alignItems:'center',justifyContent:'center',width:36,height:36,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8,cursor:'pointer',color:'var(--text2)',position:'relative',padding:0,flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unread > 0 && <span style={{position:'absolute',top:-4,right:-4,minWidth:16,height:16,padding:'0 4px',background:'var(--port)',color:'#fff',fontSize:10,fontWeight:700,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>{unread>9?'9+':unread}</span>}
              </button>
              {showNotifs && (
                <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',width:300,maxHeight:380,overflowY:'auto',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 18px 44px -12px rgba(2,10,18,.5)',zIndex:100}}>
                  <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontSize:13,fontWeight:700,color:'var(--text)'}}>Notifications</div>
                  {notifs.length === 0 ? (
                    <div style={{padding:'24px 14px',textAlign:'center',fontSize:12,color:'var(--text3)'}}>No notifications yet</div>
                  ) : notifs.map(n => (
                    <div key={n.id} onClick={()=>{ setShowNotifs(false); const oid=n.payload&&n.payload.orderId; const lid=n.payload&&n.payload.listingId; router.push(oid?'/orders':lid?('/listing/'+lid):'/orders'); }}
                      style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:n.is_read?'transparent':'color-mix(in srgb, var(--beacon) 8%, transparent)',display:'flex',gap:10,alignItems:'flex-start'}}>
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
                style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:8,padding:'6px 12px',cursor:'pointer',color:'var(--text)',fontSize:13,fontWeight:500,minWidth:'fit-content'}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,var(--beacon),var(--tide))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'var(--on-beacon)',flexShrink:0}}>
                  {user.username?.slice(0,2).toUpperCase()}
                </div>
                <span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text)'}}>{user.username}</span>
              </button>
              {showMenu && (
                <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',width:175,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'5px 0',boxShadow:'0 18px 44px -12px rgba(2,10,18,.5)',zIndex:100}}>
                  {!(user.proUntil && new Date(user.proUntil).getTime() > Date.now()) && (<>
                    <Link href="/pro" onClick={()=>setShowMenu(false)} style={{display:'block',padding:'9px 16px',fontSize:13,color:'var(--beacon)',fontWeight:600,textDecoration:'none'}}>⭐ Upgrade to Pro</Link>
                    <div style={{height:1,background:'var(--border)',margin:'4px 0'}}/>
                  </>)}
                  {[{href:'/listings/new',label:'List an Item'},{href:'/store/create',label:'Create store'},{href:'/dashboard',label:'Dashboard'},{href:'/orders',label:'My Orders'},{href:'/messages',label:'Messages'},{href:'/favorites',label:'Favorites'},{href:'/profile/'+user.id,label:'My Profile'},{href:'/settings',label:'Settings'}].map(i=>(
                    <Link key={i.href} href={i.href} onClick={()=>setShowMenu(false)}
                      style={{display:'block',padding:'9px 16px',fontSize:13,color:'var(--text2)',textDecoration:'none',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.color='var(--text)';e.currentTarget.style.background='var(--surface2)'}}
                      onMouseLeave={e=>{e.currentTarget.style.color='var(--text2)';e.currentTarget.style.background='transparent'}}>
                      {i.label}
                    </Link>
                  ))}
                  {user.role==='admin' && <Link href="/admin" onClick={()=>setShowMenu(false)} style={{display:'block',padding:'9px 16px',fontSize:13,color:'var(--accent2)',textDecoration:'none'}}>Admin Panel</Link>}
                  <div style={{height:1,background:'var(--border)',margin:'4px 0'}}/>
                  <button onClick={()=>{logout();setShowMenu(false);}} style={{width:'100%',textAlign:'left',padding:'9px 16px',fontSize:13,color:'var(--port)',background:'none',border:'none',cursor:'pointer'}}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            <button onClick={()=>setShowLogin(true)}
              style={{display:'flex',alignItems:'center',gap:7,background:'#2080F5',color:'#fff',border:'none',borderRadius:999,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16.5 14.5h.01"/></svg>
              Connect Xaman
            </button>
          )}
        </div>
      </nav>
      {showLogin && <XummLoginModal onClose={()=>setShowLogin(false)}/>}
    </>
  );
}
