const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://xrp-marketplace-backend-production.up.railway.app';

export async function connectXumm() {
  const res = await fetch(BACKEND_URL + '/api/xumm/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

export async function pollXummPayload(uuid) {
  const res = await fetch(BACKEND_URL + '/api/xumm/payload/' + uuid);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}
