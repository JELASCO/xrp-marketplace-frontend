export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://xrp-marketplace-frontend.vercel.app';
  const now = new Date();
  const staticRoutes = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: base + '/marketplace', lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: base + '/tos', lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: base + '/privacy', lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://xrp-marketplace-backend-production.up.railway.app';
    const res = await fetch(apiBase + '/listings?limit=200', { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.listings || []);
      const listingRoutes = items.map(l => ({
        url: base + '/listing/' + l.id,
        lastModified: l.updated_at ? new Date(l.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
      return [...staticRoutes, ...listingRoutes];
    }
  } catch (e) {}
  return staticRoutes;
}
