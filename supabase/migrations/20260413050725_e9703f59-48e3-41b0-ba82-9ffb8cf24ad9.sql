
-- Create gyms table
CREATE TABLE public.gyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00E676',
  email TEXT,
  phone TEXT,
  address TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- Create gym_staff junction FIRST (before policies that reference it)
CREATE TABLE public.gym_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id)
);

ALTER TABLE public.gym_staff ENABLE ROW LEVEL SECURITY;

-- Now create policies for gyms
CREATE POLICY "Super admins can manage all gyms" ON public.gyms
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) 
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Gym owners can view own gym" ON public.gyms
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Gym owners can update own gym" ON public.gyms
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Staff can view their gym" ON public.gyms
  FOR SELECT TO authenticated
  USING (id IN (SELECT gym_id FROM public.gym_staff WHERE user_id = auth.uid()));

-- Policies for gym_staff
CREATE POLICY "Super admins can manage gym_staff" ON public.gym_staff
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Gym admins can manage own staff" ON public.gym_staff
  FOR ALL TO authenticated
  USING (gym_id IN (SELECT id FROM public.gyms WHERE owner_user_id = auth.uid()))
  WITH CHECK (gym_id IN (SELECT id FROM public.gyms WHERE owner_user_id = auth.uid()));

CREATE POLICY "Staff can view own membership" ON public.gym_staff
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Add gym_id to core tables
ALTER TABLE public.members ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.plans ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.classes ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.inventory ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.shop_products ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.shop_sales ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.promotions ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.check_ins ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.exercise_plans ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.nutrition_plans ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.budgets ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.cash_registers ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.fixed_assets ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.workout_logs ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_user_gym_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gym_id FROM public.gym_staff WHERE user_id = _user_id LIMIT 1
$$;

-- Indexes
CREATE INDEX idx_members_gym ON public.members(gym_id);
CREATE INDEX idx_plans_gym ON public.plans(gym_id);
CREATE INDEX idx_payments_gym ON public.payments(gym_id);
CREATE INDEX idx_classes_gym ON public.classes(gym_id);
CREATE INDEX idx_inventory_gym ON public.inventory(gym_id);
CREATE INDEX idx_check_ins_gym ON public.check_ins(gym_id);
CREATE INDEX idx_gym_staff_user ON public.gym_staff(user_id);
CREATE INDEX idx_gym_staff_gym ON public.gym_staff(gym_id);
