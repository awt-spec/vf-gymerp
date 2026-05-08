
-- inbody_results: agregar gym_id (la tabla ya existe)
ALTER TABLE public.inbody_results
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inbody_gym ON public.inbody_results(gym_id);

-- exercise_plans: agregar category
ALTER TABLE public.exercise_plans
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'custom';

COMMENT ON COLUMN public.exercise_plans.category IS
  'Valores sugeridos: push_pull_legs, upper_lower, full_body, bro_split, gap, funcional, cardio, custom';
