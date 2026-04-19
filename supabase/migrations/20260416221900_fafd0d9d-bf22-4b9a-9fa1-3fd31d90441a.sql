-- Add shift tracking columns to cash_registers
ALTER TABLE public.cash_registers
  ADD COLUMN IF NOT EXISTS shift_label text DEFAULT 'mañana',
  ADD COLUMN IF NOT EXISTS shift_number integer DEFAULT 1;

-- Allow gym owners to view roles of users that are staff of their gyms
CREATE POLICY "Gym owners can view staff roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT gs.user_id
    FROM public.gym_staff gs
    WHERE gs.gym_id IN (SELECT public.get_owned_gym_ids(auth.uid()))
  )
  OR user_id = auth.uid()
);

-- Allow gym owners to assign roles to their staff (admin/coach/receptionist only)
CREATE POLICY "Gym owners can assign staff roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role IN ('admin'::app_role, 'coach'::app_role, 'receptionist'::app_role)
  AND user_id IN (
    SELECT gs.user_id
    FROM public.gym_staff gs
    WHERE gs.gym_id IN (SELECT public.get_owned_gym_ids(auth.uid()))
  )
);

-- Allow gym owners to remove roles from their staff (only the manageable ones)
CREATE POLICY "Gym owners can remove staff roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  role IN ('admin'::app_role, 'coach'::app_role, 'receptionist'::app_role)
  AND user_id IN (
    SELECT gs.user_id
    FROM public.gym_staff gs
    WHERE gs.gym_id IN (SELECT public.get_owned_gym_ids(auth.uid()))
  )
);