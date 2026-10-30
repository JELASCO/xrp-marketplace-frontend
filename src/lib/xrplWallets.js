'use client';

/**
 * Official Browser Extension Connector & Transaction Signer for:
 * - Crossmark (window.xrpl.crossmark / window.crossmark)
 * - GemWallet (window.gemWallet / @gemwallet/api window.postMessage protocol)
 * Supports address autofill as well as signing EscrowCreate, EscrowFinish, and EscrowCancel.
 */

export function getCrossmarkSdk() {
  if (typeof window === 'undefined') return null;
  if (window.xrpl && window.xrpl.isCrossmark && window.xrpl.crossmark) {
    return window.xrpl.crossmark;
  }
  if (window.crossmark) {
    return window.crossmark;
  }
  return null;
}

export async function isGemWalletInstalled() {
  if (typeof window === 'undefined') return false;
  if (window.gemWallet && typeof window.gemWallet.isInstalled === 'function') {
    try {
      const res = await window.gemWallet.isInstalled();
      return Boolean(res?.result?.isInstalled ?? res?.isInstalled ?? true);
    } catch {
      return true;
    }
  }
  if (window.gemWallet) return true;

  // Fallback to @gemwallet/api standard window.postMessage probe
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        window.removeEventListener('message', onMsg);
        resolve(false);
      }
    }, 600);

    function onMsg(event) {
      if (event.source !== window || !event.data) return;
      if (event.data.type === 'STATUS_RESPONSE' || event.data.isInstalled !== undefined || event.data?.result?.isInstalled !== undefined) {
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', onMsg);
        resolve(Boolean(event.data?.result?.isInstalled ?? event.data?.isInstalled ?? true));
      }
    }

    window.addEventListener('message', onMsg);
    try {
      window.postMessage({ type: 'IS_INSTALLED' }, '*');
    } catch {
      clearTimeout(timer);
      window.removeEventListener('message', onMsg);
      resolve(false);
    }
  });
}

export async function connectCrossmarkWallet() {
  const sdk = getCrossmarkSdk();
  if (!sdk) {
    const err = new Error('Crossmark browser extension is not installed. Install Crossmark at https://crossmark.io or use Xaman / GemWallet.');
    err.code = 'EXTENSION_NOT_INSTALLED';
    err.installUrl = 'https://crossmark.io';
    throw err;
  }

  const signInFn =
    (typeof sdk.signInAndWait === 'function' && sdk.signInAndWait.bind(sdk)) ||
    (sdk.methods && typeof sdk.methods.signInAndWait === 'function' && sdk.methods.signInAndWait.bind(sdk.methods)) ||
    (typeof sdk.signIn === 'function' && sdk.signIn.bind(sdk));

  if (!signInFn) {
    throw new Error('Crossmark extension was detected, but signInAndWait is unavailable in this browser version.');
  }

  const resp = await signInFn();
  const address =
    resp?.response?.data?.address ||
    resp?.data?.address ||
    resp?.address ||
    sdk?.session?.address;

  if (!address || !/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) {
    throw new Error('Crossmark sign-in was cancelled or did not return an XRPL r-address.');
  }

  return { wallet: 'crossmark', address };
}

export async function connectGemWallet() {
  const installed = await isGemWalletInstalled();
  if (!installed) {
    const err = new Error('GemWallet browser extension is not installed. Install GemWallet at https://gemwallet.app or use Xaman / Crossmark.');
    err.code = 'EXTENSION_NOT_INSTALLED';
    err.installUrl = 'https://gemwallet.app';
    throw err;
  }

  if (window.gemWallet && typeof window.gemWallet.getAddress === 'function') {
    const resp = await window.gemWallet.getAddress();
    const address = resp?.result?.address || resp?.address;
    if (!address || !/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) {
      throw new Error('GemWallet connection was cancelled or did not return an XRPL r-address.');
    }
    return { wallet: 'gemwallet', address };
  }

  // @gemwallet/api postMessage bridge
  const address = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      reject(new Error('GemWallet timed out waiting for address approval.'));
    }, 30000);

    function onMsg(event) {
      if (event.source !== window || !event.data) return;
      if (event.data.type === 'GET_ADDRESS_RESPONSE') {
        clearTimeout(timer);
        window.removeEventListener('message', onMsg);
        const addr = event.data?.result?.address || event.data?.address;
        if (addr) resolve(addr);
        else reject(new Error('GemWallet request rejected by user.'));
      }
    }

    window.addEventListener('message', onMsg);
    window.postMessage({ type: 'GET_ADDRESS' }, '*');
  });

  return { wallet: 'gemwallet', address };
}

/**
 * Signs and submits an XRPL transaction (EscrowCreate, EscrowFinish, EscrowCancel, Payment)
 * using the Crossmark browser extension.
 */
export async function signAndSubmitWithCrossmark(txjson) {
  const sdk = getCrossmarkSdk();
  if (!sdk) {
    const err = new Error('Crossmark extension is not installed. Please install Crossmark (https://crossmark.io) or scan the QR code with Xaman.');
    err.code = 'EXTENSION_NOT_INSTALLED';
    err.installUrl = 'https://crossmark.io';
    throw err;
  }

  if (!txjson || !txjson.TransactionType) {
    throw new Error('Missing XRPL transaction payload (txjson) for Crossmark signing.');
  }

  const txPayload = { ...txjson };
  if (!txPayload.Account && sdk?.session?.address) {
    txPayload.Account = sdk.session.address;
  }

  const signAndSubmitFn =
    (typeof sdk.signAndSubmitAndWait === 'function' && sdk.signAndSubmitAndWait.bind(sdk)) ||
    (sdk.methods && typeof sdk.methods.signAndSubmitAndWait === 'function' && sdk.methods.signAndSubmitAndWait.bind(sdk.methods)) ||
    (typeof sdk.signAndSubmit === 'function' && sdk.signAndSubmit.bind(sdk));

  if (!signAndSubmitFn) {
    throw new Error('Crossmark signAndSubmitAndWait API is unavailable.');
  }

  const res = await signAndSubmitFn(txPayload);
  const respData = res?.response?.data || res?.data || res || {};
  const txResult = respData?.resp?.result || respData?.result || respData;
  const txHash =
    txResult?.hash ||
    txResult?.tx_json?.hash ||
    respData?.hash ||
    res?.hash;
  const sequence =
    txResult?.Sequence ||
    txResult?.tx_json?.Sequence ||
    respData?.sequence ||
    null;

  if (!txHash || !/^[A-Fa-f0-9]{64}$/.test(String(txHash).trim())) {
    throw new Error(respData?.meta?.isRejected ? 'Transaction signing was rejected in Crossmark.' : 'Crossmark did not return a validated 64-character XRPL transaction hash.');
  }

  return {
    ok: true,
    wallet: 'crossmark',
    txHash: String(txHash).trim().toUpperCase(),
    sequence: sequence != null ? Number(sequence) : null,
  };
}

/**
 * Signs and submits an XRPL transaction (EscrowCreate, EscrowFinish, EscrowCancel, Payment)
 * using the GemWallet browser extension.
 */
export async function signAndSubmitWithGemWallet(txjson) {
  const installed = await isGemWalletInstalled();
  if (!installed) {
    const err = new Error('GemWallet extension is not installed. Please install GemWallet (https://gemwallet.app) or scan the QR code with Xaman.');
    err.code = 'EXTENSION_NOT_INSTALLED';
    err.installUrl = 'https://gemwallet.app';
    throw err;
  }

  if (!txjson || !txjson.TransactionType) {
    throw new Error('Missing XRPL transaction payload (txjson) for GemWallet signing.');
  }

  let res = null;
  if (window.gemWallet && typeof window.gemWallet.submitTransaction === 'function') {
    res = await window.gemWallet.submitTransaction({ transaction: txjson });
  } else if (window.gemWallet && txjson.TransactionType === 'EscrowCreate' && typeof window.gemWallet.createEscrow === 'function') {
    res = await window.gemWallet.createEscrow(txjson);
  } else if (window.gemWallet && txjson.TransactionType === 'EscrowFinish' && typeof window.gemWallet.finishEscrow === 'function') {
    res = await window.gemWallet.finishEscrow(txjson);
  } else if (window.gemWallet && txjson.TransactionType === 'EscrowCancel' && typeof window.gemWallet.cancelEscrow === 'function') {
    res = await window.gemWallet.cancelEscrow(txjson);
  } else {
    // @gemwallet/api postMessage bridge for submitTransaction
    res = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMsg);
        reject(new Error('GemWallet timed out waiting for transaction signature.'));
      }, 60000);

      function onMsg(event) {
        if (event.source !== window || !event.data) return;
        if (event.data.type === 'SUBMIT_TRANSACTION_RESPONSE') {
          clearTimeout(timer);
          window.removeEventListener('message', onMsg);
          resolve(event.data);
        }
      }

      window.addEventListener('message', onMsg);
      window.postMessage({ type: 'SUBMIT_TRANSACTION', transaction: txjson }, '*');
    });
  }

  const txHash =
    res?.result?.hash ||
    res?.data?.hash ||
    res?.hash;

  if (!txHash || !/^[A-Fa-f0-9]{64}$/.test(String(txHash).trim())) {
    throw new Error(res?.type === 'reject' ? 'Transaction signing was rejected in GemWallet.' : 'GemWallet did not return a validated 64-character XRPL transaction hash.');
  }

  return {
    ok: true,
    wallet: 'gemwallet',
    txHash: String(txHash).trim().toUpperCase(),
    sequence: res?.result?.Sequence ? Number(res.result.Sequence) : null,
  };
}
