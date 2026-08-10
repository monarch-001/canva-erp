# PRD-17: WHATSAPP AUTOMATION
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
WhatsApp is the primary communication channel for the
factory — with the Factory Manager, Supervisor, Site
Managers, and vendors. This module automates all outbound
WhatsApp messages from the ERP using Baileys (a Node.js
WhatsApp library). It runs as a separate server process
alongside the Lovable/Supabase application.

### Architecture

```
LOVABLE FRONTEND (React)
        ↓ triggers notification
SUPABASE DATABASE
        ↓ notification_log insert triggers
BAILEYS SERVER (Node.js — separate process)
        ↓ reads from notification_log
        ↓ sends WhatsApp messages
RECIPIENT WHATSAPP
```

### Tech Stack for This Module
```
Library:     Baileys (unofficial WhatsApp Web API)
Runtime:     Node.js 18+
Database:    Supabase (same project — reads notification_log)
WhatsApp:    Dedicated SIM — NEVER the primary business number
Server:      Same server as main app OR separate small VPS
Language:    TypeScript (recommended) or JavaScript
```

### CRITICAL RISK WARNING
```
Baileys uses WhatsApp Web protocol — it is not an
official WhatsApp API. This means:

1. Meta can ban the linked number at any time
2. WhatsApp Web updates can break Baileys
3. There is no SLA or official support

MITIGATION:
  - Use a DEDICATED SIM for Baileys only
  - NEVER use the primary business number
  - Keep a backup SIM ready to re-link
  - Session state backed up daily
  - If Baileys breaks: in-app notifications still work
    (dashboard is not dependent on WhatsApp)

FUTURE MIGRATION PATH:
  When business scales: migrate to official
  WhatsApp Business API (Cloud API by Meta)
  This module is designed to make that migration
  easy — message templates are already structured
  in the right format.
```

### Users
No users interact with this module directly.
It runs silently in the background.
FM can view WhatsApp delivery status in
notification_log within the ERP.

---

## 2. DATABASE SCHEMA

### 2.1 whatsapp_sessions (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT NOT NULL DEFAULT 'canva-concepts-bot',
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected' CHECK (status IN (
    'connected',
    'disconnected',
    'connecting',
    'qr_pending',  -- QR code scan needed
    'banned'
  )),
  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,
  qr_code TEXT,  -- Base64 QR when re-linking needed
  session_data TEXT,  -- Encrypted session credentials
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_sessions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM only on whatsapp_sessions"
ON public.whatsapp_sessions FOR ALL
USING (public.is_incoming_partner());
```

### 2.2 whatsapp_queue (NEW TABLE)

```sql
CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN (
    'text',
    'document',  -- PDF attachment
    'image'      -- Photo
  )),
  message_body TEXT NOT NULL,
  document_url TEXT,   -- Supabase storage URL for PDF
  document_name TEXT,  -- Filename shown to recipient
  image_url TEXT,      -- Photo URL
  priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'failed',
    'cancelled'
  )),
  sent_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  notification_log_id UUID REFERENCES
    public.notification_log(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX wq_status_idx ON public.whatsapp_queue(status);
CREATE INDEX wq_scheduled_idx
  ON public.whatsapp_queue(scheduled_at);
CREATE INDEX wq_priority_idx ON public.whatsapp_queue(priority);

ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FM full access on whatsapp_queue"
ON public.whatsapp_queue FOR ALL
USING (public.is_incoming_partner());
```

---

## 3. BAILEYS SERVER SETUP

### 3.1 Project Structure

```
baileys-server/
  ├── src/
  │   ├── index.ts           — Entry point
  │   ├── whatsapp.ts        — Baileys connection manager
  │   ├── queue-processor.ts — Reads queue, sends messages
  │   ├── scheduled-jobs.ts  — Daily summary, weekly P&L
  │   ├── templates/
  │   │   ├── daily-summary.ts
  │   │   ├── weekly-pl.ts
  │   │   ├── po-hindi.ts
  │   │   ├── vendor-rejection.ts
  │   │   └── notifications.ts
  │   └── supabase-client.ts — DB connection
  ├── sessions/              — Baileys auth state (local)
  ├── package.json
  ├── .env
  └── README.md
```

### 3.2 Environment Variables

```
SUPABASE_URL=https://dmtscbxundtcqigwdkza.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service role key — not anon]
FM_WHATSAPP_NUMBER=91XXXXXXXXXX  — FM's number
SUPERVISOR_WHATSAPP_NUMBER=91XXXXXXXXXX
BOT_PHONE_NUMBER=91XXXXXXXXXX   — Dedicated SIM
SESSION_NAME=canva-concepts-bot
QUEUE_POLL_INTERVAL=10000       — 10 seconds
DAILY_SUMMARY_TIME=18:30        — 6:30 PM
WEEKLY_PL_DAY=1                 — Monday
WEEKLY_PL_TIME=08:00            — 8:00 AM
```

### 3.3 Baileys Connection

```typescript
// src/whatsapp.ts

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

export async function connectToWhatsApp() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./sessions')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ['Canva Concepts ERP', 'Chrome', '1.0.0']
  })

  sock.ev.on('connection.update',
    async ({ connection, lastDisconnect, qr }) => {
    
    if (qr) {
      // Save QR to Supabase for FM to scan via ERP
      await updateSessionStatus('qr_pending', qr)
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode
        !== DisconnectReason.loggedOut
      
      await updateSessionStatus('disconnected')
      
      if (shouldReconnect) {
        // Wait 5 seconds and retry
        setTimeout(connectToWhatsApp, 5000)
      }
    }

    if (connection === 'open') {
      await updateSessionStatus('connected')
      console.log('WhatsApp connected ✓')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  return sock
}
```

### 3.4 Queue Processor

```typescript
// src/queue-processor.ts
// Runs every 10 seconds, picks pending messages

async function processQueue(sock: WASocket) {
  // Get pending messages ordered by priority and schedule
  const { data: messages } = await supabase
    .from('whatsapp_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .lt('retry_count', 3)
    .order('priority', { ascending: true })
    .order('scheduled_at', { ascending: true })
    .limit(5)  // Process 5 at a time

  for (const msg of messages || []) {
    try {
      const jid = `${msg.recipient_phone}@s.whatsapp.net`

      if (msg.message_type === 'text') {
        await sock.sendMessage(jid, {
          text: msg.message_body
        })
      }

      if (msg.message_type === 'document') {
        // Download from Supabase storage, send as PDF
        const buffer = await downloadFromSupabase(
          msg.document_url
        )
        await sock.sendMessage(jid, {
          document: buffer,
          mimetype: 'application/pdf',
          fileName: msg.document_name,
          caption: msg.message_body
        })
      }

      if (msg.message_type === 'image') {
        const buffer = await downloadFromSupabase(
          msg.image_url
        )
        await sock.sendMessage(jid, {
          image: buffer,
          caption: msg.message_body
        })
      }

      // Mark as sent
      await supabase
        .from('whatsapp_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', msg.id)

    } catch (error) {
      // Increment retry count
      await supabase
        .from('whatsapp_queue')
        .update({
          retry_count: msg.retry_count + 1,
          failure_reason: error.message,
          status: msg.retry_count >= 2 ? 'failed' : 'pending'
        })
        .eq('id', msg.id)
    }
    
    // Small delay between messages (rate limiting)
    await sleep(1000)
  }
}

// Run every 10 seconds
setInterval(() => processQueue(sock), 10000)
```

---

## 4. MESSAGE TEMPLATES

All message templates are defined here.
These are the EXACT messages sent via WhatsApp.

### 4.1 Daily Summary (6:30 PM every day)

Recipient: FM WhatsApp number
Triggered: Scheduled job at 6:30 PM daily

```
TEMPLATE (dynamic values in [brackets]):

📊 *CANVA CONCEPTS DAILY SUMMARY*
📅 [Day], [DD-Mon-YY] | 6:30 PM
━━━━━━━━━━━━━━━━━━━━━━

🏭 *PRODUCTION*
Active WOs: [count]
✅ Completed today: [count] [if>0: (WO numbers)]
[if at-risk>0: ⚠️ At risk (delivery tomorrow): [count] ([WO numbers])]
[if blocked>0: 🔴 Blocked: [count] ([WO numbers])]

👷 *TEAM*
Carpenters present: [present]/[total]
[if absent>0: Absent: [names]]
[if ot_pending>0: ⚠️ OT pending approval: [count]]

📦 *MATERIALS*
[if grns>0: GRNs received: [count]]
[if pos_placed>0: POs placed today: [count]]
[if prs_pending>0: ⚠️ PRs pending approval: [count]]
[if low_stock>0: ⚠️ Low stock: [material names]]

🚚 *DELIVERIES*
[if delivered>0: Delivered today: [count] ([WO numbers])]
[if pending_dispatch>0: ⚠️ Pending dispatch approval: [count]]

💰 *FINANCE*
[if invoices>0: Invoices raised: [count] (₹[total])]
[if payments>0: Payments received: ₹[total]]
[if overdue>0: ⚠️ Overdue invoices: [count] (₹[total])]

━━━━━━━━━━━━━━━━━━━━━━
[if actions>0:
*Actions needed tomorrow:*
[numbered list of pending actions, max 5]]
[if no actions: ✅ No pending actions for tomorrow]

_Canva Concepts ERP_

RULES FOR DAILY SUMMARY:
  If a section has nothing to report:
    OMIT the section entirely (keep message short)
  Maximum message length: 60 lines
  If all sections empty: "All clear today ✓"
  FM can reply "PAUSE" to pause for 1 day
    (system reads incoming messages for PAUSE command)
```

### 4.2 Weekly P&L Snapshot (Monday 8:00 AM)

Recipient: FM WhatsApp number
Also sent to: Super Admin (revenue + collections only)
Triggered: Scheduled job, Monday 8 AM

```
FM VERSION:

📈 *CANVA CONCEPTS WEEKLY SNAPSHOT*
📅 Week ending [DD-Mon-YY]
━━━━━━━━━━━━━━━━━━━━━━

💼 *REVENUE*
Billed this week:    ₹[amount]
Collected this week: ₹[amount]
Outstanding (total): ₹[amount]
  0-30 days:  ₹[amount] ✓
  31-60 days: ₹[amount] [if>0: ⚠️]
  60+ days:   ₹[amount] [if>0: 🔴]

🏭 *PRODUCTION*
WOs completed:    [count]
WOs in progress:  [count]
Sqft produced:    [amount] sqft
Weekly target:    [target] sqft
Utilisation:      [pct]% [✓ or ⚠️]

🧱 *MATERIAL COST*
Purchased:       ₹[amount]
Consumed:        ₹[amount]
Cost % revenue:  [pct]% (target: [aop_pct]%)

👷 *LABOUR*
Carpenter-days:  [count]
OT hours:        [count] hrs (₹[cost])
Absence rate:    [pct]%

💰 *FINANCIAL SUMMARY*
Revenue billed:  ₹[amount]
Est. gross margin: ₹[amount] ([pct]%)

📊 *MONTH TO DATE ([Mon YY])*
Revenue: ₹[amount] / AOP ₹[target] ([pct]%)
[✓ On track / ⚠️ Behind / 🔴 Significantly behind]

[if outstanding_actions > 0:
⚠️ *THIS WEEK — ACTION NEEDED:*
[numbered list of top 3 actions]]

━━━━━━━━━━━━━━━━━━━━━━
_Canva Concepts ERP | [Dashboard link]_

SUPER ADMIN VERSION (shorter):

📊 *CANVA CONCEPTS — WEEKLY UPDATE*
Week ending [DD-Mon-YY]

*CHHABEE WOs:*
Completed this week: [count]
In production: [count]
Deliveries this week: [WO numbers and dates]

*BILLING:*
Billed this week: ₹[amount]
Outstanding from Chhabee: ₹[amount]

_Canva Concepts_
```

### 4.3 Purchase Order to Vendor (Hindi)

Triggered: When Supervisor clicks "Send to Vendor"
Recipient: Vendor's WhatsApp number

```
नमस्ते [vendor_name] जी,

कृपया नीचे दिया गया Purchase Order देखें।

*PO Number:* [po_number]
*दिनांक:* [date]

*सामग्री विवरण:*
[for each item:]
• [material_name]: [qty] [unit] @ ₹[rate]/[unit]
  कुल: ₹[line_total]

*कुल राशि (GST सहित):* ₹[total_amount]
*डिलीवरी तिथि:* [expected_delivery_date]
*डिलीवरी पता:* [delivery_address]

[if advance_required:]
*अग्रिम भुगतान:* ₹[advance_amount]
बैंक: [bank_name]
A/C: [account_number]
IFSC: [ifsc]

कृपया *4 घंटे में पुष्टि करें।*

धन्यवाद,
Canva Concepts
[factory_phone]

[ATTACH: PO PDF as document]
```

### 4.4 Vendor Rejection Notice (Hindi)

Triggered: When GRN inspection rejects materials
Recipient: Vendor's WhatsApp number

```
नमस्ते [vendor_name] जी,

आपकी आज की डिलीवरी में कुछ सामग्री 
स्वीकार नहीं की जा सकी।

*GRN Number:* [grn_number]
*PO Reference:* [po_number]
*दिनांक:* [date]

*अस्वीकृत सामग्री:*
[for each rejected item:]
• [material_name]: [qty_rejected] [unit]
  कारण: [rejection_reason]

*कृपया इस सामग्री को [days] दिन में 
वापस ले जाएं।*

[if debit_note_raised:]
इस संबंध में Debit Note [dn_number] 
₹[amount] जारी किया गया है।

किसी भी प्रश्न के लिए संपर्क करें:
[supervisor_name]: [supervisor_phone]

धन्यवाद,
Canva Concepts

[ATTACH: Rejection photos as images]
```

### 4.5 OT Approval Request

Triggered: When Supervisor submits OT request
Recipient: FM WhatsApp

```
⏰ *OT APPROVAL NEEDED*

*Request:* [otr_number]
*Carpenter:* [carpenter_name]
*Date:* [date]
*Hours:* [hours] hours ([start_time] - [end_time])
*Work Order:* [wo_number]
*Reason:* [reason]
*Est. Cost:* ₹[cost]

Monthly OT used: [used]/26 hours

Reply *APPROVE [otr_number]* to approve
Reply *REJECT [otr_number]* to reject

Or approve in ERP: [dashboard link]
```

### 4.6 Urgent PR Alert

Triggered: When urgent PR submitted (required < 2 days)
Recipient: FM WhatsApp — IMMEDIATELY

```
🚨 *URGENT PR — ACTION NEEDED NOW*

*PR Number:* [pr_number]
*Material:* [material_name]
*Quantity:* [qty] [unit]
*Required By:* [required_by_date] ([days] days left)
*Work Order:* [wo_number]
*Raised By:* [supervisor_name]
*Reason:* [reason]

⚠️ *Approval needed within 30 minutes*

Reply *APPROVE [pr_number]* to approve
Or approve in ERP: [dashboard link]
```

### 4.7 Delivery Dispatched (to Site Manager)

Triggered: When Supervisor marks challan as dispatched
Recipient: Site Manager WhatsApp

```
🚚 *YOUR ORDER IS ON THE WAY*

*Work Order:* [wo_number]
*Description:* [wo_title]
*DC Number:* [dc_number]
*Vehicle:* [vehicle_number]
*Driver:* [driver_name] — [driver_phone]

📍 *Delivery Address:*
[delivery_address]

Expected arrival: [eta if known / "Today" if same day]

Please confirm receipt once delivered.
Canva Concepts | [supervisor_phone]
```

### 4.8 Invoice to Client

Triggered: When FM sends invoice
Recipient: Client email contact's WhatsApp (if available)

```
🧾 *INVOICE — CANVA CONCEPTS*

*Invoice No:* [invoice_number]
*Date:* [invoice_date]
*Work Order:* [wo_number]

*Amount:* ₹[total_inc_gst] (incl. GST)
*Due Date:* [due_date]

*Payment Details:*
Bank: [bank_name]
A/C: [account_number]
IFSC: [ifsc]
UPI: [upi_id]

Please use Invoice No as payment reference.

[ATTACH: Invoice PDF]

Canva Concepts
[fm_phone]
```

### 4.9 Payment Reminder Sequence

```
T+7 (REMINDER 1):
*Payment Reminder — Canva Concepts*

Dear [client_name],

Invoice [invoice_number] for ₹[amount]
was sent on [invoice_date].
Due date: [due_date].

Kindly arrange payment at your earliest.

UPI: [upi_id] | NEFT: [account details]

Canva Concepts | [phone]

---

T+DUE (REMINDER 3 — OVERDUE):
⚠️ *Payment Overdue — Canva Concepts*

Dear [client_name],

Invoice [invoice_number] for ₹[amount]
was due on [due_date].

This is a reminder that payment is now due.
Please arrange payment today.

If already paid, please share UTR/reference.

Canva Concepts | [phone]
```

### 4.10 WhatsApp Command Handler (Incoming)

Baileys can receive messages. The server reads
incoming messages and handles specific commands.

```typescript
// Handle incoming messages from FM

sock.ev.on('messages.upsert', async ({ messages }) => {
  for (const msg of messages) {
    // Only process messages from FM's number
    if (msg.key.remoteJid !== `${FM_NUMBER}@s.whatsapp.net`)
      continue

    const text = msg.message?.conversation?.toUpperCase()
    if (!text) continue

    // PAUSE command — pause daily summary for 1 day
    if (text === 'PAUSE') {
      await pauseDailySummary(1)
      await sendMessage(FM_NUMBER,
        "Daily summary paused for today ✓")
    }

    // APPROVE [number] command — approve OT or PR
    if (text.startsWith('APPROVE ')) {
      const docNumber = text.replace('APPROVE ', '').trim()
      await handleApproval(docNumber, 'approved')
    }

    // REJECT [number] command
    if (text.startsWith('REJECT ')) {
      const docNumber = text.replace('REJECT ', '').trim()
      await handleApproval(docNumber, 'rejected')
      // Note: rejection reason still required in ERP
    }

    // STATUS command — quick factory status
    if (text === 'STATUS') {
      const status = await getQuickStatus()
      await sendMessage(FM_NUMBER, status)
    }
  }
})
```

### STATUS command response:
```
📊 *QUICK STATUS — [time]*

Active WOs: [count]
Carpenters present: [count]/[total]
Pending approvals: [count]
Outstanding invoices: ₹[amount]

Full dashboard: [link]
```

---

## 5. SCHEDULED JOBS

```typescript
// src/scheduled-jobs.ts

import cron from 'node-cron'

// Daily Summary — every day at 6:30 PM
cron.schedule('30 18 * * *', async () => {
  const summary = await buildDailySummary()
  await sendToFM(summary)
  // Also send shorter version to Supervisor
  await sendToSupervisor(buildSupervisorSummary())
})

// Weekly P&L — every Monday at 8:00 AM
cron.schedule('0 8 * * 1', async () => {
  const weeklyPL = await buildWeeklyPL()
  await sendToFM(weeklyPL)
  // Shorter version to Super Admin
  await sendToSuperAdmin(buildSuperAdminWeekly())
})

// Low stock check — every day at 7:00 AM
cron.schedule('0 7 * * *', async () => {
  const lowStock = await checkLowStock()
  if (lowStock.length > 0) {
    await sendToFM(buildLowStockAlert(lowStock))
  }
})

// Overdue invoices — every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  const overdue = await checkOverdueInvoices()
  if (overdue.length > 0) {
    await sendToFM(buildOverdueAlert(overdue))
  }
})

// Payment reminders — every day at 10:00 AM
cron.schedule('0 10 * * *', async () => {
  await processPaymentReminders()
})

// Attendance reminder — every day at 9:15 AM
cron.schedule('15 9 * * 1-6', async () => {
  const noAttendance = await checkAttendanceNotMarked()
  if (noAttendance) {
    await sendToSupervisor(
      "⚠️ Attendance not marked today. Please mark."
    )
  }
})

// EOD update reminder — every day at 6:30 PM (weekdays)
cron.schedule('30 18 * * 1-6', async () => {
  const pendingEOD = await checkPendingEOD()
  if (pendingEOD.length > 0) {
    await sendToSupervisor(buildEODReminder(pendingEOD))
  }
})

// GST reminder — 3 days before 11th (GSTR-1)
// Check daily, send when 3 days remaining
cron.schedule('0 9 * * *', async () => {
  const today = new Date()
  const day = today.getDate()
  const month = today.getMonth()
  const dueDate = new Date(today.getFullYear(), month, 11)
  const daysLeft = Math.ceil(
    (dueDate - today) / (1000 * 60 * 60 * 24)
  )
  if (daysLeft === 3) {
    await sendToFM(
      "📋 GSTR-1 due in 3 days (11th). Send data to CA."
    )
  }
})
```

---

## 6. SESSION MANAGEMENT

### Initial Setup (one-time)

```
Step 1: Start Baileys server
  node src/index.js

Step 2: QR Code appears in terminal
  ALSO saved to whatsapp_sessions.qr_code in DB
  FM can view QR in ERP Settings → WhatsApp

Step 3: Scan QR with dedicated WhatsApp number
  (Not primary business number)

Step 4: Session saved to /sessions folder locally
  AND session status updated to 'connected' in DB

Step 5: Server runs indefinitely
  Auto-reconnects if connection drops
  If logged out: QR appears again, FM rescans
```

### WhatsApp Status in ERP

```
Route: /settings/whatsapp (FM only)

Shows:
  Status: CONNECTED ✓ (green)
         OR: DISCONNECTED ✗ (red)
         OR: QR PENDING — Scan to connect (amber)

  Phone Number: [BOT_PHONE_NUMBER]
  Last connected: [timestamp]
  Messages sent today: [count]
  Messages failed today: [count]

  If QR_PENDING:
    Shows QR code image (from whatsapp_sessions.qr_code)
    FM scans with dedicated phone
    [Refresh Status] button

  [Test WhatsApp] button:
    Sends test message to FM's own WhatsApp
    Confirms system is working
```

---

## 7. WHATSAPP NUMBERS CONFIGURATION

```
All numbers stored in tenant_settings:

  fm_whatsapp: FM's personal WhatsApp
  supervisor_whatsapp: Supervisor's WhatsApp
  super_admin_whatsapp: Super Admin's WhatsApp

Vendor numbers: stored in organisations.primary_phone
  Formatted as: 91XXXXXXXXXX (no + sign, no spaces)

Site Manager numbers: stored in profiles.phone

FORMAT RULE:
  All numbers stored as: country_code + number
  India: 91XXXXXXXXXX (no +, no spaces, no dashes)
  Example: 919876543210 (for +91 98765 43210)
```

---

## 8. ERROR HANDLING & MONITORING

```
MESSAGE FAILURE HANDLING:
  Retry up to 3 times (retry_count < max_retries)
  Wait 30 seconds between retries
  After 3 failures: status = 'failed'
  FM sees failed messages in notification_log

COMMON FAILURE REASONS:
  Number not on WhatsApp
  Session disconnected (Baileys)
  Rate limiting (too many messages too fast)
  Invalid phone number format

MONITORING:
  FM can see WhatsApp queue status in /settings/whatsapp
  Failed messages highlighted
  [Retry] button for individual failed messages

SESSION RECOVERY:
  If Baileys disconnects (not logged out):
    Auto-reconnects within 30 seconds
    Queue continues processing after reconnect

  If Baileys logged out (account banned or manual):
    Status → 'disconnected' in DB
    FM notified via in-app notification
    FM goes to /settings/whatsapp
    Scans new QR with backup SIM
    Queue resumes

BACKUP PLAN (if Baileys completely broken):
  All critical notifications also in in-app
  Dashboard is fully functional without WhatsApp
  WhatsApp is enhancement, not dependency
```

---

## 9. RATE LIMITING

```
WhatsApp has implicit rate limits.
Sending too many messages too fast = ban risk.

RULES IMPLEMENTED:
  Max 1 message per second (1000ms delay between sends)
  Max 50 messages per hour
  Max 200 messages per day
  Bulk messages (daily summary, low stock) sent once
  not repeated within same day

PRIORITY QUEUE:
  Priority 1: Critical alerts (OT urgent, blocked WO)
  Priority 2: Approval requests (OT, PR, PO)
  Priority 3: Invoice + payment messages to clients
  Priority 4: Informational (delivery updates, reminders)
  Priority 5: Daily summary, weekly P&L
  Priority 6-10: Non-critical reminders

High priority messages sent first,
even if lower priority messages are queued earlier.
```

---

## 10. BUSINESS RULES

```
BR-01: Baileys uses a DEDICATED SIM.
       NEVER the primary business WhatsApp.
       If primary number gets banned, business
       communication is disrupted.

BR-02: FM can reply to bot messages with commands:
       PAUSE — pause daily summary for 1 day
       APPROVE [number] — approve OT or PR
       REJECT [number] — reject (reason in ERP)
       STATUS — get quick factory status

BR-03: All WhatsApp messages are logged in
       whatsapp_queue with delivery status.
       FM can see all sent messages in /settings/whatsapp.

BR-04: WhatsApp is NOT required for ERP to function.
       All notifications also available in-app.
       If WhatsApp breaks: dashboard still works.

BR-05: Vendor messages (PO, rejection) are sent in HINDI.
       Client messages (invoice, delivery) in English.
       FM/Supervisor messages in English.

BR-06: PO PDF is attached to vendor WhatsApp message.
       Invoice PDF attached to client WhatsApp message.
       Rejection photos attached to vendor rejection message.

BR-07: Daily summary sent at 6:30 PM every day.
       If no data to report: shortened message "All clear ✓"
       FM can pause for 1 day by replying PAUSE.

BR-08: Weekly P&L sent every Monday at 8:00 AM.
       Even if previous week had no revenue:
       Shows zero values with AOP comparison.

BR-09: Super Admin receives ONLY:
       Chhabee WO updates
       Weekly summary (revenue + collections only)
       No cost, margin, or other stream data.

BR-10: Session state saved in /sessions folder locally.
       Also backed up status in whatsapp_sessions DB table.
       If server restarts: reconnects using saved session.
       No QR rescan needed unless account is logged out.
```

---

## 11. DEPLOYMENT

```
RECOMMENDED SETUP:

Option A — Same server as main app:
  Node.js process runs alongside Lovable
  Simple, single server
  Suitable for early phase

Option B — Separate small VPS:
  Dedicated ₹500-1000/month VPS
  More reliable, won't compete for resources
  Recommended when factory is at full capacity

STARTUP:
  npm install
  npm run build
  node dist/index.js

  OR with PM2 (auto-restart if crashes):
  pm2 start dist/index.js --name "canva-whatsapp"
  pm2 startup  -- auto-start on server reboot
  pm2 save

MONITORING:
  pm2 status — see if running
  pm2 logs canva-whatsapp — see recent messages
  pm2 restart canva-whatsapp — restart if needed
```

---

## 12. TESTING CHECKLIST

**Setup:**
[ ] Baileys server starts without errors
[ ] QR code appears (terminal + ERP settings)
[ ] Dedicated SIM scanned successfully
[ ] Status shows CONNECTED in /settings/whatsapp
[ ] Test message received by FM

**Queue Processor:**
[ ] Message inserted in queue appears in FM WhatsApp
[ ] PDF attachment sent correctly (PO, invoice)
[ ] Image attachment sent correctly (rejection photo)
[ ] Failed messages show retry logic
[ ] After 3 failures: status = failed
[ ] Rate limiting: 1 second between messages

**Scheduled Jobs:**
[ ] Daily summary arrives at 6:30 PM
[ ] Weekly P&L arrives Monday 8:00 AM
[ ] Low stock alert arrives at 7:00 AM (if low stock)
[ ] Attendance reminder at 9:15 AM (if not marked)
[ ] EOD reminder at 6:30 PM (if updates pending)

**Message Templates:**
[ ] Daily summary includes only non-empty sections
[ ] Weekly P&L numbers match MIS data
[ ] Hindi PO message correct with all item details
[ ] Hindi rejection notice includes photo
[ ] OT approval includes correct hours and cost
[ ] Urgent PR marked 🚨 and arrives immediately

**Command Handler:**
[ ] PAUSE command pauses daily summary
[ ] APPROVE command approves correct record
[ ] REJECT command changes status correctly
[ ] STATUS command returns correct data
[ ] Commands work only from FM's number

**Super Admin version:**
[ ] Revenue data only (no costs)
[ ] Chhabee data only (no B2B/D2C)

**Reliability:**
[ ] Baileys auto-reconnects after disconnect
[ ] Queue processes after reconnect
[ ] In-app notifications work even if WhatsApp down
[ ] Session persists after server restart

---

## 13. INTEGRATION POINTS

```
PRD-16: All notification triggers come from
         notification_log (created by PRD-16 events)
         Baileys reads notification_log and sends
         WhatsApp for entries marked channel='whatsapp'

PRD-06: PO PDF generated by billing/PO module
         Attached and sent to vendor WhatsApp

PRD-11: Rejection photos from GRN inspection
         Attached and sent to vendor WhatsApp

PRD-12: Invoice PDF generated by billing module
         Attached and sent to client WhatsApp
         Payment reminder messages automated

PRD-13: Finance alerts (cash low, disputes)
         sent to FM WhatsApp

PRD-15: Daily summary and weekly P&L data
         sourced from MIS module queries

All other modules: write to notification_log
Baileys: reads notification_log and sends WhatsApp
```

---

## 14. FUTURE MIGRATION TO OFFICIAL API

```
When to migrate:
  When business reaches stable operations
  When budget allows (official API has per-message cost)
  When Baileys causes too many issues

Migration steps:
  1. Apply for WhatsApp Business API (Meta)
  2. Get phone number verified
  3. Create message templates (must be pre-approved by Meta)
  4. Replace Baileys client with official API calls
  5. Message templates already structured correctly
     (this PRD designed with migration in mind)

Cost comparison:
  Baileys: ₹0 (but ban risk)
  Official utility messages: FREE within 24-hour window
     (covers most operational notifications)
  Official marketing: ₹0.58-₹0.78 per message

For Canva Concepts' use case (operational messages only):
  Official API utility messages = FREE
  No cost difference + better reliability
  Migration strongly recommended within 12 months
```

---

*Document version: 1.0*
*Prerequisites: PRD-00, PRD-16 (notification system)*
*Tech: Node.js + Baileys + Supabase service role key*
*DEDICATED SIM ONLY — never primary business number*
*WhatsApp is enhancement, not dependency*
*All notifications also available in-app*
*Future: Migrate to official WhatsApp Cloud API*
