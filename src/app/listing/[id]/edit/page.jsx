'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../lib/store';
import { api } from '../../../../lib/api';

const CATEGORIES = ['skin','coin','bp','account','physical','nft'];
const CAT_LABELS = {skin:'Skin',coin:'Coin',bp:'Battle Pass',account:'Account',physical:'Physical',nft:'NFT'};
const GAMES = ['CS2','Valorant','Fortnite','Roblox','Minecraft','Apex Legends','Call of Duty','Other'];

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('skin');
  const [game, setGame] = useState('');
  const [priceXrp, setPriceXrp] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    api.listings.get(id).then(l => {
      if (l.seller_id !== user.id) { router.push('/listing/' + id); return; }
      setTitle(l.title || '');
      setDescription(l.description || '');
      setCategory(l.category || 'skin');
      setGame(l.game || '');
      setPriceXrp(String(l.price_xrp || ''));
      setImageUrl((l.images && l.images[0]) || '');
      setStatus(l.status || 'active');
    }).catch(() => router.push('/listing/' + id))
      .finally(() => setFetching(false));
  }, [id, user, loading]);

  const handleSave = async () => {
    setError(''); setSuccess(false);
    if (!title.trim()) { setError('Title required'); return; }
    if (!priceXrp || isNaN(priceXrp) || Number(priceXrp) <= 0) { setError('Valid price required'); return; }
    setSaving(true);
    try {
      await api.listings.update(id, {
        title: title.trim(),
        description: description.trim() || null,
        price_xrp: Number(priceXrp),
        status,
      });
      setSuccess(true);
      setTimeout(() => router.push('/listing/' + id), 1000);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const inputStyle = { background:'#0a0e1a', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'10px 12px', color:'#e8eaf0', fontSize:14, fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' };
  const labelStyle = { fontSize:12, fontWeight:600, color:'#8892a4', letterSpacing:'0.05em', textTransform:'uppercase' };

  if (loading || fetching) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'40vh'}}>
      <div style={{width:32,height:32,border:'2px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
  if (!user) return null;

  return (
    <div style={{maxWidth:560,margin:'0 auto'}}>
      <div style={{marginBottom:24,display:'flex',alignItems:'center',gap:12}}>
        <button onClick={() => router.push('/listing/' + id)} style={{background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:20,padding:0}}>&#8592;</button>
        <h1 style={{fontSize:20,fontWeight:700,color:'#e8eaf0',margin:0}}>Edit Listing</h1>
      </div>
      <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:28,display:'flex',flexDirection:'column',gap:20}}>

        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <label style={labelStyle}>Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} placeholder="Item title" style={inputStyle}/>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <label style={labelStyle}>Description</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="Describe your item..." style={{...inputStyle,resize:'vertical'}}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} style={{...inputStyle}}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={labelStyle}>Game</label>
            <select value={game} onChange={e=>setGame(e.target.value)} style={{...inputStyle}}>
              <option value="">Select game</option>
              {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={labelStyle}>Price (XRP)</label>
            <input value={priceXrp} onChange={e=>setPriceXrp(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" style={inputStyle}/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} style={{...inputStyle}}>
              <option value="active">Active</option>
              <option value="inactive">Inactive (hide)</option>
            </select>
          </div>
        </div>

        {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'10px 14px',color:'#f87171',fontSize:13}}>{error}</div>}
        {success && <div style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'10px 14px',color:'#34d399',fontSize:13}}>Saved!</div>}

        <button onClick={handleSave} disabled={saving} style={{background:saving?'#1a2030':'#3b82f6',color:saving?'#4a5568':'#fff',border:'none',borderRadius:10,padding:'12px',fontSize:14,fontWeight:600,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
