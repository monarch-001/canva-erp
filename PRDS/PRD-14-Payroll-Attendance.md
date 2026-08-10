# PRD-14: PAYROLL & ATTENDANCE
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
Manages attendance tracking for all permanent employees
and auto-calculates monthly payroll. Payroll is not a
complex multi-variable system — it follows a simple,
locked formula: base salary + OT earnings - deductions.
The CA uses payroll data (exported to Tally) for PF/ESIC
compliance and statutory returns.

### Scope
- Permanent employees: carpenters, supervisor, manager,
  guard, helper, R&D staff
- Contractual carpenters: paid through Accounts Payable
  (NOT this module — see PRD-13)

### Users of This Module
- Factory Manager: Full access — approve payroll,
  view all records, manage salary advances
- Factory Supervisor: Mark daily attendance, view
  team attendance summary
- Carpenter: View own attendance and payslip (Glide)

### Key Outcomes
- Daily attendance marked by 9 AM
- Monthly payroll auto-calculated on last working day
- Payslips auto-generated and stored per employee
- PF and ESIC deductions calculated correctly
- Salary advances tracked with recovery schedule
- All payroll data in Tally export (Sheet 8)

---

## 2. LOCKED SALARY STRUCTURE (FROM AOP)

```
CARPENTERS (18 at full capacity):
  Monthly salary: ₹25,000 per carpenter
  Hourly rate: ₹25,000 ÷ 26 days ÷ 9 hours = ₹106.84/hr
  OT rate: ₹100/hour flat (lower than normal — by design)
  Current carpenters: 12 (6 more hired as volume grows)

MANAGER (Factory Manager — incoming partner):
  Monthly: ₹1,00,000
  Annual incentive: ₹4,00,000 (paid in Month 12 only)

SECURITY GUARD: ₹25,000/month (from Sep 2026)
HELPER:         ₹20,000/month (from Sep 2026)
R&D STAFF:      ₹25,000/month (from Sep 2026)

DRAWINGS RESOURCE: ₹50,000/month (from Dec 2026)

ALL ABOVE ARE LOCKED FROM AOP — DO NOT CHANGE
```

---

## 3. PF AND ESIC RATES (STATUTORY — 2026)

```
PROVIDENT FUND (PF):
  Employee contribution: 12% of basic salary
  Employer contribution: 12% of basic salary
  Applied on: Basic salary up to ₹15,000/month
  If salary > ₹15,000: PF on ₹15,000 only (statutory)
  OR: Employee may opt to contribute on full salary

  For carpenter at ₹25,000:
    PF on ₹15,000 (statutory cap)
    Employee PF: ₹1,800/month
    Employer PF: ₹1,800/month

ESIC (Employee State Insurance):
  Applicable: Employees earning ≤ ₹21,000/month
  Employee contribution: 0.75% of gross salary
  Employer contribution: 3.25% of gross salary

  For carpenter at ₹25,000:
    ESIC NOT applicable (salary > ₹21,000 limit)
  
  For guard/helper at ₹20,000-₹25,000:
    Check eligibility each month based on salary
    If gross ≤ ₹21,000: ESIC applicable
    Guard (₹25,000): NOT applicable
    Helper (₹20,000): ESIC applicable
      Employee: ₹20,000 × 0.75% = ₹150/month
      Employer: ₹20,000 × 3.25% = ₹650/month

NOTE: CA to confirm exact applicability.
System stores rates. CA overrides if needed.
```

---

## 4. DATABASE SCHEMA

### 4.1 employee_salaries (NEW TABLE — Salary Master)

```sql
CREATE TABLE IF NOT EXISTS public.employee_salaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.profiles(id)
    NOT NULL UNIQUE,
  -- Salary components
  basic_salary NUMERIC NOT NULL,
  hra NUMERIC DEFAULT 0,
  other_allowances NUMERIC DEFAULT 0,
  gross_salary NUMERIC GENERATED ALWAYS AS
    (basic_salary + hra + other_allowances) STORED,
  -- PF
  pf_applicable BOOLEAN DEFAULT true,
  pf_basis NUMERIC,   -- Amount on which PF calculated
  employee_pf_pct NUMERIC DEFAULT 12,
  employer_pf_pct NUMERIC DEFAULT 12,
  -- ESIC
  esic_applicable BOOLEAN DEFAULT false,
  employee_esic_pct NUMERIC DEFAULT 0.75,
  employer_esic_pct NUMERIC DEFAULT 3.25,
  -- Professional Tax (if applicable)
  professional_tax NUMERIC DEFAULT 0,
  -- Annual incentive
  annual_incentive NUMERIC DEFAULT 0,
  incentive_month INTEGER,   -- Which month paid (12 = July)
  -- Effective dates
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_current BOOLEAN DEFAULT true,
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employee_salaries
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on salaries"
ON public.employee_salaries FOR ALL
USING (public.is_incoming_partner());
```

### 4.2 salary_advances (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.salary_advances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.profiles(id)
    NOT NULL,
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  advance_amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  recovery_start_month DATE NOT NULL,
  recovery_monthly_amount NUMERIC NOT NULL,
  total_recovered NUMERIC DEFAULT 0,
  balance_outstanding NUMERIC GENERATED ALWAYS AS
    (advance_amount - total_recovered) STORED,
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'fully_recovered', 'written_off'
  )),
  approved_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on advances"
ON public.salary_advances FOR ALL
USING (public.is_incoming_partner());
```

### 4.3 monthly_payroll (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.monthly_payroll (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_month DATE NOT NULL,  -- First day of month
  employee_id UUID REFERENCES public.profiles(id)
    NOT NULL,
  -- Working days
  total_working_days INTEGER NOT NULL DEFAULT 26,
  days_present INTEGER NOT NULL DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  days_half_day INTEGER DEFAULT 0,
  days_leave INTEGER DEFAULT 0,
  payable_days NUMERIC GENERATED ALWAYS AS (
    days_present + (days_half_day * 0.5) +
    days_leave  -- Leave days paid
  ) STORED,
  -- OT
  ot_hours NUMERIC DEFAULT 0,
  ot_amount NUMERIC GENERATED ALWAYS AS
    (ot_hours * 100) STORED,
  -- Gross earnings
  basic_earned NUMERIC NOT NULL DEFAULT 0,
  hra_earned NUMERIC DEFAULT 0,
  other_earned NUMERIC DEFAULT 0,
  ot_earned NUMERIC DEFAULT 0,
  incentive_earned NUMERIC DEFAULT 0,
  gross_earned NUMERIC GENERATED ALWAYS AS (
    basic_earned + hra_earned + other_earned +
    ot_earned + incentive_earned
  ) STORED,
  -- Deductions
  employee_pf NUMERIC DEFAULT 0,
  employee_esic NUMERIC DEFAULT 0,
  professional_tax NUMERIC DEFAULT 0,
  advance_recovery NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  total_deductions NUMERIC GENERATED ALWAYS AS (
    employee_pf + employee_esic + professional_tax +
    advance_recovery + other_deductions
  ) STORED,
  -- Net pay
  net_payable NUMERIC GENERATED ALWAYS AS (
    basic_earned + hra_earned + other_earned +
    ot_earned + incentive_earned -
    employee_pf - employee_esic - professional_tax -
    advance_recovery - other_deductions
  ) STORED,
  -- Employer contributions (for cost calculation)
  employer_pf NUMERIC DEFAULT 0,
  employer_esic NUMERIC DEFAULT 0,
  total_employer_cost NUMERIC GENERATED ALWAYS AS (
    basic_earned + hra_earned + other_earned +
    ot_earned + incentive_earned +
    employer_pf + employer_esic
  ) STORED,
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'paid'
  )),
  payslip_url TEXT,
  payment_date DATE,
  payment_mode TEXT,
  payment_reference TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  UNIQUE(payroll_month, employee_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX payroll_month_idx
  ON public.monthly_payroll(payroll_month);
CREATE INDEX payroll_employee_idx
  ON public.monthly_payroll(employee_id);
CREATE INDEX payroll_status_idx
  ON public.monthly_payroll(status);

ALTER TABLE public.monthly_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on payroll"
ON public.monthly_payroll FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Employee views own payroll"
ON public.monthly_payroll FOR SELECT
USING (employee_id = auth.uid());
```

---

## 5. SCREENS & FLOWS

### 5.1 Attendance Screen (/payroll/attendance)

Access: Supervisor (mark), FM (full view)

```
PAGE HEADER:
  "Attendance — [Today's Date]"
  [← Yesterday] [Today] [Tomorrow →]

QUICK MARK (by 9 AM every morning):

  TABLE — one row per active permanent employee:
  
  Name          | EMP-ID | ○ Present ○ Absent ○ Half ○ Leave
  ─────────────────────────────────────────────────────────────
  Ramesh Kumar  | EMP-003 | (●) Present  ( ) Absent ...
  Suresh Yadav  | EMP-004 | (●) Present  ( ) Absent ...
  Vikram Singh  | EMP-005 | ( ) Present  (●) Absent ...
  Mohan Lal     | EMP-006 | (●) Present  ( ) Absent ...

  [Mark All Present] button — one click for full team
  Individual override for absent/half-day/leave

  LEAVE TYPE (if Leave selected):
    Casual Leave / Sick Leave / Festival Leave / Unpaid

  [Save Attendance] button

  ON SAVE:
    INSERT/UPDATE into attendance table
    (See PRD-09 for attendance table schema)
    Link to job cards created for today

ATTENDANCE SUMMARY (below quick mark):
  Present: [X] | Absent: [Y] | Half Day: [Z]
  Attendance %: [X/(X+Y+Z)] × 100

MONTHLY VIEW:
  Calendar view for selected employee
  Colour coded:
    Green: Present
    Red: Absent
    Amber: Half Day
    Blue: Leave (paid)
    Grey: Weekly off / Holiday

MISSING ATTENDANCE ALERT:
  If attendance not marked by 9:30 AM:
    → Supervisor: "Attendance not marked for today.
      Please mark before creating job cards."
```

---

### 5.2 Payroll Processing (/payroll/monthly)

Access: FM only
Run: Last working day of each month

```
STEP 1: SELECT MONTH
  Month selector (default: current month)
  [Generate Payroll] button

STEP 2: AUTO-CALCULATION

System calculates for each employee:

  DAYS CALCULATION:
    Total working days: 26 (fixed from AOP)
    Days present (from attendance)
    Days absent
    Days half-day (counts as 0.5)
    Days leave (casual/sick = paid, unpaid = not paid)
    Payable days = present + (half × 0.5) + paid leave

  EARNINGS CALCULATION:
    Basic earned = (gross_salary / 26) × payable_days
    OT earned = ot_hours × ₹100
    Incentive = annual_incentive (only in Month 12)

  PF CALCULATION:
    PF basis = MIN(basic_salary, 15000)
    Employee PF = PF basis × 12% = ₹1,800 max
    Employer PF = PF basis × 12% = ₹1,800 max

  ESIC CALCULATION:
    If gross_earned ≤ 21,000:
      Employee ESIC = gross_earned × 0.75%
      Employer ESIC = gross_earned × 3.25%
    Else: ESIC = 0

  ADVANCE RECOVERY:
    Check salary_advances for active advances
    Deduct monthly_recovery_amount if balance > 0

  NET PAYABLE:
    = Gross Earned - Employee PF - ESIC - Advance Recovery

STEP 3: PAYROLL REGISTER VIEW

  TABLE for selected month:

  Employee | Days | OT Hrs | Gross | PF | ESIC | Advance | NET
  ─────────────────────────────────────────────────────────────
  Ramesh   |  25  |   6    | 24,039| 1800|   0  |    0   |22,239
  Suresh   |  26  |   3    | 25,300| 1800|   0  |  1000  |22,500
  Vikram   |  24  |   0    | 23,077| 1800|   0  |    0   |21,277
  [Guard]  |  26  |   0    | 25,000| 1800|   0  |    0   |23,200
  [Helper] |  26  |   0    | 20,000| 1800| 150  |    0   |18,050
  ─────────────────────────────────────────────────────────────
  TOTALS   |      |        |       |     |      |        |

  EMPLOYER COST SUMMARY (FM only):
    Total gross paid:         ₹X
    Total employer PF:        ₹X
    Total employer ESIC:      ₹X
    TOTAL EMPLOYER COST:      ₹X
    (This is what goes into factory overhead P&L)

  [Edit] button per row — FM can manually adjust
  [Approve Payroll] button

STEP 4: APPROVE PAYROLL

  FM reviews totals
  [Approve Payroll for [Month]] button

  ON APPROVE:
    UPDATE monthly_payroll SET status = 'approved'
    Generate payslips for all employees
    Store payslip PDFs in Supabase storage
    Notify FM: "Payroll approved. Ready for payment."

STEP 5: MARK AS PAID

  FM transfers salaries via bank (outside system)
  Then records in system:
  
  [Mark Payroll as Paid] button
  Payment Date: [DATE]
  Payment Mode: NEFT / Cash
  Reference: [batch UTR or description]

  ON MARK PAID:
    UPDATE monthly_payroll SET
      status = 'paid',
      payment_date = [date],
      payment_mode = [mode],
      payment_reference = [reference]
    Toast: "Payroll for [month] marked as paid"
```

---

### 5.3 Payslip Generation

Auto-generated for each employee on payroll approval.
Stored as PDF in Supabase Storage.
Employee sees it in Glide app.

```
PAYSLIP FORMAT:

═══════════════════════════════════════════════════
CANVA CONCEPTS
Payslip for August 2026
═══════════════════════════════════════════════════

Employee: Ramesh Kumar
Employee ID: EMP-003
Designation: Carpenter
PF Account: [UAN number]

Pay Period: 01-Aug-2026 to 31-Aug-2026
Payment Date: 31-Aug-2026
═══════════════════════════════════════════════════

EARNINGS:                    DEDUCTIONS:
─────────────────────────    ─────────────────────
Basic Salary:   ₹24,038     PF (Employee):  ₹1,800
OT Earnings:       ₹600     Advance Rec.:       ₹0
                            ─────────────────────
                            Total Deductions: ₹1,800

GROSS EARNINGS:  ₹24,638
TOTAL DEDUCTIONS: ₹1,800
═══════════════════════════════════════════════════
NET PAYABLE:     ₹22,838
═══════════════════════════════════════════════════

Attendance:
  Days Present: 25 | OT Hours: 6
  Days Absent: 1 | Leave: 0

This is a system-generated payslip.
Canva Concepts
═══════════════════════════════════════════════════
```

---

### 5.4 Salary Advance Management

Access: FM only

```
RAISE ADVANCE:
  Employee * (search)
  Advance Amount * (NUMERIC)
  Reason * (TEXTAREA)
  Recovery Start Month * (DATE — first day of month)
  Monthly Recovery Amount * (NUMERIC)
    System calculates months to recover:
    "₹5,000 advance recovered at ₹1,000/month
     = 5 months recovery"

  [Approve Advance] button
  (FM approves same as raises — no dual approval)

ADVANCE LEDGER (per employee):
  Shows all advances with recovery status
  Running balance outstanding
  Recovery history month by month

ADVANCE IN PAYSLIP:
  advance_recovery auto-deducted in payroll
  if salary_advances.status = 'active'
  AND balance_outstanding > 0

  UPDATE salary_advances:
    total_recovered += advance_recovery
    If total_recovered >= advance_amount:
      status = 'fully_recovered'
```

---

### 5.5 Leave Management

```
LEAVE TYPES:
  Casual Leave (CL): Paid | 12 days per year | Max 3 at once
  Sick Leave (SL): Paid | 6 days per year
  Festival Leave: Paid | Factory-declared list
  Unpaid Leave: No pay for day

LEAVE REQUEST (via Supervisor):
  Employee name, Leave type, Dates, Reason

SUPERVISOR APPROVES:
  CL and SL: Supervisor approves
  Festival leave: FM approves

LEAVE BALANCE (tracked per employee):
  CL used, CL remaining
  SL used, SL remaining

LEAVE IN PAYROLL:
  Paid leave days counted as payable_days
  Unpaid leave reduces payable_days

FESTIVAL HOLIDAYS (factory-declared list):
  FM sets list at start of year
  Stored in tenant_settings or separate table
  These days: all employees marked 'holiday' in
  attendance automatically
```

---

### 5.6 Employee Master (Payroll View)

Route: /payroll/employees
Access: FM only

```
TABLE:
  Name | EMP-ID | Designation | Salary | PF | ESIC | Status

[Add Employee] → Link to PRD-01 user creation
  But add salary details here after user creation:
  Basic, HRA, PF applicable, ESIC applicable

[Edit Salary] → Opens salary revision:
  New salary effective from [date]
  Old salary record preserved (salary history)
  
[View Advance] → Shows advance ledger

[View Payroll History] → Last 12 months payslips

DOCUMENTS (stored per employee):
  Aadhaar card
  PAN card
  Appointment letter
  PF Form (if registered)
  Bank account details
  Upload button for each
  Stored in employee-docs Supabase bucket
```

---

## 6. PAYROLL CALCULATION EXAMPLE

For a carpenter working 25 days (1 absent) with 6 OT hours:

```
GROSS SALARY:       ₹25,000/month

CALCULATION:
  Payable days: 25 (26 total - 1 absent)
  Basic earned: (₹25,000 ÷ 26) × 25 = ₹24,038
  OT earned: 6 hours × ₹100 = ₹600
  Gross earned: ₹24,038 + ₹600 = ₹24,638

DEDUCTIONS:
  PF basis: MIN(₹24,038, ₹15,000) = ₹15,000
  Employee PF: ₹15,000 × 12% = ₹1,800
  ESIC: Not applicable (salary > ₹21,000)
  Advance recovery: ₹0 (no advance)
  Total deductions: ₹1,800

NET PAYABLE: ₹24,638 - ₹1,800 = ₹22,838

EMPLOYER COST:
  Gross paid: ₹24,638
  Employer PF: ₹15,000 × 12% = ₹1,800
  Total cost to factory: ₹26,438
```

---

## 7. BUSINESS RULES

```
BR-01: Attendance must be marked by 9:30 AM.
       Supervisor receives alert if not marked.
       Cannot create job cards without marking
       attendance (cross-module dependency).

BR-02: Salary is calculated as:
       (Gross Salary ÷ 26) × Payable Days
       26 = fixed working days per month (from AOP)
       NOT calendar days, NOT actual working days.

BR-03: OT earnings = actual_hours_worked × ₹100
       Only from approved and completed OT records.
       Self-declared OT NEVER accepted.

BR-04: PF calculated on minimum of:
       (a) actual basic salary, or
       (b) ₹15,000 (statutory ceiling)
       Whichever is lower. Currently: all carpenters
       earn above ₹15,000, so PF on ₹15,000.

BR-05: ESIC applicable only if gross ≤ ₹21,000.
       Current staff:
         Carpenters (₹25,000): NOT applicable
         Guard (₹25,000): NOT applicable
         Helper (₹20,000): APPLICABLE
         R&D (₹25,000): NOT applicable
       CA to confirm and update if rules change.

BR-06: Annual incentive (Manager: ₹4,00,000):
       Paid in Month 12 only (July 2027).
       Shown as separate line on payslip.
       Added to gross for that month only.

BR-07: Salary advance recovery:
       Monthly deduction = advance_monthly_amount
       Cannot exceed 30% of net payable (protect employee)
       If advance balance < monthly_amount:
         Deduct remaining balance only
         Mark advance as fully_recovered

BR-08: Payroll approval is FM only.
       Supervisor cannot approve payroll.
       Even if FM is unavailable, no one else can pay.

BR-09: Payslips are permanent records.
       Cannot be deleted.
       Available to employee via Glide app.
       Stored in Supabase Storage (employee-docs bucket).

BR-10: Contractor carpenters are NOT in this module.
       Their payment is through Accounts Payable (PRD-13)
       as service vendor payments.
       They do NOT get payslips from this system.

BR-11: New employees starting mid-month:
       Payable days = working days from join date.
       Joining in first half: pay from joining date.
       Joining in second half: pay from next month.
       (FM decides — system allows any date)

BR-12: Salary revision creates new record
       (not update existing).
       Old salary preserved for audit and
       historical payroll recalculation.

BR-13: Payroll for all months must be completed
       before Tally export on 5th.
       System blocks export if any month's payroll
       is in 'draft' status.
```

---

## 8. NOTIFICATIONS & ALERTS

```
Attendance Not Marked by 9:30 AM:
  → Supervisor: "Attendance not marked today.
    Please mark before creating job cards."

Payroll Ready to Process (last working day):
  → FM: "Process payroll for [month].
    [X] employees | Estimated total: ₹X"

Salary Advance Pending Recovery (each month):
  → FM (during payroll): "[Employee] has advance
    balance of ₹X. ₹Y will be recovered this month."

Advance Fully Recovered:
  → FM: "Salary advance for [employee] fully recovered."

Payroll Approved:
  → FM: "Payroll for [month] approved.
    Net payable: ₹X. Make bank transfers."

Payroll Marked as Paid:
  → FM: "Payroll for [month] marked as paid."

Leave Request (from Supervisor to FM for festival):
  → FM: "Leave request: [employee] — [type]
    from [date] to [date]. Approve?"

PF/ESIC Filing Reminder (quarterly):
  → FM: "PF/ESIC returns due for Q[X].
    Send payroll data to CA."
```

---

## 9. TESTING CHECKLIST

**Attendance:**
[ ] Mark all present with one click
[ ] Individual overrides work
[ ] Half-day counts as 0.5 days
[ ] Leave types recorded correctly
[ ] Alert fires if attendance not marked by 9:30

**Payroll Calculation:**
[ ] Basic earned = (gross ÷ 26) × payable_days
[ ] OT earned = actual_hours × ₹100
[ ] PF on ₹15,000 ceiling (not full salary)
[ ] ESIC calculated correctly for helper only
[ ] Advance recovery deducted
[ ] Net payable = gross - all deductions
[ ] Employer cost = gross + employer PF + ESIC
[ ] Annual incentive in Month 12 only

**Payslip:**
[ ] PDF generated for each employee
[ ] Stored in Supabase Storage
[ ] Employee sees own payslip in Glide
[ ] Payslip format matches template
[ ] All deductions shown separately

**Salary Advance:**
[ ] Advance created with recovery schedule
[ ] Monthly deduction auto-applied in payroll
[ ] Balance updated after each recovery
[ ] Status = fully_recovered when done

**Tally Export:**
[ ] Payroll entries in Sheet 8
[ ] Employer PF and ESIC in correct columns
[ ] OT earnings shown separately
[ ] All deductions listed

---

## 10. INTEGRATION POINTS

```
PRD-01: Employee profile (profiles table) is
         base record. Salary added here in PRD-14.
         Documents stored in employee-docs bucket.

PRD-09: Daily attendance from attendance table
         Job card assignments include daily_rate
         Labour cost per WO = hours × hourly rate
         from job_card_assignments

PRD-10: OT actual_hours_worked from ot_requests
         feeds ot_hours in monthly_payroll
         OT cost = ot_hours × ₹100

PRD-13: Payroll entries included in Tally export
         (Sheet 8 of monthly export)
         Employer PF/ESIC cost in overhead P&L
         Salary payment in cash/bank management

PRD-15: Labour cost as % of revenue (MIS KPI)
         Carpenter cost per sqft (efficiency metric)
         Monthly salary bill trend in P&L

PRD-16: "Process payroll" alert on dashboard
         Last working day of month
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-09, PRD-10*
*Locked salaries from AOP:*
*  Carpenter: ₹25,000/month*
*  Manager: ₹1,00,000/month + ₹4,00,000 annual incentive*
*  Guard/R&D: ₹25,000/month (from Sep 2026)*
*  Helper: ₹20,000/month (from Sep 2026)*
*  Drawings: ₹50,000/month (from Dec 2026)*
*OT rate: ₹100/hour flat (NOT 1.5x)*
*PF ceiling: ₹15,000/month*
*Next document: PRD-15 MIS & Reporting*
