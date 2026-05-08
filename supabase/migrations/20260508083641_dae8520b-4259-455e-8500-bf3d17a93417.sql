
ALTER TABLE public.inbody_results
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.coach_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid,
  member_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending',
  appointment_type text DEFAULT 'general',
  notes text,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff manage appointments"
  ON public.coach_appointments FOR ALL TO authenticated
  USING (public.user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (public.user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Members view own appointments"
  ON public.coach_appointments FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Members confirm own appointments"
  ON public.coach_appointments FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()))
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE auth_user_id = auth.uid()));

CREATE POLICY "Super admins manage appointments"
  ON public.coach_appointments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_coach_appointments_updated_at
  BEFORE UPDATE ON public.coach_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_coach_appointments_member ON public.coach_appointments(member_id);
CREATE INDEX IF NOT EXISTS idx_coach_appointments_coach ON public.coach_appointments(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_appointments_scheduled ON public.coach_appointments(scheduled_at);

INSERT INTO storage.buckets (id, name, public)
VALUES ('inbody-files', 'inbody-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload inbody files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inbody-files');

CREATE POLICY "Authenticated can read inbody files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inbody-files');

CREATE POLICY "Authenticated can delete inbody files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inbody-files');
