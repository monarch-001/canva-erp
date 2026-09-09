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

    // 1. Add project_id to work_orders if missing
    console.log('Adding project_id to work_orders table...');
    await client.query(`
      ALTER TABLE public.work_orders 
      ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
    `);

    // 2. Add drawing_document_id to work_orders if missing
    console.log('Adding drawing_document_id to work_orders table...');
    await client.query(`
      ALTER TABLE public.work_orders 
      ADD COLUMN IF NOT EXISTS drawing_document_id UUID;
    `);

    // 3. Ensure wo_status_history has foreign keys referencing projects or work_orders
    console.log('Validating wo_status_history table...');
    await client.query(`
      ALTER TABLE public.wo_status_history 
      ADD COLUMN IF NOT EXISTS reason TEXT;
    `);

    // 4. Ensure job_cards table has correct wo_id column
    console.log('Validating job_cards table...');
    await client.query(`
      ALTER TABLE public.job_cards 
      ADD COLUMN IF NOT EXISTS is_rework BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS rework_reason TEXT,
      ADD COLUMN IF NOT EXISTS original_jc_id UUID REFERENCES public.job_cards(id) ON DELETE SET NULL;
    `);

    // 5. Ensure notification_log exists
    console.log('Validating notification_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.notification_log (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        recipient_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
        notification_type TEXT NOT NULL,
        channel TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        reference_type TEXT,
        reference_id UUID,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('Database alignment complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Alignment failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
