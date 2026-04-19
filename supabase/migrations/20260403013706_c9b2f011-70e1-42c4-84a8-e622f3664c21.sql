-- Workout logs
CREATE TABLE public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  muscle_group text NOT NULL,
  sets integer NOT NULL DEFAULT 1,
  reps integer NOT NULL DEFAULT 1,
  weight_kg numeric DEFAULT 0,
  notes text,
  logged_by uuid NOT NULL,
  workout_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage workout_logs" ON public.workout_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Body measurements
CREATE TABLE public.body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  body_fat_pct numeric,
  chest_cm numeric,
  waist_cm numeric,
  hips_cm numeric,
  bicep_left_cm numeric,
  bicep_right_cm numeric,
  thigh_left_cm numeric,
  thigh_right_cm numeric,
  calf_cm numeric,
  neck_cm numeric,
  shoulders_cm numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage body_measurements" ON public.body_measurements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Achievements
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  rank text NOT NULL CHECK (rank IN ('bronce', 'plata', 'oro')),
  category text NOT NULL CHECK (category IN ('personal', 'comunidad', 'benchmark')),
  exercise_name text,
  title text NOT NULL,
  description text,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage achievements" ON public.achievements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);