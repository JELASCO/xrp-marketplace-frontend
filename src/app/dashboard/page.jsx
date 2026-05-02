'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/'); return; }
    setLoadingStats(true);
    api.users.myStats()
      .then(setStats)
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoadingStats(false));
  }, [user, loading]);

  if (loading || !user) return null;

  return (
    <div style={{maxWidth:880,margin:'0 auto'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:800,color:'#e8eaf0',letterSpacing:'-0.02em',marginBottom:4}}>Dashboard</h1>
        <p style={{fontSize:13,color:'#8892a4'}}>Your sales, listings, and reputation at a glance.</p>
      </div>

      {error && (
        <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',color:'#f87171',borderRadius:10,padding:'12px 16px',fontSize:13,marginBottom:16}}>{error}</div>
      )}

      {/* Top primary KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:24}}>
        <Kpi
          label="Total revenue"
          value={loadingStats ? null : (stats ? stats.totalRevenueXrp.toFixed(2) + ' XRP' : '—')}
          accent="#10b981"
          sub={stats ? `from ${stats.completedSales} sale${stats.completedSales!==1?'s':''}` : null}
        />
        <Kpi label="Avg rating" value={loadingStats ? null : (stats && stats.reviewCount > 0 ? stats.avgRating.toFixed(2) + ' ★' : '—')} accent="#f59e0b" sub={stats ? `${stats.reviewCount} review${stats.reviewCount!==1?'s':''}` : null}/>
        <Kpi label="Active listings" value={loadingStats ? null : (stats ? stats.activeListings : '—')} accent="#3b82f6"/>
        <Kpi label="In escrow" value={loadingStats ? null : (stats ? stats.inEscrow : '—')} accent="#60a5fa" sub={stats && stats.inEscrow > 0 ? 'awaiting release' : null}/>
      </div>

      {/* Secondary stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:24}}>
        <SmallStat label="Sold listings" value={stats ? stats.soldListings : '—'}/>
        <SmallStat label="Completed sales" value={stats ? stats.completedSales : '—'}/>
        <SmallStat label="Purchases" value={stats ? stats.completedPurchases : '—'}/>
        <SmallStat label="Open disputes" value={stats ? stats.openDisputes : '—'} alert={stats && stats.openDisputes > 0}/>
      </div>

      {/* Quick actions */}
      <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:20}}>
        <div style={{fontSize:13,fontWeight:600,color:'#e8eaf0',marginBottom:12}}>Quick actions</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <Link href="/listings/new" style={{background:'#3b82f6',color:'#fff',textDecoration:'none',borderRadius:8,padding:'9px 16px',fontSize:13,fontWeight:600}}>+ New listing</Link>
          <Link href="/orders" style={{background:'#161c28',color:'#e8eaf0',textDecoration:'none',borderRadius:8,padding:'9px 16px',fontSize:13,fontWeight:500,border:'1px solid rgba(255,255,255,0.08)'}}>My orders</Link>
          <Link href={'/profile/'+user.id} style={{background:'#161c28',color:'#e8eaf0',textDecoration:'none',borderRadius:8,padding:'9px 16px',fontSize:13,fontWeight:500,border:'1px solid rgba(255,255,255,0.08)'}}>View public profile</Link>
          <Link href="/settings" style={{background:'#161c28',color:'#e8eaf0',textDecoration:'none',borderRadius:8,padding:'9px 16px',fontSize:13,fontWeight:500,border:'1px solid rgba(255,255,255,0.08)'}}>Settings</Link>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, sub }) {
  return (
    <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:accent||'#3b82f6',opacity:0.6}}/>
      <div style={{fontSize:11,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>{label}</div>
      {value === null ? (
        <div style={{height:24,width:80,background:'#161c28',borderRadius:6,animation:'pulse2 1.5s infinite'}}/>
      ) : (
        <div style={{fontSize:22,fontWeight:700,color:'#e8eaf0',lineHeight:1.1}}>{value}</div>
      )}
      {sub && <div style={{fontSize:11,color:'#4a5568',marginTop:4}}>{sub}</div>}
      <style>{'@keyframes pulse2{0%,100%{opacity:1}50%{opacity:0.5}}'}</style>
    </div>
  );
}

function SmallStat({ label, value, alert }) {
  return (
    <div style={{background:'#111620',border:'1px solid '+(alert?'rgba(245,158,11,0.3)':'rgba(255,255,255,0.06)'),borderRadius:10,padding:'12px 14px'}}>
      <div style={{fontSize:18,fontWeight:700,color:alert?'#fbbf24':'#e8eaf0',lineHeight:1.1}}>{value}</div>
      <div style={{fontSize:10,color:'#4a5568',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:4}}>{label}</div>
    </div>
  );
}
