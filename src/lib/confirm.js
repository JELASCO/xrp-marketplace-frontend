'use client';

// Promise-based replacement for window.confirm(), backed by <ConfirmHost />.
// Falls back to the native dialog if the host isn't mounted yet.
let opener = null;

export function _registerConfirm(fn) { opener = fn; }

export function xhConfirm(message, opts) {
  if (typeof opener !== 'function') {
    if (typeof window !== 'undefined') return Promise.resolve(window.confirm(message));
    return Promise.resolve(false);
  }
  return new Promise((resolve) => opener({ message, opts: opts || {}, resolve }));
}
