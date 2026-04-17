const BACKEND = 'https://xrp-marketplace-backend-production.up.railway.app';

async function handler(req, { params }) {
  const path = (params.path || []).join('/');
  const url = BACKEND + '/api/' + path + (req.nextUrl ? ('?' + req.nextUrl.searchParams.toString()) : '');
  const headers = { 'Content-Type': 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) headers['authorization'] = auth;
  const init = { method: req.method, headers };
  if (!['GET','HEAD'].includes(req.method)) {
    try { init.body = await req.text(); } catch {}
  }
  const res = await fetch(url, init);
  const body = await res.text();
  return new Response(body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
