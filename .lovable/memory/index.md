# Project Memory

## Core
Dark theme, neon green #00E676 primary, cyan accent. Space Grotesk headings, Inter body.
Lovable Cloud backend. Spanish UI. ERP de gimnasio SaaS multi-tenant.
Roles: super_admin, admin, coach, receptionist, member. Admin login at /admin.
Multi-tenant: gyms table, gym_id on all core tables, gym_staff for user-gym mapping.

## Memories
- [ERP Modules](mem://features/erp-modules) — Socios, Planes/Pagos, Control Acceso, Clases/Horarios
- [Roles & Permissions](mem://features/roles) — Admin: full access + contabilidad/inventario/cobranza. Coach: planes ejercicio/nutrición.
- [Multi-tenant](mem://features/multi-tenant) — SaaS architecture with gyms table, gym_id scoping, gym registration flow
