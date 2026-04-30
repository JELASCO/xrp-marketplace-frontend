'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '../lib/store';
import XummLoginModal from './XummLoginModal';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu,  setShowMenu]  = useState(false);
  const [search,    setSearch]    = useState('');
  const router = useRouter();

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) router.push('/listings?q=' + encodeURIComponent(search.trim()));
  }

  return (
    <>
      <nav style={{background:'rgba(8,10,14,0.9)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 16px',height:56,display:'flex',alignItems:'center',gap:12}}>
          <Link href="/" style={{fontWeight:800,fontSize:18,color:'#e8eaf0',textDecoration:'none',letterSpacing:'-0.02em',flexShrink:0}}>
            XRP<span style={{color:'#3b82f6'}}>Market</span>
          </Link>
          <form onSubmit={handleSearch} style={{flex:1,maxWidth:360,position:'relative'}}>
            <input className="input" style={{paddingLeft:32,fontSize:13,height:36,background:'#111620'}}
              placeholder="Search skins, coins, accounts..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#4a5568',width:14,height:14}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </form>
          <div style={{display:'flex',alignItems:'center',gap:2,marginLeft:'auto'}}>
            {[{href:'/listings',label:'Marketplace'},{href:'/listings/new',label:'List Item'},{href:'/orders',label:'Orders'}].map(l=>(
              <Link key={l.href} href={l.href} style={{fontSize:13,fontWeight:500,color:'#8892a4',padding:'6px 10px',borderRadius:8,textDecoration:'none',transition:'all 0.15s'}}
                onMouseEnter={e=>{e.currentTarget.style.color='#e8eaf0';e.currentTarget.style.background='#161c28'}}
                onMouseLeave={e=>{e.currentTarget.style.color='#8892a4';e.currentTarget.style.background='transparent'}}>
                {l.label}
              </Link>
            ))}
          </div>
          <div style={{fontSize:12,fontFamily:'monospace',color:'#4a5568',background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:6,padding:'4px 10px',whiteSpace:'nowrap'}}>
            XRP <span style={{color:'#10b981'}}>$2.18</span>
          </div>
          {user ? (
            <div style={{position:'relative'}}>
              <button onClick={()=>setShowMenu(v=>!v)}
                style={{display:'flex',alignItems:'center',gap:8,background:'#111620',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'6px 10px',cursor:'pointer',color:'#e8eaf0',fontSize:13,fontWeight:500}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>
                  {user.username?.slice(0,2).toUpperCase()}
                </div>
                <span style={{maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.username}</span>
              </button>
              {showMenu && (
                <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',width:175,background:'#111620',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'5px 0',boxShadow:'0 8px 32px rgba(0,0,0,0.5)',zIndex:100}}>
                  {[{href:`/profile/${user.id}`,label:'My Profile'},{href:'/orders',label:'My Orders'},{href:'/settings',label:'Settings'}].map(i=>(
                    <Link key={i.href} href={i.href} onClick={()=>setShowMenu(false)}
                      style={{display:'block',padding:'9px 16px',fontSize:13,color:'#8892a4',textDecoration:'none',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.color='#e8eaf0';e.currentTarget.style.background='#161c28'}}
                      onMouseLeave={e=>{e.currentTarget.style.color='#8892a4';e.currentTarget.style.background='transparent'}}>
                      {i.label}
                    </Link>
                  ))}
                  {user.role==='admin' && <Link href="/admin" onClick={()=>setShowMenu(false)} style={{display:'block',padding:'9px 16px',fontSize:13,color:'#60a5fa',textDecoration:'none'}}>Admin Panel</Link>}
                  <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'4px 0'}}/>
                  <button onClick={()=>{logout();setShowMenu(false);}} style={{width:'100%',textAlign:'left',padding:'9px 16px',fontSize:13,color:'#f87171',background:'none',border:'none',cursor:'pointer'}}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={()=>setShowLogin(true)}
              style={{display:'flex',alignItems:'center',gap:6,background:'#3b82f6',color:'#fff',border:'none',borderRadius:8,padding:'7px 14px',fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              ⚡ Connect Xumm
            </button>
          )}
        </div>
      </nav>
      {showLogin && <XummLoginModal onClose={()=>setShowLogin(false)}/>}
    </>
  );
}
