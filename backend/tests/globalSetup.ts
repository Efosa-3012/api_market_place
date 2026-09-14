import pg from 'pg';

/**
 * Creates the test database if it is missing and applies the migrations, so
 * `npm test` works against a bare `docker compose up -d postgres`.
 */
export default async function setup() {
  const url = new URL(process.env.DATABASE_URL!);
  const dbName = url.pathname.slice(1);

  // Hard stop: the suite truncates tables, so it must never point at a real database.
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${dbName}" — the database name must end with _test`);
  }

  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    // Identifier cannot be parameterised; dbName is validated above and comes from our own config.
    if (!rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.end();
  }

  const { migrate } = await import('../src/db/migrate.js');
  const { pool } = await import('../src/lib/db.js');
  await migrate();
  await pool.end();
}
