import pg from 'pg';

// Use DATABASE_URL from the environment when set (Render/Neon/any cloud DB),
// falling back to the local Docker Postgres for development.
export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://crm:crm@localhost:5432/crm',
});

export async function waitForDb(maxMs = 60000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < maxMs) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}
