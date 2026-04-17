'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import { api } from '../../../lib/api';

function Spinner() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:16}}>
      <div style={{width:40,height:40,border:'2px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <div style={{fontSize:14,color:'#8892a4'}}>Verifying...</div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);
  useEffect(() => {
    const uuid = params.get('uuid');
    if (!uuid) { router.push('/'); return; }
    api.auth.verify(uuid)
      .then(({ token, user }) => { setAuth(token, user); router.push('/'); })
      .catch(() => router.push('/'));
  }, []);
  return <Spinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackInner />
    </Suspense>
  );
}
