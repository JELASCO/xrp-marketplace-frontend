function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('xrpmarket_token');
}
async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export const api = {
  auth: { startSignIn: () => request('/auth/signin', { method: 'POST' }), verify: (uuid) => request('/auth/verify', { method: 'POST', body: { uuid } }), me: () => request('/auth/me') },
  listings: { list: (p={}) => request('/listings?' + new URLSearchParams(p)), get: (id) => request(`/listings/${id}`), create: (d) => request('/listings', { method: 'POST', body: d }), update: (id,d) => request(`/listings/${id}`, { method: 'PATCH', body: d }) },
  orders: { mine: (r) => request(`/orders/mine?role=${r||'buyer'}`), get: (id) => request(`/orders/${id}`), create: (listingId) => request('/orders', { method: 'POST', body: { listingId } }), xummPayload: (id) => request(`/orders/${id}/escrow/xumm-payload`, { method: 'POST' }), confirm: (id) => request(`/orders/${id}/escrow/confirm`, { method: 'POST' }), review: (id, data) => request(`/orders/${id}/review`, { method: 'POST', body: data }), dispute: (id, data) => request(`/orders/${id}/dispute`, { method: 'POST', body: data }), escrowStatus: (id) => request(`/orders/${id}/escrow/status`), dispute: (id,d) => request(`/orders/${id}/dispute`, { method: 'POST', body: d }), review: (id,d) => request(`/orders/${id}/review`, { method: 'POST', body: d }) },
  users: { get: (id) => request(`/users/${id}`), listings: (id) => request(`/users/${id}/listings`), reviews: (id) => request(`/users/${id}/reviews`), myStats: () => request('/me/stats'), update: (d) => request('/users/me', { method: 'PATCH', body: d }) },
  notifications: {
    list: () => request('/notifications'),
    markRead: (id) => request('/notifications/' + id + '/read', { method: 'POST' }),
    markAllRead: () => request('/notifications/read-all', { method: 'POST' })
  },
  admin: { stats: () => request('/admin/stats'), disputes: () => request('/admin/disputes'), resolveDispute: (id,d) => request(`/disputes/${id}/resolve`, { method: 'POST', body: d }), banUser: (id,b) => request(`/admin/users/${id}/ban`, { method: 'PATCH', body: { banned: b } }), removeListing: (id) => request(`/admin/listings/${id}/remove`, { method: 'PATCH' }),
    users: () => request('/admin/users'),
    verifyUser: (id, v) => request(`/admin/users/${id}/verify`, { method: 'PATCH', body: { verified: v } }) },
  favorites: {
    list: () => request('/favorites'),
    ids: () => request('/favorites/ids'),
    add: (listingId) => request('/favorites/' + listingId, { method: 'POST' }),
    remove: (listingId) => request('/favorites/' + listingId, { method: 'DELETE' }),
  },
  messages: {
    list: () => request('/messages'),
    get: (orderId) => request('/messages/' + orderId),
    send: (orderId, content) => request('/messages/' + orderId, { method: 'POST', body: { content } }),
  },
  contact: {
    send: (listingId, content) => request('/contact/' + listingId, { method: 'POST', body: { content } }),
    get: (listingId) => request('/contact/' + listingId),
    inquiries: () => request('/inquiries'),
  },
  offers: {
    send: (listingId, amountXrp, message) => request('/offers', { method: 'POST', body: { listingId, amountXrp, message } }),
    received: () => request('/offers/received'),
    sent: () => request('/offers/sent'),
    forListing: (listingId) => request('/offers/listing/' + listingId),
    accept: (id) => request('/offers/' + id + '/accept', { method: 'PATCH' }),
    decline: (id) => request('/offers/' + id + '/decline', { method: 'PATCH' }),
  },
  stores: {
    mine: () => request('/stores/me'),
    save: (d) => request('/stores/me', { method: 'PATCH', body: d }),
    get: (handle) => request('/stores/' + handle),
  },
};
