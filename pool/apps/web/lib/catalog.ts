import pg from 'pg';

// Browser responses are an explicit public projection. Never serialize pool.data:
// it contains members, payer/household keys, private offers and assignments.
const globalDb = globalThis as typeof globalThis & { poolCatalog?: pg.Pool };
function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
  return globalDb.poolCatalog ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3, connectionTimeoutMillis: 4000, statement_timeout: 4000,
    idleTimeoutMillis: 10000,
  });
}
export async function readCatalog(query: string) {
  // Literal substring matching, including % and _, with parameters (no URL fetching).
  const result = await database().query(`
    SELECT p.id, p.state, p.closes_at,
      COALESCE(NULLIF(pr.data->>'title',''), NULLIF(pr.data->>'name',''), p.data->>'productKey', p.id) AS title,
      COALESCE(p.data->>'areaKey','') AS area,
      COALESCE(p.quantity_rule->'uom'->>'code','') AS unit
    FROM pools p
    LEFT JOIN products pr ON pr.id = p.data->>'productKey'
    WHERE p.currency = 'INR' AND p.closes_at > NOW() AND p.state IN ('OPEN','PRICING','AWARDED') AND (
      $1 = '' OR strpos(lower(COALESCE(pr.data->>'title','') || ' ' ||
        COALESCE(pr.data->>'name','') || ' ' || COALESCE(p.data->>'productKey','') || ' ' ||
        COALESCE(p.data->>'areaKey','')), lower($1)) > 0
      OR EXISTS (SELECT 1 FROM product_sources s WHERE s.product_id = pr.id AND s.source_url = $1)
    )
    ORDER BY (p.state = 'OPEN' AND p.closes_at > NOW()) DESC, p.created_at DESC
    LIMIT 100`, [query]);
  return result.rows.map(row => ({
    id: String(row.id), title: String(row.title), area: String(row.area),
    state: String(row.state), closesAt: new Date(row.closes_at).toISOString(), unit: String(row.unit),
  }));
}
