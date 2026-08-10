# PRD-04: QUOTATION MODULE
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
The Quotation module allows the factory to create and send
professional price quotes to prospective clients before a
Work Order is created. A quote can be converted to a Work
Order with one click when the client accepts.

The module has two distinct views:
- INTERNAL VIEW: Shows full cost breakdown, margin, profit
- CLIENT-FACING PDF: Shows only item prices, delivery,
  installation. Never shows cost or margin to client.

### Users of This Module
- Factory Manager: Create, approve, send all quotations
- Factory Supervisor: Create quotations (FM approves before sending)
- Site Manager: No access (Chhabee work is Cost+5%, no quoting)
- Super Admin: No access

### Key Outcomes
- Professional branded quotes sent to B2B and D2C clients
- Internal cost and margin visibility for FM only
- Full negotiation history (all revised versions retained)
- One-click conversion from accepted quote to Work Order
- Quote pipeline visibility (open, accepted, rejected)

---

## 2. DATABASE SCHEMA

### 2.1 quotations (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qt_number TEXT UNIQUE NOT NULL,
  parent_qt_id UUID REFERENCES public.quotations(id),
  revision_no INTEGER NOT NULL DEFAULT 0,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_org_id UUID,
  client_type TEXT NOT NULL CHECK (client_type IN (
    'b2b', 'd2c'
  )),
  enquiry_source TEXT CHECK (enquiry_source IN (
    'direct', 'instagram', 'reference', 'chhabee',
    'website', 'other'
  )),
  valid_until DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_approval',
    'approved',
    'sent',
    'negotiating',
    'accepted',
    'rejected',
    'expired',
    'converted'
  )),
  -- Internal cost fields (never shown to client)
  estimated_material_cost NUMERIC DEFAULT 0,
  estimated_labour_cost NUMERIC DEFAULT 0,
  estimated_overhead_cost NUMERIC DEFAULT 0,
  total_estimated_cost NUMERIC DEFAULT 0,
  target_margin_pct NUMERIC DEFAULT 20,
  calculated_price NUMERIC DEFAULT 0,
  -- Quoted price (FM can override calculated price)
  quoted_price_override NUMERIC,
  final_quoted_price NUMERIC,
  -- Client-visible amounts
  delivery_charge NUMERIC DEFAULT 0,
  installation_charge NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  other_charges_label TEXT,
  subtotal_ex_gst NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  gst_amount NUMERIC DEFAULT 0,
  total_inc_gst NUMERIC DEFAULT 0,
  -- Tracking
  advance_required_pct NUMERIC DEFAULT 50,
  delivery_days INTEGER,
  notes TEXT,
  internal_notes TEXT,
  rejection_reason TEXT,
  converted_to_wo_id UUID REFERENCES public.work_orders(id),
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX qt_status_idx ON public.quotations(status);
CREATE INDEX qt_client_idx ON public.quotations(client_name);
CREATE INDEX qt_created_by_idx ON public.quotations(created_by);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on quotations"
ON public.quotations FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can view and create quotations"
ON public.quotations FOR SELECT
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Supervisor can insert quotations"
ON public.quotations FOR INSERT
WITH CHECK (
  public.get_current_user_role() IN (
    'supervisor', 'incoming_partner'
  )
);

CREATE POLICY "Supervisor can update own draft quotations"
ON public.quotations FOR UPDATE
USING (
  public.get_current_user_role() = 'supervisor'
  AND status = 'draft'
  AND created_by = auth.uid()
);
```

### 2.2 quotation_items (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID REFERENCES public.quotations(id)
    ON DELETE CASCADE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'furniture', 'delivery', 'installation', 'other'
  )),
  description TEXT NOT NULL,
  furniture_type TEXT,
  dimensions_l NUMERIC,
  dimensions_h NUMERIC,
  dimensions_d NUMERIC,
  finish_type TEXT,
  finish_detail TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'nos',
  -- Internal cost (not shown to client)
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  -- Client-visible price
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on qt items"
ON public.quotation_items FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor access on qt items"
ON public.quotation_items FOR ALL
USING (
  public.get_current_user_role() = 'supervisor'
  AND EXISTS (
    SELECT 1 FROM public.quotations
    WHERE id = quotation_id
  )
);
```

### 2.3 Add to numbering_counters

```sql
INSERT INTO public.numbering_counters (doc_type, fy, last_seq)
VALUES ('QT', '2526', 0)
ON CONFLICT (doc_type, fy) DO NOTHING;
```

QT number format: QT-26-001
Revision format: QT-26-001-R1, QT-26-001-R2
(parent_qt_id links revision to original)

---

## 3. SCREENS & FLOWS

### 3.1 Quotation List (/quotations)

Access: FM and Supervisor only

```
Page title: "Quotations"
Top right: "+ New Quotation" button

SUMMARY CARDS (top):
  Total Open: [count] — amber
  Accepted This Month: [count] — green
  Rejected This Month: [count] — red
  Conversion Rate: [%] — blue

FILTERS:
  Status (All / Draft / Sent / Negotiating /
          Accepted / Rejected / Expired / Converted)
  Client Type (All / B2B / D2C)
  Date range (by created_at)
  Search (client name, QT number)

TABLE COLUMNS:
  QT Number
  Client Name
  Client Type badge
  Items summary (e.g. "2 items")
  Total Value (ex-GST) — shown to FM only
  Quoted Price (inc-GST)
  Valid Until
  Status badge
  Created by
  Actions: View | Edit (if draft) | Duplicate

Status badge colours:
  draft        → grey
  pending_approval → amber
  approved     → blue
  sent         → blue
  negotiating  → orange
  accepted     → green
  rejected     → red
  expired      → grey
  converted    → dark green

Empty state:
  "No quotations yet. Create your first quote."
```

---

### 3.2 Create Quotation (/quotations/new)

Access: FM, Supervisor

```
Page title: "New Quotation"

SECTION 1: Client Information
  Client Type * (radio: B2B / D2C)
  Client Name *  (TEXT)
  Client Email   (EMAIL)
  Client Phone   (TEXT)
  Enquiry Source (dropdown):
    Direct enquiry / Instagram / Reference /
    Website / Other
  Valid Until *  (DATE, default: today + 15 days)

SECTION 2: Quotation Items
  [+ Add Item] button

  Each item row:
    Item Type (dropdown):
      Furniture / Delivery / Installation / Other
    Description * (TEXT)
      If Furniture: show additional fields:
        Furniture Type (TEXT with suggestions)
        Dimensions L × H × D (mm, optional)
        Finish Type (dropdown)
        Finish Detail (TEXT)
    Quantity (NUMBER, default 1)
    Unit Price (₹, ex-GST) *
    Total Price = Quantity × Unit Price (auto-calc)
    [Remove item] button (×)

  Items can be reordered (drag to reorder)
  Minimum 1 item required

SECTION 3: Internal Cost Estimate
  (Visible to FM ONLY — hidden from Supervisor)
  Label: "Internal Cost Analysis — Not shown to client"
  Background: light yellow to distinguish

  Estimated Material Cost (₹): NUMBER input
  Estimated Labour Cost (₹):   NUMBER input
  Estimated Overhead Cost (₹): NUMBER input
  Total Estimated Cost (₹):    AUTO-CALC (sum of above)
  Target Margin %:              NUMBER (default 20%)
  Calculated Price (₹):        AUTO-CALC
    = Total Cost ÷ (1 - margin%)
  Override Price (₹):          NUMBER (optional)
    Helper: "Leave blank to use calculated price"

SECTION 4: Pricing Summary
  Subtotal (ex-GST):     AUTO-CALC (sum of item totals)
  Delivery Charge (₹):  NUMBER (0 if included in items)
  Installation Charge:  NUMBER (0 if included in items)
  Other Charges:        NUMBER + label field
  ─────────────────────────────────────────
  Total (ex-GST):       AUTO-CALC
  GST (18%):            AUTO-CALC
  TOTAL (inc-GST):      AUTO-CALC (bold, large)
  ─────────────────────────────────────────

  MARGIN INDICATOR (FM only, next to totals):
    "You are quoting at [X]% margin"
    Green if ≥ target margin
    Amber if 5-10% below target
    Red if > 10% below target

SECTION 5: Terms
  Advance Required %: NUMBER (default 50%)
  Delivery Timeline: NUMBER input + "working days"
  Notes for client: TEXTAREA
    (appears on client PDF)
  Internal Notes: TEXTAREA
    (never on client PDF)

SUBMIT BUTTONS:
  [Save as Draft]    — saves, no approval needed
  [Submit for Approval] — status = pending_approval
    (only if role = supervisor)
  [Save & Preview PDF] — shows client PDF preview
    (FM only)
  [Save & Send to Client] — saves + sends PDF
    (FM only, status = sent)
```

---

### 3.3 Quotation Detail (/quotations/:id)

Two distinct panels side by side (desktop)
or tabs (mobile):

**LEFT PANEL: Internal View (FM only)**
```
Shows full cost breakdown:
  Estimated costs, margin %, calculated vs quoted price
  Internal notes
  Margin indicator

INTERNAL COST SECTION:
  Material cost: ₹X
  Labour cost: ₹X
  Overhead: ₹X
  Total cost: ₹X
  Target margin: X%
  Calculated price: ₹X
  Override price: ₹X (if set)
  ACTUAL MARGIN: X% (quoted price vs cost)
  Colour coded: green/amber/red
```

**RIGHT PANEL / TAB: Client View**
```
Preview of exactly what client will see on PDF:

  CANVA CONCEPTS header
  Quotation No: QT-26-001
  Date: [date]
  Valid Until: [date]
  Client: [name]

  ITEM TABLE:
    Description | Qty | Unit | Amount (ex-GST)
    [items here — no cost breakdown]

  Delivery Charge (if applicable)
  Installation Charge (if applicable)
  ───────────────────────────────────
  Subtotal (ex-GST)
  GST 18%
  TOTAL
  ───────────────────────────────────
  Terms:
    Advance: [X]% on order confirmation
    Delivery: [X] working days from advance
    This quote is valid until [date]
    [Notes for client]
```

**ACTION BUTTONS (role-based):**
```
FM sees:
  [Edit] (if draft or pending_approval)
  [Approve & Send] (if pending_approval or approved)
  [Send to Client] (if approved)
  [Record Response] (if sent or negotiating)
  [Create Revision] (if sent, negotiating, rejected)
  [Convert to Work Order] (if accepted)
  [Mark as Rejected] (if sent or negotiating)
  [Download PDF]
  [Duplicate]

Supervisor sees:
  [Edit] (if own draft only)
  [Submit for Approval] (if own draft)
  [Download PDF] (if approved or sent)
  [View only] for other statuses
```

---

### 3.4 Send Quotation to Client

Triggered by: [Send to Client] button (FM only)

```
DIALOG:
  Title: "Send Quotation to [Client Name]"

  To (email): [client_email — pre-filled, editable]
  CC: TEXT input (optional)
  Subject: "Quotation QT-26-001 — [description]"
    (editable)
  Message: TEXTAREA
    Pre-filled with standard message:
    "Dear [Client Name],

     Please find attached our quotation for
     [furniture description].

     This quotation is valid until [date].

     Please feel free to contact us for any queries.

     Regards,
     Canva Concepts"

  [Preview PDF] button
  [Cancel] [Send] buttons

ON SEND:
  1. Generate PDF (see Section 3.6)
  2. Send email with PDF attached
     (via Supabase Edge Function calling
      email service — Resend or SendGrid)
  3. UPDATE quotations SET
       status = 'sent',
       sent_at = NOW()
  4. Log in audit_log
  5. Toast: "Quotation sent to [email]"
```

---

### 3.5 Record Client Response

Triggered by: [Record Response] button (FM only)
Available when status = sent or negotiating

```
DIALOG:
  Title: "Record Client Response"

  Response (radio):
    ○ Accepted — client wants to proceed
    ○ Negotiating — client wants to discuss price
    ○ Rejected — client does not want to proceed

  If Negotiating:
    Client's comments: TEXTAREA
    Do you want to create a revised quote?
      YES → [Create Revision] flow (Section 3.7)
      NO → status = negotiating, save comments

  If Rejected:
    Rejection reason: DROPDOWN
      Price too high
      Went to competitor
      Project cancelled
      Timeline not suitable
      Other
    Additional notes: TEXTAREA

  If Accepted:
    Advance payment confirmed: TOGGLE
    [Convert to Work Order] option appears

  [Save Response] button
```

---

### 3.6 Client PDF Generation

PDF must be generated server-side or via PDF library.
Content of PDF (strict — never deviate):

```
═══════════════════════════════════════════
CANVA CONCEPTS
[Factory address]
[Phone] | [Email]
GSTIN: [factory GSTIN]
═══════════════════════════════════════════

QUOTATION
No: QT-26-001          Date: DD-MMM-YYYY
Valid Until: DD-MMM-YYYY

TO:
[Client Name]
[Client Contact if available]

═══════════════════════════════════════════
DESCRIPTION              QTY  UNIT  AMOUNT
───────────────────────────────────────────
[Item 1 description]     [q]  Nos   ₹X
  [Spec details if any]
[Item 2 description]     [q]  Nos   ₹X
[Delivery charges]        1   Lot   ₹X
  (if billed separately)
[Installation charges]    1   Lot   ₹X
  (if applicable)
───────────────────────────────────────────
Subtotal (ex-GST)                   ₹X
GST @ 18%                           ₹X
TOTAL                               ₹X
═══════════════════════════════════════════

TERMS & CONDITIONS:
• Advance payment: [X]% on order confirmation
• Balance: On delivery
• Delivery: [X] working days from advance receipt
• This quotation is valid until [valid_until]
• [Notes for client — from quotation.notes field]

[Authorised Signatory]
Canva Concepts
═══════════════════════════════════════════

STRICTLY DOES NOT APPEAR ON PDF:
  ✗ Estimated cost, material cost, labour cost
  ✗ Margin percentage
  ✗ Internal notes
  ✗ Cost breakdown of any kind
  ✗ Profit figures
```

---

### 3.7 Create Revision

Triggered by: [Create Revision] button
Available: FM only when status = sent, negotiating, rejected

```
Creates a new quotation row:
  parent_qt_id = current QT id
  revision_no = current max revision + 1
  qt_number = QT-26-001-R1 (or R2, R3 etc.)
  status = draft
  All other fields copied from original
  Items copied from original quotation_items

Revision is opened in edit mode.
Original quotation is NOT modified.
Both visible in quotation list.

Revision history shown on detail screen:
  Original: QT-26-001 (sent)
  Revision 1: QT-26-001-R1 (draft) ← current
```

---

### 3.8 Convert to Work Order

Triggered by: [Convert to Work Order] button (FM only)
Available: status = accepted

```
DIALOG:
  Title: "Convert Quotation to Work Order"
  Body: "This will create a new Work Order based on
         this quotation. The quotation will be marked
         as converted."

  For each furniture item in quotation:
    Show item → confirm as WO title
    (FM can edit title before converting)

  If multiple furniture items:
    Option 1: One WO per item
    Option 2: One WO for all items
    (FM selects)

ON CONFIRM (one item or Option 2):
  1. Generate WO number via generate_document_number
  2. INSERT into work_orders:
       title = [quotation item description]
       client_type = b2b or d2c
       client_name = quotation.client_name
       delivery_terms = to be set
       status = draft
       created_by = auth.uid()
     (Additional WO fields filled from quotation items)
  3. UPDATE quotations SET
       status = 'converted',
       converted_to_wo_id = new WO id
  4. Navigate to new WO detail screen
  5. Toast: "Work Order [wo_number] created from
     quotation [qt_number]"
```

---

### 3.9 Quotation Dashboard Stats

On the quotation list page, show these KPIs:
```
This Month:
  Quotes Sent: [count]
  Accepted: [count]
  Conversion Rate: [accepted/sent × 100]%
  Average Quote Value: ₹[avg subtotal]

Pipeline:
  Open Quotes (sent + negotiating): [count] | ₹[value]
  Expiring This Week: [count]

Lost Analysis (rejected this month):
  Price too high: [count]
  Competitor: [count]
  Cancelled: [count]
```

---

## 4. BUSINESS RULES

```
BR-01: QT number format: QT-YY-SEQ (e.g. QT-26-001)
       Revision format: QT-26-001-R1, R2, R3
       Revision links to parent via parent_qt_id

BR-02: Quotations are for B2B and D2C only.
       Chhabee work is billed at Cost+5% — no quotation.
       System must not allow creating QT for Chhabee.

BR-03: Internal cost breakdown and margin are visible
       to Factory Manager ONLY.
       Supervisor can see quoted price but NOT cost/margin.

BR-04: Client PDF must NEVER show cost, margin,
       or internal breakdown. Only item descriptions,
       quantities, prices, GST, total.

BR-05: Quotation must be approved by FM before sending.
       Supervisor can create draft but cannot send.
       FM can create and send directly.

BR-06: Valid until date is mandatory. Default 15 days.
       System auto-marks as expired after valid_until.

BR-07: Accepted quotation can only be converted to WO
       by FM. Converting marks quote as 'converted'.

BR-08: Converted quotations cannot be edited or revised.

BR-09: All revisions are retained. Original and all
       revisions visible in history.

BR-10: A rejected quotation can still be revised.
       Create revision, revise price, send again.

BR-11: Maximum 5 active revisions per quotation.
       After 5, start a fresh quotation.

BR-12: Email sending must log the exact PDF version
       sent and recipient email in audit_log.

BR-13: If client is already in organisations table,
       autofill their details when name is entered.
```

---

## 5. NOTIFICATIONS & ALERTS

```
Quotation Created (by Supervisor):
  → FM: "New quotation [qt_number] created by
    [name] — pending your approval"

Quotation Approved (by FM):
  → Supervisor (if they created it):
    "Quotation [qt_number] approved by FM"

Quotation Sent:
  → FM: "Quotation [qt_number] sent to [client_email]"

Quote Expiring in 3 Days:
  → FM: "Quotation [qt_number] for [client] expires
    in 3 days. Follow up needed."

Quote Expired:
  → FM: "Quotation [qt_number] has expired."

Quote Accepted:
  → FM: "Quotation [qt_number] accepted by [client]!
    Convert to Work Order."

Quote Rejected:
  → FM: "Quotation [qt_number] rejected.
    Reason: [reason]"
```

---

## 6. TESTING CHECKLIST

**Create Quotation:**
[ ] QT number generated correctly: QT-26-001
[ ] Multiple items can be added and removed
[ ] Item totals auto-calculate correctly
[ ] GST calculated correctly (18%)
[ ] FM sees cost/margin section
[ ] Supervisor does NOT see cost/margin
[ ] Margin indicator colour correct
[ ] Save as draft works

**PDF Generation:**
[ ] PDF contains no cost or margin information
[ ] PDF shows all items with prices
[ ] GST calculated correctly on PDF
[ ] Valid until date shown
[ ] Terms and conditions shown
[ ] Internal notes NOT on PDF

**Send Flow:**
[ ] Supervisor cannot send (only submit for approval)
[ ] FM can approve and send
[ ] Email received by client with PDF attached
[ ] Status changes to 'sent' after sending
[ ] Sent timestamp recorded

**Response Recording:**
[ ] Accepted → convert to WO option appears
[ ] Negotiating → revision option appears
[ ] Rejected → reason recorded

**Revision:**
[ ] Revision number increments (R1, R2)
[ ] Original quotation unchanged
[ ] All revisions visible in history
[ ] QT number format: QT-26-001-R1

**Convert to WO:**
[ ] WO created with correct client details
[ ] WO status = draft
[ ] Quotation status = converted
[ ] Link from WO back to quotation visible
[ ] Cannot convert already-converted quotation

---

## 7. INTEGRATION POINTS

```
PRD-01: Only FM and Supervisor can access quotations
         Role check via get_current_user_role()

PRD-02: Convert to WO creates a work_orders record
         WO detail shows "Created from QT [number]"

PRD-07: If client exists in organisations table,
         autofill client details from there

PRD-12: Accepted quotation price becomes the
         basis for the sales invoice amount

PRD-15: Quotation conversion rate is a KPI in
         MIS/Reporting module
         Lost quote analysis by reason
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-02*
*Next document: PRD-05 BOM & Material Planning*
