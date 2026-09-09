import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/canva_erp_staging'
});

async function main() {
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log("TABLES IN DATABASE:");
    console.log(tablesRes.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
