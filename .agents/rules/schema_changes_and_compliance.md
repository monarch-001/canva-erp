# Developer & Agent Compliance: Database Schema Changes and Lifecycle Enforcement

All developers and AI agents working on this project MUST strictly follow these rules for any code modifications, especially database schema changes.

---

## 1. High Alert on Schema Changes
Even if testing on a dummy database, schema changes must be treated with the highest caution. A faulty schema design or tenant leakage bypass can compromise the production system once merged.

### Mandatory Pre-checks for any SQL/DDL modifications:
1. **Tenant Isolation**: Does the table have `tenant_id`? If it is a child table (like `job_card_assignments` or `eod_updates`), does it cascade properly under a parent table with `tenant_id`?
2. **No Duplication**: Double check `schema/chaabee_sql.sql` and `schema/shared_schema.md`. Do not create new tables if Chhabee's main tables (e.g., `projects`, `documents`, `purchase_orders`) can be extended.
3. **Enum Safety**: Avoid adding values to main Chhabee enums (like `project_status`). Instead, use text fields with CHECK constraints or separate Canva ERP status fields on child/referenced tables to keep the main system clean.

---

## 2. Strict Workflow Enforcement
Every task must follow the **Rigorous Development Lifecycle** as defined in [rigorous-development](file:///.agents/skills/rigorous-development/SKILL.md):

1. **Step 0**: Verify and append to the current daily log file under `chat_logs/YYYY-MM-DD.md` (or run `node scripts/manage_logs.js` to initialize).
2. **Step 1: Draft Spec**: Create a written plan or PRD before code modification.
3. **Step 2: Critique**: Perform a security review of the plan, checking for RLS bypasses, performance issues, or table duplications.
4. **Step 3: Finalize**: Present the plan to the user/project owner and get explicit confirmation.
5. **Step 4: Implementation**: Code the changes based strictly on the approved design.
6. **Step 5: Test Run**: Verify that the Express server (`npm run server`) and Vite dev server (`npm run dev`) compile and run without error.
7. **Step 6 & 7**: Log the completed changes and future scope items.

---

## 3. Handover Documentation
If you are passing your work to another developer or agent:
- Update the onboarding skill in [canva-erp-onboarding](file:///.agents/skills/canva-erp-onboarding/SKILL.md) to reflect the new structure.
- Document any schema changes inside `chat_logs/` and update the migration scripts.
