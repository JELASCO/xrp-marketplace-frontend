'use client';
import { useEffect } from 'react';
import { useAuthStore, useNotificationsStore } from '../lib/store';

export default function Providers({ children }) {
  const init = useAuthStore(s => s.init);
  const user = useAuthStore(s => s.user);
  const loadNotifs = useNotificationsStore(s => s.load);
  const connectSocket = useNotificationsStore(s => s.connectSocket);
  const disconnectSocket = useNotificationsStore(s => s.disconnectSocket);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (user) {
      loadNotifs();
      connectSocket(user.id);
    } else {
      disconnectSocket();
    }
  }, [user]);

  return <>{children}</>;
}
