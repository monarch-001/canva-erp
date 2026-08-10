# Database Security & Multi-Tenancy Rules

All future development, queries, and schema designs on this repository must strictly adhere to these rules. This prevents conflicts and unauthorized data access across the shared **Chhabee AIOS** and **Canva ERP** systems.

---

## 1. Database Row-Level Security (RLS) Rules

*   **Rule 1.1: Enable RLS on All New Tables**
    Any new table created for Canva ERP must immediately have Row-Level Security enabled:
    ```sql
    ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
    ```

*   **Rule 1.2: Tenant Isolation Policies**
    Every new table must include a permissive policy isolating data by `tenant_id`:
    ```sql
    CREATE POLICY "tenant_isolation_<table_name>" ON public.<table_name>
      FOR ALL TO authenticated 
      USING (tenant_id = current_tenant_id()) 
      WITH CHECK (tenant_id = current_tenant_id());
    ```

*   **Rule 1.3: Nested Table Policies**
    For tables without a direct `tenant_id` column (e.g. join tables like `job_card_assignments`), verify tenancy by querying the parent record:
    ```sql
    CREATE POLICY "tenant_isolation_<join_table>" ON public.<join_table>
      FOR ALL TO authenticated 
      USING (
        EXISTS (
          SELECT 1 FROM public.<parent_table> parent 
          WHERE parent.id = <join_table>.<parent_fk_id> AND parent.tenant_id = current_tenant_id()
        )
      );
    ```

---

## 2. Code Querying Rules (Frontend & API)

*   **Rule 2.1: Explicit Tenant Filtering**
    Even though RLS handles safety, all queries using the Supabase client or SQL MUST explicitly pass the `tenant_id` to optimize indexes and double-check queries:
    ```javascript
    // Example: Always chain .eq('tenant_id', currentTenantId)
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('tenant_id', activeTenantId);
    ```

---

## 3. Route & Component Authentication Rules

*   **Rule 3.1: Double-Gate Authorization**
    Any dashboard, API route, or interactive feature belonging to Canva ERP (factory-specific) must be protected by a double-gate check checking both the **Tenant Type** and the **User Role**:
    
    ```javascript
    // Example Guard Logic
    function canAccessFactoryModule(userRoles, tenantSettings) {
      const isFactoryTenant = tenantSettings.business_type === 'factory';
      const hasFactoryRole = userRoles.some(r => ['factory_manager', 'supervisor', 'carpenter'].includes(r.role));
      
      return isFactoryTenant && hasFactoryRole;
    }
    ```

*   **Rule 3.2: Graceful Fallbacks**
    If a user is authenticated but the `tenant_type` does not match the workspace they are trying to access, redirect them to their home workspace dashboard with a warning toast, rather than crashing or rendering blank states.
