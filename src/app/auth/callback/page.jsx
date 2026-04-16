'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';

export default function AuthCallbackPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [msg,   setMsg] = useState('Completing sign in...');

  useEffect(() => {
    const uuid = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('uuid')
      : null;

    if (!uuid) { router.replace('/'); return; }

    api.auth.verify(uuid)
      .then(({ token, user }) => {
        setAuth(token, user);
        setMsg('Success! Redirecting...');
        router.replace('/');
      })
      .catch(() => {
        setMsg('Sign in failed. Redirecting...');
        setTimeout(() => router.replace('/'), 1500);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  );
}
