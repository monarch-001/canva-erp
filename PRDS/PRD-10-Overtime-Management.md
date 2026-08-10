# PRD-10: OVERTIME MANAGEMENT
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
Controls all overtime and holiday/weekend work for factory
carpenters and staff. Every OT hour must be pre-approved by
the Factory Manager before the carpenter works it. No
self-declared overtime is ever accepted. OT is tracked
against monthly caps and feeds directly into payroll.

### Important: OT Rate is Flat, Not Premium
OT rate is ₹100/hour flat — NOT 1.5x the normal rate.
Normal hourly rate = ₹25,000 ÷ 26 days ÷ 9 hours = ₹106.84/hr
OT rate = ₹100/hour (lower than normal — intentional flat
attendance incentive, not a premium rate)

### Users of This Module
- Factory Manager: Approve all OT, view monthly caps, override
- Factory Supervisor: Submit OT requests, view team OT status
- Carpenter: View own OT approvals and history (Glide app)
- Others: No access

### Key Outcomes
- Zero self-declared or retrospective OT
- Monthly cap enforced per carpenter (26 hours/month)
- Holiday and weekend work tracked separately
- OT cost feeds into WO job costing and payroll
- FM can override cap with documented reason

---

## 2. DATABASE SCHEMA

### 2.1 ot_requests (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.ot_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  otr_number TEXT UNIQUE NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN (
    'daily_ot',      -- Regular weekday OT after 6 PM
    'holiday_work',  -- Work on public holiday
    'weekend_work'   -- Work on weekly off day
  )),
  carpenter_id UUID REFERENCES public.profiles(id) NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id),
  job_card_id UUID REFERENCES public.job_cards(id),
  request_date DATE NOT NULL,
  ot_start_time TIME NOT NULL,
  ot_end_time TIME,
  ot_hours_requested NUMERIC NOT NULL,
  ot_hours_approved NUMERIC,
  ot_rate NUMERIC NOT NULL DEFAULT 100,
  estimated_cost NUMERIC GENERATED ALWAYS AS
    (ot_hours_requested * 100) STORED,
  approved_cost NUMERIC GENERATED ALWAYS AS
    (COALESCE(ot_hours_approved, 0) * 100) STORED,
  reason TEXT NOT NULL,
  work_description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'completed'  -- OT done, hours confirmed
  )),
  requested_by UUID REFERENCES public.profiles(id) NOT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  actual_hours_worked NUMERIC,
  actual_cost NUMERIC GENERATED ALWAYS AS
    (COALESCE(actual_hours_worked, 0) * 100) STORED,
  carpenter_acknowledged BOOLEAN DEFAULT false,
  carpenter_acknowledged_at TIMESTAMPTZ,
  -- For holiday/weekend:
  advance_notice_given BOOLEAN DEFAULT false,
  carpenter_accepted BOOLEAN,
  carpenter_declined_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX otr_carpenter_idx
  ON public.ot_requests(carpenter_id);
CREATE INDEX otr_date_idx
  ON public.ot_requests(request_date);
CREATE INDEX otr_status_idx
  ON public.ot_requests(status);

ALTER TABLE public.ot_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on ot_requests"
ON public.ot_requests FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Supervisor can manage ot_requests"
ON public.ot_requests FOR ALL
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Carpenter can view own OT requests"
ON public.ot_requests FOR SELECT
USING (
  public.get_current_user_role() = 'carpenter'
  AND carpenter_id = auth.uid()
);
```

### 2.2 monthly_ot_summary (VIEW — not a table)

```sql
CREATE OR REPLACE VIEW public.monthly_ot_summary AS
SELECT
  carpenter_id,
  DATE_TRUNC('month', request_date) AS month,
  COUNT(*) AS total_requests,
  SUM(CASE WHEN status = 'approved' OR status = 'completed'
    THEN ot_hours_approved ELSE 0 END) AS hours_approved,
  SUM(CASE WHEN status = 'completed'
    THEN actual_hours_worked ELSE 0 END) AS hours_worked,
  SUM(CASE WHEN status = 'completed'
    THEN actual_cost ELSE 0 END) AS total_cost,
  26 - SUM(CASE WHEN status IN ('approved','completed')
    THEN ot_hours_approved ELSE 0 END) AS hours_remaining
FROM public.ot_requests
WHERE deleted_at IS NULL
GROUP BY carpenter_id, DATE_TRUNC('month', request_date);
```

### 2.3 Add OTR to numbering_counters

OTR number format: OTR-26-001
Already seeded in numbering_counters as 'OTR'.

---

## 3. OT RULES (LOCKED FROM DECISION LOG)

```
DAILY OT:
  Rate:              ₹100/hour flat
  Maximum per day:   3 hours
  Maximum per month: 26 hours per carpenter
  Approval:          FM must approve BEFORE carpenter stays
  No retrospective OT ever accepted

HOLIDAY / WEEKEND WORK:
  Rate:              ₹100/hour (same flat rate)
  Maximum hours:     Full shift allowed (no 3-hour cap)
  Approval:          FM mandatory — no auto-approve
  Notice:            24-hour advance notice to carpenter mandatory
  Carpenter right:   Can decline — no penalty (labour law compliance)
  System tracks:     Carpenter accepted / declined

MONTHLY CAP ENFORCEMENT:
  Hard cap: 26 OT hours per carpenter per month
  System WARNING at 20 hours: "Rajan: 20/26 OT hrs used"
  System BLOCKS at 26 hours: cannot approve more OT
  FM OVERRIDE: allowed with mandatory documented reason
  Override logged in audit_trail permanently
```

---

## 4. SCREENS & FLOWS

### 4.1 OT Dashboard (/overtime)

Access: FM (full), Supervisor (team view)

```
Page title: "Overtime Management"
Date: [This Month ▼]

SECTION 1: PENDING APPROVALS
  [Count] OT requests awaiting approval
  (shown at top — most urgent)

  Each pending request:
  ┌──────────────────────────────────────────────┐
  │ OTR-26-001 | Ramesh Kumar                   │
  │ Today — 6:00 PM to 9:00 PM (3 hours)        │
  │ WO: WO-CHH-26-001 — Assembly work           │
  │ Reason: Behind schedule, delivery tomorrow   │
  │ Est. Cost: ₹300                             │
  │ [Approve] [Reject]                           │
  └──────────────────────────────────────────────┘

SECTION 2: CARPENTER OT STATUS (this month)

  Table: one row per active carpenter

  Carpenter | Hours Used | Hours Left | Cap | Status
  ─────────────────────────────────────────────────
  Ramesh    |    18 hrs  |    8 hrs   | 26  | ● OK
  Suresh    |    24 hrs  |    2 hrs   | 26  | ⚠ Near cap
  Vikram    |    26 hrs  |    0 hrs   | 26  | 🔴 CAPPED
  Mohan     |     5 hrs  |   21 hrs   | 26  | ● OK

  Colour coding:
    Green:  < 20 hours used
    Amber:  20-25 hours used
    Red:    26 hours (capped — cannot approve more)
    Blue:   FM override applied

SECTION 3: OT HISTORY (this month)
  Filter: Carpenter / Status / Type
  All approved, rejected, completed OT this month
```

---

### 4.2 Submit OT Request

Triggered by: Supervisor (on behalf of carpenter)
OR: Triggered automatically when EOD hours > 9
Access: Supervisor, FM

```
This must be done BEFORE the carpenter works OT.
Not retrospective.

FORM FIELDS:

Request Type * (radio):
  ○ Daily OT (after 6 PM on working day)
  ○ Holiday Work (public holiday)
  ○ Weekend Work (weekly off day)

Carpenter * (dropdown — active carpenters only)
  System immediately shows:
    "OT this month: [X] / 26 hours"
    "Hours remaining: [Y]"
    If 0 remaining: RED warning
      "This carpenter has reached monthly cap.
       FM override required."

Date * (DATE — today or future only)
  If Holiday/Weekend: date picker shows calendar
  with holidays and weekly-off days highlighted

OT Start Time * (TIME — minimum 6:00 PM for daily OT)
OT End Time (TIME — optional, estimate)
Hours Requested * (NUMBER, max 3 for daily OT)
  For Holiday/Weekend: max = full shift (9 hours)
  System auto-calculates if start + end entered

Linked Work Order (search — optional but recommended)
Linked Job Card (auto-populates if WO selected)

Reason * (TEXTAREA)
  Placeholder: "Why is OT needed? Be specific."
  Examples: "Behind schedule — delivery tomorrow"
            "Complex cutting for irregular dimensions"

Work Description * (TEXTAREA)
  Placeholder: "What exactly will the carpenter work on?"

For Holiday/Weekend only:
  Advance Notice Confirmation:
    CHECKBOX: "I confirm 24-hour advance notice
               has been given to the carpenter"
    (mandatory — cannot submit without checking)

SUBMIT: [Submit for FM Approval]

ON SUBMIT:
  1. Check monthly cap:
     IF (hours_used + hours_requested) > 26:
       IF role = supervisor: BLOCK
         "Cannot submit — monthly cap exceeded.
          Only Factory Manager can override."
       IF role = FM: ALLOW with override flag
         Show extra confirmation:
         "This exceeds monthly cap. Provide reason:"
         Override reason: TEXTAREA (mandatory)
  
  2. Generate OTR number via generate_document_number
     ('OTR', '2526')
  
  3. INSERT into ot_requests
     status = 'pending'
  
  4. NOTIFY FM immediately:
     WhatsApp: "OT Request [otr_number]: Ramesh Kumar
       [X] hours on [date] for WO [wo_number].
       Reason: [reason]. Approve?"
     In-app notification also created

  5. Toast: "OT request [otr_number] submitted.
     Awaiting FM approval."
```

---

### 4.3 FM Approval Flow

Triggered by: Notification or /overtime dashboard
Access: FM only

```
FM sees full OT request detail:
  Carpenter name + monthly OT status
  Date, time, hours requested
  WO reference and job card
  Reason and work description
  Estimated cost: ₹[hours × 100]
  Cap status indicator

APPROVAL ACTIONS:

[Approve OT]:
  Hours to approve: NUMBER (default = hours_requested)
    FM can approve fewer hours than requested
  Notes (optional): TEXT
  [Approve] button

  ON APPROVE:
    UPDATE ot_requests SET
      status = 'approved',
      ot_hours_approved = [FM's approved hours],
      approved_by = auth.uid(),
      approved_at = NOW()
    
    UPDATE attendance for that carpenter/date:
      ot_hours = ot_hours_approved
      ot_approved = true
      ot_approved_by = FM uid
    
    Notify Supervisor: "OT approved for Ramesh Kumar —
      [X] hours on [date]. Cost: ₹[X×100]"
    
    For Holiday/Weekend: Notify Carpenter via
      Supervisor confirmation to carpenter directly
    
    Toast: "OT approved for [carpenter]"

[Reject OT]:
  Rejection reason * (TEXTAREA — mandatory)
  [Reject] button

  ON REJECT:
    UPDATE ot_requests SET
      status = 'rejected',
      rejection_reason = [reason],
      approved_by = auth.uid()
    
    Notify Supervisor: "OT request rejected for
      [carpenter]. Reason: [reason]"

[Approve with Override] (when cap exceeded):
  FM sees: "⚠️ This will exceed monthly cap of 26 hours"
  Override reason * (TEXTAREA — mandatory for audit)
  [Override and Approve] button

  ON OVERRIDE:
    Same as approve but override_reason logged
    Audit log entry created:
      "FM override of OT cap for [carpenter]
       on [date]. Reason: [override_reason]"
```

---

### 4.4 OT Completion Confirmation

After OT is done (next morning / same night):
Supervisor confirms actual hours worked.

```
Triggered by: Supervisor reviewing completed OT
Access: Supervisor, FM

For each approved OT (status = approved):
  Show: Approved hours vs space to enter actual hours

  Actual Hours Worked: NUMBER
    Cannot exceed approved hours
    (If more hours actually worked: new OT request needed)
  
  Notes (optional)

  [Confirm Completion] button

  ON CONFIRM:
    UPDATE ot_requests SET
      status = 'completed',
      actual_hours_worked = [actual hours],
      completed_at = NOW()
    
    UPDATE attendance:
      ot_hours = actual_hours_worked
    
    This feeds payroll calculation:
      OT pay for this carpenter this month +=
      actual_hours_worked × ₹100
    
    Toast: "OT confirmed for [carpenter] — [X] hours"
```

---

### 4.5 Holiday/Weekend Work Special Flow

Additional steps vs regular daily OT:

```
STEP 1: FM approves the request (as above)

STEP 2: System generates advance notice to carpenter
  (This is done through Supervisor in real life)
  System flags: "Advance notice must be given to
  [carpenter] at least 24 hours before [date]"
  
  Supervisor confirms: [I have informed the carpenter]
  Carpenter response tracked:
    [Carpenter Accepted] — work proceeds
    [Carpenter Declined] — cannot be forced
      Reason recorded (no penalty to carpenter)
      Supervisor must find alternate plan

STEP 3: On the day
  Attendance marked as: 'present' (holiday work)
  Job card created for this date (as normal)
  EOD update submitted as normal
  Hours may exceed 9 (full shift possible on holiday)

STEP 4: Completion confirmed by Supervisor

NOTE: Labour law compliance
  Carpenter cannot be penalised for declining
  holiday/weekend work. System records their
  decision but no impact on their attendance
  record or performance.
```

---

### 4.6 Carpenter View (Glide App)

Simple read-only view for carpenters:

```
SCREEN: My Overtime

This Month Summary:
  OT Hours Used: [X] / 26
  OT Earnings: ₹[X × 100]

Upcoming Approved OT:
  [Date] [Hours] [WO] [Status badge]

History (last 3 months):
  Table: Date | Type | Hours | Status | Earnings
```

---

## 5. BUSINESS RULES

```
BR-01: OT must be approved BEFORE the carpenter works it.
       No retrospective OT ever accepted.
       No self-declared OT from carpenter.
       Only Supervisor submits. Only FM approves.

BR-02: OT rate is ₹100/hour FLAT.
       NOT 1.5× normal rate.
       NOT formula-based.
       This is lower than normal hourly rate (₹106.84/hr).
       This is intentional — flat attendance incentive.

BR-03: Daily OT maximum: 3 hours per day per carpenter.
       OT can only start at or after 6:00 PM.
       Cannot be before end of regular shift.

BR-04: Monthly OT cap: 26 hours per carpenter.
       = approximately 1 hour per working day average.
       System warns at 20 hours: "6 hours remaining"
       System BLOCKS new OT requests at 26 hours.

BR-05: FM can override monthly cap.
       Override requires mandatory documented reason.
       Override logged permanently in audit_trail.
       Supervisor CANNOT override cap.

BR-06: Holiday and weekend work:
       Same rate as daily OT: ₹100/hour.
       No 3-hour cap — full shift allowed.
       24-hour advance notice to carpenter mandatory.
       Carpenter can decline — no penalty.
       Declination recorded but does not affect performance.

BR-07: If EOD update shows hours > 9 (triggering OT):
       System auto-creates OT request in 'pending' state.
       FM must still approve retrospectively in this case
       (exception to BR-01 — EOD-triggered requests only).
       Supervisor must justify why OT wasn't pre-approved.

BR-08: OT cost allocation:
       If WO linked: OT cost allocated to that WO's labour cost.
       If no WO linked: allocated to factory overhead.

BR-09: Contractor carpenters are NOT subject to OT rules.
       They are paid daily rate for any hours worked.
       Their overtime is handled via Accounts Payable.
       This module is for permanent carpenters only.

BR-10: OT approved hours are locked after FM approval.
       Actual hours worked can be less (but not more).
       If more hours needed: new OT request must be raised.

BR-11: All OT data feeds monthly payroll calculation.
       Total OT pay = sum of actual_hours_worked × ₹100
       for all completed OT in that month.

BR-12: Monthly cap resets on 1st of each month
       (or 1st working day if 1st is holiday).
       Previous month's OT cannot carry forward.
```

---

## 6. NOTIFICATIONS & ALERTS

```
OT Request Submitted:
  → FM (WhatsApp immediately):
    "OT Request OTR-26-001: [Carpenter] — [X] hours
     on [date] for WO [wo_number].
     Reason: [reason]
     Estimated cost: ₹[X×100]
     Please approve."

OT Approved:
  → Supervisor: "OT approved for [carpenter]:
    [X] hours on [date]. ₹[cost]"

OT Rejected:
  → Supervisor: "OT rejected for [carpenter].
    Reason: [rejection_reason]"

Carpenter Near Cap (20 hours):
  → FM + Supervisor: "[Carpenter] has used 20/26
    OT hours this month. 6 hours remaining."

Carpenter At Cap (26 hours):
  → FM + Supervisor: "[Carpenter] has reached
    monthly OT cap. No more OT this month
    without FM override."

Holiday Work — Advance Notice Reminder:
  → Supervisor (24 hours before):
    "Reminder: Inform [carpenter] about holiday
     work tomorrow. OTR-26-005 approved."

EOD Hours Exceeded 9:
  → FM: "EOD update from [carpenter] shows [X] hours.
    This exceeds 9-hour shift. Please review and
    approve retrospective OT if valid."

FM Override Used:
  → FM (confirmation): "Cap override logged for
    [carpenter]. Reason: [reason]. Audit trail updated."
```

---

## 7. TESTING CHECKLIST

**OT Request:**
[ ] OTR number generated: OTR-26-001
[ ] Monthly cap shown correctly per carpenter
[ ] Daily OT max 3 hours enforced
[ ] Holiday/weekend work: no 3-hour cap
[ ] 24-hour notice checkbox mandatory for holiday work
[ ] Supervisor cannot submit OT at cap (blocked)
[ ] FM can submit with override + reason
[ ] FM notified via WhatsApp on submission

**Approval:**
[ ] FM can approve fewer hours than requested
[ ] FM can reject with mandatory reason
[ ] FM override logs to audit trail
[ ] Attendance table updated on approval
[ ] Supervisor notified of approval/rejection

**Monthly Cap:**
[ ] Warning at 20 hours (amber)
[ ] Block at 26 hours (red, supervisor blocked)
[ ] FM override allows beyond 26 with reason
[ ] Cap resets on 1st of month

**Completion:**
[ ] Actual hours cannot exceed approved hours
[ ] Payroll cost calculated: actual_hours × ₹100
[ ] WO labour cost updated if WO linked
[ ] Attendance shows correct OT hours

**Holiday Work:**
[ ] Carpenter can decline without penalty
[ ] Declined recorded but no performance impact
[ ] Full shift (9 hours) allowed on holiday

**Glide App:**
[ ] Carpenter sees own OT history only
[ ] Monthly OT hours and earnings visible
[ ] Cannot see other carpenters' OT

---

## 8. INTEGRATION POINTS

```
PRD-09: EOD update hours > 9 triggers OT request
         Approved OT hours stored in attendance table
         Job card links to OT request for cost allocation

PRD-14: OT actual hours feed monthly payroll
         OT pay = sum(actual_hours_worked × ₹100)
         Shown on payslip as separate OT line

PRD-15: OT cost tracked per WO (labour cost variance)
         Monthly OT spend vs budget in MIS
         OT utilisation per carpenter

PRD-16: Dashboard shows: "X OT requests pending approval"
         Daily morning alert if pending OT requests
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-09*
*Key decision: OT rate = ₹100/hr FLAT (NOT 1.5x)*
*Source: Decision log Revision 10D.1 superseding Finding 5.6*
*Next document: PRD-11 Quality Check & Delivery*
