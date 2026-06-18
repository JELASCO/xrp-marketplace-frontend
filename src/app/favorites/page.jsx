'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import ListingCard from '../../components/ListingCard';
export default function FavoritesPage() {
  const user = useAuthStore(s => s.user);
  const hydrated = useAuthStore(s => s.hydrated);
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState(new Set());
  useEffect(() => { if (hydrated && !user) router.replace('/'); }, [hydrated, user]);
  useEffect(() => {
    if (!user) return;
    api.favorites.list().then(data => { setFavorites(data||[]); setFavIds(new Set((data||[]).map(l=>l.id))); }).catch(()=>{}).finally(()=>setLoading(false));
  }, [user]);
  const toggleFav = async (id) => { const n=new Set(favIds);n.delete(id);setFavIds(n);setFavorites(f=>f.filter(l=>l.id!==id));await api.favorites.remove(id).catch(()=>{}); };
  if (!user) return null;
  return (<div style={{maxWidth:1200,margin:'0 auto'}}><div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><span style={{fontSize:28}}>❤️</span><div><h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',margin:0}}>My Favorites</h1><span style={{fontSize:13,color:'var(--text3)'}}>{favorites.length} saved</span></div></div>{loading?(<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>{[...Array(8)].map((_,i)=><div key={i} style={{background:'var(--surface)',borderRadius:12,height:220,animation:'pulse2 1.5s infinite'}}/>)}<style>{'@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}'}</style></div>):favorites.length===0?(<div style={{textAlign:'center',padding:'60px 20px',background:'var(--surface)',borderRadius:14}}><div style={{fontSize:40,marginBottom:12}}>🤍</div><h2 style={{color:'var(--text)'}}>No favorites yet</h2><p style={{color:'var(--text3)',marginBottom:16}}>Browse listings and click ❤️ to save</p><a href="/listings" style={{background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'8px 16px'}}>Browse Listings</a></div>):(<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>{favorites.map(l=><ListingCard key={l.id} listing={l} isFavorited={true} onToggleFavorite={toggleFav}/>)}</div>)}</div>);
}
