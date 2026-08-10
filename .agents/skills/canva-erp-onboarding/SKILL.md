---
name: canva-erp-onboarding
description: >-
  Complete onboarding guide for any new developer or AI agent joining the Canva ERP project.
  Covers project architecture, database hierarchy, tech stack, development rules, 
  server startup, and mandatory log file maintenance procedures.
---

# Canva ERP — Colleague Onboarding Guide

Welcome to the **Canva ERP** project. This skill is your single source of truth before you write a single line of code. Read this entirely before starting.

---

## 1. Project Overview

**Canva ERP** is a factory-floor Enterprise Resource Planning system built for **Canva Concepts**, a furniture manufacturing company. It is an Intranet web app (not public-facing) that manages:

- **Work Orders** — Production jobs for individual furniture pieces (desks, pods, tables).
- **Job Cards** — Daily floor task allocations assigned to carpenters by a supervisor.
- **Production Floor Dashboard** — Live view of all carpenter statuses, job stages, and WO progress.
- **Attendance** — Daily carpenter presence marking.
- **Purchase Orders** — Raw material procurement with mandatory-field validation.
- **Drawings** — CAD/shop-drawing attachments linked to Work Orders.

---

## 2. Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Vanilla CSS (Stitch Design System — no TailwindCSS) |
| **Routing** | React Router v6 |
| **Backend** | Node.js + Express (ESM modules, `"type": "module"`) |
| **Database** | PostgreSQL (Supabase-hosted, shared with Chhabee AIOS) |
| **DB Client** | `pg` (node-postgres) |

---

## 3. Database Hierarchy

This project shares a PostgreSQL instance with the main **Chhabee AIOS** platform. The hierarchy is:

```
public.tenants                     ← Top-level tenant (Canva Concepts = industrial_erp)
  └── public.projects              ← Master project / client contract
        └── public.work_orders     ← Child work orders per furniture batch (FK: project_id)
              ├── drawing_document_id → public.documents (non-invasive drawing link)
              └── public.job_cards ← Daily floor task cards (FK: wo_id)
                    ├── public.job_card_assignments ← Carpenters assigned to a job card
                    └── public.eod_updates          ← End-of-day progress logs

public.attendance                  ← Daily carpenter attendance (tenant_id scoped)
public.wo_status_history           ← Audit trail for every WO status change
```

### Critical Database Rules
- ⚠️ **NEVER create new duplicate tables** for entities that already exist in Chhabee AIOS. Always extend or reference existing tables.
- ⚠️ **ALL new tables must have RLS enabled** and a `tenant_id` isolation policy.
- ⚠️ **NEVER accept `tenant_id` from the client payload.** Always inject it server-side from the authenticated session.

---

## 4. Running the Project Locally

You need **two terminal processes** running simultaneously:

### Terminal 1: Express API Server (Port 5000)
```bash
npm run server
```

### Terminal 2: Vite Frontend (Port 5173)
```bash
npm run dev
```

> If either server goes down (e.g. after a system restart), both must be manually restarted. The Vite dev server proxies `/api/*` calls to port 5000 — if the backend is not running, all data fetches will fail with `ECONNREFUSED`.

---

## 5. Mandatory Log File Maintenance

> **This is not optional.** Every session working on this codebase MUST maintain the daily log files. This is enforced by the `chat_logging` rule.

### Daily Log
- Location: `chat_logs/YYYY-MM-DD.md`
- **Check if today's log exists** at the start of every session. If not, create it.
- Append session entries using the standard format:
  ```markdown
  ## Session at HH:MM (Local Time)
  - **Goal**: [Brief goal]
  - **Changes**: [List of modified files and what changed]
  - **Deployments/Git**: [Pushes, pulls, merges]
  - **Summary**: [Conversation/session summary]
  ```

### Log Maintenance Script
```bash
node scripts/manage_logs.js
```
Run this to:
- Auto-generate weekly summary files (`weekly_summary_YYYY-WXX.md`)
- Delete daily logs older than 30 days (weekly summaries are preserved)

---

## 6. Development Lifecycle (Rigorous Development Skill)

Always follow these steps **in order** before and after writing code:

1. **Draft Specification** — Write a PRD or technical spec before touching code.
2. **Critique** — Challenge assumptions, catch edge cases, RLS issues, and loopholes.
3. **Finalize** — Get user/owner approval on the finalized plan.
4. **Code** — Implement strictly per the finalized spec.
5. **Test Run** — Verify the server runs, the UI renders, and no console errors exist.
6. **Log** — Append a summary of all changes to today's `chat_logs/YYYY-MM-DD.md`.

---

## 7. Key File Reference

| File/Folder | Purpose |
|---|---|
| [`server/index.js`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/server/index.js) | Express API — all backend routes live here |
| [`src/pages/`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/src/pages/) | All React page components |
| [`src/components/Sidebar.tsx`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/src/components/Sidebar.tsx) | Global left sidebar navigation |
| [`src/index.css`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/src/index.css) | Stitch design system CSS tokens |
| [`schema/chaabee_sql.sql`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/schema/chaabee_sql.sql) | Main Chhabee AIOS Postgres schema |
| [`schema/shared_schema.md`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/schema/shared_schema.md) | Human-readable schema overview |
| [`chat_logs/`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/chat_logs/) | Daily and weekly development logs |
| [`scripts/manage_logs.js`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/scripts/manage_logs.js) | Log aggregation & cleanup script |
| [`.agents/rules/`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/.agents/rules/) | Enforced coding and security rules |
| [`.agents/skills/`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/.agents/skills/) | Development skills and workflows |

---

## 8. Security & Tenancy Rules (Summary)

Full rules are in [`.agents/rules/security_and_tenancy.md`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/.agents/rules/security_and_tenancy.md).

Quick reference:
- Every new table → `ENABLE ROW LEVEL SECURITY` + tenant isolation policy.
- Every API query → filter by `tenant_id` injected from `req.user.tenant_id`.
- Every factory module route → double-gate check (tenant type + user role).
- Cross-tenant data must **never** be visible to another tenant's session.
