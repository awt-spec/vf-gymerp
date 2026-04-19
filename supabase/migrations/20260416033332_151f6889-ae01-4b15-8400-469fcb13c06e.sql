CREATE POLICY "Gym admins can manage own features"
  ON public.gym_features FOR ALL
  TO authenticated
  USING (gym_id IN (SELECT get_owned_gym_ids(auth.uid())))
  WITH CHECK (gym_id IN (SELECT get_owned_gym_ids(auth.uid())));