'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import ListingCard from '../components/ListingCard';
import { useAuthStore } from '../lib/store';

const CATS = [
  {key:'',label:'All',emoji:'🌐'},
  {key:'games',label:'Games',emoji:'🎮'},
  {key:'graphics',label:'Graphics & Art',emoji:'🎨'},
  {key:'software',label:'Software',emoji:'💻'},
  {key:'accounts',label:'Accounts',emoji:'👤'},
  {key:'other',label:'Other',emoji:'📦'},
];

const STATS_DEFAULT = [
  {label:'Verified Sellers',value:'—'},
  {label:'Items Traded',value:'—'},
  {label:'Volume (XRP)',value:'—'},
  {label:'Active Listings',value:'—'},
];

function SkeletonCard() {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
      <div style={{height:130,background:'var(--surface2)',animation:'pulse2 1.5s ease-in-out infinite'}}/>
      <div style={{padding:'12px 14px'}}>
        <div style={{height:13,background:'var(--surface2)',borderRadius:6,marginBottom:8,animation:'pulse2 1.5s ease-in-out infinite'}}/>
        <div style={{height:11,background:'var(--surface2)',borderRadius:6,width:'60%',animation:'pulse2 1.5s ease-in-out infinite'}}/>
      </div>
    </div>
  );
}

export default function HomePage() {
  // ---- THEME ----
  const [theme, setTheme] = useState('light'); // default white
  useEffect(() => {
    try {
      const t = localStorage.getItem('xrph-theme');
      if (t === 'light' || t === 'dark') setTheme(t);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('xrph-theme', theme); } catch {}
    // Apply on <html> so body + main + everything inherits the right CSS vars
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);
  const dark = theme === 'dark';

  // ---- DATA ----
  const [liveStats, setLiveStats] = useState(null);
  useEffect(() => {
    fetch('/api/stats').then(r=>r.json()).then(d=>{
      setLiveStats([
        {label:'Verified Sellers', value: String(d.verified_sellers||0)},
        {label:'Items Traded', value: String(d.items_traded||0)},
        {label:'Volume (XRP)', value: d.volume_xrp > 0 ? Math.round(d.volume_xrp).toLocaleString()+' XRP' : '0 XRP'},
        {label:'Active Listings', value: String(d.active_listings||0)},
      ]);
    }).catch(()=>{});
  }, []);
  const STATS = liveStats || STATS_DEFAULT;

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
      ).slice(0,8);
      setFeatured(f);
    }).catch(()=>{});
  },[]);

  return (
    <div data-theme={theme} className="xh-home">
      {/* Theme CSS — applied at html level via useEffect, so body + layout get the right vars too */}
      <style>{`
        html[data-theme="light"]{
          --bg:#FFFFFF;
          --bg2:#F8FAFD;
          --surface:#FFFFFF;
          --surface2:#F5F8FC;
          --text:#0A1628;
          --text2:#5B6B82;
          --text3:#8A98AD;
          --border:#E5EBF2;
          --border2:#D2DBE6;
          --tint:#F0F4FB;
        }
        html[data-theme="light"] body{
          background:#FFFFFF;
          color:#0A1628;
        }
        html[data-theme="light"] details summary span:last-child{color:var(--text3);}
        html[data-theme="dark"]{
          --tint:rgba(255,255,255,0.04);
        }
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>

      {/* Theme toggle — floating, top-right, away from layout's navbar */}
      <button
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        aria-label="Toggle theme"
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          position:'fixed', top:78, right:18, zIndex:40,
          width:38, height:38, borderRadius:10,
          background:'var(--surface)', border:'1px solid var(--border2)', color:'var(--text)',
          fontSize:16, cursor:'pointer',
          boxShadow:'0 4px 14px rgba(13,30,58,0.10)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'transform .15s',
        }}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'}
        onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      <div style={{display:'flex',flexDirection:'column',gap:32}}>
        <div style={{background:dark?'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 50%, var(--bg2) 100%)':'linear-gradient(135deg, #F8FAFD 0%, #EEF3F9 50%, #E1ECFA 100%)',border:'1px solid '+(dark?'rgba(59,130,246,0.15)':'rgba(21,114,232,0.18)'),borderRadius:16,padding:'32px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-60,right:-60,width:240,height:240,background:'radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)',borderRadius:'50%'}}/>
          <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Powered by XRP Ledger</div>
              <h1 style={{fontSize:28,fontWeight:800,color:'var(--text)',marginBottom:8,lineHeight:1.2,letterSpacing:'-0.02em'}}>The Secure P2P<br/>Game Marketplace</h1>
              <p style={{fontSize:14,color:'var(--text2)',maxWidth:400,lineHeight:1.6,marginBottom:20}}>Buy and sell skins, coins, and game items with XRP Ledger escrow protection.</p>
              <form action="/listings" method="get" style={{display:'flex',gap:8,maxWidth:560,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:6,marginBottom:12,boxShadow:dark?'none':'0 4px 14px rgba(13,30,58,0.06)'}}>
                <input name="q" type="text" placeholder="Search skins, coins, accounts, games..." aria-label="Search listings" style={{flex:1,background:'transparent',border:'none',outline:'none',color:'var(--text)',fontSize:14,padding:'10px 14px',fontFamily:'inherit'}} />
                <button type="submit" style={{background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Search</button>
              </form>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center',fontSize:12,color:'var(--text3)'}}>
                <span style={{marginRight:4}}>Popular:</span>
                <Link href="/listings?q=cs2" style={{color:'var(--text2)',textDecoration:'none',padding:'3px 10px',background:'var(--tint)',borderRadius:999,fontSize:11.5}}>CS2 knives</Link>
                <Link href="/listings?q=valorant" style={{color:'var(--text2)',textDecoration:'none',padding:'3px 10px',background:'var(--tint)',borderRadius:999,fontSize:11.5}}>Valorant skins</Link>
                <Link href="/listings?q=wow" style={{color:'var(--text2)',textDecoration:'none',padding:'3px 10px',background:'var(--tint)',borderRadius:999,fontSize:11.5}}>WoW gold</Link>
                <Link href="/listings?q=fortnite" style={{color:'var(--text2)',textDecoration:'none',padding:'3px 10px',background:'var(--tint)',borderRadius:999,fontSize:11.5}}>Fortnite accounts</Link>
              </div>
            </div>
            <div>
              {user ? (
                <Link href="/listings/new" style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:10,padding:'11px 20px',fontSize:14,fontWeight:600}}>
                  + List an Item
                </Link>
              ) : (
                <div style={{fontSize:13,color:'var(--text2)'}}>Connect Xumm to start trading</div>
              )}
            </div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
          {STATS.map((s,i)=>(
            <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 18px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em'}}>{s.value}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,marginBottom:8}}>
          {CATS.filter(c=>c.key).map(c=>(
            <Link key={c.key} href={'/listings?category='+c.key} style={{
              display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:20,fontSize:13,fontWeight:500,whiteSpace:'nowrap',textDecoration:'none',
              background:'var(--surface)',color:'var(--text2)',border:'1px solid var(--border)',
            }}>
              <span>{c.emoji}</span> {c.label}
            </Link>
          ))}
        </div>

        {featured.length > 0 && (
          <div style={{marginBottom:32}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <span style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>🔥 Featured Items</span>
              <span style={{fontSize:11,fontWeight:600,color:'#fbbf24',background:'rgba(245,158,11,0.12)',borderRadius:6,padding:'2px 8px'}}>Promoted</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
              {featured.map(l=>(
                <ListingCard key={l.id} listing={l}/>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
            <span style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>Latest Listings</span>
            <Link href="/listings" style={{fontSize:13,color:'var(--accent2)',textDecoration:'none',fontWeight:600}}>Browse all →</Link>
          </div>

          {loading ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
              {Array.from({length:8}).map((_,i)=><SkeletonCard key={i}/>)}
            </div>
          ) : listings.length===0 ? (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:40,marginBottom:16}}>🏪</div>
              <div style={{fontSize:16,fontWeight:600,color:'var(--text)',marginBottom:8}}>No listings yet</div>
              <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}>Be the first to list an item in this marketplace.</div>
              <Link href="/listings/new" style={{display:'inline-flex',background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:600}}>
                + Create First Listing
              </Link>
            </div>
          ) : (
            <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
              {listings.slice(0,8).map((l,i)=>(
                <div key={l.id} className={`fade-up stagger-${Math.min(i%4+1,4)}`}>
                  <ListingCard listing={l}/>
                </div>
              ))}
            </div>
            <div style={{textAlign:'center',marginTop:24}}>
              <Link href="/listings" style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',textDecoration:'none',borderRadius:10,padding:'11px 28px',fontSize:13,fontWeight:600}}>Browse all marketplace →</Link>
            </div>
            </>
          )}
        </div>

        {/* Sell on XRPHarbor */}
        <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'32px 28px',marginBottom:20,position:'relative',overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,alignItems:'center',position:'relative',zIndex:1}}>
            <div>
              <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:999,fontSize:11,fontWeight:600,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>For sellers</div>
              <h2 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:10,lineHeight:1.2,letterSpacing:'-0.02em'}}>Sell on XRPHarbor. <span style={{color:'var(--accent)'}}>Keep more of what you earn.</span></h2>
              <p style={{fontSize:13.5,color:'var(--text2)',lineHeight:1.6,marginBottom:18,maxWidth:380}}>List your items in 60 seconds. Get paid in XRP the moment escrow releases — no chargebacks, no holds, no platform delays.</p>
              {user ? (
                <Link href="/listings/new" style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'10px 18px',fontSize:13,fontWeight:600}}>+ List an Item</Link>
              ) : (
                <div style={{fontSize:12,color:'var(--text3)'}}>Connect Xumm to start selling</div>
              )}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                {t:'3% platform fee',d:'Just 1.5% for Pro sellers. Compare to 10-15% on traditional marketplaces.'},
                {t:'Instant XRP payout',d:'Funds hit your wallet in 3 seconds when buyer confirms delivery.'},
                {t:'Global buyers, zero borders',d:'195+ countries. No FX fees, no PayPal disputes, no bank holds.'},
              ].map((b,i)=>(
                <div key={i} style={{display:'flex',gap:12,padding:'12px 14px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10}}>
                  <div style={{width:28,height:28,borderRadius:7,background:'var(--accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14,fontWeight:700}}>{i+1}</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2}}>{b.t}</div>
                    <div style={{fontSize:11.5,color:'var(--text2)',lineHeight:1.5}}>{b.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'28px 32px'}}>
          <div style={{fontSize:12,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>How it works</div>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--text)',marginBottom:20}}>Trade with confidence</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:20}}>
            {[
              {step:'01',title:'Connect Wallet',desc:'Sign in with your Xumm wallet — no email or password needed.',icon:'⚡'},
              {step:'02',title:'Find an Item',desc:'Browse thousands of game items with verified sellers.',icon:'🔍'},
              {step:'03',title:'Lock in Escrow',desc:'Payment is locked in XRP Ledger escrow — fully on-chain.',icon:'🔒'},
              {step:'04',title:'Release & Complete',desc:'Confirm delivery to release payment. Dispute if needed.',icon:'✅'},
            ].map(s=>(
              <div key={s.step} style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:20}}>{s.icon}</span>
                  <span style={{fontSize:11,fontWeight:600,color:'var(--text3)',fontFamily:'monospace'}}>{s.step}</span>
                </div>
                <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{s.title}</div>
                <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'28px 24px',marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>FAQ</div>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--text)',marginBottom:20}}>Common questions</h2>
          <div style={{display:'flex',flexDirection:'column'}}>
            {[
              {q:'Is my XRP safe during a trade?',a:'Yes. When you buy, your XRP is locked in an on-chain escrow on the XRP Ledger — not held by XRPHarbor. Funds are only released to the seller when you confirm delivery. If the seller never delivers, the escrow can be cancelled and your XRP returns to your wallet.'},
              {q:"What happens if a seller doesn't deliver?",a:'Every order has a delivery deadline. If the seller does not fulfill within the agreed window, you can cancel the escrow and the XRP returns to your wallet automatically. Verified sellers carry trust scores so you can avoid risky listings.'},
              {q:'How are fees calculated?',a:'A small marketplace fee (3%) is taken from each completed trade — paid as a separate on-chain payment at checkout, so the seller receives the rest. Beyond that you only pay the tiny XRPL network fee (~0.0001 XRP per transaction). No hidden costs, no withdrawal fees, no FX markups.'},
              {q:'Do I need a credit card or bank account?',a:'No. XRPHarbor is XRP-native — you trade exclusively in XRP. Get XRP from any exchange (Coinbase, Bitstamp, Bitso, etc.), send it to your Xaman wallet, and you are ready to trade. No KYC, no banking.'},
              {q:'Which games and items are supported?',a:'All major titles — CS2, Valorant, Fortnite, Dota 2, Rocket League, WoW, LoL, and dozens more. Categories include games, graphics & art, software & tools, and accounts.'},
              {q:'How do disputes work?',a:'Disputes are reviewed by our moderation team alongside delivery proof and chat history. Because escrow is on-chain, funds stay locked until resolved. Most cases are settled within 24 hours. Repeat offenders are removed from the platform.'},
            ].map((item,i)=>(
              <details key={i} style={{borderBottom:'1px solid var(--border)',padding:'14px 0',cursor:'pointer'}}>
                <summary style={{listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:14,fontWeight:600,color:'var(--text)',outline:'none'}}>
                  <span>{item.q}</span>
                  <span style={{fontSize:18,color:'var(--text3)',marginLeft:12,flexShrink:0}}>+</span>
                </summary>
                <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginTop:10,paddingRight:24}}>{item.a}</div>
              </details>
            ))}
          </div>
        </div>

        <footer style={{textAlign:'center',padding:'32px 20px',marginTop:40,borderTop:'1px solid var(--border)',color:'var(--text3)',fontSize:12}}>
          <div style={{marginBottom:8}}>© 2026 XRPHarbor · P2P Game & Digital Items Marketplace</div>
          <div style={{display:'flex',gap:16,justifyContent:'center'}}>
            <a href="/tos" style={{color:'var(--text3)',textDecoration:'none'}}>Terms of Service</a>
            <a href="/privacy" style={{color:'var(--text3)',textDecoration:'none'}}>Privacy Policy</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import ListingCard from '../components/ListingCard';
import { useAuthStore } from '../lib/store';

const CATS = [
  {key:'',label:'All',emoji:'🌐'},
  {key:'games',label:'Games',emoji:'🎮'},
  {key:'graphics',label:'Graphics & Art',emoji:'🎨'},
  {key:'software',label:'Software',emoji:'💻'},
  {key:'accounts',label:'Accounts',emoji:'👤'},
  {key:'other',label:'Other',emoji:'📦'},
];

const STATS_DEFAULT = [
  {label:'Verified Sellers',value:'—'},
  {label:'Items Traded',value:'—'},
  {label:'Volume (XRP)',value:'—'},
  {label:'Active Listings',value:'—'},
];

function SkeletonCard() {
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
      <div style={{height:130,background:'var(--surface2)',animation:'pulse2 1.5s ease-in-out infinite'}}/>
      <div style={{padding:'12px 14px'}}>
        <div style={{height:13,background:'var(--surface2)',borderRadius:6,marginBottom:8,animation:'pulse2 1.5s ease-in-out infinite'}}/>
        <div style={{height:11,background:'var(--surface2)',borderRadius:6,width:'60%',animation:'pulse2 1.5s ease-in-out infinite'}}/>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [liveStats, setLiveStats] = useState(null);
  useEffect(() => {
    fetch('/api/stats').then(r=>r.json()).then(d=>{
      setLiveStats([
        {label:'Verified Sellers', value: String(d.verified_sellers||0)},
        {label:'Items Traded', value: String(d.items_traded||0)},
        {label:'Volume (XRP)', value: d.volume_xrp > 0 ? Math.round(d.volume_xrp).toLocaleString()+' XRP' : '0 XRP'},
        {label:'Active Listings', value: String(d.active_listings||0)},
      ]);
    }).catch(()=>{});
  }, []);
  const STATS = liveStats || STATS_DEFAULT;

  const user = useAuthStore(s=>s.user);
  const [listings,setListings] = useState([]);
  const [featured,setFeatured] = useState([]);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    setLoading(true);
    api.listings.list({sort:'created_at',limit:8}).then(setListings).catch(()=>setListings([])).finally(()=>setLoading(false));
  },[]);

  // Featured items (active, still within featured_until) — shown in a dedicated showcase
  useEffect(()=>{
    api.listings.list({limit:24}).then(items=>{
      const now = Date.now();
      const f = (Array.isArray(items)?items:[]).filter(l =>
        l.is_featured && l.featured_until && new Date(l.featured_until).getTime() > now && l.status === 'active'
      ).slice(0,8);
      setFeatured(f);
    }).catch(()=>{});
  },[]);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:32}}>
      <div style={{background:'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 50%, var(--bg2) 100%)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:16,padding:'32px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:240,height:240,background:'radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)',borderRadius:'50%'}}/>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Powered by XRP Ledger</div>
            <h1 style={{fontSize:28,fontWeight:800,color:'var(--text)',marginBottom:8,lineHeight:1.2,letterSpacing:'-0.02em'}}>The Secure P2P<br/>Game Marketplace</h1>
            <p style={{fontSize:14,color:'var(--text2)',maxWidth:400,lineHeight:1.6,marginBottom:20}}>Buy and sell skins, coins, and game items with XRP Ledger escrow protection.</p>
            <form action="/listings" method="get" style={{display:'flex',gap:8,maxWidth:560,background:'rgba(255,255,255,0.04)',border:'1px solid var(--border2)',borderRadius:12,padding:6,marginBottom:12}}>
              <input name="q" type="text" placeholder="Search skins, coins, accounts, games..." aria-label="Search listings" style={{flex:1,background:'transparent',border:'none',outline:'none',color:'var(--text)',fontSize:14,padding:'10px 14px',fontFamily:'inherit'}} />
              <button type="submit" style={{background:'var(--accent)',color:'#fff',border:'none',borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Search</button>
            </form>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center',fontSize:12,color:'#5b6370'}}>
              <span style={{marginRight:4}}>Popular:</span>
              <Link href="/listings?q=cs2" style={{color:'var(--text2)',textDecoration:'none',padding:'3px 10px',background:'rgba(255,255,255,0.04)',borderRadius:999,fontSize:11.5}}>CS2 knives</Link>
              <Link href="/listings?q=valorant" style={{color:'var(--text2)',textDecoration:'none',padding:'3px 10px',background:'rgba(255,255,255,0.04)',borderRadius:999,fontSize:11.5}}>Valorant skins</Link>
              <Link href="/listings?q=wow" style={{color:'var(--text2)',textDecoration:'none',padding:'3px 10px',background:'rgba(255,255,255,0.04)',borderRadius:999,fontSize:11.5}}>WoW gold</Link>
              <Link href="/listings?q=fortnite" style={{color:'var(--text2)',textDecoration:'none',padding:'3px 10px',background:'rgba(255,255,255,0.04)',borderRadius:999,fontSize:11.5}}>Fortnite accounts</Link>
            </div>
          </div>
          <div>
            {user ? (
              <Link href="/listings/new" style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:10,padding:'11px 20px',fontSize:14,fontWeight:600}}>
                + List an Item
              </Link>
            ) : (
              <div style={{fontSize:13,color:'var(--text2)'}}>Connect Xumm to start trading</div>
            )}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
        {STATS.map((s,i)=>(
          <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 18px',textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:800,color:'var(--text)',letterSpacing:'-0.02em'}}>{s.value}</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Supported Games section removed */}

      <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,marginBottom:8}}>
        {CATS.filter(c=>c.key).map(c=>(
          <Link key={c.key} href={'/listings?category='+c.key} style={{
            display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:20,fontSize:13,fontWeight:500,whiteSpace:'nowrap',textDecoration:'none',
            background:'var(--surface)',color:'var(--text2)',border:'1px solid var(--border)',
          }}>
            <span>{c.emoji}</span> {c.label}
          </Link>
        ))}
      </div>

      {featured.length > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <span style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>🔥 Featured Items</span>
            <span style={{fontSize:11,fontWeight:600,color:'#fbbf24',background:'rgba(245,158,11,0.12)',borderRadius:6,padding:'2px 8px'}}>Promoted</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
            {featured.map(l=>(
              <ListingCard key={l.id} listing={l}/>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
          <span style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>Latest Listings</span>
          <Link href="/listings" style={{fontSize:13,color:'var(--accent2)',textDecoration:'none',fontWeight:600}}>Browse all →</Link>
        </div>

        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
            {Array.from({length:8}).map((_,i)=><SkeletonCard key={i}/>)}
          </div>
        ) : listings.length===0 ? (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:40,marginBottom:16}}>🏪</div>
            <div style={{fontSize:16,fontWeight:600,color:'var(--text)',marginBottom:8}}>No listings yet</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}>Be the first to list an item in this marketplace.</div>
            <Link href="/listings/new" style={{display:'inline-flex',background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:600}}>
              + Create First Listing
            </Link>
          </div>
        ) : (
          <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
            {listings.slice(0,8).map((l,i)=>(
              <div key={l.id} className={`fade-up stagger-${Math.min(i%4+1,4)}`}>
                <ListingCard listing={l}/>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:24}}>
            <Link href="/listings" style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--surface)',border:'1px solid var(--border2)',color:'var(--text)',textDecoration:'none',borderRadius:10,padding:'11px 28px',fontSize:13,fontWeight:600}}>Browse all marketplace →</Link>
          </div>
          </>
        )}
      </div>

      {/* Sell on XRPHarbor */}
      <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:'32px 28px',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,alignItems:'center',position:'relative',zIndex:1}}>
          <div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:999,fontSize:11,fontWeight:600,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>For sellers</div>
            <h2 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:10,lineHeight:1.2,letterSpacing:'-0.02em'}}>Sell on XRPHarbor. <span style={{color:'var(--accent)'}}>Keep more of what you earn.</span></h2>
            <p style={{fontSize:13.5,color:'var(--text2)',lineHeight:1.6,marginBottom:18,maxWidth:380}}>List your items in 60 seconds. Get paid in XRP the moment escrow releases — no chargebacks, no holds, no platform delays.</p>
            {user ? (
              <Link href="/listings/new" style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'10px 18px',fontSize:13,fontWeight:600}}>+ List an Item</Link>
            ) : (
              <div style={{fontSize:12,color:'#5b6370'}}>Connect Xumm to start selling</div>
            )}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {t:'3% platform fee',d:'Just 1.5% for Pro sellers. Compare to 10-15% on traditional marketplaces.'},
              {t:'Instant XRP payout',d:'Funds hit your wallet in 3 seconds when buyer confirms delivery.'},
              {t:'Global buyers, zero borders',d:'195+ countries. No FX fees, no PayPal disputes, no bank holds.'},
            ].map((b,i)=>(
              <div key={i} style={{display:'flex',gap:12,padding:'12px 14px',background:'var(--surface2)',border:'1px solid rgba(255,255,255,0.04)',borderRadius:10}}>
                <div style={{width:28,height:28,borderRadius:7,background:'var(--accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14,fontWeight:700}}>{i+1}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2}}>{b.t}</div>
                  <div style={{fontSize:11.5,color:'var(--text2)',lineHeight:1.5}}>{b.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'28px 32px'}}>
        <div style={{fontSize:12,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>How it works</div>
        <h2 style={{fontSize:18,fontWeight:700,color:'var(--text)',marginBottom:20}}>Trade with confidence</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:20}}>
          {[
            {step:'01',title:'Connect Wallet',desc:'Sign in with your Xumm wallet — no email or password needed.',icon:'⚡'},
            {step:'02',title:'Find an Item',desc:'Browse thousands of game items with verified sellers.',icon:'🔍'},
            {step:'03',title:'Lock in Escrow',desc:'Payment is locked in XRP Ledger escrow — fully on-chain.',icon:'🔒'},
            {step:'04',title:'Release & Complete',desc:'Confirm delivery to release payment. Dispute if needed.',icon:'✅'},
          ].map(s=>(
            <div key={s.step} style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:20}}>{s.icon}</span>
                <span style={{fontSize:11,fontWeight:600,color:'var(--text3)',fontFamily:'monospace'}}>{s.step}</span>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{s.title}</div>
              <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'28px 24px',marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>FAQ</div>
        <h2 style={{fontSize:18,fontWeight:700,color:'var(--text)',marginBottom:20}}>Common questions</h2>
        <div style={{display:'flex',flexDirection:'column'}}>
          {[
            {q:'Is my XRP safe during a trade?',a:'Yes. When you buy, your XRP is locked in an on-chain escrow on the XRP Ledger — not held by XRPHarbor. Funds are only released to the seller when you confirm delivery. If the seller never delivers, the escrow can be cancelled and your XRP returns to your wallet.'},
            {q:"What happens if a seller doesn't deliver?",a:'Every order has a delivery deadline. If the seller does not fulfill within the agreed window, you can cancel the escrow and the XRP returns to your wallet automatically. Verified sellers carry trust scores so you can avoid risky listings.'},
            {q:'How are fees calculated?',a:'A small marketplace fee (3%) is taken from each completed trade — paid as a separate on-chain payment at checkout, so the seller receives the rest. Beyond that you only pay the tiny XRPL network fee (~0.0001 XRP per transaction). No hidden costs, no withdrawal fees, no FX markups.'},
            {q:'Do I need a credit card or bank account?',a:'No. XRPHarbor is XRP-native — you trade exclusively in XRP. Get XRP from any exchange (Coinbase, Bitstamp, Bitso, etc.), send it to your Xaman wallet, and you are ready to trade. No KYC, no banking.'},
            {q:'Which games and items are supported?',a:'All major titles — CS2, Valorant, Fortnite, Dota 2, Rocket League, WoW, LoL, and dozens more. Categories include games, graphics & art, software & tools, and accounts.'},
            {q:'How do disputes work?',a:'Disputes are reviewed by our moderation team alongside delivery proof and chat history. Because escrow is on-chain, funds stay locked until resolved. Most cases are settled within 24 hours. Repeat offenders are removed from the platform.'},
          ].map((item,i)=>(
            <details key={i} style={{borderBottom:'1px solid var(--border)',padding:'14px 0',cursor:'pointer'}}>
              <summary style={{listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:14,fontWeight:600,color:'var(--text)',outline:'none'}}>
                <span>{item.q}</span>
                <span style={{fontSize:18,color:'#5b6370',marginLeft:12,flexShrink:0}}>+</span>
              </summary>
              <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginTop:10,paddingRight:24}}>{item.a}</div>
            </details>
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    
      {/* Footer */}
      <footer style={{textAlign:'center',padding:'32px 20px',marginTop:40,borderTop:'1px solid var(--border)',color:'var(--text3)',fontSize:12}}>
        <div style={{marginBottom:8}}>© 2025 XRPHarbor · P2P Game & Digital Items Marketplace</div>
        <div style={{display:'flex',gap:16,justifyContent:'center'}}>
          <a href="/tos" style={{color:'var(--text3)',textDecoration:'none'}}>Terms of Service</a>
          <a href="/privacy" style={{color:'var(--text3)',textDecoration:'none'}}>Privacy Policy</a>
        </div>
      </footer>
</div>
  );
}
