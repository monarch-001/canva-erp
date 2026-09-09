---
name: ui-button-action-audit
description: >-
  Systematic protocol to audit and verify that every visible UI button box, link, and trigger has valid frontend handlers and backend routes.
---

# UI Button & Action Audit Protocol

This skill enforces a zero-dead-button policy across all screens. Every visible clickable element (button, link, tab, select menu, card container) shown on a screen MUST be fully functional and backed by real database and business logic.

---

## 1. Audit Phase (Screen-by-Screen & Button-by-Button)

Every time a page is loaded, reviewed, or presented to the user:
1.  **Extract All Visible Buttons**: Take a Playwright screenshot of the page. List every visible button, link, selector, tab header, and input container.
2.  **Audit Click Handlers**: Open the React component code (e.g., `QuotationDetail.tsx`). Locate the onClick handler for each visible element.
3.  **Trace Routing Table**: If the click handler calls `navigate(path)`, verify that `path` is registered to a valid component in `src/App.tsx`.
4.  **Audit Staging APIs**: If the handler triggers a database or server request (`fetch(...)` or `axios.get(...)`), verify that:
    *   The route is fully implemented in `server/index.js`.
    *   The database columns queried in the SQL command match the actual schema (e.g. using `notes` instead of `special_notes`).
    *   The staging database has test records to successfully return data without triggering a 500 error or hanging.

---

## 2. Zero-Dead-Button Checklist

Before marking any module or screen as **COMPLETED**, verify:
- [ ] No button box redirects the user to the `/dashboard` page because of a missing route.
- [ ] No button box triggers a simple mock `alert("Action Clicked")` unless explicitly specified as future scope in the PRD.
- [ ] No button box throws a `404` or `500` server/proxy error in the browser console.
- [ ] Edit modals validate inputs and update the database successfully.
- [ ] Duplication flow duplicates entries and returns a valid UUID to navigate.
- [ ] Deletion and status transitions trigger atomic database updates and update logs.

---

## 3. Reporting Gaps

If any dead or partially implemented buttons are found:
1.  Do not skip them or proceed without reporting.
2.  Design the missing backend route or frontend logic.
3.  Implement the missing database queries.
4.  Re-run the Playwright click flow to confirm the action succeeds with `0 Errors` in the console.
