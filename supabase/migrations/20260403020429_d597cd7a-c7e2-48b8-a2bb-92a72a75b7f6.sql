
ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS rpe integer;
ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS machine text;
ALTER TABLE public.exercise_plans ADD COLUMN IF NOT EXISTS split_type text DEFAULT 'custom';
ALTER TABLE public.exercise_plans ADD COLUMN IF NOT EXISTS day_label text;
