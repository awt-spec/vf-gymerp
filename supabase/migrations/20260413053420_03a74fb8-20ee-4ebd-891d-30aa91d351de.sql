
CREATE POLICY "Public can view basic gym info"
ON public.gyms
FOR SELECT
TO anon
USING (true);
