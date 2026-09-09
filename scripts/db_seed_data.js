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

    // 1. Truncate existing data to ensure fresh, consistent seed state
    console.log('Truncating tables for clean seed...');
    await client.query('TRUNCATE public.attendance, public.eod_updates, public.job_card_assignments, public.job_cards, public.notification_log, public.wo_status_history, public.work_orders, public.projects, public.profiles, public.tenant_settings, public.tenants CASCADE;');

    // 2. Seed Tenant
    console.log('Seeding tenant...');
    const tenantRes = await client.query(`
      INSERT INTO public.tenants (name, slug) 
      VALUES ('Canva Concepts Factory', 'canva-concepts-factory') 
      RETURNING id;
    `);
    const tenantId = tenantRes.rows[0].id;

    // Tenant settings
    await client.query(`
      INSERT INTO public.tenant_settings (tenant_id, max_daily_furniture_volume) 
      VALUES ($1, 25);
    `, [tenantId]);

    // 3. Seed Profiles (Users with explicit roles)
    console.log('Seeding profiles...');
    const fmRes = await client.query(`
      INSERT INTO public.profiles (full_name, email, designation, is_active) 
      VALUES ('Marcus Chen', 'marcus@canva.com', 'Factory Manager', true) 
      RETURNING user_id;
    `);
    const fmId = fmRes.rows[0].user_id;

    const superRes = await client.query(`
      INSERT INTO public.profiles (full_name, email, designation, is_active) 
      VALUES ('Sarah Jenkins', 'sarah@canva.com', 'Production Supervisor', true) 
      RETURNING user_id;
    `);
    const supervisorId = superRes.rows[0].user_id;

    const smRes = await client.query(`
      INSERT INTO public.profiles (full_name, email, designation, is_active) 
      VALUES ('David K.', 'david@canva.com', 'Site Manager', true) 
      RETURNING user_id;
    `);
    const smId = smRes.rows[0].user_id;

    // Seed Carpenters
    const carp1 = await client.query("INSERT INTO public.profiles (full_name, email, designation, is_active) VALUES ('Robert Hudson', 'robert@canva.com', 'Lead Carpenter', true) RETURNING user_id;");
    const robertId = carp1.rows[0].user_id;

    const carp2 = await client.query("INSERT INTO public.profiles (full_name, email, designation, is_active) VALUES ('Michael Santos', 'michael@canva.com', 'Senior Finisher', true) RETURNING user_id;");
    const michaelId = carp2.rows[0].user_id;

    const carp3 = await client.query("INSERT INTO public.profiles (full_name, email, designation, is_active) VALUES ('Anil Wilson', 'anil@canva.com', 'Junior Woodworker', true) RETURNING user_id;");
    const anilId = carp3.rows[0].user_id;

    // 4. Seed Projects (Parent Contracts)
    console.log('Seeding projects...');
    const proj1 = await client.query(`
      INSERT INTO public.projects (tenant_id, name, code, is_active) 
      VALUES ($1, 'Global Tech Headquarters', 'PRJ-2026-001', true) 
      RETURNING id;
    `, [tenantId]);
    const p1Id = proj1.rows[0].id;

    const proj2 = await client.query(`
      INSERT INTO public.projects (tenant_id, name, code, is_active) 
      VALUES ($1, 'Studio North Design Hub', 'PRJ-2026-002', true) 
      RETURNING id;
    `, [tenantId]);
    const p2Id = proj2.rows[0].id;

    // 5. Seed Work Orders
    console.log('Seeding work orders...');
    const wo1 = await client.query(`
      INSERT INTO public.work_orders (
        tenant_id, project_id, wo_number, title, client_type, client_name, project_name, stream,
        furniture_type, dimensions_l, dimensions_h, dimensions_d, delivery_terms, delivery_address,
        priority, status, created_by, production_quantity, client_po_value, committed_delivery_date
      ) VALUES (
        $1, $2, 'WO-8829-23', 'Executive Boardroom Suite - Walnut Series', 'b2b', 'Global Tech Holdings', 'Global Tech Headquarters', 'external_b2b',
        'Premium Office Desk', 2400, 750, 1200, 'included', 'Sector 5, Block B, Gurgaon',
        'critical', 'in_production', $3, 10, 480000, CURRENT_DATE + INTERVAL '5 days'
      ) RETURNING id;
    `, [tenantId, p1Id, fmId]);
    const woId1 = wo1.rows[0].id;

    const wo2 = await client.query(`
      INSERT INTO public.work_orders (
        tenant_id, project_id, wo_number, title, client_type, client_name, project_name, stream,
        furniture_type, dimensions_l, dimensions_h, dimensions_d, delivery_terms, delivery_address,
        priority, status, created_by, production_quantity, client_po_value, committed_delivery_date
      ) VALUES (
        $1, $2, 'WO-8835-23', 'Modular Coworking Pods - Indigo Edition', 'b2b', 'Studio North Architecture', 'Studio North Design Hub', 'external_b2b',
        'Acoustic Seating Pod', 1800, 1200, 1800, 'included', 'Outer Ring Road, Bangalore',
        'normal', 'bom_approved_pending_material', $3, 25, 1250000, CURRENT_DATE + INTERVAL '20 days'
      ) RETURNING id;
    `, [tenantId, p2Id, fmId]);
    const woId2 = wo2.rows[0].id;

    const wo3 = await client.query(`
      INSERT INTO public.work_orders (
        tenant_id, project_id, wo_number, title, client_type, client_name, project_name, stream,
        furniture_type, dimensions_l, dimensions_h, dimensions_d, delivery_terms, delivery_address,
        priority, status, created_by, production_quantity, client_po_value, committed_delivery_date
      ) VALUES (
        $1, $2, 'WO-8841-23', 'Hospitality Lobby Lounge - Custom Oak', 'b2b', 'Ritz Carlton Group', 'Lobby Lounge Custom Oak', 'external_b2b',
        'Custom Sofa Frame', 3200, 850, 900, 'included', 'Chanakyapuri, New Delhi',
        'high', 'in_production', $3, 5, 750000, CURRENT_DATE + INTERVAL '12 days'
      ) RETURNING id;
    `, [tenantId, p1Id, fmId]);

    // Status histories
    await client.query("INSERT INTO public.wo_status_history (tenant_id, wo_id, new_status, changed_by, reason) VALUES ($1, $2, 'draft', $3, 'Created'), ($1, $2, 'in_production', $3, 'Materials released');", [tenantId, woId1, fmId]);
    await client.query("INSERT INTO public.wo_status_history (tenant_id, wo_id, new_status, changed_by, reason) VALUES ($1, $2, 'draft', $3, 'Created'), ($1, $2, 'bom_approved_pending_material', $3, 'BOM checklist signed off');", [tenantId, woId2, fmId]);

    // 6. Seed Attendance (Present workers today)
    console.log('Seeding attendance...');
    const today = new Date().toISOString().split('T')[0];
    await client.query("INSERT INTO public.attendance (tenant_id, employee_id, date, status, check_in_time, check_out_time, marked_by) VALUES ($1, $2, $3, 'present', '08:00:00', '17:30:00', $4);", [tenantId, robertId, today, supervisorId]);
    await client.query("INSERT INTO public.attendance (tenant_id, employee_id, date, status, check_in_time, check_out_time, marked_by) VALUES ($1, $2, $3, 'present', '08:00:00', '17:30:00', $4);", [tenantId, michaelId, today, supervisorId]);
    await client.query("INSERT INTO public.attendance (tenant_id, employee_id, date, status, check_in_time, check_out_time, marked_by) VALUES ($1, $2, $3, 'present', '08:15:00', '17:30:00', $4);", [tenantId, anilId, today, supervisorId]);

    // 7. Seed Job Cards & Assignments
    console.log('Seeding job cards...');
    const jc1 = await client.query(`
      INSERT INTO public.job_cards (
        tenant_id, jc_number, wo_id, date, shift, production_stage, title, description, status, priority, quantity_assigned, quantity_completed, created_by
      ) VALUES ($1, 'JC-0001', $2, $3, 'day', 'assembly', 'Reception Counter Assembly', 'Assemble main oak panels', 'in_progress', 'high', 3, 2, $4)
      RETURNING id;
    `, [tenantId, woId1, today, supervisorId]);
    await client.query("INSERT INTO public.job_card_assignments (job_card_id, carpenter_id, is_lead) VALUES ($1, $2, true);", [jc1.rows[0].id, robertId]);

    const jc2 = await client.query(`
      INSERT INTO public.job_cards (
        tenant_id, jc_number, wo_id, date, shift, production_stage, title, description, status, priority, quantity_assigned, quantity_completed, created_by
      ) VALUES ($1, 'JC-0002', $2, $3, 'day', 'edgebanding', 'Veneer Edge Banding', 'Apply glue and tape to pod edges', 'in_progress', 'normal', 10, 4, $4)
      RETURNING id;
    `, [tenantId, woId2, today, supervisorId]);
    await client.query("INSERT INTO public.job_card_assignments (job_card_id, carpenter_id, is_lead) VALUES ($1, $2, true);", [jc2.rows[0].id, michaelId]);

    const jc3 = await client.query(`
      INSERT INTO public.job_cards (
        tenant_id, jc_number, wo_id, date, shift, production_stage, title, description, status, priority, quantity_assigned, quantity_completed, pause_reason, created_by
      ) VALUES ($1, 'JC-0003', $2, $3, 'day', 'finishing', 'Oak Polish Sanding', 'Sand outer frames', 'paused', 'critical', 5, 0, 'Awaiting Sandpaper Delivery', $4)
      RETURNING id;
    `, [tenantId, woId1, today, supervisorId]);
    await client.query("INSERT INTO public.job_card_assignments (job_card_id, carpenter_id, is_lead) VALUES ($1, $2, true);", [jc3.rows[0].id, anilId]);

    // 8. Seed Notification Log / Alerts
    console.log('Seeding notifications...');
    await client.query(`
      INSERT INTO public.notification_log (
        tenant_id, recipient_id, notification_type, channel, title, body, is_read
      ) VALUES 
      ($1, $2, 'material_shortage', 'in_app', 'Machine breakdown on Edgebanding Line B', 'Production line B edgebander requires mechanical assistance.', false),
      ($1, $2, 'bom_approval', 'in_app', 'Low Stock: Laminate glue (Stock B) - 12L remaining', 'Requisition needed for pod assembly glue.', false),
      ($1, $2, 'qc_passed', 'in_app', 'Overdue Invoice: #INV-2026-089 (Global Tech)', 'Invoice payment remains unverified.', false);
    `, [tenantId, fmId]);

    // 9. Seed Catalogs (UOM and Generic Materials)
    console.log('Seeding UOM and generic materials...');
    await client.query("INSERT INTO public.uom_master (code, name) VALUES ('Nos', 'Numbers'), ('Sft', 'Square Feet'), ('Ltr', 'Liters') ON CONFLICT DO NOTHING;");
    
    const mat1 = await client.query("INSERT INTO public.generic_materials (name, default_uom) VALUES ('Oak Veneer Plywood 18mm', 'Sft') RETURNING id;");
    const m1Id = mat1.rows[0].id;
    const mat2 = await client.query("INSERT INTO public.generic_materials (name, default_uom) VALUES ('Laminate Charcoal Grey 1mm', 'Sft') RETURNING id;");
    const m2Id = mat2.rows[0].id;
    const mat3 = await client.query("INSERT INTO public.generic_materials (name, default_uom) VALUES ('Wood Glue Heavy Duty', 'Ltr') RETURNING id;");
    const m3Id = mat3.rows[0].id;

    // 10. Seed BOM and BOM Items
    console.log('Seeding BOM and items...');
    const bomRes = await client.query(`
      INSERT INTO public.boms (tenant_id, project_id, work_order_id, version, status, notes)
      VALUES ($1, $2, $3, 1, 'approved', 'Initial approved production BOM')
      RETURNING id;
    `, [tenantId, p1Id, woId1]);
    const bomId = bomRes.rows[0].id;

    await client.query(`
      INSERT INTO public.bom_items (bom_id, material_id, uom, planned_qty, available_qty, cost_per_unit, item_name)
      VALUES 
      ($1, $2, 'Sft', 120, 150, 450, 'Oak Veneer Plywood 18mm'),
      ($1, $3, 'Sft', 80, 40, 180, 'Laminate Charcoal Grey 1mm'),
      ($1, $4, 'Ltr', 15, 20, 220, 'Wood Glue Heavy Duty');
    `, [bomId, m1Id, m2Id, m3Id]);

    // 11. Seed Change Requests
    console.log('Seeding change requests...');
    await client.query(`
      INSERT INTO public.change_requests (
        tenant_id, wo_id, cr_number, reason, cost_impact, time_impact_days, status, created_by
      ) VALUES (
        $1, $2, 'CR-8829-01', 'Increase walnut tabletop width by 200mm per client update', 35000, 3, 'approved', $3
      );
    `, [tenantId, woId1, supervisorId]);

    await client.query('COMMIT');
    console.log('Database seeding complete successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
