CREATE TABLE public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  logged_by uuid NOT NULL REFERENCES auth.users(id),
  meal_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL DEFAULT 'snack',
  food_name text NOT NULL,
  portion_grams numeric DEFAULT 100,
  calories numeric DEFAULT 0,
  protein_g numeric DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  fiber_g numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own meal logs"
ON public.meal_logs FOR ALL TO authenticated
USING (logged_by = auth.uid())
WITH CHECK (logged_by = auth.uid());

CREATE POLICY "Coaches can view member meal logs"
ON public.meal_logs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role)
);