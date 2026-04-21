
CREATE OR REPLACE FUNCTION public.get_member_email_by_cedula(_cedula text, _gym_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.members
  WHERE cedula = _cedula
    AND email IS NOT NULL
    AND (_gym_id IS NULL OR gym_id = _gym_id)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_member_email_by_cedula(text, uuid) TO anon, authenticated;
