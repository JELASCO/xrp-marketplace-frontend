'use client';
import { useState, useEffect } from 'react';

// Calm 30-second XRP/USD price engine (updates only when price changes by >= $0.0005)
let state = { price: null, change: null, dir: null };
let last = null;
let ref = null;
let started = false;
const subs = new Set();

function emit() {
  subs.forEach(function (fn) {
    fn(state);
  });
}

function applySpotPrice(p, explicitChange) {
  if (typeof p !== 'number' || isNaN(p) || p <= 0) return;
  if (last != null && Math.abs(p - last) < 0.0005) {
    return;
  }
  last = p;
  let change = state.change;
  if (typeof explicitChange === 'number' && !isNaN(explicitChange)) {
    change = explicitChange;
  } else if (ref && ref > 0) {
    change = ((p - ref) / ref) * 100;
  }
  state = { price: p, change: change, dir: null };
  emit();
}

function fetchSpot() {
  // 1. Coinbase Exchange 24hr stats (globally available, gives live last trade + 24h open)
  fetch('https://api.exchange.coinbase.com/products/XRP-USD/stats', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('cb stats ' + r.status);
      return r.json();
    })
    .then(function (s) {
      if (s && s.last) {
        const p = parseFloat(s.last);
        if (s.open) {
          const op = parseFloat(s.open);
          if (!isNaN(op) && op > 0) ref = op;
        }
        applySpotPrice(p);
        return;
      }
      throw new Error('empty cb stats');
    })
    .catch(function () {
      // 2. Fallback to Coinbase v2 spot price
      fetch('https://api.coinbase.com/v2/prices/XRP-USD/spot', { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('cb spot ' + r.status);
          return r.json();
        })
        .then(function (d) {
          if (d && d.data && d.data.amount) {
            applySpotPrice(parseFloat(d.data.amount));
            return;
          }
          throw new Error('empty cb spot');
        })
        .catch(function () {
          // 3. Fallback to same-origin server endpoint (/api/xrp-price)
          fetch('/api/xrp-price', { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (s) {
              if (s && s.price) {
                applySpotPrice(parseFloat(s.price), s.change != null ? parseFloat(s.change) : undefined);
              }
            })
            .catch(function () {});
        });
    });
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  fetchSpot();
  setInterval(fetchSpot, 30000);
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
