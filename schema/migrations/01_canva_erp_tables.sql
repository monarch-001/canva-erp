-- =========================================================================
-- Canva ERP Extended Schema Migrations
-- Designed to run safely alongside Chhabee AIOS main database
-- =========================================================================

-- 1. WORK ORDERS
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wo_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('chhabee', 'b2b', 'd2c')),
  client_name TEXT NOT NULL,
  project_name TEXT,
  chhabee_project_ref TEXT,
  stream TEXT NOT NULL CHECK (stream IN ('chhabee', 'external_b2b', 'd2c')),
  furniture_type TEXT NOT NULL,
  dimensions_l NUMERIC,
  dimensions_h NUMERIC,
  dimensions_d NUMERIC,
  finish_type TEXT,
  finish_detail TEXT,
  delivery_terms TEXT NOT NULL CHECK (delivery_terms IN ('included', 'actuals', 'client_arranges')),
  delivery_address TEXT,
  committed_delivery_date DATE,
  requested_delivery_date DATE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'supervisor_approved',
    'approved_pending_bom', 'bom_approved_pending_material',
    'partial_material', 'material_ready', 'in_production',
    'production_complete', 'qc_pending', 'qc_passed',
    'ready_for_dispatch', 'in_transit',
    'delivered_pending_confirmation', 'delivered_confirmed',
    'invoice_raised', 'financially_closed', 'cancelled'
  )),
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  assigned_supervisor UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  notes TEXT,
  cancellation_reason TEXT,
  client_po_reference TEXT,
  client_po_value NUMERIC,
  production_quantity INTEGER DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WORK ORDER STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.wo_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wo_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WORK ORDER DRAWINGS
CREATE TABLE IF NOT EXISTS public.wo_drawings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wo_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL NOT NULL,
  is_current BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. JOB CARDS (DAILY PRODUCTION TRACKING)
CREATE TABLE IF NOT EXISTS public.job_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  jc_number TEXT UNIQUE NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT DEFAULT 'day' CHECK (shift IN ('day', 'evening')),
  production_stage TEXT NOT NULL CHECK (production_stage IN (
    'cutting', 'edgebanding', 'drilling', 'assembly', 'lamination',
    'finishing', 'hardware_fitting', 'quality_check', 'packaging', 'rework'
  )),
  title TEXT NOT NULL,
  description TEXT,
  is_rework BOOLEAN DEFAULT false,
  rework_reason TEXT,
  original_jc_id UUID REFERENCES public.job_cards(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'paused', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  quantity_assigned INTEGER DEFAULT 1,
  quantity_completed INTEGER DEFAULT 0,
  completion_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN quantity_assigned = 0 THEN 0
    ELSE ROUND((quantity_completed::NUMERIC / quantity_assigned::NUMERIC) * 100, 1)
    END
  ) STORED,
  daily_rate NUMERIC DEFAULT 0,
  labour_cost NUMERIC GENERATED ALWAYS AS (actual_hours * (daily_rate / 9)) STORED,
  supervisor_notes TEXT,
  carpenter_notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. JOB CARD ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.job_card_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_card_id UUID REFERENCES public.job_cards(id) ON DELETE CASCADE NOT NULL,
  carpenter_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_lead BOOLEAN DEFAULT false,
  daily_rate NUMERIC NOT NULL DEFAULT 25000,
  actual_hours NUMERIC DEFAULT 0,
  labour_cost NUMERIC GENERATED ALWAYS AS (actual_hours * (daily_rate / 9 / 26)) STORED,
  attendance_status TEXT DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'half_day', 'on_leave')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. END OF DAY UPDATES
CREATE TABLE IF NOT EXISTS public.eod_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_card_id UUID REFERENCES public.job_cards(id) ON DELETE CASCADE NOT NULL,
  carpenter_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qty_completed_today INTEGER DEFAULT 0,
  hours_worked NUMERIC NOT NULL,
  progress_notes TEXT,
  issues_flagged TEXT,
  material_issue_noted BOOLEAN DEFAULT false,
  machine_issue_noted BOOLEAN DEFAULT false,
  issue_description TEXT,
  photos TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_card_id, carpenter_id, update_date)
);

-- 7. ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'on_leave', 'holiday', 'weekly_off')),
  check_in_time TIME,
  check_out_time TIME,
  ot_hours NUMERIC DEFAULT 0,
  ot_approved BOOLEAN DEFAULT false,
  ot_approved_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  leave_type TEXT CHECK (leave_type IN ('casual', 'sick', 'festival', 'unpaid')),
  notes TEXT,
  marked_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL NOT NULL,
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- 8. NOTIFICATION LOG
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'whatsapp', 'email')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed')),
  suppressed BOOLEAN DEFAULT false,
  suppressed_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  suppressed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEXES FOR OPTIMAL PERFORMANCE
CREATE INDEX IF NOT EXISTS wo_tenant_idx ON public.work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS jc_wo_idx ON public.job_cards(wo_id);
CREATE INDEX IF NOT EXISTS jc_date_idx ON public.job_cards(date);
CREATE INDEX IF NOT EXISTS jc_status_idx ON public.job_cards(status);
CREATE INDEX IF NOT EXISTS jca_jc_idx ON public.job_card_assignments(job_card_id);
CREATE INDEX IF NOT EXISTS jca_carpenter_idx ON public.job_card_assignments(carpenter_id);
CREATE INDEX IF NOT EXISTS att_employee_date_idx ON public.attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS notif_recipient_idx ON public.notification_log(recipient_id);

-- ENABLE RLS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wo_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wo_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_card_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Work Orders Policies
CREATE POLICY "tenant_isolation_work_orders" ON public.work_orders
  FOR ALL TO authenticated USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- WO Status History Policies
CREATE POLICY "tenant_isolation_wo_status_history" ON public.wo_status_history
  FOR ALL TO authenticated USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- WO Drawings Policies
CREATE POLICY "tenant_isolation_wo_drawings" ON public.wo_drawings
  FOR ALL TO authenticated USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- Job Cards Policies
CREATE POLICY "tenant_isolation_job_cards" ON public.job_cards
  FOR ALL TO authenticated USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- Job Card Assignments Policies
CREATE POLICY "tenant_isolation_jca" ON public.job_card_assignments
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.job_cards jc 
      WHERE jc.id = job_card_assignments.job_card_id AND jc.tenant_id = current_tenant_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_cards jc 
      WHERE jc.id = job_card_assignments.job_card_id AND jc.tenant_id = current_tenant_id()
    )
  );

-- EOD Updates Policies
CREATE POLICY "tenant_isolation_eod" ON public.eod_updates
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.job_cards jc 
      WHERE jc.id = eod_updates.job_card_id AND jc.tenant_id = current_tenant_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_cards jc 
      WHERE jc.id = eod_updates.job_card_id AND jc.tenant_id = current_tenant_id()
    )
  );

-- Attendance Policies
CREATE POLICY "tenant_isolation_attendance" ON public.attendance
  FOR ALL TO authenticated USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- Notification Log Policies
CREATE POLICY "tenant_isolation_notifications" ON public.notification_log
  FOR ALL TO authenticated USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

