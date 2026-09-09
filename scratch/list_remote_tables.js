import pg from 'pg';

const { Client } = pg;

async function checkRemoteTables() {
  const client = new Client({
    connectionString: 'postgresql://postgres.pygyledajlezuthjsjyy:canva%40%23chaabee@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name");
    console.log(`🎉 REMOTE SUPABASE DATABASE HAS ${res.rows.length} LIVE TABLES!`);
    console.log(res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}

checkRemoteTables();
