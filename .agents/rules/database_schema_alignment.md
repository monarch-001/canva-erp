# Database Schema Alignment & Drift Prevention Rules

This rule ensures that any database queries (SQL, pg pools, Supabase client calls), API data structures, and UI interfaces match the active database schema precisely. This prevents runtime errors caused by deleted columns, renamed fields, or mismatched data types.

---

## 1. Mandatory Schema Cross-Verification
Whenever you write, edit, or refactor code that interacts with the database (e.g. `server/index.js` routes, queries, data models, or forms), you **must** perform a schema alignment check.

### Checklist:
1.  **Column Reference Check**: Look up the target table's columns in [`schema/chaabee_sql.sql`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/schema/chaabee_sql.sql) and your active migration scripts (`db_migration_pr_handoff.md`). Confirm every referenced column exists and is spelled correctly.
2.  **Data Type Check**: Ensure the data types passed in API payloads match the database data types:
    *   UUID fields must receive valid UUID values (not generic strings or numbers).
    *   Numeric values must map correctly to standard integer or numeric database columns.
    *   Date/Time parameters must use proper ISO-8601 formatting.
3.  **Constraint Validation**: Check for `NOT NULL` constraints, unique indexes, and foreign keys. Ensure queries do not violate these constraints.
4.  **No Dead Columns**: Verify that no query references columns that have been deprecated, deleted, or altered in recent migrations.

---

## 2. API & Client Query Auditing
- When creating new REST API endpoints, document the expected database request/response payload schemas.
- If database columns are altered, immediately perform a global search in the project (e.g. in `/server` and `/src`) to locate and update all instances where those fields are queried or rendered.

---

## 3. Log Declaration Requirement
When recording changes in the daily log under [`chat_logs/`](file:///C:/Users/ASUS/Desktop/CANVA%20ERP/chat_logs/), you must include a validation statement confirming:
> *"Verified all SQL/database queries against the active database schema (`schema/chaabee_sql.sql`) to ensure no drift, missing columns, or type mismatches exist."*
