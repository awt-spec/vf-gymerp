-- ============================================================
-- 1. GYMS: Replace public anon SELECT with a safe public view
-- ============================================================
DROP POLICY IF EXISTS "Public can view basic gym info" ON public.gyms;

-- Public view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.gyms_public AS
SELECT
  id,
  name,
  slug,
  logo_url,
  primary_color,
  phone,
  email,
  address,
  custom_domain,
  setup_completed
FROM public.gyms;

-- Allow anon and authenticated to read the view
GRANT SELECT ON public.gyms_public TO anon, authenticated;

-- ============================================================
-- 2. PROFILES: Restrict SELECT to own profile + same-gym members
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow gym staff/owners to see profiles of users in their gym
CREATE POLICY "Gym staff can view gym member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gym_staff gs
    WHERE gs.user_id = profiles.id
      AND public.user_can_access_gym(auth.uid(), gs.gym_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.gyms g
    WHERE g.owner_user_id = profiles.id
      AND public.user_can_access_gym(auth.uid(), g.id)
  )
);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================
-- 3. EXERCISE_PLANS: Scope coach/admin policy by gym
-- ============================================================
DROP POLICY IF EXISTS "Coaches and admins can manage exercise plans" ON public.exercise_plans;

CREATE POLICY "Gym coaches and admins manage exercise plans"
ON public.exercise_plans
FOR ALL
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coach'::app_role))
  AND public.user_can_access_gym(auth.uid(), gym_id)
)
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coach'::app_role))
  AND public.user_can_access_gym(auth.uid(), gym_id)
);

-- ============================================================
-- 4. NUTRITION_PLANS: Scope coach/admin policy by gym
-- ============================================================
DROP POLICY IF EXISTS "Coaches and admins can manage nutrition plans" ON public.nutrition_plans;

CREATE POLICY "Gym coaches and admins manage nutrition plans"
ON public.nutrition_plans
FOR ALL
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coach'::app_role))
  AND public.user_can_access_gym(auth.uid(), gym_id)
)
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coach'::app_role))
  AND public.user_can_access_gym(auth.uid(), gym_id)
);

-- ============================================================
-- 5. MEAL_LOGS: Scope coach SELECT by gym (via member)
-- ============================================================
DROP POLICY IF EXISTS "Coaches can view member meal logs" ON public.meal_logs;

CREATE POLICY "Gym coaches view member meal logs"
ON public.meal_logs
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coach'::app_role))
  AND member_id IN (
    SELECT m.id FROM public.members m
    WHERE public.user_can_access_gym(auth.uid(), m.gym_id)
  )
);

-- ============================================================
-- 6. USER_ROLES: Prevent privilege escalation to super_admin
-- ============================================================
-- Drop any existing admin-management policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Gym admins can manage staff roles" ON public.user_roles;

-- Users can read their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Super admins can manage everything (including super_admin role)
CREATE POLICY "Super admins manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Gym admins can view roles of staff in their gym
CREATE POLICY "Gym admins view gym staff roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT gs.user_id FROM public.gym_staff gs
    WHERE public.user_can_access_gym(auth.uid(), gs.gym_id)
  )
);

-- Gym admins can assign/remove non-privileged roles to staff in their gym,
-- but NEVER super_admin
CREATE POLICY "Gym admins manage non-privileged roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
  AND user_id IN (
    SELECT gs.user_id FROM public.gym_staff gs
    WHERE public.user_can_access_gym(auth.uid(), gs.gym_id)
  )
);

CREATE POLICY "Gym admins delete non-privileged roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
  AND user_id IN (
    SELECT gs.user_id FROM public.gym_staff gs
    WHERE public.user_can_access_gym(auth.uid(), gs.gym_id)
  )
);