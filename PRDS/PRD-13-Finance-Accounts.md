# PRD-13: FINANCE & ACCOUNTS
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
The Finance module is the operational accounting backbone
of the ERP. It manages accounts receivable, accounts payable,
job costing, cash and bank tracking, GST working, fixed
assets, and petty cash. It does NOT replace Tally — it feeds
Tally via monthly export. The CA uses Tally for statutory
compliance (GST returns, TDS returns, balance sheet, ROC).

### Architecture Decision (Locked)
```
ERP Finance Module = OPERATIONAL accounting
  Real-time AR, AP, job costing, inventory valuation
  Management P&L (for running the business daily)
  Cash flow visibility
  GST working data

Tally (CA's tool) = STATUTORY accounting
  Final books of accounts
  Statutory P&L and Balance Sheet
  GST return filing (GSTR-1, GSTR-3B, Annual)
  TDS returns (Form 26Q)
  ROC filing, Income Tax
  
Minor differences between ERP P&L and Tally P&L
are normal and expected. CA reconciles quarterly.
```

### Users of This Module
- Factory Manager: Full access to all finance sub-modules
- CA (external): Receives monthly Tally export only
- Others: No access to finance module

### Key Outcomes
- Real-time accounts receivable ageing
- Real-time accounts payable with payment due dates
- Job-level P&L for every Work Order
- Cash flow visibility by week
- GST data compiled for CA's Tally filing
- Fixed asset register with depreciation
- Petty cash tracking with receipts

---

## 2. DATABASE SCHEMA

### 2.1 tenant_settings (NEW TABLE — Global Config)

```sql
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Company details
  company_name TEXT DEFAULT 'Canva Concepts',
  gstin TEXT CHECK (
    gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
  ),
  pan TEXT CHECK (
    pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'
  ),
  registered_address TEXT,
  factory_state TEXT DEFAULT 'Haryana',
  factory_state_code TEXT DEFAULT '06',
  -- Bank details (primary)
  bank_name TEXT,
  account_number TEXT,
  ifsc TEXT CHECK (
    ifsc IS NULL OR ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'
  ),
  upi_id TEXT,
  -- Financial year
  fy_start_month INTEGER DEFAULT 8,  -- August
  current_fy TEXT DEFAULT '2526',
  -- 3-way match tolerances (Chhabee Adoption 6)
  match_qty_tolerance_pct NUMERIC DEFAULT 2,
  match_rate_tolerance_pct NUMERIC DEFAULT 1,
  allow_over_receipt BOOLEAN DEFAULT false,
  grn_po_qty_tolerance_pct NUMERIC DEFAULT 10,
  -- Approval thresholds
  po_auto_approve_limit NUMERIC DEFAULT 10000,
  po_fm_approve_limit NUMERIC DEFAULT 50000,
  -- Petty cash
  petty_cash_float NUMERIC DEFAULT 5000,
  petty_cash_replenish_threshold NUMERIC DEFAULT 1000,
  petty_cash_self_approve_limit NUMERIC DEFAULT 500,
  -- Billing
  default_credit_days_chhabee INTEGER DEFAULT 30,
  default_credit_days_b2b INTEGER DEFAULT 30,
  default_credit_days_d2c INTEGER DEFAULT 0,
  -- Alerts
  overdue_alert_days INTEGER[] DEFAULT '{45,60,90}',
  low_cash_alert_threshold NUMERIC DEFAULT 100000,
  -- Signature
  authorised_signatory TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one row ever
ALTER TABLE public.tenant_settings
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM only on tenant_settings"
ON public.tenant_settings FOR ALL
USING (public.is_incoming_partner());
```

### 2.2 vendor_invoices (NEW TABLE — Accounts Payable)

```sql
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_invoice_number TEXT NOT NULL,
  grn_id UUID REFERENCES public.grns(id),
  po_id UUID REFERENCES public.purchase_orders(id),
  vendor_id UUID REFERENCES public.organisations(id)
    NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_gstin TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  -- Amounts
  subtotal NUMERIC NOT NULL DEFAULT 0,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  tds_deductible NUMERIC DEFAULT 0,
  net_payable NUMERIC GENERATED ALWAYS AS (
    total_amount - COALESCE(tds_deductible, 0)
  ) STORED,
  -- 3-way match (Chhabee Adoption 10)
  match_status TEXT DEFAULT 'pending' CHECK (match_status IN (
    'not_applicable',
    'pending',
    'matched',
    'partial',
    'disputed'
  )),
  match_notes TEXT,
  dispute_reason TEXT,
  disputed_at TIMESTAMPTZ,
  disputed_by UUID REFERENCES public.profiles(id),
  -- Payment
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid', 'partially_paid', 'paid', 'disputed'
  )),
  -- Document
  bill_document_url TEXT,
  -- Status
  status TEXT DEFAULT 'received' CHECK (status IN (
    'received',
    'matched',
    'approved_for_payment',
    'payment_initiated',
    'paid',
    'disputed',
    'cancelled'
  )),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX vi_vendor_idx ON public.vendor_invoices(vendor_id);
CREATE INDEX vi_status_idx ON public.vendor_invoices(status);
CREATE INDEX vi_due_date_idx ON public.vendor_invoices(due_date);

ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on vendor_invoices"
ON public.vendor_invoices FOR ALL
USING (public.is_incoming_partner());
```

### 2.3 vendor_payments (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  vendor_id UUID REFERENCES public.organisations(id)
    NOT NULL,
  vendor_invoice_id UUID REFERENCES
    public.vendor_invoices(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paid NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN (
    'neft', 'rtgs', 'upi', 'cheque', 'cash'
  )),
  utr_number TEXT,
  bank_reference TEXT,
  tds_deducted NUMERIC DEFAULT 0,
  tds_section TEXT,
  is_advance BOOLEAN DEFAULT false,
  notes TEXT,
  paid_by UUID REFERENCES public.profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on vendor_payments"
ON public.vendor_payments FOR ALL
USING (public.is_incoming_partner());
```

### 2.4 fixed_assets (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_name TEXT NOT NULL,
  asset_category TEXT NOT NULL CHECK (asset_category IN (
    'machinery',
    'furniture',
    'computer',
    'vehicle',
    'electrical',
    'other'
  )),
  purchase_date DATE NOT NULL,
  purchase_cost NUMERIC NOT NULL,
  useful_life_years INTEGER NOT NULL DEFAULT 10,
  depreciation_method TEXT DEFAULT 'straight_line'
    CHECK (depreciation_method IN (
      'straight_line', 'written_down_value'
    )),
  monthly_depreciation NUMERIC GENERATED ALWAYS AS
    (purchase_cost / useful_life_years / 12) STORED,
  accumulated_depreciation NUMERIC DEFAULT 0,
  net_book_value NUMERIC GENERATED ALWAYS AS
    (purchase_cost - accumulated_depreciation) STORED,
  -- Loan tracking (edge banding machine)
  is_on_loan BOOLEAN DEFAULT false,
  loan_amount NUMERIC,
  loan_monthly_emi NUMERIC,
  loan_principal_monthly NUMERIC,
  loan_interest_monthly NUMERIC,
  loan_start_date DATE,
  loan_end_date DATE,
  loan_outstanding NUMERIC,
  vendor_id UUID REFERENCES public.organisations(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  disposed_at TIMESTAMPTZ,
  disposal_value NUMERIC,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on fixed_assets"
ON public.fixed_assets FOR ALL
USING (public.is_incoming_partner());
```

### 2.5 petty_cash_transactions (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.petty_cash_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_number TEXT UNIQUE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'expense',      -- Money out
    'replenishment' -- Money in (top-up)
  )),
  expense_category TEXT CHECK (expense_category IN (
    'office_supplies',
    'staff_welfare',
    'factory_maintenance',
    'travel',
    'cleaning',
    'printing',
    'miscellaneous'
  )),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id),
  receipt_url TEXT,
  receipt_required BOOLEAN GENERATED ALWAYS AS
    (amount > 200) STORED,
  paid_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  requires_approval BOOLEAN GENERATED ALWAYS AS
    (amount > 500) STORED,
  balance_after NUMERIC,
  transaction_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.petty_cash_transactions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on petty_cash"
ON public.petty_cash_transactions FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can insert petty cash"
ON public.petty_cash_transactions FOR INSERT
WITH CHECK (
  public.get_current_user_role() IN (
    'supervisor', 'incoming_partner'
  )
);

CREATE POLICY "Supervisor can view petty cash"
ON public.petty_cash_transactions FOR SELECT
USING (public.get_current_user_role() = 'supervisor');
```

### 2.6 Add to numbering_counters

```sql
INSERT INTO public.numbering_counters
  (doc_type, fy, last_seq) VALUES
  ('PV', '2526', 0),   -- Payment Voucher
  ('VAD', '2526', 0)   -- Vendor Advance
ON CONFLICT (doc_type, fy) DO NOTHING;
-- EXP already added in PRD-00 seed
```

---

## 3. SEED DATA — FIXED ASSETS

Pre-load from current factory state:

```sql
INSERT INTO public.fixed_assets
  (asset_name, asset_category, purchase_date,
   purchase_cost, useful_life_years,
   is_on_loan, loan_amount, loan_monthly_emi,
   loan_principal_monthly, loan_interest_monthly,
   loan_start_date) VALUES

-- Existing machinery (₹30L transferred via BTA)
('Panel Saw', 'machinery',
 '2023-01-01', 500000, 10,
 false, null, null, null, null, null),

('Multi Boring Machine', 'machinery',
 '2023-01-01', 350000, 10,
 false, null, null, null, null, null),

('Router Boring Machine', 'machinery',
 '2023-01-01', 280000, 10,
 false, null, null, null, null, null),

('Pressing Machine', 'machinery',
 '2023-01-01', 220000, 10,
 false, null, null, null, null, null),

-- Edge Banding Machine (new — on loan)
-- Monthly depreciation: ₹15L ÷ 10yr ÷ 12 = ₹12,500
-- Total machinery depreciation: (30L+15L) ÷ 10 ÷ 12 = ₹37,500/month
('Automatic Edge Banding Machine', 'machinery',
 '2026-08-01', 1500000, 10,
 true, 1500000, 50000, 30000, 20000,
 '2026-08-01');
```

---

## 4. SCREENS & FLOWS

### 4.1 Finance Dashboard (/finance)

Access: FM only

```
Page title: "Finance"

SUMMARY ROW (key numbers):
  Cash & Bank Balance: ₹[total] — blue
  Receivables Outstanding: ₹[total] — amber
  Payables Due This Week: ₹[total] — red
  MTD Revenue (billed): ₹[total] — green

TABS:
  Tab 1: Accounts Receivable
  Tab 2: Accounts Payable
  Tab 3: Job Costing
  Tab 4: Cash & Bank
  Tab 5: GST Summary
  Tab 6: Fixed Assets
  Tab 7: Petty Cash
  Tab 8: Tally Export
```

---

### 4.2 Accounts Receivable Tab

```
RECEIVABLE AGEING (key view):

  ┌──────────────────────────────────────────────────────┐
  │ RECEIVABLE AGEING SUMMARY                           │
  │                                                      │
  │ 0-30 days:   ₹2,45,000  ████████░░░░  (67%)        │
  │ 31-60 days:  ₹80,000    ███░░░░░░░░░  (22%)        │
  │ 61-90 days:  ₹40,000    █░░░░░░░░░░░  (11%)  ⚠️   │
  │ 90+ days:    ₹0         ░░░░░░░░░░░░  (0%)   ✓    │
  │                                                      │
  │ TOTAL OUTSTANDING: ₹3,65,000                        │
  └──────────────────────────────────────────────────────┘

INVOICE LIST:
  Filter: Status / Client / Due Date / Amount range

  TABLE COLUMNS:
    Invoice No | Client | WO | Invoice Date |
    Due Date | Total | Paid | Outstanding |
    Days Overdue | Status | Actions

  Colour coding:
    Green:  0-30 days overdue
    Amber:  31-60 days overdue
    Red:    60+ days overdue

  ACTIONS per invoice:
    [Record Payment]
    [Send Reminder] (manual trigger)
    [View Invoice]
    [Issue Credit Note]

AUTO-REMINDERS STATUS:
  Show which automatic reminders have been sent
  Show next reminder scheduled date
  [Suppress Reminder] button with reason
```

---

### 4.3 Accounts Payable Tab

```
PAYABLE SUMMARY:

  Due This Week:    ₹[X]  — red (action needed)
  Due Next Week:    ₹[X]  — amber
  Due Later:        ₹[X]  — grey
  Disputed:         ₹[X]  — red

VENDOR INVOICE LIST:
  Filter: Status / Vendor / Due Date / Match Status

  TABLE COLUMNS:
    Vendor Invoice No | Vendor | GRN Ref |
    Invoice Date | Due Date | Amount |
    Match Status | Payment Status | Actions

  MATCH STATUS badges:
    Matched ✓ → green
    Pending   → amber
    Disputed  → red

  ACTIONS:
    [Approve for Payment] (if matched)
    [Record Dispute] (if mismatch)
    [Record Payment]
    [View Invoice]

PAYMENT DUE ALERTS:
  System shows vendors with payment due in 3 days
  FM can initiate NEFT/RTGS from bank directly
  Record payment in ERP after bank transfer
```

---

### 4.4 Three-Way Match Process

Auto-triggered when vendor invoice is uploaded.

```
MATCHING LOGIC:
  Compare: PO rate × PO qty vs GRN qty vs Bill amount

  TOLERANCES (from tenant_settings):
    Qty tolerance: 2% (configurable)
    Rate tolerance: 1% (configurable)

  OUTCOME A — MATCHED:
    All within tolerance
    vendor_invoices.match_status = 'matched'
    Vendor invoice auto-approved for payment
    FM notified: "Invoice from [vendor] matched ✓"

  OUTCOME B — QTY MISMATCH:
    GRN qty differs from bill qty beyond tolerance
    Action: Pay for GRN qty only
    Raise Debit Note for shortfall
    vendor_invoices.match_status = 'partial'
    FM alerted

  OUTCOME C — RATE MISMATCH:
    Bill rate differs from PO rate beyond 1%
    vendor_invoices.match_status = 'disputed'
    Payment HELD
    FM alerted: "Rate mismatch on [vendor] invoice.
      PO rate: ₹X | Bill rate: ₹Y"
    FM resolves: Accept or dispute with vendor

  OUTCOME D — GST MISMATCH:
    Bill GST doesn't match expected (wrong GSTIN,
    wrong rate, wrong inter-state determination)
    Flag to CA for review
    Payment held until resolved

DISPUTE RESOLUTION:
  FM records: dispute_reason, action taken
  Options:
    Request revised bill from vendor
    Accept at PO rate (vendor to adjust)
    Pay disputed amount separately after resolution
```

---

### 4.5 Job Costing Tab

```
Shows P&L per Work Order.
Three cost columns always visible.

FILTER: WO Number / Client / Stream / Date Range / Status

TABLE COLUMNS:
  WO Number | Client | Stream |
  Revenue | Mat Cost | Labour | OH |
  Total Cost | Gross Margin | Margin % | Status

Colour coding by margin:
  > 25%: green
  15-25%: amber
  < 15%: red
  < 0%: dark red (loss)

CLICK on any WO → WO Job Costing Detail:

  WO-CHH-26-001 — RECEPTION COUNTER
  ─────────────────────────────────────────────────
                    ESTIMATED  COMMITTED   ACTUAL
  Revenue:          ₹42,000    ₹42,000    ₹42,000
  ─────────────────────────────────────────────────
  Plywood:          ₹25,900    ₹25,900    ₹24,050
  Laminate:          ₹2,992     ₹2,992     ₹2,816
  Hardware:          ₹4,200     ₹4,390     ₹4,390
  Labour:            ₹3,200     ₹3,200     ₹3,560
  Overhead:          ₹2,100     ₹2,100     ₹2,100
  ─────────────────────────────────────────────────
  Total Cost:       ₹38,392    ₹38,582    ₹36,916
  Gross Margin:      ₹3,608     ₹3,418     ₹5,084
  Margin %:            8.6%       8.1%      12.1%
  ─────────────────────────────────────────────────
  VARIANCES (Actual vs Estimated):
    Plywood:  -₹1,850 (saving — leftover returned)
    Hardware: +₹190 (overrun)
    Labour:   +₹360 (0.5 day extra)
    NET:      -₹1,476 (saving — better than plan)
  ─────────────────────────────────────────────────
  Collection: Invoice date 21-Aug | Paid 19-Sep
  Days to collect: 29 days ✓ (within Net 30)

VARIANCE ALERT FLAG:
  If actual > estimated by > 10%:
    FM notified: "Cost overrun on WO [number]"
    Shown in red on job costing tab
```

---

### 4.6 Cash & Bank Tab

```
BANK BALANCE (manual entry or CSV reconciliation):
  Current Balance: ₹[X]
  Last Updated: [date]
  [Update Balance] button (FM enters manually)
  OR [Upload Bank Statement CSV] for auto-match

CASH FLOW (weekly view):
  ┌──────────────────────────────────────────────────┐
  │ WEEK 1 (1-7 Aug)                                 │
  │ Opening:   ₹3,45,000                            │
  │ Inflows:   +₹1,14,000 (payments received)       │
  │ Outflows:  -₹85,000   (vendor payments, salary) │
  │ Closing:   ₹3,74,000                            │
  │                                                  │
  │ WEEK 2 (8-14 Aug)                               │
  │ Opening:   ₹3,74,000                            │
  │ Expected:  +₹42,000 (invoice INV-CHH-26-001)    │
  │ Expected:  -₹1,25,000 (PO-26-003 due)          │
  │ Forecast:  ₹2,91,000                            │
  └──────────────────────────────────────────────────┘

LOW CASH ALERT:
  If balance < ₹1,00,000 (configurable):
    FM alerted: "Cash balance below ₹1L. Review."

BANK RECONCILIATION (CSV upload):
  FM uploads bank statement CSV from bank portal
  System auto-matches transactions:
    Payments received → match to payment_receipts
    Vendor payments → match to vendor_payments
    Salary → match to payroll entries
  Unmatched: highlighted for FM review
```

---

### 4.7 GST Summary Tab

```
Shows compiled GST data for CA's Tally filing.
Not a GST filing system — just data compilation.

OUTWARD SUPPLIES (GSTR-1 data):
  Month selector: [August 2026 ▼]
  
  B2B Sales (client has GSTIN):
    Invoice No | Client GSTIN | Taxable | CGST | SGST | IGST
  
  B2C Sales (client no GSTIN):
    Total taxable | Total GST

  Advance Receipts:
    ADV-RCP No | Client | Amount | GST on Advance

  Credit Notes:
    CN No | Against Invoice | Amount | GST reversed

  TOTAL OUTPUT TAX: ₹[X]

INWARD SUPPLIES (GSTR-2B comparison):
  Vendor bills received this month
  GSTIN | Invoice No | Taxable | GST paid
  Input Tax Credit claimable: ₹[X]

NET GST PAYABLE:
  Output Tax: ₹X
  Input Credit: -₹X
  NET PAYABLE TO GOVT: ₹X
  (This is compiled data — CA files return in Tally)

GST PAYMENT DUE DATES:
  GSTR-1: 11th of next month
  GSTR-3B: 20th of next month
  System alerts FM 3 days before:
    "GSTR-1 due in 3 days. Send data to CA."
```

---

### 4.8 Fixed Assets Tab

```
TABLE:
  Asset Name | Category | Purchase Date |
  Cost | Monthly Dep. | Accumulated Dep. |
  Net Book Value | Loan (if any)

DEPRECIATION TRACKER:
  Total monthly depreciation: ₹37,500
  (₹30L existing + ₹15L edge banding ÷ 10yr ÷ 12)
  Auto-posted monthly on 1st

LOAN TRACKER (Edge Banding Machine):
  Loan Amount: ₹15,00,000
  Monthly EMI: ₹50,000
  Principal per month: ₹30,000
  Interest per month: ₹20,000
  Outstanding: ₹[auto-calculated]

  REMINDER: EMI due on [day] each month
  FM records payment in bank after paying

[Add Asset] button (FM only):
  Asset details + whether on loan
  Purchase date + cost
  Useful life
  Vendor (linked from Vendor Master)
```

---

### 4.9 Petty Cash Tab

```
CURRENT BALANCE:
  Float: ₹5,000 (or FM-configured amount)
  Spent this month: ₹[X]
  Current balance: ₹[Y]
  
  If balance < ₹1,000 (replenish threshold):
    "Petty cash low. Request replenishment."
    [Request Replenishment] button

ADD EXPENSE:
  Category * (dropdown — 7 categories)
  Description * (TEXT)
  Amount * (NUMERIC)
    If > ₹500: "Requires FM approval"
    If > ₹2,000: BLOCKED
      "Cannot process cash > ₹2,000.
       Use PO or expense reimbursement."
  WO Reference (optional)
  Receipt (upload, mandatory if > ₹200)
  Paid By: [Supervisor / R&D Staff]

  If amount > ₹500:
    Submit for FM approval
    FM receives in-app notification
    On approval: balance deducted

MONTHLY PETTY CASH REPORT:
  Total spent by category (bar chart)
  Receipts: [X] with receipt | [Y] without
  Entries without receipt flagged in red
  FM reviews and signs off monthly

EXPENSES LIST:
  EXP No | Date | Category | Description |
  Amount | WO | Receipt | Paid By | Status
```

---

### 4.10 Tally Export Tab

```
Route: /finance/tally-export
Access: FM only

PERIOD SELECTOR:
  Month: [August 2026 ▼]
  (Default: previous month)

EXPORT CHECKLIST (FM confirms before export):
  ☐ All invoices for this month sent to clients
  ☐ All payments recorded
  ☐ All vendor bills uploaded and matched
  ☐ Petty cash reconciled
  ☐ Bank statement uploaded and reconciled

[Generate Export] button

EXPORT INCLUDES:
  Sheet 1: Sales Invoices (from PRD-12)
  Sheet 2: Credit Notes
  Sheet 3: Debit Notes
  Sheet 4: Payment Receipts
  Sheet 5: Advance Receipts
  Sheet 6: Vendor Invoices (bills received)
  Sheet 7: Vendor Payments made
  Sheet 8: Salary & Payroll (from PRD-14)
  Sheet 9: Petty Cash Expenses
  Sheet 10: Fixed Asset Additions (if any)

FORMAT:
  Excel (.xlsx)
  Each sheet has standard column headers
  Amounts in INR (no currency symbol)
  Dates in DD-MM-YYYY format (Tally format)
  GST broken into CGST/SGST/IGST columns

[Download Export] button
Export log maintained (who exported, when, period)

WHAT CA DOES WITH THIS:
  Imports each sheet into respective Tally ledger
  Passes month-end closing entries
  Prepares GST returns (GSTR-1, GSTR-3B)
  Files TDS returns (Form 26Q)
  Prepares financial statements
  CA reconciles ERP management P&L vs Tally P&L
  Minor differences are normal (timing, provisions)
```

---

## 5. BUSINESS RULES

```
BR-01: Finance module is FM-only. No Supervisor
       access to any finance sub-module.
       Exception: Supervisor can submit petty cash
       expenses up to ₹500 (self-approve limit).

BR-02: Three-way match tolerances from tenant_settings:
       2% qty tolerance, 1% rate tolerance.
       Configurable by FM. Change logged in audit.

BR-03: Vendor payment only after invoice is
       matched (match_status = 'matched') OR
       FM explicitly approves disputed invoice.
       Never pay unmatched invoices automatically.

BR-04: Job costing locks permanently when WO reaches
       financially_closed status.
       No changes to actual costs after closure.

BR-05: Fixed asset depreciation:
       Existing machinery: ₹30L ÷ 10yr ÷ 12 = ₹25,000/month
       Edge banding (loan): ₹15L ÷ 10yr ÷ 12 = ₹12,500/month
       Total monthly depreciation: ₹37,500
       Posted on 1st of each month (auto-alert to FM)

BR-06: Loan EMI (edge banding machine):
       Total EMI: ₹50,000/month
       Principal: ₹30,000 (balance sheet only)
       Interest: ₹20,000 (P&L expense)
       FM records bank payment, system updates balance.

BR-07: Petty cash limit: ₹2,000 maximum per transaction.
       Above ₹2,000: must go through PO process.
       No exceptions.

BR-08: Cash expense > ₹200: receipt mandatory.
       Cash expense > ₹500: FM approval mandatory.
       Both rules enforced at system level.

BR-09: GST filing is CA's responsibility in Tally.
       ERP only compiles data. Does not file returns.
       Tally export sent to CA by 5th of each month.

BR-10: 3-way match dispute must be resolved before
       payment can be made to that vendor.
       Disputed invoices cannot be paid without FM
       override and documented reason.

BR-11: Bank reconciliation monthly (CSV upload).
       Unreconciled items flagged after 7 days.
       FM must clear all unreconciled before Tally export.

BR-12: Variance alert: if WO actual cost > estimated
       by > 10%, FM gets immediate notification.
       Shown in job costing with red flag.

BR-13: Low cash alert threshold: ₹1,00,000 (configurable).
       System alerts FM when balance drops below threshold.

BR-14: GST due date alerts:
       GSTR-1: 3 days before 11th
       GSTR-3B: 3 days before 20th
       Annual: 1 month before due
```

---

## 6. NOTIFICATIONS & ALERTS

```
Vendor Invoice Matched:
  → FM: "Invoice from [vendor] ₹X matched ✓
    Approved for payment."

Vendor Invoice Disputed:
  → FM: "Rate/qty mismatch on [vendor] invoice.
    Payment held. Review needed."

Payment Due This Week:
  → FM (Monday morning): "Vendor payments due:
    [vendor 1]: ₹X due [date]
    [vendor 2]: ₹Y due [date]"

Job Cost Variance > 10%:
  → FM: "Cost overrun on WO [number]:
    Actual ₹X vs estimated ₹Y (+Z%)"

WO Financially Closed:
  → FM: "WO [number] financially closed.
    Final margin: X%"

Cash Balance Low:
  → FM: "Bank balance ₹X below threshold.
    Expected inflows: ₹Y this week."

GST Filing Reminder:
  → FM: "GSTR-1 due in 3 days.
    Prepare and send data to CA."

Tally Export Due:
  → FM: "Monthly Tally export due by 5th.
    Generate and send to CA."

Fixed Asset Depreciation:
  → FM (1st of month): "Monthly depreciation
    posted: ₹37,500 for [month]"

Loan EMI Reminder:
  → FM: "Edge banding EMI of ₹50,000 due
    on [date]. Please transfer."

Petty Cash Low:
  → FM + Supervisor: "Petty cash balance ₹X.
    Below ₹1,000 threshold. Replenish."

Petty Cash Expense > ₹500 Pending:
  → FM: "Petty cash approval needed:
    ₹[amount] for [description]"
```

---

## 7. TESTING CHECKLIST

**Accounts Receivable:**
[ ] Ageing buckets calculate correctly (0-30, 31-60, 61-90, 90+)
[ ] Overdue invoices highlighted in red
[ ] Record payment updates outstanding correctly
[ ] Reminder log shows what was sent and when
[ ] Suppress reminder requires reason

**Accounts Payable:**
[ ] Vendor invoice 3-way match works
[ ] Within tolerance: auto-matched
[ ] Beyond tolerance: disputed, payment held
[ ] Dispute resolution flow works
[ ] Payment recorded reduces outstanding

**Job Costing:**
[ ] 3 columns (Estimated/Committed/Actual) populate correctly
[ ] Estimated from BOM, Committed from PO, Actual from GRN
[ ] Variance calculated correctly
[ ] WO financially closed → job costing locked
[ ] Variance > 10% triggers FM alert

**Fixed Assets:**
[ ] All 5 assets seeded correctly
[ ] Monthly depreciation = ₹37,500 total
[ ] Edge banding loan tracked correctly
[ ] EMI split: ₹30K principal + ₹20K interest

**Petty Cash:**
[ ] Self-approve for Supervisor ≤ ₹500
[ ] FM approval required > ₹500
[ ] BLOCKED above ₹2,000
[ ] Receipt mandatory > ₹200
[ ] Monthly report shows correct totals

**GST Summary:**
[ ] Outward supplies compiled correctly
[ ] Credit notes reduce output tax
[ ] Net GST payable calculated
[ ] Filing reminder alerts fire correctly

**Tally Export:**
[ ] All 10 sheets generated
[ ] Correct date format (DD-MM-YYYY)
[ ] No currency symbols
[ ] GST split into columns
[ ] Export log records FM + timestamp

---

## 8. INTEGRATION POINTS

```
PRD-06: Vendor invoices matched against POs + GRNs
         3-way match uses PO rates and GRN quantities
         Vendor payments reference purchase_orders

PRD-08: GRN approvals create accounts payable entries
         Inventory valuation (total_qty × lot_rate)

PRD-09: Labour hours × rate = job costing labour
         Contractor labour through accounts payable

PRD-10: OT actual hours feed payroll (PRD-14)
         OT cost allocated to WO labour cost

PRD-11: Complaint resolution credit notes in AR
         QC failure rework costs in job costing

PRD-12: Sales invoices = accounts receivable
         Payment receipts update AR
         TDS ledger populated from both sides

PRD-14: Payroll entries included in Tally export
         Salary allocation to overhead or WO

PRD-15: Job costing feeds WO P&L in MIS
         AR ageing in MIS client profitability
         AP ageing in MIS cash flow
         Fixed asset register for balance sheet
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-06, PRD-08, PRD-12*
*Key decisions: ERP = Management P&L, Tally = Statutory*
*Chhabee Adoptions: Match tolerances (6), Dispute flow (10)*
*Locked financials: Depreciation ₹37,500/month,*
*Edge banding EMI ₹50,000/month (₹30K principal + ₹20K interest)*
*Next document: PRD-14 Payroll & Attendance*
