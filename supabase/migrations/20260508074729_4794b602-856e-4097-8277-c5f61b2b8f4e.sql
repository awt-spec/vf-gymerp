
CREATE TABLE public.inbody_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  muscle_mass_kg numeric,
  body_fat_pct numeric,
  body_fat_mass_kg numeric,
  visceral_fat_level integer,
  bmi numeric,
  metabolic_age integer,
  body_water_kg numeric,
  bone_mass_kg numeric,
  bmr_kcal integer,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbody_member_date ON public.inbody_results (member_id, measurement_date DESC);

ALTER TABLE public.inbody_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own inbody"
ON public.inbody_results FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Gym staff manage inbody"
ON public.inbody_results FOR ALL TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE user_can_access_gym(auth.uid(), gym_id)))
WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_can_access_gym(auth.uid(), gym_id)));

CREATE POLICY "Super admins manage inbody"
ON public.inbody_results FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_inbody_updated_at BEFORE UPDATE ON public.inbody_results
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
