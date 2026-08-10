# PRD-08: WAREHOUSE & INVENTORY MANAGEMENT
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
Controls the physical movement of all materials in the
factory warehouse. Every material that enters (GRN) or
leaves (issue to production floor) is tracked in an
immutable inventory ledger. The warehouse is divided into
three physical zones. Every movement is tagged to a zone,
a Work Order, and a person.

### Users of This Module
- Factory Manager: Full access, approve adjustments
- Factory Supervisor: GRN, material issue, returns, transfers
- R&D Staff (Receiving & Dispatching): GRN entry only
- Others: No access

### Key Outcomes
- Real-time stock visibility across all three zones
- Zero untracked material movements
- FIFO stock issuing (oldest lot issued first)
- Blind GRN prevents anchoring bias at receiving
- Immutable ledger — movements cannot be edited, only reversed
- Automatic WO status update on material availability

---

## 2. WAREHOUSE ZONES

```
ZONE A (Red tag) — Site Materials
  Materials destined for Chhabee construction sites
  NOT factory production materials
  Tagged: Site name + PO number

ZONE B (Blue tag) — Job Materials
  Materials reserved for specific factory Work Orders
  Tagged: WO number + client name + Bay location
  Bays: B1, B2, B3, B4, B5

ZONE C (Green tag) — General Stock
  Leftover materials returned from completed jobs
  General stock replenishment materials
  Racks: C1, C2, C3
  Tagged: Material type + Date + GRN number

REJECTION ZONE (Red X tag) — Rejected Materials
  Materials rejected at GRN quality inspection
  System blocks any issue from this zone
  Awaiting vendor collection or return
```

---

## 3. DATABASE SCHEMA

### 3.1 grns (Goods Receipt Notes — NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.grns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_number TEXT UNIQUE NOT NULL,
  po_id UUID REFERENCES public.purchase_orders(id),
  vendor_id UUID REFERENCES public.organisations(id)
    NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_bill_number TEXT,
  vendor_bill_date DATE,
  vendor_bill_url TEXT,
  bill_status TEXT DEFAULT 'awaited' CHECK (bill_status IN (
    'awaited', 'received', 'uploaded', 'matched'
  )),
  received_by UUID REFERENCES public.profiles(id),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  supervisor_inspected_by UUID REFERENCES public.profiles(id),
  supervisor_inspected_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_inspection',
    'inspection_complete',
    'approved',
    'partially_accepted',
    'fully_rejected'
  )),
  is_emergency BOOLEAN DEFAULT false,
  emergency_reason TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX grn_po_idx ON public.grns(po_id);
CREATE INDEX grn_vendor_idx ON public.grns(vendor_id);
CREATE INDEX grn_status_idx ON public.grns(status);

ALTER TABLE public.grns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on grns"
ON public.grns FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor full access on grns"
ON public.grns FOR ALL
USING (public.get_current_user_role() = 'supervisor');
```

### 3.2 grn_items (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.grn_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_id UUID REFERENCES public.grns(id)
    ON DELETE CASCADE NOT NULL,
  po_item_id UUID REFERENCES public.purchase_order_items(id),
  material_id UUID REFERENCES public.generic_materials(id),
  material_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  -- Blind count (entered before seeing PO qty)
  qty_received_blind NUMERIC,
  -- After blind count revealed
  qty_ordered NUMERIC,
  qty_received NUMERIC NOT NULL DEFAULT 0,
  qty_accepted NUMERIC DEFAULT 0,
  qty_rejected NUMERIC GENERATED ALWAYS AS
    (qty_received - qty_accepted) STORED,
  -- Rejection details
  rejection_reason TEXT,
  rejection_photos TEXT[],
  -- Zone assignment
  target_zone TEXT CHECK (target_zone IN (
    'A', 'B', 'C', 'rejection'
  )),
  target_location TEXT,
  wo_id UUID REFERENCES public.work_orders(id),
  -- Rate
  rate_on_po NUMERIC,
  rate_on_bill NUMERIC,
  rate_variance NUMERIC GENERATED ALWAYS AS
    (COALESCE(rate_on_bill, 0) - COALESCE(rate_on_po, 0))
    STORED,
  -- Status
  item_status TEXT DEFAULT 'pending' CHECK (item_status IN (
    'pending', 'accepted', 'partially_accepted', 'rejected'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on grn_items"
ON public.grn_items FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor full access on grn_items"
ON public.grn_items FOR ALL
USING (public.get_current_user_role() = 'supervisor');
```

### 3.3 inventory (NEW TABLE — current stock levels)

```sql
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES public.generic_materials(id)
    NOT NULL UNIQUE,
  material_name TEXT NOT NULL,
  total_qty NUMERIC DEFAULT 0,
  reserved_qty NUMERIC DEFAULT 0,
  available_qty NUMERIC GENERATED ALWAYS AS
    (total_qty - reserved_qty) STORED,
  unit TEXT NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on inventory"
ON public.inventory FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view and update inventory"
ON public.inventory FOR ALL
USING (public.get_current_user_role() = 'supervisor');
```

### 3.4 inventory_movements (NEW TABLE — immutable ledger)

```sql
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'INWARD',    -- Material received from GRN
    'RESERVE',   -- Committed to WO (BOM approved)
    'ISSUE',     -- Issued to production floor
    'RETURN',    -- Leftover returned after job
    'TRANSFER',  -- Zone to zone movement
    'ADJUSTMENT',-- Stock correction (FM only)
    'SCRAP'      -- Damaged/unusable write-off
  )),
  material_id UUID REFERENCES public.generic_materials(id)
    NOT NULL,
  material_name TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  from_zone TEXT,
  from_location TEXT,
  to_zone TEXT,
  to_location TEXT,
  wo_id UUID REFERENCES public.work_orders(id),
  grn_id UUID REFERENCES public.grns(id),
  lot_number TEXT,
  rate NUMERIC,
  total_value NUMERIC,
  reference_doc TEXT,
  reason TEXT,
  done_by UUID REFERENCES public.profiles(id) NOT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  is_reversal BOOLEAN DEFAULT false,
  reversed_movement_id UUID
    REFERENCES public.inventory_movements(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- NOTE: No updated_at — this table is APPEND ONLY
  -- No UPDATE or DELETE ever
);

CREATE INDEX inv_mov_material_idx
  ON public.inventory_movements(material_id);
CREATE INDEX inv_mov_wo_idx
  ON public.inventory_movements(wo_id);
CREATE INDEX inv_mov_type_idx
  ON public.inventory_movements(movement_type);
CREATE INDEX inv_mov_date_idx
  ON public.inventory_movements(created_at);

ALTER TABLE public.inventory_movements
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on movements"
ON public.inventory_movements FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view and insert movements"
ON public.inventory_movements FOR SELECT
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Supervisor can insert movements"
ON public.inventory_movements FOR INSERT
WITH CHECK (
  public.get_current_user_role() IN (
    'supervisor', 'incoming_partner'
  )
);
-- No UPDATE or DELETE policy — ever
```

### 3.5 lot_tracking (NEW TABLE — FIFO lot management)

```sql
CREATE TABLE IF NOT EXISTS public.lot_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES public.generic_materials(id)
    NOT NULL,
  grn_id UUID REFERENCES public.grns(id) NOT NULL,
  lot_number TEXT NOT NULL,
  qty_received NUMERIC NOT NULL,
  qty_remaining NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  zone TEXT NOT NULL,
  location TEXT,
  wo_id UUID REFERENCES public.work_orders(id),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  is_exhausted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FIFO: always issue from oldest lot first
CREATE INDEX lot_material_date_idx
  ON public.lot_tracking(material_id, received_at);
CREATE INDEX lot_exhausted_idx
  ON public.lot_tracking(is_exhausted);

ALTER TABLE public.lot_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on lots"
ON public.lot_tracking FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor access on lots"
ON public.lot_tracking FOR ALL
USING (public.get_current_user_role() = 'supervisor');
```

---

## 4. SCREENS & FLOWS

### 4.1 Inventory Dashboard (/inventory)

Access: FM, Supervisor

```
Page title: "Warehouse & Inventory"

SUMMARY CARDS (top row):
  Total Materials: [count]
  Total Stock Value: ₹[value] (FM only)
  Low Stock Alerts: [count] — amber
  Pending GRNs: [count] — blue
  Pending Material Issues: [count] — orange

TABS:
  Tab 1: Stock Overview
  Tab 2: GRN (Goods Receipt)
  Tab 3: Material Issue
  Tab 4: Movements Ledger
  Tab 5: Zone View
```

---

### 4.2 Stock Overview Tab

```
TABLE COLUMNS:
  Material Code | Name | Category |
  Zone C Stock | Reserved | Available |
  Reorder Level | Status | Actions

Status indicator:
  ● Green: available > reorder level
  ● Amber: available = reorder level
  ● Red: available < reorder level

ACTIONS:
  [View Lots] — shows FIFO lot breakdown
  [Issue to WO] — quick issue shortcut
  [Adjust Stock] — FM only

FILTERS:
  Category / Zone / Status (low/ok/critical)
  Search by material name or code

ZONE FILTER:
  [All Zones] [Zone A] [Zone B] [Zone C]
  [Rejection Zone]
```

---

### 4.3 GRN Creation (/inventory/grn/new)

Access: Supervisor, FM

**This is the BLIND GRN process — critical design:**

```
STEP 1: Match Delivery to PO

  On material arrival at factory gate:
  
  PO Number search:
    Supervisor/R&D searches for open PO
    If no matching PO found:
      [Create Emergency GRN] button
      Emergency GRN requires FM approval before accepting
      Logs as audit flag for monthly review

  Select matching PO:
    Show PO summary: Vendor, items, expected date
    [Proceed with GRN] button

STEP 2: BLIND COUNT (PO quantities HIDDEN)

  IMPORTANT: PO quantities are deliberately hidden.
  R&D Staff enters ONLY what they physically count.
  
  For each item on the PO:
    Show: Material Name | Unit | [QTY FIELD]
    HIDE: PO quantity ordered
    
  R&D Staff physically counts and enters qty received.
  
  Helper text at top:
    "Count physically. Do not estimate.
     PO quantity is hidden to prevent anchoring.
     Enter exact count you see."

  [Submit Count] button

STEP 3: REVEAL VARIANCE

  After submission, show PO qty vs counted qty:
  
  ┌─────────────────────────────────────────────────┐
  │ Material      │ PO Qty │ Counted │ Variance      │
  │ 18mm Plywood  │  50    │  48     │ -2 sheets ⚠️  │
  │ Laminate      │ 100    │ 100     │ OK ✓          │
  │ Hinges        │  24    │  25     │ +1 piece ℹ️   │
  └─────────────────────────────────────────────────┘

  GRN number auto-generated: GRN-26-001
  R&D Staff name logged (personal accountability)

STEP 4: QUALITY INSPECTION (Supervisor)

  Supervisor inspects within 2 hours of receipt.
  
  For each item:
  
  PLYWOOD inspection checklist:
    ☐ Grade verified (BWR/MR as ordered)
    ☐ Thickness checked (18mm/12mm)
    ☐ Warping checked (reject if bent > 5mm)
    ☐ Moisture level OK
    ☐ Sheet count matches
    
  LAMINATE inspection:
    ☐ Shade matches order (check batch number)
    ☐ No surface defects
    ☐ Batch number noted: [TEXT]
    
  HARDWARE inspection:
    ☐ Specification matches order
    ☐ Random operation test (10% sample)
    ☐ Count verified
  
  For each item decision:
    ○ ACCEPTED — full qty accepted
    ○ PARTIALLY ACCEPTED — qty_accepted < qty_received
      Rejected qty + reason mandatory
    ○ REJECTED — full rejection
      Reason mandatory + photo mandatory
  
  Photos:
    For any rejection: camera/upload mandatory
    Photos stored in Supabase Storage (qc-photos bucket)

STEP 5: ZONE ASSIGNMENT

  For each accepted item:
    
  AUTOMATIC (if WO-linked PR):
    Zone B → Bay [auto-assigned by system]
    Tagged: WO number + material
    
  MANUAL (if general stock):
    Zone C → Rack [supervisor selects: C1/C2/C3]
    
  System generates physical label for printing:
    [Zone] [Bay/Rack] [Material] [Qty] [WO/GRN] [Date]
    Barcode (GRN item ID)
    Print on thermal label printer

STEP 6: GRN APPROVAL AND STOCK UPDATE

  [Approve GRN] button (Supervisor)
  
  ON APPROVAL:
    1. For each accepted item:
       UPDATE inventory SET
         total_qty = total_qty + qty_accepted
       INSERT into lot_tracking:
         material_id, grn_id, lot_number,
         qty_received = qty_accepted, qty_remaining = qty_accepted,
         rate = rate_on_po, zone, location, wo_id
       INSERT into inventory_movements:
         movement_type = 'INWARD'
         qty = qty_accepted
         to_zone = assigned zone
         done_by = supervisor
    
    2. For WO-linked items:
       UPDATE wo_bom_items:
         stock_status = 'available' (or 'partial')
       Check if all WO items now available:
         If yes: UPDATE work_orders SET
           status = 'material_ready'
    
    3. UPDATE purchase_order_items:
       qty_received = qty_received + qty_accepted
    
    4. UPDATE generic_materials:
       last_purchase_rate = rate_on_bill (if bill received)
       last_purchase_date = TODAY
    
    5. For rejected items:
       INSERT into inventory_movements:
         movement_type = 'INWARD' to 'rejection' zone
       Notify vendor of rejection via WhatsApp (Hindi)
```

---

### 4.4 Material Issue to Production (/inventory/issue)

Triggered: When WO status = material_ready or
           Supervisor decides to start with partial material
Access: Supervisor, FM

```
ISSUE FLOW:

  Step 1: Select Work Order
    Search open WOs with status: material_ready
    or in: bom_approved_pending_material, partial_material

  Step 2: Show BOM for that WO
    Table of all BOM items:
    Material | Required Qty | Reserved | Available | Issue Qty

    Issue Qty field:
      Default = required qty (from BOM)
      Cannot exceed reserved qty
      System shows which lot (FIFO — oldest first)

  Step 3: BARCODE SCAN (optional but recommended)
    If barcode scanner available:
      Scan label on material in Zone B
      Auto-fills material and qty
    If no scanner: manual entry

  Step 4: Confirm Issue
    [Issue to Production Floor] button

  ON ISSUE:
    For each item issued:
      1. FIFO lot selection:
         SELECT * FROM lot_tracking
         WHERE material_id = [id]
           AND is_exhausted = false
         ORDER BY received_at ASC
         LIMIT 1
      
      2. UPDATE lot_tracking:
         qty_remaining = qty_remaining - qty_issued
         If qty_remaining = 0: is_exhausted = true
      
      3. UPDATE inventory:
         total_qty = total_qty - qty_issued
         reserved_qty = reserved_qty - qty_reserved
      
      4. INSERT into inventory_movements:
         movement_type = 'ISSUE'
         from_zone = 'B' (or 'C' for general stock)
         to_zone = 'FLOOR'
         wo_id = [wo_id]
         rate = lot rate (for actual cost calculation)
      
      5. UPDATE wo_bom_items:
         qty_issued = qty_issued + issued
         actual_rate = lot_rate
         actual_cost = qty_issued × lot_rate
      
      6. UPDATE work_orders SET status = 'in_production'
         Insert into wo_status_history

  VARIANCE ALERT:
    If actual material cost > estimated BOM cost by > 10%:
    Alert FM: "Material cost overrun on WO [number]"
```

---

### 4.5 Material Return (After Job Completion)

Triggered: When WO reaches production_complete
Access: Supervisor, FM

```
RETURN FLOW:

  System shows: "WO [number] production complete.
    Record material returns."

  For each issued item on this WO:
    Material | Qty Issued | Qty Used | [Return Qty field]
    Return Qty = Qty Issued - Qty Used (editable)

  [Record Returns] button

  ON RETURN:
    For each returned item:
      1. UPDATE lot_tracking:
         qty_remaining = qty_remaining + qty_returned
         is_exhausted = false
      
      2. UPDATE inventory:
         total_qty = total_qty + qty_returned
      
      3. INSERT into inventory_movements:
         movement_type = 'RETURN'
         from_zone = 'FLOOR'
         to_zone = 'C' (always returns to Zone C)
         to_location = 'C1' (default)
         wo_id = [wo_id]
      
      4. UPDATE wo_bom_items:
         qty_returned = qty_returned + returned
         qty_consumed = qty_issued - qty_returned (auto)
         actual_cost = qty_consumed × actual_rate (auto)
      
      5. Generate Zone C label for returned material:
         "RETURN | [Material] | [Qty] | WO-CHH-26-001
          Date: [today] | GRN Ref: [original GRN]"

  NET CONSUMPTION FINALIZED:
    actual_cost_per_item = qty_consumed × actual_rate
    Total actual material cost for WO = sum of all items
    BOM shows: Estimated vs Committed vs Actual (final)
```

---

### 4.6 Stock Adjustment (FM Only)

For corrections to physical stock count.

```
Triggered by: Monthly stock count or discrepancy found
Access: FM only

ADJUSTMENT FORM:
  Material (search)
  Current System Qty: [auto-filled]
  Physical Count Qty: [NUMBER input]
  Variance: [auto-calc: Physical - System]
  Reason * (mandatory):
    Physical count correction
    Damaged material write-off
    Theft / loss
    Data entry error
    Other
  Additional Notes: TEXTAREA
  Photo upload (mandatory for write-offs)

ON SUBMIT:
  INSERT into inventory_movements:
    movement_type = 'ADJUSTMENT' (positive or negative)
    qty = variance amount
    reason = [reason]
    approved_by = auth.uid() (FM)
  
  UPDATE inventory:
    total_qty = physical_count_qty
  
  Insert into audit_log (mandatory for adjustments)
  
  If variance > 5% of total stock:
    Additional FM confirmation required
    "Variance exceeds 5% of stock.
     Are you sure? This will be flagged in MIS."
```

---

### 4.7 Movements Ledger Tab

```
Shows complete immutable history of all movements.
Cannot be edited or deleted.

FILTERS:
  Movement Type / Material / WO / Zone / Date Range

TABLE COLUMNS:
  Date/Time | Movement Type | Material |
  Qty | Unit | From → To | WO Reference |
  Rate | Value | Done By

MOVEMENT TYPE badges:
  INWARD     → green
  RESERVE    → blue
  ISSUE      → orange
  RETURN     → teal
  TRANSFER   → grey
  ADJUSTMENT → amber (FM only visible)
  SCRAP      → red

Each row expandable to show full details.
Reversal entries show link to original movement.
```

---

### 4.8 Three-Way Match (PO + GRN + Vendor Invoice)

Triggered automatically when vendor bill is uploaded.

```
MATCH PROCESS:
  Compare:
    PO rate × PO qty = PO value
    GRN qty (actual received) = GRN value
    Vendor bill rate × bill qty = Bill value

  MATCH TOLERANCES (configurable by FM):
    Qty tolerance: 2% (GRN can vary ±2% from PO)
    Rate tolerance: 1% (Bill rate can vary ±1% from PO)

  OUTCOMES:
    MATCHED:
      All within tolerance
      Bill approved for payment processing
      UPDATE vendor_invoices SET match_status = 'matched'

    DISPUTED:
      Beyond tolerance
      FLAG: FM must review
      UPDATE vendor_invoices SET match_status = 'disputed'
        dispute_reason = [auto-generated description]
        disputed_at = NOW()
      Payment HELD until FM resolves dispute

    RATE MISMATCH:
      Bill rate differs from PO rate > 1%
      Hold payment
      Alert FM: "Rate variance on GRN [number]:
        PO rate ₹X vs Bill rate ₹Y for [material]"

    QTY MISMATCH:
      Pay for GRN quantity only
      Raise debit note for shortfall
      Alert Supervisor: "Short delivery on PO [number]:
        Ordered [X], received [Y]"
```

---

### 4.9 Rejected Material Management

```
REJECTION ZONE VIEW:
  Shows all items in Rejection Zone
  Each item: Material | Qty | Vendor | GRN | Reason | Age

  ACTIONS per rejected item:
    [Return to Vendor]
      Raise Debit Note against vendor
      Transport cost: add to Debit Note
      Mark as returned when vendor collects
    
    [Write Off]
      FM approval required
      INSERT inventory_movements with type SCRAP
      UPDATE inventory (reduce total_qty)
      Debit Note against vendor if vendor's fault

  Alert: Items in rejection zone > 7 days
    → FM notified: "[X] items in rejection zone
      for > 7 days. Action needed."
```

---

## 5. BUSINESS RULES

```
BR-01: BLIND GRN is mandatory. PO quantities must
       be hidden from R&D Staff during count.
       This is a non-negotiable design requirement.

BR-02: Inventory ledger is APPEND ONLY.
       No UPDATE or DELETE on inventory_movements.
       Corrections via reversal entries only.
       Reversals require FM approval.

BR-03: Material issue follows FIFO strictly.
       System always selects oldest lot first.
       Actual cost = rate of lot issued (not standard).

BR-04: Returned material always goes to Zone C.
       Never back to Zone B or Zone A.
       Tagged with original WO reference.

BR-05: No material can be issued from Rejection Zone.
       System hard blocks this at database level.

BR-06: Stock adjustment requires FM approval always.
       No self-adjustment by Supervisor.
       Mandatory reason. Logged in audit_log.

BR-07: GRN without matching PO is an EMERGENCY GRN.
       Requires FM approval before material accepted.
       Target: Zero emergency GRNs within 60 days.

BR-08: Quality photo mandatory for any rejection.
       Cannot approve GRN with rejection without photo.

BR-09: Three-way match tolerances:
       Qty: ±2% | Rate: ±1%
       Configurable by FM in system settings.
       Beyond tolerance: payment held automatically.

BR-10: When all BOM items for a WO are received:
       System auto-updates WO status to material_ready.
       Supervisor receives notification.

BR-11: When some items received and some pending:
       WO status = partial_material.
       System shows exactly which items are pending
       and their expected delivery dates from POs.

BR-12: Material return must be done within 48 hours
       of WO reaching production_complete.
       System reminds Supervisor after 24 hours.

BR-13: Barcode printed for every accepted GRN item.
       Label printer at factory gate.
       Barcode = GRN item ID for scanning at issue.

BR-14: Vendor must be notified of rejection via
       WhatsApp within 24 hours of GRN rejection.
       Photo included in WhatsApp message.

BR-15: Zone A materials (site materials) are NEVER
       issued to factory production WOs.
       System blocks cross-zone issue attempts.
```

---

## 6. NOTIFICATIONS & ALERTS

```
Material Delivery Arrived:
  → Supervisor: "Delivery from [vendor] arrived.
    GRN [number] created. Please inspect."

GRN Inspection Due (2 hours):
  → Supervisor: "GRN [number] awaiting inspection
    (2 hours since receipt)"

Material Available for WO:
  → Supervisor: "All materials ready for WO [number].
    Production can start."

Partial Material Received:
  → FM + Supervisor: "WO [number]: [X] items received,
    [Y] items still pending from PO [number]"

Rejection at GRN:
  → FM: "[Vendor] delivery partially/fully rejected.
    GRN [number]. [X] items rejected."
  → Vendor (WhatsApp): Rejection notice in Hindi

Three-Way Match Dispute:
  → FM: "Invoice from [vendor] has a [rate/qty]
    mismatch. Payment held. Review needed."

Rejection Zone Alert (> 7 days):
  → FM: "[X] items in rejection zone for > 7 days"

Pending Material Returns (24 hours):
  → Supervisor: "WO [number] production complete.
    Please record material returns."

Low Stock Alert (7 AM daily):
  → FM + Supervisor: "Low stock: [material]
    Available: [X]. Reorder level: [Y]."
```

---

## 7. TESTING CHECKLIST

**GRN Flow:**
[ ] GRN number generated: GRN-26-001
[ ] PO quantities hidden during blind count
[ ] Variance shown after submission
[ ] Inspection checklist appears correctly
[ ] Photo upload mandatory for rejection
[ ] Zone assignment works (B for WO, C for stock)
[ ] Label print trigger appears
[ ] Stock updates correctly on GRN approval
[ ] Inventory_movements row created (INWARD)
[ ] Lot tracking row created

**Material Issue:**
[ ] Only WOs with material_ready status shown
[ ] FIFO lot selection (oldest lot first)
[ ] Cannot exceed reserved quantity
[ ] WO status changes to in_production after issue
[ ] wo_bom_items.qty_issued updated
[ ] inventory_movements row created (ISSUE)
[ ] Actual cost calculated from lot rate

**Material Return:**
[ ] Return qty cannot exceed issued qty
[ ] Returns go to Zone C always
[ ] wo_bom_items.qty_consumed updated (auto)
[ ] Final actual cost locked after return

**Stock Adjustment:**
[ ] FM only (Supervisor blocked)
[ ] Reason mandatory
[ ] Audit log entry created
[ ] Inventory total_qty updated correctly

**Three-Way Match:**
[ ] Within tolerance: auto-approved
[ ] Beyond tolerance: payment held
[ ] Rate mismatch: FM alerted
[ ] Qty mismatch: debit note suggested

**Inventory Ledger:**
[ ] All movements appear in ledger
[ ] No UPDATE or DELETE possible
[ ] Reversal entries linked to originals

---

## 8. INTEGRATION POINTS

```
PRD-05: BOM approval reserves stock in inventory
         Stock check reads from inventory.available_qty
         BOM wo_bom_items.qty_issued updated on issue
         Actual cost from lot rates updates BOM columns

PRD-06: GRN linked to purchase_order via po_id
         PO items qty_received updated on GRN approval
         Three-way match uses PO rate for comparison

PRD-07: GRN updates generic_materials.last_purchase_rate
         Reorder alerts use inventory.available_qty
         Vendor performance updated from GRN timing

PRD-09: Job card material issue uses this module
         Carpenter sees "Materials: Ready/Pending"
         on their job card

PRD-11: QC rejection photo from qc-photos bucket
         Delivery challan references GRN for materials

PRD-13: GRN creates accounts payable entry
         Three-way match clears payable for payment
         Inventory valuation for balance sheet

PRD-15: Material cost variance (BOM vs actual) KPI
         Vendor on-time delivery from GRN dates
         Inventory turnover analysis
         Stock valuation report
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-02, PRD-06, PRD-07*
*Next document: PRD-09 Job Card & Production Tracking*
