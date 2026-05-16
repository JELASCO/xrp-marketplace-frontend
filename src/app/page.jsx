'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import ListingCard from '../components/ListingCard';
import { useAuthStore } from '../lib/store';

const CATS = [
  {key:'',label:'All',emoji:'🌐'},
  {key:'skin',label:'Skins',emoji:'🎨'},
  {key:'coin',label:'Coins',emoji:'💰'},
  {key:'bp',label:'Battle Pass',emoji:'🏆'},
  {key:'account',label:'Accounts',emoji:'👤'},
  {key:'physical',label:'Physical',emoji:'📦'},
];

const STATS_DEFAULT = [
  {label:'Verified Sellers',value:'—'},
  {label:'Items Traded',value:'—'},
  {label:'Volume (XRP)',value:'—'},
  {label:'Active Listings',value:'—'},
];

function SkeletonCard() {
  return (
    <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,overflow:'hidden'}}>
      <div style={{height:130,background:'#161c28',animation:'pulse2 1.5s ease-in-out infinite'}}/>
      <div style={{padding:'12px 14px'}}>
        <div style={{height:13,background:'#161c28',borderRadius:6,marginBottom:8,animation:'pulse2 1.5s ease-in-out infinite'}}/>
        <div style={{height:11,background:'#161c28',borderRadius:6,width:'60%',animation:'pulse2 1.5s ease-in-out infinite'}}/>
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
  const [category,setCategory] = useState('');
  const [sort,setSort] = useState('created_at');
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    setLoading(true);
    const params={sort,limit:24};
    if(category) params.category=category;
    api.listings.list(params).then(setListings).catch(()=>setListings([])).finally(()=>setLoading(false));
  },[category,sort]);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:32}}>
      <div style={{background:'linear-gradient(135deg,#0d1117 0%,#111620 50%,#0d1421 100%)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:16,padding:'32px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:240,height:240,background:'radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)',borderRadius:'50%'}}/>
        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:20}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:'#3b82f6',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Powered by XRP Ledger</div>
            <h1 style={{fontSize:28,fontWeight:800,color:'#e8eaf0',marginBottom:8,lineHeight:1.2,letterSpacing:'-0.02em'}}>The Secure P2P<br/>Game Marketplace</h1>
            <p style={{fontSize:14,color:'#8892a4',maxWidth:400,lineHeight:1.6,marginBottom:20}}>Buy and sell skins, coins, and game items with XRP Ledger escrow protection.</p>
            <form action="/listings" method="get" style={{display:'flex',gap:8,maxWidth:560,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:6,marginBottom:12}}>
              <input name="q" type="text" placeholder="Search skins, coins, accounts, games..." aria-label="Search listings" style={{flex:1,background:'transparent',border:'none',outline:'none',color:'#e8eaf0',fontSize:14,padding:'10px 14px',fontFamily:'inherit'}} />
              <button type="submit" style={{background:'#3b82f6',color:'#fff',border:'none',borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Search</button>
            </form>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center',fontSize:12,color:'#5b6370'}}>
              <span style={{marginRight:4}}>Popular:</span>
              <Link href="/listings?q=cs2" style={{color:'#8892a4',textDecoration:'none',padding:'3px 10px',background:'rgba(255,255,255,0.04)',borderRadius:999,fontSize:11.5}}>CS2 knives</Link>
              <Link href="/listings?q=valorant" style={{color:'#8892a4',textDecoration:'none',padding:'3px 10px',background:'rgba(255,255,255,0.04)',borderRadius:999,fontSize:11.5}}>Valorant skins</Link>
              <Link href="/listings?q=wow" style={{color:'#8892a4',textDecoration:'none',padding:'3px 10px',background:'rgba(255,255,255,0.04)',borderRadius:999,fontSize:11.5}}>WoW gold</Link>
              <Link href="/listings?q=fortnite" style={{color:'#8892a4',textDecoration:'none',padding:'3px 10px',background:'rgba(255,255,255,0.04)',borderRadius:999,fontSize:11.5}}>Fortnite accounts</Link>
            </div>
          </div>
          <div>
            {user ? (
              <Link href="/listings/new" style={{display:'inline-flex',alignItems:'center',gap:8,background:'#3b82f6',color:'#fff',textDecoration:'none',borderRadius:10,padding:'11px 20px',fontSize:14,fontWeight:600}}>
                + List an Item
              </Link>
            ) : (
              <div style={{fontSize:13,color:'#8892a4'}}>Connect Xumm to start trading</div>
            )}
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
        {STATS.map((s,i)=>(
          <div key={i} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'14px 18px',textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:800,color:'#e8eaf0',letterSpacing:'-0.02em'}}>{s.value}</div>
            <div style={{fontSize:11,color:'#4a5568',marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Supported Games */}
      <div style={{marginBottom:20,padding:'14px 16px',background:'#0d1218',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,display:'flex',alignItems:'center',gap:14,overflowX:'auto'}}>
        <div style={{fontSize:10,fontWeight:700,color:'#5b6370',textTransform:'uppercase',letterSpacing:'0.08em',flexShrink:0,paddingRight:14,borderRight:'1px solid rgba(255,255,255,0.08)'}}>Supported Games</div>
        {[
          {name:'CS2',color:'#f4900c',short:'CS'},
          {name:'Valorant',color:'#fd4556',short:'VL'},
          {name:'Fortnite',color:'#7c3aed',short:'FN'},
          {name:'Dota 2',color:'#dc2626',short:'D2'},
          {name:'Rocket League',color:'#0ea5e9',short:'RL'},
          {name:'WoW',color:'#f59e0b',short:'WoW'},
          {name:'LoL',color:'#10b981',short:'LoL'},
          {name:'Apex Legends',color:'#ef4444',short:'AP'},
          {name:'Minecraft',color:'#16a34a',short:'MC'},
        ].map(g=>(
          <a key={g.name} href={`/listings?q=${encodeURIComponent(g.name)}`} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'6px 12px',background:'#161c28',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,fontSize:12.5,fontWeight:600,color:'#e8eaf0',textDecoration:'none',flexShrink:0,transition:'all 0.15s'}}>
            <span style={{width:20,height:20,borderRadius:4,background:g.color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>{g.short}</span>
            {g.name}
          </a>
        ))}
      </div>
      <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4}}>
        {CATS.map(c=>(
          <button key={c.key} onClick={()=>setCategory(c.key)} style={{
            display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:20,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s',
            background:category===c.key?'rgba(59,130,246,0.15)':'#111620',
            color:category===c.key?'#60a5fa':'#8892a4',
            outline:category===c.key?'1px solid rgba(59,130,246,0.3)':'1px solid rgba(255,255,255,0.06)',
          }}>
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:16,fontWeight:700,color:'#e8eaf0'}}>{category?CATS.find(c=>c.key===category)?.label+' Listings':'All Listings'}</span>
            {!loading&&<span style={{fontSize:12,color:'#4a5568'}}>{listings.length} items</span>}
          </div>
          <select style={{background:'#111620',border:'1px solid rgba(255,255,255,0.08)',color:'#8892a4',borderRadius:8,padding:'6px 12px',fontSize:13,cursor:'pointer',outline:'none'}}
            value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="created_at">Newest first</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="views">Most Popular</option>
          </select>
        </div>

        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
            {Array.from({length:8}).map((_,i)=><SkeletonCard key={i}/>)}
          </div>
        ) : listings.length===0 ? (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:40,marginBottom:16}}>🏪</div>
            <div style={{fontSize:16,fontWeight:600,color:'#e8eaf0',marginBottom:8}}>No listings yet</div>
            <div style={{fontSize:13,color:'#8892a4',marginBottom:20}}>Be the first to list an item in this marketplace.</div>
            <Link href="/listings/new" style={{display:'inline-flex',background:'#3b82f6',color:'#fff',textDecoration:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:600}}>
              + Create First Listing
            </Link>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
            {listings.map((l,i)=>(
              <div key={l.id} className={`fade-up stagger-${Math.min(i%4+1,4)}`}>
                <ListingCard listing={l}/>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'28px 32px'}}>
        <div style={{fontSize:12,fontWeight:600,color:'#3b82f6',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>How it works</div>
        <h2 style={{fontSize:18,fontWeight:700,color:'#e8eaf0',marginBottom:20}}>Trade with confidence</h2>
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
                <span style={{fontSize:11,fontWeight:600,color:'#4a5568',fontFamily:'monospace'}}>{s.step}</span>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:'#e8eaf0'}}>{s.title}</div>
              <div style={{fontSize:13,color:'#8892a4',lineHeight:1.6}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'28px 24px',marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:600,color:'#3b82f6',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>FAQ</div>
        <h2 style={{fontSize:18,fontWeight:700,color:'#e8eaf0',marginBottom:20}}>Common questions</h2>
        <div style={{display:'flex',flexDirection:'column'}}>
          {[
            {q:'Is my XRP safe during a trade?',a:'Yes. When you buy, your XRP is locked in an on-chain escrow on the XRP Ledger — not held by XRPHarbor. Funds are only released to the seller when you confirm delivery. If the seller never delivers, the escrow can be cancelled and your XRP returns to your wallet.'},
            {q:"What happens if a seller doesn't deliver?",a:'Every order has a delivery deadline. If the seller does not fulfill within the agreed window, you can cancel the escrow and the XRP returns to your wallet automatically. Verified sellers carry trust scores so you can avoid risky listings.'},
            {q:'How are fees calculated?',a:'Sellers pay a 0.5% platform fee on completed trades. Buyers pay only the XRPL network fee (~0.0001 XRP per transaction). No hidden costs, no withdrawal fees, no FX markups.'},
            {q:'Do I need a credit card or bank account?',a:'No. XRPHarbor is XRP-native — you trade exclusively in XRP. Get XRP from any exchange (Coinbase, Bitstamp, Bitso, etc.), send it to your Xaman wallet, and you are ready to trade. No KYC, no banking.'},
            {q:'Which games and items are supported?',a:'All major titles — CS2, Valorant, Fortnite, Dota 2, Rocket League, WoW, LoL, and dozens more. Categories include skins, in-game currency, battle passes, accounts, CD keys, gift cards, and physical collectibles.'},
            {q:'How do disputes work?',a:'Disputes are reviewed by our moderation team alongside delivery proof and chat history. Because escrow is on-chain, funds stay locked until resolved. Most cases are settled within 24 hours. Repeat offenders are removed from the platform.'},
          ].map((item,i)=>(
            <details key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'14px 0',cursor:'pointer'}}>
              <summary style={{listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:14,fontWeight:600,color:'#e8eaf0',outline:'none'}}>
                <span>{item.q}</span>
                <span style={{fontSize:18,color:'#5b6370',marginLeft:12,flexShrink:0}}>+</span>
              </summary>
              <div style={{fontSize:13,color:'#8892a4',lineHeight:1.6,marginTop:10,paddingRight:24}}>{item.a}</div>
            </details>
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    
      {/* Footer */}
      <footer style={{textAlign:'center',padding:'32px 20px',marginTop:40,borderTop:'1px solid rgba(255,255,255,0.06)',color:'#4a5568',fontSize:12}}>
        <div style={{marginBottom:8}}>© 2025 XRPHarbor · P2P Game & Digital Items Marketplace</div>
        <div style={{display:'flex',gap:16,justifyContent:'center'}}>
          <a href="/tos" style={{color:'#4a5568',textDecoration:'none'}}>Terms of Service</a>
          <a href="/privacy" style={{color:'#4a5568',textDecoration:'none'}}>Privacy Policy</a>
        </div>
      </footer>
</div>
  );
}
