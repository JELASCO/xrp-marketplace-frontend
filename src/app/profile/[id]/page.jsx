'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import ListingCard from '../../../components/ListingCard';

export default function ProfilePage() {
  const { id } = useParams();
  const currentUser = useAuthStore(s => s.user);
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');

    api.users.get(id)
      .then(u => {
        setUser(u);
        return api.listings.list({ seller_id: id, limit: 48 })
          .then(data => setListings(Array.isArray(data) ? data.filter(l => String(l.seller_id) === String(id)) : []))
          .catch(() => setListings([]));
      })
      .catch(e => setError(e.message || 'User not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'40vh',gap:12,flexDirection:'column'}}>
      <div style={{width:32,height:32,border:'2px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  if (error || !user) return (
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:40,marginBottom:12}}>👤</div>
      <div style={{fontSize:16,fontWeight:600,color:'#e8eaf0',marginBottom:6}}>User not found</div>
      <Link href="/listings" style={{color:'#3b82f6',fontSize:13}}>← Browse Listings</Link>
    </div>
  );

  const isOwn = currentUser && String(currentUser.id) === String(id);
  const initials = user.username ? user.username.slice(0,2).toUpperCase() : '??';

  return (
    <div style={{maxWidth:800,margin:'0 auto'}}>
      <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:'28px',marginBottom:24,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:'#fff',flexShrink:0}}>
          {initials}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:20,fontWeight:700,color:'#e8eaf0',marginBottom:4}}>{user.username}</div>
          <div style={{fontSize:12,color:'#4a5568',fontFamily:'monospace',marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.wallet_address}</div>
          <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
            {user.reputation_score > 0 && (
              <span style={{fontSize:13,color:'#f59e0b'}}>★ {Number(user.reputation_score).toFixed(1)} rating</span>
            )}
            {user.is_verified && (
              <span style={{fontSize:12,color:'#34d399',background:'rgba(16,185,129,0.1)',padding:'2px 8px',borderRadius:20}}>✓ Verified</span>
            )}
            <span style={{fontSize:12,color:'#4a5568'}}>{listings.length} listing{listings.length !== 1 ? 's' : ''}</span>
          </div>
          {user.bio && <div style={{fontSize:13,color:'#8892a4',marginTop:8}}>{user.bio}</div>}
        </div>
        {isOwn && (
          <Link href="/settings" style={{background:'#161c28',border:'1px solid rgba(255,255,255,0.08)',color:'#8892a4',borderRadius:8,padding:'8px 14px',fontSize:13,textDecoration:'none',flexShrink:0}}>
            Edit Profile
          </Link>
        )}
      </div>

      <div style={{marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h2 style={{fontSize:16,fontWeight:700,color:'#e8eaf0'}}>{isOwn ? 'My Listings' : user.username + "'s Listings"}</h2>
        {isOwn && (
          <Link href="/listings/new" style={{background:'#3b82f6',color:'#fff',borderRadius:8,padding:'7px 14px',fontSize:13,fontWeight:600,textDecoration:'none'}}>
            + New Listing
          </Link>
        )}
      </div>

      {listings.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px',background:'#111620',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontSize:32,marginBottom:8}}>📭</div>
          <div style={{fontSize:14,color:'#4a5568'}}>No active listings yet</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
          {listings.map(function(l) { return <ListingCard key={l.id} listing={l}/>; })}
        </div>
      )}
    </div>
  );
}
