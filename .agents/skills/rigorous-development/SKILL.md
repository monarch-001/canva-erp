---
name: rigorous-development
description: >-
  Enforces a rigorous development lifecycle: Draft Specification -> Discuss & Critique -> Finalize -> Code -> Test Run -> Log Future Scope.
  Log file maintenance is MANDATORY at every step.
---

# Rigorous Development Lifecycle

Any agent or developer executing tasks in this codebase **must** adhere to this structured workflow. Skipping any step is not acceptable.

---

## Step 0: Check & Create Today's Log File (MANDATORY FIRST STEP)

**Before doing anything else**, check whether today's log file exists.

```bash
# Log files live at:
chat_logs/YYYY-MM-DD.md   (e.g. chat_logs/2026-08-10.md)
```

- If the file **does not exist**, create it with the standard heading:
  ```markdown
  # Development & Chat Log: YYYY-MM-DD
  ```
- If it **exists**, open it and append to it. Never overwrite previous entries.
- Run the maintenance script to generate weekly summaries and clean up old logs:
  ```bash
  node scripts/manage_logs.js
  ```

> ⚠️ **This step is non-negotiable.** Log files are the project's audit trail and are shared with teammates and the project owner. Missing logs break session continuity.

---

## Step 1: Draft the Specification / PRD
- Before writing any code, draft the technical specifications or requirements updates.
- Document the proposed schema changes, UI changes, and routing logic.
- Save the spec as a markdown file (in `chat_logs/` or as a project artifact).

---

## Step 2: Critique & Contradiction
- Engage in a collaborative, critical discussion.
- Highlight potential edge cases, database constraints, performance issues, and RLS bypasses.
- Do not agree immediately; challenge assumptions to ensure the solution is robust.

---

## Step 3: Finalize
- Save the agreed-upon design to a planning or specification file in the project.
- Obtain user approval before proceeding to code.

---

## Step 4: Code Implementation
- Implement the code based strictly on the finalized design.
- Adhere to the project's RLS and security guidelines (see `.agents/rules/security_and_tenancy.md`).
- Never create new database tables if an existing Chhabee AIOS table can be reused or extended.

---

## Step 5: Test Run Verification
- Execute, compile, lint, or run the code.
- Restart both servers if backend routes were changed:
  ```bash
  # Terminal 1
  npm run server   # Express API on port 5000
  # Terminal 2
  npm run dev      # Vite frontend on port 5173
  ```
- Validate the page or feature works correctly and matches the Stitch styling.
- Check the browser console for errors before marking complete.

---

## Step 6: Append to Today's Log File (MANDATORY FINAL STEP)

After completing the work, **always append a session entry** to `chat_logs/YYYY-MM-DD.md`:

```markdown
## Session at HH:MM (Local Time)
- **Goal**: [Brief goal of this session]
- **Changes**: [List every file modified and what changed]
- **Deployments/Git**: [Any git pushes, pulls, or deployment triggers]
- **Summary**: [Short summary of the conversation and decisions made]
```

---

## Step 7: Log Future Scope (Deferred Items)

If any features, optimizations, or test cases are bypassed or deferred, document them immediately in a **Future Scope** section of today's log:

```markdown
## Future Scope / Deferred Items
- [ ] [Feature or bug deferred, with reason]
- [ ] [Optimization to revisit]
```

This ensures no work item is ever silently dropped between sessions.
