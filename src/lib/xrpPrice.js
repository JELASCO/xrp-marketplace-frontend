'use client';
import { useState, useEffect } from 'react';

// Shared real-time XRP/USD price engine (Coinbase + Binance WebSockets + 3s HTTP polling)
// Keeps the Navbar badge and Homepage ticker synchronized tick-by-tick.
let state = { price: null, change: null, dir: null };
let last = null;
let ref = null;
let started = false;
let dirTimer = null;
const subs = new Set();

function emit() {
  subs.forEach(function (fn) {
    fn(state);
  });
}

function applySpotPrice(p, explicitChange) {
  if (typeof p !== 'number' || isNaN(p) || p <= 0) return;
  let dir = state.dir;
  if (last != null && Math.abs(p - last) >= 0.00001) {
    dir = p > last ? 'up' : 'down';
    if (dirTimer) clearTimeout(dirTimer);
    dirTimer = setTimeout(function () {
      state = { price: state.price, change: state.change, dir: null };
      emit();
    }, 1600);
  }
  last = p;
  let change = state.change;
  if (typeof explicitChange === 'number' && !isNaN(explicitChange)) {
    change = explicitChange;
  } else if (ref && ref > 0) {
    change = ((p - ref) / ref) * 100;
  }
  state = { price: p, change: change, dir: dir };
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

function connectLiveWebSockets() {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;

  // Stream 1: Coinbase Exchange real-time ticker
  function openCoinbaseWs() {
    let ws = null;
    try {
      ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      ws.onopen = function () {
        try {
          ws.send(JSON.stringify({
            type: 'subscribe',
            product_ids: ['XRP-USD'],
            channels: ['ticker'],
          }));
        } catch (e) {}
      };
      ws.onmessage = function (evt) {
        try {
          const msg = JSON.parse(evt.data);
          if (msg && msg.type === 'ticker' && msg.price) {
            const p = parseFloat(msg.price);
            if (msg.open_24h) {
              const op = parseFloat(msg.open_24h);
              if (!isNaN(op) && op > 0) ref = op;
            }
            applySpotPrice(p);
          }
        } catch (e) {}
      };
      ws.onclose = function () {
        setTimeout(openCoinbaseWs, 4000);
      };
      ws.onerror = function () {
        try { ws.close(); } catch (e) {}
      };
    } catch (e) {}
  }

  // Stream 2: Binance real-time trade stream (high-frequency sub-second ticks where reachable)
  function openBinanceWs() {
    let bws = null;
    try {
      bws = new WebSocket('wss://stream.binance.com:9443/ws/xrpusdt@trade');
      bws.onmessage = function (evt) {
        try {
          const msg = JSON.parse(evt.data);
          if (msg && msg.p) {
            applySpotPrice(parseFloat(msg.p));
          }
        } catch (e) {}
      };
      bws.onclose = function () {
        setTimeout(openBinanceWs, 8000);
      };
      bws.onerror = function () {
        try { bws.close(); } catch (e) {}
      };
    } catch (e) {}
  }

  openCoinbaseWs();
  openBinanceWs();
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  fetchSpot();
  connectLiveWebSockets();
  setInterval(fetchSpot, 3000);
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
