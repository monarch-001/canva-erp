import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;

const schemaPath = path.join(__dirname, '../schema/chaabee_sql.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

// Split SQL into individual statements by semicolon
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

async function testStatements() {
  const client = new Client({
    connectionString: 'postgresql://postgres.pygyledajlezuthjsjyy:canva%40%23chaabee@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  await client.connect();
  console.log('Connected. Validating statements one by one...');

  let successCount = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.query(stmt);
      successCount++;
    } catch (err) {
      console.error(`\n❌ Error on statement #${i + 1}:\n${stmt.substring(0, 150)}...\n--> Error: ${err.message}\n`);
    }
  }

  console.log(`Finished: ${successCount} / ${statements.length} statements executed successfully!`);
  await client.end();
}

testStatements();
