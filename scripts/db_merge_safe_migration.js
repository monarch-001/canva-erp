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

    // 1. Create custom enum type in staging
    console.log('Validating custom types...');
    await client.query(`
      DO $$ BEGIN
          CREATE TYPE public.bom_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create catalogs
    console.log('Validating base catalogs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.uom_master (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS public.generic_materials (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        default_uom TEXT REFERENCES public.uom_master(code)
      );
    `);

    // 3. Create boms table
    console.log('Validating boms table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.boms (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        status public.bom_status NOT NULL DEFAULT 'draft',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 4. Create bom_items table
    console.log('Validating bom_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.bom_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        bom_id UUID REFERENCES public.boms(id) ON DELETE CASCADE NOT NULL,
        material_id UUID NOT NULL REFERENCES public.generic_materials(id) ON DELETE RESTRICT,
        uom TEXT NOT NULL REFERENCES public.uom_master(code),
        planned_qty NUMERIC NOT NULL DEFAULT 0,
        available_qty NUMERIC DEFAULT 0,
        cost_per_unit NUMERIC DEFAULT 0,
        item_name TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 5. Create change_requests table
    console.log('Validating change_requests table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.change_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        wo_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE NOT NULL,
        cr_number TEXT UNIQUE NOT NULL,
        reason TEXT NOT NULL,
        cost_impact NUMERIC DEFAULT 0,
        time_impact_days INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        approved_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 6. Create purchase_requisitions table
    console.log('Validating purchase_requisitions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        pr_number TEXT UNIQUE NOT NULL,
        material TEXT NOT NULL,
        qty NUMERIC NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'pcs',
        vendor TEXT,
        work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
        is_general_stock BOOLEAN DEFAULT false,
        required_by DATE,
        urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('urgent', 'normal')),
        status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'po_raised', 'rejected')),
        raised_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        approved_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 8. Create purchase_orders table
    console.log('Validating purchase_orders table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.purchase_orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        po_number TEXT UNIQUE NOT NULL,
        vendor TEXT NOT NULL,
        vendor_gstin TEXT,
        vendor_phone TEXT,
        delivery_date DATE,
        delivery_address TEXT,
        delivery_terms TEXT DEFAULT 'ex_works',
        is_inter_state BOOLEAN DEFAULT false,
        advance_required BOOLEAN DEFAULT false,
        vendor_notes TEXT,
        internal_notes TEXT,
        status TEXT DEFAULT 'pending_approval' CHECK (status IN (
          'pending_approval','pending_2nd_approval','approved','sent',
          'acknowledged','partially_received','fully_received','rejected','cancelled'
        )),
        grand_total NUMERIC DEFAULT 0,
        fm_approved_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        fm_approved_at TIMESTAMPTZ,
        admin_approved_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        admin_approved_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        rejection_notes TEXT,
        created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.purchase_order_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
        material TEXT NOT NULL,
        hsn TEXT,
        work_order_ref TEXT,
        qty NUMERIC NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'pcs',
        rate NUMERIC NOT NULL DEFAULT 0,
        discount_pct NUMERIC DEFAULT 0,
        gst_pct NUMERIC DEFAULT 18,
        taxable_amount NUMERIC DEFAULT 0,
        gst_amount NUMERIC DEFAULT 0,
        total_amount NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.qc_checklists (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        furniture_type TEXT NOT NULL,
        checklist_name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.qc_checklist_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        qc_checklist_id UUID REFERENCES public.qc_checklists(id) ON DELETE CASCADE NOT NULL,
        check_point TEXT NOT NULL,
        description TEXT,
        is_mandatory BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.qc_records (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        qc_number TEXT UNIQUE NOT NULL,
        wo_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE NOT NULL,
        qc_checklist_id UUID REFERENCES public.qc_checklists(id),
        qc_date DATE NOT NULL DEFAULT CURRENT_DATE,
        qc_type TEXT DEFAULT 'pre_dispatch' CHECK (qc_type IN ('pre_dispatch', 're_qc')),
        result TEXT CHECK (result IN ('pass', 'fail', 'conditional_pass')),
        conditional_notes TEXT,
        conducted_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        total_checkpoints INTEGER DEFAULT 0,
        passed_checkpoints INTEGER DEFAULT 0,
        failed_checkpoints INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.qc_record_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        qc_id UUID REFERENCES public.qc_records(id) ON DELETE CASCADE NOT NULL,
        check_point TEXT NOT NULL,
        is_passed BOOLEAN DEFAULT true,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.delivery_challans (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        dc_number TEXT UNIQUE NOT NULL,
        wo_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE NOT NULL,
        qc_record_id UUID REFERENCES public.qc_records(id) ON DELETE SET NULL,
        challan_type TEXT DEFAULT 'full' CHECK (challan_type IN ('full', 'partial')),
        trip_number INTEGER DEFAULT 1,
        items_description TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        delivery_address TEXT NOT NULL,
        consignee_name TEXT,
        consignee_phone TEXT,
        vehicle_number TEXT,
        transporter_name TEXT,
        driver_name TEXT,
        driver_phone TEXT,
        ewaybill_required BOOLEAN DEFAULT false,
        ewaybill_number TEXT,
        ewaybill_generated_at TIMESTAMPTZ,
        ewaybill_valid_until TIMESTAMPTZ,
        invoice_value NUMERIC,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'dispatched', 'delivered', 'confirmed')),
        dispatched_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        confirmed_at TIMESTAMPTZ,
        confirmed_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        installation_required BOOLEAN DEFAULT false,
        installation_done BOOLEAN DEFAULT false,
        installation_signoff_by TEXT,
        installation_signoff_at TIMESTAMPTZ,
        installation_photo_url TEXT,
        punch_list_items TEXT,
        punch_list_resolved BOOLEAN DEFAULT false,
        dispatch_notes TEXT,
        created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.sales_invoices (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        invoice_number TEXT UNIQUE NOT NULL,
        invoice_type TEXT NOT NULL DEFAULT 'tax_invoice',
        wo_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
        client_name TEXT NOT NULL,
        client_gstin TEXT,
        client_billing_address TEXT NOT NULL,
        billing_trigger TEXT NOT NULL DEFAULT 'delivery',
        place_of_supply TEXT NOT NULL,
        is_inter_state BOOLEAN NOT NULL DEFAULT false,
        subtotal NUMERIC NOT NULL DEFAULT 0,
        discount_amount NUMERIC DEFAULT 0,
        cgst_rate NUMERIC DEFAULT 9,
        sgst_rate NUMERIC DEFAULT 9,
        igst_rate NUMERIC DEFAULT 18,
        cgst_amount NUMERIC NOT NULL DEFAULT 0,
        sgst_amount NUMERIC NOT NULL DEFAULT 0,
        igst_amount NUMERIC NOT NULL DEFAULT 0,
        invoice_total NUMERIC NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled')),
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL DEFAULT (CURRENT_DATE + 30),
        amount_received NUMERIC DEFAULT 0,
        notes TEXT,
        created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.sales_invoice_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE NOT NULL,
        description TEXT NOT NULL,
        qty NUMERIC NOT NULL DEFAULT 1,
        rate NUMERIC NOT NULL DEFAULT 0,
        total_amount NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // 9. Enable RLS
    console.log('Enabling Row Level Security...');
    await client.query(`
      ALTER TABLE public.boms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.qc_checklists ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.qc_checklist_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.qc_records ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.qc_record_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.delivery_challans ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;
    `);

    // 10. Apply RLS Policies (if auth schema exists)
    const schemaCheck = await client.query("SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'");
    if (schemaCheck.rows.length > 0) {
      console.log('Applying RLS policies...');
      await client.query(`
        DROP POLICY IF EXISTS sales_invoices_tenant_policy ON public.sales_invoices;
        CREATE POLICY sales_invoices_tenant_policy ON public.sales_invoices
          FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

        DROP POLICY IF EXISTS delivery_challans_tenant_policy ON public.delivery_challans;
        CREATE POLICY delivery_challans_tenant_policy ON public.delivery_challans
          FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

        DROP POLICY IF EXISTS qc_records_tenant_policy ON public.qc_records;
        CREATE POLICY qc_records_tenant_policy ON public.qc_records
          FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));

        DROP POLICY IF EXISTS qc_checklists_tenant_policy ON public.qc_checklists;
        CREATE POLICY qc_checklists_tenant_policy ON public.qc_checklists
          FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()));
      `);
    } else {
      console.log('Skipping auth RLS policies (local environment, auth schema not present).');
    }

    await client.query('COMMIT');
    console.log('Merge-safe migration applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
