'use client';
import { create } from 'zustand';
import { api } from './api';
export const useAuthStore = create((set, get) => ({
  user: null, token: null, loading: false,
  init: async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('xrpmarket_token');
    if (!token) return;
    try { set({ loading: true }); const user = await api.auth.me(); set({ user, token, loading: false }); }
    catch { localStorage.removeItem('xrpmarket_token'); set({ user: null, token: null, loading: false }); }
  },
  setAuth: (token, user) => { localStorage.setItem('xrpmarket_token', token); set({ token, user }); },
  logout: () => { localStorage.removeItem('xrpmarket_token'); set({ user: null, token: null }); },
  isLoggedIn: () => !!get().user,
}));

import { io } from 'socket.io-client';

let _socket = null;

export const useNotificationsStore = create((set, get) => ({
  items: [],
  unread: 0,
  loaded: false,
  load: async () => {
    try {
      const r = await api.notifications.list();
      set({ items: r.items || [], unread: r.unread || 0, loaded: true });
    } catch { set({ loaded: true }); }
  },
  markRead: async (id) => {
    const items = get().items.map(n => n.id === id ? { ...n, is_read: true } : n);
    const unread = items.filter(n => !n.is_read).length;
    set({ items, unread });
    try { await api.notifications.markRead(id); } catch {}
  },
  markAllRead: async () => {
    set({ items: get().items.map(n => ({ ...n, is_read: true })), unread: 0 });
    try { await api.notifications.markAllRead(); } catch {}
  },
  pushLocal: (n) => {
    const item = { id: 'local-' + Date.now() + Math.random(), ...n, is_read: false };
    set({ items: [item, ...get().items].slice(0, 50), unread: get().unread + 1 });
  },
  connectSocket: (userId) => {
    if (_socket || typeof window === 'undefined') return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    try {
      _socket = io(url, { transports: ['websocket', 'polling'], path: '/socket.io' });
      _socket.on('connect', () => _socket.emit('join', userId));
      _socket.on('notification', (n) => get().pushLocal(n));
    } catch (e) { console.warn('[Socket]', e.message); }
  },
  disconnectSocket: () => {
    if (_socket) { try { _socket.disconnect(); } catch {} _socket = null; }
    set({ items: [], unread: 0, loaded: false });
  },
}));
