# Work Order Implementation Specification

This document finalizes the design decisions for the **Work Order Management** module, incorporating critical mitigations aligned on during the critique phase.

---

## 1. Database Schema Additions

### `work_orders` Table Additions/Modifications
*   Link to existing Chhabee structures:
    *   `project_id` UUID REFERENCES `public.projects(id) ON DELETE SET NULL`
    *   `client_org_id` UUID REFERENCES `public.organisations(id) ON DELETE SET NULL`
*   Add `tenant_id` UUID REFERENCES `public.tenants(id) ON DELETE CASCADE` for multi-tenant isolation.
*   Update profile references (`created_by`, `assigned_supervisor`, `approved_by`) to point to `public.profiles(user_id)`.

### `tenant_settings` Table Additions
*   Add `max_daily_furniture_volume` NUMERIC DEFAULT 20 (used to calculate production capacity limitations).

---

## 2. Finalized Rules & Logic

### Rule 2.1: Loose Status Flow with Warnings (No Strict DB Blocks)
*   **Behavior**: Users can bypass statuses (e.g. starting production before BOM/material checks are complete) to support real-world factory workflows.
*   **Implementation**: 
    *   The database will allow direct status updates without throwing strict errors.
    *   The frontend UI will display a **Soft Warning Badge** (e.g., *"BOM/Material checks pending for this order"*) but will NOT block the user from proceeding.

### Rule 2.2: Atomic Cancellation & Inventory Release
*   **Behavior**: When a Factory Manager cancels a Work Order, any reserved materials are automatically freed.
*   **Implementation**: 
    *   A database trigger/transactional function updates `work_orders.status = 'cancelled'`.
    *   In the same transaction, any associated material reservations in `bom_items` or allocation ledgers are deleted or reset.

### Rule 2.3: Obsolescence-Safe PDF Exports
*   **Behavior**: PDFs printed for the factory floor must clearly indicate drawing versions to prevent workers from using outdated specifications.
*   **Implementation**:
    *   PDF queries will fetch only the drawing where `is_current = true`.
    *   The PDF header will contain a high-contrast warning banner: 
        `[ ACTIVE DRAWING: Version X.X - Last Updated: DD-MM-YYYY ]`

### Rule 2.4: Active Capacity Check Engine
*   **Behavior**: When setting the committed delivery date, a real-time production volume indicator guides the supervisor.
*   **Implementation**:
    *   Query the sum of `production_quantity` on active Work Orders due within ±3 days of the target date.
    *   Compare the sum against `tenant_settings.max_daily_furniture_volume`.
    *   Show a color-coded indicator on the date picker:
        *   **Green**: < 70% Capacity
        *   **Amber**: 70% - 100% Capacity
        *   **Red**: > 100% Capacity (Over-allocated)
