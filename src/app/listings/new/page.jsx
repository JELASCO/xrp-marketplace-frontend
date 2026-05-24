'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';

const IMGBB_KEY = 'd9c8b5dfc9a388958e85b58d7668d78e'; // free public demo key — replace with your own from imgbb.com
const CATS=[{key:'games',label:'Games',emoji:'🎮'},{key:'graphics',label:'Graphics & Art',emoji:'🎨'},{key:'software',label:'Software & Tools',emoji:'💻'},{key:'accounts',label:'Accounts',emoji:'👤'},{key:'other',label:'Other',emoji:'📦'}];
const GAMES = ['CS2','Valorant','Fortnite','Roblox','Apex Legends','Minecraft','Call of Duty','Other'];
const TITLE_MAX=120;
const DESC_MAX=2000;

async function uploadToImgbb(file) {
  const fd = new FormData();
  fd.append('image', file);
  fd.append('key', IMGBB_KEY);
  const r = await fetch('https://api.imgbb.com/1/upload', { method:'POST', body: fd });
  const d = await r.json();
  if (!d.success) throw new Error('Upload failed');
  return d.data.url;
}

export default function NewListingPage() {
  const router  = useRouter();
  const user    = useAuthStore(s => s.user);
  const fileRef = useRef(null);
  const [form,     setForm]     = useState({ title:'', description:'', category:'games', game:'CS2', priceXrp:'', images:[], isDigital:false, digitalContent:'', digitalLink:'', quantity:'', deliveryTime:'', tags:[] });
  const [tagInput, setTagInput] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [uploading,setUploading]= useState(false);
  const [preview,  setPreview]  = useState(null);
  const [error,    setError]    = useState('');

  if (!user) return (
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:40,marginBottom:16}}>🔒</div>
      <div style={{fontSize:16,fontWeight:600,color:'var(--text)',marginBottom:8}}>Sign in required</div>
      <div style={{fontSize:13,color:'var(--text2)'}}>Connect your Xumm wallet to list items.</div>
    </div>
  );

  const sellerReceives = form.priceXrp ? (parseFloat(form.priceXrp) * 0.97).toFixed(6) : null;

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 6 - form.images.length;
    if (remaining <= 0) { setError('You can upload up to 6 images'); return; }
    const toUpload = files.slice(0, remaining);
    for (const file of toUpload) {
      if (file.size > 5 * 1024 * 1024) { setError('Each image must be under 5MB'); continue; }
    }
    setUploading(true);
    setError('');
    try {
      for (const file of toUpload) {
        if (file.size > 5 * 1024 * 1024) continue;
        const url = await uploadToImgbb(file);
        setForm(f => ({ ...f, images: [...f.images, url] }));
        setPreview(url);
      }
    } catch(err) {
      setError('Image upload failed. Try again or use fewer images.');
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  function removeImage(idx) {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    if (!form.priceXrp || parseFloat(form.priceXrp) <= 0) return setError('Enter a valid price');
    setLoading(true); setError('');
    try {
      const l = await api.listings.create({ ...form, priceXrp: parseFloat(form.priceXrp) });
      router.push('/listing/' + l.id);
    } catch(err) { setError(err.message); setLoading(false); }
  }

  return (
    <div style={{maxWidth:560,margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <Link href="/listings" style={{fontSize:13,color:'var(--text3)',textDecoration:'none'}}>← Back to Listings</Link>
      </div>
      <h1 style={{fontSize:22,fontWeight:800,color:'var(--text)',marginBottom:4,letterSpacing:'-0.02em'}}>Create New Listing</h1>
      <p style={{fontSize:13,color:'var(--text2)',marginBottom:24}}>List your game items and get paid in XRP.</p>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'24px'}}>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:20}}>

          <div>
            <label className="label">Category</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {CATS.map(c => (
                <button key={c.key} type="button" onClick={() => setForm(f => ({...f, category:c.key}))}
                  style={{padding:'10px 8px',borderRadius:8,cursor:'pointer',transition:'all 0.15s',display:'flex',flexDirection:'column',alignItems:'center',gap:4,border:'none',
                    background: form.category===c.key ? 'rgba(59,130,246,0.15)' : 'var(--surface2)',
                    outline: form.category===c.key ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border)'}}>
                  <span style={{fontSize:20}}>{c.emoji}</span>
                  <span style={{fontSize:12,fontWeight:500,color:form.category===c.key?'var(--accent2)':'var(--text2)'}}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div><label className="label">Title *</label>
            <input className="input" placeholder="e.g. AWP Dragon Lore Factory New" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
          </div>

          <div><label className="label">Game / Platform</label>
            <select className="input" value={form.game} onChange={e=>setForm(f=>({...f,game:e.target.value}))}>
              {GAMES.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>

          <div><label className="label">Description</label>
            <textarea className="input" rows={3} placeholder="Describe your item..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{resize:'vertical'}}/>
          </div>

          <div>
            <label className="label">Price (XRP) *</label>
            <div style={{position:'relative'}}>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={form.priceXrp} onChange={e=>setForm(f=>({...f,priceXrp:e.target.value}))} style={{paddingRight:50}}/>
              <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'var(--text3)',fontWeight:600}}>XRP</span>
            </div>
            {sellerReceives && <div style={{fontSize:12,color:'var(--text3)',marginTop:5}}>You'll receive <span style={{color:'var(--green)'}}>{sellerReceives} XRP</span> after 3% platform fee</div>}
          </div>

          <div>
            <label className="label">Quantity in stock</label>
            <input className="input" type="number" step="1" min="1" placeholder="1" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))}/>
            <div style={{fontSize:12,color:'var(--text3)',marginTop:5}}>How many of this item you have. Leave blank for 1. Each sale reduces stock; the listing shows "Sold out" only when stock reaches 0.</div>
          </div>

          <div>
            <label className="label">Delivery time <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',fontSize:11}}>(optional)</span></label>
            <select className="input" value={form.deliveryTime} onChange={e=>setForm(f=>({...f,deliveryTime:e.target.value}))}>
              <option value="">Select…</option>
              <option value="instant">Instant (automatic)</option>
              <option value="1h">Within 1 hour</option>
              <option value="24h">Within 24 hours</option>
              <option value="1-3d">1–3 days</option>
            </select>
          </div>

          <div>
            <label className="label">Tags <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',fontSize:11}}>(optional, up to 8)</span></label>
            <div style={{display:'flex',gap:8}}>
              <input className="input" value={tagInput} onChange={e=>setTagInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); const v=tagInput.trim().toLowerCase(); if(v && form.tags.length<8 && !form.tags.includes(v)) setForm(f=>({...f,tags:[...f.tags,v]})); setTagInput(''); } }}
                placeholder="Type a tag and press Enter"/>
            </div>
            {form.tags.length > 0 && (
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                {form.tags.map((t,i)=>(
                  <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:20,padding:'3px 10px',fontSize:12,color:'var(--text2)'}}>
                    #{t}
                    <button type="button" onClick={()=>setForm(f=>({...f,tags:f.tags.filter((_,j)=>j!==i)}))} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',padding:0,fontSize:13}}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Product Images <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',fontSize:11}}>(up to 6, first is the cover)</span></label>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handleFileChange}/>
            {form.images.length > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:8}}>
                {form.images.map((url, i) => (
                  <div key={i} style={{position:'relative',aspectRatio:'1',borderRadius:8,overflow:'hidden',border: i===0 ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)'}}>
                    <img src={url} alt={'image '+(i+1)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    {i===0 && <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(59,130,246,0.85)',color:'#fff',fontSize:10,fontWeight:600,textAlign:'center',padding:'2px 0'}}>COVER</div>}
                    <button type="button" onClick={()=>removeImage(i)}
                      style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.6)',color:'#fff',border:'none',borderRadius:'50%',width:22,height:22,cursor:'pointer',fontSize:11}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {form.images.length < 6 && (
              <button type="button" onClick={()=>fileRef.current&&fileRef.current.click()} disabled={uploading}
                style={{width:'100%',padding:'10px',background:'var(--surface2)',border:'1px dashed rgba(255,255,255,0.15)',borderRadius:8,color:uploading?'var(--text3)':'var(--text2)',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {uploading ? '⏳ Uploading...' : `📁 Add image${form.images.length ? 's' : ''} (max 5MB each)`}
              </button>
            )}
          </div>

          <div style={{border:'1px solid var(--border)',borderRadius:10,padding:14,background:'var(--surface)'}}>
            <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
              <input type="checkbox" checked={form.isDigital} onChange={e=>setForm(f=>({...f,isDigital:e.target.checked}))} style={{width:18,height:18,cursor:'pointer'}}/>
              <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>Digital product — instant delivery</span>
            </label>
            <div style={{fontSize:12,color:'var(--text3)',marginTop:6,marginLeft:28}}>Buyer automatically receives the content below once payment is secured in escrow. Hidden from everyone until then.</div>
            {form.isDigital && (
              <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:12}}>
                <div>
                  <label className="label">Delivery content <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',fontSize:11}}>(CD key, account login, code…)</span></label>
                  <textarea className="input" rows={3} placeholder="e.g. Steam key: XXXXX-XXXXX-XXXXX" value={form.digitalContent} onChange={e=>setForm(f=>({...f,digitalContent:e.target.value}))} style={{resize:'vertical',fontFamily:'monospace',fontSize:13}}/>
                </div>
                <div>
                  <label className="label">Download link <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',fontSize:11}}>(optional URL)</span></label>
                  <input className="input" type="url" placeholder="https://drive.google.com/..." value={form.digitalLink} onChange={e=>setForm(f=>({...f,digitalLink:e.target.value}))}/>
                </div>
              </div>
            )}
          </div>

          {error && <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#f87171'}}>{error}</div>}

          <button type="submit" disabled={loading||uploading}
            style={{background:loading?'var(--surface)':'var(--accent)',color:'#fff',border:'none',borderRadius:10,padding:'12px',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer'}}>
            {loading ? 'Publishing...' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
