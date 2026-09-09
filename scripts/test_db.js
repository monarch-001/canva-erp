import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'canva_erp_staging',
  user: 'postgres',
  password: 'postgres'
});

async function run() {
  console.log("Connecting to PostgreSQL...");
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Success! Server time:", res.rows[0].now);
    
    console.log("Querying work_orders count...");
    const wo = await pool.query("SELECT COUNT(*) FROM public.work_orders");
    console.log("Work orders count:", wo.rows[0].count);
  } catch (err) {
    console.error("DB error:", err);
  } finally {
    await pool.end();
  }
}

run();
