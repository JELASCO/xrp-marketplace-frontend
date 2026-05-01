'use client';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import ListingCard from '../../components/ListingCard';

const GAMES=['CS2','Valorant','Fortnite','Roblox','Apex Legends','Minecraft','Call of Duty'];
const CATS=[{key:'',label:'All'},{key:'skin',label:'Skins'},{key:'coin',label:'Coins'},{key:'bp',label:'Battle Pass'},{key:'account',label:'Accounts'},{key:'physical',label:'Physical'},{key:'nft',label:'NFT'}];

export default function ListingsPage() {
  const [listings,setListings]=useState([]);
  const [loading,setLoading]=useState(true);
  const [category,setCategory]=useState('');
  const [game,setGame]=useState('');
  const [sort,setSort]=useState('created_at');
  const [q,setQ]=useState('');
  const [showSidebar,setShowSidebar]=useState(false);

  useEffect(()=>{
    if(typeof window!=='undefined'){
      const p=new URLSearchParams(window.location.search);
      if(p.get('q')) setQ(p.get('q'));
    }
  },[]);

  useEffect(()=>{
    setLoading(true);
    const params={sort,limit:48};
    if(category) params.category=category;
    if(game) params.game=game;
    api.listings.list(params)
      .then(data=>{const f=q?data.filter(l=>l.title.toLowerCase().includes(q.toLowerCase())):data;setListings(f);})
      .catch(()=>setListings([])).finally(()=>setLoading(false));
  },[category,game,sort,q]);

  return (
    <>
    <style>{`@media(max-width:640px){.lst-sidebar{display:none!important}.lst-sidebar.open{display:flex!important}.lst-toggle{display:flex!important}}`}</style>
      <div style={{display:'flex',gap:24}}>
      <button className="lst-toggle" onClick={()=>setShowSidebar(v=>!v)} style={{display:'none',alignItems:'center',gap:6,background:'#111620',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#e8eaf0',padding:'8px 14px',fontSize:13,cursor:'pointer',marginBottom:12}}>
        🔍 {showSidebar?'Hide':'Filters'}
      </button>
      <aside className={`lst-sidebar${showSidebar?' open':''}`} style={{width:190,flexShrink:0,display:'flex',flexDirection:'column',gap:20}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Category</div>
          {CATS.map(c=>(
            <button key={c.key} onClick={()=>setCategory(c.key)} style={{
              width:'100%',textAlign:'left',padding:'7px 10px',borderRadius:8,fontSize:13,cursor:'pointer',border:'none',marginBottom:2,transition:'all 0.15s',
              background:category===c.key?'rgba(59,130,246,0.12)':'transparent',
              color:category===c.key?'#60a5fa':'#8892a4',
            }}
              onMouseEnter={e=>{if(category!==c.key){e.currentTarget.style.background='#161c28';e.currentTarget.style.color='#e8eaf0';}}}
              onMouseLeave={e=>{if(category!==c.key){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#8892a4';}}}>
              {c.label}
            </button>
          ))}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Game</div>
          <select className="input" style={{fontSize:12}} value={game} onChange={e=>setGame(e.target.value)}>
            <option value="">All games</option>
            {GAMES.map(g=><option key={g}>{g}</option>)}
          </select>
        </div>
      </aside>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:16,fontWeight:700,color:'#e8eaf0'}}>Listings</span>
            <span style={{fontSize:12,color:'#4a5568'}}>{listings.length} results</span>
          </div>
          <select style={{background:'#111620',border:'1px solid rgba(255,255,255,0.08)',color:'#8892a4',borderRadius:8,padding:'6px 12px',fontSize:13,cursor:'pointer',outline:'none'}}
            value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="created_at">Newest</option>
            <option value="price_asc">Cheapest</option>
            <option value="price_desc">Most expensive</option>
          </select>
        </div>
        {q&&(
          <div style={{marginBottom:12,display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#8892a4'}}>
            Search: <strong style={{color:'#e8eaf0'}}>{q}</strong>
            <button onClick={()=>setQ('')} style={{background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:12}}>✕ Clear</button>
          </div>
        )}
        {loading?(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
            {Array.from({length:12}).map((_,i)=>(
              <div key={i} style={{background:'#111620',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)',height:210,animation:'pulse2 1.5s ease-in-out infinite'}}/>
            ))}
          </div>
        ):listings.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px',color:'#4a5568'}}>No listings found</div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
            {listings.map(l=><ListingCard key={l.id} listing={l}/>)}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
    </>
  );
