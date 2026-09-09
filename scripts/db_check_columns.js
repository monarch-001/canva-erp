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
    const checkColumns = async (tableName) => {
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      console.log(`\nColumns in '${tableName}':`);
      res.rows.forEach(r => console.log(` - ${r.column_name}: ${r.data_type}`));
    };

    await checkColumns('projects');
    await checkColumns('profiles');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
