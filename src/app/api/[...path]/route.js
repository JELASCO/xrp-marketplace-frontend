const BACKEND = 'https://xrp-marketplace-backend-production.up.railway.app';

async function handler(request, { params }) {
  const path    = params.path.join('/');
  const url     = new URL(request.url);
  const target  = `${BACKEND}/api/${path}${url.search}`;

  const headers = {};
  request.headers.forEach((val, key) => {
    if (!['host','content-length'].includes(key)) headers[key] = val;
  });

  const init = { method: request.method, headers };

  if (!['GET','HEAD'].includes(request.method)) {
    const body = await request.text();
    if (body) init.body = body;
  }

  const res = await fetch(target, init);

  const resHeaders = {};
  res.headers.forEach((val, key) => {
    if (!['content-encoding','transfer-encoding'].includes(key)) {
      resHeaders[key] = val;
    }
  });
  resHeaders['Access-Control-Allow-Origin'] = '*';

  const data = await res.text();

  return new Response(data, { status: res.status, headers: resHeaders });
}

export async function GET(req, ctx)     { return handler(req, ctx); }
export async function POST(req, ctx)    { return handler(req, ctx); }
export async function PUT(req, ctx)     { return handler(req, ctx); }
export async function PATCH(req, ctx)   { return handler(req, ctx); }
export async function DELETE(req, ctx)  { return handler(req, ctx); }
export async function OPTIONS(req, ctx) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  });
}
