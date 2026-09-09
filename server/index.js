import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Postgres Pool Connection
const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new pg.Pool({
      host: 'localhost',
      port: 5432,
      database: 'canva_erp_staging',
      user: 'postgres',
      password: 'postgres'
    });


// Seed some test data to the staging database on server startup
async function seedStagingData() {
  try {
    const client = await pool.connect();
    
    // Check if tenants exist, if not seed one
    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    let tenantId;
    if (tenantRes.rows.length === 0) {
      const newTenant = await client.query(
        "INSERT INTO public.tenants (name, slug) VALUES ('Main Factory', 'main-factory') RETURNING id"
      );
      tenantId = newTenant.rows[0].id;
      // Create settings
      await client.query(
        "INSERT INTO public.tenant_settings (tenant_id, max_daily_furniture_volume) VALUES ($1, 20)",
        [tenantId]
      );
    } else {
      tenantId = tenantRes.rows[0].id;
    }

    // Seed dummy profiles/users
    const profileRes = await client.query("SELECT user_id FROM public.profiles");
    let userId;
    if (profileRes.rows.length <= 1) {
      const newProfile = await client.query(
        "INSERT INTO public.profiles (full_name, email, designation) VALUES ('Marcus Chen', 'marcus@canva.com', 'Factory Manager') RETURNING user_id"
      );
      userId = newProfile.rows[0].user_id;
      
      // Seed workers for attendance list
      await client.query(
        "INSERT INTO public.profiles (full_name, email, designation) VALUES ('Robert Hudson', 'robert@canva.com', 'Lead Carpenter')"
      );
      await client.query(
        "INSERT INTO public.profiles (full_name, email, designation) VALUES ('Michael Santos', 'michael@canva.com', 'Senior Finisher')"
      );
      await client.query(
        "INSERT INTO public.profiles (full_name, email, designation) VALUES ('Anil Wilson', 'anil@canva.com', 'Junior Woodworker')"
      );
    } else {
      userId = profileRes.rows[0].user_id;
    }

    // Seed dummy clients (organisations)
    const orgRes = await client.query("SELECT id FROM public.organisations LIMIT 1");
    let orgId;
    if (orgRes.rows.length === 0) {
      const newOrg = await client.query(
        "INSERT INTO public.organisations (tenant_id, legal_name, display_name) VALUES ($1, 'Global Tech Holdings', 'Global Tech') RETURNING id",
        [tenantId]
      );
      orgId = newOrg.rows[0].id;
    } else {
      orgId = orgRes.rows[0].id;
    }

    // Seed dummy projects
    const projRes = await client.query("SELECT id FROM public.projects LIMIT 1");
    let projId;
    if (projRes.rows.length === 0) {
      const newProj = await client.query(
        "INSERT INTO public.projects (tenant_id, name, code) VALUES ($1, 'Executive Boardroom Walnut', 'PRJ-8829') RETURNING id",
        [tenantId]
      );
      projId = newProj.rows[0].id;
    } else {
      projId = projRes.rows[0].id;
    }

    // Seed dummy work orders
    const woCount = await client.query("SELECT COUNT(*) FROM public.work_orders");
    let woId1, woId2;
    if (parseInt(woCount.rows[0].count) === 0) {
      const woRes = await client.query(`
        INSERT INTO public.work_orders (
          tenant_id, wo_number, title, client_type, client_name, project_name, stream,
          furniture_type, dimensions_l, dimensions_h, dimensions_d, delivery_terms,
          priority, status, created_by, production_quantity, committed_delivery_date
        ) VALUES 
        ($1, 'WO-8829-23', 'Executive Boardroom Suite - Walnut Series', 'b2b', 'Global Tech Holdings', 'Executive Boardroom Walnut', 'external_b2b', 'Premium Office / Seating', 2400, 750, 1200, 'included', 'critical', 'in_production', $2, 12, CURRENT_DATE + INTERVAL '2 days'),
        ($1, 'WO-8835-23', 'Modular Coworking Pods - Indigo Edition', 'b2b', 'Studio North Architecture', 'Modular Coworking Pods', 'external_b2b', 'Modular Systems', 1800, 1200, 1800, 'included', 'normal', 'bom_approved_pending_material', $2, 45, CURRENT_DATE + INTERVAL '24 days'),
        ($1, 'WO-8841-23', 'Hospitality Lobby Lounge - Custom Oak', 'b2b', 'Ritz Carlton Group', 'Lobby Lounge Custom Oak', 'external_b2b', 'Hospitality / Decor', 3200, 850, 900, 'included', 'high', 'in_production', $2, 8, CURRENT_DATE + INTERVAL '8 days'),
        ($1, 'WO-8850-23', 'Retail Display Unit - Matte Black', 'd2c', 'Urban Outfitters HQ', 'Display Unit Matte Black', 'd2c', 'Retail Fixtures', 1200, 1800, 450, 'included', 'normal', 'draft', $2, 110, CURRENT_DATE + INTERVAL '45 days')
        RETURNING id
      `, [tenantId, userId]);
      woId1 = woRes.rows[0].id;
      woId2 = woRes.rows[1].id;
      console.log('Staging database seeded with initial test data.');
    } else {
      const woRes = await client.query("SELECT id FROM public.work_orders LIMIT 2");
      woId1 = woRes.rows[0]?.id;
      woId2 = woRes.rows[1]?.id;
    }

    // Seed dummy job cards and assignments
    const jcCount = await client.query("SELECT COUNT(*) FROM public.job_cards");
    if (parseInt(jcCount.rows[0].count) === 0 && woId1 && woId2) {
      // Get worker profiles
      const robertRes = await client.query("SELECT user_id FROM public.profiles WHERE full_name = 'Robert Hudson' LIMIT 1");
      const michaelRes = await client.query("SELECT user_id FROM public.profiles WHERE full_name = 'Michael Santos' LIMIT 1");
      const anilRes = await client.query("SELECT user_id FROM public.profiles WHERE full_name = 'Anil Wilson' LIMIT 1");
      
      const robertId = robertRes.rows[0]?.user_id;
      const michaelId = michaelRes.rows[0]?.user_id;
      const anilId = anilRes.rows[0]?.user_id;

      if (robertId && michaelId && anilId) {
        // Insert JC 1
        const jc1 = await client.query(`
          INSERT INTO public.job_cards (
            tenant_id, jc_number, wo_id, date, shift, production_stage, title, description, status, priority, quantity_assigned, quantity_completed, created_by
          ) VALUES ($1, 'JC-0001', $2, CURRENT_DATE, 'day', 'assembly', 'Reception Counter - Assembly', 'Assemble lead reception counters', 'in_progress', 'high', 3, 2, $3)
          RETURNING id
        `, [tenantId, woId1, userId]);
        await client.query("INSERT INTO public.job_card_assignments (job_card_id, carpenter_id, is_lead) VALUES ($1, $2, true)", [jc1.rows[0].id, robertId]);

        // Insert JC 2
        const jc2 = await client.query(`
          INSERT INTO public.job_cards (
            tenant_id, jc_number, wo_id, date, shift, production_stage, title, description, status, priority, quantity_assigned, quantity_completed, created_by
          ) VALUES ($1, 'JC-0002', $2, CURRENT_DATE, 'day', 'edgebanding', 'Modular Cabinet - Edge Banding', 'Apply veneer tape to main cabinets', 'in_progress', 'normal', 10, 4, $3)
          RETURNING id
        `, [tenantId, woId2, userId]);
        await client.query("INSERT INTO public.job_card_assignments (job_card_id, carpenter_id, is_lead) VALUES ($1, $2, true)", [jc2.rows[0].id, michaelId]);

        // Insert JC 3
        const jc3 = await client.query(`
          INSERT INTO public.job_cards (
            tenant_id, jc_number, wo_id, date, shift, production_stage, title, description, status, priority, quantity_assigned, quantity_completed, pause_reason, created_by
          ) VALUES ($1, 'JC-0003', $2, CURRENT_DATE, 'day', 'finishing', 'Wall Paneling - Sanding', 'Polish outer panels', 'paused', 'critical', 15, 0, 'Awaiting Plywood Delivery', $3)
          RETURNING id
        `, [tenantId, woId1, userId]);
        await client.query("INSERT INTO public.job_card_assignments (job_card_id, carpenter_id, is_lead) VALUES ($1, $2, true)", [jc3.rows[0].id, anilId]);

        console.log('Staging database seeded with dummy job cards.');
      }
    }

    // Seed dummy notifications
    const notifCount = await client.query("SELECT COUNT(*) FROM public.notification_log");
    if (parseInt(notifCount.rows[0].count) === 0 && woId1 && woId2) {
      await client.query(`
        INSERT INTO public.notification_log (
          tenant_id, recipient_id, notification_type, channel, title, body, reference_type, reference_id, is_read
        ) VALUES 
        ($1, $2, 'material_shortage', 'in_app', 'Critical: Laminate glue shortage', 'Production for WO-8829-23 is paused on Assembly Stage', 'work_order', $3, false),
        ($1, $2, 'bom_approval', 'in_app', 'Action Required: BOM Review Needed', 'WO-8835-23 requires BOM approval by Factory Manager', 'work_order', $4, false),
        ($1, $2, 'qc_passed', 'in_app', 'QC Passed: WO-8841-23', 'Hospitality Lobby Lounge passed final Quality Check', 'work_order', $3, false)
      `, [tenantId, userId, woId1, woId2]);
      console.log('Staging database seeded with initial notification logs.');
    }

    client.release();
  } catch (err) {
    console.error('Failed to seed staging database:', err);
  }
}

// User Directory API Endpoints
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query("SELECT user_id, full_name, email, designation, is_active FROM public.profiles ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users list' });
  }
});

app.post('/api/users/create', async (req, res) => {
  const { full_name, email, designation } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO public.profiles (full_name, email, designation) VALUES ($1, $2, $3) RETURNING *",
      [full_name, email, designation]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create new user profile' });
  }
});

// 1. Get Work Orders
app.get('/api/work-orders', async (req, res) => {
  const { status, client_type, priority, search } = req.query;
  
  let query = 'SELECT * FROM public.work_orders WHERE deleted_at IS NULL';
  const queryParams = [];

  if (status && status !== 'All Statuses') {
    queryParams.push(status);
    query += ` AND status = $${queryParams.length}`;
  }

  if (client_type && client_type !== 'All Clients') {
    queryParams.push(client_type);
    query += ` AND client_type = $${queryParams.length}`;
  }

  if (priority && priority !== 'Any Priority') {
    queryParams.push(priority);
    query += ` AND priority = $${queryParams.length}`;
  }

  if (search) {
    queryParams.push(`%${search}%`);
    query += ` AND (wo_number ILIKE $${queryParams.length} OR title ILIKE $${queryParams.length} OR client_name ILIKE $${queryParams.length})`;
  }

  query += ' ORDER BY created_at DESC';

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// 2. Create Work Order
app.post('/api/work-orders', async (req, res) => {
  const {
    title, client_type, client_name, project_name, stream,
    furniture_type, dimensions_l, dimensions_h, dimensions_d,
    finish_type, finish_detail, delivery_terms, delivery_address,
    requested_delivery_date, priority, production_quantity,
    client_po_reference, client_po_value
  } = req.body;

  try {
    // Generate sequential work order number
    const year = new Date().getFullYear().toString().slice(-2);
    const countRes = await pool.query("SELECT COUNT(*) FROM public.work_orders");
    const count = parseInt(countRes.rows[0].count) + 1;
    const wo_number = `WO-${count.toString().padStart(4, '0')}-${year}`;

    // Get active tenant id
    const tenantRes = await pool.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;

    // Get active user profile
    const profileRes = await pool.query("SELECT user_id FROM public.profiles LIMIT 1");
    const created_by = profileRes.rows[0].user_id;

    const query = `
      INSERT INTO public.work_orders (
        tenant_id, wo_number, title, client_type, client_name, project_name, stream,
        furniture_type, dimensions_l, dimensions_h, dimensions_d, finish_type, finish_detail,
        delivery_terms, delivery_address, requested_delivery_date, priority,
        production_quantity, created_by, client_po_reference, client_po_value, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'draft')
      RETURNING *
    `;

    const result = await pool.query(query, [
      tenant_id, wo_number, title, client_type, client_name, project_name, stream,
      furniture_type, dimensions_l, dimensions_h, dimensions_d, finish_type, finish_detail,
      delivery_terms, delivery_address, requested_delivery_date, priority,
      production_quantity, created_by, client_po_reference, client_po_value
    ]);

    // Insert history record
    await pool.query(
      "INSERT INTO public.wo_status_history (tenant_id, wo_id, new_status, changed_by, reason) VALUES ($1, $2, 'draft', $3, 'Work order created')",
      [tenant_id, result.rows[0].id, created_by]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// 2b. Get Work Order Production Progress
app.get('/api/work-orders/:id/production-progress', async (req, res) => {
  try {
    const woId = req.params.id;
    const woRes = await pool.query("SELECT * FROM public.work_orders WHERE id = $1 AND deleted_at IS NULL", [woId]);
    if (woRes.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    const wo = woRes.rows[0];

    // Fetch related job card statistics to represent actual stage counts
    const jcRes = await pool.query(`
      SELECT status, quantity_assigned, estimated_hours
      FROM public.job_cards
      WHERE wo_id = $1 AND deleted_at IS NULL
    `, [woId]);

    let complete = 0;
    let in_progress = 0;
    let not_started = 0;
    let total_units = wo.production_quantity || 1;
    let estimated_hours = 0;

    jcRes.rows.forEach(jc => {
      estimated_hours += parseFloat(jc.estimated_hours) || 0;
      if (jc.status === 'completed') {
        complete += jc.quantity_assigned || 0;
      } else if (jc.status === 'in_progress') {
        in_progress += jc.quantity_assigned || 0;
      } else {
        not_started += jc.quantity_assigned || 0;
      }
    });

    const material_wait = Math.max(0, total_units - complete - in_progress - not_started);

    const responseData = {
      wo_number: wo.wo_number,
      wo_title: wo.title,
      total_units,
      complete,
      in_progress,
      material_wait,
      not_started,
      stages: [
        { stage: 'Cutting',      done: complete, in_prog: in_progress, pending: not_started, blocked: material_wait },
        { stage: 'Edge Banding', done: Math.max(0, complete - 1), in_prog: 0, pending: total_units - Math.max(0, complete - 1),  blocked: 0 },
        { stage: 'Assembly',     done: 0, in_prog: in_progress, pending: total_units - in_progress, blocked: 0 },
        { stage: 'Finishing',    done: 0, in_prog: 0, pending: total_units, blocked: 0 },
        { stage: 'Hardware',     done: 0, in_prog: 0, pending: total_units, blocked: 0 },
      ],
      carpenters: [
        { name: 'Ramesh Kumar', assignment: in_progress > 0 ? 'Assembly (in progress)' : 'Unassigned today', is_active: in_progress > 0 },
        { name: 'Suresh Yadav', assignment: 'Unassigned today', is_active: false },
      ],
      materials: [
        { name: 'Plywood 18mm', status: 'available', detail: 'Available (12 sheets)' },
        { name: 'Laminate', status: 'available', detail: 'Available (48 sqft)' },
      ],
      estimated_hours: estimated_hours || 45,
      actual_hours: Math.round(estimated_hours * 0.4) || 18,
      labour_cost_to_date: Math.round(estimated_hours * 100) || 4846,
      est_total_labour: Math.round(estimated_hours * 250) || 12115,
    };

    res.json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve production progress' });
  }
});

// 3. Get Work Order Detail
app.get('/api/work-orders/:id', async (req, res) => {
  try {
    let woId = req.params.id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(woId);
    
    let woRes;
    if (isUuid) {
      woRes = await pool.query("SELECT * FROM public.work_orders WHERE id = $1 AND deleted_at IS NULL", [woId]);
    } else {
      woRes = await pool.query("SELECT * FROM public.work_orders WHERE wo_number = $1 AND deleted_at IS NULL", [woId]);
    }
    
    if (woRes.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    const wo = woRes.rows[0];
    woId = wo.id;
    
    // Get history
    const historyRes = await pool.query(`
      SELECT h.*, p.full_name as changer_name 
      FROM public.wo_status_history h
      LEFT JOIN public.profiles p ON h.changed_by = p.user_id
      WHERE h.wo_id = $1
      ORDER BY h.created_at DESC
    `, [woId]);

    // Get drawings
    const drawingsRes = await pool.query("SELECT * FROM public.wo_drawings WHERE wo_id = $1 ORDER BY created_at DESC", [woId]);

    // Get BOM and items
    const bomRes = await pool.query("SELECT * FROM public.boms WHERE work_order_id = $1 ORDER BY created_at DESC LIMIT 1", [woId]);
    let bom = null;
    let bomItems = [];
    if (bomRes.rows.length > 0) {
      bom = bomRes.rows[0];
      const itemsRes = await pool.query(`
        SELECT bi.*, gm.name as material_name 
        FROM public.bom_items bi
        JOIN public.generic_materials gm ON bi.material_id = gm.id
        WHERE bi.bom_id = $1
        ORDER BY bi.created_at ASC
      `, [bom.id]);
      bomItems = itemsRes.rows;
    }

    // Get Change Requests
    const crRes = await pool.query(`
      SELECT cr.*, p.full_name as creator_name 
      FROM public.change_requests cr
      LEFT JOIN public.profiles p ON cr.created_by = p.user_id
      WHERE cr.wo_id = $1
      ORDER BY cr.created_at DESC
    `, [woId]);

    res.json({
      work_order: woRes.rows[0],
      history: historyRes.rows,
      drawings: drawingsRes.rows,
      bom: bom ? { ...bom, items: bomItems } : null,
      change_requests: crRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch work order detail' });
  }
});

// 3.5 Update Work Order Details
app.put('/api/work-orders/:id', async (req, res) => {
  const {
    title,
    dimensions_l,
    dimensions_h,
    dimensions_d,
    delivery_terms,
    priority,
    production_quantity,
    special_notes
  } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE public.work_orders 
      SET 
        title = $1,
        dimensions_l = $2,
        dimensions_h = $3,
        dimensions_d = $4,
        delivery_terms = $5,
        priority = $6,
        production_quantity = $7,
        notes = $8,
        version = version + 1,
        updated_at = NOW()
      WHERE id = $9 AND deleted_at IS NULL
      RETURNING *
    `, [
      title,
      dimensions_l,
      dimensions_h,
      dimensions_d,
      delivery_terms,
      priority,
      production_quantity,
      special_notes,
      req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update work order details' });
  }
});

// 4. Update Work Order Committed Date
app.put('/api/work-orders/:id/committed-date', async (req, res) => {
  const { committed_delivery_date, reason } = req.body;
  try {
    const profileRes = await pool.query("SELECT user_id FROM public.profiles LIMIT 1");
    const user_id = profileRes.rows[0].user_id;

    const tenantRes = await pool.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;

    const result = await pool.query(
      "UPDATE public.work_orders SET committed_delivery_date = $1, version = version + 1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [committed_delivery_date, req.params.id]
    );

    // Insert history
    await pool.query(
      "INSERT INTO public.wo_status_history (tenant_id, wo_id, old_status, new_status, changed_by, reason) VALUES ($1, $2, $3, $3, $4, $5)",
      [tenant_id, req.params.id, result.rows[0].status, user_id, reason || 'Committed delivery date set']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update committed delivery date' });
  }
});

// 5. Cancel Work Order (Atomic cancellation & reservation release)
app.post('/api/work-orders/:id/cancel', async (req, res) => {
  const { reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const user_id = profileRes.rows[0].user_id;

    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;

    const woRes = await client.query("SELECT status FROM public.work_orders WHERE id = $1", [req.params.id]);
    const oldStatus = woRes.rows[0]?.status;

    // Update status
    const result = await client.query(
      "UPDATE public.work_orders SET status = 'cancelled', cancellation_reason = $1, version = version + 1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [reason, req.params.id]
    );

    // Insert history
    await client.query(
      "INSERT INTO public.wo_status_history (tenant_id, wo_id, old_status, new_status, changed_by, reason) VALUES ($1, $2, $3, 'cancelled', $4, $5)",
      [tenant_id, req.params.id, oldStatus, user_id, reason]
    );

    // Simulate atomic release of material allocations here
    // In staging, we just print a log
    console.log(`[Staging] Material reservations released atomically for cancelled Work Order: ${req.params.id}`);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Cancellation failed' });
  } finally {
    client.release();
  }
});

// 5.1 Create Change Request for Work Order
app.post('/api/work-orders/:id/change-requests', async (req, res) => {
  const { changeType, description, reason, affectsDelivery } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Retrieve default profile
    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const user_id = profileRes.rows[0].user_id;

    // Retrieve default tenant
    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;

    // Generate a unique CR number
    const countRes = await client.query("SELECT COUNT(*) FROM public.change_requests");
    const count = parseInt(countRes.rows[0].count) + 1;
    const crNumber = `CR-WO-${count}-${Math.floor(100 + Math.random() * 900)}`;

    const insertRes = await client.query(`
      INSERT INTO public.change_requests (
        tenant_id, wo_id, cr_number, reason, cost_impact, time_impact_days, status, created_by, notes
      ) VALUES ($1, $2, $3, $4, 0, $5, 'pending', $6, $7)
      RETURNING *
    `, [
      tenant_id,
      req.params.id,
      crNumber,
      `${changeType}: ${reason}`,
      affectsDelivery ? 5 : 0,
      user_id,
      description
    ]);

    await client.query('COMMIT');
    res.json(insertRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create change request' });
  } finally {
    client.release();
  }
});

// 5.2.5 Fetch list of all Change Requests
app.get('/api/change-requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cr.*, p.full_name as creator_name, wo.wo_number, wo.title as wo_title
      FROM public.change_requests cr
      LEFT JOIN public.profiles p ON cr.created_by = p.user_id
      LEFT JOIN public.work_orders wo ON cr.wo_id = wo.id
      ORDER BY cr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch change requests' });
  }
});

// 5.3 Fetch single Change Request Detail
app.get('/api/change-requests/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cr.*, p.full_name as creator_name, wo.wo_number, wo.title as wo_title
      FROM public.change_requests cr
      LEFT JOIN public.profiles p ON cr.created_by = p.user_id
      LEFT JOIN public.work_orders wo ON cr.wo_id = wo.id
      WHERE cr.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch change request details' });
  }
});

// 5.4 Update Change Request Status (Approve / Reject)
app.post('/api/change-requests/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Retrieve default profile
    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const user_id = profileRes.rows[0].user_id;

    // Update change request
    const crRes = await client.query(`
      UPDATE public.change_requests
      SET status = $1, approved_by = $2, notes = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, user_id, notes, req.params.id]);

    if (crRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Change request not found' });
    }

    await client.query('COMMIT');
    res.json(crRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update change request status' });
  } finally {
    client.release();
  }
});

// 6.3 Approve BOM (Updates status to approved and triggers material allocations)
app.post('/api/work-orders/:id/bom/approve', async (req, res) => {
  const { notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Retrieve default profile
    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const user_id = profileRes.rows[0].user_id;

    // Fetch the BOM linked to this work order
    const bomRes = await client.query("SELECT * FROM public.boms WHERE work_order_id = $1", [req.params.id]);
    if (bomRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No BOM found linked to this work order' });
    }
    const bom = bomRes.rows[0];

    // Update BOM status
    const updateRes = await client.query(`
      UPDATE public.boms
      SET status = 'approved', notes = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [notes, bom.id]);

    // Also update Work Order status to 'bom_approved_pending_material'
    await client.query(`
      UPDATE public.work_orders
      SET status = 'bom_approved_pending_material', updated_at = NOW()
      WHERE id = $1
    `, [req.params.id]);

    await client.query('COMMIT');
    res.json(updateRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to approve BOM' });
  } finally {
    client.release();
  }
});

// 5.2 Duplicate Work Order (Creates a draft clone of the specified Work Order)
app.post('/api/work-orders/:id/duplicate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch the original work order details
    const originalRes = await client.query("SELECT * FROM public.work_orders WHERE id = $1 AND deleted_at IS NULL", [req.params.id]);
    if (originalRes.rows.length === 0) {
      return res.status(404).json({ error: 'Original work order not found' });
    }
    const orig = originalRes.rows[0];

    // Generate a new unique work order number
    const countRes = await client.query("SELECT COUNT(*) FROM public.work_orders");
    const count = parseInt(countRes.rows[0].count) + 1;
    const newWoNumber = `WO-DUP-${count}-${Math.floor(100 + Math.random() * 900)}`;

    // Insert cloned work order in draft status
    const insertRes = await client.query(`
      INSERT INTO public.work_orders (
        tenant_id, wo_number, title, client_type, client_name, project_name, stream,
        furniture_type, dimensions_l, dimensions_h, dimensions_d, delivery_terms,
        priority, status, created_by, production_quantity, committed_delivery_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'normal', 'draft', $13, $14, CURRENT_DATE + INTERVAL '14 days')
      RETURNING *
    `, [
      orig.tenant_id,
      newWoNumber,
      `Cloned: ${orig.title}`,
      orig.client_type,
      orig.client_name,
      orig.project_name,
      orig.stream,
      orig.furniture_type,
      orig.dimensions_l,
      orig.dimensions_h,
      orig.dimensions_d,
      orig.delivery_terms,
      orig.created_by,
      orig.production_quantity
    ]);

    await client.query('COMMIT');
    res.json({ id: insertRes.rows[0].id, work_order: insertRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to duplicate work order' });
  } finally {
    client.release();
  }
});

// 5.5 Bulk Update Work Orders Status
app.post('/api/work-orders/bulk-status', async (req, res) => {
  const { ids, status, reason } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0 || !status) {
    return res.status(400).json({ error: 'Missing required parameters: ids (array), status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const user_id = profileRes.rows[0].user_id;

    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;

    // Check if there are active rework job cards for these work orders when attempting to dispatch
    if (['ready_for_dispatch', 'in_transit', 'delivered_confirmed'].includes(status)) {
      const activeReworkRes = await client.query(
        "SELECT id, jc_number, wo_id FROM public.job_cards WHERE wo_id = ANY($1) AND production_stage = 'rework' AND status NOT IN ('completed', 'cancelled') AND deleted_at IS NULL",
        [ids]
      );
      if (activeReworkRes.rows.length > 0) {
        return res.status(400).json({
          error: `Cannot update status: Active rework tasks (e.g. ${activeReworkRes.rows[0].jc_number}) must be completed before dispatching.`
        });
      }
    }

    // Fetch original statuses for history logging
    const woRes = await client.query("SELECT id, status FROM public.work_orders WHERE id = ANY($1)", [ids]);
    const oldStatusMap = {};
    woRes.rows.forEach(r => {
      oldStatusMap[r.id] = r.status;
    });

    // Update statuses
    const updateRes = await client.query(
      "UPDATE public.work_orders SET status = $1, version = version + 1, updated_at = NOW() WHERE id = ANY($2) RETURNING *",
      [status, ids]
    );

    // Insert history logs for each updated work order
    for (const id of ids) {
      await client.query(
        "INSERT INTO public.wo_status_history (tenant_id, wo_id, old_status, new_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5, $6)",
        [tenant_id, id, oldStatusMap[id] || null, status, user_id, reason || 'Bulk status update']
      );
    }

    await client.query('COMMIT');
    res.json({ updated: updateRes.rows.length, rows: updateRes.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Bulk status update failed' });
  } finally {
    client.release();
  }
});

// 6. Get Attendance Roster for Date
app.get('/api/attendance', async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const profilesRes = await pool.query(
      "SELECT user_id, full_name, email, designation FROM public.profiles"
    );

    const attendanceRes = await pool.query(
      "SELECT * FROM public.attendance WHERE date = $1",
      [targetDate]
    );

    const attendanceMap = {};
    attendanceRes.rows.forEach(row => {
      attendanceMap[row.employee_id] = row;
    });

    const roster = profilesRes.rows.map(profile => {
      const record = attendanceMap[profile.user_id];
      return {
        employee_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        designation: profile.designation,
        status: record ? record.status : 'present',
        check_in_time: record ? record.check_in_time : '08:00:00',
        check_out_time: record ? record.check_out_time : '17:30:00',
        ot_hours: record ? parseFloat(record.ot_hours) : 0,
        notes: record ? record.notes : ''
      };
    });

    res.json(roster);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve attendance roster' });
  }
});

// 7. Save Daily Attendance (Upsert)
app.post('/api/attendance', async (req, res) => {
  const { date, records } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;

    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const marked_by = profileRes.rows[0].user_id;

    for (const record of records) {
      await client.query(`
        INSERT INTO public.attendance (
          tenant_id, employee_id, date, status, check_in_time, check_out_time, ot_hours, notes, marked_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (employee_id, date) DO UPDATE SET
          status = EXCLUDED.status,
          check_in_time = EXCLUDED.check_in_time,
          check_out_time = EXCLUDED.check_out_time,
          ot_hours = EXCLUDED.ot_hours,
          notes = EXCLUDED.notes,
          marked_by = EXCLUDED.marked_by,
          marked_at = NOW()
      `, [
        tenant_id,
        record.employee_id,
        targetDate,
        record.status,
        (record.check_in_time && record.check_in_time !== '--') ? record.check_in_time : null,
        (record.check_out_time && record.check_out_time !== '--') ? record.check_out_time : null,
        record.ot_hours || 0,
        record.notes || null,
        marked_by
      ]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Attendance records updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save attendance records' });
  } finally {
    client.release();
  }
});
// 8. Get Production Floor Dashboard Summary
app.get('/api/production/dashboard', async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // 1. Manpower stats
    const attendanceRes = await pool.query(
      "SELECT status FROM public.attendance WHERE date = $1",
      [targetDate]
    );
    const presentCount = attendanceRes.rows.filter(r => r.status === 'present').length;
    const absentCount = attendanceRes.rows.filter(r => r.status === 'absent').length;

    // 2. Job Card stats
    const jcStatsRes = await pool.query(
      "SELECT status, id FROM public.job_cards WHERE date = $1",
      [targetDate]
    );
    const activeJobs = jcStatsRes.rows.filter(r => r.status === 'assigned' || r.status === 'in_progress').length;
    const completedToday = jcStatsRes.rows.filter(r => r.status === 'completed').length;
    const inProgress = jcStatsRes.rows.filter(r => r.status === 'in_progress').length;
    const notStarted = jcStatsRes.rows.filter(r => r.status === 'assigned').length;
    const blocked = jcStatsRes.rows.filter(r => r.status === 'paused').length;

    // 3. Carpenter Board (Live grid)
    const carpenterBoardRes = await pool.query(`
      SELECT 
        p.user_id as carpenter_id,
        p.full_name,
        p.designation,
        p.avatar_url,
        jc.jc_number,
        jc.title as job_title,
        jc.production_stage,
        jc.status as job_status,
        jc.quantity_assigned,
        jc.quantity_completed,
        jc.pause_reason,
        jc.is_rework,
        jc.rework_reason,
        jc.wo_id,
        jc.id as job_card_id
      FROM public.job_card_assignments jca
      JOIN public.profiles p ON jca.carpenter_id = p.user_id
      JOIN public.job_cards jc ON jca.job_card_id = jc.id
      WHERE jc.date = $1 AND jc.deleted_at IS NULL
    `, [targetDate]);

    // 4. Work Order Progress summaries
    const woProgressRes = await pool.query(`
      SELECT 
        wo.id as wo_id,
        wo.wo_number,
        wo.title as wo_title,
        wo.priority,
        wo.production_quantity as total_quantity
      FROM public.work_orders wo
      WHERE wo.status IN ('in_production', 'bom_approved_pending_material') AND wo.deleted_at IS NULL
    `);

    const woProgress = [];
    for (const wo of woProgressRes.rows) {
      // Get completion count across all stages for this WO
      const jcRes = await pool.query(
        "SELECT production_stage, quantity_assigned, quantity_completed, status FROM public.job_cards WHERE wo_id = $1 AND date <= $2",
        [wo.wo_id, targetDate]
      );

      const stages = {
        cutting: { done: 0, total: 0 },
        edgebanding: { done: 0, total: 0 },
        assembly: { done: 0, total: 0 }
      };

      let completedQty = 0;
      let assignedQty = 0;

      jcRes.rows.forEach(r => {
        assignedQty += r.quantity_assigned;
        completedQty += r.quantity_completed;

        if (r.production_stage === 'cutting') {
          stages.cutting.total += r.quantity_assigned;
          stages.cutting.done += r.quantity_completed;
        } else if (r.production_stage === 'edgebanding') {
          stages.edgebanding.total += r.quantity_assigned;
          stages.edgebanding.done += r.quantity_completed;
        } else if (r.production_stage === 'assembly') {
          stages.assembly.total += r.quantity_assigned;
          stages.assembly.done += r.quantity_completed;
        }
      });

      const overallPct = assignedQty > 0 ? Math.round((completedQty / assignedQty) * 100) : 0;

      woProgress.push({
        wo_number: wo.wo_number,
        wo_title: wo.wo_title,
        priority: wo.priority,
        overall_pct: overallPct,
        completed_qty: completedQty,
        assigned_qty: assignedQty,
        stages
      });
    }

    res.json({
      metrics: {
        present_carpenters: presentCount || 16, // fallback to mock visual values if not populated
        total_carpenters: (presentCount + absentCount) || 18,
        active_jobs: activeJobs || 12,
        completed_today: completedToday || 3,
        in_progress: inProgress || 8,
        not_started: notStarted || 1,
        blocked: blocked || 1
      },
      carpenters: carpenterBoardRes.rows,
      wo_progress: woProgress,
      queue_logs: jcStatsRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve production floor dashboard metrics' });
  }
});
// 9. Get Job Card Form Options (Present workers & Active WOs)
app.get('/api/production/job-cards/form-data', async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    // 1. Get active work orders on floor
    const workOrdersRes = await pool.query(
      "SELECT id, wo_number, title, priority FROM public.work_orders WHERE status IN ('in_production', 'bom_approved_pending_material') AND deleted_at IS NULL"
    );

    // 2. Get workers present today
    const presentWorkersRes = await pool.query(`
      SELECT p.user_id, p.full_name, p.designation
      FROM public.attendance a
      JOIN public.profiles p ON a.employee_id = p.user_id
      WHERE a.date = $1 AND a.status = 'present'
    `, [targetDate]);

    res.json({
      work_orders: workOrdersRes.rows,
      carpenters: presentWorkersRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch job card form options data' });
  }
});

// 9.4 Get Individual Job Card Details
app.get('/api/production/job-cards/:id', async (req, res) => {
  try {
    const jcRes = await pool.query(`
      SELECT 
        jc.*,
        wo.wo_number,
        wo.title as wo_title,
        p.full_name as supervisor_name
      FROM public.job_cards jc
      JOIN public.work_orders wo ON jc.wo_id = wo.id
      LEFT JOIN public.profiles p ON jc.created_by = p.user_id
      WHERE jc.id = $1 AND jc.deleted_at IS NULL
    `, [req.params.id]);

    if (jcRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    // Get assignments
    const assignRes = await pool.query(`
      SELECT 
        jca.is_lead,
        jca.daily_rate,
        jca.actual_hours,
        jca.labour_cost,
        p.full_name as carpenter_name,
        p.designation
      FROM public.job_card_assignments jca
      JOIN public.profiles p ON jca.carpenter_id = p.user_id
      WHERE jca.job_card_id = $1
    `, [req.params.id]);

    // Get EOD updates
    const eodRes = await pool.query(`
      SELECT 
        eod.*,
        p.full_name as carpenter_name
      FROM public.eod_updates eod
      JOIN public.profiles p ON eod.carpenter_id = p.user_id
      WHERE eod.job_card_id = $1
      ORDER BY eod.update_date DESC
    `, [req.params.id]);

    res.json({
      job_card: jcRes.rows[0],
      assignments: assignRes.rows,
      eod_updates: eodRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve job card details' });
  }
});

// 9.5 Get Job Cards for Work Order (to reference original for rework)
app.get('/api/production/work-orders/:id/job-cards', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, jc_number, title, production_stage FROM public.job_cards WHERE wo_id = $1 AND deleted_at IS NULL ORDER BY date DESC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve job cards for work order' });
  }
});

// 10. Create New Job Card
app.post('/api/production/job-cards', async (req, res) => {
  const {
    wo_id,
    production_stage,
    title,
    description,
    quantity_assigned,
    estimated_hours,
    priority,
    supervisor_notes,
    lead_carpenter_id,
    support_carpenter_ids,
    is_rework,
    rework_reason,
    original_jc_id
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get active tenant id
    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;

    // Get supervisor id
    const supervisorRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const created_by = supervisorRes.rows[0].user_id;

    // Generate next jc_number
    const countRes = await client.query("SELECT COUNT(*) FROM public.job_cards");
    const jc_number = `JC-${(parseInt(countRes.rows[0].count) + 1).toString().padStart(4, '0')}`;

    const insertJCQuery = `
      INSERT INTO public.job_cards (
        tenant_id, jc_number, wo_id, date, shift, production_stage, title, description,
        status, priority, quantity_assigned, estimated_hours, supervisor_notes, created_by,
        is_rework, rework_reason, original_jc_id
      ) VALUES ($1, $2, $3, CURRENT_DATE, 'day', $4, $5, $6, 'assigned', $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const jcResult = await client.query(insertJCQuery, [
      tenant_id,
      jc_number,
      wo_id,
      production_stage,
      title,
      description || null,
      priority,
      quantity_assigned,
      estimated_hours || 0,
      supervisor_notes || null,
      created_by,
      is_rework || false,
      rework_reason || null,
      original_jc_id || null
    ]);

    const job_card_id = jcResult.rows[0].id;

    // Insert lead assignment
    if (lead_carpenter_id) {
      await client.query(
        "INSERT INTO public.job_card_assignments (job_card_id, carpenter_id, is_lead, daily_rate) VALUES ($1, $2, true, 25000)",
        [job_card_id, lead_carpenter_id]
      );
    }

    // Insert support assignments
    if (support_carpenter_ids && Array.isArray(support_carpenter_ids)) {
      for (const cId of support_carpenter_ids) {
        if (cId !== lead_carpenter_id) {
          await client.query(
            "INSERT INTO public.job_card_assignments (job_card_id, carpenter_id, is_lead, daily_rate) VALUES ($1, $2, false, 20000)",
            [job_card_id, cId]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, id: job_card_id, jc_number });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create job card' });
  } finally {
    client.release();
  }
});

// 10.5 Log Job Card End of Day (EOD) Update
app.post('/api/production/job-cards/:id/eod-update', async (req, res) => {
  const { carpenter_id, quantity_completed, hours_logged, notes } = req.body;
  if (!carpenter_id || quantity_completed === undefined || !hours_logged) {
    return res.status(400).json({ error: 'Missing required fields: carpenter_id, quantity_completed, hours_logged' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert EOD Update record
    await client.query(`
      INSERT INTO public.eod_updates (
        job_card_id, carpenter_id, update_date, quantity_completed, hours_logged, notes
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)
    `, [req.params.id, carpenter_id, quantity_completed, hours_logged, notes || null]);

    // 2. Sum up total quantity completed for this Job Card
    const sumRes = await client.query(
      "SELECT SUM(quantity_completed) as total_qty FROM public.eod_updates WHERE job_card_id = $1",
      [req.params.id]
    );
    const newCompletedQty = parseInt(sumRes.rows[0].total_qty || 0);

    // 3. Get job card assigned quantity to determine if it is completed
    const jcRes = await client.query(
      "SELECT quantity_assigned, status FROM public.job_cards WHERE id = $1",
      [req.params.id]
    );
    const assignedQty = jcRes.rows[0]?.quantity_assigned || 0;

    let newStatus = jcRes.rows[0]?.status || 'in_progress';
    let completedAt = null;

    if (newCompletedQty >= assignedQty) {
      newStatus = 'completed';
      completedAt = 'NOW()';
    } else {
      newStatus = 'in_progress';
    }

    // 4. Update the Job Card completions and status
    const updateQuery = `
      UPDATE public.job_cards 
      SET 
        quantity_completed = $1, 
        status = $2,
        actual_hours = actual_hours + $3,
        updated_at = NOW(),
        completed_at = ${completedAt ? 'NOW()' : 'NULL'}
      WHERE id = $4 
      RETURNING *
    `;
    const updatedJC = await client.query(updateQuery, [newCompletedQty, newStatus, hours_logged, req.params.id]);

    await client.query('COMMIT');
    res.json({ success: true, job_card: updatedJC.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to record EOD progress update' });
  } finally {
    client.release();
  }
});

// 11. Get In-App Notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, body, is_read, reference_type, reference_id, created_at FROM public.notification_log WHERE suppressed = false ORDER BY created_at DESC LIMIT 20"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// 12. Mark Specific Notification as Read
app.post('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE public.notification_log SET is_read = true, read_at = NOW() WHERE id = $1",
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// 13. Mark All Notifications as Read
app.post('/api/notifications/read-all', async (req, res) => {
  try {
    await pool.query(
      "UPDATE public.notification_log SET is_read = true, read_at = NOW() WHERE is_read = false"
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// GET /api/dashboard - Enforces Tenant-Bound Dashboard Snapshot
app.get('/api/dashboard', async (req, res) => {
  const { role } = req.query;
  try {
    // 1. Resolve active tenant id
    const tenantRes = await pool.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0]?.id;

    if (!tenant_id) {
      return res.status(404).json({ error: 'No active tenant found' });
    }

    if (role === 'factory_manager') {
      // MTD Revenue Calculation
      const revRes = await pool.query(
        "SELECT SUM(client_po_value) as mtd_sum FROM public.work_orders WHERE tenant_id = $1 AND status != 'cancelled' AND created_at >= date_trunc('month', CURRENT_DATE)",
        [tenant_id]
      );
      const mtdSumVal = parseFloat(revRes.rows[0]?.mtd_sum || 0);

      // Critical alerts from notification logs
      const alertsRes = await pool.query(
        "SELECT id, notification_type as type, title as message FROM public.notification_log WHERE tenant_id = $1 AND is_read = false ORDER BY created_at DESC LIMIT 5",
        [tenant_id]
      );

      // Liquid Cash and Payables count
      const poSumRes = await pool.query(
        "SELECT SUM(client_po_value) as payable_sum FROM public.work_orders WHERE tenant_id = $1 AND status = 'draft'",
        [tenant_id]
      );
      const payablesVal = parseFloat(poSumRes.rows[0]?.payable_sum || 0) * 0.15; // Simulated percentage

      res.json({
        mtd_revenue: `₹${mtdSumVal.toLocaleString('en-IN')}`,
        receivables: `₹${(mtdSumVal * 0.3).toLocaleString('en-IN')}`,
        payables: `₹${Math.round(payablesVal).toLocaleString('en-IN')}`,
        bank_balance: '₹42,10,000',
        alerts: alertsRes.rows
      });

    } else if (role === 'supervisor') {
      // Retrieve actions needed for supervisor dashboard
      const actions = [
        { id: '1', task: 'BOM Review Required: WO-8835-23', duration: '2 hours ago' },
        { id: '2', task: 'Approve Overtime Request: Anil Wilson (2.5 hrs)', duration: '4 hours ago' },
        { id: '3', task: 'EOD Production Update Verification (5 tasks)', duration: 'Yesterday' }
      ];
      res.json({ actions });

    } else if (role === 'site_manager') {
      // Active Work Orders for site manager dashboard
      const woRes = await pool.query(
        "SELECT id, wo_number, title, client_name as client, status, committed_delivery_date as target FROM public.work_orders WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5",
        [tenant_id]
      );
      res.json({ myWorkOrders: woRes.rows });
    } else {
      res.status(400).json({ error: 'Invalid role parameter' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve dashboard snapshot data' });
  }
});

// ── PURCHASE REQUISITIONS MODULE ─────────────────────────────────────────────

// GET /api/purchase-requisitions — list all PRs for the tenant
app.get('/api/purchase-requisitions', async (req, res) => {
  try {
    const tenantRes = await pool.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;
    const result = await pool.query(`
      SELECT pr.*, wo.wo_number, wo.title as wo_title
      FROM public.purchase_requisitions pr
      LEFT JOIN public.work_orders wo ON wo.id = pr.work_order_id
      WHERE pr.tenant_id = $1
      ORDER BY pr.created_at DESC
    `, [tenant_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch purchase requisitions' });
  }
});

// POST /api/purchase-requisitions — create a new PR
app.post('/api/purchase-requisitions', async (req, res) => {
  const { material, qty, unit, vendor, work_order_id, is_general_stock, required_by, notes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;

    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const raised_by = profileRes.rows[0].user_id;

    // Generate a sequential PR number
    const countRes = await client.query("SELECT COUNT(*) FROM public.purchase_requisitions WHERE tenant_id = $1", [tenant_id]);
    const seq = (parseInt(countRes.rows[0].count) + 1).toString().padStart(3, '0');
    const year = new Date().getFullYear().toString().slice(-2);
    const pr_number = `PR-${year}-${seq}`;

    // Determine urgency based on required_by date
    let urgency = 'normal';
    if (required_by) {
      const diff = (new Date(required_by).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (diff <= 2) urgency = 'urgent';
    }

    // Resolve work_order_id if provided as WO number string
    let resolved_wo_id = is_general_stock ? null : (work_order_id || null);

    const result = await client.query(`
      INSERT INTO public.purchase_requisitions
        (tenant_id, pr_number, material, qty, unit, vendor, work_order_id, is_general_stock, required_by, urgency, status, raised_by, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'submitted',$11,$12)
      RETURNING *
    `, [tenant_id, pr_number, material, qty, unit, vendor || null, resolved_wo_id, !!is_general_stock, required_by || null, urgency, raised_by, notes || null]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create purchase requisition' });
  } finally {
    client.release();
  }
});

// GET /api/purchase-requisitions/:id — fetch a single PR
app.get('/api/purchase-requisitions/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, wo.wo_number, wo.title as wo_title
      FROM public.purchase_requisitions pr
      LEFT JOIN public.work_orders wo ON wo.id = pr.work_order_id
      WHERE pr.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'PR not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch PR' });
  }
});

// POST /api/purchase-requisitions/:id/status — approve or reject a PR
app.post('/api/purchase-requisitions/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  const validStatuses = ['approved', 'rejected', 'po_raised'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const approved_by = profileRes.rows[0].user_id;

    const result = await client.query(`
      UPDATE public.purchase_requisitions
      SET status = $1, approved_by = $2, notes = COALESCE($3, notes), updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, approved_by, notes || null, req.params.id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'PR not found' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update PR status' });
  } finally {
    client.release();
  }
});
// ── PRODUCTION MODULE ────────────────────────────────────────────────────────

// GET /api/production/metrics — summary stats for the production floor
app.get('/api/production/metrics', async (req, res) => {
  try {
    res.json({
      present_carpenters: 6,
      total_carpenters: 8,
      active_jobs: 12,
      completed_today: 3,
      in_progress: 8,
      not_started: 1,
      blocked: 1
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch production metrics' });
  }
});

// GET /api/production/carpenters — carpenter status board list
app.get('/api/production/carpenters', async (req, res) => {
  try {
    res.json([
      { carpenter_id: 'c1', full_name: 'Ramesh Kumar',  is_present: true,  wo_number: 'WO-CHH-26-001', task: 'Reception Counter — Assembly',     quantity_completed: 2, quantity_assigned: 3,  job_status: 'in_progress' },
      { carpenter_id: 'c2', full_name: 'Suresh Yadav',  is_present: true,  wo_number: 'WO-B2B-26-001', task: 'Workstation — Cutting',             quantity_completed: 0, quantity_assigned: 10, job_status: 'waiting_material', alert_tag: 'material' },
      { carpenter_id: 'c3', full_name: 'Vikram Singh',  is_present: true,  wo_number: 'WO-CHH-26-001', task: 'Reception Counter — Edge Banding',  quantity_completed: 10, quantity_assigned: 10, job_status: 'completed' },
      { carpenter_id: 'c4', full_name: 'Mohan Singh',   is_present: false },
      { carpenter_id: 'c5', full_name: 'Deepak Verma',  is_present: true,  wo_number: 'WO-D2C-26-005', task: 'Wardrobe — Hardware Fitting',       quantity_completed: 1, quantity_assigned: 1, job_status: 'blocked', alert_tag: 'blocked' },
      { carpenter_id: 'c6', full_name: 'Anil Rawat',    is_present: true,  wo_number: 'WO-CHH-26-004', task: 'Nurses Station — Cutting',          quantity_completed: 3, quantity_assigned: 6, job_status: 'in_progress' },
      { carpenter_id: 'c7', full_name: 'Sanjay Patil',  is_present: true,  wo_number: 'WO-B2B-26-002', task: 'Cabinet — Lamination',              quantity_completed: 4, quantity_assigned: 4, job_status: 'completed' },
      { carpenter_id: 'c8', full_name: 'Rakesh Thapa',  is_present: false }
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch production carpenters' });
  }
});

// GET /api/production/wo-progress — work order tracking/progress stages
app.get('/api/production/wo-progress', async (req, res) => {
  try {
    res.json([
      {
        wo_number: 'WO-CHH-26-001', wo_title: 'Reception Counter', client: 'Starbucks',
        delivery_date: '25-Aug-26', days_left: 3, overall_pct: 50, completed_qty: 5, assigned_qty: 10,
        carpenters_assigned: ['Ramesh', 'Suresh', 'Vikram'],
        stages: [
          { name: 'Cutting',      done: 10, total: 10, status: 'done' },
          { name: 'Edge Banding', done: 10, total: 10, status: 'done' },
          { name: 'Assembly',     done: 5,  total: 10, status: 'in_progress' },
          { name: 'Finishing',    done: 0,  total: 10, status: 'pending' },
          { name: 'Hardware',     done: 0,  total: 10, status: 'pending' }
        ]
      },
      {
        wo_number: 'WO-B2B-26-001', wo_title: 'Office Workstations', client: 'WeWork',
        delivery_date: '28-Aug-26', days_left: 6, overall_pct: 17, completed_qty: 2, assigned_qty: 12,
        carpenters_assigned: ['Suresh', 'Anil'],
        material_alert: '5 items waiting for material (Plywood pending — PO-26-003 due 24-Aug)',
        stages: [
          { name: 'Cutting',  done: 2,  total: 12, status: 'in_progress' },
          { name: 'Assembly', done: 0,  total: 12, status: 'pending' },
          { name: 'Finishing',done: 0,  total: 12, status: 'pending' }
        ]
      }
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch production work orders' });
  }
});

// GET /api/ot/pending — list pending overtime requests
app.get('/api/ot/pending', async (req, res) => {
  res.json([
    {
      id: 'r1', otr_number: 'OTR-26-001', carpenter_name: 'Ramesh Kumar',
      when_label: 'Today — 6:00 PM to 9:00 PM (3 hours)', hours: 3,
      wo_number: 'WO-CHH-26-001', wo_task: 'Assembly work', job_card: 'JC-230826-001',
      reason: 'Behind schedule, delivery tomorrow',
      work_description: 'Complete base frame assembly for reception counter.',
      date_label: '10-Aug-2026 (Monday)', time_label: '6:00 PM to 9:00 PM',
      type: 'Daily OT', est_cost: 300, carpenter_ot_this_month: 18, ot_cap: 26, status: 'pending'
    },
    {
      id: 'r2', otr_number: 'OTR-26-002', carpenter_name: 'Suresh Yadav',
      when_label: 'Today — 6:00 PM to 8:00 PM (2 hours)', hours: 2,
      wo_number: 'WO-B2B-28-001', wo_task: 'Finishing touches before dispatch', job_card: 'JC-230826-003',
      reason: 'Client walkthrough scheduled early tomorrow',
      work_description: 'Final polish and touch-up on cabinet surfaces.',
      date_label: '10-Aug-2026 (Monday)', time_label: '6:00 PM to 8:00 PM',
      type: 'Daily OT', est_cost: 200, carpenter_ot_this_month: 24, ot_cap: 26, status: 'pending'
    },
    {
      id: 'r3', otr_number: 'OTR-26-003', carpenter_name: 'Mohan Lal',
      when_label: 'Tomorrow (Sunday) — Full shift (9 hours)', hours: 9,
      wo_number: 'WO-CHH-26-005', wo_task: 'Weekend work — hospital fitout deadline', job_card: 'JC-230826-014',
      reason: 'Client delivery moved up, needs weekend push to stay on schedule for hospital fitout deadline.',
      work_description: 'Complete hardware fitting and final QC prep for 4 remaining cabinet units.',
      date_label: '11-Aug-2026 (Sunday)', time_label: 'Full shift — 9:00 AM to 6:00 PM',
      type: 'Weekend Work', est_cost: 900, carpenter_ot_this_month: 5, ot_cap: 26, status: 'pending'
    },
    {
      id: 'r4', otr_number: 'OTR-26-004', carpenter_name: 'Deepak Verma',
      when_label: 'Sunday — Full shift (9 hours)', hours: 9,
      wo_number: 'WO-CHH-26-005', wo_task: 'Weekend work — hospital fitout', job_card: 'JC-230826-014',
      reason: 'Client delivery moved up, needs weekend push to stay on schedule for hospital fitout deadline.',
      work_description: 'Complete hardware fitting and final QC prep for 4 remaining cabinet units.',
      date_label: '10-Aug-2026 (Sunday)', time_label: 'Full shift — 9:00 AM to 6:00 PM',
      type: 'Weekend Work Request', est_cost: 900, carpenter_ot_this_month: 19, ot_cap: 26, status: 'pending'
    }
  ]);
});

// GET /api/ot/carpenter-status — monthly cap status tracker
app.get('/api/ot/carpenter-status', async (req, res) => {
  res.json([
    { name: 'Ramesh Kumar', hours_used: 18, cap: 26, status: 'ok' },
    { name: 'Suresh Yadav', hours_used: 24, cap: 26, status: 'near_cap' },
    { name: 'Vikram Singh', hours_used: 26, cap: 26, status: 'capped' },
    { name: 'Mohan Lal',   hours_used: 5,  cap: 26, status: 'ok' },
    { name: 'Deepak Verma', hours_used: 29, cap: 26, status: 'override' }
  ]);
});

// GET /api/ot/history — past overtime logs
app.get('/api/ot/history', async (req, res) => {
  res.json([
    { id: 'h1', otr_number: 'OTR-25-098', carpenter: 'Ramesh Kumar', date: '15-Aug-2026', type: 'Daily OT',     hours: 3, cost: 300, status: 'completed' },
    { id: 'h2', otr_number: 'OTR-25-095', carpenter: 'Suresh Yadav', date: '12-Aug-2026', type: 'Daily OT',     hours: 2, cost: 200, status: 'completed' },
    { id: 'h3', otr_number: 'OTR-25-091', carpenter: 'Mohan Lal',    date: '09-Aug-2026', type: 'Weekend Work', hours: 9, cost: 900, status: 'completed' },
    { id: 'h4', otr_number: 'OTR-25-087', carpenter: 'Vikram Singh', date: '05-Aug-2026', type: 'Daily OT',     hours: 3, cost: 300, status: 'rejected' },
    { id: 'h5', otr_number: 'OTR-25-082', carpenter: 'Anil Rawat',   date: '02-Aug-2026', type: 'Holiday Work', hours: 6, cost: 600, status: 'completed' }
  ]);
});

// POST /api/ot/:id/approve — approve OT request
app.post('/api/ot/:id/approve', async (req, res) => {
  res.json({ success: true });
});

// POST /api/ot/:id/reject — reject OT request
app.post('/api/ot/:id/reject', async (req, res) => {
  res.json({ success: true });
});

// GET /api/qc/records — fetch all QC check records
app.get('/api/qc/records', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT qc.*, wo.wo_number, wo.title as wo_title, wo.client_name as client
      FROM public.qc_records qc
      JOIN public.work_orders wo ON qc.wo_id = wo.id
      ORDER BY qc.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch QC records' });
  }
});

// POST /api/qc/records/create — insert a new QC log
app.post('/api/qc/records/create', async (req, res) => {
  const { wo_id, qc_type, result, conditional_notes, total_checkpoints, passed_checkpoints, failed_checkpoints, checks } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;
    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const conducted_by = profileRes.rows[0].user_id;

    const countRes = await client.query("SELECT COUNT(*) FROM public.qc_records");
    const seq = (parseInt(countRes.rows[0].count) + 1).toString().padStart(3, '0');
    const year = new Date().getFullYear().toString().slice(-2);
    const qc_number = `QC-${year}-${seq}`;

    const insRes = await client.query(`
      INSERT INTO public.qc_records
        (tenant_id, qc_number, wo_id, qc_type, result, conditional_notes, conducted_by, total_checkpoints, passed_checkpoints, failed_checkpoints)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [tenant_id, qc_number, wo_id, qc_type, result, conditional_notes || null, conducted_by, total_checkpoints, passed_checkpoints, failed_checkpoints]);

    // Insert checkpoint items
    for (const c of (checks || [])) {
      await client.query(`
        INSERT INTO public.qc_record_items (qc_id, check_point, is_passed, remarks)
        VALUES ($1, $2, $3, $4)
      `, [insRes.rows[0].id, c.text, c.passed, c.remarks || null]);
    }

    await client.query('COMMIT');
    res.status(201).json(insRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save QC record' });
  } finally {
    client.release();
  }
});

// GET /api/dispatch/challans — fetch list of delivery challans
app.get('/api/dispatch/challans', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dc.*, wo.wo_number, wo.title as wo_title, wo.client_name as client
      FROM public.delivery_challans dc
      JOIN public.work_orders wo ON dc.wo_id = wo.id
      ORDER BY dc.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch delivery challans' });
  }
});

// POST /api/dispatch/challans/create — create a new delivery challan
app.post('/api/dispatch/challans/create', async (req, res) => {
  const { wo_number, quantity, consignee_name, vehicle_number, ewaybill_number } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;
    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const created_by = profileRes.rows[0].user_id;

    const woRes = await client.query("SELECT id, title, client_name, shipping_address FROM public.work_orders WHERE wo_number = $1", [wo_number]);
    if (woRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Work Order not found' });
    }
    const wo = woRes.rows[0];

    const countRes = await client.query("SELECT COUNT(*) FROM public.delivery_challans");
    const seq = (parseInt(countRes.rows[0].count) + 1).toString().padStart(3, '0');
    const year = new Date().getFullYear().toString().slice(-2);
    const dc_number = `DC-${year}-${seq}`;

    const insRes = await client.query(`
      INSERT INTO public.delivery_challans
        (tenant_id, dc_number, wo_id, challan_type, quantity, items_description, delivery_address, consignee_name, vehicle_number, ewaybill_number, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
      RETURNING *
    `, [tenant_id, dc_number, wo.id, 'full', quantity, wo.title, wo.shipping_address || 'Canva Site Address', consignee_name, vehicle_number, ewaybill_number || null, created_by]);

    await client.query('COMMIT');
    res.status(201).json({
      ...insRes.rows[0],
      wo_number: wo_number,
      wo_title: wo.title,
      client: wo.client_name
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create delivery challan' });
  } finally {
    client.release();
  }
});

// POST /api/dispatch/challans/:id/status — update delivery status
app.post('/api/dispatch/challans/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['draft', 'approved', 'dispatched', 'delivered', 'confirmed'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const result = await pool.query(`
      UPDATE public.delivery_challans
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Challan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update challan status' });
  }
});
// GET /api/invoices — fetch list of sales invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM public.sales_invoices
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sales invoices' });
  }
});

// POST /api/invoices/create — create a new sales invoice
app.post('/api/invoices/create', async (req, res) => {
  const { client_name, client_billing_address, client_gstin, place_of_supply, is_inter_state, subtotal, discount_amount, cgst_amount, sgst_amount, igst_amount, invoice_total } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;
    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const created_by = profileRes.rows[0].user_id;

    const countRes = await client.query("SELECT COUNT(*) FROM public.sales_invoices");
    const seq = (parseInt(countRes.rows[0].count) + 1).toString().padStart(3, '0');
    const year = new Date().getFullYear().toString().slice(-2);
    const invoice_number = `INV-${year}-${seq}`;

    const insRes = await client.query(`
      INSERT INTO public.sales_invoices
        (tenant_id, invoice_number, client_name, client_billing_address, client_gstin, place_of_supply, is_inter_state, subtotal, discount_amount, cgst_amount, sgst_amount, igst_amount, invoice_total, created_by, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'sent')
      RETURNING *
    `, [tenant_id, invoice_number, client_name, client_billing_address, client_gstin || null, place_of_supply, is_inter_state, subtotal, discount_amount || 0, cgst_amount, sgst_amount, igst_amount, invoice_total, created_by]);

    await client.query('COMMIT');
    res.status(201).json(insRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    client.release();
  }
});

// POST /api/invoices/:id/payment — record payment receipt
app.post('/api/invoices/:id/payment', async (req, res) => {
  const { amount } = req.body;
  try {
    const invRes = await pool.query("SELECT * FROM public.sales_invoices WHERE id = $1", [req.params.id]);
    if (invRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const inv = invRes.rows[0];

    const newRec = Number(inv.amount_received || 0) + Number(amount);
    let newStatus = 'partially_paid';
    if (newRec >= Number(inv.invoice_total)) {
      newStatus = 'paid';
    }

    const updRes = await pool.query(`
      UPDATE public.sales_invoices
      SET amount_received = $1, status = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [newRec, newStatus, req.params.id]);

    res.json(updRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});// GET /api/reports/project-pl — fetch project level profitability metrics
app.get('/api/reports/project-pl', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        wo.id,
        wo.wo_number,
        wo.title,
        wo.client_name as client,
        COALESCE(wo.client_po_value, 0) as revenue,
        COALESCE((SELECT SUM(planned_qty * cost_per_unit) FROM public.bom_items bi JOIN public.boms b ON bi.bom_id = b.id WHERE b.work_order_id = wo.id), 0) as mat_cost,
        3560 as labour_cost,
        2100 as overhead_cost,
        (COALESCE((SELECT SUM(planned_qty * cost_per_unit) FROM public.bom_items bi JOIN public.boms b ON bi.bom_id = b.id WHERE b.work_order_id = wo.id), 0) + 3560 + 2100) as total_cost,
        (COALESCE(wo.client_po_value, 0) - (COALESCE((SELECT SUM(planned_qty * cost_per_unit) FROM public.bom_items bi JOIN public.boms b ON bi.bom_id = b.id WHERE b.work_order_id = wo.id), 0) + 3560 + 2100)) as gross_margin,
        CASE 
          WHEN COALESCE(wo.client_po_value, 0) > 0 THEN 
            ROUND(((COALESCE(wo.client_po_value, 0) - (COALESCE((SELECT SUM(planned_qty * cost_per_unit) FROM public.bom_items bi JOIN public.boms b ON bi.bom_id = b.id WHERE b.work_order_id = wo.id), 0) + 3560 + 2100)) / COALESCE(wo.client_po_value, 0)) * 100, 1)
          ELSE 0
        END as margin_pct,
        29 as days_to_collect,
        wo.status
      FROM public.work_orders wo
      ORDER BY wo.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project P&L metrics' });
  }
});


// ── PURCHASE ORDERS MODULE ────────────────────────────────────────────────────

// GET /api/purchase-orders — list all POs for the tenant
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const tenantRes = await pool.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;
    const result = await pool.query(`
      SELECT po.*,
        (SELECT COUNT(*) FROM public.purchase_order_items WHERE po_id = po.id) AS item_count
      FROM public.purchase_orders po
      WHERE po.tenant_id = $1
      ORDER BY po.created_at DESC
    `, [tenant_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// POST /api/purchase-orders — create a new PO with line items
app.post('/api/purchase-orders', async (req, res) => {
  const { vendor, vendor_gstin, vendor_phone, delivery_date, delivery_address,
          delivery_terms, is_inter_state, advance_required, vendor_notes,
          internal_notes, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantRes = await client.query("SELECT id FROM public.tenants LIMIT 1");
    const tenant_id = tenantRes.rows[0].id;
    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const created_by = profileRes.rows[0].user_id;

    // Generate sequential PO number
    const countRes = await client.query("SELECT COUNT(*) FROM public.purchase_orders WHERE tenant_id = $1", [tenant_id]);
    const seq = (parseInt(countRes.rows[0].count) + 1).toString().padStart(3, '0');
    const year = new Date().getFullYear().toString().slice(-2);
    const po_number = `PO-${year}-${seq}`;

    // Calculate grand total from lines
    const grand_total = (lines || []).reduce((sum, l) => {
      const taxable = l.qty * l.rate * (1 - (l.discount_pct || 0) / 100);
      const gst = taxable * ((l.gst_pct || 18) / 100);
      return sum + taxable + gst;
    }, 0);

    const needsAdminApproval = grand_total > 50000;

    const poRes = await client.query(`
      INSERT INTO public.purchase_orders
        (tenant_id, po_number, vendor, vendor_gstin, vendor_phone, delivery_date,
         delivery_address, delivery_terms, is_inter_state, advance_required,
         vendor_notes, internal_notes, grand_total, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      tenant_id, po_number, vendor, vendor_gstin || null, vendor_phone || null,
      delivery_date || null, delivery_address || null, delivery_terms || 'ex_works',
      !!is_inter_state, !!advance_required, vendor_notes || null, internal_notes || null,
      Math.round(grand_total), needsAdminApproval ? 'pending_2nd_approval' : 'pending_approval',
      created_by
    ]);

    // Insert line items
    for (const l of (lines || [])) {
      const taxable = Math.round(l.qty * l.rate * (1 - (l.discount_pct || 0) / 100));
      const gst = Math.round(taxable * ((l.gst_pct || 18) / 100));
      await client.query(`
        INSERT INTO public.purchase_order_items
          (po_id, material, hsn, work_order_ref, qty, unit, rate, discount_pct, gst_pct, taxable_amount, gst_amount, total_amount)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      `, [poRes.rows[0].id, l.material, l.hsn || null, l.for_ref || null,
          l.qty, l.unit, l.rate, l.discount_pct || 0, l.gst_pct || 18, taxable, gst, taxable + gst]);
    }

    await client.query('COMMIT');
    res.status(201).json(poRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create purchase order' });
  } finally {
    client.release();
  }
});

// GET /api/purchase-orders/:id — fetch a single PO with its line items
app.get('/api/purchase-orders/:id', async (req, res) => {
  try {
    const poRes = await pool.query("SELECT * FROM public.purchase_orders WHERE id = $1", [req.params.id]);
    if (poRes.rows.length === 0) return res.status(404).json({ error: 'PO not found' });
    const items = await pool.query("SELECT * FROM public.purchase_order_items WHERE po_id = $1 ORDER BY created_at", [req.params.id]);
    res.json({ ...poRes.rows[0], items: items.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// POST /api/purchase-orders/:id/status — approve, reject, or mark sent
app.post('/api/purchase-orders/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  const valid = ['approved', 'rejected', 'sent', 'acknowledged', 'partially_received', 'fully_received', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const profileRes = await client.query("SELECT user_id FROM public.profiles LIMIT 1");
    const user_id = profileRes.rows[0].user_id;

    let extra = '';
    const params = [status, req.params.id];
    if (status === 'approved') {
      extra = ', admin_approved_by = $3, admin_approved_at = NOW()';
      params.push(user_id);
    } else if (status === 'rejected') {
      extra = ', rejection_notes = $3';
      params.push(notes || 'No reason given');
    } else if (status === 'sent') {
      extra = ', sent_at = NOW()';
    }

    const result = await client.query(`
      UPDATE public.purchase_orders
      SET status = $1, updated_at = NOW() ${extra}
      WHERE id = $2
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'PO not found' });
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update PO status' });
  } finally {
    client.release();
  }
});

// Database Explorer APIs
app.get('/api/admin/db/tables', async (req, res) => {
  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    const result = await pool.query(query);
    res.json(result.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve tables' });
  }
});

app.post('/api/admin/db/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'No SQL query provided' });
  
  try {
    const result = await pool.query(sql);
    res.json({
      command: result.command,
      rowCount: result.rowCount,
      rows: result.rows,
      fields: result.fields ? result.fields.map(f => f.name) : []
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
app.get('/api/admin/db/storage-health', async (req, res) => {
  try {
    const sizeRes = await pool.query("SELECT pg_database_size(current_database()) as size_bytes");
    const sizeBytes = parseInt(sizeRes.rows[0].size_bytes, 10) || 0;
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    const maxMB = 500;
    const usagePct = ((sizeBytes / (500 * 1024 * 1024)) * 100).toFixed(1);
    const isWarning = parseFloat(usagePct) >= 80;
    const isCritical = parseFloat(usagePct) >= 95;

    res.json({
      size_bytes: sizeBytes,
      size_mb: parseFloat(sizeMB),
      max_mb: maxMB,
      usage_pct: parseFloat(usagePct),
      status: isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'HEALTHY',
      message: isCritical 
        ? '⚠️ Storage Critical! Database is above 95% of free tier limit.' 
        : isWarning 
        ? '⚠️ Storage Warning: Database is above 80% capacity.' 
        : '✅ Database storage is healthy.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Staging API Server running on port ${port}`);
  seedStagingData();
});
