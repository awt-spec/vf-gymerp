-- 1. Extender tabla plans con beneficios, color e imagen
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS benefits text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#00E676',
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Tabla leads (CRM pipeline)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid REFERENCES public.gyms(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  phone text,
  email text,
  source text DEFAULT 'walk_in',
  status text NOT NULL DEFAULT 'nuevo',
  notes text,
  assigned_to uuid,
  converted_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  last_contact_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff manage own leads"
  ON public.leads FOR ALL TO authenticated
  USING (user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage leads"
  ON public.leads FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_leads_gym_status ON public.leads(gym_id, status);

-- 3. Tabla lead_notes (historial de seguimiento)
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff manage own lead_notes"
  ON public.lead_notes FOR ALL TO authenticated
  USING (lead_id IN (SELECT id FROM public.leads WHERE user_can_access_gym(auth.uid(), gym_id)))
  WITH CHECK (lead_id IN (SELECT id FROM public.leads WHERE user_can_access_gym(auth.uid(), gym_id)));

CREATE POLICY "Super admins manage lead_notes"
  ON public.lead_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Segmentos guardados de socios
CREATE TABLE IF NOT EXISTS public.crm_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid REFERENCES public.gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff manage own crm_segments"
  ON public.crm_segments FOR ALL TO authenticated
  USING (user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage crm_segments"
  ON public.crm_segments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_crm_segments_updated_at
  BEFORE UPDATE ON public.crm_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Historial de campañas
CREATE TABLE IF NOT EXISTS public.crm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid REFERENCES public.gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  message text NOT NULL,
  segment_id uuid REFERENCES public.crm_segments(id) ON DELETE SET NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym staff manage own crm_campaigns"
  ON public.crm_campaigns FOR ALL TO authenticated
  USING (user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage crm_campaigns"
  ON public.crm_campaigns FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));