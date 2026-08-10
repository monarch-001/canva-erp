# PRD-09: JOB CARD & DAILY PRODUCTION TRACKING
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
The Job Card is the daily instruction sheet for each carpenter.
It tells them exactly what to make, which Work Order it belongs
to, what stage to work on, and what the expected completion is.
The Supervisor creates job cards every morning and carpenters
update their progress throughout the day. End-of-day updates
feed into the production tracking dashboard.

This module also powers the Glide carpenter app — a simple
read-only mobile view that carpenters use on the production
floor to see their daily assignments.

### Users of This Module
- Factory Manager: View all, reassign carpenters
- Factory Supervisor: Create job cards, update progress,
  mark completion, manage daily production
- Carpenter: View own job card only (via Glide app)
- Others: No access

### Key Outcomes
- Every carpenter has a clear daily task by 9 AM
- Real-time production progress visible to FM
- Labour cost accurately allocated per WO
- Rework tracked separately from original work
- Project-level progress: X of Y items complete
- Carpenter attendance linked to job cards

---

## 2. DATABASE SCHEMA

### 2.1 job_cards (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.job_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jc_number TEXT UNIQUE NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT DEFAULT 'day' CHECK (shift IN (
    'day', 'evening'
  )),
  production_stage TEXT NOT NULL CHECK (production_stage IN (
    'cutting',
    'edgebanding',
    'drilling',
    'assembly',
    'lamination',
    'finishing',
    'hardware_fitting',
    'quality_check',
    'packaging',
    'rework'
  )),
  title TEXT NOT NULL,
  description TEXT,
  is_rework BOOLEAN DEFAULT false,
  rework_reason TEXT,
  original_jc_id UUID REFERENCES public.job_cards(id),
  status TEXT DEFAULT 'assigned' CHECK (status IN (
    'assigned',
    'in_progress',
    'completed',
    'paused',
    'cancelled'
  )),
  priority TEXT DEFAULT 'normal' CHECK (priority IN (
    'normal', 'high', 'critical'
  )),
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  -- Completion tracking
  quantity_assigned INTEGER DEFAULT 1,
  quantity_completed INTEGER DEFAULT 0,
  completion_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN quantity_assigned = 0 THEN 0
    ELSE ROUND((quantity_completed::NUMERIC /
      quantity_assigned::NUMERIC) * 100, 1)
    END
  ) STORED,
  -- Labour cost (auto-calculated)
  daily_rate NUMERIC DEFAULT 0,
  labour_cost NUMERIC GENERATED ALWAYS AS
    (actual_hours * (daily_rate / 9)) STORED,
  -- Notes
  supervisor_notes TEXT,
  carpenter_notes TEXT,
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX jc_wo_idx ON public.job_cards(wo_id);
CREATE INDEX jc_date_idx ON public.job_cards(date);
CREATE INDEX jc_status_idx ON public.job_cards(status);

ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on job_cards"
ON public.job_cards FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor full access on job_cards"
ON public.job_cards FOR ALL
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Carpenter views own job cards"
ON public.job_cards FOR SELECT
USING (
  public.get_current_user_role() = 'carpenter'
  AND EXISTS (
    SELECT 1 FROM public.job_card_assignments
    WHERE job_card_id = id
    AND carpenter_id = auth.uid()
  )
);
```

### 2.2 job_card_assignments (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.job_card_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_card_id UUID REFERENCES public.job_cards(id)
    ON DELETE CASCADE NOT NULL,
  carpenter_id UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_lead BOOLEAN DEFAULT false,
  daily_rate NUMERIC NOT NULL DEFAULT 25000,
  actual_hours NUMERIC DEFAULT 0,
  labour_cost NUMERIC GENERATED ALWAYS AS
    (actual_hours * (daily_rate / 9 / 26)) STORED,
  -- Note: daily_rate is monthly salary
  -- Hourly = monthly_salary ÷ 26 days ÷ 9 hours
  attendance_status TEXT DEFAULT 'present'
    CHECK (attendance_status IN (
      'present', 'absent', 'half_day', 'on_leave'
    )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX jca_jc_idx
  ON public.job_card_assignments(job_card_id);
CREATE INDEX jca_carpenter_idx
  ON public.job_card_assignments(carpenter_id);

ALTER TABLE public.job_card_assignments
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on jca"
ON public.job_card_assignments FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor full access on jca"
ON public.job_card_assignments FOR ALL
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Carpenter views own assignments"
ON public.job_card_assignments FOR SELECT
USING (
  public.get_current_user_role() = 'carpenter'
  AND carpenter_id = auth.uid()
);
```

### 2.3 eod_updates (End of Day Updates — NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.eod_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_card_id UUID REFERENCES public.job_cards(id) NOT NULL,
  carpenter_id UUID REFERENCES public.profiles(id) NOT NULL,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  qty_completed_today INTEGER DEFAULT 0,
  hours_worked NUMERIC NOT NULL,
  progress_notes TEXT,
  issues_flagged TEXT,
  material_issue_noted BOOLEAN DEFAULT false,
  machine_issue_noted BOOLEAN DEFAULT false,
  issue_description TEXT,
  photos TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_card_id, carpenter_id, update_date)
);

ALTER TABLE public.eod_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on eod_updates"
ON public.eod_updates FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor full access on eod_updates"
ON public.eod_updates FOR ALL
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Carpenter can insert own EOD updates"
ON public.eod_updates FOR INSERT
WITH CHECK (
  public.get_current_user_role() = 'carpenter'
  AND carpenter_id = auth.uid()
);

CREATE POLICY "Carpenter views own EOD updates"
ON public.eod_updates FOR SELECT
USING (
  public.get_current_user_role() = 'carpenter'
  AND carpenter_id = auth.uid()
);
```

### 2.4 attendance (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN (
    'present', 'absent', 'half_day',
    'on_leave', 'holiday', 'weekly_off'
  )),
  check_in_time TIME,
  check_out_time TIME,
  ot_hours NUMERIC DEFAULT 0,
  ot_approved BOOLEAN DEFAULT false,
  ot_approved_by UUID REFERENCES public.profiles(id),
  leave_type TEXT CHECK (leave_type IN (
    'casual', 'sick', 'festival', 'unpaid'
  )),
  notes TEXT,
  marked_by UUID REFERENCES public.profiles(id) NOT NULL,
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE INDEX att_employee_date_idx
  ON public.attendance(employee_id, date);
CREATE INDEX att_date_idx ON public.attendance(date);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on attendance"
ON public.attendance FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can manage attendance"
ON public.attendance FOR ALL
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Carpenter views own attendance"
ON public.attendance FOR SELECT
USING (
  public.get_current_user_role() = 'carpenter'
  AND employee_id = auth.uid()
);
```

---

## 3. JOB CARD NUMBER FORMAT

```
Format: JC-[DATE]-[SEQ]
Example: JC-230826-001
         (23 Aug 2026, first card of the day)

Sequence resets daily.
Add to numbering_counters:
  doc_type = JC_[YYYYMMDD] per day
  OR: generate in application as date + daily count
```

---

## 4. SCREENS & FLOWS

### 4.1 Production Dashboard (/production)

Access: FM, Supervisor

```
Page title: "Production Floor"
Date selector: [← Yesterday] [Today ▼] [Tomorrow →]

SECTION 1: TODAY'S OVERVIEW CARDS
  ┌────────────────────────────────────────────────┐
  │ Carpenters Present: 16/18                      │
  │ Active Job Cards: 12                           │
  │ Completed Today: 3                             │
  │ In Progress: 8                                 │
  │ Not Started: 1                                 │
  │ Blocked / Paused: 1                            │
  └────────────────────────────────────────────────┘

SECTION 2: CARPENTER STATUS BOARD
  Grid view — one card per carpenter:

  ┌──────────────────────────────┐
  │ 👷 Ramesh Kumar   ● Present  │
  │ WO-CHH-26-001                │
  │ Reception Counter — Assembly │
  │ Progress: 2/3 units ██████░  │
  │ Est. completion: 4:30 PM     │
  └──────────────────────────────┘

  ┌──────────────────────────────┐
  │ 👷 Suresh Yadav   ● Present  │
  │ WO-B2B-26-001                │
  │ Workstation — Cutting        │
  │ Progress: Not started yet    │
  │ [Waiting for material]       │
  └──────────────────────────────┘

  ┌──────────────────────────────┐
  │ 👷 Mohan Singh    ✗ Absent   │
  │ No job card today            │
  └──────────────────────────────┘

  Colour coding:
    Green card: on track
    Amber card: behind schedule
    Red card: blocked / issue flagged
    Grey card: absent

SECTION 3: WORK ORDER PROGRESS
  (This is the project-level view you asked for)

  For each active WO:
  ┌──────────────────────────────────────────────────┐
  │ WO-CHH-26-001 | Reception Counter | Starbucks    │
  │ Delivery: 25-Aug-26 (3 days left) ⚠️             │
  │                                                  │
  │ PRODUCTION PROGRESS:                             │
  │ ████████░░░░░░░░  5 of 10 items complete (50%)   │
  │                                                  │
  │ Stage Breakdown:                                 │
  │   ✓ Cutting:       10/10 done                   │
  │   ✓ Edge Banding:  10/10 done                   │
  │   ◕ Assembly:       5/10 in progress            │
  │   ○ Finishing:      0/10 pending                │
  │   ○ Hardware:       0/10 pending                │
  │                                                  │
  │ Assigned: Ramesh, Suresh, Vikram                 │
  │ [View Job Cards] [Add Job Card]                  │
  └──────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────┐
  │ WO-B2B-26-001 | Office Workstations | WeWork     │
  │ Delivery: 28-Aug-26 (6 days left) ✓              │
  │                                                  │
  │ PRODUCTION PROGRESS:                             │
  │ ██░░░░░░░░░░░░░░  2 of 12 items complete (17%)   │
  │                                                  │
  │ ⚠️ 5 items waiting for material                  │
  │   (Plywood pending — PO-26-003 due 24-Aug)       │
  │                                                  │
  │ Stage Breakdown:                                 │
  │   ◕ Cutting:        2/12 done, 5 material wait   │
  │   ○ Assembly:       0/12 pending                 │
  │   ○ Finishing:      0/12 pending                 │
  │                                                  │
  │ [View Job Cards] [Add Job Card]                  │
  └──────────────────────────────────────────────────┘
```

---

### 4.2 Create Job Card (/production/job-cards/new)

Access: Supervisor, FM
Typically done every morning by 9 AM.

```
FORM FIELDS:

Work Order * (search dropdown)
  Only shows WOs with status: in_production
  or material_ready

Production Stage * (dropdown):
  Cutting / Edge Banding / Drilling /
  Assembly / Lamination / Finishing /
  Hardware Fitting / Quality Check /
  Packaging / Rework

Task Title * (TEXT)
  Placeholder: "e.g. Cut plywood for base unit"
  Auto-suggest based on stage:
    Cutting → "Cut plywood sheets as per drawing"
    Assembly → "Assemble base frame"
    etc.

Task Description (TEXTAREA)
  Detailed instructions for carpenter

Assign Carpenters * (multi-select)
  Shows only PRESENT carpenters today
  (cross-reference with today's attendance)
  Shows each carpenter's current workload:
    "Ramesh — 1 active job"
    "Suresh — Available"
  Lead Carpenter: one can be marked as lead

Quantity * (NUMBER)
  Label: "Number of units for this task"
  Default: WO production_quantity

Estimated Hours * (NUMBER)
  Per unit or total — toggle
  Helper: "How long should this take?"

Priority (radio: Normal / High / Critical)
  Default: inherited from WO priority

Date (DATE, default today)
  Can create for tomorrow in advance

Supervisor Notes (TEXTAREA)
  Visible to carpenter on Glide app

SUBMIT: [Create Job Card]

ON SUBMIT:
  1. Generate JC number
  2. INSERT into job_cards
  3. INSERT into job_card_assignments
     (one row per assigned carpenter)
  4. Mark attendance as 'present' for each
     assigned carpenter (if not already marked)
  5. Toast: "Job Card [jc_number] created"
  6. Carpenter sees it immediately on Glide app
```

---

### 4.3 Job Card Detail (/production/job-cards/:id)

Access: FM (full), Supervisor (full), Carpenter (read-only)

```
HEADER:
  JC Number | Date
  WO Reference (linked)
  Production Stage badge
  Status badge
  Priority badge (if not normal)

  If REWORK: Large red banner
    "⚠️ REWORK JOB CARD"
    "Reason: [rework_reason]"
    "QC checkpoint failed: [detail]"

SECTION: Task Details
  Work Order: [wo_number] — [title]
  Stage: [production_stage]
  Description: [full description]
  Quantity: [X] units
  Estimated Hours: [X] hours

SECTION: Assigned Carpenters
  [Lead] Ramesh Kumar — Present
  Suresh Yadav — Present

SECTION: Progress
  Progress bar: [qty_completed] / [quantity_assigned]
  Completion: [completion_pct]%
  Actual Hours: [actual_hours] / [estimated_hours]
  Status timeline:
    ○ Assigned — 08:45 AM
    ● In Progress — 09:15 AM
    ○ Completed — pending

SECTION: EOD Updates (history)
  Each day's update:
    [Date] [Carpenter] — [qty done] units
    Hours: [X] | Notes: [text]
    Issues: [if any]

ACTIONS:
  Supervisor:
    [Mark In Progress] (if assigned)
    [Mark Complete] (if in_progress)
    [Pause] (if in_progress) → reason required
    [Resume] (if paused)
    [Edit Job Card]
    [Add EOD Update on behalf]

  FM:
    All supervisor actions plus:
    [Reassign Carpenter]
    [Cancel Job Card]
```

---

### 4.4 EOD Update Flow

Submitted by: Supervisor on behalf of carpenters
OR: Carpenter directly via Glide app
Time: Between 5 PM and 7 PM daily

```
EOD UPDATE FORM:
  Job Card: [auto-selected from today's active cards]
  Date: [today, auto]
  Carpenter: [self or select if supervisor]

  Qty Completed Today: NUMBER
    Running total shown: "Total so far: [X]/[Y]"

  Hours Worked: NUMBER (default 9)
    If OT: system flags for OT approval (PRD-10)

  Progress Notes: TEXTAREA
    Placeholder: "What was done today?"

  Any Issues? TOGGLE
    If YES:
      Issue Type: radio
        Material shortage
        Machine breakdown
        Drawing unclear
        Quality concern
        Other
      Description: TEXTAREA
      Photo: upload (optional)

  ON SUBMIT:
    1. INSERT into eod_updates
    2. UPDATE job_cards:
       quantity_completed += qty_completed_today
       actual_hours += hours_worked
       if quantity_completed >= quantity_assigned:
         status = 'completed'
         completed_at = NOW()
    3. UPDATE job_card_assignments:
       actual_hours for this carpenter
    4. If issue flagged:
       Alert Supervisor + FM
    5. If hours > 9:
       Trigger OT approval flow (PRD-10)
    6. Update WO progress aggregation

MISSED EOD UPDATE:
  If no EOD update by 7 PM:
    Alert Supervisor: "No EOD update for
      [carpenter] on JC [number]. Please update."
```

---

### 4.5 WO Production Progress View

This is the project-level dashboard view you described:
"10 items, 2 done, 2 in process, 6 pending — 5 waiting for material"

Route: /work-orders/:id → Details tab
       (production progress section)

```
PRODUCTION PROGRESS CARD (on WO detail):

  WO-CHH-26-001 | Reception Counter
  ─────────────────────────────────
  Total Units: 10

  ✓ Complete:    2  (20%)  ████░░░░░░░░░░░░░░░░
  ▶ In Progress: 2  (20%)
  ⏸ Material Wait: 5 (50%)  ← Plywood pending
  ○ Not Started:  1  (10%)

  STAGE SUMMARY:
  Stage          | Done | In Prog | Pending | Blocked
  Cutting        |  2   |    0    |    8    |   0
  Edge Banding   |  2   |    0    |    8    |   0
  Assembly       |  0   |    2    |    3    |   5 ⚠️
  Finishing      |  0   |    0    |   10    |   0
  Hardware       |  0   |    0    |   10    |   0

  ASSIGNED CARPENTERS:
  Ramesh Kumar — Assembly (2 units in progress)
  Suresh Yadav — Unassigned today

  MATERIAL STATUS:
  ✓ Plywood 18mm:    Available (12 sheets)
  ✓ Laminate:        Available (48 sqft)
  ⚠️ Hardware Hinges: Pending (PO-26-003,
                      expected 24-Aug-26)
  ⚠️ Drawer Channels: Pending (same PO)

  TIME TRACKING:
  Estimated: 45 hours total
  Actual so far: 18 hours
  Labour cost to date: ₹4,846
  Estimated total labour: ₹12,115

  [View All Job Cards for this WO]
```

---

### 4.6 Attendance Management (/production/attendance)

Access: Supervisor (mark), FM (full view)

```
Page: "Attendance — [Today's Date]"

QUICK MARK (morning, by 9 AM):
  List of all active carpenters + staff
  Each row:
    [Name] [Employee ID]
    ○ Present  ○ Absent  ○ Half Day  ○ Leave

  [Mark All Present] button (one click, editable)
  [Save Attendance] button

ATTENDANCE TABLE (after marking):
  Name | Status | Check In | Check Out |
  OT Hours | Leave Type | Notes

MONTHLY SUMMARY (per carpenter):
  Present days | Absent | Half days |
  Leave days | OT hours | Payable days

LEAVE APPROVAL:
  Supervisor can approve casual and sick leave
  Festival leave requires FM approval
  System shows leave balance per employee
```

---

### 4.7 Glide Carpenter App (Separate from Lovable)

This is a separate app built in Glide.
Connects to the same Supabase project (read-only).
Used by carpenters on the production floor.

```
SCREENS IN GLIDE APP:

SCREEN 1: My Tasks Today
  Shows all job cards assigned to this carpenter today
  Each card shows:
    WO Number + Job Title
    Production Stage
    Quantity: [X] units
    Instructions (supervisor_notes)
    Status badge
    [Mark In Progress] button (calls Supabase)
    [Submit EOD Update] button

SCREEN 2: EOD Update Form
  Simple form:
    Qty completed today (number)
    Hours worked (number, default 9)
    Any issues? (yes/no toggle)
    If yes: brief description
  [Submit] button → inserts into eod_updates

SCREEN 3: My Attendance
  Last 30 days attendance history
  Present/Absent/Leave summary
  Read-only

SCREEN 4: My Profile
  Name, Employee ID, Designation
  Monthly salary (shown as "Your Rate: ₹X/month")
  Read-only

SUPABASE CONNECTION FOR GLIDE:
  Uses anon key with RLS enforcing carpenter sees
  only their own data
  Glide cannot write to: profiles, work_orders,
    job_cards creation, inventory, POs
  Glide can write to: eod_updates, attendance
    (status updates only for own records)
```

---

### 4.8 Rework Job Card

Created when QC fails (triggered from PRD-11).

```
Rework JC is created automatically when QC fails.
It appears with a RED banner in Glide and Lovable.

Auto-populated fields:
  is_rework = true
  original_jc_id = failed job card id
  rework_reason = QC failure reason
  production_stage = 'rework'
  title = "REWORK: [original title]"
  description = "QC Failed: [checkpoint that failed]
                  Fix required: [description]"

Rework time tracked separately:
  Rework hours NOT added to original job cost
  Rework cost = additional cost above BOM estimate
  Tracked as: rework_cost in WO job costing

Rework completion:
  On complete: triggers re-QC (new QC record)
  Cannot be marked complete without
  new QC initiated (PRD-11)
```

---

## 5. PRODUCTION STAGE FLOW

```
Every WO goes through these stages in order.
Not all stages apply to all furniture types.
Supervisor selects applicable stages when creating first
job card for a WO.

STANDARD STAGES FOR COUNTER/CABINET:
  1. Cutting       — plywood cut to size
  2. Edge Banding  — edges finished
  3. Drilling      — holes for hardware
  4. Assembly      — pieces joined
  5. Lamination    — laminate applied
  6. Hardware Fitting — hinges, channels, handles
  7. Quality Check — (PRD-11)
  8. Packaging     — wrap for delivery

STAGES FOR WORKSTATION:
  1. Cutting
  2. Edge Banding
  3. Drilling
  4. Assembly
  5. Finishing (polish/duco instead of lamination)
  6. Hardware Fitting
  7. Quality Check
  8. Packaging

STAGES FOR HOSPITAL FITOUT:
  1. Cutting
  2. Edge Banding
  3. Assembly
  4. Lamination
  5. Finishing
  6. Hardware Fitting
  7. Quality Check
  8. Packaging

Multiple carpenters can be on different stages
simultaneously for the same WO.
System tracks all stages independently.
```

---

## 6. LABOUR COST CALCULATION

```
Carpenter monthly salary: ₹25,000 (from AOP)
Working days per month: 26
Working hours per day: 9

Hourly rate = ₹25,000 ÷ 26 ÷ 9 = ₹106.84/hour

Labour cost per job card:
  = actual_hours × hourly_rate
  = actual_hours × (monthly_salary ÷ 26 ÷ 9)

Multiple carpenters on one JC:
  Total labour cost = sum of each carpenter's hours
  × their individual hourly rate

Labour cost allocated to WO:
  All JC labour costs for a WO summed = WO labour cost
  This updates wo_bom_items actual cost section
  Feeds into WO P&L (actual margin calculation)

Contractor carpenter:
  Daily rate from Vendor Master (TYPE-CARP)
  Hourly rate = daily_rate ÷ 9
  Payment through Accounts Payable (not payroll)
  Service Receipt Note raised (equivalent to GRN)
```

---

## 7. BUSINESS RULES

```
BR-01: Every carpenter must have a job card by 9 AM.
       System shows alert if any carpenter is
       present with no job card by 9:15 AM.

BR-02: Only present carpenters can be assigned
       job cards. Absent carpenters filtered out.

BR-03: EOD update must be submitted by 7 PM daily.
       System alerts Supervisor at 6:30 PM for
       any job cards without EOD update.

BR-04: Rework job cards display prominently in RED
       on Glide app and Lovable dashboard.
       Rework hours tracked separately from
       original production hours.

BR-05: Contractor carpenters appear in job card
       alongside permanent staff.
       Their cost goes through Accounts Payable
       not payroll.

BR-06: Job card cannot be created for a WO that
       has status: draft, pending_review,
       approved_pending_bom, or cancelled.
       Minimum status required: material_ready.

BR-07: Multiple job cards can exist for one WO
       (one per stage, one per day).
       All linked to same WO.

BR-08: If hours_worked > 9 on EOD update:
       OT approval flow triggered automatically.
       OT hours flagged for FM approval (PRD-10).

BR-09: Job card completion does not automatically
       mark WO as production_complete.
       Supervisor must explicitly mark WO stage
       complete and then WO as production_complete.

BR-10: Labour cost is calculated using actual hours
       from EOD updates and monthly salary rate.
       Rate stored in job_card_assignments.daily_rate
       (populated from profiles at time of assignment).

BR-11: Glide app is read-mostly. Carpenters can
       only write to: eod_updates and their own
       attendance confirmation.
       All other data is read-only for carpenters.

BR-12: Monthly OT cap: 26 hours per carpenter.
       System warns when carpenter approaches cap.
       (Full OT rules in PRD-10)
```

---

## 8. NOTIFICATIONS & ALERTS

```
Morning (9 AM):
  → Supervisor: "Today's job cards created for
    [X] carpenters. [Y] carpenters have no card yet."

Carpenter with no job card by 9:15 AM:
  → Supervisor: "Present but no job card:
    [carpenter names]. Please assign."

Job Card Created:
  → Carpenter sees on Glide immediately

Issue Flagged in EOD:
  → Supervisor + FM: "Issue flagged by [carpenter]
    on JC [number]: [issue type]
    WO: [wo_number] | [description]"

No EOD Update by 6:30 PM:
  → Supervisor: "EOD update pending for:
    [carpenter names] on [jc numbers]"

Job Card Complete:
  → Supervisor: "[Stage] complete for WO [number]
    by [carpenter]. [X/Y total stages done]"

WO All Stages Complete:
  → Supervisor + FM: "All production stages complete
    for WO [number]. Ready for QC."

Rework Job Card Created:
  → Supervisor + FM: "Rework required for WO [number].
    QC failed at: [checkpoint]"

Behind Schedule Alert:
  → Supervisor + FM: "WO [number] is behind schedule.
    [X]% complete, delivery in [Y] days."
```

---

## 9. TESTING CHECKLIST

**Job Card Creation:**
[ ] JC number generated correctly
[ ] Only present carpenters shown in assignment
[ ] Multiple carpenters can be assigned
[ ] Lead carpenter marking works
[ ] Job card visible in Glide immediately
[ ] WO progress card updates after JC created

**Attendance:**
[ ] Mark all present with one click
[ ] Individual status changes work
[ ] Absent carpenters filtered from JC assignment
[ ] Monthly summary calculates correctly

**EOD Updates:**
[ ] Supervisor can submit on behalf of carpenter
[ ] Carpenter can submit via Glide
[ ] qty_completed updates job card total
[ ] actual_hours accumulated correctly
[ ] Job card status auto-set to completed when done
[ ] OT flagged when hours > 9

**Labour Cost:**
[ ] Hourly rate = ₹25,000 ÷ 26 ÷ 9 = ₹106.84
[ ] Labour cost = actual_hours × hourly_rate
[ ] Multiple carpenters summed correctly
[ ] WO total labour cost accumulates

**Rework:**
[ ] Rework JC shows RED banner
[ ] Rework reason from QC visible
[ ] Rework hours tracked separately
[ ] Rework completion triggers re-QC

**Production Dashboard:**
[ ] Carpenter status board updates in real-time
[ ] WO progress shows correct stage breakdown
[ ] "X of Y items complete" calculation correct
[ ] Material pending items shown with PO details
[ ] Behind schedule WOs highlighted

**Glide App:**
[ ] Carpenter sees only own job cards
[ ] EOD update submits to Supabase
[ ] Attendance view works
[ ] Cannot see other carpenters' data (RLS)

---

## 10. INTEGRATION POINTS

```
PRD-02: Job cards linked to work_orders.id
         WO status updated when all stages complete

PRD-03: CR implementation note appears on active
         job card: "[CHANGE IMPLEMENTED — See CR]"

PRD-07: Contractor carpenter rates from
         organisations (vendor_type = contractual_carpenter)

PRD-08: Material status per item shown on WO
         production progress card
         Material issue linked to job card activity

PRD-10: EOD hours > 9 triggers OT approval flow
         OT hours stored in attendance table

PRD-11: Completed production triggers QC process
         QC failure creates rework job card

PRD-14: Attendance records feed payroll calculation
         Labour hours feed payslip generation

PRD-15: Labour efficiency KPI (sqft per carpenter-day)
         Rework rate per carpenter and per WO
         Stage-wise time analysis

PRD-16: Production dashboard reads from job_cards
         Carpenter status board on morning dashboard
         WO progress cards on main dashboard
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-02, PRD-07, PRD-08*
*Glide App: Separate build after Lovable ERP is stable*
*Next document: PRD-10 Overtime Management*
