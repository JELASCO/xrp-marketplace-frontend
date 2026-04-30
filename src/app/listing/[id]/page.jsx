'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';

const CAT_COLORS = { skin:{bg:'rgba(139,92,246,0.12)',color:'#a78bfa'}, coin:{bg:'rgba(20,184,166,0.12)',color:'#2dd4bf'}, bp:{bg:'rgba(245,158,11,0.12)',color:'#fbbf24'}, account:{bg:'rgba(255,255,255,0.06)',color:'#8892a4'}, physical:{bg:'rgba(255,255,255,0.06)',color:'#8892a4'}, nft:{bg:'rgba(16,185,129,0.12)',color:'#34d399'} };
const CAT_LABELS = { skin:'Skin', coin:'Coin', bp:'Battle Pass', account:'Account', physical:'Physical', nft:'NFT' };
const GAME_EMOJIS = { 'CS2':'🔫','Valorant':'⚡','Fortnite':'🏗️','Roblox':'🎮','Minecraft':'⛏️','Apex Legends':'💀','Call of Duty':'💣' };
const STEPS = ['Awaiting payment','In escrow','Delivered','Completed'];

export default function ListingDetailPage({ params }) {
  const { id } = params;
  const user = useAuthStore(s => s.user);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [buying, setBuying] = useState(false);
  const [escrowStep, setEscrowStep] = useState(0);
  const [buyError, setBuyError] = useState('');

  useEffect(() => {
    api.listings.get(id).then(setListing).catch(()=>{}).finally(()=>setLoading(false));
  }, [id]);

  async function handleBuy() {
    if (!user) return setBuyError('Please sign in first');
    setBuying(true); setBuyError('');
    try {
      const o = await api.orders.create(id);
      setOrder(o); setEscrowStep(1);
      setTimeout(()=>setEscrowStep(2), 1500);
    } catch(e) { setBuyError(e.message); }
    finally { setBuying(false); }
  }

  async function handleConfirm() {
    setBuying(true);
    try { await api.orders.confirm(order.id); setEscrowStep(4); }
    catch(e) { setBuyError(e.message); }
    finally { setBuying(false); }
  }

  async function handleReview() {
    try {
      await api.orders.review(order.id, { rating, comment });
      setReviewSent(true);
    } catch(e) { setReviewError(e.message); }
  }

  if (loading) return <div style={{padding:32,color:'#8892a4'}}>Loading...</div>;
  if (!listing) return <div style={{padding:32,color:'#8892a4'}}>Listing not found</div>;

  const isSeller = user?.id === listing.seller_id;
  const cat = CAT_COLORS[listing.category] || CAT_COLORS.account;
  const emoji = GAME_EMOJIS[listing.game] || '🎮';
  const img = listing.images?.[0];

  return (
    <div style={{maxWidth:960,margin:'0 auto',padding:'24px 16px'}}>
      <Link href="/" style={{color:'#a78bfa',textDecoration:'none',fontSize:14}}>← Back to marketplace</Link>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,marginTop:24}}>
        <div>
          <div style={{background:'#111620',borderRadius:12,overflow:'hidden',aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.06)'}}>
            {img ? <img src={img} alt={listing.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:80}}>{emoji}</span>}
          </div>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <span style={{padding:'4px 10px',borderRadius:6,fontSize:12,...cat}}>{CAT_LABELS[listing.category]||listing.category}</span>
            <span style={{padding:'4px 10px',borderRadius:6,fontSize:12,background:'rgba(255,255,255,0.06)',color:'#8892a4'}}>{emoji} {listing.game}</span>
          </div>
        </div>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,color:'#e8eaf0',margin:'0 0 8px'}}>{listing.title}</h1>
          <div style={{fontSize:32,fontWeight:800,color:'#10b981',marginBottom:16}}>{listing.price_xrp} XRP</div>
          {listing.description && <p style={{color:'#8892a4',fontSize:14,lineHeight:1.6,marginBottom:20}}>{listing.description}</p>}
          <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#fff',fontSize:14}}>{listing.username?.slice(0,2).toUpperCase()}</div>
            <div><div style={{color:'#e8eaf0',fontWeight:600,fontSize:14}}>{listing.username}</div><div style={{color:'#4a5568',fontSize:12}}>{listing.views} views</div></div>
          </div>
          {listing.status === 'sold' && !order ? (
            <div style={{padding:'14px',borderRadius:10,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',textAlign:'center',color:'#f87171',fontWeight:700,fontSize:16}}>
              🏷️ This item has been sold
            </div>
          ) : isSeller ? (
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{color:'#8892a4',fontSize:13}}>This is your listing</span>
              <Link href={`/listing/${id}/edit`} style={{color:'#a78bfa',fontSize:13,textDecoration:'none'}}>✏️ Edit</Link>
            </div>
          ) : !order ? (
            <button onClick={handleBuy} disabled={buying} style={{width:'100%',padding:14,borderRadius:10,border:'none',background:buying?'#1e293b':'linear-gradient(135deg,#3b82f6,#8b5cf6)',color:'#fff',fontSize:16,fontWeight:700,cursor:buying?'not-allowed':'pointer'}}>
              {buying?'Processing...':!user?'Sign in to buy':`Buy · ${listing.price_xrp} XRP`}
            </button>
          ) : (
            <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:16}}>
              <div style={{color:'#e8eaf0',fontWeight:600,marginBottom:12}}>Order Progress</div>
              {STEPS.map((step,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <div style={{width:24,height:24,borderRadius:'50%',border:`2px solid ${i<escrowStep?'#10b981':i===escrowStep?'#3b82f6':'#2d3748'}`,background:i<escrowStep?'#10b981':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:i<escrowStep?'#fff':i===escrowStep?'#3b82f6':'#4a5568',fontWeight:700}}>{i<escrowStep?'✓':i+1}</div>
                  <span style={{color:i<escrowStep?'#10b981':i===escrowStep?'#3b82f6':'#4a5568',fontSize:13}}>{step}</span>
                </div>
              ))}
              {escrowStep===2 && <button onClick={handleConfirm} disabled={buying} style={{marginTop:8,width:'100%',padding:10,borderRadius:8,border:'none',background:buying?'#065f46':'#10b981',color:'#fff',fontWeight:700,cursor:buying?'not-allowed':'pointer'}}>{buying?'Confirming...':'Confirm Receipt'}</button>}
              {escrowStep>=4 && <div style={{marginTop:12,padding:'10px 12px',background:'rgba(16,185,129,0.1)',border:'1px solid #10b981',borderRadius:8,color:'#10b981',fontWeight:600,textAlign:'center'}}>✅ Order Completed!</div>}
              {escrowStep>=4 && !reviewSent && (
                <div style={{marginTop:16,background:'#0d1117',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:16}}>
                  <div style={{color:'#e8eaf0',fontWeight:600,marginBottom:10,fontSize:14}}>Rate this seller</div>
                  <div style={{display:'flex',gap:6,marginBottom:10}}>
                    {[1,2,3,4,5].map(s=>(
                      <button key={s} onClick={()=>setRating(s)} style={{background:'none',border:'none',cursor:'pointer',fontSize:24,opacity:s<=rating?1:0.3,transition:'opacity .15s'}}>★</button>
                    ))}
                  </div>
                  <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Leave a comment (optional)" rows={3} style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 10px',color:'#e8eaf0',fontSize:13,resize:'vertical',boxSizing:'border-box'}}/>
                  {reviewError && <div style={{color:'#f87171',fontSize:12,marginTop:6}}>{reviewError}</div>}
                  <button onClick={handleReview} style={{marginTop:10,width:'100%',padding:'10px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:14}}>Submit Review</button>
                </div>
              )}
              {reviewSent && <div style={{marginTop:12,padding:'10px 12px',background:'rgba(16,185,129,0.1)',border:'1px solid #10b981',borderRadius:8,color:'#10b981',fontSize:13,textAlign:'center'}}>⭐ Thanks for your review!</div>}
            </div>
          )}
          {buyError && <div style={{marginTop:12,padding:'10px 12px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,color:'#f87171',fontSize:13}}>{buyError}</div>}
        </div>
      </div>
    </div>
  );
}
