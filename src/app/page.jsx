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
  {key:'nft',label:'NFT',emoji:'💎'},
];

const STATS = [
  {label:'Verified Sellers',value:'2,400+'},
  {label:'Items Traded',value:'18,000+'},
  {label:'Volume (XRP)',value:'580,000+'},
  {label:'Avg. Rating',value:'4.9 ★'},
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
            <p style={{fontSize:14,color:'#8892a4',maxWidth:400,lineHeight:1.6}}>Buy and sell skins, coins, and game items with XRP Ledger escrow protection.</p>
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
      <style>{`@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}