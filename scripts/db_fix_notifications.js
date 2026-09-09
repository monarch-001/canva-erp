import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'canva_erp_staging',
  user: 'postgres',
  password: 'postgres'
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Adding missing columns to public.notification_log...');
    await client.query(`
      ALTER TABLE public.notification_log 
      ADD COLUMN IF NOT EXISTS suppressed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
    `);

    await client.query('COMMIT');
    console.log('Notification log columns successfully added.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
