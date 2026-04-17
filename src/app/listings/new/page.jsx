'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';

const CATS=[{key:'skin',label:'Skins',emoji:'🎨'},{key:'coin',label:'Coins',emoji:'💰'},{key:'bp',label:'Battle Pass',emoji:'🏆'},{key:'account',label:'Accounts',emoji:'👤'},{key:'physical',label:'Physical',emoji:'📦'},{key:'nft',label:'NFT',emoji:'💎'}];
const GAMES=['CS2','Valorant','Fortnite','Roblox','Apex Legends','Minecraft','Call of Duty','Other'];

export default function NewListingPage() {
  const router=useRouter();
  const user=useAuthStore(s=>s.user);
  const [form,setForm]=useState({title:'',description:'',category:'skin',game:'CS2',priceXrp:'',images:[]});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  if(!user) return (
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:40,marginBottom:16}}>🔒</div>
      <div style={{fontSize:16,fontWeight:600,color:'#e8eaf0',marginBottom:8}}>Sign in required</div>
      <div style={{fontSize:13,color:'#8892a4'}}>Connect your Xumm wallet to list items.</div>
    </div>
  );

  const commission=form.priceXrp?(parseFloat(form.priceXrp)*0.97).toFixed(2):null;

  async function handleSubmit(e) {
    e.preventDefault();
    if(!form.title.trim()) return setError('Title is required');
    if(!form.priceXrp||parseFloat(form.priceXrp)<=0) return setError('Enter a valid price');
    setLoading(true);setError('');
    try {
      const l=await api.listings.create({...form,priceXrp:parseFloat(form.priceXrp)});
      router.push(`/listing/${l.id}`);
    } catch(e){setError(e.message);setLoading(false);}
  }

  return (
    <div style={{maxWidth:560,margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <Link href="/listings" style={{fontSize:13,color:'#4a5568',textDecoration:'none'}}>← Back to Listings</Link>
      </div>
      <h1 style={{fontSize:22,fontWeight:800,color:'#e8eaf0',marginBottom:4,letterSpacing:'-0.02em'}}>Create New Listing</h1>
      <p style={{fontSize:13,color:'#8892a4',marginBottom:24}}>List your game items and get paid in XRP.</p>
      <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'24px'}}>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:20}}>
          <div>
            <label className="label">Category</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {CATS.map(c=>(
                <button key={c.key} type="button" onClick={()=>setForm(f=>({...f,category:c.key}))}
                  style={{padding:'10px 8px',borderRadius:8,cursor:'pointer',transition:'all 0.15s',display:'flex',flexDirection:'column',alignItems:'center',gap:4,border:'none',
                    background:form.category===c.key?'rgba(59,130,246,0.15)':'#161c28',
                    outline:form.category===c.key?'1px solid rgba(59,130,246,0.4)':'1px solid rgba(255,255,255,0.06)'}}>
                  <span style={{fontSize:20}}>{c.emoji}</span>
                  <span style={{fontSize:12,fontWeight:500,color:form.category===c.key?'#60a5fa':'#8892a4'}}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div><label className="label">Title *</label><input className="input" placeholder="e.g. AWP Dragon Lore Factory New" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
          <div><label className="label">Game / Platform</label>
            <select className="input" value={form.game} onChange={e=>setForm(f=>({...f,game:e.target.value}))}>{GAMES.map(g=><option key={g}>{g}</option>)}</select></div>
          <div><label className="label">Description</label><textarea className="input" rows={3} placeholder="Describe your item..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{resize:'vertical'}}/></div>
          <div>
            <label className="label">Price (XRP) *</label>
            <div style={{position:'relative'}}>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={form.priceXrp} onChange={e=>setForm(f=>({...f,priceXrp:e.target.value}))} style={{paddingRight:50}}/>
              <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'#4a5568',fontWeight:600}}>XRP</span>
            </div>
            {commission&&<div style={{fontSize:12,color:'#4a5568',marginTop:5}}>~<span style={{color:'#10b981'}}>{commission} XRP</span> after 3% fee</div>}
          </div>
          <div><label className="label">Image URL <span style={{color:'#4a5568',fontWeight:400,textTransform:'none',fontSize:11}}>(optional)</span></label>
            <input className="input" placeholder="https://..." value={form.images[0]||''} onChange={e=>setForm(f=>({...f,images:e.target.value?[e.target.value]:[]}))}/>
          </div>
          {error&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#f87171'}}>{error}</div>}
          <button type="submit" disabled={loading} style={{background:loading?'#1a2440':'#3b82f6',color:'#fff',border:'none',borderRadius:10,padding:'12px',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer'}}>
            {loading?'Publishing...':'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}