'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import clsx from 'clsx';

const STATUS = {
  pending:       { label:'Pending',      cls:'badge-gray'   },
  escrow_locked: { label:'In Escrow',    cls:'badge-blue'   },
  delivered:     { label:'Delivered',    cls:'badge-blue'   },
  completed:     { label:'Completed',    cls:'badge-green'  },
  disputed:      { label:'Disputed',     cls:'badge-amber'  },
  refunded:      { label:'Refunded',     cls:'badge-gray'   },
  cancelled:     { label:'Cancelled',    cls:'badge-gray'   },
};

const STEPS = ['Awaiting payment','In escrow','Delivered','Completed'];
const STEP_IDX = { pending:0, escrow_locked:1, delivered:2, completed:3 };

export default function OrdersPage() {
  const user    = useAuthStore(s => s.user);
  const [role,   setRole]   = useState('buyer');
  const [orders, setOrders] = useState([]);
  const [loading,setLoading]= useState(true);
  const [open,   setOpen]   = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.orders.mine(role).then(setOrders).catch(()=>setOrders([])).finally(()=>setLoading(false));
  }, [user, role]);

  if (!user) return <div className="text-center py-16 text-gray-400">Please sign in to view orders.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Orders</h1>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button onClick={() => setRole('buyer')}  className={clsx('px-4 py-1.5', role==='buyer'  ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>Purchases</button>
          <button onClick={() => setRole('seller')} className={clsx('px-4 py-1.5', role==='seller' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>Sales</button>
        </div>
      </div>

      {loading && <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse"/>)}</div>}

      {!loading && orders.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-3">No orders yet.</p>
          <Link href="/listings" className="btn-primary btn-sm">Start shopping</Link>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(order => {
          const st  = STATUS[order.status] || { label: order.status, cls: 'badge-gray' };
          const exp = open === order.id;
          const stepIdx = STEP_IDX[order.status] || 0;

          return (
            <div key={order.id} className="card p-0 overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(exp ? null : order.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{order.listing_title || 'Item'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-semibold text-sm">{Number(order.total_xrp).toLocaleString()} XRP</span>
                  <span className={st.cls}>{st.label}</span>
                  <span className="text-gray-300 text-xs">{exp ? '▲' : '▼'}</span>
                </div>
              </button>

              {exp && (
                <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-4">
                  {/* Escrow steps */}
                  {!['cancelled','pending'].includes(order.status) && (
                    <div className="flex items-center">
                      {STEPS.map((s,i) => (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2',
                              i < stepIdx ? 'bg-green-500 border-green-500 text-white' :
                              i === stepIdx ? 'bg-blue-600 border-blue-600 text-white' :
                              'bg-white border-gray-200 text-gray-400')}>
                              {i < stepIdx ? '✓' : i+1}
                            </div>
                            <span className={clsx('text-xs whitespace-nowrap hidden sm:block',
                              i === stepIdx ? 'text-blue-600 font-medium' : i < stepIdx ? 'text-green-600' : 'text-gray-400')}>
                              {s}
                            </span>
                          </div>
                          {i < STEPS.length-1 && <div className={clsx('flex-1 h-0.5 mx-1', i < stepIdx ? 'bg-green-400' : 'bg-gray-200')}/>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div><span className="text-gray-400">Order ID</span><p className="font-mono text-gray-700 mt-0.5 truncate">{order.id}</p></div>
                    <div><span className="text-gray-400">Amount</span><p className="text-gray-700 mt-0.5">{Number(order.total_xrp).toLocaleString()} XRP</p></div>
                    {order.commission_xrp && <div><span className="text-gray-400">Fee</span><p className="text-gray-700 mt-0.5">{Number(order.commission_xrp).toFixed(4)} XRP</p></div>}
                    {order.escrow_tx_hash && <div><span className="text-gray-400">TX Hash</span><p className="font-mono text-gray-700 mt-0.5 truncate">{order.escrow_tx_hash}</p></div>}
                  </div>

                  {/* Buyer confirm action */}
                  {order.status === 'escrow_locked' && role === 'buyer' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => api.orders.confirm(order.id).then(()=>api.orders.mine(role).then(setOrders))}
                        className="btn-success flex-1 text-sm"
                      >
                        ✓ Received — Release payment
                      </button>
                      <button
                        onClick={() => api.orders.dispute(order.id,{reason:'Issue with order'}).then(()=>api.orders.mine(role).then(setOrders))}
                        className="btn-danger text-sm"
                      >
                        ⚠ Dispute
                      </button>
                    </div>
                  )}

                  {/* Review CTA */}
                  {order.status === 'completed' && role === 'buyer' && (
                    <Link href={`/orders/${order.id}/review`} className="btn-outline w-full justify-center text-sm block text-center">
                      Leave a review
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
