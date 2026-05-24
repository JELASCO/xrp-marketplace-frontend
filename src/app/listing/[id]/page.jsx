'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';

const CAT_COLORS = { games:{bg:'rgba(59,130,246,0.12)',color:'#60a5fa'}, graphics:{bg:'rgba(139,92,246,0.12)',color:'#a78bfa'}, software:{bg:'rgba(20,184,166,0.12)',color:'#2dd4bf'}, accounts:{bg:'var(--border)',color:'var(--text2)'}, other:{bg:'rgba(245,158,11,0.12)',color:'#fbbf24'} };
const CAT_LABELS = { games:'Games', graphics:'Graphics & Art', software:'Software', accounts:'Accounts', other:'Other' };
const GAME_EMOJIS = { 'CS2':'🔫','Valorant':'⚡','Fortnite':'🏗️','Roblox':'🎮','Minecraft':'⛏️','Apex Legends':'💀','Call of Duty':'💣' };
const STEPS = ['Awaiting payment','In escrow','Delivered','Completed'];

export default function ListingDetailPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [buying, setBuying] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMsg, setOfferMsg] = useState('');
  const [offerSent, setOfferSent] = useState(false);
  const [offerSending, setOfferSending] = useState(false);
  const [offerXumm, setOfferXumm] = useState(null);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [msgSent, setMsgSent] = useState(false);
  const [msgSending, setMsgSending] = useState(false);
  const [escrowStep, setEscrowStep] = useState(0);
  const [buyXumm, setBuyXumm] = useState(null);
  const [buyError, setBuyError] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  useEffect(() => {
    api.listings.get(id).then(setListing).catch(()=>{}).finally(()=>setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    api.orders.mine('buyer').then(orders => {
      const priority = { completed: 4, delivered: 3, escrow_locked: 2, in_escrow: 2, pending: 1 };
      const existing = (orders || []).filter(o => o.listing_id === id && o.status !== 'cancelled' && o.status !== 'disputed').sort((a, b) => (priority[b.status] || 0) - (priority[a.status] || 0))[0];
      if (existing) {
        setOrder(existing);
        const st = existing.status;
        if (st === 'pending') setEscrowStep(1);
        else if (st === 'escrow_locked' || st === 'in_escrow') setEscrowStep(2);
        else if (st === 'delivered') setEscrowStep(3);
        else if (st === 'completed') setEscrowStep(4);
      }
    }).catch(()=>{});
  }, [id, user]);

  const handleOffer=async()=>{if(!user||!listing||!offerAmount)return;setOfferSending(true);try{const res=await api.offers.send(listing.id,parseFloat(offerAmount),offerMsg.trim()||undefined);if(res.xumm){setOfferXumm(res.xumm);setOfferSent(true);}else{setOfferSent(true);setTimeout(()=>{setOfferSent(false);setShowOfferModal(false);},2000);}}catch(e){alert(e.message||'Failed');}finally{setOfferSending(false);}};const toggleFav=async()=>{if(!user)return;const n=!isFav;setIsFav(n);if(n)await api.favorites.add(listing.id).catch(()=>setIsFav(false));else await api.favorites.remove(listing.id).catch(()=>setIsFav(true));};const handleMessage=async()=>{if(!user||!listing||!msgInput.trim())return;setMsgSending(true);try{await api.contact.send(listing.id,msgInput.trim());setMsgSent(true);setMsgInput('');setTimeout(()=>{setMsgSent(false);setShowMsgModal(false);},2000);}catch(e){alert(e.message||'Failed');}finally{setMsgSending(false);}};async function handleBuy() {
    if (!user) return setBuyError('Please sign in first');
    setBuying(true); setBuyError('');
    try {
      const o = await api.orders.create(id);
      // Payment/escrow/sync all live on the orders page. Pass the order id so it auto-opens payment.
      router.push('/orders?pay=' + o.id);
    } catch(e) { setBuyError(e.message); setBuying(false); }
  }

  async function handleConfirm() {
    setBuying(true);
    setBuyError('');
    try {
      // /escrow/confirm returns Xumm payload {uuid, deepLink, qrUrl} for EscrowFinish
      const xp = await api.orders.confirm(order.id);
      setBuyXumm(xp);
      if (xp && xp.deepLink) {
        try { window.open(xp.deepLink, '_blank', 'noopener'); } catch(_) {}
      }
      // Poll escrow/status until backend syncs DB to completed (max 90s)
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://xrp-marketplace-backend-production.up.railway.app';
      const token = typeof window !== 'undefined' ? localStorage.getItem('xrpmarket_token') : null;
      const start = Date.now();
      let done = false;
      while (Date.now() - start < 90 * 1000) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          const res = await fetch(`${BACKEND}/api/orders/${order.id}/escrow/status`, { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          if (d.status === 'completed' || d.synced) {
            setEscrowStep(4);
            setBuyXumm(null);
            done = true;
            break;
          }
        } catch(_) {}
      }
      if (!done) {
        setBuyError('Sign timed out. If you signed in Xaman, refresh this page in a few seconds.');
        setBuyXumm(null);
      }
    } catch(e) { setBuyError(e.message); }
    finally { setBuying(false); }
  }

  async function handleReview() {
    try {
      await api.orders.review(order.id, { rating, comment: reviewComment });
      setReviewSubmitted(true);
    } catch(e) { setBuyError(e.message); }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) return;
    try {
      await api.orders.dispute(order.id, { reason: disputeReason });
      setDisputeSubmitted(true);
      setShowDispute(false);
    } catch(e) { setBuyError(e.message); }
  }

  if (loading) return <div style={{padding:32,color:'var(--text2)'}}>Loading...</div>;
  if (!listing) return <div style={{padding:32,color:'var(--text2)'}}>Listing not found</div>;

  const isSeller = user?.id === listing.seller_id;
  const cat = CAT_COLORS[listing.category] || CAT_COLORS.accounts;
  const emoji = GAME_EMOJIS[listing.game] || '🎮';
  const img = listing.images?.[0];
  const isSold = listing.status === 'sold';

  return (
    <div style={{maxWidth:960,margin:'0 auto',padding:'24px 16px'}}>
      <Link href="/" style={{color:'#a78bfa',textDecoration:'none',fontSize:14}}>← Back to marketplace</Link>
      <div className="listing-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,marginTop:24}}>
        <div>
          <div style={{background:'var(--surface)',borderRadius:12,overflow:'hidden',aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid var(--border)',position:'relative'}}>
            {img ? <img src={img} alt={listing.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:80}}>{emoji}</span>}
            {isSold && <div style={{position:'absolute',top:12,right:12,background:'rgba(239,68,68,0.9)',color:'#fff',fontWeight:700,fontSize:12,padding:'4px 10px',borderRadius:6}}>SOLD</div>}
          </div>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <span style={{padding:'4px 10px',borderRadius:6,fontSize:12,...cat}}>{CAT_LABELS[listing.category]||listing.category}</span>
            <span style={{padding:'4px 10px',borderRadius:6,fontSize:12,background:'var(--border)',color:'var(--text2)'}}>{emoji} {listing.game}</span>
          </div>
        </div>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,color:'var(--text)',margin:'0 0 8px'}}>{listing.title}</h1>
          <div style={{fontSize:32,fontWeight:800,color: isSold ? 'var(--text3)' : 'var(--text)',marginBottom:16,textDecoration: isSold ? 'line-through' : 'none'}}>{Number(listing.price_xrp).toLocaleString()} <span style={{fontSize:18,fontWeight:700,color:'#3b82f6'}}>XRP</span>{listing.quantity > 1 && listing.quantity_sold != null && !isSold && <span style={{fontSize:13,fontWeight:600,color:'var(--text3)',marginLeft:10}}>{Math.max(0, listing.quantity - listing.quantity_sold)} in stock</span>}</div>
          {listing.is_digital && <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:600,color:'#3b82f6',marginBottom:16}}>⚡ Instant delivery · content unlocks right after escrow payment</div>}
          {listing.description && <p style={{color:'var(--text2)',fontSize:14,lineHeight:1.6,marginBottom:20}}>{listing.description}</p>}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#fff',fontSize:14}}>{listing.username?.slice(0,2).toUpperCase()}</div>
            <div style={{flex:1}}><div style={{color:'var(--text)',fontWeight:600,fontSize:14}}>{listing.username}{listing.is_verified && <span style={{marginLeft:6,fontSize:11,background:'rgba(16,185,129,0.15)',color:'var(--green)',borderRadius:5,padding:'1px 6px',fontWeight:700}}>✓ Verified</span>}</div><div style={{color:'var(--text3)',fontSize:12}}>{listing.views} views</div></div>
            {listing.store_handle && <a href={'/store/'+listing.store_handle} style={{fontSize:13,fontWeight:600,color:'#3b82f6',textDecoration:'none',border:'1px solid rgba(59,130,246,0.3)',borderRadius:8,padding:'6px 12px',whiteSpace:'nowrap'}}>Visit store →</a>}
          </div>

          {!isSeller&&<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}><button onClick={toggleFav} disabled={!user} style={{flex:1,padding:'9px 12px',borderRadius:10,border:'1px solid '+(isFav?'rgba(248,113,113,0.5)':'rgba(255,255,255,0.08)'),background:isFav?'rgba(248,113,113,0.1)':'transparent',color:isFav?'#f87171':'var(--text2)',fontSize:13,fontWeight:600,cursor:user?'pointer':'not-allowed'}}>{isFav?'❤️ Saved':'🤍 Save'}</button>{user&&<button onClick={()=>setShowOfferModal(true)} style={{flex:1,padding:'9px 12px',borderRadius:10,border:'1px solid rgba(59,130,246,0.3)',background:'rgba(59,130,246,0.08)',color:'var(--accent)',fontSize:13,fontWeight:600,cursor:'pointer'}}>💰 Make Offer</button>}{user&&<button onClick={()=>setShowMsgModal(true)} style={{flex:1,padding:'9px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer'}}>💬 Message Seller</button>}</div>}
          {isSeller ? (
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{color:'var(--text2)',fontSize:13}}>This is your listing</span>
              <Link href={`/listing/${id}/edit`} style={{color:'#a78bfa',fontSize:13,textDecoration:'none'}}>✏️ Edit</Link>
            </div>
          ) : isSold && !order ? (
            <div style={{padding:'14px 16px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,color:'#f87171',fontWeight:600,textAlign:'center',fontSize:15}}>
              🔴 This item has been sold
            </div>
          ) : !order ? (
            <button onClick={handleBuy} disabled={buying} style={{width:'100%',padding:14,borderRadius:10,border:'none',background:buying?'var(--surface)':'linear-gradient(135deg,#3b82f6,#8b5cf6)',color:'#fff',fontSize:16,fontWeight:700,cursor:buying?'not-allowed':'pointer'}}>
              {buying?'Processing...':!user?'Sign in to buy':`Buy · ${listing.price_xrp} XRP`}
            </button>
          ) : (
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:16,textAlign:'center'}}>
              <div style={{color:'var(--text)',fontWeight:600,marginBottom:8}}>You have an order for this item</div>
              <div style={{color:'var(--text3)',fontSize:13,marginBottom:14}}>Track payment, release the escrow, confirm receipt, get your delivery and leave a review — all from your Orders page.</div>
              <Link href="/orders" style={{display:'block',padding:12,borderRadius:10,background:'var(--accent)',color:'#fff',textDecoration:'none',fontWeight:700,fontSize:14}}>Manage in Orders →</Link>
            </div>
          )}

          {buyError && (
            <div style={{marginTop:12,padding:'10px 12px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,color:'#f87171',fontSize:13}}>
              {buyError}
            </div>
          )}
        </div>
      </div>
    
      {showOfferModal&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowOfferModal(false)}><div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:14,padding:24,width:420,maxWidth:'100%'}} onClick={e=>e.stopPropagation()}><h3 style={{margin:'0 0 4px',color:'var(--text)',fontSize:16}}>💰 Make an Offer</h3><p style={{margin:'0 0 16px',color:'var(--text3)',fontSize:12}}>Listed at <strong style={{color:'var(--accent)'}}>{listing?.price_xrp} XRP</strong></p>{offerSent&&offerXumm?(<div style={{textAlign:'center'}}><div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:8}}>⚡ Complete Payment in Xumm</div><div style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>Scan the QR to lock escrow. Seller will review your offer.</div>{offerXumm.qrUrl&&<img src={offerXumm.qrUrl} style={{width:200,height:200,borderRadius:8,marginBottom:12}} alt="Xumm QR"/>}{offerXumm.deepLink&&<a href={offerXumm.deepLink} style={{background:'var(--accent)',color:'#fff',textDecoration:'none',borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:600,display:'inline-block',marginTop:4}}>Open in Xumm App</a>}</div>):offerSent?(<div style={{textAlign:'center',padding:'20px 0',color:'var(--green)',fontWeight:600}}>✅ Offer sent!</div>):(<><div style={{marginBottom:12}}><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Your offer (XRP)</label><input type="number" value={offerAmount} onChange={e=>setOfferAmount(e.target.value)} placeholder="e.g. 90.00" style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:14,fontWeight:700,boxSizing:'border-box'}}/></div><div style={{marginBottom:12}}><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Message (optional)</label><textarea value={offerMsg} onChange={e=>setOfferMsg(e.target.value)} placeholder="Why should they accept?" rows={2} style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,resize:'none',boxSizing:'border-box'}}/></div><div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button onClick={()=>setShowOfferModal(false)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Cancel</button><button onClick={handleOffer} disabled={!offerAmount||offerSending} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',opacity:!offerAmount||offerSending?0.5:1}}>{offerSending?'Sending...':'Send Offer'}</button></div></>)}</div></div>)}{showMsgModal&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowMsgModal(false)}><div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:14,padding:24,width:420,maxWidth:'100%'}} onClick={e=>e.stopPropagation()}><h3 style={{margin:'0 0 4px',color:'var(--text)',fontSize:16}}>💬 Message Seller</h3><p style={{margin:'0 0 16px',color:'var(--text3)',fontSize:12}}>{listing?.title}</p>{msgSent?(<div style={{textAlign:'center',padding:'20px 0',color:'var(--green)',fontWeight:600}}>✅ Sent!</div>):(<><textarea value={msgInput} onChange={e=>setMsgInput(e.target.value)} placeholder="Hi, I'm interested..." rows={4} style={{width:'100%',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:8,padding:10,color:'var(--text)',fontSize:13,resize:'vertical',boxSizing:'border-box',marginBottom:12}}/><div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button onClick={()=>setShowMsgModal(false)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Cancel</button><button onClick={handleMessage} disabled={!msgInput.trim()||msgSending} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',opacity:!msgInput.trim()||msgSending?0.5:1}}>{msgSending?'Sending...':'Send'}</button></div></>)}</div></div>)}


    {/* Similar Listings */}
    {similar.length > 0 && (
      <div style={{ maxWidth: 1100, margin: '32px auto 0' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Similar Listings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 12 }}>
          {similar.map(l => (
            <a key={l.id} href={'/listing/'+l.id} style={{ textDecoration: 'none', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'block', transition: 'border-color 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{ height: 120, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                {l.images?.[0] ? <img src={l.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={l.title}/> : '🎮'}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{Number(l.price_xrp).toLocaleString()} <span style={{fontSize:11,fontWeight:700,color:'#3b82f6'}}>XRP</span></div>
              </div>
            </a>
          ))}
        </div>
      </div>
    )}
</div>
  );
}
