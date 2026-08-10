# PRD-15: MIS & REPORTING
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
The MIS (Management Information System) module is the
intelligence layer of the ERP. It reads data from all
other modules and presents it as actionable insights.
No data is entered here — everything flows automatically
from operations. This module helps the Factory Manager
make decisions: which clients are most profitable, which
furniture types have the best margins, where costs are
running above budget, and whether the factory is on track
vs the Annual Operating Plan.

### Architecture Decision (Locked)
MIS/Reporting is a SEPARATE module from Billing.
It is READ-ONLY — no data entry here.
All data flows automatically from:
  Work Orders, BOM, GRN, Job Cards, Invoices,
  Payments, Payroll, Inventory, QC records

ERP P&L shown here = MANAGEMENT P&L
Statutory P&L is in Tally (prepared by CA)

### Users of This Module
- Factory Manager: Full access to all 8 MIS modules
- Super Admin: Revenue and collections view only
  (no cost, no margin data)
- Factory Supervisor: Production reports only
  (no financial data)
- Others: No access

### Key Outcomes
- Project-level P&L for every Work Order
- Client profitability with true margin (after cost of credit)
- Furniture type performance analysis
- Material cost variance vs BOM
- Monthly P&L matching AOP structure exactly
- 6 critical profitability drivers with targets
- Stream-wise P&L (Chhabee/B2B/D2C)
- AOP vs Actual tracker with variance flags

---

## 2. NO NEW TABLES NEEDED

MIS reads from existing tables:
```
work_orders, wo_boms, wo_bom_items
sales_invoices, payment_receipts
vendor_invoices, vendor_payments
job_cards, job_card_assignments, eod_updates
attendance, monthly_payroll
inventory, inventory_movements, grns
qc_records, customer_complaints
purchase_orders, purchase_order_items
```

All MIS queries use these tables directly.
No separate MIS tables needed.

---

## 3. MIS MODULE 1 — PROJECT-LEVEL P&L (PER WORK ORDER)

### Purpose
Complete P&L for every Work Order from quotation to
financial closure. The most granular view available.

### Access
FM: full view including costs and margins
Supervisor: production metrics only (no financials)
Site Manager: their own WOs — status only, no financials

### Screen: /mis/work-order-pl

```
FILTER BAR:
  WO Number search | Client | Stream |
  Date range | Status | Margin range

TABLE VIEW (summary):
  WO No | Client | Furniture | Revenue |
  Mat Cost | Labour | OH | Total Cost |
  Gross Margin | Margin % | Days to Collect | Status

Colour by margin%:
  > 25%: green | 15-25%: amber | < 15%: red

CLICK WO → DETAIL VIEW:

┌─────────────────────────────────────────────────────┐
│ WO-CHH-26-001 | Reception Counter | Starbucks Noida │
│ Client: Chhabee | Stream: Chhabee | Aug 2026        │
│ Status: Financially Closed                          │
├─────────────────────────────────────────────────────┤
│ REVENUE                                             │
│   Quoted Value (ex-GST):          ₹42,000           │
│   Billed Value (ex-GST):          ₹42,000           │
│   Credit Notes issued:                 ₹0           │
│   Net Revenue:                    ₹42,000           │
├─────────────────────────────────────────────────────┤
│ DIRECT COSTS          ESTIMATED  COMMITTED  ACTUAL  │
│   Plywood:             ₹25,900   ₹25,900  ₹24,050  │
│   Laminate:             ₹2,992    ₹2,992   ₹2,816  │
│   Hardware:             ₹4,200    ₹4,390   ₹4,390  │
│   Labour:               ₹3,200    ₹3,200   ₹3,560  │
│   Overhead alloc:       ₹2,100    ₹2,100   ₹2,100  │
│   Delivery:                 ₹0        ₹0       ₹0  │
│   ─────────────────────────────────────────────     │
│   Total Direct:        ₹38,392   ₹38,582  ₹36,916  │
├─────────────────────────────────────────────────────┤
│ GROSS MARGIN:           ₹3,608    ₹3,418   ₹5,084  │
│ MARGIN %:                 8.6%      8.1%     12.1%  │
├─────────────────────────────────────────────────────┤
│ VARIANCES (Actual vs Estimated):                    │
│   Plywood:      -₹1,850 ✓ SAVING                   │
│   Hardware:       +₹190 ⚠ OVERRUN                  │
│   Labour:         +₹360 ⚠ OVERRUN                  │
│   Net variance: -₹1,476 ✓ NET SAVING               │
├─────────────────────────────────────────────────────┤
│ COLLECTION PERFORMANCE:                             │
│   Invoice Date: 21-Aug-26                          │
│   Payment Received: 19-Sep-26                      │
│   Days to Collect: 29 days ✓ (within Net 30)       │
│   TDS Deducted: ₹0                                 │
├─────────────────────────────────────────────────────┤
│ QC PERFORMANCE:                                     │
│   First-time Pass: Yes ✓                           │
│   Rework required: No                              │
└─────────────────────────────────────────────────────┘
```

---

## 4. MIS MODULE 2 — CLIENT PROFITABILITY

### Purpose
Rolling 12-month profitability per client. Identifies
which clients generate the best margins and which have
slow payment that erodes real profit.

### Screen: /mis/client-profitability

```
ROLLING 12-MONTH VIEW:

TABLE:
  Client | WOs | Revenue | Total Cost |
  Gross Margin | Margin% | Avg Days Collect |
  True Margin% | Trend

TRUE MARGIN CALCULATION:
  Cost of credit = overdue days × (12% annual cost ÷ 365)
  True Margin = Gross Margin - Cost of Credit
  
  Example:
    Client pays in 60 days on Net 30 terms
    = 30 days overdue
    On ₹1,00,000 invoice:
    Cost of credit = ₹1,00,000 × 12% ÷ 365 × 30 = ₹986
    If gross margin was ₹15,000 (15%):
    True margin = ₹15,000 - ₹986 = ₹14,014 (14%)

SYSTEM AUTO-FLAGS:
  🔴 Clients below 10% true margin
  ⚠️ Clients with > 45 days average collection
  ↓  Worsening margin trend (3-month rolling)
  ↑  Improving margin trend

CLIENT DRILL-DOWN (click any client):
  All WOs for this client (last 12 months)
  Revenue trend (month by month bar chart)
  Margin trend (line chart)
  Collection history (paid on time vs late)
  Outstanding invoices
  Total advance adjusted

  INSIGHT PANEL:
    "Blue Tokai generates 25.6% margin vs factory
     average of 14.2%. Prioritise this client."
    
    "WeWork: 12.2% margin + 52-day average collection
     = 10.4% true margin. Below target. Consider
     revised payment terms or pricing."
```

---

## 5. MIS MODULE 3 — FURNITURE TYPE PROFITABILITY

### Purpose
Which furniture categories deliver the best margins
and lowest rework rates.

### Screen: /mis/furniture-profitability

```
MINIMUM 3 WOs required before category appears.

TABLE:
  Furniture Type | WO Count | Avg Revenue |
  Avg Cost | Avg Margin | Avg Margin% |
  Rework Rate | Avg Production Days

Sorted by: Margin% descending (best first)

EXAMPLE:
  Storage Unit   | 4  | ₹18,000 | ₹14,200 | 21.1% | 0%   | 3 days
  Back Counter   | 8  | ₹38,000 | ₹31,200 | 17.9% | 0%   | 5 days
  Reception Cntr | 12 | ₹42,000 | ₹35,900 | 14.5% | 8%   | 7 days
  Workstation    | 6  | ₹28,000 | ₹25,100 | 10.4% | 33%  | 6 days
  Hospital Fitout| 2  | ₹85,000 | ₹74,800 | 12.0% | 50%  | 12 days

AUTO-FLAGS:
  ⚠️ Workstation: Lowest margin (10.4%) +
     highest rework rate (33%). Review BOM.
  
  ✓  Storage Unit: Best margin (21.1%) + zero rework.
     Most efficient product type.

DRILL-DOWN:
  All WOs for selected furniture type
  Material cost breakdown (which materials vary most)
  Rework reasons (from QC failure notes)
  Production time variance (est vs actual)
```

---

## 6. MIS MODULE 4 — MATERIAL COST VARIANCE

### Purpose
Why does material cost vary for the same furniture type
across different WOs? Identifies BOM inaccuracies and
procurement rate changes.

### Screen: /mis/material-variance

```
SELECT: Furniture Type + Date Range

VARIANCE TABLE:
  Shows same furniture type across multiple WOs

  Material     |BOM Est| WO-001 | WO-007 | WO-014 | Avg Dev
  ─────────────────────────────────────────────────────────
  Plywood (sh) |  14   |   14   |   14   |   16   | +14%  ⚠️
  Laminate(sqft)|  68   |   64   |   68   |   72   |  +3%  ✓
  Hardware (₹) | 4,200 | 4,390  | 4,100  | 4,850  |  +5%  ✓

AUTO-ANALYSIS:
  "WO-014 (WeWork): Plywood 16 sheets vs BOM 14.
   Root cause: [click to expand]
   → Damage during cutting (logged in inventory)
   Action: Add 1 sheet buffer to Counter BOM template"

RATE VARIANCE:
  Shows purchase rate trend for each material:
  18mm Plywood:
    Apr: ₹1,850/sheet
    May: ₹1,900/sheet (+2.7%)
    Jun: ₹1,950/sheet (+2.6%)
    "Rate increased 5.4% over 3 months.
     Standard rate (₹1,850) is now below market.
     Consider updating Material Master."

FILTERS:
  Material category | Vendor | Date range | WO range
```

---

## 7. MIS MODULE 5 — MONTHLY & ANNUAL P&L

### Purpose
Management P&L mirroring the AOP structure exactly.
Same line items, same grouping — easy AOP comparison.

### Screen: /mis/pl-report

```
MONTH/YEAR SELECTOR:
  [August 2026 ▼] | [FY 2026-27]

P&L STRUCTURE (mirrors AOP exactly):

REVENUE (Ex-GST)
─────────────────────────────────────────────────
Chhabee Revenue:                        ₹17,49,000
External B2B Revenue:                           ₹0
D2C Revenue:                                    ₹0
TOTAL REVENUE:                          ₹17,49,000
─────────────────────────────────────────────────

DIRECT COSTS
  Chhabee stream:
    Plywood:                            ₹8,00,000
    Laminate:                           ₹5,50,000
    Hardware:                           ₹2,50,000
    Labour (Chhabee share):             ₹1,20,000
    Semi-variable OH (Chhabee share):      ₹84,000
    Delivery (pass-through):                    ₹0
  ───────────────────────────────────────────────
  Total Chhabee Direct Cost:           ₹18,04,000

CONTRIBUTION MARGIN 1 (CM1):             -₹55,000
CM1 %:                                     -3.1%

UNALLOCATED FIXED COSTS:
  Manager salary:                       ₹1,00,000
  Factory rent:                         ₹1,50,000
  New staff (Guard/Helper/R&D):                ₹0
  Drawings resource:                           ₹0
  Total Unallocated Fixed:              ₹2,50,000

CONTRIBUTION MARGIN 2 (CM2):           -₹3,05,000

MARKETING & GROWTH:
  B2B Collateral:                          ₹20,000
  D2C Marketing:                               ₹0
  Total Marketing:                         ₹20,000

EBITDA:                                 -₹3,25,000

Depreciation:                              ₹37,500
Interest (loan):                           ₹20,000

EBIT:                                   -₹3,82,500
EBT:                                    -₹3,82,500
Tax (only if positive EBT):                      ₹0
PAT:                                    -₹3,82,500

─────────────────────────────────────────────────
Note: Month 1 (ramp-up) loss is expected per AOP.
AOP projected Month 1 PAT: -₹2,44,000
Actual Month 1 PAT: -₹3,82,500
Variance: -₹1,38,500 (higher loss than plan)
─────────────────────────────────────────────────

ANNUAL YTD (FY 2026-27):
  Revenue YTD:         ₹17,49,000
  AOP Revenue YTD:     ₹20,00,000
  PAT YTD:            -₹3,82,500
  AOP PAT YTD:        -₹2,44,000

TABS:
  Monthly | Quarterly | Annual (full year projection)
```

---

## 8. MIS MODULE 6 — CRITICAL PROFITABILITY DRIVERS

### Purpose
Six key metrics that determine factory profitability.
Each has a target from AOP and shows actual vs target
with trend direction.

### Screen: /mis/profitability-drivers

```
DRIVER 1 — MATERIAL COST AS % OF REVENUE
  Target (from AOP):    55.8% of revenue
  Current month actual: 57.2%
  Trend: ↑ WORSENING
  
  Breakdown:
    Plywood:   28.4% (target: 27.1%) ⚠️ +1.3%
    Laminate:  20.1% (target: 19.8%) ✓
    Hardware:   8.7% (target: 8.9%)  ✓

  Root cause insight:
    "Plywood rate increased ₹1,850 → ₹1,950/sheet.
     Standard rate not updated. Update Material Master."

─────────────────────────────────────────────────────

DRIVER 2 — LABOUR EFFICIENCY (sqft per carpenter-day)
  Target (AOP):    27.1 sqft per carpenter per day
  Actual (30 days): 24.3 sqft per carpenter per day
  Trend: ↓ BELOW TARGET
  
  Gap: 2.8 sqft per carpenter per day
  Monthly impact: 2.8 × 18 carpenters × 26 days
                = 1,310 sqft lost
  Revenue impact: 1,310 × ₹1,200 = ₹15,72,000 lost

  Root cause:
    3 carpenters pulled to site (12 days)
    → Lost: 3 × 12 × 9 hrs = 324 productive hours

─────────────────────────────────────────────────────

DRIVER 3 — REWORK RATE
  Target:  < 5% of WOs
  Actual:  12.5% (3 of 24 WOs this quarter)
  Trend: ⚠️ ABOVE TARGET
  
  Cost of rework: ₹4,200 this quarter
  Most common reason: Edge banding gaps (2 of 3)
  
  Recommendation:
    "Edge banding issues — check machine calibration
     and operator training."

─────────────────────────────────────────────────────

DRIVER 4 — COLLECTION EFFICIENCY
  Target:  30 days average
  Actual:  34 days average
  Trend: ↑ SLIGHTLY ABOVE TARGET
  
  By client:
    Chhabee:    28 days ✓
    WeWork:     52 days ⚠️ (30 days overdue)
    Blue Tokai: 35 days ✓
  
  Cash tied in receivables: ₹8,40,000
  Estimated cost of credit: ₹11,200/month

─────────────────────────────────────────────────────

DRIVER 5 — BOM ACCURACY
  Target:  < 5% of WOs where actual > BOM by > 10%
  Actual:  12.5% (3 of 24 WOs)
  Trend: ⚠️ ABOVE TARGET
  
  WOs with overrun > 10%:
    WO-CHH-26-014: +14% (plywood damage)
    WO-B2B-26-003: +11% (dimension revision)
    WO-CHH-26-019: +12% (hardware spec change)
  
  Template BOMs needing revision:
    Counter BOM: add 1 sheet plywood buffer
    Workstation BOM: hardware rate outdated

─────────────────────────────────────────────────────

DRIVER 6 — REVENUE PER CARPENTER-DAY
  Target: ₹1,200 × 27.1 sqft = ₹32,520/carpenter/day
  Actual: ₹28,900/carpenter/day
  Gap: -₹3,620/carpenter/day
  
  Monthly impact:
    ₹3,620 × 18 × 26 = ₹16,93,760/month
    "Factory running at 88.9% of target capacity"
  
  Reasons: Ramp-up period + site deployments

─────────────────────────────────────────────────────

EACH DRIVER SHOWS:
  Current value | Target | Gap | Trend arrow
  Root cause analysis (clickable)
  Recommended action
  Month-over-month sparkline chart
```

---

## 9. MIS MODULE 7 — STREAM-WISE P&L

### Purpose
Monthly breakdown of revenue and margin by stream:
Chhabee, External B2B, D2C.

### Screen: /mis/stream-pl

```
MONTH SELECTOR

STREAM COMPARISON TABLE:
             CHHABEE   EXTERNAL B2B   D2C      TOTAL
Revenue:     ₹17.49L      ₹0          ₹0     ₹17.49L
Direct Cost: ₹18.04L      ₹0          ₹0     ₹18.04L
Stream CM:   -₹0.55L      -           -      -₹0.55L
Margin %:      -3.1%       -           -        -3.1%

Note: Fixed costs not allocated to streams.
      CM shown at stream level, fixed costs at total.

12-MONTH TREND (line chart, 3 lines):
  Chhabee CM%
  B2B CM%
  D2C CM%

INSIGHTS:
  "Chhabee CM is negative in Month 1 because low
   volume doesn't cover semi-variable costs.
   Expected to turn positive from Month 3 per AOP."
  
  "B2B revenue starts Month 3. D2C from Month 6."
```

---

## 10. MIS MODULE 8 — AOP VS ACTUAL TRACKER

### Purpose
One-click comparison of AOP budget vs actual every month.
The most-used FM report.

### Screen: /mis/aop-tracker

```
HEADER:
  FY 2026-27 | [Select Month ▼]

AOP DATA SOURCE:
  Loaded from AOP Excel at start of year.
  FM uploads AOP values once per year.
  System stores in a simple aop_targets table.

VIEW OPTIONS:
  [Monthly] [YTD] [Full Year Projection]

MONTHLY VIEW (August 2026):

                    AOP BUDGET   ACTUAL    VAR     VAR%
─────────────────────────────────────────────────────────
Revenue:
  Chhabee:         ₹20,00,000  ₹17,49,000 -₹2,51L  -12.6% ⚠️
  B2B:                     ₹0          ₹0      ₹0    —
  D2C:                     ₹0          ₹0      ₹0    —
  TOTAL:           ₹20,00,000  ₹17,49,000 -₹2,51L  -12.6% ⚠️

Direct Costs:
  Materials:       ₹11,16,000  ₹16,04,000 +₹4,88L  +43.7% 🔴
  Labour (direct):  ₹2,50,000   ₹1,20,000 -₹1,30L  -52% ✓
  Semi-variable OH: ₹1,41,880     ₹84,000  -₹57.9K  -40.8% ✓

CM1:                ₹5,12,120  -₹55,000  -₹5,67L  -110% 🔴

Fixed Costs:
  Manager salary:   ₹1,00,000  ₹1,00,000      ₹0    0% ✓
  Rent:             ₹1,50,000  ₹1,50,000      ₹0    0% ✓
  New staff:               ₹0         ₹0      ₹0    —

EBITDA:             ₹2,62,120  -₹3,05,000  -₹5,67L 🔴
PAT:               -₹2,44,000  -₹3,82,500  -₹1,38L

─────────────────────────────────────────────────────────
FLAGS (variance > 15%):
  🔴 Materials: +43.7% above budget — HIGH PRIORITY
     Root cause: Revenue lower, fixed mat cost similar
     Note: Low volume month — materials don't scale
     proportionally. Expected to normalise.
  
  ⚠️ Revenue: -12.6% below budget
     Chhabee sqft: 1,458 vs AOP 1,667
     Gap: 209 sqft | ₹2,50,800 revenue gap

YTD VIEW:
  Same table but cumulative from Aug 2026

FULL YEAR PROJECTION:
  Actual + remaining AOP months
  Shows estimated full-year PAT vs AOP ₹2.85 Cr
```

---

## 11. ADDITIONAL REPORTS

### 11.1 Receivables Ageing Report

```
Route: /mis/receivables-ageing
Access: FM only

  Client | Invoice | Invoice Date | Due Date |
  0-30 | 31-60 | 61-90 | 90+ | Total Outstanding

  Auto-refreshes daily.
  Export to Excel available.
```

### 11.2 Inventory Valuation Report

```
Route: /mis/inventory-value
Access: FM only

  Material | Category | Qty | Unit | Lot Rate | Value
  ─────────────────────────────────────────────────
  18mm Plywood | PLY | 48 sheets | ₹1,900 | ₹91,200
  Laminate     | LAM | 210 sqft  | ₹80    | ₹16,800
  ...
  ─────────────────────────────────────────────────
  TOTAL INVENTORY VALUE: ₹X

  Updated in real-time from inventory table.
  FIFO valuation (uses lot_tracking rates).
```

### 11.3 Vendor Performance Report

```
Route: /mis/vendor-performance
Access: FM only

  Vendor | Type | Total Orders | On-Time % |
  Rejection % | Avg Lead Days | Score | Trend

  Last 6 months data.
  Lowest performers highlighted.
```

### 11.4 Capacity Utilisation Report

```
Route: /mis/capacity
Access: FM only

  Month | Carpenters | Sqft Produced | Target Sqft |
  Utilisation% | Revenue | Revenue/Carpenter/Day

  Shows actual vs 12,688 sqft/month target.
  Trend chart by month.
```

### 11.5 QC Performance Report

```
Route: /mis/qc-performance
Access: FM only

  Month | WOs Inspected | First-time Pass% |
  Rework Rate% | Rework Cost | Complaints | Resolution Days

  By furniture type drill-down.
  Common failure points.
```

---

## 12. AOP DATA LOADING

```
Route: /mis/aop-settings (FM only — one time per year)

FM uploads AOP values at start of financial year.
System stores in aop_targets table (see below).

TABLE: aop_targets (NEW — small table)
  id, fy, month_number, stream,
  revenue_target, material_target,
  labour_target, fixed_cost_target,
  cm1_target, ebitda_target, pat_target

FM enters targets for each month (12 rows per stream).
OR: System can calculate from sqft inputs
    (same formula as AOP Excel).

Alternative approach:
  Store AOP sqft per stream per month
  System calculates everything else from formulas
  This is more maintainable as rates are locked
```

---

## 13. ACCESS CONTROL SUMMARY

```
FM sees:
  All 8 MIS modules + all 5 additional reports
  Full financial data including margins and costs

Super Admin (Chhabee Partner) sees:
  Revenue by stream (Chhabee stream only)
  Collections from Chhabee
  WO completion status
  NO cost data, NO margin data

Factory Supervisor sees:
  Production reports (Module 6: Driver 2 — sqft/carpenter)
  Capacity utilisation
  QC performance
  NO financial data, NO margins, NO costs

Route-level access control:
  /mis/* — FM only by default
  /mis/stream-pl?stream=chhabee — Super Admin (revenue only)
  /mis/capacity — Supervisor allowed
  /mis/qc-performance — Supervisor allowed
```

---

## 14. BUSINESS RULES

```
BR-01: MIS is READ-ONLY. No data entry here.
       All data flows from operational modules.
       If a number looks wrong, fix the source
       data in the operational module.

BR-02: Management P&L shown here ≠ Statutory P&L.
       Minor differences are expected and normal.
       CA reconciles quarterly.

BR-03: AOP targets loaded once per financial year.
       FM can update mid-year if AOP is revised.
       All history preserved (before and after revision).

BR-04: Minimum 3 WOs required before furniture
       type appears in Module 3 analysis.
       Prevents misleading single-WO averages.

BR-05: True margin (Module 2) calculation:
       Cost of credit rate = 12% per annum.
       This is the assumed working capital cost.
       FM can change this in tenant_settings.

BR-06: Variance flags in AOP tracker:
       > 15% variance on any line: flagged
       > 25% variance: red flag
       Configurable thresholds in tenant_settings.

BR-07: Profitability drivers (Module 6) update
       automatically after every WO financially
       closes. Not real-time — batch update.

BR-08: Super Admin can see ONLY Chhabee revenue
       and collection data. Never cost or margin.
       This is a partnership protection rule.

BR-09: All MIS data is for current financial year
       by default. Previous year comparison available
       from FY 2027-28 onwards (first full year).

BR-10: Export to Excel available on all reports.
       FM can download any report as Excel.
       Used for sharing with CA or partners.
```

---

## 15. TESTING CHECKLIST

**Module 1 — WO P&L:**
[ ] 3 cost columns populate correctly
[ ] Variance calculated (actual vs estimated)
[ ] Collection days calculated correctly
[ ] QC first-time pass shown

**Module 2 — Client Profitability:**
[ ] True margin = gross margin - cost of credit
[ ] Cost of credit formula correct
[ ] 12-month rolling view works
[ ] Flags fire for low margin / slow payers

**Module 3 — Furniture Type:**
[ ] Minimum 3 WOs before showing
[ ] Rework rate linked from QC records
[ ] Drill-down to individual WOs works

**Module 4 — Material Variance:**
[ ] Same furniture type comparison works
[ ] BOM vs actual shown per material line
[ ] Rate trend chart shows correctly

**Module 5 — Monthly P&L:**
[ ] Structure matches AOP exactly
[ ] CM1, CM2, EBITDA, PAT all correct
[ ] YTD accumulates correctly

**Module 6 — Drivers:**
[ ] All 6 drivers calculate correctly
[ ] Target vs actual comparison correct
[ ] Trend arrows show correctly
[ ] Root cause links to source data

**Module 7 — Stream P&L:**
[ ] 3 streams shown separately
[ ] Fixed costs NOT allocated to streams
[ ] 12-month trend chart works

**Module 8 — AOP Tracker:**
[ ] AOP data loaded from targets table
[ ] Variance calculated correctly
[ ] Flags fire for > 15% variance
[ ] YTD accumulates correctly

**Access Control:**
[ ] Supervisor cannot see financial MIS
[ ] Super Admin sees revenue only (no margin)
[ ] FM sees everything

---

## 16. INTEGRATION POINTS

```
ALL MODULES FEED MIS:
  PRD-02: WO revenue and status
  PRD-05: BOM estimated costs
  PRD-06: PO committed costs
  PRD-08: GRN actual material costs, inventory value
  PRD-09: Job card labour hours and costs
  PRD-10: OT costs per WO
  PRD-11: QC pass/fail, rework, complaints
  PRD-12: Invoice amounts, collection dates
  PRD-13: Vendor costs, job costing actual
  PRD-14: Labour costs, payroll totals
  PRD-16: MIS data feeds dashboard widgets
  PRD-17: Weekly P&L snapshot data from MIS
```

---

*Document version: 1.0*
*Prerequisites: PRD-00 through PRD-14 (all modules)*
*MIS reads from all modules — build last*
*AOP source: Kaarigar_AOP_FY2627_v6.xlsx*
*Key metrics: 12,688 sqft/month target, ₹1,200/sqft,*
*             29.2% CM1, 21.2% EBITDA, 15.6% PAT*
*Next document: PRD-16 Dashboard & Notifications*
