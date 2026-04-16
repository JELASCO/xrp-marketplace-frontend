'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';

const CATS  = ['skin','coin','bp','account','physical','nft'];
const GAMES = ['CS2','Valorant','Fortnite','Roblox','Apex Legends','Minecraft','Call of Duty','Other'];

export default function NewListingPage() {
  const router = useRouter();
  const user   = useAuthStore(s => s.user);
  const [form, setForm] = useState({ title:'', description:'', category:'skin', game:'CS2', priceXrp:'', images:[] });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  if (!user) return (
    <div className="text-center py-16 text-gray-400">
      <p className="mb-3">Sign in to list items</p>
    </div>
  );

  const commission = form.priceXrp ? (parseFloat(form.priceXrp) * 0.97).toFixed(2) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim())    return setError('Title is required');
    if (!form.priceXrp)        return setError('Price is required');
    if (parseFloat(form.priceXrp) <= 0) return setError('Enter a valid price');
    setLoading(true); setError('');
    try {
      const listing = await api.listings.create({ ...form, priceXrp: parseFloat(form.priceXrp) });
      router.push(`/listing/${listing.id}`);
    } catch(e) { setError(e.message); setLoading(false); }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Create New Listing</h1>
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f=>({...f,category:c}))}
                  className={`py-2 px-3 rounded-xl text-sm border transition-colors capitalize ${form.category===c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {c === 'bp' ? 'Battle Pass' : c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="e.g. AWP Dragon Lore Factory New" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
          </div>
          <div>
            <label className="label">Game / Platform</label>
            <select className="input" value={form.game} onChange={e => setForm(f=>({...f,game:e.target.value}))}>
              {GAMES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} placeholder="Describe your item..." value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} />
          </div>
          <div>
            <label className="label">Price (XRP) *</label>
            <div className="relative">
              <input className="input pr-14" type="number" step="0.01" min="0.01" placeholder="0.00" value={form.priceXrp} onChange={e => setForm(f=>({...f,priceXrp:e.target.value}))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">XRP</span>
            </div>
            {commission && <p className="text-xs text-gray-400 mt-1">You will receive ~{commission} XRP (after 3% fee)</p>}
          </div>
          <div>
            <label className="label">Image URL (optional)</label>
            <input className="input" placeholder="https://..." value={form.images[0]||''} onChange={e => setForm(f=>({...f,images:e.target.value?[e.target.value]:[]}))} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? 'Publishing...' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
