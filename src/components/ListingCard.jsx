'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CAT_COLORS = {
  games:    {bg:'rgba(59,130,246,0.12)',color:'#60a5fa'},
  graphics: {bg:'rgba(139,92,246,0.12)',color:'#a78bfa'},
  software: {bg:'rgba(20,184,166,0.12)',color:'#2dd4bf'},
  accounts: {bg:'var(--border)',color:'var(--text2)'},
  other:    {bg:'rgba(245,158,11,0.12)',color:'#fbbf24'},
};
const CAT_LABELS = {games:'Games',graphics:'Graphics & Art',software:'Software',accounts:'Accounts',other:'Other'};
const GAME_EMOJIS = {};


export default function ListingCard({ listing, isFavorited, onToggleFavorite }) {
  const { id, title, category, game, price_xrp, images, is_featured, username, reputation_score, is_verified, store_handle, status, quantity, quantity_sold, seller_is_pro } = listing;
  const router = useRouter();
  const cat   = CAT_COLORS[category] || CAT_COLORS.accounts;
  const label = CAT_LABELS[category] || category;
  const stockLeft = (quantity != null && quantity_sold != null) ? Math.max(0, quantity - quantity_sold) : null;
  const soldOut = status === 'sold' || stockLeft === 0;
  const emoji = '';
  const goToStore = (e) => { e.preventDefault(); e.stopPropagation(); if (store_handle) router.push('/store/' + store_handle); };
  return (
    <Link href={`/listing/${id}`} style={{textDecoration:'none',display:'block'}}>
      <div style={{
        background:'var(--surface)',
        border: is_featured ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border)',
        borderRadius:12,overflow:'hidden',cursor:'pointer',transition:'all 0.2s',position:'relative',
      }}
        onMouseEnter={e=>{e.currentTarget.style.border='1px solid var(--border2)';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.4)';}}
        onMouseLeave={e=>{e.currentTarget.style.border=is_featured?'1px solid rgba(59,130,246,0.4)':'1px solid var(--border)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
        {onToggleFavorite && <button onClick={(e)=>{e.preventDefault();e.stopPropagation();onToggleFavorite(id);}} style={{position:'absolute',top:8,right:8,zIndex:10,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s'}} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}><span style={{fontSize:16,color:isFavorited?'#f87171':'var(--text2)'}}>{isFavorited?'♥':'♡'}</span></button>}
        <div style={{height:130,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
          {images?.[0] ? <img src={images[0]} alt={title} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:40}}>📦</span>}
          <div style={{position:'absolute',bottom:8,left:8,background:cat.bg,color:cat.color,borderRadius:20,padding:'2px 8px',fontSize:11,fontWeight:600}}>{label}</div>
          {is_featured && <div style={{position:'absolute',top:8,right:8,background:'rgba(245,158,11,0.2)',color:'#fbbf24',borderRadius:20,padding:'2px 8px',fontSize:11,fontWeight:600}}>★ Featured</div>}
          {soldOut && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{background:'#ef4444',color:'#fff',borderRadius:6,padding:'4px 12px',fontSize:13,fontWeight:700}}>SOLD OUT</span></div>}
        </div>
        <div style={{padding:'12px 14px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{game}{stockLeft != null && quantity > 1 && !soldOut ? ` · ${stockLeft} left` : ''}</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <span style={{fontSize:15,fontWeight:700,color:'var(--text)',whiteSpace:'nowrap'}}>{Number(price_xrp).toLocaleString()} <span style={{fontSize:11,fontWeight:700,color:'#3b82f6'}}>XRP</span></span>
            <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text3)',minWidth:0}}>
              <div onClick={store_handle ? goToStore : undefined} style={{width:18,height:18,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:700,color:'#fff',flexShrink:0,cursor:store_handle?'pointer':'default'}}>
                {username?.slice(0,2).toUpperCase()}
              </div>
              <span onClick={store_handle ? goToStore : undefined} style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:store_handle?'pointer':'default',color:store_handle?'#3b82f6':'var(--text3)'}}>{username}</span>
              {is_verified && <span title='Verified Seller' style={{fontSize:10,color:'var(--green)',fontWeight:700,flexShrink:0}}>✓</span>}
              {seller_is_pro && <span title='Pro Seller' style={{fontSize:9,fontWeight:700,color:'#fff',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',borderRadius:4,padding:'1px 4px',flexShrink:0}}>PRO</span>}
              {reputation_score > 0 && <span style={{color:'var(--amber)',flexShrink:0}}>★{Number(reputation_score).toFixed(1)}</span>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
