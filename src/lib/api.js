function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('xrpmarket_token');
}
async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
      body: options.body !== undefined ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    });
  } catch (e) {
    throw new Error('Network error — please check your connection and try again.');
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON response */ }
  if (!res.ok) {
    const errMsg = (data && (data.error || data.message)) || null;
    if (res.status === 401) throw new Error(errMsg || 'Please sign in to continue.');
    if (res.status === 403) throw new Error(errMsg || 'You do not have permission to do that.');
    if (res.status === 404) throw new Error(errMsg && !/application not found/i.test(errMsg) ? errMsg : 'Requested resource was not found.');
    if (res.status >= 500) throw new Error(errMsg || 'Something went wrong on our end. Please try again in a moment.');
    throw new Error(errMsg || 'Request failed. Please try again.');
  }
  return data;
}
export const api = {
  auth: { startSignIn: () => request('/auth/signin', { method: 'POST' }), verify: (uuid) => request('/auth/verify', { method: 'POST', body: { uuid } }), me: () => request('/auth/me') },
  listings: {
    list: (p = {}) => request('/listings?' + new URLSearchParams(p)),
    get: (id) => request(`/listings/${id}`),
    view: (id) => request('/listings/' + id + '/view', { method: 'POST' }),
    create: (d) => request('/listings', { method: 'POST', body: d }),
    update: (id, d) => request(`/listings/${id}`, { method: 'PATCH', body: d }),
    remove: (id) => request(`/listings/${id}`, { method: 'DELETE' }),
    rlusdStatus: () => request('/rlusd-status'),
    importFromUrl: (url) => request('/import-listing', { method: 'POST', body: { url } }),
    notifyUpdate: (id, data) => request(`/listings/${id}/notify-update`, { method: 'POST', body: data }),
  },
  orders: {
    mine: (r) => request(`/orders/mine?role=${r || 'buyer'}`),
    get: (id) => request(`/orders/${id}`),
    create: (listingId, promoCode, settlementCurrency) => request('/orders', {
      method: 'POST',
      body: {
        listingId,
        ...(promoCode ? { promoCode } : {}),
        ...(settlementCurrency ? { settlementCurrency } : {}),
      },
    }),
    xummPayload: (id) => request(`/orders/${id}/escrow/xumm-payload`, { method: 'POST' }),
    commissionVerify: (id, d = {}) => request(`/orders/${id}/commission/verify`, { method: 'POST', body: d }),
    confirm: (id) => request(`/orders/${id}/escrow/confirm`, { method: 'POST' }),
    deliver: (id) => request(`/orders/${id}/deliver`, { method: 'POST' }),
    claim: (id) => request(`/orders/${id}/escrow/claim`, { method: 'POST' }),
    escrowCancel: (id) => request(`/orders/${id}/escrow/cancel`, { method: 'POST' }),
    escrowStatus: (id, uuid) => request(`/orders/${id}/escrow/status${uuid ? `?uuid=${encodeURIComponent(uuid)}` : ''}`),
    delivery: (id) => request(`/orders/${id}/delivery`),
    download: (id) => request(`/orders/${id}/download`, { method: 'POST' }),
    autoRelease: (id) => request(`/orders/${id}/auto-release`, { method: 'POST' }),
    cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
    dispute: (id, d) => request(`/orders/${id}/dispute`, { method: 'POST', body: d }),
    review: (id, d) => request(`/orders/${id}/review`, { method: 'POST', body: d }),
  },
  promo: {
    validate: (listingId, promoCode) => request('/promo/validate', { method: 'POST', body: { listingId, promoCode } }),
  },
  users: { get: (id) => request(`/users/${id}`), listings: (id) => request(`/users/${id}/listings`), reviews: (id) => request(`/users/${id}/reviews`), myStats: () => request('/me/stats'), update: (d) => request('/users/me', { method: 'PATCH', body: d }) },
  notifications: {
    list: () => request('/notifications'),
    markAllRead: () => request('/notifications/read', { method: 'POST' })
  },
  admin: { stats: () => request('/admin/stats'), disputes: (status) => request('/admin/disputes' + (status ? `?status=${encodeURIComponent(status)}` : '')), inspectVault: (id) => request(`/admin/orders/${id}/inspect-vault`), resolveDispute: (id,d) => request(`/disputes/${id}/resolve`, { method: 'POST', body: d }), banUser: (id,b) => request(`/admin/users/${id}/ban`, { method: 'PATCH', body: { banned: b } }), removeListing: (id) => request(`/admin/listings/${id}/remove`, { method: 'PATCH' }),
    users: () => request('/admin/users'),
    orders: () => request('/admin/orders'),
    listings: () => request('/admin/listings'),
    verifyUser: (id, v) => request(`/admin/users/${id}/verify`, { method: 'PATCH', body: { verified: v } }),
    grantPro: (id, days) => request(`/admin/users/${id}/pro`, { method: 'PATCH', body: { days } }),
    featureListing: (id, days) => request(`/admin/listings/${id}/feature`, { method: 'PATCH', body: { days } }), listReports: (status='pending') => request('/admin/reports?status=' + encodeURIComponent(status)), resolveReport: (id, action, note) => request('/admin/reports/' + id + '/resolve', { method: 'PATCH', body: { action, note } }) },
  upgrades: {
    pricing: () => request('/upgrades/pricing'),
    payload: (kind, listingId) => request('/upgrades/payload', { method: 'POST', body: { kind, listingId } }),
    verify: (paymentId) => request(`/upgrades/${paymentId}/verify`, { method: 'POST' }),
    foundingStatus: () => request('/upgrades/founding-status'),
    claimFounding: () => request('/upgrades/claim-founding', { method: 'POST' }),
  },
  uploadArchive: (payload) => request('/upload-archive', { method: 'POST', body: payload }),
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
    list: () => request('/stores'),
    mine: () => request('/stores/me'),
    save: (d) => request('/stores/me', { method: 'PATCH', body: d }),
    get: (handle) => request('/stores/' + handle),
    follow: (handle) => request('/stores/' + handle + '/follow', { method: 'POST' }),
    remove: () => request('/stores/me', { method: 'DELETE' }),
  },
  reports: { create: (data) => request('/reports', { method: 'POST', body: data }) },
};
