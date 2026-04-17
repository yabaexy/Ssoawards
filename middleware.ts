export const config = {
  runtime: 'edge',
};

const BLOCKED = ['CN','HK','MO','CU','IR','KP','RU','BY','SY'];

export default function middleware(req: Request) {
  const country = req.headers.get('x-vercel-ip-country') || 'UNKNOWN';

  if (BLOCKED.includes(country)) {
    return new Response(
      JSON.stringify({ error: 'Access restricted' }),
      {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }
    );
  }

  return fetch(req);
}