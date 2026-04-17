'use client';
import { useEffect } from 'react';
import { useAuthStore } from '../lib/store';

export default function Providers({ children }) {
  const init = useAuthStore(s => s.init);
  useEffect(() => { init(); }, []);
  return <>{children}</>;
}