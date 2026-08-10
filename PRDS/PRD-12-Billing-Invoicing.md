# PRD-12: BILLING & INVOICING
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
Manages all client-facing billing — from proforma invoices
to tax invoices, credit notes, debit notes, and payment
tracking. The billing module is a separate, standalone module
from MIS/Reporting. It handles operational billing only —
the accounting and statutory compliance layer sits in
Tally (handled by CA via monthly export from PRD-13).

### Important Architecture Decisions
1. Billing and MIS/Reporting are TWO separate modules
2. ERP P&L = Management P&L (for running the business)
3. Tally P&L = Statutory P&L (for filing and audit)
4. e-Invoice (IRP) system: ERP is READY from Day 1
   but IRP integration is DEFERRED (future Phase)
5. GST computed at database level — never in app code

### Users of This Module
- Factory Manager: Full access — create, approve,
  send all invoices, issue credit/debit notes
- Others: No billing access
  (Site Manager sees invoice status on their WO only)

### Key Outcomes
- Every delivery triggers correct GST-compliant invoice
- Three billing types handled (delivery/milestone/advance)
- Automated payment follow-up reminders
- TDS deducted by clients formally tracked
- Credit and debit notes with reason audit trail
- Monthly Tally export by 5th of each month

---

## 2. DATABASE SCHEMA

### 2.1 sales_invoices (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN (
    'tax_invoice',      -- Full GST invoice
    'proforma_invoice', -- PI before work starts
    'advance_receipt'   -- Receipt against advance
  )),
  wo_id UUID REFERENCES public.work_orders(id),
  client_org_id UUID REFERENCES public.organisations(id),
  client_name TEXT NOT NULL,
  client_gstin TEXT,
  client_billing_address TEXT NOT NULL,
  -- Billing type
  billing_trigger TEXT NOT NULL CHECK (billing_trigger IN (
    'delivery',   -- Invoice on delivery confirmation
    'milestone',  -- Milestone billing
    'advance'     -- Advance before production
  )),
  milestone_no INTEGER,
  milestone_pct NUMERIC,
  -- GST fields
  place_of_supply TEXT NOT NULL,
  place_of_supply_code TEXT NOT NULL,
  is_inter_state BOOLEAN NOT NULL DEFAULT false,
  -- Amounts
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  taxable_amount NUMERIC GENERATED ALWAYS AS
    (subtotal - COALESCE(discount_amount, 0)) STORED,
  cgst_rate NUMERIC DEFAULT 9,
  sgst_rate NUMERIC DEFAULT 9,
  igst_rate NUMERIC DEFAULT 18,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  igst_amount NUMERIC NOT NULL DEFAULT 0,
  total_gst NUMERIC GENERATED ALWAYS AS
    (cgst_amount + sgst_amount + igst_amount) STORED,
  invoice_total NUMERIC GENERATED ALWAYS AS
    (subtotal - COALESCE(discount_amount,0) +
     cgst_amount + sgst_amount + igst_amount) STORED,
  -- Advance adjustment
  advance_adjusted NUMERIC DEFAULT 0,
  advance_receipt_id UUID,
  -- Net payable
  net_payable NUMERIC GENERATED ALWAYS AS
    (subtotal - COALESCE(discount_amount,0) +
     cgst_amount + sgst_amount + igst_amount -
     COALESCE(advance_adjusted,0)) STORED,
  -- e-Invoice (ready but deferred)
  irn TEXT,
  irn_generated_at TIMESTAMPTZ,
  qr_code TEXT,
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'approved',
    'sent',
    'partially_paid',
    'paid',
    'overdue',
    'cancelled',
    'credit_note_issued'
  )),
  -- TDS
  tds_applicable BOOLEAN DEFAULT false,
  tds_amount NUMERIC DEFAULT 0,
  tds_section TEXT,
  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  -- Payment tracking
  amount_received NUMERIC DEFAULT 0,
  amount_outstanding NUMERIC GENERATED ALWAYS AS
    (net_payable - COALESCE(amount_received,0) -
     COALESCE(tds_amount,0)) STORED,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  -- Metadata
  notes TEXT,
  internal_notes TEXT,
  cancellation_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX inv_wo_idx ON public.sales_invoices(wo_id);
CREATE INDEX inv_status_idx ON public.sales_invoices(status);
CREATE INDEX inv_client_idx ON public.sales_invoices(client_org_id);
CREATE INDEX inv_due_date_idx ON public.sales_invoices(due_date);

ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on sales_invoices"
ON public.sales_invoices FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Site Manager can view own WO invoices"
ON public.sales_invoices FOR SELECT
USING (
  public.get_current_user_role() = 'chhabee_spoc'
  AND EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE id = wo_id AND created_by = auth.uid()
  )
);
```

### 2.2 sales_invoice_items (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.sales_invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.sales_invoices(id)
    ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  hsn_sac_code TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'Nos',
  rate NUMERIC NOT NULL,
  discount_pct NUMERIC DEFAULT 0,
  taxable_amount NUMERIC GENERATED ALWAYS AS
    (quantity * rate * (1 - COALESCE(discount_pct,0)/100))
    STORED,
  gst_rate NUMERIC DEFAULT 18,
  is_inter_state BOOLEAN NOT NULL DEFAULT false,
  cgst_amount NUMERIC GENERATED ALWAYS AS (
    CASE WHEN is_inter_state THEN 0
    ELSE ROUND((quantity * rate *
      (1-COALESCE(discount_pct,0)/100) * gst_rate/200), 2)
    END
  ) STORED,
  sgst_amount NUMERIC GENERATED ALWAYS AS (
    CASE WHEN is_inter_state THEN 0
    ELSE ROUND((quantity * rate *
      (1-COALESCE(discount_pct,0)/100) * gst_rate/200), 2)
    END
  ) STORED,
  igst_amount NUMERIC GENERATED ALWAYS AS (
    CASE WHEN is_inter_state
    THEN ROUND((quantity * rate *
      (1-COALESCE(discount_pct,0)/100) * gst_rate/100), 2)
    ELSE 0 END
  ) STORED,
  line_total NUMERIC GENERATED ALWAYS AS (
    quantity * rate * (1-COALESCE(discount_pct,0)/100) +
    CASE WHEN is_inter_state
    THEN ROUND((quantity * rate *
      (1-COALESCE(discount_pct,0)/100) * gst_rate/100), 2)
    ELSE ROUND((quantity * rate *
      (1-COALESCE(discount_pct,0)/100) * gst_rate/100), 2)
    END
  ) STORED,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales_invoice_items
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on invoice items"
ON public.sales_invoice_items FOR ALL
USING (public.is_incoming_partner());
```

### 2.3 credit_notes (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cn_number TEXT UNIQUE NOT NULL,
  original_invoice_id UUID REFERENCES
    public.sales_invoices(id) NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id),
  client_org_id UUID REFERENCES public.organisations(id),
  reason TEXT NOT NULL CHECK (reason IN (
    'freight_absorbed',
    'goods_returned',
    'pricing_error',
    'quality_claim',
    'delivery_terms_change',
    'discount_granted',
    'other'
  )),
  reason_notes TEXT,
  -- Amounts (computed at DB level)
  subtotal NUMERIC NOT NULL DEFAULT 0,
  is_inter_state BOOLEAN NOT NULL DEFAULT false,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  igst_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS
    (subtotal + cgst_amount + sgst_amount + igst_amount)
    STORED,
  -- e-Invoice (deferred)
  irn TEXT,
  irn_generated_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'sent', 'cancelled'
  )),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on credit_notes"
ON public.credit_notes FOR ALL
USING (public.is_incoming_partner());
```

### 2.4 debit_notes (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.debit_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dn_number TEXT UNIQUE NOT NULL,
  original_invoice_id UUID REFERENCES
    public.sales_invoices(id) NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id),
  client_org_id UUID REFERENCES public.organisations(id),
  reason TEXT NOT NULL CHECK (reason IN (
    'additional_work',
    'price_revision',
    'extra_freight',
    'extra_installation',
    'other'
  )),
  reason_notes TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  is_inter_state BOOLEAN NOT NULL DEFAULT false,
  cgst_amount NUMERIC NOT NULL DEFAULT 0,
  sgst_amount NUMERIC NOT NULL DEFAULT 0,
  igst_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS
    (subtotal + cgst_amount + sgst_amount + igst_amount)
    STORED,
  irn TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'sent', 'cancelled'
  )),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on debit_notes"
ON public.debit_notes FOR ALL
USING (public.is_incoming_partner());
```

### 2.5 payment_receipts (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  invoice_id UUID REFERENCES public.sales_invoices(id)
    NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id),
  client_org_id UUID REFERENCES public.organisations(id),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_received NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN (
    'neft', 'rtgs', 'upi', 'cheque', 'cash', 'other'
  )),
  bank_reference TEXT,
  utr_number TEXT,
  cheque_number TEXT,
  cheque_date DATE,
  bank_name TEXT,
  -- TDS
  tds_deducted NUMERIC DEFAULT 0,
  tds_section TEXT,
  form_16a_required BOOLEAN DEFAULT false,
  form_16a_received BOOLEAN DEFAULT false,
  form_16a_received_at TIMESTAMPTZ,
  form_16a_document_url TEXT,
  -- Advance flag
  is_advance BOOLEAN DEFAULT false,
  advance_adjusted_in_invoice_id UUID
    REFERENCES public.sales_invoices(id),
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on payment_receipts"
ON public.payment_receipts FOR ALL
USING (public.is_incoming_partner());
```

### 2.6 tds_ledger (NEW TABLE — Chhabee Adoption 5)

```sql
CREATE TABLE IF NOT EXISTS public.tds_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tds_type TEXT NOT NULL CHECK (tds_type IN (
    'deducted_by_us',     -- We deduct when paying vendor
    'deducted_by_client'  -- Client deducts from our invoice
  )),
  -- Scenario A: We deduct TDS on vendor payment
  payment_id UUID REFERENCES public.payment_receipts(id),
  vendor_org_id UUID REFERENCES public.organisations(id),
  -- Scenario B: Client deducts TDS from our invoice
  sales_invoice_id UUID REFERENCES public.sales_invoices(id),
  client_org_id UUID REFERENCES public.organisations(id),
  -- TDS details
  section TEXT NOT NULL DEFAULT '194C',
  pct NUMERIC NOT NULL,
  base_amount NUMERIC NOT NULL,
  tds_amount NUMERIC NOT NULL,
  financial_year TEXT NOT NULL,   -- '2026-27'
  quarter SMALLINT NOT NULL,      -- 1, 2, 3, 4
  -- Form 16A tracking
  form_16a_received BOOLEAN DEFAULT false,
  form_16a_received_at TIMESTAMPTZ,
  form_16a_document_url TEXT,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Append-only: no updated_at, no soft delete
);

CREATE INDEX tds_type_idx ON public.tds_ledger(tds_type);
CREATE INDEX tds_fy_idx
  ON public.tds_ledger(financial_year, quarter);

ALTER TABLE public.tds_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM only on tds_ledger"
ON public.tds_ledger FOR ALL
USING (public.is_incoming_partner());
```

### 2.7 delivery_terms_amendments (NEW TABLE)

```sql
-- Addition 10D.4 from decision log
CREATE TABLE IF NOT EXISTS public.delivery_terms_amendments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dta_number TEXT UNIQUE NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id) NOT NULL,
  invoice_id UUID REFERENCES public.sales_invoices(id),
  original_delivery_terms TEXT NOT NULL,
  revised_delivery_terms TEXT NOT NULL,
  reason TEXT NOT NULL,
  cost_impact NUMERIC DEFAULT 0,
  margin_before NUMERIC,
  margin_after NUMERIC,
  credit_note_id UUID REFERENCES public.credit_notes(id),
  raised_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delivery_terms_amendments
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM only on dta"
ON public.delivery_terms_amendments FOR ALL
USING (public.is_incoming_partner());
```

### 2.8 Add to numbering_counters

```sql
INSERT INTO public.numbering_counters
  (doc_type, fy, last_seq) VALUES
  ('INV_CHH', '2526', 0),
  ('INV_B2B', '2526', 0),
  ('INV_D2C', '2526', 0),
  ('PI', '2526', 0),
  ('CN', '2526', 0),
  ('DN', '2526', 0),
  ('ADV_RCP', '2526', 0),
  ('PMT_RCP', '2526', 0),
  ('DTA', '2526', 0)
ON CONFLICT (doc_type, fy) DO NOTHING;
```

---

## 3. BILLING TYPES BY STREAM

### Chhabee Billing
```
Billing model: Cost + 5% of direct cost
  (NOT market rate — Cost+5% per C1 decision)

Formula:
  Direct cost = Materials + Labour + Overhead allocation
  Invoice amount = Direct cost × 1.05
  GST 18% on top (pass-through)

Default trigger: Delivery-triggered
  Invoice auto-drafted on delivered_confirmed status

Large Chhabee jobs (optional milestone billing):
  Configured at WO creation if needed
  Advance: Optional (50% if paid, 100% on delivery if not)
  
No proforma invoice needed for Chhabee.
Internal estimate can be generated on request.
```

### External B2B Billing
```
Small job (< ₹5L total):
  50% advance on order confirmation (PI raised)
  50% final on delivery (Tax Invoice raised)

Large job (≥ ₹5L total):
  Milestone billing (3 stages):
    Stage 1: 30% on order confirmation
             PI raised, advance collected
    Stage 2: 40% on production complete
             Tax Invoice raised
    Stage 3: 30% on delivery confirmed
             Tax Invoice raised, balance collected
  
  Milestones defined at WO creation.
  Cannot be changed after production starts.

Billing rate: ₹1,200/billing sqft (market rate)
```

### D2C Billing
```
100% advance before production starts.
  PI raised immediately on WO approval.
  Production blocked until advance confirmed.

Final Tax Invoice on delivery/dispatch.
Advance adjusted in final invoice.

Billing rate: ₹1,200/billing sqft
```

---

## 4. GST COMPLIANCE

### Place of Supply (Critical — Auto-detected)
```
Factory location: Gurgaon, Haryana (State code: 06)

Rule:
  Delivery to Haryana address:
    is_inter_state = false
    Apply CGST 9% + SGST 9%

  Delivery to any other state:
    is_inter_state = true
    Apply IGST 18%

System auto-determines from:
  delivery_address on Work Order vs factory state
  State extracted from pincode or state field

WRONG GST TYPE = Non-compliant invoice
= Client loses ITC = Payment dispute
This must never happen.
```

### Mandatory Invoice Fields (Rule 46 — All 21)
```
All auto-populated by system. Never manually entered.

1.  Invoice number (max 16 chars, sequential)
2.  Invoice date
3.  Supplier name (Canva Concepts)
4.  Supplier address
5.  Supplier GSTIN
6.  Recipient name
7.  Recipient address
8.  Recipient GSTIN (mandatory for B2B)
9.  Place of supply (state name + code)
10. HSN/SAC code per line item
11. Description of goods/services
12. Quantity
13. Unit of measure
14. Taxable value per line
15. GST rate per line
16. CGST amount (if intra-state)
17. SGST amount (if intra-state)
18. IGST amount (if inter-state)
19. Total invoice value
20. Reverse charge declaration (No)
21. Authorized signatory
```

### HSN Codes
```
Furniture (counters, workstations, cabinets): 9403
Freight/Delivery charges:                     9965
Installation charges:                          9954 (SAC)

Raw material purchases (for reference):
  Plywood:  4412
  Laminate: 3921
  Hardware: 8302

HSN digit requirement:
  Up to ₹5 Cr annual turnover: 4-digit HSN
  Above ₹5 Cr: 6-digit HSN
  System auto-manages this upgrade
```

### e-Invoice Readiness (IRP — Deferred)
```
SYSTEM IS READY but IRP integration is DEFERRED.

What is built (ready):
  Invoice data structured in IRP-compatible JSON format
  IRN field exists on all invoices
  QR code field exists on all invoices
  
What is NOT built yet:
  Actual API call to IRP portal
  Auto-population of IRN + QR code
  
When to activate:
  When annual revenue approaches ₹5 Cr
  Developer connects IRP API at that point
  IRN becomes mandatory for all invoices

Until then:
  Invoice PDF shows "e-Invoice: Pending IRP Integration"
  CA notes this in Tally during import
```

---

## 5. SCREENS & FLOWS

### 5.1 Billing Dashboard (/billing)

Access: FM only

```
Page title: "Billing & Collections"

SUMMARY CARDS:
  To Invoice Today: [count] — amber
  Outstanding Receivables: ₹[total] — blue
  Overdue (> due date): ₹[total] — red
  Collected This Month: ₹[total] — green
  TDS Pending (Form 16A): [count] — amber

TABS:
  Tab 1: Pending Invoices
  Tab 2: All Invoices
  Tab 3: Collections
  Tab 4: Credit/Debit Notes
  Tab 5: TDS Tracker
```

---

### 5.2 Pending Invoices Tab

```
Shows WOs ready to be invoiced:
  status = delivered_confirmed
  AND no invoice exists yet
  OR next milestone due

Each row:
  WO Number | Client | Billing Type |
  Amount to Invoice | Trigger | Days since delivery

[Create Invoice] button per row
[Bulk Invoice] button (create multiple at once)

Also shows milestone triggers:
  WO-B2B-26-001 | Stage 2 triggered
  (production_complete reached)
  Amount: ₹1,20,000 (40% of ₹3,00,000)
  [Create Milestone Invoice]
```

---

### 5.3 Create Invoice

Route: /billing/invoices/new
Access: FM only

```
STEP 1: AUTO-DRAFT (system pre-fills)

When [Create Invoice] clicked:
  System auto-populates:
    Client details from organisations table
    WO reference
    Billing type and trigger
    Line items from WO (furniture + charges)
    Place of supply (from delivery address)
    is_inter_state (auto-calculated)
    HSN codes (from material master or default 9403)
    GST amounts (computed at DB level)
    Due date (invoice date + client credit days)

FM reviews and can adjust:
  Line item descriptions
  Rates (if override needed — logged)
  Delivery charges (if billed at actuals)
  Installation charges (if applicable)
  Notes for client

STEP 2: GST CALCULATION PREVIEW

  Shows clearly:
  ┌──────────────────────────────────────────────────┐
  │ Place of Supply: Delhi (inter-state)             │
  │ GST Type: IGST @ 18%                            │
  │                                                  │
  │ Furniture (Counter)  HSN:9403   ₹42,000         │
  │ IGST @ 18%                       ₹7,560         │
  │ ─────────────────────────────────────────────    │
  │ TOTAL:                           ₹49,560         │
  └──────────────────────────────────────────────────┘

  Warning shown if place of supply seems wrong:
    "Delivery address is Haryana but IGST selected.
     Please verify."

STEP 3: ADVANCE ADJUSTMENT (if advance received)

  If advance exists for this WO:
  "Advance received: ₹X (Receipt ADV-RCP-26-001)"
  Advance to adjust: ₹X (pre-filled, editable)
  Net payable: ₹[total − advance]

STEP 4: SUBMIT

  [Save as Draft] — no notification
  [Approve & Send] — approves and emails client

ON APPROVE & SEND:
  1. Generate invoice number:
     Chhabee: INV-CHH-26-001
     B2B:     INV-B2B-26-001
     D2C:     INV-D2C-26-001
  2. Compute all GST fields (DB generated columns)
  3. INSERT into sales_invoices
  4. INSERT into sales_invoice_items
  5. UPDATE work_orders SET status = 'invoice_raised'
  6. Generate invoice PDF
  7. Send to client:
     Email: PDF attached
     WhatsApp: PDF + payment details
  8. UPDATE sales_invoices SET
       status = 'sent',
       sent_at = NOW()
  9. If advance_adjusted > 0:
     UPDATE payment_receipts SET
       advance_adjusted_in_invoice_id = new invoice id
  10. Toast: "Invoice [number] sent to [client]"
```

---

### 5.4 Invoice PDF Format

```
═══════════════════════════════════════════════════
CANVA CONCEPTS
[Factory Address], Gurgaon, Haryana — 122001
GSTIN: [factory GSTIN]
Phone: [phone] | Email: [email]
═══════════════════════════════════════════════════

TAX INVOICE
Invoice No: INV-CHH-26-001    Date: DD-MMM-YYYY
WO Reference: WO-CHH-26-001
[e-Invoice: IRN — Pending IRP Integration]
═══════════════════════════════════════════════════

BILL TO:
[Client Legal Name]
[Billing Address]
GSTIN: [Client GSTIN]
State: [State Name] (Code: [XX])
═══════════════════════════════════════════════════

PLACE OF SUPPLY: [State Name] ([Code])
═══════════════════════════════════════════════════

DESCRIPTION        HSN    QTY  UNIT   RATE    AMOUNT
Reception Counter  9403     1  Nos  42,000    42,000
[if delivery]
Freight Charges    9965     1  Lot   2,000     2,000
─────────────────────────────────────────────────────
Taxable Amount:                               44,000
IGST @ 18%:                                   7,920
(OR: CGST @ 9%: 3,960 + SGST @ 9%: 3,960)
─────────────────────────────────────────────────────
TOTAL:                                        51,920
Less: Advance Adjusted (ADV-RCP-26-001):     -10,000
─────────────────────────────────────────────────────
NET PAYABLE:                                  41,920
═══════════════════════════════════════════════════

Payment due by: [due_date]
Bank: HDFC Bank | A/C: [number] | IFSC: [code]
UPI: [upi_id]

Reverse Charge: No
Declaration: Goods dispatched in good condition.

For Canva Concepts
Authorised Signatory
═══════════════════════════════════════════════════
```

---

### 5.5 Payment Follow-Up System

Automated reminders — no manual intervention needed.

```
T+0:       Invoice sent
           Status: 'sent'

T+7:       REMINDER 1 (auto WhatsApp + Email)
           "Invoice INV-CHH-26-001 for ₹X
            due on [date]. Kindly confirm receipt
            and arrange payment."

T+Due-3:   REMINDER 2 (auto WhatsApp)
           "Payment of ₹X due in 3 days.
            Invoice: INV-CHH-26-001"

T+Due:     REMINDER 3 (auto WhatsApp + Email)
           "Payment due today: ₹X
            Invoice: INV-CHH-26-001"
           STATUS → 'overdue'

T+Due+7:   ESCALATION 1
           FM in-app alert: "Manual follow-up needed"
           FM calls client directly

T+Due+15:  ESCALATION 2
           For Chhabee: Super Admin informed
           For B2B/D2C: FM decides action

T+Due+30:  FINAL ESCALATION
           Status: 'overdue' + flag
           FM marks: Legal / Write-off / Negotiate

All reminders logged.
FM can suppress any reminder with reason.
Suppression is logged permanently.
```

---

### 5.6 Record Payment

Route: /billing/payments/new
Access: FM only

```
FORM FIELDS:
  Invoice * (search by number or client)
  Receipt Date * (DATE, default today)
  Amount Received * (NUMERIC)
    Shows: Invoice total | Outstanding | Amount field
  Payment Mode * (NEFT/RTGS/UPI/Cheque/Cash)
  Bank Reference / UTR (mandatory for NEFT/RTGS)
  Cheque Number + Date (if cheque)

  TDS Deducted by Client: TOGGLE (default OFF)
    If ON:
      TDS Amount: NUMERIC
      TDS Section: TEXT (default 194C)
      Expected Form 16A: YES (auto-set)
      "System will track Form 16A certificate"

[Record Payment] button

ON SUBMIT:
  1. Generate receipt number: PMT-RCP-26-001
  2. INSERT into payment_receipts
  3. UPDATE sales_invoices:
       amount_received += amount_received
       If amount_received >= net_payable:
         status = 'paid'
       Else:
         status = 'partially_paid'
  4. If TDS deducted:
     INSERT into tds_ledger:
       tds_type = 'deducted_by_client'
       sales_invoice_id = invoice id
       client_org_id = client id
       pct = tds_pct
       base_amount = invoice taxable amount
       tds_amount = tds_amount
       financial_year = '2026-27'
       quarter = [auto-calculated from date]
  5. If invoice status = 'paid':
     UPDATE work_orders SET status = 'financially_closed'
     LOCK final job costing (no further changes)
     Final WO P&L archived
  6. Toast: "Payment ₹X recorded for [invoice number]"
```

---

### 5.7 TDS Tracker Tab

```
Shows all TDS deducted by clients:

TABLE COLUMNS:
  Client | Invoice | Invoice Date | Invoice Amount |
  TDS Amount | Section | Quarter | Form 16A Status

Form 16A Status:
  Pending → amber "PENDING"
  Received → green "RECEIVED"

DUE DATES (Form 16A):
  Q1 (Apr-Jun): Due 15-Aug
  Q2 (Jul-Sep): Due 15-Nov
  Q3 (Oct-Dec): Due 15-Feb
  Q4 (Jan-Mar): Due 15-May

System alerts FM 15 days before each quarterly deadline:
  "Form 16A due from [client] by [date]
   TDS amount: ₹X"

On receipt of Form 16A:
  [Mark Received] button
  Upload scan of Form 16A
  form_16a_received = true
  form_16a_document_url = [url]
  Handed to CA for Form 26AS reconciliation
```

---

### 5.8 Credit Note Flow

Triggered by: complaint resolution / delivery terms change /
             pricing error / goods return
Access: FM only

```
CREDIT NOTE FORM:
  Original Invoice * (search)
  Reason * (dropdown — fixed enum):
    Freight Absorbed (delivery terms changed)
    Goods Returned
    Pricing Error (wrong rate on invoice)
    Quality Claim (complaint resolved with credit)
    Delivery Terms Change
    Discount Granted
    Other (specify)
  Reason Notes (TEXTAREA, mandatory if 'Other')

  Credit Amount:
    System suggests: [freight amount] (if freight absorbed)
    FM can enter any amount up to invoice total
  
  GST on Credit Note:
    Same is_inter_state as original invoice
    GST computed at DB level (generated columns)

[Create Credit Note] button

ON CREATE:
  1. Generate CN number: CN-26-001
  2. INSERT into credit_notes
  3. UPDATE sales_invoices:
       If CN reduces invoice to zero:
         status = 'credit_note_issued'
  4. Notify client:
     "Credit Note CN-26-001 for ₹X issued against
      Invoice INV-CHH-26-001. Reason: [reason]"
  5. UPDATE work_orders job costing:
     If freight absorbed: margin recalculated
     System shows: "Margin revised from X% to Y%"

FOR DELIVERY TERMS AMENDMENT (DTA):
  If original delivery terms = actuals (freight billed)
  And new terms = included (factory absorbs freight):
    INSERT into delivery_terms_amendments:
      DTA-[WO NUMBER]-01
      original_delivery_terms = 'actuals'
      revised_delivery_terms = 'included'
      reason = [mandatory]
      cost_impact = freight amount
      margin_before = original margin%
      margin_after = revised margin%
    Credit Note raised automatically for freight amount
```

---

### 5.9 Debit Note Flow

For additional charges after invoice is issued.
Access: FM only

```
DEBIT NOTE FORM:
  Original Invoice * (search)
  Reason * (dropdown):
    Additional Work Done
    Price Revision (upward)
    Extra Freight (if actual higher than estimated)
    Extra Installation
    Other
  
  Additional Amount: NUMERIC
  Description: TEXTAREA

[Create Debit Note] button

ON CREATE:
  Generate DN number: DN-26-001
  INSERT into debit_notes
  Notify client with DN PDF
  UPDATE wo job costing (additional revenue)
```

---

### 5.10 Milestone Billing Setup (on WO creation for B2B ≥ ₹5L)

```
When creating B2B WO with value ≥ ₹5L:
  System prompts: "Set milestone billing?"
  
  If YES:
    Total WO Value: ₹[amount]
    
    Milestone 1: [30]% = ₹X
      Trigger: Order Confirmation
      Type: Proforma Invoice (advance)
    
    Milestone 2: [40]% = ₹X
      Trigger: Production Complete
      Type: Tax Invoice
    
    Milestone 3: [30]% = ₹X
      Trigger: Delivery Confirmed
      Type: Tax Invoice
    
    Percentages editable. Must total 100%.
    Milestones locked after production starts.

  On each milestone trigger:
    System auto-drafts invoice for that milestone %
    FM reviews and sends
    Running balance shown on WO:
      "₹X billed of ₹Y total (Milestone 2 of 3)"
```

---

### 5.11 Tally Export

Access: FM only
Route: /billing/tally-export

```
Runs on 5th of each month for previous month.

FM selects:
  Export Period: [Month ▼] [Year ▼]

System generates Excel with these sheets:

SHEET 1: Sales Invoices
  Invoice No | Date | Client | GSTIN |
  HSN | Taxable | CGST | SGST | IGST |
  Total | WO Reference

SHEET 2: Credit Notes
  CN No | Date | Against Invoice |
  Reason | Amount | GST breakdown

SHEET 3: Debit Notes
  DN No | Date | Against Invoice |
  Reason | Amount | GST breakdown

SHEET 4: Payment Receipts
  Receipt No | Date | Invoice | Client |
  Amount | Mode | UTR | TDS deducted

SHEET 5: Advance Receipts
  ADV-RCP No | Date | Client | Amount |
  GST | Adjusted in Invoice

All amounts in Tally-compatible format.
FM downloads and emails to CA.
CA imports into Tally.

WHAT CA DOES IN TALLY:
  Month-end closing entries
  GST return filing (GSTR-1, GSTR-3B)
  TDS returns (Form 26Q)
  Balance sheet preparation
  ROC filing
```

---

## 6. BUSINESS RULES

```
BR-01: Invoice can only be created for WOs with
       status = delivered_confirmed (or milestone trigger).
       No invoice without delivery confirmation.

BR-02: Chhabee billing = Cost + 5% of direct cost.
       NOT market rate. NOT ₹1,200/sqft.
       Formula: (Materials + Labour + OH) × 1.05

BR-03: B2B and D2C billing = ₹1,200/billing sqft
       (market rate — from AOP locked model)

BR-04: Place of supply MUST be auto-detected.
       Never manually entered.
       Wrong GST type = invalid invoice.

BR-05: All 21 GST mandatory fields auto-populated.
       Invoice cannot be sent with blank mandatory fields.
       System hard blocks submission.

BR-06: GST computed at database level via generated
       columns. Never computed in application code.
       cgst/sgst/igst amounts = generated columns.

BR-07: e-Invoice (IRP) system is READY but DEFERRED.
       IRN field exists, IRP API not connected yet.
       Activate when turnover approaches ₹5 Cr.

BR-08: Credit Note reason must be from fixed enum.
       No free-text reason without selecting category.
       This enables complaint analytics in MIS.

BR-09: Delivery Terms Amendment (DTA) required when
       delivery terms change after invoice is issued.
       DTA number: DTA-WO-CHH-26-001-01
       Auto-triggers credit note for freight amount.

BR-10: TDS deducted by client MUST be tracked even if
       194C technically should not apply (sale of goods).
       Some clients will deduct incorrectly.
       Form 16A must be collected each quarter.

BR-11: Invoice cancellation (before payment):
       Draft invoices: cancel anytime
       Sent invoices: credit note required
       After 24 hours with IRN: credit note only
       (Once IRP is connected — regulatory rule)

BR-12: Advance receipt creates GST liability.
       When advance adjusted in final invoice:
         GST on advance reversed
         Full GST on invoice applied
       CA handles this in Tally.

BR-13: WO is financially_closed only when:
       Invoice is fully paid (amount_received >= net_payable)
       AND TDS certificates received (if TDS was deducted)
       Final job costing is locked — no further changes.

BR-14: Milestone billing for B2B ≥ ₹5L:
       Milestones defined at WO creation.
       Cannot be changed after production starts.
       Final WO P&L only after all milestones collected.

BR-15: Payment suppression (FM can pause reminders)
       requires mandatory reason.
       Suppression logged permanently in audit trail.
```

---

## 7. NOTIFICATIONS & ALERTS

```
Invoice Auto-Drafted (on delivery_confirmed):
  → FM: "Invoice ready to send for WO [number].
    Amount: ₹X. Review and send."

Invoice Sent:
  → FM: "Invoice INV-CHH-26-001 sent to [client]"

Payment Reminders (automated):
  T+7, T+Due-3, T+Due, T+Due+7, T+Due+15, T+Due+30
  (See Section 5.5 for exact text)

Payment Received:
  → FM: "Payment ₹X received from [client] for
    Invoice [number]. Outstanding: ₹Y"

WO Financially Closed:
  → FM: "WO [number] financially closed.
    Final margin: X%"

TDS Certificate Due:
  → FM (15 days before deadline):
    "Form 16A from [client] due by [date].
     TDS amount: ₹X. Quarter: [Q]"

Credit Note Issued:
  → FM: "Credit Note CN-26-001 issued to [client]
    for ₹X. Reason: [reason]"

Tally Export Due:
  → FM (on 3rd of each month):
    "Monthly Tally export due by 5th.
     Last period: [month/year]"
```

---

## 8. TESTING CHECKLIST

**Invoice Creation:**
[ ] Auto-draft triggered on delivered_confirmed
[ ] Chhabee: Cost+5% formula applied correctly
[ ] B2B/D2C: ₹1,200/sqft applied
[ ] Place of supply auto-detected (Haryana vs other)
[ ] CGST+SGST for intra-state (Haryana)
[ ] IGST for inter-state (Delhi, UP etc.)
[ ] All 21 GST fields auto-populated
[ ] Advance adjustment works correctly
[ ] Invoice number: INV-CHH-26-001 format
[ ] PDF generated correctly

**Milestone Billing:**
[ ] Milestone setup at WO creation (≥₹5L B2B)
[ ] Stage 1 (30%) invoice on order confirmation
[ ] Stage 2 (40%) on production_complete
[ ] Stage 3 (30%) on delivered_confirmed
[ ] Cannot change milestones after production starts
[ ] Running balance shown correctly

**Payment Recording:**
[ ] Receipt number: PMT-RCP-26-001
[ ] Invoice status → paid when fully settled
[ ] WO → financially_closed when paid
[ ] TDS entry in tds_ledger when TDS deducted
[ ] Partial payment shows correct outstanding

**TDS Tracker:**
[ ] Form 16A tracking per client per quarter
[ ] Quarterly due date alerts
[ ] Form 16A upload works
[ ] CA can see TDS summary for return filing

**Credit Note:**
[ ] CN number: CN-26-001
[ ] Reason enum enforced (no free text only)
[ ] GST reversed correctly on CN
[ ] Invoice status updated after CN

**Debit Note:**
[ ] DN number: DN-26-001
[ ] Invoice total increases after DN
[ ] Client notified with DN PDF

**Tally Export:**
[ ] All 5 sheets generated correctly
[ ] GST breakup in correct format
[ ] Previous month data only
[ ] Download works for FM

---

## 9. INTEGRATION POINTS

```
PRD-02: Invoice triggers WO status → invoice_raised
         Payment triggers WO → financially_closed
         Final job costing locked at financial closure

PRD-04: Accepted quotation value = basis for invoice
         Quotation converted to WO → invoice rate

PRD-05: Job costing (3 columns) feeds WO P&L
         Actual costs locked on financial closure

PRD-11: Delivery confirmed = invoice trigger
         Complaint resolution → credit note

PRD-13: Accounts receivable managed here
         Advance receipts tracked in Finance module
         Bank reconciliation matches payments

PRD-14: Payroll cost allocated to WO job costing
         Feeds final margin calculation

PRD-15: Invoice value and collection by stream (MIS)
         Client profitability (revenue - cost)
         Collection efficiency (debtor days)
         AOP vs actual revenue

PRD-16: Dashboard: "X invoices pending sending"
         "Outstanding: ₹X"
         "TDS certificates due: X"
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-02, PRD-07, PRD-11*
*Key decisions: Billing = separate from MIS (D1)*
*Chhabee billing = Cost+5% (C1)*
*e-Invoice ready but IRP deferred*
*TDS Ledger = Chhabee Adoption 5*
*DTA = Decision log Addition 10D.4*
*Next document: PRD-13 Finance & Accounts*
