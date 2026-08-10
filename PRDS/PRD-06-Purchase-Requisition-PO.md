# PRD-06: PURCHASE REQUISITION & PURCHASE ORDER
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
Controls all material procurement. Every material purchase
must follow the path: Purchase Requisition (PR) → Purchase
Order (PO) → Goods Receipt (GRN). No material can be ordered
without a PR. No payment can be made without a matching PO
and GRN. This module covers PR creation through PO dispatch
to vendor. GRN is covered in PRD-08.

### Users of This Module
- Factory Manager: Approve PRs, approve POs above ₹10,000,
  add/edit vendors, amend POs
- Factory Supervisor: Raise PRs, create POs, track delivery
- Others: No access

### Key Outcomes
- Zero unauthorised purchases
- Complete paper trail from requirement to payment
- Vendor communication in Hindi (PO sent via WhatsApp PDF)
- Three-way match enforcement (PO + GRN + Invoice)
- PO amendments tracked — original always preserved

---

## 2. DATABASE SCHEMA

### 2.1 purchase_requisitions (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_number TEXT UNIQUE NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id),
  wo_bom_item_id UUID REFERENCES public.wo_bom_items(id),
  raised_by UUID REFERENCES public.profiles(id),
  raised_by_system BOOLEAN DEFAULT false,
  material_id UUID REFERENCES public.generic_materials(id),
  material_name TEXT NOT NULL,
  material_category TEXT NOT NULL,
  qty_required NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  required_by_date DATE,
  preferred_vendor_id UUID REFERENCES public.organisations(id),
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN (
    'normal', 'urgent'
  )),
  urgency_reason TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'submitted',
    'approved',
    'po_raised',
    'cancelled'
  )),
  is_general_stock BOOLEAN DEFAULT false,
  notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX pr_wo_idx ON public.purchase_requisitions(wo_id);
CREATE INDEX pr_status_idx
  ON public.purchase_requisitions(status);

ALTER TABLE public.purchase_requisitions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on PRs"
ON public.purchase_requisitions FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can manage PRs"
ON public.purchase_requisitions FOR ALL
USING (public.get_current_user_role() = 'supervisor');
```

### 2.2 purchase_orders (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  parent_po_id UUID REFERENCES public.purchase_orders(id),
  amendment_no INTEGER NOT NULL DEFAULT 0,
  vendor_id UUID REFERENCES public.organisations(id) NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_gstin TEXT,
  delivery_address TEXT,
  expected_delivery_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_approval',
    'approved',
    'sent',
    'acknowledged',
    'partially_received',
    'fully_received',
    'cancelled',
    'closed'
  )),
  -- Financial
  subtotal NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  is_inter_state BOOLEAN DEFAULT false,
  total_amount NUMERIC DEFAULT 0,
  advance_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  -- Approval
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  second_approver_id UUID REFERENCES public.profiles(id),
  second_approved_at TIMESTAMPTZ,
  -- Delivery
  delivery_terms TEXT DEFAULT 'ex_works'
    CHECK (delivery_terms IN (
      'ex_works', 'delivered', 'door_delivery'
    )),
  -- Communication
  sent_at TIMESTAMPTZ,
  sent_via TEXT,
  vendor_acknowledged_at TIMESTAMPTZ,
  vendor_acknowledgement_note TEXT,
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  cancellation_reason TEXT,
  -- Standard
  created_by UUID REFERENCES public.profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX po_vendor_idx
  ON public.purchase_orders(vendor_id);
CREATE INDEX po_status_idx
  ON public.purchase_orders(status);

ALTER TABLE public.purchase_orders
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on POs"
ON public.purchase_orders FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can manage POs"
ON public.purchase_orders FOR ALL
USING (public.get_current_user_role() = 'supervisor');
```

### 2.3 purchase_order_items (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID REFERENCES public.purchase_orders(id)
    ON DELETE CASCADE NOT NULL,
  pr_id UUID REFERENCES public.purchase_requisitions(id),
  wo_id UUID REFERENCES public.work_orders(id),
  wo_bom_item_id UUID REFERENCES public.wo_bom_items(id),
  material_id UUID REFERENCES public.generic_materials(id),
  material_name TEXT NOT NULL,
  hsn_code TEXT,
  qty_ordered NUMERIC NOT NULL,
  qty_received NUMERIC DEFAULT 0,
  qty_pending NUMERIC GENERATED ALWAYS AS
    (qty_ordered - qty_received) STORED,
  unit TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  discount_pct NUMERIC DEFAULT 0,
  taxable_amount NUMERIC GENERATED ALWAYS AS
    (qty_ordered * rate * (1 - discount_pct/100)) STORED,
  gst_rate NUMERIC DEFAULT 18,
  is_inter_state BOOLEAN DEFAULT false,
  cgst_amount NUMERIC GENERATED ALWAYS AS (
    CASE WHEN is_inter_state THEN 0
    ELSE ROUND((qty_ordered * rate *
      (1 - discount_pct/100) * gst_rate / 200), 2)
    END
  ) STORED,
  sgst_amount NUMERIC GENERATED ALWAYS AS (
    CASE WHEN is_inter_state THEN 0
    ELSE ROUND((qty_ordered * rate *
      (1 - discount_pct/100) * gst_rate / 200), 2)
    END
  ) STORED,
  igst_amount NUMERIC GENERATED ALWAYS AS (
    CASE WHEN is_inter_state
    THEN ROUND((qty_ordered * rate *
      (1 - discount_pct/100) * gst_rate / 100), 2)
    ELSE 0 END
  ) STORED,
  line_total NUMERIC GENERATED ALWAYS AS (
    (qty_ordered * rate * (1 - discount_pct/100)) +
    CASE WHEN is_inter_state
    THEN ROUND((qty_ordered * rate *
      (1 - discount_pct/100) * gst_rate / 100), 2)
    ELSE ROUND((qty_ordered * rate *
      (1 - discount_pct/100) * gst_rate / 100), 2)
    END
  ) STORED,
  notes TEXT,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.purchase_order_items
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on PO items"
ON public.purchase_order_items FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor access on PO items"
ON public.purchase_order_items FOR ALL
USING (public.get_current_user_role() = 'supervisor');
```

---

## 3. APPROVAL MATRIX

```
PR Approval:
  All PRs submitted by Supervisor
  → FM approves within 2 hours (normal)
  → FM approves within 30 minutes (urgent)
  → FM gets WhatsApp notification for urgent PRs

PO Approval:
  Below ₹10,000:
    Auto-approved (no FM action needed)
    System logs auto-approval

  ₹10,000 — ₹50,000:
    FM approves within 2 hours

  Above ₹50,000:
    FM + one Super Admin both approve
    Both must approve within 4 hours
    (Super Admin is notified when FM approves)

PO Cancellation:
  FM only — always
  Mandatory reason
```

---

## 4. SCREENS & FLOWS

### 4.1 Purchase Requisition List (/purchase-requisitions)

Access: FM, Supervisor

```
Page title: "Purchase Requisitions"
Top right: "+ New PR" button

SUMMARY CARDS:
  Pending Approval: [count] — amber
  Approved (PO not raised): [count] — blue
  Urgent PRs: [count] — red

FILTERS:
  Status / Urgency / WO Number / Date range / Search

TABLE COLUMNS:
  PR Number | Material | WO Reference |
  Qty | Required By | Urgency badge |
  Status badge | Raised By | Actions

URGENT badge: red "URGENT"
  Shown when urgency = 'urgent'
  Sorted to top of list

Empty state: "No purchase requisitions yet."
```

---

### 4.2 Create Purchase Requisition

Triggered by: "+ New PR" button or auto-draft from BOM
Access: FM, Supervisor

```
FORM FIELDS:

Material *
  Search from Material Master (autocomplete)
  If material not in master: free text with note
    "Add to Material Master after PR"

Linked Work Order
  Search WOs (optional — can be general stock)
  If WO selected: BOM item auto-links

Quantity Required * (NUMBER)
Unit * (from Material Master or dropdown)

Required By Date * (DATE)
  Helper: "When do you need this material?"
  System warns if date < 2 days away:
    "This will be marked URGENT"

Preferred Vendor
  Search from Vendor Master (autocomplete)

Urgency (auto-set based on Required By):
  If Required By < 2 days: URGENT (auto, not editable)
  Otherwise: NORMAL

General Stock Purchase TOGGLE (default OFF)
  Label: "This is general stock — not WO specific"
  If ON: WO field is hidden

Notes (TEXTAREA, optional)

SUBMIT BUTTON: "Submit for Approval"

ON SUBMIT:
  1. Generate PR number via generate_document_number
     ('PR', '2526')
  2. If required_by < 2 days: urgency = 'urgent'
  3. INSERT into purchase_requisitions
     status = 'submitted'
  4. Notify FM (WhatsApp for urgent, in-app for normal)
  5. Toast: "PR [number] submitted for approval"
```

---

### 4.3 PR Approval (FM)

Access: FM only

```
FM sees PR detail with:
  Material, Qty, Unit, Required By
  Linked WO (if any)
  Preferred Vendor
  Urgency badge

ACTIONS:
  [Approve PR]
    On approve:
      UPDATE status = 'approved'
      Notify Supervisor: "PR [number] approved"
      Toast: "PR approved"

  [Reject PR]
    Reason required
    UPDATE status = 'cancelled'
    reason stored in rejection_reason
    Notify Supervisor with reason

URGENT PR handling:
  FM gets WhatsApp notification immediately
  Timer shown: "Requested within 2 days"
  Approval SLA: 30 minutes
```

---

### 4.4 Purchase Order List (/purchase-orders)

Access: FM, Supervisor

```
Page title: "Purchase Orders"
Top right: "+ New PO" button

SUMMARY CARDS:
  Pending Approval: [count] — amber
  Awaiting Delivery: [count] — blue
  Overdue: [count] — red

FILTERS:
  Status / Vendor / WO / Date range / Amount range

TABLE COLUMNS:
  PO Number | Vendor | Items | Total Amount |
  Expected Delivery | Status badge |
  Amendment badge (if amended) | Actions

Amendment badge: "A1" "A2" shown if amendment_no > 0

DEFAULT SORT: Pending approval first, then by date
```

---

### 4.5 Create Purchase Order

Triggered by: "+ New PO" or from approved PR
Access: FM, Supervisor

```
STEP 1: Select Vendor
  Search vendor from Vendor Master
  Show: Name, GSTIN, Credit Days, Phone
  Show existing open POs with this vendor

STEP 2: Add Items
  Two ways to add items:

  WAY 1 — From approved PRs:
    [Add from approved PRs] button
    Shows all approved PRs not yet on a PO
    Supervisor selects relevant PRs
    Items auto-populate from PR details

  WAY 2 — Manual entry:
    [+ Add Item] button
    Material (search from Material Master)
    HSN Code (auto from Material Master)
    Qty Ordered *
    Unit *
    Rate (₹) *
    Discount % (optional, default 0)
    GST Rate (default 18%)
    Taxable Amount: auto-calc (qty × rate × (1-discount))
    CGST/SGST or IGST: auto-calc from is_inter_state
    Line Total: auto-calc

  Multiple items from different PRs on one PO allowed.
  One PO per vendor per order cycle.
  Group all items for same vendor into one PO.

  WO allocation shown per item:
    "This item is for WO-CHH-26-001"

STEP 3: PO Details
  Expected Delivery Date *
  Delivery Address (default: factory address)
  is_inter_state: TOGGLE
    Default: OFF (Haryana to Haryana)
    If vendor is from another state: ON
    This drives CGST+SGST vs IGST calculation

  Delivery Terms:
    Ex-Works (we arrange transport)
    Delivered (vendor delivers)
    Door Delivery (vendor delivers to site)

  Advance Required:
    TOGGLE (default OFF)
    If ON: Advance Amount (₹) field appears

  Notes for vendor (appears on PO PDF)
  Internal Notes (never on PO PDF)

STEP 4: PO Summary
  ┌─────────────────────────────────────────────────┐
  │ Items: [count]                                  │
  │ Subtotal (ex-GST):                    ₹X        │
  │ CGST (9%) + SGST (9%) OR IGST (18%): ₹X        │
  │ TOTAL:                                ₹X        │
  │                                                 │
  │ Approval required: [Auto / FM / FM + Super Admin│
  │ Based on total amount]                          │
  └─────────────────────────────────────────────────┘

SUBMIT BUTTONS:
  [Save as Draft]
  [Submit for Approval]
    If < ₹10,000: auto-approved, status = 'approved'
    If ₹10,000+: status = 'pending_approval'
      Notify FM

ON SUBMIT:
  1. Generate PO number ('PO', '2526') → PO-26-001
  2. INSERT purchase_orders
  3. INSERT all purchase_order_items
  4. Link PR items: UPDATE purchase_requisitions
     SET status = 'po_raised' WHERE id IN [pr_ids]
  5. Update wo_bom_items.committed_rate and
     committed_cost from PO rates
  6. Handle approval routing per matrix
```

---

### 4.6 PO Approval (FM / Super Admin)

```
FM APPROVAL VIEW:
  Full PO detail with all items and amounts
  Vendor details and GSTIN
  WO references per item
  GST calculation breakdown

  For ≤ ₹50,000 (FM only):
    [Approve PO] — status = 'approved'
    [Reject PO] — status back to draft + reason
    [Request Amendment] — status = draft + note

  For > ₹50,000 (FM first, then Super Admin):
    FM approves first → status = 'pending_second_approval'
    Super Admin notified
    Super Admin approves → status = 'approved'
    Either can reject

ON FULL APPROVAL:
  UPDATE purchase_orders SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = NOW()
  Notify Supervisor: "PO [number] approved.
    Ready to send to vendor."
```

---

### 4.7 Send PO to Vendor

Triggered by: [Send to Vendor] button (after approval)
Access: FM, Supervisor

```
SEND DIALOG:
  Title: "Send PO to [Vendor Name]"

  Via WhatsApp:
    Vendor Phone: [from Vendor Master, editable]
    Message (Hindi):
      "नमस्ते [vendor name],
       कृपया संलग्न Purchase Order देखें।
       PO Number: [po_number]
       कुल राशि: ₹[total]
       डिलीवरी: [expected_date]
       कृपया 4 घंटे में पुष्टि करें।
       धन्यवाद,
       Canva Concepts"

  Via Email (if vendor has email):
    To: [vendor email]
    Subject: "Purchase Order [po_number] —
              Canva Concepts"
    Attach: PO PDF

  [Send via WhatsApp] [Send via Email] [Send Both]

ON SEND:
  1. Generate PO PDF (see Section 4.9)
  2. Send via selected channel
     (WhatsApp via Baileys, Email via Resend)
  3. UPDATE purchase_orders SET
       status = 'sent',
       sent_at = NOW(),
       sent_via = [channel]
  4. Toast: "PO sent to [vendor]"

VENDOR ACKNOWLEDGEMENT:
  [Mark as Acknowledged] button (after sending)
  FM/Supervisor confirms vendor responded
  Sets: vendor_acknowledged_at = NOW()
       vendor_acknowledgement_note = [text]
  Status → 'acknowledged'

  If no acknowledgement in 4 hours:
    System alert: "PO [number] not acknowledged
    by [vendor]. Follow up needed."
```

---

### 4.8 PO Amendment

When a PO needs to change after being sent to vendor.

```
Triggered by: [Amend PO] button on PO detail
Access: FM only

Creates a NEW PO row:
  parent_po_id = current PO id
  amendment_no = previous amendment_no + 1
  po_number = PO-26-001-A1 (for first amendment)
  status = draft
  All items copied from original

Opens in edit mode — FM makes changes.
Follows same approval flow as new PO.

On amendment approval:
  Original PO: status = 'cancelled' (preserved)
  Amendment PO: becomes active
  Notify vendor of amendment

AMENDMENT HISTORY shown on PO detail:
  Original: PO-26-001 (superseded)
  Amendment 1: PO-26-001-A1 (active) ← current
```

---

### 4.9 PO PDF Format

PO is generated in HINDI (vendor communication).
Content:

```
═══════════════════════════════════════════════
CANVA CONCEPTS
[Factory Address], Gurgaon, Haryana
GSTIN: [factory GSTIN]
दूरभाष: [phone]
═══════════════════════════════════════════════

खरीद आदेश (PURCHASE ORDER)
PO No: PO-26-001          दिनांक: DD-MMM-YYYY
═══════════════════════════════════════════════

आपूर्तिकर्ता (VENDOR):
[Vendor Name]
[Vendor Address]
GSTIN: [Vendor GSTIN]
═══════════════════════════════════════════════

सामग्री विवरण:
───────────────────────────────────────────────
क्र. | विवरण     | HSN | मात्रा | दर  | राशि
 1  | [material] |[hsn]|  [qty] | ₹X  | ₹X
 2  | [material] |[hsn]|  [qty] | ₹X  | ₹X
───────────────────────────────────────────────
     उप-योग (Sub-total):              ₹X
     CGST @9%:                         ₹X
     SGST @9%:                         ₹X
     (OR: IGST @18%:                   ₹X)
     कुल राशि (TOTAL):                ₹X
═══════════════════════════════════════════════

डिलीवरी: [expected_delivery_date]
पता: [delivery_address]
भुगतान: [credit_days] दिन
नोट: [notes]

अनुमोदित: [approved_by name]
Canva Concepts
═══════════════════════════════════════════════
```

---

## 5. BUSINESS RULES

```
BR-01: No PO can be raised without an approved PR.
       Exception: FM can create PO without PR for
       emergency purchases (logged as 'emergency_po').

BR-02: No PO can be raised to a vendor not in
       Vendor Master. Supervisor must first add vendor.

BR-03: PO approval thresholds (configurable by FM):
       < ₹10,000: Auto-approved
       ₹10,000 — ₹50,000: FM approval
       > ₹50,000: FM + Super Admin

BR-04: POs are sent to vendors in Hindi via WhatsApp
       and/or email. Language stored in Vendor Master.

BR-05: PO must be acknowledged by vendor within 4 hours.
       System alerts if no acknowledgement.

BR-06: PO rate above Material Master standard rate
       requires FM approval regardless of PO value.
       Rate variance logged with mandatory reason.

BR-07: Original PO is never edited after being sent.
       Amendments create a new PO row referencing
       the original via parent_po_id.

BR-08: GST computed at database level:
       Factory in Haryana (Gurgaon).
       is_inter_state = false → CGST 9% + SGST 9%
       is_inter_state = true → IGST 18%

BR-09: For urgent PRs (required < 2 days):
       FM gets WhatsApp notification immediately.
       Approval SLA = 30 minutes (not 2 hours).
       Supervisor must call vendor directly (not
       just WhatsApp PO). Call logged in system.

BR-10: When PO is approved, wo_bom_items.committed_rate
       and committed_cost are updated with PO rates.
       This updates the "Committed" column in BOM.

BR-11: One PO per vendor per order cycle.
       Multiple WO items for same vendor consolidated
       into one PO.

BR-12: E-Way Bill required if PO value > ₹50,000.
       System flags this when PO is approved.
       (E-Way Bill generation deferred to Phase 2)

BR-13: PO cancellation requires FM approval and
       mandatory reason. Cancelled POs preserved
       (soft delete only).

BR-14: Credit days from Vendor Master auto-populate
       payment due date on each PO.
```

---

## 6. NOTIFICATIONS & ALERTS

```
PR Submitted:
  → FM: "PR [number] submitted by [name]
    for [material]. Required by [date]."
  → FM (urgent): WhatsApp + in-app immediately

PR Approved:
  → Supervisor: "PR [number] approved. Raise PO."

PR Rejected:
  → Supervisor: "PR [number] rejected.
    Reason: [reason]"

PO Pending Approval:
  → FM: "PO [number] ₹[amount] pending your approval"

PO Approved (≤₹50K):
  → Supervisor: "PO [number] approved. Send to vendor."

PO Requires Second Approval (>₹50K):
  → Super Admin: "PO [number] ₹[amount] needs
    your approval. FM has approved."

PO Sent to Vendor:
  → FM: "PO [number] sent to [vendor] via [channel]"

No Vendor Acknowledgement in 4 hours:
  → FM + Supervisor: "PO [number] not acknowledged
    by [vendor]. Follow up needed."

PO Rate Above Standard:
  → FM: "PO [number] has rate above Material Master
    for [material]. Review needed."

Expected Delivery Overdue:
  → FM + Supervisor: "PO [number] expected on [date]
    but not received. [vendor] follow-up needed."
```

---

## 7. TESTING CHECKLIST

**PR Flow:**
[ ] PR number generated: PR-26-001
[ ] Urgent auto-set when required_by < 2 days
[ ] FM notified on submission
[ ] FM WhatsApp notification for urgent PR
[ ] FM can approve and reject
[ ] Rejection reason stored
[ ] Status updates correctly

**PO Creation:**
[ ] PO number generated: PO-26-001
[ ] Items load from approved PRs
[ ] Manual item addition works
[ ] GST auto-calculated (CGST+SGST for intra-state)
[ ] IGST for inter-state when toggle ON
[ ] Line totals auto-calculate
[ ] PO total correct
[ ] Approval routing correct by amount

**PO Approval:**
[ ] < ₹10,000: auto-approved, no FM action
[ ] ₹10,000-50,000: FM only
[ ] > ₹50,000: FM + Super Admin both required
[ ] Second approver notified after FM approves
[ ] PO status updates correctly

**PO Send:**
[ ] PO PDF generated in Hindi
[ ] WhatsApp send works
[ ] Status changes to 'sent'
[ ] Mark acknowledged works
[ ] 4-hour alert fires if not acknowledged

**PO Amendment:**
[ ] Amendment creates new PO row
[ ] amendment_no increments correctly
[ ] PO number: PO-26-001-A1
[ ] Original preserved (not deleted)
[ ] Active amendment is the latest

**BOM Integration:**
[ ] wo_bom_items.committed_cost updates on PO approval
[ ] BOM shows updated Committed column

---

## 8. INTEGRATION POINTS

```
PRD-05: BOM approval auto-drafts PRs for short items
         PR items link to wo_bom_items
         PO approval updates BOM committed cost

PRD-07: Vendor Master provides vendor details for PO
         Material Master provides rates and HSN codes
         No PO to vendor not in Vendor Master

PRD-08: PO triggers expectation for GRN
         GRN receipt marks PO items as received
         3-way match: PO + GRN + Vendor Invoice

PRD-13: PO creates accounts payable entry
         Advance payment tracked in Finance module
         Vendor invoice matched against PO

PRD-15: PO vs actual spend tracked in MIS
         Vendor on-time delivery performance
         Material price variance analysis
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-02, PRD-05, PRD-07*
*Build after: PRD-07 (Vendor & Material Master)*
*Next document: PRD-07 Vendor & Material Master*
