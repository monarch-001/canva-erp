# PRD-01: AUTHENTICATION & USER MANAGEMENT
## Canva Concepts — Factory ERP
## Version 1.0 | July 2026

---

## 1. MODULE OVERVIEW

### Purpose
Controls who can access the system, what they can see,
and what they can do. This module is the security foundation
of the entire ERP — every other module depends on it.

### Users of This Module
- Factory Manager: Creates, edits, deactivates all users
- All roles: Login, logout, change own password

### Key Outcomes
- Only authorised users can access the system
- Each user sees only what their role permits
- All user activity is traceable to a named individual
- No self-registration — all accounts are managed centrally

---

## 2. EXISTING BUILD STATUS

The following is already built and working in Supabase.
Do NOT recreate.

### Tables (already exist)
```
public.profiles        — User profiles
public.role_scope      — Role access configuration
public.audit_log       — Activity audit trail
```

### Functions (already exist)
```
is_incoming_partner()      — Returns true if factory_manager
get_current_user_role()    — Returns current user's role
```

### Screens (already built — review and enhance only)
```
/auth    — Login screen (working)
/users   — User management screen (partially built)
```

### What Still Needs to Be Built
```
[ ] User list on /users screen
[ ] Edit user screen
[ ] Deactivate user functionality
[ ] Change password screen for all users
[ ] First-login password change prompt
[ ] User detail view
[ ] Role-based navigation enforcement
```

---

## 3. DATABASE SCHEMA

### 3.1 profiles (ALREADY EXISTS — shown for reference)

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id)
    ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'incoming_partner',
    'supervisor',
    'carpenter',
    'chhabee_spoc',
    'chhabee_partner'
  )),
  phone TEXT,
  employee_id TEXT UNIQUE,
  designation TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Note: role values are internal names. UI displays business names.

### 3.2 role_scope (ALREADY EXISTS — shown for reference)

```sql
-- Seeded with these 5 rows:
incoming_partner  → all_work_orders
supervisor        → all_work_orders
carpenter         → own_tasks_only
chhabee_spoc      → own_work_orders
chhabee_partner   → chhabee_work_orders
```

### 3.3 RLS Policies on profiles (ALREADY EXISTS)
```
Users can view own profile
Factory Manager can view all profiles
Factory Manager can insert profiles
Factory Manager can update profiles
```

---

## 4. SCREENS & FLOWS

### 4.1 Login Screen (/auth) — ALREADY BUILT, REVIEW ONLY

Current state: Working. Review these items:

**Must have:**
- Email input (type=email)
- Password input (type=password, toggle show/hide)
- Sign In button
- "Forgot Password?" link → triggers Supabase password reset email
- Error message display: "Invalid email or password"
  (never say which one is wrong — security)
- Loading state on Sign In button while authenticating

**Must NOT have:**
- Sign Up / Register link
- Social login buttons (Google, GitHub etc.)
- "Remember me" checkbox (session handled by Supabase)

**After successful login:**
- Fetch user profile from public.profiles using auth.uid()
- Store role in app state
- Redirect based on role:
  ```
  incoming_partner  → /work-orders
  supervisor        → /work-orders
  chhabee_spoc      → /work-orders
  chhabee_partner   → /work-orders
  carpenter         → /my-tasks
  ```

**If profile not found after login:**
- Show error: "Account not fully set up.
  Contact your Factory Manager."
- Sign out the user automatically
- Do not allow access to any screen

---

### 4.2 User Management Screen (/users)

Access: factory_manager only
Other roles: redirect to /work-orders with toast
"You don't have permission to access this page"

**Layout:**
```
Page title: "User Management"
Sub-title: "Manage team access and roles"
Top right: "Add New User" button

Search bar: Search by name, email, employee ID

Filter tabs:
  All | Active | Inactive
  (shows count in each tab)

User list (table on desktop, cards on mobile)
```

**User list columns:**
```
Name (full_name)
Role (display business name — see role mapping)
Employee ID
Designation
Phone
Status badge: Active (green) / Inactive (red)
Last Sign In (from auth.users)
Actions: Edit | Deactivate/Activate
```

**Role display mapping in UI:**
```
incoming_partner → Factory Manager
supervisor       → Factory Supervisor
carpenter        → Carpenter
chhabee_spoc     → Site Manager
chhabee_partner  → Super Admin
```

**Sorting:**
Default sort: Active users first, then by full_name A-Z.
Clicking column header sorts by that column.

**Empty state:**
"No users found. Add your first team member."

---

### 4.3 Add New User (Modal or drawer on /users)

Triggered by: "Add New User" button
Access: factory_manager only

**Form fields:**
```
Full Name *         TEXT
Email *             EMAIL (must be unique)
Temporary Password* TEXT (min 8 chars)
                    Helper text: "User will be prompted
                    to change this on first login"
Role *              DROPDOWN
  Options (show business names, store internal names):
    Factory Manager   (incoming_partner)
    Factory Supervisor (supervisor)
    Carpenter         (carpenter)
    Site Manager      (chhabee_spoc)
    Super Admin       (chhabee_partner)
Phone               TEXT
Employee ID         TEXT (must be unique if entered)
Designation         TEXT
Active              TOGGLE (default: ON)
```

**On Submit:**
```
Step 1: Validate all required fields
Step 2: Check email uniqueness in auth.users
Step 3: Call supabase.auth.admin.createUser({
  email: [email],
  password: [temporary_password],
  email_confirm: true,
  user_metadata: { full_name: [name] }
})
Step 4: Get the new user's UUID from response
Step 5: Insert into public.profiles:
  id = UUID from Step 4
  full_name, role (internal name), phone,
  employee_id, designation, is_active
Step 6: If profiles insert fails:
  Delete the auth user (prevent orphan)
  Show error toast: "Failed to create user. Try again."
  Stop.
Step 7: Show success toast:
  "[Full Name] added as [Business Role]"
Step 8: Close modal, refresh user list
Step 9: Insert into audit_log:
  action: INSERT
  entity_table: profiles
  entity_id: new user UUID
  after: profile data
```

**Validation rules:**
```
Full Name: required, min 2 chars
Email: required, valid format, unique
Password: required, min 8 chars
Role: required
Employee ID: unique if entered (allow blank)
```

---

### 4.4 Edit User (Modal on /users)

Triggered by: Edit button on user row
Access: factory_manager only

**Editable fields:**
```
Full Name *
Role *
Phone
Employee ID
Designation
Active (toggle)
```

**NOT editable:**
```
Email (cannot change email — security)
Password (separate flow — see 4.5)
```

**On Submit:**
```
Step 1: Validate fields
Step 2: UPDATE public.profiles SET
  full_name, role, phone, employee_id,
  designation, is_active, updated_at = NOW()
  WHERE id = [user_id]
Step 3: If role changed to/from carpenter:
  Show warning: "Changing role will affect
  what this user can access. Confirm?"
Step 4: Show success toast: "User updated"
Step 5: Insert into audit_log
Step 6: Refresh user list
```

---

### 4.5 Deactivate / Reactivate User

Triggered by: Deactivate button on user row
Access: factory_manager only

**Deactivate flow:**
```
Show confirmation dialog:
  "Deactivate [Name]?
   They will no longer be able to log in.
   All their work orders and job cards
   remain in the system."
  Buttons: Cancel | Deactivate

On confirm:
  UPDATE public.profiles
  SET is_active = false, updated_at = NOW()
  WHERE id = [user_id]
  Insert into audit_log
  Show toast: "[Name] has been deactivated"
  Refresh list
```

**Reactivate flow:**
```
Show confirmation dialog:
  "Reactivate [Name]?
   They will be able to log in again."
  Buttons: Cancel | Reactivate

On confirm:
  UPDATE public.profiles
  SET is_active = true, updated_at = NOW()
  WHERE id = [user_id]
  Insert into audit_log
  Show toast: "[Name] has been reactivated"
```

**Business rules:**
- factory_manager CANNOT deactivate themselves
- If user tries: show error "You cannot deactivate
  your own account"
- Minimum 1 active factory_manager must always exist
- Deactivated users cannot log in (enforced by RLS
  checking is_active = true in is_incoming_partner())

---

### 4.6 Reset User Password

Triggered by: "Reset Password" button on edit user modal
Access: factory_manager only

**Flow:**
```
Show confirmation:
  "Send password reset email to [email]?"
  Buttons: Cancel | Send Reset Email

On confirm:
  Call supabase.auth.admin.generateLink({
    type: 'recovery',
    email: [user_email]
  })
  Send reset email
  Show toast: "Password reset email sent to [email]"
```

---

### 4.7 Change Own Password (/profile)

Accessible to: all logged-in users
Triggered by: "Change Password" in user profile menu

**Form:**
```
Current Password *
New Password * (min 8 chars)
Confirm New Password *
```

**On Submit:**
```
Step 1: Validate passwords match and min length
Step 2: Call supabase.auth.updateUser({
  password: [new_password]
})
Step 3: Show success toast: "Password changed"
Step 4: Redirect to /work-orders
```

---

### 4.8 First Login Password Change Prompt

When user logs in for the first time with temporary password
(CanvaERP@2026), system should prompt password change.

**Detection method:**
On login, check if password was set in the last 5 minutes
(from auth.users.created_at vs last_sign_in_at).
OR: Add a field to profiles: must_change_password BOOLEAN DEFAULT true
Set to false after first password change.

**Flow:**
```
After login, check profiles.must_change_password
If true: redirect to /change-password (forced)
  Show banner: "Please set a new password to continue"
  Do not allow navigation to other screens
  until password is changed
On password change: set must_change_password = false
Then redirect to role-appropriate home screen
```

**Add this column to profiles:**
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS
must_change_password BOOLEAN DEFAULT true;

-- Set existing users (already set their password) to false
UPDATE public.profiles
SET must_change_password = false
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'gurdev@chaabee.com'
);
```

---

### 4.9 User Profile Page (/profile)

Accessible to: all logged-in users
Shows own profile information. Read-only except password.

**Displays:**
```
Full Name
Role (display business name)
Employee ID
Designation
Phone
Email
Member Since (created_at)
```

**Actions:**
```
"Change Password" button → see 4.7
"Sign Out" button → supabase.auth.signOut()
              → redirect to /auth
```

---

### 4.10 Session Management

```
Session persistence: Supabase handles via localStorage
Session expiry: Default Supabase (1 week)
On session expire: Redirect to /auth with toast
  "Your session has expired. Please sign in again."
On unauthorized access: Redirect to /auth
After sign out: Clear all app state, redirect to /auth
```

---

## 5. BUSINESS RULES

```
BR-01: No self-registration. All accounts created by
       factory_manager via /users screen only.

BR-02: factory_manager cannot deactivate their own account.

BR-03: Minimum 1 active factory_manager must exist at all times.
       System blocks deactivation of last factory_manager.

BR-04: Email cannot be changed after account creation.

BR-05: Deactivated users cannot log in.
       RLS checks is_active = true.

BR-06: Carpenter role does not have access to Lovable web app.
       If carpenter logs in via web, redirect to /my-tasks
       which shows "Please use the mobile app for your tasks."

BR-07: Role changes take effect immediately on next page load.

BR-08: All user creation, edits, deactivations are logged
       in audit_log with factory_manager's ID as actor.

BR-09: Password reset emails go to the user's registered email.
       factory_manager cannot see or set passwords directly —
       only trigger reset emails or create with temp password.

BR-10: must_change_password prevents access to any screen
       until password is changed after first login.
```

---

## 6. NOTIFICATIONS & ALERTS

```
User created:
  Toast to factory_manager: "[Name] added as [Role]"

User deactivated:
  Toast to factory_manager: "[Name] deactivated"

Password reset sent:
  Toast to factory_manager: "Reset email sent to [email]"

Session expired:
  Toast: "Your session has expired. Please sign in again."

Unauthorized access attempt:
  Toast: "You don't have permission to access this page"
  Redirect to home screen for their role
```

---

## 7. TESTING CHECKLIST

After building, verify each item:

**Login:**
[ ] Valid credentials → successful login and redirect
[ ] Invalid credentials → error message shown
[ ] No sign up link visible
[ ] Forgot password → email received
[ ] After password reset → can login with new password
[ ] Inactive user → cannot login
[ ] Profile not found → error shown, user signed out

**User Management:**
[ ] /users only accessible to factory_manager
[ ] Other roles redirected to /work-orders
[ ] User list shows all users with correct info
[ ] Active/Inactive filter tabs work
[ ] Search by name works
[ ] Search by email works

**Create User:**
[ ] All 5 roles available in dropdown
[ ] Duplicate email rejected
[ ] Short password rejected (< 8 chars)
[ ] New user can login with temporary password
[ ] Profile row created in Supabase profiles table
[ ] audit_log entry created
[ ] must_change_password = true for new user

**Edit User:**
[ ] Changes saved correctly
[ ] Email field not editable
[ ] Role change takes effect immediately

**Deactivate:**
[ ] Deactivated user cannot login
[ ] factory_manager cannot deactivate self
[ ] Reactivate restores login access

**First Login:**
[ ] must_change_password = true blocks navigation
[ ] Password change sets must_change_password = false
[ ] User can navigate normally after password change

---

## 8. INTEGRATION POINTS

This module is referenced by ALL other modules:
- Every RLS policy uses is_incoming_partner()
  or get_current_user_role()
- Every audit_log entry references profiles.id
- Job cards reference profiles.id (carpenter assignment)
- Work orders reference profiles.id (created_by,
  assigned_supervisor, approved_by)
- Attendance references profiles.id

---

*Document version: 1.0*
*Prerequisites: PRD-00 must be read first*
*Next document: PRD-02 Work Order Management*
