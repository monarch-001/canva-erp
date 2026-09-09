---
name: prd-backlog-mapper
description: >-
  Scans project PRDs line-by-line to extract, categorize, and track every task, UI element, button function, and visual style.
  Maintains a master backlog to prevent omissions during implementation.
---

# PRD Task Extraction & Backlog Mapping Skill

This skill ensures that no requirement, UI button, validation rule, or visual feature described in the PRDs is missed or forgotten during implementation.

---

## 1. Goal
To systematically parse the raw Product Requirement Documents (PRDs) line-by-line, extract all functional requirements, and record them in a central tracking file so the developer/agent remains focused and thorough.

---

## 2. Step-by-Step Scan & Mapping Protocol

### Step 2.1: Establish the Backlog File
- Check if a master backlog tracking file `PRDS_BACKLOG.md` exists in the project root. If not, create it.
- When working on a specific PRD module (e.g., `PRD-02-Work-Order-Management.md`), create a dedicated section for it in the backlog.

### Step 2.2: Line-by-Line Extraction Checklist
For the active module, read the PRD file in `PRDS/` line-by-line and extract:
1.  **User Actions & Buttons**: Every button, input form, selector, modal trigger, or link. Note their labels, expected click actions, state updates, and target APIs.
2.  **Visual Elements**: Layout specifications, alignment guidelines, highlights, warning boxes, styling rules, and responsive behavior.
3.  **Business Logic & Validations**: Input field constraints, tenant isolation checks, permission restrictions, status dependencies, and error handling behaviors.
4.  **Backend Dependencies**: Target API routes, query parameters, payload structures, database column mappings, and transaction rules.

### Step 2.3: Map to Backlog Cards
Format each extracted item in the backlog with a distinct status checkbox:
- `[ ] NOT STARTED`
- `[ ] IN PROGRESS`
- `[ ] COMPLETED`
Include the exact line reference or section name from the original PRD file.

---

## 3. Execution Verification (Zero-Omission Gate)

Before presenting a completed task or page to the user:
1.  Open the active module's section in `PRDS_BACKLOG.md`.
2.  Run through each checkbox line-by-line.
3.  Confirm that the code has implemented the exact button, validation, or visual style listed.
4.  If any item was deferred or skipped, it MUST be logged in the "Future Scope / Deferred Items" section of the daily log file with a clear justification.
