
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_members_auth_user_id ON public.members(auth_user_id);
