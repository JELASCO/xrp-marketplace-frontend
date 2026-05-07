'use client';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import ListingCard from '../../components/ListingCard';
export default function FavoritesPage() {
  const user = useAuthStore(s => s.user);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState(new Set());
  useEffect(() => {
    if (!user) return;
    api.favorites.list().then(data => { setFavorites(data||[]); setFavIds(new Set((data||[]).map(l=>l.id))); }).catch(()=>{}).finally(()=>setLoading(false));
  }, [user]);
  const toggleFav = async (id) => { const n=new Set(favIds);n.delete(id);setFavIds(n);setFavorites(f=>f.filter(l=>l.id!==id));await api.favorites.remove(id).catch(()=>{}); };
  if (!user) return null;
  return (<div style={{maxWidth:1200,margin:'0 auto'}}><div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><span style={{fontSize:28}}>❤️</span><div><h1 style={{fontSize:22,fontWeight:700,color:'#e8eaf0',margin:0}}>My Favorites</h1><span style={{fontSize:13,color:'#4a5568'}}>{favorites.length} saved</span></div></div>{loading?(<div style={{textAlign:'center',padding:40,color:'#4a5568'}}>Loading...</div>):favorites.length===0?(<div style={{textAlign:'center',padding:'60px 20px',background:'#111620',borderRadius:14}}><div style={{fontSize:40,marginBottom:12}}>🤍</div><h2 style={{color:'#e8eaf0'}}>No favorites yet</h2><p style={{color:'#4a5568',marginBottom:16}}>Browse listings and click ❤️ to save</p><a href="/listings" style={{background:'#3b82f6',color:'#fff',textDecoration:'none',borderRadius:8,padding:'8px 16px'}}>Browse Listings</a></div>):(<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>{favorites.map(l=><ListingCard key={l.id} listing={l} isFavorited={true} onToggleFavorite={toggleFav}/>)}</div>)}</div>);
}
