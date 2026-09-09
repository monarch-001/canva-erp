import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'canva_erp_staging',
  user: 'postgres',
  password: 'postgres'
});

async function main() {
  const boms = await pool.query("SELECT * FROM public.boms");
  console.log('BOMs:', JSON.stringify(boms.rows, null, 2));

  const items = await pool.query("SELECT * FROM public.bom_items");
  console.log('BOM Items:', JSON.stringify(items.rows, null, 2));

  const crs = await pool.query("SELECT * FROM public.change_requests");
  console.log('Change Requests:', JSON.stringify(crs.rows, null, 2));

  await pool.end();
}

main();
