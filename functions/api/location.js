export async function onRequestGet(context) {
  const cf = context.request.cf || {};
  const countryHeader = context.request.headers.get('CF-IPCountry');

  const body = {
    country: cf.country || countryHeader || null,
    city: cf.city || null,
    region: cf.region || null,
    timezone: cf.timezone || null,
    colo: cf.colo || null,
    source: 'cloudflare-request-cf',
    stored: false,
  };

  return Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
