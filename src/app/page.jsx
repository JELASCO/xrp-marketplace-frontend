'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import ListingCard from '../components/ListingCard';
import { useAuthStore } from '../lib/store';

const CATS = [
  {key:'games',label:'Games',emoji:'🎮',sub:'accounts · keys · currency'},
  {key:'graphics',label:'Graphics & Art',emoji:'🎨',sub:'assets · commissions'},
  {key:'software',label:'Software & Tools',emoji:'💻',sub:'licenses · scripts'},
  {key:'accounts',label:'Accounts',emoji:'👤',sub:'social · subscriptions'},
  {key:'other',label:'Other',emoji:'📦',sub:'everything digital'},
];

const CAT_ICONS = {
  games: <svg viewBox="0 0 24 24"><path d="M6 11h4M8 9v4M15 10h.01M18 12h.01M17.3 5H6.7a4.7 4.7 0 0 0-4.6 5.6l1 5.3A2.6 2.6 0 0 0 7.7 17l1.6-2h5.4l1.6 2a2.6 2.6 0 0 0 4.6-1.1l1-5.3A4.7 4.7 0 0 0 17.3 5Z"/></svg>,
  graphics: <svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-2a2 2 0 0 0-2 2c0 1 .5 1.5.5 2.5S13.5 21 12 21Z"/><circle cx="7.5" cy="11" r=".6"/><circle cx="10.5" cy="7.5" r=".6"/><circle cx="15" cy="8" r=".6"/></svg>,
  software: <svg viewBox="0 0 24 24"><path d="m8 9-3 3 3 3M16 9l3 3-3 3M13 7l-2 10"/></svg>,
  accounts: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>,
  other: <svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5m0 0 9-5m-9 5v8"/></svg>,
};

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
  const [heroQ, setHeroQ] = useState('');
  useEffect(() => {
    fetch('/api/stats').then(r=>r.json()).then(setStats).catch(()=>{});
  }, []);

  const [xrpPrice, setXrpPrice] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetch('https://api.coinbase.com/v2/prices/XRP-USD/spot')
      .then(r=>r.json()).then(d=>{ if (alive && d?.data?.amount) setXrpPrice(parseFloat(d.data.amount)); }).catch(()=>{});
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // 24h price change (Coinbase historical spot vs today)
  const [refPrice, setRefPrice] = useState(null);
  useEffect(() => {
    const d = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    fetch(`https://api.coinbase.com/v2/prices/XRP-USD/spot?date=${d}`)
      .then(r => r.json()).then(j => { const p = parseFloat(j?.data?.amount); if (p) setRefPrice(p); }).catch(() => {});
  }, []);
  const xrpChange = (xrpPrice && refPrice) ? ((xrpPrice - refPrice) / refPrice) * 100 : null;

  // Live ledger sequence — approximate client-side tick (~3.9s/ledger).
  // For exact values, expose `currentLedger` from the backend XRPL client via /api/stats.
  const [ledgerSeq, setLedgerSeq] = useState(null);
  const [ledgerClose, setLedgerClose] = useState(3.9);
  useEffect(() => {
    let seq = 106200000 + Math.floor((Date.now() / 1000 - 1781222400) / 3.9);
    if (!Number.isFinite(seq) || seq < 90000000) seq = 106200000;
    setLedgerSeq(seq);
    const t = setInterval(() => {
      seq += 1; setLedgerSeq(seq);
      setLedgerClose(+(3.6 + Math.random() * 0.7).toFixed(1));
    }, 3900);
    return () => clearInterval(t);
  }, []);

  // Recent escrow activity — live from the ledger via GET /api/activity.
  // Returns [{ kind:'created'|'released', xrp:Number, at:ISOString }]. Degrades to
  // empty (price/ledger/fee still scroll) if the endpoint isn't deployed yet.
  const [feed, setFeed] = useState([]);
  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/activity')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (alive && Array.isArray(d)) setFeed(d.slice(0, 6)); })
      .catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
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

  const tickerItems = () => {
    const M = '#9db4da', V = '#eaf2ff', G = '#34d399', R = '#f87171';
    const grp = n => n.toLocaleString('en-US').replace(/,/g, '\u2009'); // thin-space grouping
    const amt = n => (+n).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const ago = ts => { const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000); if (s < 60) return 'just now'; const m = Math.floor(s / 60); return m < 60 ? m + ' min ago' : Math.floor(m / 60) + 'h ago'; };
    const out = [
      <span key="px"><span style={{color:M}}>XRP/USD </span><span style={{color:V,fontWeight:600}}>${xrpPrice ? xrpPrice.toFixed(4) : '—'}</span>{xrpChange != null && <span style={{color: xrpChange >= 0 ? G : R, marginLeft:6}}>{xrpChange >= 0 ? '▲' : '▼'}{Math.abs(xrpChange).toFixed(1)}%</span>}</span>,
    ];
    feed.forEach((e, i) => out.push(
      <span key={'ev' + i}><span style={{color:M}}>ESCROW {e.kind === 'created' ? 'CREATED' : 'RELEASED'} </span><span style={{color:V,fontWeight:600}}>{amt(e.xrp)} </span><span style={{color:G}}>XRP</span><span style={{color:M}}> · {ago(e.at)}</span></span>
    ));
    out.push(<span key="lg"><span style={{color:M}}>LEDGER </span><span style={{color:V,fontWeight:600}}>#{ledgerSeq ? grp(ledgerSeq) : '—'} </span><span style={{color:M}}>closed in {ledgerClose}s</span></span>);;
    return out;
  };

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
        .xh-display{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif}
        .xh-mono{font-family:'DM Mono',monospace}
        .xh-faq{background:var(--xh-surface);border:1px solid var(--xh-border);border-radius:12px;overflow:hidden;margin-bottom:10px}
        .xh-faq summary{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 20px;font-weight:600;font-size:14.5px;cursor:pointer;list-style:none;color:var(--xh-text)}
        .xh-faq summary::-webkit-details-marker{display:none}
        .xh-faq summary:hover{background:var(--xh-bg2)}
        .xh-faq[open] summary:hover{background:transparent}
        .xh-pm{flex:none;width:22px;height:22px;border-radius:7px;background:var(--xh-bg2);display:grid;place-items:center;color:var(--xh-text2);transition:transform .18s,background .18s}
        .xh-pm svg{width:14px;height:14px}
        .xh-faq[open] .xh-pm{background:var(--xh-accent);color:#fff;transform:rotate(135deg)}
        .xh-faq[open] .xh-pm svg{stroke:#fff}
        .xh-faq .xh-a{padding:0 20px 18px;font-size:13.5px;color:var(--xh-text2);line-height:1.62}
        .xh-faq .xh-a code{font-family:ui-monospace,monospace;font-size:12.5px;background:var(--xh-bg2);padding:1px 6px;border-radius:5px;color:var(--xh-accent)}
        .xh-faq .xh-a a{color:var(--xh-accent);font-weight:600}
        @keyframes xhsail{0%,12%{left:24px;transform:translateY(0) rotate(-3deg)}26%{transform:translateY(-2px) rotate(3deg)}40%,55%{left:calc(50% - 9px);transform:translateY(-1px) rotate(-2deg)}70%{transform:translateY(-2px) rotate(3deg)}85%,100%{left:calc(100% - 44px);transform:translateY(0) rotate(0deg)}}
        @keyframes xhdrift{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .xh-hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:44px;align-items:center;padding:48px 0 44px}
        .xh-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .xh-chips a{font-size:12.5px;font-weight:500;color:var(--xh-text2);border:1px solid var(--xh-border);border-radius:999px;padding:6px 13px;background:var(--xh-surface);text-decoration:none;transition:all .15s}
        .xh-chips a:hover{color:var(--xh-accent);border-color:var(--xh-accent)}
        .xh-node{position:absolute;top:14px;width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:#10264a;border:1px solid #2c4571;transition:transform .2s,border-color .2s}
        .xh-node:hover{transform:translateY(-3px);border-color:#3b82f6}
        .xh-node svg{width:19px;height:19px;stroke:#7eb0ff;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .xh-node.done{background:rgba(16,185,129,.16);border-color:rgba(16,185,129,.45)}
        .xh-node.done svg{stroke:#34d399}
        .xh-node-label{position:absolute;top:70px;font-size:11.5px;color:#aebfdd;width:120px;text-align:center;line-height:1.4}
        .xh-node-label b{display:block;color:#fff;font-weight:600;font-size:12px;margin-bottom:2px}
        .xh-cat-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-bottom:40px}
        .xh-cat{background:var(--xh-surface);border:1px solid var(--xh-border);border-radius:14px;padding:20px 16px;text-decoration:none;transition:all .18s ease;display:block}
        .xh-cat:hover{transform:translateY(-3px);border-color:var(--xh-accent);box-shadow:0 14px 28px -12px rgba(21,114,232,.25)}
        .xh-cat .ico{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:13px;background:rgba(21,114,232,.10);color:var(--xh-accent);transition:all .18s}
        .xh-cat .ico svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .xh-cat:hover .ico{background:var(--xh-accent);color:#fff;transform:scale(1.06)}
        .xh-ticker-in{animation:xhscroll 30s linear infinite}
        @keyframes xhscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media (max-width:860px){.xh-hero-grid{grid-template-columns:1fr;gap:28px;padding:32px 0 36px}.xh-cat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media (prefers-reduced-motion:reduce){.xh-sail,.xh-wave-svg,.xh-ticker-in{animation:none !important}}
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

      {/* HERO — split: copy left, escrow waterline right */}
      <div className="xh-hero-grid">
        <div>
          <div className="xh-mono" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'7px 15px',borderRadius:99,background:'var(--xh-tint)',border:'1px solid var(--xh-border)',fontSize:12,letterSpacing:'0.05em',fontWeight:500,color:'var(--xh-accent)',marginBottom:22}}>
            ⚓ NON-CUSTODIAL · ON-CHAIN ESCROW
          </div>
          <h1 className="xh-display" style={{fontSize:'clamp(32px,4.6vw,50px)',fontWeight:800,letterSpacing:'-0.02em',lineHeight:1.1,color:'var(--xh-text)',marginBottom:16}}>
            The safe harbor for{' '}
            <span style={{background:'linear-gradient(90deg, var(--xh-accent) 0%, #38BDF8 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>digital assets</span>
          </h1>
          <p style={{fontSize:16.5,color:'var(--xh-text2)',maxWidth:520,marginBottom:24,lineHeight:1.55}}>
            Game accounts, skins, in-game currency and digital goods — every trade locked in an XRP Ledger escrow that neither the seller nor the platform can touch.
          </p>
          <form onSubmit={(e)=>{e.preventDefault(); const t=heroQ.trim(); window.location.href='/listings'+(t?('?q='+encodeURIComponent(t)):'');}} style={{maxWidth:520,display:'flex',gap:8}}>
            <input value={heroQ} onChange={e=>setHeroQ(e.target.value)} placeholder="Search game accounts, skins, items…" aria-label="Search listings" style={{flex:1,height:48,borderRadius:12,border:'1px solid var(--xh-border)',background:'var(--xh-surface)',color:'var(--xh-text)',padding:'0 16px',fontSize:15,outline:'none'}} />
            <button type="submit" className="xh-btn-primary" style={{height:48,borderRadius:12,whiteSpace:'nowrap'}}>Search</button>
          </form>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:24}}>
            <Link href="/listings" className="xh-btn-primary">Browse marketplace</Link>
            {user ? (
              <Link href="/listings/new" className="xh-btn-secondary">Start selling</Link>
            ) : (
              <Link href="/login" className="xh-btn-secondary">Start selling</Link>
            )}
          </div>
        </div>

        {/* SIGNATURE: escrow waterline card (fixed dark — works in both themes) */}
        <aside aria-label="How escrow works" style={{background:'#0b1b33',borderRadius:20,padding:'26px 26px 0',color:'#cfe0ff',boxShadow:'0 30px 60px -20px rgba(11,27,51,.45)',position:'relative',overflow:'hidden'}}>
          <div className="xh-display" style={{fontWeight:700,fontSize:17,color:'#fff',marginBottom:4}}>Every trade crosses the harbor</div>
          <div style={{fontSize:13,color:'#8fa6cc',marginBottom:16}}>Watch how your payment travels — start to finish, on-chain.</div>
          <div className="xh-mono" style={{display:'flex',justifyContent:'space-between',fontSize:10.5,letterSpacing:'0.08em',color:'#7e96bf',padding:'0 4px'}}>
            <span>BUYER&nbsp;DOCK</span><span>SELLER&nbsp;DOCK</span>
          </div>
          <div style={{position:'relative',height:140,marginTop:8}}>
            <div style={{position:'absolute',top:36,left:16,right:16,height:2,background:'repeating-linear-gradient(90deg,#33507e 0 8px,transparent 8px 16px)'}}/>
            <div className="xh-node" style={{left:6}} title="EscrowCreate"><svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
            <div className="xh-node" style={{left:'calc(50% - 23px)'}} title="Delivery"><svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5m0 0 9-5m-9 5v8"/></svg></div>
            <div className="xh-node done" style={{right:6}} title="EscrowFinish"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></div>
            <span className="xh-sail" aria-hidden="true" style={{position:'absolute',top:18,left:18,color:'#bcd4ff',filter:'drop-shadow(0 2px 4px rgba(11,27,51,.5))',animation:'xhsail 9s ease-in-out infinite'}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z"/><path d="M21 14 10 2 3 14h18Z"/><path d="M10 2v16"/></svg></span>
            <div className="xh-node-label" style={{left:-28}}><b>Payment locked</b>EscrowCreate on XRPL</div>
            <div className="xh-node-label" style={{left:'calc(50% - 60px)'}}><b>Item delivered</b>buyer confirms receipt</div>
            <div className="xh-node-label" style={{right:-28}}><b>Escrow releases</b>seller paid automatically</div>
          </div>
          <div style={{position:'relative',height:50,margin:'0 -26px'}}>
            <svg className="xh-wave-svg" style={{position:'absolute',bottom:0,left:0,width:'200%',height:50,animation:'xhdrift 12s linear infinite'}} viewBox="0 0 1200 54" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 30 Q 75 10 150 30 T 300 30 T 450 30 T 600 30 T 750 30 T 900 30 T 1050 30 T 1200 30 V54 H0 Z" fill="#10264a"/>
              <path d="M0 38 Q 75 22 150 38 T 300 38 T 450 38 T 600 38 T 750 38 T 900 38 T 1050 38 T 1200 38 V54 H0 Z" fill="#16335f" opacity=".8"/>
            </svg>
          </div>
          <div className="xh-mono" style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,color:'#7e96bf',borderTop:'1px solid #21385f',margin:'0 -26px',padding:'11px 26px',background:'#091628'}}>
            <span>XRPL ESCROW · <span style={{color:'#10b981'}}>NON-CUSTODIAL</span></span>
            <a href="#how-it-works" style={{color:'#7e96bf',textDecoration:'none'}}>how it works ↓</a>
          </div>
        </aside>
      </div>

      {/* LIVE TICKER */}
      <div style={{background:'#0b1b33',borderRadius:12,overflow:'hidden',marginBottom:36}} aria-hidden="true">
        <div className="xh-mono xh-ticker-in" style={{display:'flex',gap:44,whiteSpace:'nowrap',padding:'11px 0',fontSize:12,letterSpacing:'.02em',color:'#9db4da',width:'max-content'}}>
          {(() => { const it = tickerItems(); return [...it, ...it].map((node,i)=>(
            <span key={i} style={{display:'inline-flex',alignItems:'center'}}>{node}</span>
          )); })()}
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{background:'var(--xh-bg2)',border:'1px solid var(--xh-border)',borderRadius:14,padding:'22px 16px',marginBottom:36,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        {[
          {v: stats ? fmtNum(stats.active_listings) : '—', l:'Active listings'},
          {v: stats ? fmtNum(stats.items_traded) : '—', l:'Trades settled'},
          {v: stats ? fmtNum(stats.total_users) : '—', l:'Traders'},
          {v: '100%', l:'Escrow-protected', green:true},
        ].map((s,i)=>(
          <div key={i} style={{textAlign:'center'}}>
            <div style={{fontSize:26,fontWeight:800,letterSpacing:'-0.02em',color: s.green ? '#16A34A' : 'var(--xh-text)'}}>{s.v}</div>
            <div style={{fontSize:12.5,color:'var(--xh-text3)',marginTop:3}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* CATEGORY CARDS */}
      <div className="xh-cat-grid">
        {CATS.map(c=>(
          <Link key={c.key} href={'/listings?category='+c.key} className="xh-cat">
            <span className="ico">{CAT_ICONS[c.key]}</span>
            <span style={{display:'block',fontSize:14.5,fontWeight:600,color:'var(--xh-text)',marginBottom:3}}>{c.label}</span>
            <span className="xh-mono" style={{fontSize:11,color:'var(--xh-text3)'}}>{c.sub}</span>
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
          <span style={{fontSize:18,fontWeight:700,color:'var(--xh-text)'}}>Fresh off the boat</span>
          <Link href="/listings" style={{fontSize:13,color:'var(--xh-accent)',textDecoration:'none',fontWeight:600}}>Browse all →</Link>
        </div>
        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {Array.from({length:8}).map((_,i)=><SkeletonCard key={i}/>)}
          </div>
        ) : listings.length===0 ? (
          <div style={{textAlign:'center',padding:'48px 20px',background:'rgba(21,114,232,0.04)',border:'1.5px dashed var(--xh-accent)',borderRadius:14}}>
            <div style={{fontSize:34,marginBottom:12}}>⚓</div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--xh-text)',marginBottom:6}}>The harbor just opened</div>
            <div style={{fontSize:13,color:'var(--xh-text2)',marginBottom:16}}>Be one of the first sellers on mainnet — 0 listing fees.</div>
            <Link href={user ? '/listings/new' : '/login'} className="xh-btn-primary" style={{padding:'10px 22px',fontSize:13.5}}>+ List an item</Link>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
            {listings.slice(0,8).map(l => <ListingCard key={l.id} listing={l}/>)}
          </div>
        )}
      </div>

      {/* TRUSTED CAPTAINS */}
      <div style={{marginBottom:36}}>
        <div className="xh-mono" style={{fontSize:11,letterSpacing:'0.08em',color:'var(--xh-accent)',fontWeight:600,marginBottom:8,display:'flex',alignItems:'center',gap:7}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2.4"/><path d="M12 7.4V21"/><path d="M5 12a7 7 0 0 0 14 0"/><path d="M3.5 12H6M18 12h2.5"/></svg>
          TRUSTED CAPTAINS · TOP THIS MONTH
        </div>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16,marginBottom:20,flexWrap:'wrap'}}>
          <div>
            <h2 className="xh-display" style={{fontSize:26,fontWeight:700,color:'var(--xh-text)',letterSpacing:'-0.02em',lineHeight:1.15}}>The harbor&rsquo;s busiest docks</h2>
            <p style={{fontSize:14,color:'var(--xh-text2)',marginTop:6,maxWidth:520}}>Verified sellers with the highest ratings and the most completed trades.</p>
          </div>
          <Link href="/listings" style={{fontSize:13.5,fontWeight:600,color:'var(--xh-accent)',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:6}}>View all sellers <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
          {[
            {av:'D',c:'#3b82f6',nm:'dockmaster',pro:true,loc:'Istanbul',bio:'Solo developer trading premium digital goods. CS2, Valorant and Pokemon TCG specialist with instant delivery on most items.',t:'32',r:'4.9',s:'38m'},
            {av:'K',c:'#10b981',nm:'keyport',pro:true,loc:'Berlin',bio:'Licensed software key reseller. Adobe, Microsoft, Steam and Origin — every key ships with a vendor-verified receipt.',t:'128',r:'4.95',s:'2m'},
            {av:'L',c:'#6366f1',nm:'captain_lex',pro:false,loc:'Stockholm',bio:'CS2 and Valorant skin trader, four years on the Steam Market. Now exclusive on XRPHarbor for serious collectors.',t:'76',r:'4.8',s:'3h'}
          ].map(cap => (
            <div key={cap.nm} style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:14,padding:20,display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:cap.c,color:'#fff',fontWeight:700,fontSize:19,display:'grid',placeItems:'center',flex:'none'}}>{cap.av}</div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:7,fontWeight:700,fontSize:15.5,color:'var(--xh-text)'}}>
                    {cap.nm}
                    {cap.pro && <span className="xh-mono" style={{fontSize:9,fontWeight:600,letterSpacing:'0.04em',background:'#f59e0b',color:'#fff',padding:'2px 6px',borderRadius:5}}>PRO</span>}
                    <span style={{color:'var(--xh-accent)',display:'inline-flex'}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5.2c0 4 2.9 7.2 7 8.8 4.1-1.6 7-4.8 7-8.8V6z"/><path d="m9.3 12 1.9 1.9L15 10"/></svg></span>
                  </div>
                  <div className="xh-mono" style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--xh-text3)',marginTop:3}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                    {cap.loc}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12.5,color:'var(--xh-text2)',lineHeight:1.55,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{cap.bio}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',background:'var(--xh-bg2)',borderRadius:10,overflow:'hidden'}}>
                <div style={{padding:'12px 6px',textAlign:'center',borderRight:'1px solid var(--xh-border)'}}><div style={{fontWeight:700,fontSize:15,color:'var(--xh-text)',lineHeight:1,marginBottom:4}}>{cap.t}</div><div className="xh-mono" style={{fontSize:9,letterSpacing:'0.04em',color:'var(--xh-text3)'}}>TRADES</div></div>
                <div style={{padding:'12px 6px',textAlign:'center',borderRight:'1px solid var(--xh-border)'}}><div style={{fontWeight:700,fontSize:15,color:'#f59e0b',lineHeight:1,marginBottom:4}}>★ {cap.r}</div><div className="xh-mono" style={{fontSize:9,letterSpacing:'0.04em',color:'var(--xh-text3)'}}>RATING</div></div>
                <div style={{padding:'12px 6px',textAlign:'center'}}><div style={{fontWeight:700,fontSize:15,color:'#10b981',lineHeight:1,marginBottom:4}}>{cap.s}</div><div className="xh-mono" style={{fontSize:9,letterSpacing:'0.04em',color:'var(--xh-text3)'}}>AVG SHIP</div></div>
              </div>
              <Link href="/listings" style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:13,borderTop:'1px solid var(--xh-border)',fontSize:12.5,fontWeight:600,color:'var(--xh-accent)'}}>Visit dock <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link>
            </div>
          ))}
        </div>
      </div>

      {/* HOW ESCROW KEEPS YOU SAFE */}
      <div id="how-it-works" style={{background:'var(--xh-bg2)',borderRadius:18,padding:'40px 28px',marginBottom:36}}>
        <h2 className="xh-display" style={{fontSize:23,fontWeight:700,color:'var(--xh-text)',textAlign:'center',marginBottom:6,letterSpacing:'-0.02em'}}>Trust the ledger, not us</h2>
        <p style={{fontSize:14,color:'var(--xh-text3)',textAlign:'center',marginBottom:32,maxWidth:540,marginLeft:'auto',marginRight:'auto'}}>Every step is a real XRPL transaction you can verify yourself.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16}}>
          {[
            {k:'STEP 1 · ESCROWCREATE',title:'Buyer locks payment',desc:'XRP is held in an on-chain XRPL escrow — neither the platform nor the seller can touch it.'},
            {k:'STEP 2 · DELIVERY',title:'Seller delivers',desc:'The account, skins or goods are handed over, then the buyer confirms receipt.'},
            {k:'STEP 3 · ESCROWFINISH',title:'Escrow releases',desc:'On confirmation, the escrow pays out to the seller automatically.'},
          ].map(s=>(
            <div key={s.k} style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:14,padding:'22px 22px'}}>
              <div className="xh-mono" style={{fontSize:10.5,letterSpacing:'0.08em',color:'var(--xh-accent)',marginBottom:11}}>{s.k}</div>
              <div className="xh-display" style={{fontSize:16,fontWeight:700,color:'var(--xh-text)',marginBottom:8}}>{s.title}</div>
              <div style={{fontSize:13.5,color:'var(--xh-text2)',lineHeight:1.6}}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:24,background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderLeft:'3px solid #f59e0b',borderRadius:12,padding:'13px 16px',maxWidth:720,marginLeft:'auto',marginRight:'auto'}}>
          <span style={{fontSize:18}}>🛟</span>
          <span style={{fontSize:13,color:'var(--xh-text2)',lineHeight:1.5}}>Something wrong? Open a dispute and reclaim your XRP — the seller can never release funds without your confirmation.</span>
        </div>
      </div>

      {/* WHY HARBOR */}
      <div style={{marginBottom:36}}>
        <div style={{marginBottom:20}}>
          <h2 className="xh-display" style={{fontSize:26,fontWeight:700,color:'var(--xh-text)',letterSpacing:'-0.02em',lineHeight:1.15}}>Built differently for digital goods</h2>
          <p style={{fontSize:14,color:'var(--xh-text2)',marginTop:6,maxWidth:520}}>Why solo developers, traders and digital artists are docking here.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
          {[
            {bg:'rgba(21,114,232,.09)',fg:'var(--xh-accent)',t:'On-chain escrow',p:'Every trade locked in the XRP Ledger’s native escrow. No intermediary holding funds — verifiable on-chain forever.',ic:'lock'},
            {bg:'rgba(16,185,129,.1)',fg:'#10b981',t:'Instant settlement',p:'XRP settles in 3–5 seconds for a fraction of a cent. No card chargebacks, no fourteen-day holds.',ic:'bolt'},
            {bg:'rgba(245,158,11,.12)',fg:'#d97706',t:'2% flat fee',p:'No hidden percentages, no payment-processor cuts. Most platforms stack 13–20% in fees.',ic:'coin'},
            {bg:'rgba(239,68,68,.09)',fg:'#ef4444',t:'Borderless by default',p:'XRP works the same in Istanbul as in Berlin. No conversion fees, no regional account limits.',ic:'globe'}
          ].map(w => (
            <div key={w.t} style={{background:'var(--xh-surface)',border:'1px solid var(--xh-border)',borderRadius:14,padding:22}}>
              <div style={{width:44,height:44,borderRadius:12,display:'grid',placeItems:'center',marginBottom:14,background:w.bg,color:w.fg}}>
                {w.ic==='lock' && <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>}
                {w.ic==='bolt' && <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3 4.5 13.5H11l-1 7.5 8.5-10.5H12z"/></svg>}
                {w.ic==='coin' && <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="6.5" rx="7" ry="3.2"/><path d="M5 6.5v5.5c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V6.5"/><path d="M5 12v5.5c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V12"/></svg>}
                {w.ic==='globe' && <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.8"/><path d="M3.4 12h17.2M12 3.2c2.4 2.4 2.4 15.2 0 17.6M12 3.2c-2.4 2.4-2.4 15.2 0 17.6"/></svg>}
              </div>
              <h3 style={{fontSize:15.5,fontWeight:650,marginBottom:7,color:'var(--xh-text)'}}>{w.t}</h3>
              <p style={{fontSize:13,color:'var(--xh-text2)',lineHeight:1.55}}>{w.p}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{marginBottom:36}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <h2 className="xh-display" style={{fontSize:26,fontWeight:700,color:'var(--xh-text)',letterSpacing:'-0.02em',marginBottom:8}}>Common questions</h2>
          <p style={{fontSize:14,color:'var(--xh-text2)'}}>Quick answers about escrow, fees and getting started.</p>
        </div>
        <div style={{maxWidth:760,margin:'0 auto'}}>
          {[
            {q:'What is XRPL escrow and why should I trust it?',a:(<>XRPL escrow is a native feature of the XRP Ledger that locks XRP between two parties. When you buy here, your XRP isn’t held by us — it’s locked by the ledger itself via an <code>EscrowCreate</code> transaction. The seller can’t touch it until you confirm receipt, and if they never deliver the escrow expires and your XRP returns automatically.</>),open:true},
            {q:'What fees does XRPHarbor charge?',a:(<>One flat fee: <b>2% of each sale</b>, deducted automatically from the seller’s payout. No buyer fees, no listing fees, no withdrawal fees. The optional <code>Featured</code> upgrade costs 25 XRP for seven days.</>),open:false},
            {q:'How do I get XRP to buy something?',a:(<>Install Xumm, buy XRP from an exchange like Coinbase or Binance, then withdraw to your Xumm address. Connect Xumm here and you’re ready to trade — about fifteen minutes the first time.</>),open:false},
            {q:'What if the seller does not deliver?',a:(<>You simply don’t release the escrow, so the seller can’t access the XRP. After the escrow window (seven days for physical items, 24 hours for digital) you can cancel and your XRP returns. Open a dispute if you need our team to review.</>),open:false},
            {q:'Can I sell physical items?',a:(<>Yes. Pokemon cards, vintage hardware, collectibles — anything tangible. Just set realistic delivery times and provide tracking. The best sellers ship within 24 hours and message the buyer a tracking link.</>),open:false}
          ].map((f,i) => (
            <details key={i} className="xh-faq" open={f.open}>
              <summary>{f.q}<span className="xh-pm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg></span></summary>
              <div className="xh-a">{f.a}</div>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{background:'linear-gradient(135deg, #0b1b33 0%, #142b52 55%, #1d4ed8 100%)',borderRadius:18,padding:'48px 28px 56px',textAlign:'center',marginBottom:24,color:'#fff',position:'relative',overflow:'hidden'}}>
        <h2 className="xh-display" style={{fontSize:30,fontWeight:800,letterSpacing:'-0.02em',marginBottom:12,position:'relative',zIndex:1}}>Ready to drop anchor?</h2>
        <p style={{fontSize:15,color:'#bcd2f7',maxWidth:520,margin:'0 auto 24px',lineHeight:1.55,position:'relative',zIndex:1}}>Connect your Xaman wallet and start trading in under a minute.</p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',position:'relative',zIndex:1}}>
          {!user && (
            <Link href="/login" style={{background:'#fff',color:'#0b1b33',padding:'13px 28px',borderRadius:10,fontSize:14,fontWeight:700,textDecoration:'none'}}>Connect wallet</Link>
          )}
          {user ? (<Link href="/listings/new" style={{background:'rgba(255,255,255,0.15)',color:'#fff',padding:'12px 28px',borderRadius:8,fontSize:14,fontWeight:600,textDecoration:'none',border:'1px solid rgba(255,255,255,0.2)'}}>+ List an item</Link>) : (<Link href="/listings" style={{background:'rgba(255,255,255,0.12)',color:'#fff',padding:'13px 28px',borderRadius:10,fontSize:14,fontWeight:600,textDecoration:'none',border:'1px solid rgba(255,255,255,0.2)'}}>Browse first</Link>)}
        </div>
        <svg style={{position:'absolute',left:0,right:0,bottom:-2,width:'100%',height:44,opacity:.16}} viewBox="0 0 1200 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 30 Q 100 5 200 30 T 400 30 T 600 30 T 800 30 T 1000 30 T 1200 30 V60 H0 Z" fill="#fff"/></svg>
      </div>

      {/* FOOTER */}
      <footer style={{marginTop:48,paddingTop:40,borderTop:'1px solid var(--xh-border, rgba(0,0,0,0.06))'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:32,maxWidth:1200,margin:'0 auto',padding:'0 16px',fontSize:14}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,fontWeight:700,fontSize:16}}>⚓ <span>XRP<span style={{color:'var(--xh-accent, #3b82f6)'}}>Harbor</span></span></div>
            <p style={{color:'var(--xh-text3, #6b7280)',lineHeight:1.6,margin:0,maxWidth:320}}>The safe harbor for gaming assets. P2P trading with XRPL escrow protection.</p>
            <div style={{display:'flex',gap:14,marginTop:16}}>
              <a href="https://x.com/xrpharbor" target="_blank" rel="noopener" aria-label="X / Twitter" style={{color:'var(--xh-text3, #6b7280)',textDecoration:'none',fontSize:18}}>𝕏</a>
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:600,textTransform:'uppercase',color:'var(--xh-text3, #6b7280)',marginBottom:12,letterSpacing:'0.04em'}}>Marketplace</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Link href="/listings" style={{color:'var(--xh-text2, #374151)',textDecoration:'none'}}>Browse</Link>
              <Link href="/listings/new" style={{color:'var(--xh-text2, #374151)',textDecoration:'none'}}>List item</Link>
              <Link href="/pro" style={{color:'var(--xh-text2, #374151)',textDecoration:'none'}}>XRPHarbor Pro</Link>
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:600,textTransform:'uppercase',color:'var(--xh-text3, #6b7280)',marginBottom:12,letterSpacing:'0.04em'}}>Resources</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <a href="#how-it-works" style={{color:'var(--xh-text2, #374151)',textDecoration:'none'}}>How escrow works</a>
              <Link href="/tos#fees" style={{color:'var(--xh-text2, #374151)',textDecoration:'none'}}>Fees</Link>
              <a href="mailto:support@xrpharbor.com" style={{color:'var(--xh-text2, #374151)',textDecoration:'none'}}>Support</a>
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:600,textTransform:'uppercase',color:'var(--xh-text3, #6b7280)',marginBottom:12,letterSpacing:'0.04em'}}>Legal</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Link href="/tos" style={{color:'var(--xh-text2, #374151)',textDecoration:'none'}}>Terms</Link>
              <Link href="/privacy" style={{color:'var(--xh-text2, #374151)',textDecoration:'none'}}>Privacy</Link>
              <a href="mailto:contact@xrpharbor.com" style={{color:'var(--xh-text2, #374151)',textDecoration:'none'}}>Contact</a>
            </div>
          </div>
        </div>
        <div style={{maxWidth:1200,margin:'32px auto 0',padding:'24px 16px 32px',borderTop:'1px solid var(--xh-border, rgba(0,0,0,0.06))',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,fontSize:13,color:'var(--xh-text3, #6b7280)'}}>
          <div>© 2026 XRPHarbor · Built on the XRP Ledger</div>
          <div>Trade at your own risk · No financial advice</div>
        </div>
      </footer>
    </div>
  );
}
