-- =====================================================
-- Tabla leads: agregar columnas faltantes
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'interest'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN interest TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'trial_class_date'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN trial_class_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'trial_class_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN trial_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;

  -- Renombrar si existe la columna vieja converted_member_id a converted_to_member_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'converted_member_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'converted_to_member_id'
  ) THEN
    ALTER TABLE public.leads RENAME COLUMN converted_member_id TO converted_to_member_id;
  END IF;

  -- Agregar si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'converted_to_member_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN converted_to_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Asegurar RLS activo en leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Tabla contact_logs (nueva)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contact_logs (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id          UUID          REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  lead_id         UUID          REFERENCES public.leads(id) ON DELETE CASCADE,
  member_id       UUID          REFERENCES public.members(id) ON DELETE CASCADE,
  channel         VARCHAR(30)   NOT NULL DEFAULT 'presencial',
  direction       VARCHAR(10)   DEFAULT 'inbound',
  notes           TEXT          NOT NULL,
  follow_up_date  DATE,
  follow_up_done  BOOLEAN       DEFAULT FALSE,
  created_by      UUID          REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;

-- Políticas contact_logs
CREATE POLICY "Gym staff can manage contact_logs"
  ON public.contact_logs FOR ALL
  TO authenticated
  USING (user_can_access_gym(auth.uid(), gym_id))
  WITH CHECK (user_can_access_gym(auth.uid(), gym_id));

CREATE POLICY "Super admins manage contact_logs"
  ON public.contact_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- Índices para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_leads_gym_status ON public.leads(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_contact_logs_lead ON public.contact_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_member ON public.contact_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_followup ON public.contact_logs(follow_up_date, follow_up_done);
CREATE INDEX IF NOT EXISTS idx_contact_logs_gym ON public.contact_logs(gym_id);