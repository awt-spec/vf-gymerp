
ALTER TABLE public.members ADD COLUMN cedula TEXT DEFAULT '' NOT NULL;
CREATE UNIQUE INDEX idx_members_cedula ON public.members(cedula) WHERE cedula != '';
