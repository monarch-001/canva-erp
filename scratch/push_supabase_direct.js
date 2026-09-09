import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

// Supabase Direct Pooler Postgres Connection
const hosts = [
  'aws-0-ap-northeast-2.pooler.supabase.com',
  'aws-0-ap-south-1.pooler.supabase.com',
  'db.pygyledajlezuthjsjyy.supabase.co'
];

async function uploadSchema() {
  const schemaPath = path.join(__dirname, '../schema/chaabee_sql.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  for (const host of hosts) {
    console.log(`Trying connection to ${host}...`);
    // Try port 6543 and 5432
    for (const port of [6543, 5432]) {
      const connectionString = `postgresql://postgres.pygyledajlezuthjsjyy:canva%40%23chaabee@${host}:${port}/postgres`;
      const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });

      try {
        await client.connect();
        console.log(`✅ Connected successfully to ${host}:${port}! Uploading schema...`);
        await client.query(sql);
        console.log('🎉 SUCCESS: All tables and schema uploaded to remote Supabase DB!');
        await client.end();
        return;
      } catch (err) {
        console.log(`Failed ${host}:${port} -> ${err.message}`);
        await client.end().catch(() => {});
      }
    }
  }
}

uploadSchema();
