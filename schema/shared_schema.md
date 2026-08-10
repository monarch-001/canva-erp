# Shared Database Schema (Chhabee AIOS & Canva ERP)

This document maps the shared database schema from the main project **Chhabee AIOS**, which the **Canva ERP** side project will reuse and extend.

---

## 1. Auth & Core Multi-Tenancy

### `tenants`
*   `id` (uuid, PK)
*   `name` (text)
*   `slug` (text, Unique)
*   `logo_url` (text, Nullable)
*   `primary_color` (text, Nullable)
*   `is_active` (bool)
*   `version` (int4)

### `profiles`
*   `user_id` (uuid, PK) - Maps to Supabase Auth User ID.
*   `full_name` (text, Nullable)
*   `phone` (text, Nullable)
*   `email` (text, Nullable)
*   `designation` (text, Nullable)
*   `avatar_url` (text, Nullable)
*   `is_active` (bool)

### `user_roles`
*   `id` (uuid, PK)
*   `user_id` (uuid) -> FK `profiles`
*   `tenant_id` (uuid) -> FK `tenants`
*   `role` (app_role enum: `commercial`, `qs`, `architect`, `procurement`, `finance`, `admin`, `execution`)

---

## 2. Core Entities

### `organisations`
Represents clients, vendors, contractors, and self-entities.
*   `id` (uuid, PK)
*   `tenant_id` (uuid)
*   `legal_name` (text)
*   `display_name` (text, Nullable)
*   `pan` / `cin` (text, Nullable)
*   `is_self_entity` (bool)
*   `is_active` (bool)

### `organisation_roles`
*   `id` (uuid, PK)
*   `tenant_id` (uuid)
*   `organisation_id` (uuid) -> FK `organisations`
*   `role` (org_role enum: `vendor`, `subcontractor`, `contractor`, `client`, `consultant`, `pmc`, `bank`, `regulator`)
*   `is_primary` (bool)

### `brands`
*   `id` (uuid, PK)
*   `tenant_id` (uuid)
*   `name` (text)
*   `code` (text, Nullable)
*   `is_active` (bool)

### `sites`
*   `id` (uuid, PK)
*   `tenant_id` (uuid)
*   `brand_id` (uuid) -> FK `brands`
*   `name` (text)
*   `address` / `city` / `state` / `pincode` (text, Nullable)
*   `is_active` (bool)

### `projects`
*   `id` (uuid, PK)
*   `tenant_id` (uuid)
*   `site_id` (uuid) -> FK `sites`
*   `brand_id` (uuid) -> FK `brands`
*   `name` (text)
*   `code` (text, Nullable)
*   `status` (project_status enum: `sales_pipeline`, `design`, `to_be_started`, `in_progress`, `suspended`, `snag_stage`, `dlp_period`, `dlp_service`, `beyond_dlp`)
*   `contract_value` (numeric, Nullable)
*   `pm_user_id` (uuid, Nullable) -> FK `profiles`
*   `client_org_id` (uuid, Nullable) -> FK `organisations`

---

## 3. Documents & Versions

### `documents`
*   `id` (uuid, PK)
*   `tenant_id` (uuid)
*   `project_id` (uuid, Nullable)
*   `title` (text)
*   `discipline` (document_discipline enum)
*   `status` (document_status enum)
*   `doc_kind` (document_kind enum: `boq`, `drawing`, `po`)
*   `current_version_id` (uuid, Nullable) -> FK `document_versions`

### `document_versions`
*   `id` (uuid, PK)
*   `tenant_id` (uuid)
*   `document_id` (uuid) -> FK `documents`
*   `version_number` (int4)
*   `storage_path` (text)
*   `file_name` (text)
*   `uploaded_by` (uuid, Nullable) -> FK `profiles`

---

## 4. Materials & Purchase Orders

### `generic_materials`
*   `id` (uuid, PK)
*   `generic_material_code` (text, Unique)
*   `name` (text)
*   `uom` (text)
*   `default_gst_rate` (numeric)

### `material_codes` (SKUs)
*   `id` (uuid, PK)
*   `generic_material_code` (text) -> Reference to `generic_materials`
*   `material_code` (text) - Specific supplier/brand SKU.
*   `material_brand` (text)

### `purchase_orders`
*   `id` (uuid, PK)
*   `tenant_id` (uuid)
*   `project_id` (uuid) -> FK `projects`
*   `vendor_org_id` (uuid) -> FK `organisations`
*   `po_no` (text, Nullable)
*   `status` (po_status enum)

### `po_items`
*   `id` (uuid, PK)
*   `po_id` (uuid) -> FK `purchase_orders`
*   `material_id` (uuid, Nullable) -> FK `generic_materials`/`material_codes`
*   `qty` (numeric)
*   `qty_received` (numeric)
*   `rate` (numeric)

### `grns` (Goods Receipt Notes)
*   `id` (uuid, PK)
*   `tenant_id` (uuid)
*   `project_id` (uuid)
*   `po_id` (uuid) -> FK `purchase_orders`
*   `grn_no` (text)

### `grn_items`
*   `id` (uuid, PK)
*   `grn_id` (uuid) -> FK `grns`
*   `po_item_id` (uuid) -> FK `po_items`
*   `qty_received` (numeric)
*   `qty_accepted` (numeric)
*   `qty_rejected` (numeric, Nullable)

---

## 5. Canva ERP Extended Schema (To Be Created/Checked)

These tables are custom to **Canva ERP** and do not conflict with the main system:

*   [`work_orders`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/PRDS/PRD-02-Work-Order-Management.md#L73) (Tracks factory-level production jobs)
*   [`wo_status_history`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/PRDS/PRD-02-Work-Order-Management.md#L128) (Status history timeline)
*   [`wo_drawings`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/PRDS/PRD-02-Work-Order-Management.md#L142) (Production-floor drawing attachments)
*   [`job_cards`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/PRDS/PRD-09-Job-Card-Production-Tracking.md#L43) (Daily carpenter task sheets)
*   [`job_card_assignments`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/PRDS/PRD-09-Job-Card-Production-Tracking.md#L137) (Carpenters assigned to tasks)
*   [`eod_updates`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/PRDS/PRD-09-Job-Card-Production-Tracking.md#L185) (EOD carpenter progress reports)
*   [`attendance`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/PRDS/PRD-09-Job-Card-Production-Tracking.md#L230) (Daily attendance metrics)
*   [`notification_log`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/PRDS/PRD-16-Dashboard-Notifications.md#L41) (ERP notifications engine)
