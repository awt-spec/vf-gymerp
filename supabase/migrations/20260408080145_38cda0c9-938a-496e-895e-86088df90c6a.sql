
CREATE TABLE public.member_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  fitness_goals text[] DEFAULT '{}',
  experience_level text DEFAULT 'beginner',
  preferred_training text[] DEFAULT '{}',
  injuries text,
  available_days integer DEFAULT 3,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  body_fat_pct numeric,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id)
);

ALTER TABLE public.member_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage onboarding"
  ON public.member_onboarding FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
