import { readCatalog } from '../../../lib/catalog';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get('q') ?? '').trim();
  const headers = { 'Cache-Control': 'no-store' };
  if (query.length > 500) return Response.json({ error: 'QUERY_TOO_LONG' }, { status: 400, headers });
  try {
    return Response.json({ pools: await readCatalog(query), checkedAt: new Date().toISOString() }, { headers });
  } catch {
    // Do not expose connection strings, database internals or raw driver errors.
    return Response.json({ error: 'CATALOG_UNAVAILABLE' }, { status: 503, headers });
  }
}
