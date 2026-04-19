CREATE POLICY "Receptionist can view shop_products"
ON public.shop_products
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Receptionist can manage shop_sales"
ON public.shop_sales
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'receptionist'))
WITH CHECK (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Receptionist can view expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Receptionist can view budgets"
ON public.budgets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Receptionist can view fixed_assets"
ON public.fixed_assets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'receptionist'));

CREATE POLICY "Receptionist can view inventory"
ON public.inventory
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'receptionist'));