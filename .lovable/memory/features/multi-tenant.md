---
name: Multi-tenant SaaS architecture
description: Gym ERP is multi-tenant SaaS - gyms table, gym_id on all tables, /admin login, /register-gym flow
type: feature
---
- `gyms` table: id, name, slug, logo_url, primary_color, owner_user_id, subscription_status, trial_ends_at
- `gym_staff` table: links users to gyms (gym_id + user_id)
- All core tables have `gym_id` column (nullable for backward compat)
- `get_user_gym_id()` DB function to resolve user's gym
- `super_admin` role added to app_role enum for platform admins
- `/admin` route: separate admin login (verifies admin/super_admin role)
- `/register-gym` route: 2-step gym registration (gym info → admin account)
- `GymProvider` context provides gymId to all components
- Edge function `create-member-auth` accepts gym_id to scope new members
