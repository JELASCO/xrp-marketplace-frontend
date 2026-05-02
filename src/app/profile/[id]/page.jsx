'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import ListingCard from '../../../components/ListingCard';

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  if (s < 2592000) return Math.floor(s/86400) + 'd ago';
  if (s < 31536000) return Math.floor(s/2592000) + 'mo ago';
  return Math.floor(s/31536000) + 'y ago';
}

function formatJoined(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function ProfilePage() {
  const { id } = useParams();
  const currentUser = useAuthStore(s => s.user);
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('listings');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.users.get(id),
      api.users.listings(id).catch(() => []),
      api.users.reviews(id).catch(() => [])
    ])
      .then(([u, ls, rv]) => {
        setUser(u);
        setListings(Array.isArray(ls) ? ls : []);
        setReviews(Array.isArray(rv) ? rv : []);
      })
      .catch(e => setError(e.message || 'User not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{maxWidth:800,margin:'0 auto'}}>
      <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:28,marginBottom:24,display:'flex',gap:20,alignItems:'center'}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'#161c28',animation:'pulse2 1.5s infinite'}}/>
        <div style={{flex:1}}>
          <div style={{height:18,width:140,background:'#161c28',borderRadius:6,marginBottom:8,animation:'pulse2 1.5s infinite'}}/>
          <div style={{height:12,width:200,background:'#161c28',borderRadius:6,animation:'pulse2 1.5s infinite'}}/>
        </div>
      </div>
      <style>{'@keyframes pulse2{0%,100%{opacity:1}50%{opacity:0.5}}'}</style>
    </div>
  );

  if (error || !user) return (
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:40,marginBottom:12}}>🤷</div>
      <div style={{fontSize:16,fontWeight:600,color:'#e8eaf0',marginBottom:6}}>User not found</div>
      <Link href="/listings" style={{color:'#3b82f6',fontSize:13}}>← Browse Listings</Link>
    </div>
  );

  const isOwn = currentUser && String(currentUser.id) === String(id);
  const initials = user.username ? user.username.slice(0, 2).toUpperCase() : '??';
  const avatar = user.avatar_url;
  const activeListings = listings.filter(l => l.status === 'active');
  const soldListings = listings.filter(l => l.status === 'sold');

  return (
    <div style={{maxWidth:800,margin:'0 auto'}}>
      {/* Header */}
      <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:28,marginBottom:24,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700,color:'#fff',flexShrink:0,overflow:'hidden'}}>
          {avatar ? <img src={avatar} alt={user.username} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e => { e.target.style.display = 'none'; }}/> : initials}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
            <span style={{fontSize:20,fontWeight:700,color:'#e8eaf0'}}>{user.username}</span>
            {user.is_verified && <span style={{fontSize:11,color:'#34d399',background:'rgba(16,185,129,0.1)',padding:'2px 8px',borderRadius:20}}>✓ Verified</span>}
          </div>
          <div style={{fontSize:12,color:'#4a5568',fontFamily:'monospace',marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.wallet_address}</div>
          {user.bio && <div style={{fontSize:13,color:'#8892a4',marginTop:4}}>{user.bio}</div>}
        </div>
        {isOwn && (
          <Link href="/settings" style={{background:'#161c28',border:'1px solid rgba(255,255,255,0.08)',color:'#8892a4',borderRadius:8,padding:'8px 14px',fontSize:13,textDecoration:'none',flexShrink:0}}>
            Edit Profile
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:24}}>
        <Stat label="Active" value={activeListings.length}/>
        <Stat label="Sold" value={soldListings.length}/>
        <Stat label="Rating" value={user.reputation_score > 0 ? Number(user.reputation_score).toFixed(1) + '★' : '—'}/>
        <Stat label="Reviews" value={reviews.length}/>
        <Stat label="Joined" value={formatJoined(user.created_at)}/>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(255,255,255,0.08)',marginBottom:16}}>
        {[{key:'listings',label:'Listings ('+listings.length+')'},{key:'reviews',label:'Reviews ('+reviews.length+')'}].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{padding:'10px 16px',background:'none',border:'none',borderBottom:tab===t.key?'2px solid #3b82f6':'2px solid transparent',color:tab===t.key?'#e8eaf0':'#8892a4',fontSize:13,fontWeight:tab===t.key?600:500,cursor:'pointer',marginBottom:-1}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'listings' && (
        listings.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px',background:'#111620',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{fontSize:32,marginBottom:8}}>📭</div>
            <div style={{fontSize:14,color:'#4a5568',marginBottom:isOwn?12:0}}>No listings yet</div>
            {isOwn && <Link href="/listings/new" style={{display:'inline-flex',background:'#3b82f6',color:'#fff',textDecoration:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:600}}>+ Create your first listing</Link>}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:12}}>
            {listings.map(l => <ListingCard key={l.id} listing={l}/>)}
          </div>
        )
      )}

      {tab === 'reviews' && (
        reviews.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px',background:'#111620',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{fontSize:32,marginBottom:8}}>💬</div>
            <div style={{fontSize:14,color:'#4a5568'}}>No reviews yet</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {reviews.map(r => (
              <div key={r.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16,display:'flex',gap:12,alignItems:'flex-start'}}>
                <Link href={'/profile/'+r.reviewer_id} style={{textDecoration:'none',flexShrink:0}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden'}}>
                    {r.reviewer_avatar ? <img src={r.reviewer_avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (r.reviewer_username || '??').slice(0,2).toUpperCase()}
                  </div>
                </Link>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                    <Link href={'/profile/'+r.reviewer_id} style={{fontSize:13,fontWeight:600,color:'#e8eaf0',textDecoration:'none'}}>{r.reviewer_username}</Link>
                    <span style={{fontSize:12,color:'#f59e0b'}}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                    <span style={{fontSize:11,color:'#4a5568'}}>{timeAgo(r.created_at)}</span>
                  </div>
                  {r.comment && <div style={{fontSize:13,color:'#8892a4',lineHeight:1.5}}>{r.comment}</div>}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'12px 14px',textAlign:'center'}}>
      <div style={{fontSize:18,fontWeight:700,color:'#e8eaf0',marginBottom:2}}>{value}</div>
      <div style={{fontSize:10,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</div>
    </div>
  );
}
