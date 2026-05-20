'use client';
import Link from 'next/link';

const CAT_COLORS = {
  skin:    {bg:'rgba(139,92,246,0.12)',color:'#a78bfa'},
  coin:    {bg:'rgba(20,184,166,0.12)',color:'#2dd4bf'},
  bp:      {bg:'rgba(245,158,11,0.12)',color:'#fbbf24'},
  account: {bg:'var(--border)',color:'var(--text2)'},
  physical:{bg:'var(--border)',color:'var(--text2)'},
  nft:     {bg:'rgba(16,185,129,0.12)',color:'#34d399'},
};
const CAT_LABELS = {skin:'Skin',coin:'Coin',bp:'Battle Pass',account:'Account',physical:'Physical',nft:'NFT',key:'Key',item:'Item',bundle:'Bundle',template:'Template',art:'Art',ebook:'Ebook',audio:'Audio',software:'Software'};
const GAME_EMOJIS = {'CS2':'ð«','Valorant':'â¡','Fortnite':'ð','Roblox':'ð®','Minecraft':'âï¸','Apex Legends':'ð¯','Call of Duty':'ðª'};

export default function ListingCard({ listing, isFavorited, onToggleFavorite }) {
  const { id, title, category, game, price_xrp, images, is_featured, username, reputation_score, is_verified } = listing;
  const cat   = CAT_COLORS[category] || CAT_COLORS.account;
  const label = CAT_LABELS[category] || category;
  const emoji = GAME_EMOJIS[game] || 'ð®';

  return (
    <Link href={`/listing/${id}`} style={{textDecoration:'none',display:'block'}}>
      <div style={{
        background:'var(--surface)',
        border: is_featured ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border)',
        borderRadius:12,overflow:'hidden',cursor:'pointer',transition:'all 0.2s',position:'relative',
      }}
        onMouseEnter={e=>{e.currentTarget.style.border='1px solid var(--border2)';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.4)';}}
        onMouseLeave={e=>{e.currentTarget.style.border=is_featured?'1px solid rgba(59,130,246,0.4)':'1px solid var(--border)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
        {onToggleFavorite && <button onClick={(e)=>{e.preventDefault();e.stopPropagation();onToggleFavorite(id);}} style={{position:'absolute',top:8,right:8,zIndex:10,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s'}} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}><span style={{fontSize:16,color:isFavorited?'#f87171':'var(--text2)'}}>{isFavorited?'â¤ï¸':'ð¤'}</span></button>}
        <div style={{height:130,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
          {images?.[0] ? <img src={images[0]} alt={title} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:40}}>{emoji}</span>}
          <div style={{position:'absolute',bottom:8,left:8,background:cat.bg,color:cat.color,borderRadius:20,padding:'2px 8px',fontSize:11,fontWeight:600}}>{label}</div>
          {is_featured && <div style={{position:'absolute',top:8,right:8,background:'rgba(245,158,11,0.2)',color:'#fbbf24',borderRadius:20,padding:'2px 8px',fontSize:11,fontWeight:600}}>â Featured</div>}
        </div>
        <div style={{padding:'12px 14px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:10}}>{game}</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <span style={{fontSize:22,fontWeight:600,color:'var(--text)'}}>{Number(price_xrp).toLocaleString()} XRP</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text3)'}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:700,color:'#fff'}}>
                {username?.slice(0,2).toUpperCase()}
              </div>
              <span style={{maxWidth:70,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{username}{is_verified && <span title='Verified Seller' style={{marginLeft:4,fontSize:10,background:'rgba(16,185,129,0.15)',color:'var(--green)',borderRadius:4,padding:'1px 4px',fontWeight:700}}>â</span>}{is_verified && <span title='Verified Seller' style={{marginLeft:4,fontSize:10,background:'rgba(16,185,129,0.15)',color:'var(--green)',borderRadius:4,padding:'1px 4px',fontWeight:700,letterSpacing:'0.02em'}}>â Verified</span>}</span>
              {reputation_score > 0 && <span style={{color:'var(--amber)'}}>â{Number(reputation_score).toFixed(1)}</span>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
