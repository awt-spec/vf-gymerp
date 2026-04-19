
-- Helper: check if user belongs to a gym (staff or owner)
CREATE OR REPLACE FUNCTION public.user_can_access_gym(_user_id uuid, _gym_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _gym_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.gym_staff WHERE user_id = _user_id AND gym_id = _gym_id)
    OR EXISTS (SELECT 1 FROM public.gyms WHERE owner_user_id = _user_id AND id = _gym_id)
  )
$$;

-- ============ MEMBERS ============
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can create members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can delete members" ON public.members;

CREATE POLICY "Gym staff can manage own members" ON public.members
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Members can view own record" ON public.members
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Super admins manage members" ON public.members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ PLANS ============
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.plans;
DROP POLICY IF EXISTS "Authenticated users can create plans" ON public.plans;
DROP POLICY IF EXISTS "Authenticated users can update plans" ON public.plans;
DROP POLICY IF EXISTS "Authenticated users can delete plans" ON public.plans;

CREATE POLICY "Gym staff can manage own plans" ON public.plans
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage plans" ON public.plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ SUBSCRIPTIONS ============
DROP POLICY IF EXISTS "Authenticated users can view subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can delete subscriptions" ON public.subscriptions;

CREATE POLICY "Gym staff can manage own subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Members can view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ PAYMENTS ============
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;

CREATE POLICY "Gym staff can manage own payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Members can view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ CLASSES ============
DROP POLICY IF EXISTS "Authenticated users can view classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can create classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can update classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can delete classes" ON public.classes;

CREATE POLICY "Gym staff can manage own classes" ON public.classes
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Members can view classes of their gym" ON public.classes
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT gym_id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage classes" ON public.classes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ CLASS_SCHEDULES (no gym_id, scoped via class) ============
DROP POLICY IF EXISTS "Authenticated users can view class_schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Authenticated users can create class_schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Authenticated users can update class_schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Authenticated users can delete class_schedules" ON public.class_schedules;

CREATE POLICY "Gym staff manage own class_schedules" ON public.class_schedules
  FOR ALL TO authenticated
  USING (class_id IN (SELECT id FROM public.classes WHERE public.user_can_access_gym(auth.uid(), gym_id)))
  WITH CHECK (class_id IN (SELECT id FROM public.classes WHERE public.user_can_access_gym(auth.uid(), gym_id)));

CREATE POLICY "Members view class_schedules of their gym" ON public.class_schedules
  FOR SELECT TO authenticated
  USING (class_id IN (
    SELECT id FROM public.classes 
    WHERE gym_id IN (SELECT gym_id FROM public.members WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Super admins manage class_schedules" ON public.class_schedules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ CLASS_BOOKINGS ============
DROP POLICY IF EXISTS "Authenticated users can view class_bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Authenticated users can create class_bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Authenticated users can update class_bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Authenticated users can delete class_bookings" ON public.class_bookings;

CREATE POLICY "Gym staff manage bookings of own gym" ON public.class_bookings
  FOR ALL TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE public.user_can_access_gym(auth.uid(), gym_id)))
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE public.user_can_access_gym(auth.uid(), gym_id)));

CREATE POLICY "Members manage own bookings" ON public.class_bookings
  FOR ALL TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()))
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage class_bookings" ON public.class_bookings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ CHECK_INS ============
DROP POLICY IF EXISTS "Authenticated users can view check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "Authenticated users can create check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "Authenticated users can update check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "Authenticated users can delete check_ins" ON public.check_ins;

CREATE POLICY "Gym staff manage own check_ins" ON public.check_ins
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Members view own check_ins" ON public.check_ins
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage check_ins" ON public.check_ins
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ EXPENSES ============
DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Receptionist can view expenses" ON public.expenses;

CREATE POLICY "Gym staff manage own expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ BUDGETS ============
DROP POLICY IF EXISTS "Admins can manage budgets" ON public.budgets;
DROP POLICY IF EXISTS "Receptionist can view budgets" ON public.budgets;

CREATE POLICY "Gym staff manage own budgets" ON public.budgets
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage budgets" ON public.budgets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ FIXED_ASSETS ============
DROP POLICY IF EXISTS "Admins can manage fixed_assets" ON public.fixed_assets;
DROP POLICY IF EXISTS "Receptionist can view fixed_assets" ON public.fixed_assets;

CREATE POLICY "Gym staff manage own fixed_assets" ON public.fixed_assets
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage fixed_assets" ON public.fixed_assets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ CASH_REGISTERS ============
DROP POLICY IF EXISTS "Admins can manage cash_registers" ON public.cash_registers;

CREATE POLICY "Gym staff manage own cash_registers" ON public.cash_registers
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage cash_registers" ON public.cash_registers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ INVENTORY ============
DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Coaches can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Receptionist can view inventory" ON public.inventory;

CREATE POLICY "Gym staff manage own inventory" ON public.inventory
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage inventory" ON public.inventory
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ SHOP_PRODUCTS ============
DROP POLICY IF EXISTS "Admins can manage shop_products" ON public.shop_products;
DROP POLICY IF EXISTS "Authenticated can view shop_products" ON public.shop_products;
DROP POLICY IF EXISTS "Receptionist can view shop_products" ON public.shop_products;

CREATE POLICY "Gym staff manage own shop_products" ON public.shop_products
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Members view shop_products of their gym" ON public.shop_products
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT gym_id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage shop_products" ON public.shop_products
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ SHOP_SALES ============
DROP POLICY IF EXISTS "Admins can manage shop_sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Authenticated can create shop_sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Authenticated can view shop_sales" ON public.shop_sales;
DROP POLICY IF EXISTS "Receptionist can manage shop_sales" ON public.shop_sales;

CREATE POLICY "Gym staff manage own shop_sales" ON public.shop_sales
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage shop_sales" ON public.shop_sales
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ PROMOTIONS ============
DROP POLICY IF EXISTS "Admins can manage promotions" ON public.promotions;

CREATE POLICY "Gym staff manage own promotions" ON public.promotions
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage promotions" ON public.promotions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ EXERCISE_PLANS (also scope by gym) ============
CREATE POLICY "Members view own exercise_plans by gym" ON public.exercise_plans
  FOR SELECT TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage exercise_plans" ON public.exercise_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ NUTRITION_PLANS ============
CREATE POLICY "Gym staff view nutrition_plans by gym" ON public.nutrition_plans
  FOR SELECT TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage nutrition_plans" ON public.nutrition_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ WORKOUT_LOGS ============
DROP POLICY IF EXISTS "Authenticated can manage workout_logs" ON public.workout_logs;

CREATE POLICY "Gym staff manage own workout_logs" ON public.workout_logs
  FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Members manage own workout_logs" ON public.workout_logs
  FOR ALL TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()))
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage workout_logs" ON public.workout_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ BODY_MEASUREMENTS ============
DROP POLICY IF EXISTS "Authenticated can manage body_measurements" ON public.body_measurements;

CREATE POLICY "Gym staff manage body_measurements" ON public.body_measurements
  FOR ALL TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE public.user_can_access_gym(auth.uid(), gym_id)))
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE public.user_can_access_gym(auth.uid(), gym_id)));

CREATE POLICY "Members view own body_measurements" ON public.body_measurements
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage body_measurements" ON public.body_measurements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ ACHIEVEMENTS ============
DROP POLICY IF EXISTS "Authenticated can manage achievements" ON public.achievements;

CREATE POLICY "Gym staff manage achievements" ON public.achievements
  FOR ALL TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE public.user_can_access_gym(auth.uid(), gym_id)))
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE public.user_can_access_gym(auth.uid(), gym_id)));

CREATE POLICY "Members view own achievements" ON public.achievements
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage achievements" ON public.achievements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ MEMBER_ONBOARDING ============
DROP POLICY IF EXISTS "Authenticated can manage onboarding" ON public.member_onboarding;

CREATE POLICY "Gym staff manage onboarding" ON public.member_onboarding
  FOR ALL TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE public.user_can_access_gym(auth.uid(), gym_id)))
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE public.user_can_access_gym(auth.uid(), gym_id)));

CREATE POLICY "Members manage own onboarding" ON public.member_onboarding
  FOR ALL TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()))
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage onboarding" ON public.member_onboarding
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
