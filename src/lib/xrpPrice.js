'use client';
import { useState, useEffect } from 'react';

// Single shared XRP/USD price source so the navbar and the homepage ticker
// always show the same value, refreshed on one timer.
let state = { price: null, change: null, dir: null };
let last = null;
let ref = null;
let started = false;
const subs = new Set();

function emit() { subs.forEach(function (fn) { fn(state); }); }

function fetchSpot() {
  fetch('https://api.coinbase.com/v2/prices/XRP-USD/spot')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.data || !d.data.amount) return;
      const p = parseFloat(d.data.amount);
      if (isNaN(p)) return;
      let dir = null;
      if (last != null && p !== last) dir = p > last ? 'up' : 'down';
      last = p;
      const change = ref ? ((p - ref) / ref) * 100 : state.change;
      state = { price: p, change: change, dir: dir };
      emit();
      if (dir) setTimeout(function () { state = { price: state.price, change: state.change, dir: null }; emit(); }, 1200);
    })
    .catch(function () {});
}

function fetchRef() {
  const d = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  fetch('https://api.coinbase.com/v2/prices/XRP-USD/spot?date=' + d)
    .then(function (r) { return r.json(); })
    .then(function (j) {
      const p = parseFloat(j && j.data && j.data.amount);
      if (!isNaN(p) && p) {
        ref = p;
        if (state.price != null) { state = { price: state.price, change: ((state.price - ref) / ref) * 100, dir: state.dir }; emit(); }
      }
    })
    .catch(function () {});
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  fetchRef();
  fetchSpot();
  setInterval(fetchSpot, 15000);
}

export function subscribeXrp(fn) {
  subs.add(fn);
  start();
  if (state.price != null) fn(state);
  return function () { subs.delete(fn); };
}

export function useXrpPrice() {
  const [s, setS] = useState(state);
  useEffect(function () { return subscribeXrp(setS); }, []);
  return s;
}
