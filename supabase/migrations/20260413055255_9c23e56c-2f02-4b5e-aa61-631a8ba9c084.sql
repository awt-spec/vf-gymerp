
-- 1. Create security definer functions to break recursion

CREATE OR REPLACE FUNCTION public.get_staff_gym_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gym_id FROM public.gym_staff WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.get_owned_gym_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.gyms WHERE owner_user_id = _user_id
$$;

-- 2. Fix gyms table policies

DROP POLICY IF EXISTS "Staff can view their gym" ON public.gyms;
CREATE POLICY "Staff can view their gym"
  ON public.gyms FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_staff_gym_ids(auth.uid())));

DROP POLICY IF EXISTS "Gym owners can view own gym" ON public.gyms;
CREATE POLICY "Gym owners can view own gym"
  ON public.gyms FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Gym owners can update own gym" ON public.gyms;
CREATE POLICY "Gym owners can update own gym"
  ON public.gyms FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid());

-- 3. Fix gym_staff policies (was referencing gyms)

DROP POLICY IF EXISTS "Gym admins can manage own staff" ON public.gym_staff;
CREATE POLICY "Gym admins can manage own staff"
  ON public.gym_staff FOR ALL TO authenticated
  USING (gym_id IN (SELECT public.get_owned_gym_ids(auth.uid())))
  WITH CHECK (gym_id IN (SELECT public.get_owned_gym_ids(auth.uid())));

-- 4. Fix gym_subscriptions policy

DROP POLICY IF EXISTS "Gym admins can view own subscription" ON public.gym_subscriptions;
CREATE POLICY "Gym admins can view own subscription"
  ON public.gym_subscriptions FOR SELECT TO authenticated
  USING (gym_id IN (SELECT public.get_owned_gym_ids(auth.uid())));

-- 5. Fix gym_invoices policy

DROP POLICY IF EXISTS "Gym admins can view own invoices" ON public.gym_invoices;
CREATE POLICY "Gym admins can view own invoices"
  ON public.gym_invoices FOR SELECT TO authenticated
  USING (gym_id IN (SELECT public.get_owned_gym_ids(auth.uid())));

-- 6. Fix gym_features policy

DROP POLICY IF EXISTS "Gym staff can view own features" ON public.gym_features;
CREATE POLICY "Gym staff can view own features"
  ON public.gym_features FOR SELECT TO authenticated
  USING (
    gym_id IN (SELECT public.get_staff_gym_ids(auth.uid()))
    OR
    gym_id IN (SELECT public.get_owned_gym_ids(auth.uid()))
  );
