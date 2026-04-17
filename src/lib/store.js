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