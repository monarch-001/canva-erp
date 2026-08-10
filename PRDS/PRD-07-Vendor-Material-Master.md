# PRD-07: VENDOR & MATERIAL MASTER
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
The Vendor Master and Material Master are the two foundational
reference databases of the procurement system. Every purchase
order, BOM, and inventory movement references these masters.
No procurement can happen without vendors and materials being
registered here first.

Both masters are managed by the Factory Manager only.
The Supervisor can view and use them but cannot modify them.

### Users of This Module
- Factory Manager: Full access — add, edit, deactivate
- Factory Supervisor: View and search only
- Others: No access

### Key Outcomes
- Single source of truth for all vendors and materials
- Validated compliance fields (GSTIN, PAN, IFSC, HSN)
- Auto-reorder alerts when stock hits threshold
- Vendor performance scoring from GRN and QC data
- Material rates always current (updated from GRN)

---

## 2. DATABASE SCHEMA

### 2.1 organisations (NEW TABLE)
Unified table for all external entities — vendors,
clients, contractors. One entity can be both vendor
and client simultaneously.

```sql
CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  legal_name TEXT NOT NULL,
  display_name TEXT,
  org_type TEXT NOT NULL CHECK (org_type IN (
    'vendor', 'client', 'both', 'contractor'
  )),
  vendor_type TEXT CHECK (vendor_type IN (
    'material_supplier',
    'contractual_carpenter',
    'service_vendor',
    'transport',
    'other'
  )),
  -- Address
  registered_address TEXT,
  city TEXT,
  state TEXT NOT NULL DEFAULT 'Haryana',
  pincode TEXT CHECK (
    pincode IS NULL OR pincode ~ '^[0-9]{6}$'
  ),
  country TEXT DEFAULT 'India',
  -- Compliance
  pan TEXT CHECK (
    pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'
  ),
  cin TEXT,
  -- Contact
  primary_phone TEXT,
  primary_email TEXT,
  website TEXT,
  -- Vendor-specific fields
  credit_days INTEGER DEFAULT 30,
  credit_limit NUMERIC DEFAULT 0,
  tds_applicable BOOLEAN DEFAULT false,
  tds_section TEXT DEFAULT '194C',
  tds_pct NUMERIC DEFAULT 2,
  -- Performance (auto-calculated)
  performance_score NUMERIC DEFAULT 5.0,
  on_time_delivery_pct NUMERIC DEFAULT 100,
  quality_rejection_pct NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  -- Status
  is_active BOOLEAN DEFAULT true,
  blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  notes TEXT,
  -- Standard
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX org_type_idx ON public.organisations(org_type);
CREATE INDEX org_active_idx ON public.organisations(is_active);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on organisations"
ON public.organisations FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view active organisations"
ON public.organisations FOR SELECT
USING (
  public.get_current_user_role() = 'supervisor'
  AND is_active = true
  AND deleted_at IS NULL
);
```

### 2.2 organisation_contacts (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.organisation_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID REFERENCES public.organisations(id)
    ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  designation TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organisation_contacts
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on contacts"
ON public.organisation_contacts FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view contacts"
ON public.organisation_contacts FOR SELECT
USING (public.get_current_user_role() = 'supervisor');
```

### 2.3 gst_registrations (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.gst_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID REFERENCES public.organisations(id)
    ON DELETE CASCADE NOT NULL,
  gstin TEXT NOT NULL CHECK (
    gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
  ),
  state TEXT NOT NULL,
  state_code TEXT NOT NULL,
  trade_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  registered_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gst_registrations
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on gst_registrations"
ON public.gst_registrations FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view GST registrations"
ON public.gst_registrations FOR SELECT
USING (public.get_current_user_role() = 'supervisor');
```

### 2.4 organisation_bank_accounts (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.organisation_bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID REFERENCES public.organisations(id)
    ON DELETE CASCADE NOT NULL,
  account_name TEXT,
  account_number TEXT NOT NULL,
  ifsc TEXT NOT NULL CHECK (
    ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'
  ),
  bank_name TEXT,
  branch TEXT,
  account_type TEXT DEFAULT 'current'
    CHECK (account_type IN (
      'current', 'savings', 'cc', 'od'
    )),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FM only — financial data
ALTER TABLE public.organisation_bank_accounts
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM only on bank accounts"
ON public.organisation_bank_accounts FOR ALL
USING (public.is_incoming_partner());
```

### 2.5 generic_materials (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.generic_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_code TEXT UNIQUE NOT NULL,
  material_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'plywood', 'laminate', 'hardware',
    'adhesive', 'finishing', 'packaging',
    'edge_tape', 'screws_fasteners', 'other'
  )),
  hsn_code TEXT NOT NULL,
  gst_rate NUMERIC DEFAULT 18,
  -- Units
  primary_uom TEXT NOT NULL,
  secondary_uom TEXT,
  uom_conversion NUMERIC DEFAULT 1,
  -- Rates
  standard_rate NUMERIC NOT NULL DEFAULT 0,
  last_purchase_rate NUMERIC DEFAULT 0,
  last_purchase_date DATE,
  -- Wastage (used in BOM calculations)
  wastage_pct NUMERIC DEFAULT 0,
  -- Vendors
  preferred_vendor_id UUID REFERENCES public.organisations(id),
  alternate_vendor_id UUID REFERENCES public.organisations(id),
  -- Reorder
  reorder_level NUMERIC DEFAULT 0,
  reorder_quantity NUMERIC DEFAULT 0,
  lead_time_days INTEGER DEFAULT 3,
  -- Status
  is_active BOOLEAN DEFAULT true,
  discontinued_at TIMESTAMPTZ,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX material_category_idx
  ON public.generic_materials(category);
CREATE INDEX material_active_idx
  ON public.generic_materials(is_active);

ALTER TABLE public.generic_materials
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on materials"
ON public.generic_materials FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view active materials"
ON public.generic_materials FOR SELECT
USING (
  public.get_current_user_role() = 'supervisor'
  AND is_active = true
  AND deleted_at IS NULL
);

CREATE POLICY "Supervisor can update material rates"
ON public.generic_materials FOR UPDATE
USING (public.get_current_user_role() = 'supervisor')
WITH CHECK (
  -- Supervisor can only update last_purchase_rate
  -- and last_purchase_date (via GRN flow)
  -- All other updates require FM
  public.get_current_user_role() = 'supervisor'
);
```

---

## 3. SCREENS & FLOWS

### 3.1 Vendor Master List (/vendors)

Access: FM (full) + Supervisor (view only)

```
Page title: "Vendor Master"
Top right: "+ Add Vendor" (FM only)

SUMMARY CARDS:
  Total Active Vendors: [count]
  Material Suppliers: [count]
  Contractual Carpenters: [count]
  Blacklisted: [count] — red (FM only)

FILTERS:
  Type (All / Material / Carpenter / Service / Transport)
  State / City
  Status (Active / Inactive / Blacklisted)
  Search (name, phone, GSTIN)

TABLE COLUMNS:
  Vendor Name | Type | City | Primary Phone |
  GSTIN (partial) | Credit Days |
  Performance Score | Status | Actions

PERFORMANCE SCORE:
  Stars or number (1.0 — 5.0)
  Colour coded:
    4.0-5.0: green
    3.0-3.9: amber
    < 3.0: red

ACTIONS (FM only):
  View | Edit | Deactivate | Blacklist

Supervisor sees: View only (no actions)
```

---

### 3.2 Add / Edit Vendor

Access: FM only
Route: /vendors/new and /vendors/:id/edit

```
SECTION 1: Basic Information
  Legal Name * (TEXT)
  Display Name (TEXT — short name for UI)
  Vendor Type * (dropdown):
    Material Supplier
    Contractual Carpenter
    Service Vendor
    Transport Vendor
    Other

SECTION 2: Address
  Registered Address (TEXTAREA)
  City * (TEXT)
  State * (dropdown — Indian states)
  Pincode (6 digits — validated)
  Country (default: India)

SECTION 3: Contact Details
  Primary Phone * (TEXT)
  Primary Email (EMAIL)
  Website (URL, optional)

  Named Contacts:
    [+ Add Contact] button
    Each contact:
      Name * | Designation | Phone | Email
      [Primary Contact] toggle
    Multiple contacts allowed
    One must be marked primary

SECTION 4: GST Registrations
  [+ Add GSTIN] button
  Each GSTIN entry:
    GSTIN * (15 chars — validated on entry)
      Error: "Invalid GSTIN format" if regex fails
    State * (auto-detected from first 2 digits)
    State Code (auto-populated)
    Trade Name
    Effective From (DATE)
    Registered Address (if different)
    [Primary] toggle
  Multiple GSTINs allowed (multi-state vendors)

SECTION 5: Banking Details (FM only)
  [+ Add Bank Account] button
  Each account:
    Account Name | Account Number * |
    IFSC * (11 chars — validated) |
    Bank Name | Branch |
    Account Type (Current/Savings/OD) |
    [Primary Account] toggle
  Multiple accounts allowed

SECTION 6: Compliance & Terms
  PAN (10 chars — validated)
  CIN (optional)
  Credit Days (NUMBER, default 30)
  Credit Limit ₹ (NUMBER, default 0 = no limit)
  TDS Applicable (TOGGLE, default OFF)
    If ON: TDS Section (194C default) | TDS Rate %

SECTION 7: Approved Material Categories
  Multi-select checkboxes:
    ☐ Plywood  ☐ Laminate  ☐ Hardware
    ☐ Adhesives  ☐ Finishing  ☐ Edge Tape
    ☐ Packaging  ☐ Other
  
  Label: "This vendor supplies these categories"
  Used to filter vendors when raising PO

SECTION 8: Notes
  Internal notes (TEXTAREA, not visible to vendor)

SUBMIT: [Save Vendor] button

ON SAVE:
  1. Validate GSTIN format (regex at DB level)
  2. Validate PAN format
  3. Validate IFSC format
  4. INSERT/UPDATE organisations
  5. INSERT/UPDATE contacts, GST, bank accounts
  6. Insert into audit_log
  7. Toast: "Vendor [name] saved"
```

---

### 3.3 Vendor Detail View (/vendors/:id)

```
HEADER:
  Vendor Name (large)
  Type badge | Status badge
  Performance Score (stars + number)

TABS:
  Tab 1: Profile
    All basic info, address, contact
    Primary contact highlighted

  Tab 2: GST & Compliance
    All GSTIN entries
    PAN, TDS details
    Credit terms

  Tab 3: Bank Accounts (FM only)
    All bank accounts
    Primary account highlighted

  Tab 4: Purchase History
    Last 10 POs to this vendor
    Each: PO number, date, amount, status
    Total spend (last 12 months)

  Tab 5: Performance
    On-time delivery %
    Quality rejection %
    Total orders
    Average lead time
    Monthly trend chart (last 6 months)
    Performance score breakdown:
      On-time: X/5
      Quality: X/5
      Overall: X/5

ACTIONS (FM only):
  [Edit Vendor]
  [Deactivate] — confirm dialog
  [Blacklist] — reason mandatory
    Blacklisted vendors blocked from new POs
```

---

### 3.4 Vendor Performance Score Calculation

Auto-calculated after every GRN and QC record.
Score = 1.0 to 5.0

```
ON_TIME_DELIVERY_SCORE (0-5):
  Delivered on or before expected date:   5.0
  Delivered 1 day late:                  4.0
  Delivered 2-3 days late:               3.0
  Delivered 4-7 days late:               2.0
  Delivered > 7 days late:               1.0

QUALITY_SCORE (0-5):
  0% rejection:                          5.0
  1-5% rejection:                        4.0
  6-10% rejection:                       3.0
  11-20% rejection:                      2.0
  > 20% rejection:                       1.0

OVERALL_SCORE:
  = (on_time_score × 0.6) + (quality_score × 0.4)
  Weighted: delivery more important than quality

UPDATE after each delivery:
  Rolling average of last 10 deliveries
  UPDATE organisations SET
    performance_score = [calculated score],
    on_time_delivery_pct = [percentage],
    quality_rejection_pct = [percentage],
    total_orders = total_orders + 1
```

---

### 3.5 Material Master List (/materials)

Access: FM (full) + Supervisor (view only)

```
Page title: "Material Master"
Top right: "+ Add Material" (FM only)

SUMMARY CARDS:
  Total Active Materials: [count]
  Below Reorder Level: [count] — amber
  Discontinued: [count] — grey

FILTERS:
  Category (All + each category)
  Status (Active / Discontinued)
  Search (name, code, HSN)

TABLE COLUMNS:
  Material Code | Name | Category |
  HSN Code | Primary UOM | Standard Rate |
  Last Purchase Rate | Reorder Level |
  Status | Actions

Highlight in amber: rows where current stock
  (from inventory) < reorder_level

ACTIONS (FM only):
  View | Edit | Discontinue
```

---

### 3.6 Add / Edit Material

Access: FM only
Route: /materials/new and /materials/:id/edit

```
SECTION 1: Basic Details
  Material Code * (auto-generated: MAT-PLY-001)
    Format: MAT-[CATEGORY CODE]-[SEQ]
    Category codes:
      PLY=Plywood, LAM=Laminate, HW=Hardware,
      ADH=Adhesive, FIN=Finishing, PKG=Packaging,
      EDT=Edge Tape, SCR=Screws, OTH=Other

  Material Name * (TEXT)
    Examples: "18mm BWR Plywood", "Merino Laminate",
    "Hydraulic Hinge 165°"

  Category * (dropdown — see categories above)

SECTION 2: Compliance
  HSN Code * (TEXT)
    Common codes for reference:
      Plywood: 4412
      Laminate: 3921
      Hardware (hinges/channels): 8302
      Adhesive: 3506
      Polish/Paint: 3210
  GST Rate % (NUMBER, default 18)

SECTION 3: Units of Measure
  Primary UOM * (dropdown):
    Sheets / Sqft / Pieces / Kg / Litres /
    Metres / Tins / Sets / Rolls
  Secondary UOM (optional):
    e.g. Primary=Sheets, Secondary=Sqft
  Conversion Factor:
    e.g. 1 Sheet = 32 Sqft
    Show: "1 [Primary UOM] = [X] [Secondary UOM]"

SECTION 4: Pricing
  Standard Rate (₹) * per Primary UOM
    Label: "Budget rate from AOP"
    This rate used for BOM cost estimation

  Last Purchase Rate (₹) — read only
    Label: "Actual last purchase rate (from GRN)"
    Auto-updated when GRN is created

  Last Purchase Date — read only
    Auto-updated from GRN

  Rate Alert:
    System warns if PO rate > standard rate by > 10%

SECTION 5: Wastage (for BOM auto-calculation)
  Wastage % (NUMBER)
    Plywood: 15 (pre-filled by category default)
    Laminate: 20 (pre-filled by category default)
    Hardware: 0 (no wastage)
    Others: 0 (default, FM can edit)
  
  Category defaults (auto-filled on category select):
    plywood:  15%
    laminate: 20%
    others:   0%

SECTION 6: Vendor Preference
  Preferred Vendor (search from Vendor Master)
  Alternate Vendor (search from Vendor Master)
  Both optional but recommended

SECTION 7: Reorder Settings
  Reorder Level (NUMBER + UOM)
    Alert fires when inventory drops to this level
  Reorder Quantity (NUMBER + UOM)
    How much to order when reorder triggered
  Lead Time (NUMBER) days
    How many days from PO to delivery for this material

SECTION 8: Notes
  Internal notes (TEXTAREA)

SUBMIT: [Save Material]

ON SAVE:
  1. Auto-generate material_code if new
  2. INSERT/UPDATE generic_materials
  3. Insert into audit_log
  4. Toast: "Material [name] saved"
```

---

### 3.7 Material Detail View (/materials/:id)

```
HEADER:
  Material Code | Name
  Category badge | Status badge

TABS:
  Tab 1: Details
    All material fields (read-only)
    Preferred + alternate vendor (linked)

  Tab 2: Price History
    Chart: Rate over time (from GRN data)
    Table: Last 10 purchase rates with dates and vendors

  Tab 3: Stock & Reorder
    Current stock: [X UOM]
    Reserved stock: [X UOM]
    Available stock: [X UOM]
    Reorder level: [X UOM]
    Stock indicator bar:
      Green if > reorder level
      Amber if at reorder level
      Red if below reorder level

  Tab 4: Usage History
    WOs where this material was used (last 20)
    Each: WO number, date, qty used

ACTIONS (FM only):
  [Edit Material]
  [Discontinue] — confirm dialog
    Cannot discontinue if material has
    pending stock or open POs
```

---

### 3.8 Reorder Alert System

```
TRIGGERS (check daily at 7 AM):
  SELECT m.id, m.material_name,
    m.reorder_level, m.reorder_quantity,
    i.available_qty
  FROM generic_materials m
  LEFT JOIN inventory i ON i.material_id = m.id
  WHERE i.available_qty <= m.reorder_level
    AND m.is_active = true
    AND m.deleted_at IS NULL

  For each material below reorder level:
    If no open PO for this material:
      Alert FM + Supervisor:
        "Low stock: [material name]
         Available: [X] [UOM]
         Reorder level: [X] [UOM]
         Please raise a Purchase Requisition."
    If open PO exists:
      No alert (PO already in progress)
```

---

## 4. MATERIAL CODE GENERATION

```
Format: MAT-[CATEGORY]-[3-DIGIT-SEQ]

Category codes:
  plywood          → PLY
  laminate         → LAM
  hardware         → HW
  adhesive         → ADH
  finishing        → FIN
  packaging        → PKG
  edge_tape        → EDT
  screws_fasteners → SCR
  other            → OTH

Examples:
  MAT-PLY-001   18mm BWR Plywood
  MAT-PLY-002   12mm MR Plywood
  MAT-LAM-001   Merino Laminate White
  MAT-HW-001    Hydraulic Hinge 165°
  MAT-HW-002    18mm Drawer Channel
  MAT-ADH-001   Fevicol SH 1kg

Add to numbering_counters per category:
  MAT_PLY, MAT_LAM, MAT_HW, MAT_ADH,
  MAT_FIN, MAT_PKG, MAT_EDT, MAT_SCR, MAT_OTH
```

---

## 5. SEED DATA — STANDARD MATERIALS

Pre-load these materials on system setup:

```
Plywood:
  MAT-PLY-001 | 18mm BWR Plywood (8×4)
    HSN: 4412 | GST: 18% | UOM: Sheets
    Std Rate: ₹1,850/sheet | Wastage: 15%
    Reorder: 20 sheets | Reorder Qty: 50

  MAT-PLY-002 | 12mm MR Plywood (8×4)
    HSN: 4412 | GST: 18% | UOM: Sheets
    Std Rate: ₹1,200/sheet | Wastage: 15%

  MAT-PLY-003 | 6mm MR Plywood (8×4)
    HSN: 4412 | GST: 18% | UOM: Sheets
    Std Rate: ₹750/sheet | Wastage: 15%

Laminate:
  MAT-LAM-001 | Laminate Sheet 1mm (8×4)
    HSN: 3921 | GST: 18% | UOM: Sheets
    Std Rate: ₹2,560/sheet | Wastage: 20%
    (₹80/sqft × 32 sqft)
    Reorder: 30 sheets | Reorder Qty: 100

Hardware:
  MAT-HW-001 | Hydraulic Hinge 165° Soft Close
    HSN: 8302 | GST: 18% | UOM: Pieces
    Std Rate: ₹85/piece | Wastage: 0%

  MAT-HW-002 | Drawer Channel 18" (pair)
    HSN: 8302 | GST: 18% | UOM: Pairs
    Std Rate: ₹220/pair | Wastage: 0%

  MAT-HW-003 | Cabinet Handle 160mm
    HSN: 8302 | GST: 18% | UOM: Pieces
    Std Rate: ₹45/piece | Wastage: 0%

Adhesive:
  MAT-ADH-001 | Fevicol SH 1kg
    HSN: 3506 | GST: 18% | UOM: Tins
    Std Rate: ₹180/tin | Wastage: 0%

Edge Tape:
  MAT-EDT-001 | PVC Edge Tape 22mm (50m roll)
    HSN: 3921 | GST: 18% | UOM: Rolls
    Std Rate: ₹420/roll | Wastage: 0%
```

---

## 6. BUSINESS RULES

```
BR-01: Only FM can add, edit, or deactivate vendors
       and materials. Supervisor can view and use.

BR-02: GSTIN must pass 15-character regex validation
       before saving. Invalid GSTINs rejected at DB.

BR-03: PAN must pass 10-character regex validation.
       IFSC must pass 11-character regex validation.

BR-04: No PO can be raised to a blacklisted vendor.
       System blocks PO creation for blacklisted vendor.

BR-05: No PO can be raised to a vendor not in master.
       Supervisor must request FM to add vendor first.

BR-06: Material rates can only be changed by FM.
       last_purchase_rate is auto-updated from GRN.
       standard_rate requires FM to manually update.

BR-07: Discontinuing a material is blocked if:
       - Material has open POs (qty_pending > 0)
       - Material has reserved stock > 0
       - Active BOMs reference this material

BR-08: Wastage % is used in BOM auto-calculation:
       Plywood: 15% (embedded in production formula)
       Laminate: 20% (separate — offcut losses)
       All others: 0% default, FM can set custom

BR-09: Reorder alerts fire when:
       inventory.available_qty <= reorder_level
       AND no open PO exists for this material

BR-10: Vendor performance score updates after every:
       - GRN (delivery date vs expected date)
       - QC rejection record linked to this vendor
       Rolling average of last 10 transactions.

BR-11: Deactivated vendors remain in history
       (soft delete). Old POs still reference them.
       But new POs cannot be raised.

BR-12: One material can have multiple vendors
       (preferred + alternate). PO defaults to
       preferred vendor. Supervisor can override.

BR-13: Material code is auto-generated and never
       editable after creation.

BR-14: UOM conversion factor is mandatory if
       secondary UOM is entered.
       Example: 1 Sheet = 32 Sqft must be exact.
```

---

## 7. NOTIFICATIONS & ALERTS

```
New Vendor Added:
  → FM (audit): "[Name] added vendor [vendor name]"

Vendor Blacklisted:
  → FM: Confirmation toast + audit log entry
  → System: Blocks all future POs to this vendor

Material Below Reorder Level:
  → FM + Supervisor (7 AM daily):
    "Low stock: [material] — [X] [UOM] remaining.
     Reorder level: [X]. Raise PR."

Material Rate Increased on PO:
  → FM: "PO [number]: [material] rate ₹X is above
    standard rate ₹Y by [Z]%. Review needed."

Vendor Performance Score Drops Below 3.0:
  → FM: "[Vendor name] performance score dropped to
    [X]. Last delivery: [late/quality issue]"
```

---

## 8. TESTING CHECKLIST

**Vendor Master:**
[ ] Add vendor — all fields save correctly
[ ] Invalid GSTIN rejected at DB level
[ ] Invalid PAN rejected
[ ] Invalid IFSC rejected
[ ] Multiple contacts per vendor
[ ] Multiple GSTINs per vendor
[ ] Bank accounts visible to FM only
[ ] Supervisor can view but not edit
[ ] Blacklist blocks new POs to that vendor
[ ] Deactivated vendor hidden from PO dropdown
[ ] Performance score displays correctly

**Material Master:**
[ ] Material code auto-generated (MAT-PLY-001)
[ ] Category defaults wastage % correctly
[ ] Supervisor can view but not edit rates
[ ] last_purchase_rate updates from GRN
[ ] Reorder alert fires when stock < reorder level
[ ] Discontinue blocked when open POs exist
[ ] Seed data loaded correctly (8 default materials)

**Integration:**
[ ] Vendor search works in PO creation
[ ] Material search works in BOM creation
[ ] preferred_vendor auto-populates in BOM
[ ] Vendor performance updates after GRN

---

## 9. INTEGRATION POINTS

```
PRD-05: BOM items reference generic_materials.id
         Preferred vendor auto-suggests in BOM
         Wastage % from material master used in
         BOM quantity calculations

PRD-06: PO vendor must exist in organisations
         PO items reference generic_materials.id
         PO rate compared to material standard_rate
         last_purchase_rate updated on GRN approval

PRD-08: Inventory movements reference material_id
         Available stock shown on material detail
         Reorder alerts read from inventory

PRD-09: Job card material issue references
         generic_materials for name and unit

PRD-13: Vendor payments reference organisations.id
         Bank account details for payment processing
         TDS applicable flag drives TDS deduction

PRD-15: Vendor spend analysis in MIS
         Material price variance tracking
         Most used materials by category
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01*
*Build this BEFORE: PRD-05, PRD-06, PRD-08, PRD-09*
*This is a Day 1 master — must exist before procurement*
*Next document: PRD-08 Warehouse & Inventory*
