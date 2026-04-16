const BASE = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('xrpmarket_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  auth: {
    startSignIn: ()       => request('/auth/signin', { method: 'POST' }),
    verify:      (uuid)   => request('/auth/verify', { method: 'POST', body: { uuid } }),
    me:          ()       => request('/auth/me'),
  },
  listings: {
    list:   (params = {}) => request('/listings?' + new URLSearchParams(params)),
    get:    (id)          => request(`/listings/${id}`),
    create: (data)        => request('/listings', { method: 'POST', body: data }),
    update: (id, data)    => request(`/listings/${id}`, { method: 'PATCH', body: data }),
  },
  orders: {
    mine:         (role)  => request(`/orders/mine?role=${role || 'buyer'}`),
    get:          (id)    => request(`/orders/${id}`),
    create:       (listingId) => request('/orders', { method: 'POST', body: { listingId } }),
    xummPayload:  (id)    => request(`/orders/${id}/escrow/xumm-payload`, { method: 'POST' }),
    confirm:      (id)    => request(`/orders/${id}/escrow/confirm`, { method: 'POST' }),
    escrowStatus: (id)    => request(`/orders/${id}/escrow/status`),
    dispute:      (id, data) => request(`/orders/${id}/dispute`, { method: 'POST', body: data }),
    review:       (id, data) => request(`/orders/${id}/review`, { method: 'POST', body: data }),
  },
  users: {
    get:    (id)          => request(`/users/${id}`),
    update: (data)        => request('/users/me', { method: 'PATCH', body: data }),
  },
  admin: {
    stats:          ()    => request('/admin/stats'),
    disputes:       ()    => request('/admin/disputes'),
    resolveDispute: (id, data) => request(`/disputes/${id}/resolve`, { method: 'POST', body: data }),
    banUser:        (id, banned) => request(`/admin/users/${id}/ban`, { method: 'PATCH', body: { banned } }),
    removeListing:  (id)  => request(`/admin/listings/${id}/remove`, { method: 'PATCH' }),
  },
};
