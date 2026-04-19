
-- Gym subscriptions (platform billing)
CREATE TABLE public.gym_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'basic',
  monthly_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_payment_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage gym_subscriptions"
  ON public.gym_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Gym admins can view own subscription"
  ON public.gym_subscriptions FOR SELECT TO authenticated
  USING (gym_id IN (SELECT g.id FROM public.gyms g WHERE g.owner_user_id = auth.uid()));

-- Gym invoices
CREATE TABLE public.gym_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.gym_subscriptions(id),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  paid_date date,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage gym_invoices"
  ON public.gym_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Gym admins can view own invoices"
  ON public.gym_invoices FOR SELECT TO authenticated
  USING (gym_id IN (SELECT g.id FROM public.gyms g WHERE g.owner_user_id = auth.uid()));

-- Gym features (module toggles)
CREATE TABLE public.gym_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gym_id, feature_name)
);

ALTER TABLE public.gym_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage gym_features"
  ON public.gym_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Gym staff can view own features"
  ON public.gym_features FOR SELECT TO authenticated
  USING (gym_id IN (
    SELECT gs.gym_id FROM public.gym_staff gs WHERE gs.user_id = auth.uid()
    UNION
    SELECT g.id FROM public.gyms g WHERE g.owner_user_id = auth.uid()
  ));

-- Triggers for updated_at
CREATE TRIGGER update_gym_subscriptions_updated_at
  BEFORE UPDATE ON public.gym_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gym_invoices_updated_at
  BEFORE UPDATE ON public.gym_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gym_features_updated_at
  BEFORE UPDATE ON public.gym_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
