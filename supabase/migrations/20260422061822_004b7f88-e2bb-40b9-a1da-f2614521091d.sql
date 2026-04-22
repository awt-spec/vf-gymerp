
-- Allow any authenticated user to create a gym (they become the owner)
CREATE POLICY "Authenticated users can create their own gym"
ON public.gyms
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

-- Allow gym owners to delete their own gym
CREATE POLICY "Gym owners can delete own gym"
ON public.gyms
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- Allow users to self-assign 'admin' role (needed when registering first gym)
CREATE POLICY "Users can self-assign admin role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'admin'::app_role);

-- Allow gym owners to insert subscriptions for their own gyms
CREATE POLICY "Gym owners can create own subscription"
ON public.gym_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (gym_id IN (SELECT public.get_owned_gym_ids(auth.uid())));
