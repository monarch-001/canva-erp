# Weekly Development Summary: 2026-W33

## Date: 2026-08-10

## Session at 10:25 (Local Time)
- **Goal**: Restart dev servers after overnight shutdown, fix duplicate React key bug in ProductionFloor.tsx, and continue database migration planning.
- **Changes**:
  - Restarted Express API server (`npm run server`) on port 5000.
  - Restarted Vite dev server (`npm run dev`) on port 5173.
  - Fixed duplicate React key warning in `src/pages/ProductionFloor.tsx` — changed list key from `carp.carpenter_id` to `carp.job_card_id` (a carpenter can have multiple job cards per day).
- **Deployments/Git**: N/A
- **Summary**: After server restart, both services were brought back online. A recurring React key conflict in the Carpenter Status Board was identified and fixed.

## Session at 11:04 (Local Time)
- **Goal**: Prepare the project for sharing with a colleague — ensure skills, rules, and log files are well maintained and document the full onboarding flow.
- **Changes**:
  - Created `chat_logs/2026-08-10.md` (this file).
  - Created `.agents/skills/canva-erp-onboarding/SKILL.md` — full colleague onboarding guide.
  - Upgraded `.agents/skills/rigorous-development/SKILL.md` — added mandatory log file maintenance step.
- **Deployments/Git**: N/A
- **Summary**: Structured the project's knowledge base for handover. The onboarding skill documents the full architecture, database hierarchy, tech stack, development rules, and file structure so any new agent or colleague can pick up the project without any gaps.

## Session at 11:50 (Local Time)
- **Goal**: Add strict developer compliance rules for schema updates.
- **Changes**:
  - Created `.agents/rules/schema_changes_and_compliance.md` containing strict guidelines for verifying `tenant_id` security, preventing table duplication, and mandating the 7-step rigorous lifecycle check for any schema/DDL modifications.
- **Deployments/Git**: N/A
- **Summary**: Put the project on high alert for database modifications by enforcing multi-tenant design reviews and rigorous lifecycle specifications for any developer or AI agent joining.

---

## Date: 2026-08-15

## Session at 12:03 (Local Time)
- **Goal**: Establish a schema conservation rule to prevent unilateral database deviations and enforce explicit user communication before new table creation.
- **Changes**:
  - Updated `.agents/rules/schema_changes_and_compliance.md` to include Rules 4 and 5: Schema Conservatism (No Unilateral Changes) and Mandatory Notification for New Tables.
  - Created `.agents/skills/prd-backlog-mapper/SKILL.md` to enforce systematic line-by-line scanning of PRDs and mapping of every button, validation, and visual detail to a central backlog tracking file.
  - Created `.agents/rules/database_schema_alignment.md` to ensure any code, query, or data model update is validated against the active database schema to prevent runtime drift errors.
  - Initialized a specialized `backlog-generator` subagent to parse the 47 exported Figma design screens in `/figma/screens` and mapped them to a newly created `PRDS_BACKLOG.md` file.
  - Run database alignment migrations on `canva_erp_staging` to add missing columns and correct foreign-key relationships.
  - Connected `Dashboard.tsx` to a new dynamic, tenant-bound dashboard API route `/api/dashboard`.
  - Added backend route `POST /api/production/job-cards/:id/eod-update` and frontend modals in `ProductionFloor.tsx` to support the **EOD Update Log Flow** (Figma Screen 14).
  - Executed merge-safe DDL script `scripts/db_merge_safe_migration.js` to create catalogs (`uom_master`, `generic_materials`), `boms`, `bom_items`, and `change_requests` tables configured for clean production integration.
  - Updated `scripts/db_seed_data.js` to populate mock raw materials, approved BOMs, and time/cost change request items.
  - Linked `server/index.js` `GET /api/work-orders/:id` to retrieve relational BOM and Change Request records.
  - Implemented the **BOM & Materials Tab** (Figma Screen 37) and **Change Requests Tab** (Figma Screen 27) inside the `WorkOrderDetail.tsx` page layout.
  - Aligned global styles and Tailwind configuration colors (`primary`, `secondary`, `background`, `border-subtle`, status tags) with the Canva Concepts Figma Design System palette (e.g. Deep Forest Green `#1F2E27` and Gold Accent `#B8892B`).
  - Completely redesigned the **Attendance Marking Page** (`AttendanceMarking.tsx`) to match Figma Screen 16, utilizing quick mark staff cards, dynamic status radios, a monthly rollup stats table, and a bottom information notice panel.
  - Aligned the **Work Order Details Page - Details Tab** (`WorkOrderDetail.tsx`) with Figma Screen 03 by organizing client info, spec blocks, a committed delivery date module with inline editing and days-left countdown badges, a bottom priority & notes card, and an assignment & creation tracker card.
  - Reorganized the Details Tab into **6 distinct visual cards** (Client Information, Furniture Specs, Dimensions, Surface Finish, Logistics & Delivery, Manufacturing Priority) matching the exact grid placement and group structure of the Figma mockup.
  - Aligned page backgrounds to `bg-background` (`#F7F5F1`) and updated form elements to use distinct, elevated white cards floating on the beige canvas, correcting the background overlap matching Figma Screen 02.
  - Split the Product Specifications block on the creation form into **6 numbered group cards** (Sections 1 to 6) displaying the exact Figma titles, subtitles, and round beige number badges (1, 2, 3, 4, 5, 6).
  - Fixed syntax error in `OvertimeManagement.tsx` where an interface was imported as a standard value, changing it to `import type { OtRequestDetail }` to prevent Vite ES module crash.
  - Resolved routing errors for Quotation action triggers by mapping `/quotations/:id/revision`, `/quotations/:id/edit`, and `/quotations/:id/convert` inside `App.tsx` and adding prefill and auto-open modal hooks.
  - Implemented missing backend endpoints `POST /api/work-orders/:id/duplicate` and `PUT /api/work-orders/:id` in `server/index.js` to ensure the "Duplicate WO" and "Edit Details" modals are fully functional.
  - Resolved dynamic Change Request flows by mapping `POST /api/work-orders/:id/change-requests`, `GET /api/change-requests/:id`, and `POST /api/change-requests/:id/status` database routes, replacing component mockup state hooks in `CRDetail.tsx` with active SQL operations.
  - Created a new developer skill `ui-button-action-audit` inside `.agents/skills/` to define a zero-dead-button validation protocol for future screen audits.
- **Deployments/Git**: N/A
- **Summary**: Aligned staging databases, built the EOD progress update module, fully completed all Work Order Detail tabs, aligned the global branding theme to the Canva Concepts Design System, redesigned the Attendance marking page to align with Figma Screen 16, aligned the Work Order details tab to Figma Screen 03, corrected the form card layouts in Figma Screen 02, resolved all dead quotation action routes, implemented missing Work Order duplication and edit handlers, fully wired Change Request submission and decision actions to the database, and established the UI button action audit protocol.

## Session at 15:55 (Local Time)
- **Goal**: Resolve the VS Code Claude Code panel crash shown in the user's screenshot.
- **Changes**:
  - Initially removed the invalid `"stream-json": "node scripts/some-script.js"` script from [package.json](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/package.json).
  - Configured `"stream-json": "claude --output-format=stream-json"` in [package.json](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/package.json) after identifying that the VS Code extension runs this script to launch the Claude Code panel interface, which requires matching input and output formatting options.
- **Summary**: Replaced the invalid stream-json script with a call to the global `claude` command with output-format flags in [package.json](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/package.json), fully restoring Claude Code panel functionality in the IDE.

---

