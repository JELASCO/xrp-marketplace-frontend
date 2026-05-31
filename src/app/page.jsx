'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import ListingCard from '../components/ListingCard';
import { useAuthStore } from '../lib/store';

const CATS = [
  {key:'games',label:'Games',emoji:'🎮'},
  {key:'graphics',label:'Graphics & Art',emoji:'🎨'},
  {key:'software',label:'Software',emoji:'💻'},
  {key:'accounts',label:'Accounts',emoji:'👤'},
  {key:'other',label:'Other',emoji:'📦'},
];

function SkeletonCard({h=130}) {
  return (
    <div style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:12,overflow:'hidden'}}>
      <div style={{height:h,background:'var(--xh-surface2)',animation:'xhpulse 1.5s ease-in-out infinite'}}/>
      <div style={{padding:'12px 14px'}}>
        <div style={{height:13,background:'var(--xh-surface2)',borderRadius:6,marginBottom:8,animation:'xhpulse 1.5s ease-in-out infinite'}}/>
        <div style={{height:11,background:'var(--xh-surface2)',borderRadius:6,width:'60%',animation:'xhpulse 1.5s ease-in-out infinite'}}/>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    try {
      const t = localStorage.getItem('xrph-theme');
      if (t === 'light' || t === 'dark') setTheme(t);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('xrph-theme', theme); } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);
  const dark = theme === 'dark';

  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetch('/api/stats').then(r=>r.json()).then(setStats).catch(()=>{});
  }, []);

  const user = useAuthStore(s=>s.user);
  const [listings,setListings] = useState([]);
  const [featured,setFeatured] = useState([]);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    setLoading(true);
    api.listings.list({sort:'created_at',limit:8}).then(setListings).catch(()=>setListings([])).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    api.listings.list({limit:24}).then(items=>{
      const now = Date.now();
      const f = (Array.isArray(items)?items:[]).filter(l =>
        l.is_featured && l.featured_until && new Date(l.featured_until).getTime() > now && l.status === 'active'
      ).slice(0,3);
      setFeatured(f);
    }).catch(()=>{});
  },[]);

  const fmtNum = n => (n||0).toLocaleString('en-US');
  const fmtXrp = n => n > 999 ? (n/1000).toFixed(1)+'k' : Math.round(n||0).toString();

  return (
    <div className="xh-home">
      <style>{`
        html[data-theme="light"]{
          --xh-bg:#FFFFFF; --xh-bg2:#F6F8FB; --xh-surface:#FFFFFF; --xh-surface2:#F2F5F9;
          --xh-text:#0A1628; --xh-text2:#4A5568; --xh-text3:#8A98AD;
          --xh-border:#E5EBF2; --xh-border2:#D2DBE6; --xh-tint:#F0F5FB;
          --xh-accent:#1572E8; --xh-accent2:#2080F5;
        }
        html[data-theme="light"] body{ background:#FFFFFF !important; color:#0A1628 !important; }
        html[data-theme="dark"]{
          --xh-bg:#0A0E1A; --xh-bg2:#111827; --xh-surface:#151B2C; --xh-surface2:#1C2438;
          --xh-text:#F1F5F9; --xh-text2:#CBD5E1; --xh-text3:#94A3B8;
          --xh-border:#1F2937; --xh-border2:#2A3548; --xh-tint:rgba(255,255,255,0.04);
          --xh-accent:#3B82F6; --xh-accent2:#60A5FA;
        }
        html[data-theme="dark"] body{ background:#0A0E1A !important; color:#F1F5F9 !important; }
        @keyframes xhpulse{0%,100%{opacity:1}50%{opacity:.5}}
        .xh-btn-primary{background:var(--xh-accent);color:#fff;border:none;border-radius:10px;padding:13px 28px;font-size:14px;font-weight:600;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 14px rgba(21,114,232,0.25)}
        .xh-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(21,114,232,0.35)}
        .xh-btn-secondary{background:var(--xh-surface);color:var(--xh-text);border:1px solid var(--xh-border2);border-radius:10px;padding:13px 28px;font-size:14px;font-weight:600;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:background .15s}
        .xh-btn-secondary:hover{background:var(--xh-surface2)}
        .xh-pill{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:22px;font-size:13.5px;font-weight:500;background:var(--xh-surface);color:var(--xh-text2);border:1px solid var(--xh-border);text-decoration:none;white-space:nowrap;transition:border-color .15s,color .15s}
        .xh-pill:hover{border-color:var(--xh-accent);color:var(--xh-text)}
      `}</style>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        aria-label="Toggle theme"
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          position:'fixed', top:78, right:18, zIndex:40,
          width:40, height:40, borderRadius:10,
          background:'var(--xh-surface)', border:'1px solid var(--xh-border2)', color:'var(--xh-text)',
          fontSize:18, cursor:'pointer',
          boxShadow:'0 4px 14px rgba(13,30,58,0.10)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      {/* HERO */}
      <div style={{textAlign:'center',padding:'56px 16px 40px',position:'relative'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'7px 16px',borderRadius:99,background:'var(--xh-tint)',border:'1px solid var(--xh-border)',fontSize:12.5,fontWeight:600,color:'var(--xh-accent)',marginBottom:24}}>
          🛡️ Escrow-protected · Powered by the XRP Ledger
        </div>
        <h1 style={{fontSize:'clamp(34px,5vw,52px)',fontWeight:800,letterSpacing:'-0.025em',lineHeight:1.1,color:'var(--xh-text)',marginBottom:18,maxWidth:880,marginLeft:'auto',marginRight:'auto'}}>
          The safe harbor for{' '}
          <span style={{background:'linear-gradient(90deg, var(--xh-accent) 0%, #38BDF8 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>gaming assets</span>
        </h1>
        <p style={{fontSize:16.5,color:'var(--xh-text2)',maxWidth:620,margin:'0 auto 32px',lineHeight:1.55}}>
          Buy and sell game accounts, skins, in-game currency and digital goods. Every trade locked in XRPL escrow until both sides confirm.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <Link href="/listings" className="xh-btn-primary">Browse marketplace</Link>
          {user ? (
            <Link href="/listings/new" className="xh-btn-secondary">Start selling</Link>
          ) : (
            <Link href="/login" className="xh-btn-secondary">Start selling</Link>
          )}
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{background:'var(--xh-bg2)',border:'1px solid var(--xh-border)',borderRadius:14,padding:'22px 16px',marginBottom:36,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        {[
          {v: stats ? fmtNum(stats.active_listings) : '—', l:'Active listings'},
          {v: stats ? fmtNum(stats.items_traded) : '—', l:'Trades settled'},
          {v: stats ? fmtNum(stats.total_users) : '—', l:'Traders'},
          {v: '99.4%', l:'Dispute-free', green:true},
        ].map((s,i)=>(
          <div key={i} style={{textAlign:'center'}}>
            <div style={{fontSize:26,fontWeight:800,letterSpacing:'-0.02em',color: s.green ? '#16A34A' : 'var(--xh-text)'}}>{s.v}</div>
            <div style={{fontSize:12.5,color:'var(--xh-text3)',marginTop:3}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* CATEGORY PILLS */}
      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center',marginBottom:40}}>
        {CATS.map(c=>(
          <Link key={c.key} href={'/listings?category='+c.key} className="xh-pill">
            <span>{c.emoji}</span> {c.label}
          </Link>
        ))}
      </div>

      {/* FEATURED */}
      {featured.length > 0 && (
        <div style={{marginBottom:40}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:18,fontWeight:700,color:'var(--xh-text)'}}>🔥 Featured items</span>
            </div>
            <Link href="/listings" style={{fontSize:13,color:'var(--xh-accent)',textDecoration:'none',fontWeight:600}}>View all →</Link>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {featured.map(l => <ListingCard key={l.id} listing={l}/>)}
          </div>
        </div>
      )}

      {/* LATEST */}
      <div style={{marginBottom:48}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <span style={{fontSize:18,fontWeight:700,color:'var(--xh-text)'}}>Latest listings</span>
          <Link href="/listings" style={{fontSize:13,color:'var(--xh-accent)',textDecoration:'none',fontWeight:600}}>Browse all →</Link>
        </div>
        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {Array.from({length:8}).map((_,i)=><SkeletonCard key={i}/>)}
          </div>
        ) : listings.length===0 ? (
          <div style={{textAlign:'center',padding:'48px 20px',background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:14}}>
            <div style={{fontSize:36,marginBottom:12}}>🏪</div>
            <div style={{fontSize:15,fontWeight:600,color:'var(--xh-text)',marginBottom:6}}>No listings yet</div>
            <div style={{fontSize:13,color:'var(--xh-text2)'}}>Be the first to list an item.</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {listings.slice(0,8).map(l => <ListingCard key={l.id} listing={l}/>)}
          </div>
        )}
      </div>

      {/* HOW ESCROW KEEPS YOU SAFE */}
      <div style={{background:'var(--xh-bg2)',borderRadius:18,padding:'40px 28px',marginBottom:36}}>
        <h2 style={{fontSize:22,fontWeight:700,color:'var(--xh-text)',textAlign:'center',marginBottom:32,letterSpacing:'-0.02em'}}>How escrow keeps you safe</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:24}}>
          {[
            {step:'1',title:'Buyer locks XRP',desc:'Funds are held in an on-chain XRPL escrow — neither side can touch them.',color:'#DBEAFE'},
            {step:'2',title:'Seller delivers',desc:'The account, skins or goods are handed over through the platform.',color:'#FEF3C7'},
            {step:'3',title:'Funds release',desc:'Buyer confirms and escrow releases to the seller. Disputes go to review.',color:'#D1FAE5'},
          ].map(s=>(
            <div key={s.step} style={{textAlign:'center'}}>
              <div style={{width:56,height:56,borderRadius:14,background:dark?'rgba(59,130,246,0.15)':s.color,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:22}}>🔒</div>
              <div style={{fontSize:14,fontWeight:700,color:'var(--xh-text)',marginBottom:8}}>{s.step} · {s.title}</div>
              <div style={{fontSize:13,color:'var(--xh-text2)',lineHeight:1.6,maxWidth:280,margin:'0 auto'}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{background:'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #1572E8 100%)',borderRadius:18,padding:'48px 28px',textAlign:'center',marginBottom:24,color:'#fff'}}>
        <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-0.02em',marginBottom:12}}>Ready to drop anchor?</h2>
        <p style={{fontSize:15,opacity:0.9,maxWidth:520,margin:'0 auto 24px',lineHeight:1.55}}>Connect your Xaman wallet and start trading in under a minute.</p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          {!user && (
            <Link href="/login" style={{background:'#fff',color:'#1572E8',padding:'13px 28px',borderRadius:10,fontSize:14,fontWeight:700,textDecoration:'none'}}>Connect wallet</Link>
          )}
          {user ? (<Link href="/listings/new" style={{background:'rgba(255,255,255,0.15)',color:'#fff',padding:'12px 28px',borderRadius:8,fontSize:14,fontWeight:600,textDecoration:'none',border:'1px solid rgba(255,255,255,0.2)'}}>+ List an item</Link>) : (<Link href="/listings" style={{background:'rgba(255,255,255,0.12)',color:'#fff',padding:'13px 28px',borderRadius:10,fontSize:14,fontWeight:600,textDecoration:'none',border:'1px solid rgba(255,255,255,0.2)'}}>Browse first</Link>)}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{textAlign:'center',padding:'28px 16px',marginTop:24,borderTop:'1px solid var(--xh-border)',color:'var(--xh-text3)',fontSize:12.5,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12,alignItems:'center'}}>
        <div>© 2026 XRPHarbor · Built on the XRP Ledger</div>
        <div style={{display:'flex',gap:16}}>
          <a href="/tos" style={{color:'var(--xh-text3)',textDecoration:'none'}}>Terms</a>
          <a href="/privacy" style={{color:'var(--xh-text3)',textDecoration:'none'}}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}
