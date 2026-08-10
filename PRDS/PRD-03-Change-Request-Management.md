# PRD-03: CHANGE REQUEST MANAGEMENT
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
A Change Request (CR) is raised when a client needs to modify
an active Work Order mid-production. This includes dimension
changes, design changes, additional furniture items, or finish
changes. CRs have a three-tier approval system based on the
severity of the change. Every CR is fully tracked with an
audit trail linking back to the original Work Order.

### Users of This Module
- Site Manager: Raises CRs against their own WOs
- Factory Supervisor: Reviews and approves Tier 1 CRs
- Factory Manager: Approves Tier 2 CRs, co-approves Tier 3
- Super Admin: Co-approves Tier 3 CRs only

### Key Outcomes
- All mid-job changes are formally documented
- No verbal or WhatsApp-only change instructions
- Clear approval trail per change severity
- BOM and drawing versions updated on CR approval
- Delivery date impact tracked and communicated

---

## 2. DATABASE SCHEMA

### 2.1 change_requests (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cr_number TEXT UNIQUE NOT NULL,
  wo_id UUID REFERENCES public.work_orders(id) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'dimension_change',
    'finish_change',
    'additional_item',
    'design_change',
    'quantity_change',
    'other'
  )),
  tier TEXT CHECK (tier IN ('tier1', 'tier2', 'tier3')),
  description TEXT NOT NULL,
  reason TEXT NOT NULL,
  delivery_impact BOOLEAN DEFAULT false,
  delivery_impact_days INTEGER,
  cost_impact NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'supervisor_approved',
    'ip_approved',
    'dual_approved',
    'rejected',
    'implemented'
  )),
  raised_by UUID REFERENCES public.profiles(id) NOT NULL,
  supervisor_approved_by UUID REFERENCES public.profiles(id),
  supervisor_approved_at TIMESTAMPTZ,
  supervisor_notes TEXT,
  ip_approved_by UUID REFERENCES public.profiles(id),
  ip_approved_at TIMESTAMPTZ,
  ip_notes TEXT,
  cp_approved_by UUID REFERENCES public.profiles(id),
  cp_approved_at TIMESTAMPTZ,
  cp_notes TEXT,
  rejected_by UUID REFERENCES public.profiles(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  implemented_at TIMESTAMPTZ,
  implemented_by UUID REFERENCES public.profiles(id),
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX cr_wo_idx ON public.change_requests(wo_id);
CREATE INDEX cr_status_idx ON public.change_requests(status);
CREATE INDEX cr_raised_by_idx ON public.change_requests(raised_by);

-- RLS
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

-- Factory Manager: full access
CREATE POLICY "FM full access on CRs"
ON public.change_requests FOR ALL
USING (public.is_incoming_partner());

-- Supervisor: view all + update (approve Tier 1)
CREATE POLICY "Supervisor can view all CRs"
ON public.change_requests FOR SELECT
USING (public.get_current_user_role() = 'supervisor');

CREATE POLICY "Supervisor can update CRs"
ON public.change_requests FOR UPDATE
USING (public.get_current_user_role() = 'supervisor');

-- Site Manager: view and create own WO CRs only
CREATE POLICY "Site Manager can view own CRs"
ON public.change_requests FOR SELECT
USING (
  public.get_current_user_role() = 'chhabee_spoc'
  AND raised_by = auth.uid()
);

CREATE POLICY "Site Manager can raise CRs"
ON public.change_requests FOR INSERT
WITH CHECK (
  public.get_current_user_role() IN (
    'chhabee_spoc', 'supervisor', 'incoming_partner'
  )
);

-- Super Admin: view and approve Tier 3 only
CREATE POLICY "Super Admin can view CRs"
ON public.change_requests FOR SELECT
USING (
  public.get_current_user_role() = 'chhabee_partner'
  AND EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE id = wo_id
    AND client_type = 'chhabee'
  )
);

CREATE POLICY "Super Admin can update Tier 3 CRs"
ON public.change_requests FOR UPDATE
USING (
  public.get_current_user_role() = 'chhabee_partner'
  AND tier = 'tier3'
);
```

---

## 3. CHANGE REQUEST TIERS

### Tier 1 — Minor (Supervisor approves, FM notified only)
```
Criteria:
  Dimension change ≤ 10% on any single axis
  Same-family finish change (e.g. same laminate brand,
    different shade)
  Minor material substitution (equivalent spec)

Approval path:
  Site Manager raises → Supervisor approves → Implemented
  FM notified (no action needed from FM)

SLA: Supervisor must respond within 4 hours
```

### Tier 2 — Significant (FM approval required)
```
Criteria:
  Dimension change > 10% on any axis
  Structural change to existing item
  Addition of item within existing scope
  Material change affecting cost significantly
  Finish change to different product family

Approval path:
  Site Manager raises → FM approves → Implemented
  (Supervisor is notified but not in approval chain)

SLA: FM must respond within 4 hours
```

### Tier 3 — Major (FM + Super Admin both must approve)
```
Criteria:
  Entirely new furniture item added to project
  Full design change (new drawing required)
  Change that extends delivery date by > 3 days
  Change that increases WO value by > 20%

Approval path:
  Site Manager raises → FM approves → Super Admin approves
  → Implemented
  Both must approve. Either can reject.

SLA: Each approver has 4 hours
```

---

## 4. CR NUMBER FORMAT

```
Format: CR-[WO_NUMBER]-[SEQ]
Example: CR-WO-CHH-26-001-01

Sequence is per WO (not global).
First CR on a WO = 01
Second CR on same WO = 02
```

Add to numbering_counters with doc_type pattern:
```sql
-- CR numbers are generated per WO
-- Store as: CR_[wo_number] in numbering_counters
-- Or generate in application logic:
  SELECT COUNT(*) + 1 FROM change_requests
  WHERE wo_id = [wo_id]
  Then format: CR-[wo_number]-[COUNT:02d]
```

---

## 5. SCREENS & FLOWS

### 5.1 Change Request List (Tab on WO Detail)

Add a 4th tab "Change Requests" on /work-orders/:id

```
TAB: Change Requests

HEADER ROW:
  "Change Requests ([count])"
  [+ Raise Change Request] button
    Visible to: FM, Supervisor, Site Manager (own WOs)
    Hidden if WO status = financially_closed or cancelled

CR LIST:
  Each CR card shows:
    CR Number (bold)
    Change Type (human-readable label)
    Tier badge:
      Tier 1 = grey "TIER 1"
      Tier 2 = amber "TIER 2"
      Tier 3 = red "TIER 3"
    Description (first 100 chars, truncated)
    Status badge (see status colours below)
    Raised by [name] on [date]
    [View Details] button

CR Status badge colours:
  pending           → amber
  supervisor_approved → blue
  ip_approved       → blue
  dual_approved     → green
  rejected          → red
  implemented       → dark green

Empty state:
  "No change requests on this work order."
```

---

### 5.2 Raise Change Request (Modal)

Triggered by: "+ Raise Change Request" button
Access: FM, Supervisor, Site Manager (own WOs only)

```
FORM FIELDS:

Change Type * (dropdown)
  Dimension Change
  Finish / Material Change
  Additional Item (new piece of furniture)
  Design Change (new drawing needed)
  Quantity Change
  Other

Description * (TEXTAREA)
  Placeholder: "Describe exactly what needs to change"
  Min 20 chars

Reason * (TEXTAREA)
  Placeholder: "Why is this change needed?"
  Min 10 chars

Does this affect delivery date? (TOGGLE, default OFF)
  If ON, show:
    Estimated delay (days): NUMBER input

Drawing upload (shown if change_type = design_change
  or dimension_change)
  File upload (PDF, JPG, PNG, DWG, DXF, max 50MB)
  Label: "Upload revised drawing"
  Helper: "Required for design and dimension changes"

TIER AUTO-SUGGESTION:
  System suggests tier based on change_type:
    dimension_change → suggest Tier 1 or 2
      (Supervisor can upgrade to Tier 2 or 3)
    finish_change → suggest Tier 1
    additional_item → suggest Tier 3
    design_change → suggest Tier 3
    quantity_change → suggest Tier 2
    other → suggest Tier 2

  Show suggested tier with explanation:
    "Suggested: Tier 2 — Significant Change
     This requires Factory Manager approval."

  FM and Supervisor can manually change tier.
  Site Manager cannot change tier.

SUBMIT BUTTON: "Raise Change Request"

ON SUBMIT:
  1. Validate all required fields
  2. Generate CR number:
     CR-[wo_number]-[seq (zero-padded 2 digits)]
  3. If drawing uploaded: upload to wo-drawings bucket
     path: [wo_id]/cr/[cr_number]-[filename]
  4. INSERT into change_requests
  5. If tier = tier1:
     Notify Supervisor + FM
  6. If tier = tier2:
     Notify FM
  7. If tier = tier3:
     Notify FM + Super Admin
  8. Success toast:
     "Change Request [cr_number] raised.
      Awaiting [role] approval."
  9. Close modal, refresh CR tab
```

---

### 5.3 Change Request Detail (Modal or Page)

Triggered by: "View Details" on CR card

```
HEADER:
  CR Number (bold, large)
  WO Reference (clickable link to WO)
  Status badge
  Tier badge

SECTION: Change Details
  Change Type
  Description
  Reason
  Delivery Impact: Yes / No
    If Yes: "Estimated delay: [X] days"
  Cost Impact: ₹[amount] (if calculated)
  Raised by [name] on [date/time]

SECTION: Drawing (if uploaded)
  Show drawing version
  [Download Drawing] button

SECTION: Approval Trail
  Timeline showing:
    CR Raised — [name] — [date/time]
    [If tier1+] Supervisor Review:
      Pending / Approved by [name] on [date]
      Supervisor notes (if any)
    [If tier2+] Factory Manager:
      Pending / Approved by [name] on [date]
      FM notes (if any)
    [If tier3] Super Admin:
      Pending / Approved by [name] on [date]
      Super Admin notes (if any)
    Implemented: [date] (if implemented)

SECTION: Actions (role-based)

  For Tier 1 — Supervisor approving:
    [Status = pending]
    Notes (TEXTAREA, optional)
    [Approve] [Reject] buttons

  For Tier 2 — FM approving:
    [Status = pending]
    Notes (TEXTAREA, optional)
    [Approve] [Reject] buttons

  For Tier 3 — FM approving first:
    [Status = pending]
    Notes (TEXTAREA, optional)
    [Approve] [Reject] buttons

  For Tier 3 — Super Admin approving second:
    [Status = ip_approved]
    Notes (TEXTAREA, optional)
    [Approve] [Reject] buttons

  For FM after dual_approved:
    [Mark as Implemented] button
    (Confirms change has been incorporated)
```

---

### 5.4 Approval Flows

**Tier 1 Approval (Supervisor):**
```
ON APPROVE:
  1. UPDATE change_requests SET
       status = 'supervisor_approved',
       supervisor_approved_by = auth.uid(),
       supervisor_approved_at = NOW(),
       supervisor_notes = [notes],
       version = version + 1
  2. Notify FM: "CR [number] approved by Supervisor"
  3. Notify Site Manager: "Your CR [number] has been
     approved. Change is being implemented."
  4. Toast: "Change Request approved"

ON REJECT:
  1. rejection_reason is REQUIRED
  2. UPDATE change_requests SET
       status = 'rejected',
       rejected_by = auth.uid(),
       rejected_at = NOW(),
       rejection_reason = [reason],
       version = version + 1
  3. Notify Site Manager: "CR [number] rejected.
     Reason: [reason]"
  4. Toast: "Change Request rejected"
```

**Tier 2 Approval (FM):**
```
ON APPROVE:
  1. UPDATE change_requests SET
       status = 'ip_approved',
       ip_approved_by = auth.uid(),
       ip_approved_at = NOW(),
       ip_notes = [notes],
       version = version + 1
  2. Notify Supervisor: "CR [number] approved by FM.
     Please implement the change."
  3. Notify Site Manager: "Your CR [number] approved."
  4. Toast: "Change Request approved"
```

**Tier 3 Approval (FM first, then Super Admin):**
```
FM APPROVES (first step):
  UPDATE status = 'ip_approved'
  Notify Super Admin: "CR [number] needs your approval"

SUPER ADMIN APPROVES (second step):
  UPDATE status = 'dual_approved'
  cp_approved_by, cp_approved_at, cp_notes
  Notify Supervisor + Site Manager

EITHER PARTY REJECTS:
  status = 'rejected'
  Full rejection reason mandatory
  Both parties and Site Manager notified
```

**Mark as Implemented (FM):**
```
After approval (any tier):
  [Mark as Implemented] button visible to FM
  
ON CLICK:
  If new drawing was uploaded with CR:
    UPDATE wo_drawings SET is_current = false
      WHERE wo_id = [wo_id]
    INSERT new drawing as is_current = true
    New version = auto-increment (v1.0 → v1.1)
  
  If delivery_impact = true:
    UPDATE work_orders SET
      committed_delivery_date = committed_delivery_date
        + delivery_impact_days
    Notify Site Manager of revised delivery date
  
  UPDATE change_requests SET
    status = 'implemented',
    implemented_at = NOW(),
    implemented_by = auth.uid()
  
  Insert into wo_status_history:
    reason = "Change Request [cr_number] implemented"
  
  Toast: "Change Request marked as implemented"
```

---

### 5.5 Change Request List Page (/change-requests)

Standalone page for FM and Supervisor to see all CRs
across all Work Orders.

```
Access: FM, Supervisor only

Page title: "Change Requests"

FILTERS:
  Status (All / Pending / Approved / Rejected / Implemented)
  Tier (All / Tier 1 / Tier 2 / Tier 3)
  WO Number (search)
  Date range

TABLE COLUMNS:
  CR Number
  WO Number (link to WO)
  Change Type
  Tier badge
  Status badge
  Raised By
  Raised Date
  Pending Approval From
  Actions

Pending Approval From column shows:
  "Supervisor" (Tier 1, status = pending)
  "Factory Manager" (Tier 2, status = pending)
  "Factory Manager" (Tier 3, status = pending)
  "Super Admin" (Tier 3, status = ip_approved)
  "—" (if no action needed)

Sort default: pending CRs first, then by created_at desc
```

---

## 6. BUSINESS RULES

```
BR-01: CR number format: CR-[WO_NUMBER]-[SEQ]
       Sequence is per WO. First CR on WO = 01.

BR-02: CR can only be raised on WOs with status
       between pending_review and delivered_confirmed.
       Cannot raise CR on draft, cancelled, or
       financially_closed WOs.

BR-03: Site Manager can only raise CRs on their
       own Work Orders.

BR-04: Tier classification is suggested by system
       but can be changed by Supervisor or FM.
       Site Manager cannot change tier.

BR-05: Rejection requires a mandatory reason.
       No rejection without documented reason.

BR-06: For Tier 3, BOTH FM and Super Admin must
       approve. One approval is not sufficient.
       If FM approves but Super Admin rejects,
       status = rejected.

BR-07: A CR must be Implemented before a new CR
       can be raised on the same WO.
       (One active CR per WO at a time)

BR-08: If CR changes delivery date, committed date
       on WO is automatically updated on implementation.

BR-09: If a new drawing is attached to CR and CR is
       implemented, the CR drawing becomes the new
       current drawing on the WO (version incremented).
       Old drawing is archived, not deleted.

BR-10: Production can continue during Tier 1 CR review.
       For Tier 2 and 3: Supervisor decides whether
       to pause or continue production.
       Decision is logged as a note on the CR.

BR-11: Implemented CRs cannot be reversed.
       If the change needs to be undone, a new CR
       must be raised.

BR-12: Cost impact field is calculated by FM
       when reviewing. Not auto-calculated.

BR-13: If WO status is in_production and CR is
       Tier 2 or 3, system shows warning:
       "Production is in progress. Consider whether
       to pause production pending CR approval."
```

---

## 7. NOTIFICATIONS & ALERTS

```
CR Raised (Tier 1):
  → Supervisor: "CR [number] raised on WO [number].
    Needs your review."
  → FM: "CR [number] raised (Tier 1 — minor change)"

CR Raised (Tier 2):
  → FM: "CR [number] raised on WO [number].
    Needs your approval."

CR Raised (Tier 3):
  → FM + Super Admin: "CR [number] raised on WO [number].
    Major change — needs dual approval."

CR Approved (any tier):
  → Site Manager: "Your CR [number] has been approved.
    Change will be implemented."
  → Supervisor: "CR [number] approved. Please implement."

CR Rejected:
  → Site Manager: "CR [number] rejected.
    Reason: [rejection_reason]"

CR Implemented:
  → Site Manager: "CR [number] has been implemented
    on WO [number]."
  → If delivery date changed:
    → Site Manager: "Delivery date updated to [new_date]
      due to CR [number]"

Pending CR > 4 hours:
  → Approver: "CR [number] has been waiting for your
    approval for [X] hours."
```

---

## 8. TESTING CHECKLIST

**CR Creation:**
[ ] CR number format correct (CR-WO-CHH-26-001-01)
[ ] Sequence increments per WO (not globally)
[ ] Site Manager can raise CR on own WO only
[ ] Tier suggestion appears based on change type
[ ] Drawing upload works for design_change type
[ ] CR saved to Supabase (verify in Table Editor)
[ ] Correct parties notified on creation

**Tier 1 Flow:**
[ ] Supervisor sees CR in pending state
[ ] Supervisor can approve with notes
[ ] Supervisor can reject with mandatory reason
[ ] FM notified (no action needed from FM)
[ ] Site Manager notified of outcome
[ ] Status updates correctly in database

**Tier 2 Flow:**
[ ] Only FM sees approve/reject buttons
[ ] Supervisor does not have approve button
[ ] FM approval moves status to ip_approved
[ ] Site Manager and Supervisor notified

**Tier 3 Flow:**
[ ] FM approves first → status = ip_approved
[ ] Super Admin sees approve button only after FM approval
[ ] Both approve → status = dual_approved
[ ] Either rejects → status = rejected
[ ] Full dual approval trail visible

**Implementation:**
[ ] Mark Implemented button visible to FM only
[ ] Drawing updated to new version if drawing attached
[ ] Delivery date updated on WO if impact selected
[ ] Status changes to implemented
[ ] Implemented CR linked in WO status history

**Business Rules:**
[ ] Cannot raise CR on cancelled WO
[ ] Cannot raise CR on financially_closed WO
[ ] Two active CRs not allowed on same WO
[ ] Rejection without reason blocked

---

## 9. INTEGRATION POINTS

```
PRD-02: Change Requests are raised against work_orders.id
         CR implementation may update WO status and fields
         CR drawing updates wo_drawings table

PRD-05: CR implementation may trigger BOM revision
         New materials may need to be ordered

PRD-08: CR may affect material reservations
         Additional materials may be needed

PRD-09: CR implementation creates a note on active
         job card: "[CHANGE IMPLEMENTED] See CR [number]"

PRD-16: Dashboard shows: "X CRs pending your approval"
         Urgent flag for CRs > 4 hours old
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-01, PRD-02*
*Next document: PRD-04 Quotation Module*
