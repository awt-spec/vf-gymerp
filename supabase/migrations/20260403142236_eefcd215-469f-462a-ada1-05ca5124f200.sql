CREATE POLICY "Members can view own exercise plans"
ON public.exercise_plans
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
  )
);