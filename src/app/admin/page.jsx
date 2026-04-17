'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';

const TABS = ['dashboard','disputes','users'];

export default function AdminPage() {
  const user  = useAuthStore(s => s.user);
  const [tab,      setTab]      = useState('dashboard');
  const [stats,    setStats]    = useState(null);
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api.admin.stats().then(setStats).catch(()=>{});
    api.admin.disputes().then(setDisputes).catch(()=>{});
  }, [user]);

  if (!user || user.role !== 'admin') return (
    <div className="text-center py-16 text-gray-400">Admin access required.</div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Admin Panel</h1>

      <div className="flex gap-2 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition-colors ${tab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label:'Total users',     value: Number(stats.total_users).toLocaleString() },
              { label:'Active listings', value: Number(stats.active_listings).toLocaleString() },
              { label:'Completed orders',value: Number(stats.completed_orders).toLocaleString() },
              { label:'Total volume',    value: `${Number(stats.total_volume||0).toLocaleString()} XRP` },
              { label:'Commission earned',value:`${Number(stats.total_commission||0).toFixed(2)} XRP` },
              { label:'Open disputes',   value: Number(stats.open_disputes).toLocaleString() },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'disputes' && (
        <div className="space-y-3">
          {disputes.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No open disputes 🎉</p>
          ) : disputes.map(d => (
            <div key={d.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{d.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">Order: {d.order_id} · {Number(d.total_xrp).toLocaleString()} XRP</p>
                </div>
                <span className="badge-amber flex-shrink-0">Open</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => api.admin.resolveDispute(d.id,{decision:'refund_buyer'}).then(()=>api.admin.disputes().then(setDisputes))} className="btn-success btn-sm flex-1">
                  Refund buyer
                </button>
                <button onClick={() => api.admin.resolveDispute(d.id,{decision:'release_seller'}).then(()=>api.admin.disputes().then(setDisputes))} className="btn-outline btn-sm flex-1">
                  Release to seller
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="text-center py-8 text-gray-400 text-sm">
          User management — connect to backend to load users.
        </div>
      )}
    </div>
  );
}
