# PRD-16: DASHBOARD & NOTIFICATIONS
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
The Dashboard is the first screen every user sees after
login. It gives each role a personalised, real-time view
of what matters most to them — alerts requiring action,
production status, financial snapshot, and this week's
schedule. The Notifications system ensures the right
person is alerted at the right time across in-app and
WhatsApp channels.

### Design Principle
Every dashboard section answers one question:
"What do I need to do RIGHT NOW?"
Not what happened historically — that is MIS (PRD-15).
The dashboard is operational, not analytical.

### Users
- Factory Manager: Full dashboard — all 4 sections
- Factory Supervisor: Production + alerts (no finance)
- Site Manager: Own WO status only
- Super Admin: Chhabee WO summary only
- Carpenter: Glide app only (no web dashboard)

---

## 2. NO NEW TABLES NEEDED

All dashboard data reads from existing tables.
One new table for notification log:

### 2.1 notification_log (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES public.profiles(id),
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN (
    'in_app', 'whatsapp', 'email'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  reference_type TEXT,  -- 'work_order', 'po', 'invoice' etc.
  reference_id UUID,    -- ID of the referenced entity
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent' CHECK (
    delivery_status IN ('sent', 'delivered', 'failed')
  ),
  suppressed BOOLEAN DEFAULT false,
  suppressed_by UUID REFERENCES public.profiles(id),
  suppressed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX notif_recipient_idx
  ON public.notification_log(recipient_id);
CREATE INDEX notif_read_idx
  ON public.notification_log(is_read);
CREATE INDEX notif_type_idx
  ON public.notification_log(notification_type);
CREATE INDEX notif_sent_idx
  ON public.notification_log(sent_at);

ALTER TABLE public.notification_log
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM sees all notifications"
ON public.notification_log FOR ALL
USING (public.is_incoming_partner());

CREATE POLICY "Users see own notifications"
ON public.notification_log FOR SELECT
USING (recipient_id = auth.uid());

CREATE POLICY "Users can mark own as read"
ON public.notification_log FOR UPDATE
USING (recipient_id = auth.uid());
```

---

## 3. FACTORY MANAGER DASHBOARD

Route: /dashboard (default after login for FM)
Mobile-first — FM primarily views on phone.

### Layout Structure

```
HEADER BAR:
  "Good morning, Gurdev" (time-aware greeting)
  Date: Tuesday, 19-Aug-26
  🔔 [X] (unread notification count badge)

SECTION 1: ALERTS (TOP — most critical)
SECTION 2: PRODUCTION STATUS
SECTION 3: FINANCIAL SNAPSHOT
SECTION 4: THIS WEEK
```

---

### Section 1: ALERTS (Actions Required Today)

```
This section appears ONLY if there are pending actions.
If nothing pending: "All clear ✓ No actions needed"

Sorted by urgency (Critical → High → Normal)

ALERT TYPES (with icons):

🔴 CRITICAL ALERTS:
─────────────────────────────────────────────────
  WO BLOCKED:
    "WO-CHH-26-001 BLOCKED — Plywood not received.
     Expected: PO-26-003 due yesterday.
     [Contact Vendor] [View WO]"

  MACHINE BREAKDOWN (from job card issue flag):
    "Edge banding machine flagged as breakdown
     by Ramesh Kumar. [View Issue] [Call Mechanic]"

  OVERDUE INVOICE (> 30 days):
    "INV-B2B-26-001 | WeWork | ₹84,000 | 38 days overdue
     [Send Reminder] [Call Client] [View Invoice]"

⚠️ HIGH PRIORITY ALERTS:
─────────────────────────────────────────────────
  OT APPROVAL PENDING:
    "OT Request OTR-26-005: Ramesh Kumar
     3 hours today for WO-CHH-26-001.
     [Approve] [Reject]"

  PO PENDING APPROVAL:
    "PO-26-008: Greenlam Laminates ₹43,500
     Raised by Gaurav. Required by 22-Aug.
     [Approve] [View PO]"

  QC PASSED — DISPATCH APPROVAL NEEDED:
    "WO-CHH-26-003 passed QC. Ready to dispatch.
     [Approve Dispatch] [View QC Record]"

  WO DUE TOMORROW:
    "WO-B2B-26-001 delivery tomorrow (20-Aug).
     Status: QC Passed. Create challan?
     [Create Challan] [View WO]"

ℹ️ INFORMATIONAL:
─────────────────────────────────────────────────
  BOM SUBMITTED FOR APPROVAL:
    "BOM for WO-CHH-26-005 submitted by Gaurav.
     [Review BOM]"

  PR PENDING APPROVAL:
    "PR-26-012: 50 sheets 18mm Plywood ₹92,500
     Required by 25-Aug. [Approve] [View PR]"

  COMPLAINT RAISED:
    "Complaint CPL-26-001 raised by Chhabee SPOC
     on WO-CHH-26-002. [Review Complaint]"

  LOW STOCK:
    "Edge tape (MAT-EDT-001): 2 rolls remaining.
     Reorder level: 5 rolls. [Raise PR]"

  TDS CERTIFICATE DUE:
    "Form 16A from Chhabee due by 15-Oct-26.
     Q1 TDS: ₹4,200. [View TDS Tracker]"

ACTION BUTTONS:
  [Approve] [Reject] [View] [Dismiss] on each alert
  Dismiss requires confirmation (not dismissable accidentally)
  Dismissed alerts archived (not deleted)
```

---

### Section 2: PRODUCTION STATUS

```
TODAY'S PRODUCTION SNAPSHOT:

CARPENTER STATUS (grid — 3 columns on mobile):

  ┌──────────────────┐  ┌──────────────────┐
  │ Ramesh Kumar     │  │ Suresh Yadav     │
  │ ● Present        │  │ ● Present        │
  │ WO-CHH-26-001   │  │ WO-B2B-26-001   │
  │ Assembly         │  │ Cutting          │
  │ ██████░  2/3 ✓  │  │ ░░░░░░  0/5 ⚠️  │
  └──────────────────┘  └──────────────────┘

  ┌──────────────────┐  ┌──────────────────┐
  │ Vikram Singh     │  │ Mohan Lal        │
  │ ✗ Absent         │  │ ● Present        │
  │ No task today    │  │ WO-CHH-26-001   │
  │                  │  │ Edge Banding     │
  │                  │  │ ████░░  3/5 ✓   │
  └──────────────────┘  └──────────────────┘

Status card colours:
  Green border: On track (progress ≥ expected)
  Amber border: Slightly behind
  Red border: Significantly behind or blocked
  Grey border: Absent

Tap any card → jump to that carpenter's job card

ACTIVE WO SUMMARY:
  Active WOs in production: 5
  Deliveries today: 1 (WO-CHH-26-002)
  Deliveries tomorrow: 2
  WOs at risk (behind schedule): 1

[View Full Production Board] → /production
```

---

### Section 3: FINANCIAL SNAPSHOT (FM only)

```
MTD SNAPSHOT (Month to Date):

  Revenue Billed:      ₹1,42,000
  AOP Target:          ₹20,00,000
  Achievement:              7.1%
  On track: ⚠️ Behind (Week 1 of 4 — expected)

  ┌─────────────────────────────────────────────┐
  │ RECEIVABLES                                  │
  │ Outstanding: ₹3,65,000                      │
  │   0-30 days: ₹2,45,000 (67%) ✓             │
  │   31-60 days:   ₹80,000 (22%) ✓            │
  │   60+ days:     ₹40,000 (11%) ⚠️           │
  └─────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────┐
  │ PAYABLES DUE THIS WEEK                      │
  │ Greenlam (PO-26-003): ₹43,500 | Due 20-Aug │
  │ Ramesh Hardware:       ₹12,800 | Due 22-Aug │
  │ TOTAL THIS WEEK:       ₹56,300             │
  └─────────────────────────────────────────────┘

  Bank Balance (last updated): ₹3,74,000
  [Update Balance]

[View Full Finance] → /finance
[View MIS Reports] → /mis
```

---

### Section 4: THIS WEEK

```
WEEK OF 19-AUG TO 24-AUG 2026:

DELIVERIES:
  ✓ 20-Aug: WO-CHH-26-001 (Starbucks Saket) — Ready
  ✓ 22-Aug: WO-B2B-26-001 (WeWork Cyber City)
             ⚠️ QC pending — needs inspection today
  ○ 24-Aug: WO-CHH-26-005 — In production (3 days left)

MATERIAL EXPECTED:
  20-Aug: PO-26-003 — Greenlam 100 sheets (Plywood)
  21-Aug: PO-26-004 — Ramesh Hardware (Hinges × 24)

LOW STOCK THIS WEEK:
  Edge tape: 2 rolls left (reorder: 5 rolls)
  Fevicol: 1 tin left (reorder: 3 tins)
  [Raise PR for Both]

PAYROLL REMINDER:
  Payroll for August due in 12 days (31-Aug)
  [Process Payroll]

GST REMINDER (if approaching):
  GSTR-1 due in 8 days (11-Sep)
  [Send data to CA]
```

---

## 4. FACTORY SUPERVISOR DASHBOARD

Route: /dashboard (Supervisor sees this after login)

```
HEADER:
  "Good morning, Gaurav — 19-Aug-26"

SECTION 1: PENDING ACTIONS (Supervisor-specific)
  BOM reviews needed
  OT requests to submit
  EOD updates pending
  GRN inspections due

SECTION 2: TODAY'S PRODUCTION
  Same carpenter status grid as FM view
  But: No financial data shown anywhere

SECTION 3: TODAY'S SCHEDULE
  Which WOs need what done today
  Deliveries to prepare
  Materials expected

SECTION 4: QUICK ACTIONS
  [Mark Attendance] → /payroll/attendance
  [Create Job Card] → /production/job-cards/new
  [Record GRN] → /inventory/grn/new
  [Submit OT Request] → /overtime

NOTE: Supervisor sees NO financial data.
No revenue, no costs, no margins.
Only production and operations.
```

---

## 5. SITE MANAGER DASHBOARD

Route: /dashboard (Site Manager after login)

```
SIMPLE VIEW — their WOs only:

MY WORK ORDERS:
  Card for each active WO:
    WO Number | Description
    Status badge (colour coded)
    Committed delivery date
    Days remaining indicator

  ┌─────────────────────────────────────────────┐
  │ WO-CHH-26-001 | Reception Counter           │
  │ Status: IN PRODUCTION ●                     │
  │ Delivery committed: 25-Aug-26               │
  │ 6 days remaining ✓                          │
  └─────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────┐
  │ WO-CHH-26-003 | Kitchen Counter             │
  │ Status: MATERIAL PENDING ⚠️                 │
  │ Delivery committed: 28-Aug-26               │
  │ 9 days remaining                            │
  │ ⚠️ Plywood awaited (PO placed)             │
  └─────────────────────────────────────────────┘

QUICK ACTIONS:
  [+ Raise New Work Order]
  [Raise Change Request] (on any active WO)

No production details, no costs, no financials.
```

---

## 6. SUPER ADMIN DASHBOARD

Route: /dashboard (Super Admin after login)

```
CHHABEE WO SUMMARY:

  OVERVIEW CARDS:
    Active WOs: [X]
    Delivered This Month: [X]
    Pending Delivery: [X]

  WO STATUS TABLE:
    WO No | Description | Status | Committed Date |
    Days Left/Overdue

  Filter: Status | Date range

  REVENUE SUMMARY (Chhabee stream only):
    Billed this month: ₹X
    Outstanding: ₹X
    Collected: ₹X

  NO: costs, margins, B2B/D2C data,
      payroll, inventory, other clients
```

---

## 7. IN-APP NOTIFICATION SYSTEM

### Notification Bell (Top Right)

```
Bell icon with unread count badge.
Click → dropdown showing last 20 notifications.

NOTIFICATION CARD FORMAT:
  [Icon] Title
  Brief description (max 2 lines)
  [Entity reference] — linked
  [Time ago] — "2 hours ago"
  [Mark Read] button

NOTIFICATION TYPES AND ICONS:
  🔴 WO Blocked / Critical Alert
  ⚠️ Approval Needed (OT, PO, BOM, Dispatch)
  📦 Material / GRN updates
  💰 Invoice / Payment alerts
  🚚 Delivery updates
  ✅ Completed actions (QC passed, payment received)
  ℹ️ Informational (reminders, summaries)

MARK ALL AS READ:
  Button at top of dropdown.

NOTIFICATION PREFERENCES:
  FM can configure which notifications to receive
  in Settings → Notification Preferences.
  Cannot disable Critical alerts (🔴).
```

---

## 8. COMPLETE NOTIFICATION CATALOGUE

Every notification in the system — what triggers it,
who receives it, and through which channel.

### Work Order Notifications

```
TRIGGER → RECIPIENT → CHANNEL → MESSAGE

WO created by SPOC:
  → FM: in-app
    "New WO [number] raised by [SPOC name].
     Review needed."

WO sent back by Supervisor:
  → SPOC: in-app
    "WO [number] sent back for revision.
     Please update and resubmit."

WO approved by FM:
  → SPOC: in-app + WhatsApp
    "Your WO [number] has been approved.
     Committed delivery: [date]"

WO cancelled:
  → SPOC: in-app + WhatsApp
    "WO [number] has been cancelled.
     Reason: [reason]"

WO delivery due in 2 days:
  → FM + Supervisor: in-app
    "WO [number] delivery due 20-Aug.
     Current status: [status]"

WO delivered but unconfirmed (> 24 hours):
  → FM: in-app
    "WO [number] delivered but not confirmed
     by client. Follow up needed."

WO delivered confirmed:
  → FM: in-app
    "WO [number] confirmed by [SPOC name].
     Ready to invoice."

WO financially closed:
  → FM: in-app
    "WO [number] financially closed.
     Final margin: [X]%"
```

### BOM Notifications

```
BOM submitted:
  → FM: in-app
    "BOM for WO [number] submitted by [supervisor].
     Review needed."

BOM approved:
  → Supervisor: in-app + WhatsApp
    "BOM approved for WO [number].
     [X] items available, [Y] items need procurement."

BOM sent back:
  → Supervisor: in-app
    "BOM revision needed for WO [number].
     Reason: [reason]"

All materials available (after stock check):
  → Supervisor: in-app + WhatsApp
    "All materials ready for WO [number].
     Production can start."

Material shortage (after stock check):
  → FM + Supervisor: in-app + WhatsApp
    "Material shortage for WO [number]:
     [list of short items]"
```

### Procurement Notifications

```
PR submitted (normal):
  → FM: in-app
    "PR [number] submitted by [supervisor].
     [material] × [qty]. Required: [date]"

PR submitted (URGENT):
  → FM: in-app + WhatsApp IMMEDIATELY
    "🚨 URGENT PR [number]: [material] needed
     by [date] (< 2 days). Please approve now."

PR approved:
  → Supervisor: in-app
    "PR [number] approved. Raise PO."

PR rejected:
  → Supervisor: in-app
    "PR [number] rejected. Reason: [reason]"

PO pending approval:
  → FM: in-app
    "PO [number] ₹[amount] pending your approval."

PO pending second approval (> ₹50K):
  → Super Admin: in-app
    "PO [number] ₹[amount] approved by FM.
     Needs your approval too."

PO approved:
  → Supervisor: in-app
    "PO [number] approved. Send to vendor."

PO not acknowledged by vendor (4 hours):
  → FM + Supervisor: in-app + WhatsApp
    "Vendor hasn't acknowledged PO [number] in
     4 hours. Follow up with [vendor name]."

Delivery overdue from vendor:
  → FM + Supervisor: in-app
    "PO [number] expected on [date] — not received.
     Contact [vendor]."
```

### Inventory Notifications

```
Material delivery arrived:
  → Supervisor: in-app
    "Delivery from [vendor] arrived.
     GRN [number] created. Please inspect."

GRN inspection overdue (2 hours):
  → Supervisor: in-app
    "GRN [number] waiting inspection for 2+ hours."

Rejection at GRN:
  → FM: in-app
    "[Vendor] delivery partially rejected.
     GRN [number]. [X] items rejected."

Low stock (daily 7 AM):
  → FM + Supervisor: in-app + WhatsApp
    "Low stock: [material name]
     Available: [X] [UOM] | Reorder level: [Y]"

Items in rejection zone > 7 days:
  → FM: in-app
    "[X] items in rejection zone for > 7 days.
     Action needed."
```

### Production Notifications

```
No job card by 9:15 AM (present carpenter):
  → Supervisor: in-app
    "Present but no job card: [names]"

EOD update not submitted by 6:30 PM:
  → Supervisor: in-app + WhatsApp
    "EOD update pending: [carpenter names]
     Please update before 7 PM."

Issue flagged in EOD:
  → FM + Supervisor: in-app
    "Issue flagged by [carpenter] on WO [number]:
     [issue type] — [description]"

Production complete:
  → Supervisor + FM: in-app
    "WO [number] production complete.
     Ready for QC."

Rework required:
  → FM + Supervisor: in-app
    "QC failed for WO [number].
     Rework WO [RWK-number] created."
```

### OT Notifications

```
OT request submitted:
  → FM: in-app + WhatsApp
    "OT Request: [carpenter] — [X] hours today
     for WO [number]. [Approve?]"

OT approved:
  → Supervisor: in-app
    "OT approved for [carpenter]: [X] hours."

OT rejected:
  → Supervisor: in-app
    "OT rejected for [carpenter].
     Reason: [reason]"

Carpenter near OT cap (20 hours):
  → FM + Supervisor: in-app
    "[Carpenter] has used 20/26 OT hours.
     6 remaining this month."
```

### QC Notifications

```
QC passed:
  → FM: in-app
    "QC passed for WO [number].
     Please approve dispatch."

QC failed:
  → FM + Supervisor: in-app + WhatsApp
    "QC FAILED for WO [number].
     Failed: [checkpoint names].
     Rework WO created."

Dispatch approved:
  → Supervisor: in-app
    "Dispatch approved for WO [number].
     Create delivery challan."

WO dispatched:
  → FM: in-app
    "WO [number] dispatched.
     DC: [number] | Vehicle: [number]"

WO delivered (unconfirmed):
  → SPOC: in-app + WhatsApp
    "WO [number] has been delivered.
     Please confirm receipt."

Complaint raised:
  → FM: in-app + WhatsApp (IMMEDIATELY)
    "Complaint CPL-[number] raised on WO [number].
     [type]. Review within 24 hours."

Complaint not reviewed (24 hours):
  → FM: in-app + WhatsApp
    "ESCALATION: Complaint CPL-[number] not reviewed
     in 24 hours. Action required."
```

### Billing & Finance Notifications

```
Invoice auto-drafted:
  → FM: in-app
    "Invoice ready for WO [number].
     Amount: ₹X. Review and send."

Invoice overdue (T+due):
  → FM: in-app
    "Invoice INV-[number] overdue today.
     Client: [name] | Amount: ₹X"

Invoice overdue > 30 days:
  → FM: in-app + WhatsApp
    "ESCALATION: INV-[number] | [client]
     ₹X overdue by 30+ days. Action needed."

Payment received:
  → FM: in-app
    "Payment ₹X received from [client].
     Invoice [number] — [paid/partially paid]"

WO financially closed:
  → FM: in-app
    "WO [number] financially closed.
     Final margin: [X]%"

TDS certificate due (15 days before):
  → FM: in-app
    "Form 16A due from [client] by [date].
     TDS: ₹X"

Vendor invoice matched:
  → FM: in-app
    "Invoice from [vendor] matched ✓
     Approved for payment."

Vendor invoice disputed:
  → FM: in-app
    "Rate/qty mismatch: [vendor] invoice.
     Payment held. Review needed."

Cash balance low:
  → FM: in-app + WhatsApp
    "Bank balance ₹X below threshold.
     Expected inflows this week: ₹Y"

GST filing due (3 days before):
  → FM: in-app
    "GSTR-1 due in 3 days.
     Send data to CA."

Tally export due (3rd of month):
  → FM: in-app
    "Monthly Tally export due by 5th.
     Send to CA by [date]."
```

### Payroll Notifications

```
Attendance not marked (9:30 AM):
  → Supervisor: in-app
    "Attendance not marked today."

Payroll due (last working day):
  → FM: in-app
    "Process payroll for [month].
     [X] employees."

EMI due (edge banding):
  → FM: in-app
    "Loan EMI of ₹50,000 due on [date].
     Transfer from bank."
```

---

## 9. NOTIFICATION SETTINGS

```
Route: /settings/notifications (FM only)

FM can configure:

FOR EACH NOTIFICATION TYPE:
  ○ In-app only
  ○ In-app + WhatsApp
  ○ Disabled (except Critical — cannot disable)

CANNOT DISABLE (always on):
  WO blocked
  Machine breakdown
  Overdue invoice > 30 days
  Complaint raised
  Cash balance critical
  QC failed

DEFAULT SETTINGS (pre-configured on system setup):
  Critical alerts: in-app + WhatsApp
  Approvals needed: in-app + WhatsApp
  Informational: in-app only
  Daily summaries: WhatsApp (see PRD-17)
  Weekly P&L: WhatsApp (see PRD-17)

WHATSAPP NUMBER:
  FM's WhatsApp number (set in tenant_settings)
  Notifications sent via Baileys (PRD-17)
```

---

## 10. MORNING DASHBOARD (MOBILE — IN APP)

The morning dashboard is the mobile-optimised version
of the FM dashboard. Designed for phone viewing at 8 AM.

```
Route: /dashboard (same as FM dashboard — responsive)

On mobile (< 768px):
  Sections stack vertically
  Large tap targets (minimum 44px)
  Critical alerts at top (cannot miss)
  Swipe to dismiss informational alerts

Morning specific behaviour:
  At 8 AM: "Good morning, Gurdev" banner
  Shows yesterday's summary + today's priorities
  Production section shows carpenters (not yet marked —
    reminder to mark attendance)
```

---

## 11. BUSINESS RULES

```
BR-01: Critical alerts (🔴) cannot be dismissed
       or suppressed without documented reason.
       They stay visible until the underlying
       issue is resolved.

BR-02: All notifications are logged in
       notification_log permanently.
       Even dismissed notifications are archived.

BR-03: Notification suppression (pausing reminders)
       requires FM to provide a reason.
       Suppression is logged in notification_log.

BR-04: WhatsApp notifications are sent via Baileys
       (PRD-17). If Baileys session is broken,
       in-app notifications still work.
       Baileys failure does not break the dashboard.

BR-05: Unread notification count shown in bell icon.
       FM sees all unread.
       Others see only their own unread.

BR-06: Dashboard data refreshes every 60 seconds
       automatically (without manual refresh).

BR-07: Supervisor dashboard shows NO financial data.
       No revenue, no costs, no margins — ever.
       Even if they navigate directly to a financial
       route: blocked with "Access denied".

BR-08: Super Admin dashboard shows ONLY:
       Chhabee WO status and Chhabee revenue.
       No B2B/D2C, no costs, no margin.

BR-09: Mobile dashboard is the primary interface
       for FM. Must work without horizontal scroll
       on 375px (iPhone SE) screen width.

BR-10: Notifications are role-specific.
       SPOC never receives payroll or finance alerts.
       Supervisor never receives billing alerts.
       FM receives everything.

BR-11: Quick action buttons on alerts must be
       tappable directly — no navigation required.
       [Approve] on OT alert approves directly.
       [View WO] on WO alert navigates to WO.

BR-12: Alert age shown in human-readable format:
       < 1 hour: "X minutes ago"
       1-24 hours: "X hours ago"
       > 24 hours: "DD-Mon at HH:MM"
```

---

## 12. TESTING CHECKLIST

**FM Dashboard:**
[ ] All 4 sections visible
[ ] Alerts section shows correct pending items
[ ] Approve/Reject directly from alert works
[ ] Carpenter status grid loads correctly
[ ] Financial snapshot numbers correct
[ ] This week section shows correct dates/items
[ ] Auto-refresh every 60 seconds

**Role-Based Dashboards:**
[ ] Supervisor sees no financial data
[ ] Site Manager sees only own WOs
[ ] Super Admin sees Chhabee stream only
[ ] Carpenter redirected to /my-tasks (Glide)

**Notification Bell:**
[ ] Unread count badge updates in real-time
[ ] Mark as read works
[ ] Mark all as read works
[ ] Notification links navigate correctly

**Critical Alerts:**
[ ] Cannot dismiss without reason
[ ] Remain visible until resolved
[ ] WhatsApp sent for critical alerts

**Notification Settings:**
[ ] FM can toggle WhatsApp vs in-app
[ ] Cannot disable critical alerts
[ ] Settings saved and respected

**Mobile Responsiveness:**
[ ] Dashboard works on 375px width (iPhone SE)
[ ] No horizontal scroll required
[ ] Tap targets ≥ 44px
[ ] Alerts tappable on mobile

---

## 13. INTEGRATION POINTS

```
ALL MODULES FEED DASHBOARD:

PRD-02: WO status, delivery dates, at-risk flags
PRD-03: CR pending approvals
PRD-05: BOM pending approvals
PRD-06: PR and PO pending approvals
PRD-07: Low stock alerts, vendor performance
PRD-08: GRN inspections due, rejection zone alerts
PRD-09: Carpenter status, production progress,
         EOD updates pending
PRD-10: OT approvals pending
PRD-11: QC dispatch approvals, complaints
PRD-12: Invoices to send, overdue invoices,
         payments received
PRD-13: Payables due, cash balance, disputes
PRD-14: Attendance not marked, payroll due
PRD-15: MIS KPI cards (optional on FM dashboard)
PRD-17: WhatsApp notifications sent via Baileys
```

---

*Document version: 1.0*
*Prerequisites: PRD-00 through PRD-15 (reads all)*
*Mobile-first design: 375px minimum width*
*Dashboard = operational (what to do now)*
*MIS = analytical (how are we performing)*
*Next document: PRD-17 WhatsApp Automation*
