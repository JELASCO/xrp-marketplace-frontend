'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../lib/store';
import { api } from '../../../../lib/api';

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const [title, setTitle] = useState('');
  const [priceXrp, setPriceXrp] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    api.listings.get(id).then(l => {
      if (l.seller_id !== user.id) { router.push('/listing/' + id); return; }
      setTitle(l.title || '');
      setPriceXrp(String(l.price_xrp || ''));
      setDescription(l.description || '');
    }).catch(() => router.push('/listing/' + id));
  }, [id, user, loading]);

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Title required'); return; }
    setSaving(true);
    try {
      await api.listings.update(id, { title: title.trim(), description: description.trim() || null, price_xrp: Number(priceXrp) });
      router.push('/listing/' + id);
    } catch (e) {
      setError(e.message || 'Failed to save');
      setSaving(false);
    }
  };

  if (loading) return null;
  if (!user) return null;

  return (
    <div style={{maxWidth:480,margin:'0 auto',padding:'20px'}}>
      <h1 style={{color:'#e8eaf0',marginBottom:24}}>Edit Listing</h1>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div>
          <label style={{color:'#8892a4',fontSize:12,display:'block',marginBottom:4}}>TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={{width:'100%',background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px',color:'#e8eaf0',fontSize:14,boxSizing:'border-box'}} />
        </div>
        <div>
          <label style={{color:'#8892a4',fontSize:12,display:'block',marginBottom:4}}>PRICE (XRP)</label>
          <input value={priceXrp} onChange={e => setPriceXrp(e.target.value)} type="number" style={{width:'100%',background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px',color:'#e8eaf0',fontSize:14,boxSizing:'border-box'}} />
        </div>
        <div>
          <label style={{color:'#8892a4',fontSize:12,display:'block',marginBottom:4}}>DESCRIPTION</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{width:'100%',background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px',color:'#e8eaf0',fontSize:14,boxSizing:'border-box',resize:'vertical'}} />
        </div>
        {error && <div style={{color:'#f87171',fontSize:13}}>{error}</div>}
        <button onClick={handleSave} disabled={saving} style={{background:'#3b82f6',color:'#fff',border:'none',borderRadius:8,padding:'12px',fontSize:14,fontWeight:600,cursor:'pointer'}}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
