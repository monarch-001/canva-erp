-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.tenants (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  primary_color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT tenants_pkey PRIMARY KEY (id)

);
CREATE TABLE public.subscription_plans (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  max_users integer,
  max_projects integer,
  price_inr numeric NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id)

);
CREATE TABLE public.tenant_subscriptions (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tenant_subscriptions_pkey PRIMARY KEY (id)

);
CREATE TABLE public.profiles (

  user_id uuid NOT NULL,
  full_name text,
  phone text,
  email text,
  designation text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id)

);
CREATE TABLE public.user_roles (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id)

);
CREATE TABLE public.permissions (

  code text NOT NULL,
  module text NOT NULL,
  description text,
  CONSTRAINT permissions_pkey PRIMARY KEY (code)

);
CREATE TABLE public.role_permissions (

  role text NOT NULL,
  permission_code text NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role, permission_code)

);
CREATE TABLE public.audit_log (

  id bigserial,
  tenant_id uuid,
  actor_user_id uuid,
  action text NOT NULL,
  entity_table text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)

);
CREATE TABLE public.organisations (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  legal_name text NOT NULL,
  display_name text,
  pan text CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'::text),
  cin text,
  website text,
  email text,
  phone text,
  registered_address text,
  city text,
  state text,
  country text DEFAULT 'India'::text,
  pincode text,
  is_self_entity boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  version integer NOT NULL DEFAULT 1,
  tds_section text,
  tds_pct numeric,
  CONSTRAINT organisations_pkey PRIMARY KEY (id)

);
CREATE TABLE public.organisation_roles (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  organisation_id uuid NOT NULL,
  role text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organisation_roles_pkey PRIMARY KEY (id)

);
CREATE TABLE public.gst_registrations (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  organisation_id uuid NOT NULL,
  gstin text NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'::text),
  state text NOT NULL,
  state_code text NOT NULL,
  trade_name text,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  registered_address text,
  CONSTRAINT gst_registrations_pkey PRIMARY KEY (id)

);
CREATE TABLE public.organisation_bank_accounts (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  organisation_id uuid NOT NULL,
  account_name text,
  account_number text NOT NULL,
  ifsc text NOT NULL CHECK (ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'::text),
  bank_name text,
  branch text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  gst_registration_id uuid,
  CONSTRAINT organisation_bank_accounts_pkey PRIMARY KEY (id)

);
CREATE TABLE public.organisation_contacts (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  organisation_id uuid NOT NULL,
  name text NOT NULL,
  designation text,
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organisation_contacts_pkey PRIMARY KEY (id)

);
CREATE TABLE public.brands (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  logo_url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT brands_pkey PRIMARY KEY (id)

);
CREATE TABLE public.sites (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  address text,
  city text,
  state text,
  country text DEFAULT 'India'::text,
  pincode text,
  latitude numeric,
  longitude numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT sites_pkey PRIMARY KEY (id)

);
CREATE TABLE public.projects (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  site_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  description text,
  status text NOT NULL DEFAULT 'sales_pipeline'::text,
  prev_status text,
  contract_value numeric,
  pm_user_id uuid,
  client_org_id uuid,
  pmc_org_id uuid,
  pipeline_opened_at date,
  design_started_at date,
  mobilised_at date,
  handover_at date,
  dlp_start_at date,
  dlp_end_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  brand_id uuid NOT NULL,
  format_id uuid,
  area_sqft numeric,
  CONSTRAINT projects_pkey PRIMARY KEY (id)

);
CREATE TABLE public.project_contract_terms (

  project_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  retention_percent numeric DEFAULT 5,
  mobilisation_advance_percent numeric DEFAULT 10,
  gst_mode text DEFAULT 'extra'::text CHECK (gst_mode = ANY (ARRAY['inclusive'::text, 'extra'::text])),
  payment_terms_days integer DEFAULT 30,
  dlp_months integer DEFAULT 12,
  notes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  mrp_restrict_material_codes boolean NOT NULL DEFAULT false,
  mrp_restrict_quantity boolean NOT NULL DEFAULT false,
  mrp_qty_tolerance_pct numeric NOT NULL DEFAULT 10,
  CONSTRAINT project_contract_terms_pkey PRIMARY KEY (project_id)

);
CREATE TABLE public.areas (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  parent_area_id uuid,
  level integer NOT NULL DEFAULT 0,
  area_type text NOT NULL,
  name text NOT NULL,
  code text,
  shape text,
  length_m numeric,
  width_m numeric,
  height_m numeric,
  affl_height_m numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  dim_uom text NOT NULL DEFAULT 'm'::text CHECK (dim_uom = ANY (ARRAY['mm'::text, 'cm'::text, 'm'::text, 'ft'::text, 'in'::text])),
  replicas integer NOT NULL DEFAULT 1 CHECK (replicas >= 1),
  CONSTRAINT areas_pkey PRIMARY KEY (id)

);
CREATE TABLE public.documents (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid,
  title text NOT NULL,
  discipline text NOT NULL DEFAULT 'other'::text,
  status text NOT NULL DEFAULT 'schematic'::text,
  drawing_number text,
  description text,
  current_version_id uuid,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  doc_kind text NOT NULL DEFAULT 'drawing'::text,
  drawing_format text,
  expense_id uuid,
  payment_id uuid,
  review_status text NOT NULL DEFAULT 'pending_review'::text,
  created_by uuid,
  published_by uuid,
  published_at timestamp with time zone,
  ticket_id uuid,
  CONSTRAINT documents_pkey PRIMARY KEY (id)

);
CREATE TABLE public.document_versions (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  document_id uuid NOT NULL,
  version_number integer NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  uploaded_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_versions_pkey PRIMARY KEY (id)

);
CREATE TABLE public.numbering_counters (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  doc_type text NOT NULL,
  fy text NOT NULL,
  scope_key text NOT NULL DEFAULT ''::text,
  last_seq integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT numbering_counters_pkey PRIMARY KEY (id)

);
CREATE TABLE public.tenant_settings (

  tenant_id uuid NOT NULL,
  po_two_eyes_threshold numeric NOT NULL DEFAULT 100000,
  indent_tier1_limit numeric NOT NULL DEFAULT 50000,
  indent_tier2_limit numeric NOT NULL DEFAULT 500000,
  allow_over_receipt boolean NOT NULL DEFAULT false,
  match_qty_tolerance_pct numeric NOT NULL DEFAULT 2,
  match_rate_tolerance_pct numeric NOT NULL DEFAULT 1,
  default_tds_pct numeric NOT NULL DEFAULT 2,
  default_retention_pct numeric NOT NULL DEFAULT 5,
  default_advance_pct numeric NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  default_tds_section text NOT NULL DEFAULT '194C'::text,
  grn_po_qty_tolerance_pct numeric NOT NULL DEFAULT 10,
  CONSTRAINT tenant_settings_pkey PRIMARY KEY (tenant_id)

);
CREATE TABLE public.uom_master (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  decimals smallint NOT NULL DEFAULT 2,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uom_master_pkey PRIMARY KEY (id)

);
CREATE TABLE public.material_categories (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  parent_id uuid,
  name text NOT NULL,
  default_wastage_pct numeric NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT material_categories_pkey PRIMARY KEY (id)

);
CREATE TABLE public.generic_materials (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  category_id uuid,
  generic_material_code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  uom text NOT NULL,
  hsn_sac text,
  default_gst_rate numeric NOT NULL DEFAULT 18,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  specification_1 text,
  specification_2 text,
  selection_required boolean NOT NULL DEFAULT false,
  default_wastage_percent numeric DEFAULT 0,
  unit_weight_kg_per_uom numeric,
  CONSTRAINT generic_materials_pkey PRIMARY KEY (id)

);
CREATE TABLE public.boqs (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT 'BoQ'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT boqs_pkey PRIMARY KEY (id)

);
CREATE TABLE public.boq_sections (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  boq_id uuid NOT NULL,
  parent_id uuid,
  code text,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL,
  CONSTRAINT boq_sections_pkey PRIMARY KEY (id)

);
CREATE TABLE public.boq_activities (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  boq_id uuid NOT NULL,
  section_id uuid,
  description text NOT NULL,
  uom text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 18,
  amount numeric, 2),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL,
  activity_id uuid,
  short_description text NOT NULL DEFAULT ''::text,
  long_description text,
  po_quantity numeric NOT NULL DEFAULT 0,
  drawing_quantity numeric NOT NULL DEFAULT 0,
  activity_status text NOT NULL DEFAULT 'draft'::text,
  CONSTRAINT boq_activities_pkey PRIMARY KEY (id)

);
CREATE TABLE public.boq_revisions (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  from_boq_id uuid,
  to_boq_id uuid,
  reason text,
  changed_by uuid,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT boq_revisions_pkey PRIMARY KEY (id)

);
CREATE TABLE public.boms (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  boq_id uuid,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft'::text,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by uuid,
  created_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT boms_pkey PRIMARY KEY (id)

);
CREATE TABLE public.bom_items (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bom_id uuid NOT NULL,
  material_id uuid NOT NULL,
  uom text NOT NULL,
  planned_qty numeric NOT NULL DEFAULT 0,
  wastage_pct numeric NOT NULL DEFAULT 5,
  net_qty numeric, 3),
  source_boq_activity_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bom_items_pkey PRIMARY KEY (id)

);
CREATE TABLE public.purchase_orders (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  vendor_org_id uuid NOT NULL,
  vendor_gstin text,
  self_gstin text,
  place_of_supply text,
  po_no text,
  po_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft'::text,
  currency text NOT NULL DEFAULT 'INR'::text,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  taxable numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  tds_pct numeric NOT NULL DEFAULT 2,
  retention_pct numeric NOT NULL DEFAULT 5,
  advance_pct numeric NOT NULL DEFAULT 0,
  payment_terms text,
  delivery_terms text,
  delivery_address text,
  valid_till date,
  parent_po_id uuid,
  amendment_no integer NOT NULL DEFAULT 0,
  prepared_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  sent_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tds_section text,
  category text NOT NULL DEFAULT 'material'::text,
  ship_to_type text NOT NULL DEFAULT 'site'::text CHECK (ship_to_type = ANY (ARRAY['site'::text, 'other'::text])),
  ship_to_address_id uuid,
  bill_to_gst_registration_id uuid,
  is_gst_purchase boolean NOT NULL DEFAULT true,
  ticket_id uuid,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id)

);
CREATE TABLE public.po_items (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL,
  material_id uuid,
  description text NOT NULL,
  hsn_sac text,
  uom text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  qty_received numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 18,
  is_inter_state boolean NOT NULL DEFAULT false,
  taxable numeric, 2),
  cgst_amt numeric DEFAULT 
CASE
    WHEN is_inter_state THEN (0)::numeric
    ELSE round(((((qty * rate) * ((1)::numeric - (discount_pct / (100)::numeric))) * gst_rate) / (200)::numeric), 2)
END,
  sgst_amt numeric DEFAULT 
CASE
    WHEN is_inter_state THEN (0)::numeric
    ELSE round(((((qty * rate) * ((1)::numeric - (discount_pct / (100)::numeric))) * gst_rate) / (200)::numeric), 2)
END,
  igst_amt numeric DEFAULT 
CASE
    WHEN is_inter_state THEN round(((((qty * rate) * ((1)::numeric - (discount_pct / (100)::numeric))) * gst_rate) / (100)::numeric), 2)
    ELSE (0)::numeric
END,
  line_total numeric, 2) +
CASE
    WHEN is_inter_state THEN round(((((qty * rate) * ((1)::numeric - (discount_pct / (100)::numeric))) * gst_rate) / (100)::numeric), 2)
    ELSE (round(((((qty * rate) * ((1)::numeric - (discount_pct / (100)::numeric))) * gst_rate) / (200)::numeric), 2) * (2)::numeric)
END),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  activity_id uuid,
  ticket_item_id uuid,
  material_code text,
  CONSTRAINT po_items_pkey PRIMARY KEY (id)

);
CREATE TABLE public.grns (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  po_id uuid NOT NULL,
  grn_no text,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  received_by uuid,
  vehicle_no text,
  lr_no text,
  supplier_dc_no text,
  supplier_dc_date date,
  status text NOT NULL DEFAULT 'draft'::text,
  notes text,
  posted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grns_pkey PRIMARY KEY (id)

);
CREATE TABLE public.grn_items (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grn_id uuid NOT NULL,
  po_item_id uuid NOT NULL,
  material_id uuid NOT NULL,
  area_id uuid,
  uom text NOT NULL,
  qty_received numeric NOT NULL DEFAULT 0,
  qty_accepted numeric NOT NULL DEFAULT 0,
  qty_rejected numeric,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grn_items_pkey PRIMARY KEY (id)

);
CREATE TABLE public.vendor_invoices (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid,
  vendor_org_id uuid NOT NULL,
  po_id uuid,
  invoice_no text NOT NULL,
  invoice_date date NOT NULL,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'received'::text,
  match_status text NOT NULL DEFAULT 'not_applicable'::text,
  match_notes text,
  currency text NOT NULL DEFAULT 'INR'::text,
  subtotal numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  tds_amount numeric NOT NULL DEFAULT 0,
  retention_amount numeric NOT NULL DEFAULT 0,
  advance_adjustment numeric NOT NULL DEFAULT 0,
  gross_total numeric,
  net_payable numeric,
  amount_paid numeric NOT NULL DEFAULT 0,
  notes text,
  approved_at timestamp with time zone,
  approved_by uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  dispute_reason text,
  disputed_at timestamp with time zone,
  disputed_by uuid,
  CONSTRAINT vendor_invoices_pkey PRIMARY KEY (id)

);
CREATE TABLE public.vendor_invoice_items (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  po_item_id uuid,
  grn_item_id uuid,
  material_id uuid,
  description text NOT NULL,
  uom text,
  qty numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 18,
  amount numeric, 2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vendor_invoice_items_pkey PRIMARY KEY (id)

);
CREATE TABLE public.payments (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  payment_no text,
  vendor_org_id uuid NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  mode text NOT NULL DEFAULT 'neft'::text,
  bank_account_id uuid,
  utr_no text,
  cheque_no text,
  amount numeric NOT NULL DEFAULT 0,
  tds_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'to_be_approved'::text,
  notes text,
  created_by uuid,
  approved_by uuid,
  released_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ticket_id uuid,
  po_id uuid,
  CONSTRAINT payments_pkey PRIMARY KEY (id)

);
CREATE TABLE public.payment_allocations (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  invoice_id uuid,
  allocated_amount numeric NOT NULL DEFAULT 0,
  retention_held numeric NOT NULL DEFAULT 0,
  advance_recovered numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expense_id uuid,
  purchase_order_id uuid,
  CONSTRAINT payment_allocations_pkey PRIMARY KEY (id)

);
CREATE TABLE public.tds_ledger (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  payment_id uuid,
  vendor_org_id uuid NOT NULL,
  section text NOT NULL DEFAULT '194C'::text,
  pct numeric NOT NULL,
  base_amount numeric NOT NULL,
  tds_amount numeric NOT NULL,
  financial_year text NOT NULL,
  quarter smallint NOT NULL,
  posted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tds_ledger_pkey PRIMARY KEY (id)

);
CREATE TABLE public.retention_ledger (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  vendor_org_id uuid NOT NULL,
  source_invoice_id uuid,
  amount numeric NOT NULL,
  held_at timestamp with time zone NOT NULL DEFAULT now(),
  released_at timestamp with time zone,
  release_payment_id uuid,
  release_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT retention_ledger_pkey PRIMARY KEY (id)

);
CREATE TABLE public.activity_area_allocations (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  area_id uuid NOT NULL,
  allocated_qty numeric NOT NULL DEFAULT 0,
  work_done_qty numeric NOT NULL DEFAULT 0,
  progress_pct numeric DEFAULT 
CASE
    WHEN (allocated_qty > (0)::numeric) THEN round((LEAST((work_done_qty / allocated_qty), (1)::numeric) * (100)::numeric), 2)
    ELSE (0)::numeric
END,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_area_allocations_pkey PRIMARY KEY (id)

);
CREATE TABLE public.expenses (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  purchase_order_id uuid,
  vendor_org_id uuid NOT NULL,

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  purchase_order_id uuid,
  vendor_org_id uuid NOT NULL,
  expense_no text,
  doc_type text NOT NULL DEFAULT 'tax_invoice'::text,
  doc_number text,
  doc_date date,
  amount numeric NOT NULL DEFAULT 0,
  po_amount numeric NOT NULL DEFAULT 0,
  payable_cap numeric,
  status text NOT NULL DEFAULT 'draft'::text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id)

);
CREATE TABLE public.drawing_name_options (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid,
  name text NOT NULL,
  is_standard boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT drawing_name_options_pkey PRIMARY KEY (id)

);
CREATE TABLE public.material_codes (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  generic_material_code text NOT NULL,
  material_code text NOT NULL,
  material_brand text NOT NULL,
  model text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  variant_spec text,
  CONSTRAINT material_codes_pkey PRIMARY KEY (id)

);
CREATE TABLE public.material_packs (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  material_code text NOT NULL,
  pack_size numeric NOT NULL,
  unit text NOT NULL,
  rate numeric NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  legacy_matcode text,
  CONSTRAINT material_packs_pkey PRIMARY KEY (id)

);
CREATE TABLE public.master_activities (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  master_activity_code text NOT NULL,
  short_description text NOT NULL,
  long_description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  uom text,
  is_active boolean NOT NULL DEFAULT true,
  parent_id uuid,
  is_variant boolean NOT NULL DEFAULT false,
  spec_tags text[] NOT NULL DEFAULT '{}'::text[],
  source_brand_id uuid,
  source_brand_activity_id uuid,
  status text NOT NULL DEFAULT 'unverified'::text,
  sort_order integer NOT NULL DEFAULT 0,
  depth smallint NOT NULL DEFAULT 1,
  is_customised boolean NOT NULL DEFAULT false,
  path text[] NOT NULL DEFAULT '{}'::uuid[],
  embedding text,
  root_ancestor_id uuid,
  locked_by uuid,
  locked_at timestamp with time zone,
  effective_description text,
  embedding_stale boolean NOT NULL DEFAULT false,
  embedding_updated_at timestamp with time zone,
  resolved_input_text text,
  classification jsonb,
  extracted_specs jsonb,
  variant_key text,
  spec_embedding text,
  CONSTRAINT master_activities_pkey PRIMARY KEY (id)

);
CREATE TABLE public.master_activity_rates (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  master_activity_id uuid NOT NULL,
  uom text NOT NULL,
  rate numeric NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  source text,
  source_brand_activity_id uuid,
  CONSTRAINT master_activity_rates_pkey PRIMARY KEY (id)

);
CREATE TABLE public.brand_activities (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  brand_activity_code text NOT NULL,
  master_activity_id uuid,
  short_description text NOT NULL,
  long_description text,
  ai_match_confidence numeric,
  ai_match_status text NOT NULL DEFAULT 'unmatched'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  rate_variance_acknowledged_by uuid,
  rate_variance_acknowledged_at timestamp with time zone,
  rate_variance_note text,
  sort_order integer NOT NULL DEFAULT 0,
  uom text,
  import_job_id uuid,
  raw_rate numeric,
  raw_qty numeric,
  parent_id uuid,
  depth smallint NOT NULL DEFAULT 1,
  rate_type text NOT NULL DEFAULT 'RC'::text CHECK (rate_type = ANY (ARRAY['RC'::text, 'NT'::text])),
  is_project_specific boolean NOT NULL DEFAULT false,
  path text[] NOT NULL DEFAULT '{}'::uuid[],
  embedding_v2 text,
  is_variant boolean NOT NULL DEFAULT false,
  vendor_code text,
  effective_description text,
  match_verified boolean NOT NULL DEFAULT false,
  match_verified_by uuid,
  match_verified_at timestamp with time zone,
  resolved_input_text text,
  classification jsonb,
  extracted_specs jsonb,
  variant_key text,
  spec_embedding text,
  CONSTRAINT brand_activities_pkey PRIMARY KEY (id)

);
CREATE TABLE public.master_bom (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  master_activity_id uuid NOT NULL,
  generic_material_code text NOT NULL,
  quantity_per_unit numeric NOT NULL,
  material_unit text NOT NULL,
  per_activity_unit text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  basis_qty numeric NOT NULL DEFAULT 1,
  wastage_percent numeric NOT NULL DEFAULT 0,
  CONSTRAINT master_bom_pkey PRIMARY KEY (id)

);
CREATE TABLE public.mrp_runs (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  run_type text NOT NULL DEFAULT 'on_demand'::text,
  triggered_by uuid,
  run_status text NOT NULL DEFAULT 'pending'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  error_message text,
  CONSTRAINT mrp_runs_pkey PRIMARY KEY (id)

);
CREATE TABLE public.mrp_requirements (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  mrp_run_id uuid NOT NULL,
  project_id uuid NOT NULL,
  generic_material_code text NOT NULL,
  material_code text,
  required_quantity numeric NOT NULL,
  material_unit text,
  ordered_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  area_id uuid,
  req_status text NOT NULL DEFAULT 'ok'::text,
  CONSTRAINT mrp_requirements_pkey PRIMARY KEY (id)

);
CREATE TABLE public.project_material_category_rules (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  category_id uuid NOT NULL,
  enforce_mrp_qty boolean NOT NULL DEFAULT false,
  enforce_mrp_code boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_material_category_rules_pkey PRIMARY KEY (id)

);
CREATE TABLE public.brand_material_selection (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  generic_material_code text NOT NULL,
  material_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT brand_material_selection_pkey PRIMARY KEY (id)

);
CREATE TABLE public.brand_approved_material_brands (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  category_id uuid NOT NULL,
  allowed_brands text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT brand_approved_material_brands_pkey PRIMARY KEY (id)

);
CREATE TABLE public.project_area_material_selection (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  area_id uuid NOT NULL,
  generic_material_code text NOT NULL,
  material_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT project_area_material_selection_pkey PRIMARY KEY (id)

);
CREATE TABLE public.boq_activity_measurements (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  boq_activity_id uuid NOT NULL,
  sequence_no integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  area_id uuid,
  sign smallint NOT NULL DEFAULT 1 CHECK (sign = ANY (ARRAY['-1'::integer, 1])),
  calc_type text NOT NULL,
  replicas integer NOT NULL DEFAULT 1 CHECK (replicas >= 1),
  length numeric,
  width numeric,
  height numeric,
  computed_qty numeric
CASE calc_type
    WHEN 'LW'::text THEN (COALESCE(length, (0)::numeric) * COALESCE(width, (0)::numeric))
    WHEN 'LH'::text THEN (COALESCE(length, (0)::numeric) * COALESCE(height, (0)::numeric))
    WHEN 'LWH'::text THEN ((COALESCE(length, (0)::numeric) * COALESCE(width, (0)::numeric)) * COALESCE(height, (0)::numeric))
    WHEN 'L'::text THEN COALESCE(length, (0)::numeric)
    WHEN 'No.'::text THEN (1)::numeric
    ELSE NULL::numeric
END),
  uom text NOT NULL,
  confidence text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT boq_activity_measurements_pkey PRIMARY KEY (id)

);
CREATE TABLE public.credit_notes (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid,
  vendor_org_id uuid NOT NULL,
  invoice_id uuid,
  cn_no text,
  cn_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL DEFAULT 'other'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  subtotal numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  total numeric,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT credit_notes_pkey PRIMARY KEY (id)

);
CREATE TABLE public.import_jobs (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  filename text,
  source_type text CHECK (source_type = ANY (ARRAY['xlsx'::text, 'csv'::text])),
  status text NOT NULL DEFAULT 'parsing'::text CHECK (status = ANY (ARRAY['parsing'::text, 'staged'::text, 'reviewing'::text, 'processing'::text, 'committed'::text, 'failed'::text])),
  imported_by uuid,
  brand_id uuid,
  project_id uuid,
  total_rows integer DEFAULT 0,
  reviewed_rows integer DEFAULT 0,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT import_jobs_pkey PRIMARY KEY (id)

);
CREATE TABLE public.import_staging (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  import_job_id uuid NOT NULL,
  raw_name text,
  raw_description text,
  raw_uom text,
  raw_rate numeric,
  raw_quantity numeric,
  raw_section text,
  source_sheet text,
  source_row integer,
  is_variant boolean DEFAULT false,
  parent_staging_id uuid,
  description_clean text,
  spec_tags text[] DEFAULT '{}'::text[],
  match_type text CHECK (match_type = ANY (ARRAY['matched'::text, 'new'::text, 'ambiguous'::text])),
  matched_master_activity_id uuid,
  match_confidence double precision,
  match_reasoning text,
  candidate_ids text[] DEFAULT '{}'::uuid[],
  final_master_activity_id uuid,
  final_name text,
  final_uom text,
  suggested_name text,
  suggested_section_title text,
  suggested_calc_type text,
  suggested_uom text,
  suggested_spec_tags text[] DEFAULT '{}'::text[],
  suggested_benchmark_rate numeric,
  review_status text NOT NULL DEFAULT 'pending'::text CHECK (review_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'edited'::text, 'rejected'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  final_calc_type text,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  hier_path text[],
  raw_rate_type text,
  source_file text,
  is_section_header boolean NOT NULL DEFAULT false,
  sr_no text,
  parent_sr_no text,
  rate_reference numeric,
  uom_system text,
  hsn_sac text,
  gst_pct numeric,
  approved_makes text,
  basic_material_rate numeric,
  area_location text,
  category text,
  brand_activity_code_hint text,
  review_flags text,
  CONSTRAINT import_staging_pkey PRIMARY KEY (id)

);
CREATE TABLE public.activity_match_proposals (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  brand_activity_id uuid NOT NULL,
  proposal_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  matched_master_activity_id uuid,
  suggested_uom text,
  suggested_rate numeric,
  confidence numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  suggested_parent_id uuid,
  parent_confidence numeric,
  parent_resolution text,
  CONSTRAINT activity_match_proposals_pkey PRIMARY KEY (id)

);
CREATE TABLE public.brand_formats (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT brand_formats_pkey PRIMARY KEY (id)

);
CREATE TABLE public.format_boq_activities (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  format_id uuid NOT NULL,
  brand_activity_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rate_override numeric,
  uom_override text,
  CONSTRAINT format_boq_activities_pkey PRIMARY KEY (id)

);
CREATE TABLE public.format_material_selection (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  format_id uuid NOT NULL,
  generic_material_code text NOT NULL,
  material_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT format_material_selection_pkey PRIMARY KEY (id)

);
CREATE TABLE public.format_areas (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  format_id uuid NOT NULL,
  parent_area_id uuid,
  level integer NOT NULL DEFAULT 0,
  area_type text NOT NULL,
  name text NOT NULL,
  code text,
  shape text,
  length_m numeric,
  width_m numeric,
  height_m numeric,
  affl_height_m numeric,
  notes text,
  dim_uom text NOT NULL DEFAULT 'm'::text CHECK (dim_uom = ANY (ARRAY['mm'::text, 'cm'::text, 'm'::text, 'ft'::text, 'in'::text])),
  replicas integer NOT NULL DEFAULT 1 CHECK (replicas >= 1),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT format_areas_pkey PRIMARY KEY (id)

);
CREATE TABLE public.format_activity_area_allocations (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  format_id uuid NOT NULL,
  brand_activity_id uuid NOT NULL,
  sequence_no integer NOT NULL DEFAULT 0,
  description text,
  area_id uuid,
  sign smallint NOT NULL DEFAULT 1 CHECK (sign = ANY (ARRAY['-1'::integer, 1])),
  calc_type text NOT NULL,
  replicas integer NOT NULL DEFAULT 1 CHECK (replicas >= 1),
  length numeric,
  width numeric,
  height numeric,
  computed_qty numeric
CASE calc_type
    WHEN 'LW'::text THEN (COALESCE(length, (0)::numeric) * COALESCE(width, (0)::numeric))
    WHEN 'LH'::text THEN (COALESCE(length, (0)::numeric) * COALESCE(height, (0)::numeric))
    WHEN 'LWH'::text THEN ((COALESCE(length, (0)::numeric) * COALESCE(width, (0)::numeric)) * COALESCE(height, (0)::numeric))
    WHEN 'L'::text THEN COALESCE(length, (0)::numeric)
    WHEN 'No.'::text THEN (1)::numeric
    ELSE NULL::numeric
END),
  uom text NOT NULL,
  confidence text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT format_activity_area_allocations_pkey PRIMARY KEY (id)

);
CREATE TABLE public.format_activity_bom_override (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  format_id uuid NOT NULL,
  brand_activity_id uuid NOT NULL,
  generic_material_code text NOT NULL,
  quantity_per_unit numeric NOT NULL,
  basis_qty numeric NOT NULL DEFAULT 1,
  material_unit text NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT format_activity_bom_override_pkey PRIMARY KEY (id)

);
CREATE TABLE public.project_activity_bom_override (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  boq_activity_id uuid NOT NULL,
  generic_material_code text NOT NULL,
  quantity_per_unit numeric NOT NULL,
  basis_qty numeric NOT NULL DEFAULT 1,
  material_unit text NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT project_activity_bom_override_pkey PRIMARY KEY (id)

);
CREATE TABLE public.ship_to_addresses (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  label text NOT NULL,
  address text NOT NULL,
  city text,
  state text,
  pincode text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ship_to_addresses_pkey PRIMARY KEY (id)

);
CREATE TABLE public.user_site_access (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  site_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_site_access_pkey PRIMARY KEY (id)

);
CREATE TABLE public.role_scope (

  role text NOT NULL,
  scope text NOT NULL CHECK (scope = ANY (ARRAY['all_sites'::text, 'allocated_sites'::text])),
  CONSTRAINT role_scope_pkey PRIMARY KEY (role)

);
CREATE TABLE public.ticket_categories (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ticket_categories_pkey PRIMARY KEY (id)

);
CREATE TABLE public.tickets (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  project_id uuid,
  site_id uuid,
  ticket_no text,
  ticket_type text NOT NULL CHECK (ticket_type = ANY (ARRAY['material_request'::text, 'local_material_and_payment'::text, 'manpower_request'::text, 'manpower_payment_request'::text, 'omni_payment'::text, 'others'::text])),
  ticket_category_id uuid,
  requested_by uuid,
  required_by_date date,
  priority text NOT NULL DEFAULT 'normal'::indent_priority,
  status text NOT NULL DEFAULT 'draft'::text,
  est_total numeric NOT NULL DEFAULT 0,
  notes text,
  description text,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid,
  rejection_reason text,
  rejection_remark text,
  rejected_at timestamp with time zone,
  rejected_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tickets_pkey PRIMARY KEY (id)

);
CREATE TABLE public.ticket_items (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  material_id uuid,
  activity_id uuid,
  bom_item_id uuid,
  area_id uuid,
  uom text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  qty_po numeric NOT NULL DEFAULT 0,
  qty_pending numeric,
  est_rate numeric NOT NULL DEFAULT 0,
  est_amount numeric, 2),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ticket_items_pkey PRIMARY KEY (id)

);
CREATE TABLE public.vendor_opening_balances (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  organisation_id uuid NOT NULL,
  project_id uuid,
  balance_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vendor_opening_balances_pkey PRIMARY KEY (id)

);
CREATE TABLE public.expense_documents (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  ticket_id uuid,
  po_id uuid,
  grn_id uuid,
  invoice_id uuid,
  payment_id uuid,
  title text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  uploaded_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT expense_documents_pkey PRIMARY KEY (id)

);
CREATE TABLE public.match_decision_log (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  brand_activity_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision = ANY (ARRAY['match_existing'::text, 'match_as_variant'::text, 'create_new_master'::text, 'human_review'::text, 'rejected'::text])),
  confidence numeric,
  master_activity_id uuid,
  candidates_considered jsonb DEFAULT '[]'::jsonb,
  activity_family text,
  classification_used jsonb,
  specs_used jsonb,
  reasoning text,
  method text,
  best_candidate_id uuid,
  best_candidate_sim numeric,
  best_candidate_short text,
  gpt_consulted boolean NOT NULL DEFAULT false,
  gpt_verdict jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  spec_embedding text,
  human_confirmed boolean NOT NULL DEFAULT false,
  human_correction text,
  spec_similarity numeric,
  combined_score numeric,
  brand_specs jsonb,
  master_specs jsonb,
  fast_confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamp with time zone,
  used_spec_fallback text,
  CONSTRAINT match_decision_log_pkey PRIMARY KEY (id)

);
CREATE TABLE public.openai_call_log (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  brand_activity_id uuid,
  step text NOT NULL,
  model text NOT NULL,
  status text NOT NULL DEFAULT 'success'::text,
  http_status integer,
  error_type text,
  error_message text,
  stack_trace text,
  request_payload jsonb,
  response_payload jsonb,
  parsed_output jsonb,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT openai_call_log_pkey PRIMARY KEY (id)

);
CREATE TABLE public.activity_family_embeddings (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  family_label text NOT NULL,
  embedding text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_family_embeddings_pkey PRIMARY KEY (id)

);
CREATE TABLE public.matching_threshold_config (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  high_threshold numeric NOT NULL DEFAULT 0.85,
  min_threshold numeric NOT NULL DEFAULT 0.28,
  spec_high_threshold numeric NOT NULL DEFAULT 0.80,
  spec_min_threshold numeric NOT NULL DEFAULT 0.50,
  spec_weight numeric NOT NULL DEFAULT 0.60,
  desc_weight numeric NOT NULL DEFAULT 0.40,
  calibrated_at timestamp with time zone,
  calibrated_from_n integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT matching_threshold_config_pkey PRIMARY KEY (id)

);
CREATE TABLE public.ai_pipeline_warnings (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  activity_table text NOT NULL CHECK (activity_table = ANY (ARRAY['brand_activities'::text, 'master_activities'::text])),
  warning_code text NOT NULL,
  warning_detail text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_pipeline_warnings_pkey PRIMARY KEY (id)

);
CREATE TABLE public.activity_family_registry (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  family_name text NOT NULL,
  family_embedding text,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  use_count integer NOT NULL DEFAULT 1,
  CONSTRAINT activity_family_registry_pkey PRIMARY KEY (id)

);
CREATE TABLE public.material_recipes (

  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  master_activity_id uuid NOT NULL,
  name text NOT NULL,
  archetype text NOT NULL CHECK (archetype = ANY (ARRAY['linear'::text, 'area'::text, 'volume'::text, 'grid_spacing'::text, 'ratio_mix'::text, 'composite'::text])),
  required_variables text[] NOT NULL,
  formulas jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT material_recipes_pkey PRIMARY KEY (id)

);
ALTER TABLE public.projects ADD CONSTRAINT projects_format_id_fkey FOREIGN KEY (format_id) REFERENCES public.brand_formats(id);

-- Foreign Key Constraints --
ALTER TABLE public.tenant_subscriptions ADD CONSTRAINT tenant_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.tenant_subscriptions ADD CONSTRAINT tenant_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_permission_code_fkey FOREIGN KEY (permission_code) REFERENCES public.permissions(code);
ALTER TABLE public.organisations ADD CONSTRAINT organisations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.organisation_roles ADD CONSTRAINT organisation_roles_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);
ALTER TABLE public.gst_registrations ADD CONSTRAINT gst_registrations_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);
ALTER TABLE public.organisation_bank_accounts ADD CONSTRAINT organisation_bank_accounts_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);
ALTER TABLE public.organisation_bank_accounts ADD CONSTRAINT organisation_bank_accounts_gst_registration_id_fkey FOREIGN KEY (gst_registration_id) REFERENCES public.gst_registrations(id);
ALTER TABLE public.organisation_contacts ADD CONSTRAINT organisation_contacts_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);
ALTER TABLE public.brands ADD CONSTRAINT brands_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.sites ADD CONSTRAINT sites_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.sites ADD CONSTRAINT sites_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);
ALTER TABLE public.projects ADD CONSTRAINT projects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.projects ADD CONSTRAINT projects_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);
ALTER TABLE public.projects ADD CONSTRAINT projects_pm_user_id_fkey FOREIGN KEY (pm_user_id) REFERENCES auth.users(id);
ALTER TABLE public.projects ADD CONSTRAINT projects_client_org_id_fkey FOREIGN KEY (client_org_id) REFERENCES public.organisations(id);
ALTER TABLE public.projects ADD CONSTRAINT projects_pmc_org_id_fkey FOREIGN KEY (pmc_org_id) REFERENCES public.organisations(id);
ALTER TABLE public.projects ADD CONSTRAINT projects_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);
ALTER TABLE public.project_contract_terms ADD CONSTRAINT project_contract_terms_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.areas ADD CONSTRAINT areas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.areas ADD CONSTRAINT areas_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.areas ADD CONSTRAINT areas_parent_area_id_fkey FOREIGN KEY (parent_area_id) REFERENCES public.areas(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_current_version_fk FOREIGN KEY (current_version_id) REFERENCES public.document_versions(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.documents ADD CONSTRAINT documents_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id);
ALTER TABLE public.document_versions ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);
ALTER TABLE public.document_versions ADD CONSTRAINT document_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);
ALTER TABLE public.numbering_counters ADD CONSTRAINT numbering_counters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.tenant_settings ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.material_categories ADD CONSTRAINT item_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.material_categories ADD CONSTRAINT item_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.material_categories(id);
ALTER TABLE public.generic_materials ADD CONSTRAINT items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.material_categories(id);
ALTER TABLE public.generic_materials ADD CONSTRAINT items_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.generic_materials ADD CONSTRAINT items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.boqs ADD CONSTRAINT boqs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.boqs ADD CONSTRAINT boqs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.boqs ADD CONSTRAINT boqs_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.boqs ADD CONSTRAINT boqs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.boq_sections ADD CONSTRAINT boq_sections_boq_id_fkey FOREIGN KEY (boq_id) REFERENCES public.boqs(id);
ALTER TABLE public.boq_sections ADD CONSTRAINT boq_sections_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.boq_sections(id);
ALTER TABLE public.boq_sections ADD CONSTRAINT boq_sections_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.boq_activities ADD CONSTRAINT boq_items_boq_id_fkey FOREIGN KEY (boq_id) REFERENCES public.boqs(id);
ALTER TABLE public.boq_activities ADD CONSTRAINT boq_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.boq_sections(id);
ALTER TABLE public.boq_activities ADD CONSTRAINT boq_items_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.boq_activities ADD CONSTRAINT boq_activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.boq_activities ADD CONSTRAINT boq_activities_activity_fk FOREIGN KEY (activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.boq_revisions ADD CONSTRAINT boq_revisions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.boq_revisions ADD CONSTRAINT boq_revisions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.boq_revisions ADD CONSTRAINT boq_revisions_from_boq_id_fkey FOREIGN KEY (from_boq_id) REFERENCES public.boqs(id);
ALTER TABLE public.boq_revisions ADD CONSTRAINT boq_revisions_to_boq_id_fkey FOREIGN KEY (to_boq_id) REFERENCES public.boqs(id);
ALTER TABLE public.boq_revisions ADD CONSTRAINT boq_revisions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);
ALTER TABLE public.boms ADD CONSTRAINT boms_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.boms ADD CONSTRAINT boms_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.boms ADD CONSTRAINT boms_boq_id_fkey FOREIGN KEY (boq_id) REFERENCES public.boqs(id);
ALTER TABLE public.boms ADD CONSTRAINT boms_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.boms ADD CONSTRAINT boms_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.boms(id);
ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_item_id_fkey FOREIGN KEY (material_id) REFERENCES public.generic_materials(id);
ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.bom_items ADD CONSTRAINT bom_items_source_boq_item_id_fkey FOREIGN KEY (source_boq_activity_id) REFERENCES public.boq_activities(id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organisations(id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_parent_po_id_fkey FOREIGN KEY (parent_po_id) REFERENCES public.purchase_orders(id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_prepared_by_fkey FOREIGN KEY (prepared_by) REFERENCES auth.users(id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_ship_to_address_id_fkey FOREIGN KEY (ship_to_address_id) REFERENCES public.ship_to_addresses(id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_bill_to_gst_registration_id_fkey FOREIGN KEY (bill_to_gst_registration_id) REFERENCES public.gst_registrations(id);
ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);
ALTER TABLE public.po_items ADD CONSTRAINT po_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);
ALTER TABLE public.po_items ADD CONSTRAINT po_items_item_id_fkey FOREIGN KEY (material_id) REFERENCES public.generic_materials(id);
ALTER TABLE public.po_items ADD CONSTRAINT po_items_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.po_items ADD CONSTRAINT po_items_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.po_items ADD CONSTRAINT po_items_ticket_item_id_fkey FOREIGN KEY (ticket_item_id) REFERENCES public.ticket_items(id);
ALTER TABLE public.grns ADD CONSTRAINT grns_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.grns ADD CONSTRAINT grns_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.grns ADD CONSTRAINT grns_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);
ALTER TABLE public.grns ADD CONSTRAINT grns_received_by_fkey FOREIGN KEY (received_by) REFERENCES auth.users(id);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.grns(id);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES public.po_items(id);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_item_id_fkey FOREIGN KEY (material_id) REFERENCES public.generic_materials(id);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);
ALTER TABLE public.grn_items ADD CONSTRAINT grn_items_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.vendor_invoices ADD CONSTRAINT vendor_invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.vendor_invoices ADD CONSTRAINT vendor_invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.vendor_invoices ADD CONSTRAINT vendor_invoices_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organisations(id);
ALTER TABLE public.vendor_invoices ADD CONSTRAINT vendor_invoices_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);
ALTER TABLE public.vendor_invoices ADD CONSTRAINT vendor_invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.vendor_invoices ADD CONSTRAINT vendor_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.vendor_invoices ADD CONSTRAINT vendor_invoices_disputed_by_fkey FOREIGN KEY (disputed_by) REFERENCES auth.users(id);
ALTER TABLE public.vendor_invoice_items ADD CONSTRAINT vendor_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.vendor_invoices(id);
ALTER TABLE public.vendor_invoice_items ADD CONSTRAINT vendor_invoice_items_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES public.po_items(id);
ALTER TABLE public.vendor_invoice_items ADD CONSTRAINT vendor_invoice_items_grn_item_id_fkey FOREIGN KEY (grn_item_id) REFERENCES public.grn_items(id);
ALTER TABLE public.vendor_invoice_items ADD CONSTRAINT vendor_invoice_items_item_id_fkey FOREIGN KEY (material_id) REFERENCES public.generic_materials(id);
ALTER TABLE public.vendor_invoice_items ADD CONSTRAINT vendor_invoice_items_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.payments ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organisations(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.organisation_bank_accounts(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);
ALTER TABLE public.payments ADD CONSTRAINT payments_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);
ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);
ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.vendor_invoices(id);
ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id);
ALTER TABLE public.payment_allocations ADD CONSTRAINT payment_allocations_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);
ALTER TABLE public.tds_ledger ADD CONSTRAINT tds_ledger_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.tds_ledger ADD CONSTRAINT tds_ledger_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);
ALTER TABLE public.tds_ledger ADD CONSTRAINT tds_ledger_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organisations(id);
ALTER TABLE public.retention_ledger ADD CONSTRAINT retention_ledger_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.retention_ledger ADD CONSTRAINT retention_ledger_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.retention_ledger ADD CONSTRAINT retention_ledger_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organisations(id);
ALTER TABLE public.retention_ledger ADD CONSTRAINT retention_ledger_source_invoice_id_fkey FOREIGN KEY (source_invoice_id) REFERENCES public.vendor_invoices(id);
ALTER TABLE public.retention_ledger ADD CONSTRAINT retention_ledger_release_payment_id_fkey FOREIGN KEY (release_payment_id) REFERENCES public.payments(id);
ALTER TABLE public.activity_area_allocations ADD CONSTRAINT activity_area_allocations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.activity_area_allocations ADD CONSTRAINT activity_area_allocations_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.boq_activities(id);
ALTER TABLE public.activity_area_allocations ADD CONSTRAINT activity_area_allocations_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organisations(id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.drawing_name_options ADD CONSTRAINT drawing_name_options_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.drawing_name_options ADD CONSTRAINT drawing_name_options_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.material_codes ADD CONSTRAINT material_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.material_codes ADD CONSTRAINT material_codes_tenant_id_generic_material_code_fkey FOREIGN KEY (tenant_id) REFERENCES public.generic_materials(tenant_id);
ALTER TABLE public.material_codes ADD CONSTRAINT material_codes_tenant_id_generic_material_code_fkey FOREIGN KEY (generic_material_code) REFERENCES public.generic_materials(generic_material_code);
ALTER TABLE public.material_packs ADD CONSTRAINT material_packs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.material_packs ADD CONSTRAINT material_packs_tenant_id_material_code_fkey FOREIGN KEY (tenant_id) REFERENCES public.material_codes(tenant_id);
ALTER TABLE public.material_packs ADD CONSTRAINT material_packs_tenant_id_material_code_fkey FOREIGN KEY (material_code) REFERENCES public.material_codes(material_code);
ALTER TABLE public.master_activities ADD CONSTRAINT master_activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.master_activities ADD CONSTRAINT master_activities_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.master_activities(id);
ALTER TABLE public.master_activities ADD CONSTRAINT master_activities_source_brand_id_fkey FOREIGN KEY (source_brand_id) REFERENCES public.brands(id);
ALTER TABLE public.master_activities ADD CONSTRAINT master_activities_source_brand_activity_id_fkey FOREIGN KEY (source_brand_activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.master_activities ADD CONSTRAINT master_activities_root_ancestor_id_fkey FOREIGN KEY (root_ancestor_id) REFERENCES public.master_activities(id);
ALTER TABLE public.master_activities ADD CONSTRAINT master_activities_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES auth.users(id);
ALTER TABLE public.master_activity_rates ADD CONSTRAINT master_activity_rates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.master_activity_rates ADD CONSTRAINT master_activity_rates_master_activity_id_fkey FOREIGN KEY (master_activity_id) REFERENCES public.master_activities(id);
ALTER TABLE public.master_activity_rates ADD CONSTRAINT master_activity_rates_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.master_activity_rates ADD CONSTRAINT master_activity_rates_source_brand_activity_id_fkey FOREIGN KEY (source_brand_activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.brand_activities ADD CONSTRAINT brand_activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.brand_activities ADD CONSTRAINT brand_activities_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);
ALTER TABLE public.brand_activities ADD CONSTRAINT brand_activities_master_activity_fk FOREIGN KEY (master_activity_id) REFERENCES public.master_activities(id);
ALTER TABLE public.brand_activities ADD CONSTRAINT brand_activities_rate_variance_acknowledged_by_fkey FOREIGN KEY (rate_variance_acknowledged_by) REFERENCES auth.users(id);
ALTER TABLE public.brand_activities ADD CONSTRAINT brand_activities_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.brand_activities ADD CONSTRAINT brand_activities_import_job_id_fkey FOREIGN KEY (import_job_id) REFERENCES public.import_jobs(id);
ALTER TABLE public.brand_activities ADD CONSTRAINT brand_activities_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.brand_activities ADD CONSTRAINT brand_activities_match_verified_by_fkey FOREIGN KEY (match_verified_by) REFERENCES auth.users(id);
ALTER TABLE public.master_bom ADD CONSTRAINT master_bom_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.master_bom ADD CONSTRAINT master_bom_master_activity_id_fkey FOREIGN KEY (master_activity_id) REFERENCES public.master_activities(id);
ALTER TABLE public.master_bom ADD CONSTRAINT master_bom_material_unit_fkey FOREIGN KEY (material_unit) REFERENCES public.uom_master(code);
ALTER TABLE public.master_bom ADD CONSTRAINT master_bom_generic_material_fk FOREIGN KEY (tenant_id) REFERENCES public.generic_materials(tenant_id);
ALTER TABLE public.master_bom ADD CONSTRAINT master_bom_generic_material_fk FOREIGN KEY (generic_material_code) REFERENCES public.generic_materials(generic_material_code);
ALTER TABLE public.master_bom ADD CONSTRAINT master_bom_generic_material_code_fkey FOREIGN KEY (generic_material_code) REFERENCES public.generic_materials(generic_material_code);
ALTER TABLE public.mrp_runs ADD CONSTRAINT mrp_runs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.mrp_runs ADD CONSTRAINT mrp_runs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.mrp_runs ADD CONSTRAINT mrp_runs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES auth.users(id);
ALTER TABLE public.mrp_requirements ADD CONSTRAINT mrp_requirements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.mrp_requirements ADD CONSTRAINT mrp_requirements_mrp_run_id_fkey FOREIGN KEY (mrp_run_id) REFERENCES public.mrp_runs(id);
ALTER TABLE public.mrp_requirements ADD CONSTRAINT mrp_requirements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.mrp_requirements ADD CONSTRAINT mrp_requirements_material_unit_fkey FOREIGN KEY (material_unit) REFERENCES public.uom_master(code);
ALTER TABLE public.mrp_requirements ADD CONSTRAINT mrp_req_generic_material_fk FOREIGN KEY (tenant_id) REFERENCES public.generic_materials(tenant_id);
ALTER TABLE public.mrp_requirements ADD CONSTRAINT mrp_req_generic_material_fk FOREIGN KEY (generic_material_code) REFERENCES public.generic_materials(generic_material_code);
ALTER TABLE public.mrp_requirements ADD CONSTRAINT mrp_req_material_code_fk FOREIGN KEY (tenant_id) REFERENCES public.material_codes(tenant_id);
ALTER TABLE public.mrp_requirements ADD CONSTRAINT mrp_req_material_code_fk FOREIGN KEY (material_code) REFERENCES public.material_codes(material_code);
ALTER TABLE public.mrp_requirements ADD CONSTRAINT mrp_requirements_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);
ALTER TABLE public.project_material_category_rules ADD CONSTRAINT project_material_category_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.project_material_category_rules ADD CONSTRAINT project_material_category_rules_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.project_material_category_rules ADD CONSTRAINT project_material_category_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.material_categories(id);
ALTER TABLE public.brand_material_selection ADD CONSTRAINT brand_material_selection_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.brand_material_selection ADD CONSTRAINT brand_material_selection_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);
ALTER TABLE public.brand_material_selection ADD CONSTRAINT bms_generic_material_fk FOREIGN KEY (tenant_id) REFERENCES public.generic_materials(tenant_id);
ALTER TABLE public.brand_material_selection ADD CONSTRAINT bms_generic_material_fk FOREIGN KEY (generic_material_code) REFERENCES public.generic_materials(generic_material_code);
ALTER TABLE public.brand_material_selection ADD CONSTRAINT bms_material_code_fk FOREIGN KEY (tenant_id) REFERENCES public.material_codes(tenant_id);
ALTER TABLE public.brand_material_selection ADD CONSTRAINT bms_material_code_fk FOREIGN KEY (material_code) REFERENCES public.material_codes(material_code);
ALTER TABLE public.brand_approved_material_brands ADD CONSTRAINT brand_approved_material_brands_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.brand_approved_material_brands ADD CONSTRAINT brand_approved_material_brands_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);
ALTER TABLE public.brand_approved_material_brands ADD CONSTRAINT brand_approved_material_brands_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.material_categories(id);
ALTER TABLE public.project_area_material_selection ADD CONSTRAINT project_area_material_selection_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.project_area_material_selection ADD CONSTRAINT project_area_material_selection_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.project_area_material_selection ADD CONSTRAINT project_area_material_selection_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);
ALTER TABLE public.project_area_material_selection ADD CONSTRAINT pams_generic_material_fk FOREIGN KEY (tenant_id) REFERENCES public.generic_materials(tenant_id);
ALTER TABLE public.project_area_material_selection ADD CONSTRAINT pams_generic_material_fk FOREIGN KEY (generic_material_code) REFERENCES public.generic_materials(generic_material_code);
ALTER TABLE public.project_area_material_selection ADD CONSTRAINT pams_material_code_fk FOREIGN KEY (tenant_id) REFERENCES public.material_codes(tenant_id);
ALTER TABLE public.project_area_material_selection ADD CONSTRAINT pams_material_code_fk FOREIGN KEY (material_code) REFERENCES public.material_codes(material_code);
ALTER TABLE public.boq_activity_measurements ADD CONSTRAINT boq_activity_measurements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.boq_activity_measurements ADD CONSTRAINT boq_activity_measurements_boq_activity_id_fkey FOREIGN KEY (boq_activity_id) REFERENCES public.boq_activities(id);
ALTER TABLE public.boq_activity_measurements ADD CONSTRAINT boq_activity_measurements_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);
ALTER TABLE public.credit_notes ADD CONSTRAINT credit_notes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.credit_notes ADD CONSTRAINT credit_notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.credit_notes ADD CONSTRAINT credit_notes_vendor_org_id_fkey FOREIGN KEY (vendor_org_id) REFERENCES public.organisations(id);
ALTER TABLE public.credit_notes ADD CONSTRAINT credit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.vendor_invoices(id);
ALTER TABLE public.credit_notes ADD CONSTRAINT credit_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.import_jobs ADD CONSTRAINT import_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.import_jobs ADD CONSTRAINT import_jobs_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES auth.users(id);
ALTER TABLE public.import_jobs ADD CONSTRAINT import_jobs_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);
ALTER TABLE public.import_jobs ADD CONSTRAINT import_jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.import_staging ADD CONSTRAINT import_staging_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.import_staging ADD CONSTRAINT import_staging_import_job_id_fkey FOREIGN KEY (import_job_id) REFERENCES public.import_jobs(id);
ALTER TABLE public.import_staging ADD CONSTRAINT import_staging_parent_staging_id_fkey FOREIGN KEY (parent_staging_id) REFERENCES public.import_staging(id);
ALTER TABLE public.import_staging ADD CONSTRAINT import_staging_matched_master_activity_id_fkey FOREIGN KEY (matched_master_activity_id) REFERENCES public.master_activities(id);
ALTER TABLE public.import_staging ADD CONSTRAINT import_staging_final_master_activity_id_fkey FOREIGN KEY (final_master_activity_id) REFERENCES public.master_activities(id);
ALTER TABLE public.import_staging ADD CONSTRAINT import_staging_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
ALTER TABLE public.activity_match_proposals ADD CONSTRAINT activity_match_proposals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.activity_match_proposals ADD CONSTRAINT activity_match_proposals_brand_activity_id_fkey FOREIGN KEY (brand_activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.activity_match_proposals ADD CONSTRAINT activity_match_proposals_matched_master_activity_id_fkey FOREIGN KEY (matched_master_activity_id) REFERENCES public.master_activities(id);
ALTER TABLE public.activity_match_proposals ADD CONSTRAINT activity_match_proposals_suggested_uom_fkey FOREIGN KEY (suggested_uom) REFERENCES public.uom_master(code);
ALTER TABLE public.activity_match_proposals ADD CONSTRAINT activity_match_proposals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
ALTER TABLE public.activity_match_proposals ADD CONSTRAINT activity_match_proposals_suggested_parent_id_fkey FOREIGN KEY (suggested_parent_id) REFERENCES public.master_activities(id);
ALTER TABLE public.brand_formats ADD CONSTRAINT brand_formats_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.brand_formats ADD CONSTRAINT brand_formats_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);
ALTER TABLE public.format_boq_activities ADD CONSTRAINT format_boq_activities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.format_boq_activities ADD CONSTRAINT format_boq_activities_format_id_fkey FOREIGN KEY (format_id) REFERENCES public.brand_formats(id);
ALTER TABLE public.format_boq_activities ADD CONSTRAINT format_boq_activities_brand_activity_id_fkey FOREIGN KEY (brand_activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.format_boq_activities ADD CONSTRAINT format_boq_activities_uom_override_fkey FOREIGN KEY (uom_override) REFERENCES public.uom_master(code);
ALTER TABLE public.format_material_selection ADD CONSTRAINT format_material_selection_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.format_material_selection ADD CONSTRAINT format_material_selection_format_id_fkey FOREIGN KEY (format_id) REFERENCES public.brand_formats(id);
ALTER TABLE public.format_material_selection ADD CONSTRAINT format_material_selection_generic_material_code_fkey FOREIGN KEY (generic_material_code) REFERENCES public.generic_materials(generic_material_code);
ALTER TABLE public.format_areas ADD CONSTRAINT format_areas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.format_areas ADD CONSTRAINT format_areas_format_id_fkey FOREIGN KEY (format_id) REFERENCES public.brand_formats(id);
ALTER TABLE public.format_areas ADD CONSTRAINT format_areas_parent_area_id_fkey FOREIGN KEY (parent_area_id) REFERENCES public.format_areas(id);
ALTER TABLE public.format_activity_area_allocations ADD CONSTRAINT format_activity_area_allocations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.format_activity_area_allocations ADD CONSTRAINT format_activity_area_allocations_format_id_fkey FOREIGN KEY (format_id) REFERENCES public.brand_formats(id);
ALTER TABLE public.format_activity_area_allocations ADD CONSTRAINT format_activity_area_allocations_brand_activity_id_fkey FOREIGN KEY (brand_activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.format_activity_area_allocations ADD CONSTRAINT format_activity_area_allocations_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.format_areas(id);
ALTER TABLE public.format_activity_area_allocations ADD CONSTRAINT format_activity_area_allocations_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.format_activity_bom_override ADD CONSTRAINT format_activity_bom_override_generic_material_code_fkey FOREIGN KEY (generic_material_code) REFERENCES public.generic_materials(generic_material_code);
ALTER TABLE public.format_activity_bom_override ADD CONSTRAINT format_activity_bom_override_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.format_activity_bom_override ADD CONSTRAINT format_activity_bom_override_format_id_fkey FOREIGN KEY (format_id) REFERENCES public.brand_formats(id);
ALTER TABLE public.format_activity_bom_override ADD CONSTRAINT format_activity_bom_override_brand_activity_id_fkey FOREIGN KEY (brand_activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.format_activity_bom_override ADD CONSTRAINT format_activity_bom_override_material_unit_fkey FOREIGN KEY (material_unit) REFERENCES public.uom_master(code);
ALTER TABLE public.project_activity_bom_override ADD CONSTRAINT project_activity_bom_override_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.project_activity_bom_override ADD CONSTRAINT project_activity_bom_override_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.project_activity_bom_override ADD CONSTRAINT project_activity_bom_override_boq_activity_id_fkey FOREIGN KEY (boq_activity_id) REFERENCES public.boq_activities(id);
ALTER TABLE public.project_activity_bom_override ADD CONSTRAINT project_activity_bom_override_generic_material_code_fkey FOREIGN KEY (generic_material_code) REFERENCES public.generic_materials(generic_material_code);
ALTER TABLE public.project_activity_bom_override ADD CONSTRAINT project_activity_bom_override_material_unit_fkey FOREIGN KEY (material_unit) REFERENCES public.uom_master(code);
ALTER TABLE public.ship_to_addresses ADD CONSTRAINT ship_to_addresses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.user_site_access ADD CONSTRAINT user_site_access_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.user_site_access ADD CONSTRAINT user_site_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.user_site_access ADD CONSTRAINT user_site_access_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);
ALTER TABLE public.ticket_categories ADD CONSTRAINT ticket_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_ticket_category_id_fkey FOREIGN KEY (ticket_category_id) REFERENCES public.ticket_categories(id);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.tickets ADD CONSTRAINT tickets_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES auth.users(id);
ALTER TABLE public.ticket_items ADD CONSTRAINT ticket_items_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);
ALTER TABLE public.ticket_items ADD CONSTRAINT ticket_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.generic_materials(id);
ALTER TABLE public.ticket_items ADD CONSTRAINT ticket_items_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.ticket_items ADD CONSTRAINT ticket_items_bom_item_id_fkey FOREIGN KEY (bom_item_id) REFERENCES public.bom_items(id);
ALTER TABLE public.ticket_items ADD CONSTRAINT ticket_items_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);
ALTER TABLE public.ticket_items ADD CONSTRAINT ticket_items_uom_fkey FOREIGN KEY (uom) REFERENCES public.uom_master(code);
ALTER TABLE public.vendor_opening_balances ADD CONSTRAINT vendor_opening_balances_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.vendor_opening_balances ADD CONSTRAINT vendor_opening_balances_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);
ALTER TABLE public.vendor_opening_balances ADD CONSTRAINT vendor_opening_balances_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.expense_documents ADD CONSTRAINT expense_documents_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.grns(id);
ALTER TABLE public.expense_documents ADD CONSTRAINT expense_documents_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.vendor_invoices(id);
ALTER TABLE public.expense_documents ADD CONSTRAINT expense_documents_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);
ALTER TABLE public.expense_documents ADD CONSTRAINT expense_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);
ALTER TABLE public.expense_documents ADD CONSTRAINT expense_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.expense_documents ADD CONSTRAINT expense_documents_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);
ALTER TABLE public.expense_documents ADD CONSTRAINT expense_documents_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);
ALTER TABLE public.match_decision_log ADD CONSTRAINT match_decision_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.match_decision_log ADD CONSTRAINT match_decision_log_brand_activity_id_fkey FOREIGN KEY (brand_activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.match_decision_log ADD CONSTRAINT match_decision_log_master_activity_id_fkey FOREIGN KEY (master_activity_id) REFERENCES public.master_activities(id);
ALTER TABLE public.match_decision_log ADD CONSTRAINT match_decision_log_best_candidate_id_fkey FOREIGN KEY (best_candidate_id) REFERENCES public.master_activities(id);
ALTER TABLE public.openai_call_log ADD CONSTRAINT openai_call_log_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.openai_call_log ADD CONSTRAINT openai_call_log_brand_activity_id_fkey FOREIGN KEY (brand_activity_id) REFERENCES public.brand_activities(id);
ALTER TABLE public.matching_threshold_config ADD CONSTRAINT matching_threshold_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.ai_pipeline_warnings ADD CONSTRAINT ai_pipeline_warnings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.activity_family_registry ADD CONSTRAINT activity_family_registry_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.material_recipes ADD CONSTRAINT material_recipes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.material_recipes ADD CONSTRAINT material_recipes_master_activity_id_fkey FOREIGN KEY (master_activity_id) REFERENCES public.master_activities(id);
