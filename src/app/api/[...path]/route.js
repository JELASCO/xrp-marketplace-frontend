export const runtime = 'nodejs';

const BACKEND = 'https://xrp-marketplace-backend-production.up.railway.app';

async function handler(req, ctx) {
  const segments = ctx && ctx.params && ctx.params.path ? ctx.params.path : [];
  const pathStr = segments.join('/');
  const search = req.nextUrl ? req.nextUrl.search : '';
  const url = BACKEND + '/api/' + pathStr + (search || '');
  const reqHeaders = {};
  reqHeaders['content-type'] = 'application/json';
  const auth = req.headers.get('authorization');
  if (auth) reqHeaders['authorization'] = auth;
  const init = { method: req.method, headers: reqHeaders };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try { init.body = await req.text(); } catch (e) {}
  }
  const res = await fetch(url, init);
  const body = await res.text();
  const ct = res.headers.get('content-type') || 'application/json';
  return new Response(body, { status: res.status, headers: { 'content-type': ct } });
}

export const GET    = handler;
export const POST   = handler;
export const PATCH  = handler;
export const PUT    = handler;
export const DELETE = handler;
