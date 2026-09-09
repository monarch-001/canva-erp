import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'canva_erp_staging',
  user: 'postgres',
  password: 'postgres'
});

async function main() {
  const res = await pool.query("SELECT id, wo_number, title FROM public.work_orders LIMIT 3");
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main();
