CREATE POLICY "Members can view own nutrition plans"
ON public.nutrition_plans
FOR SELECT
TO authenticated
USING (member_id IN (
  SELECT id FROM public.members WHERE auth_user_id = auth.uid()
));