-- Recreate the public view with security_invoker so RLS uses the querying user's perms
DROP VIEW IF EXISTS public.gyms_public;

CREATE VIEW public.gyms_public
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  slug,
  logo_url,
  primary_color,
  phone,
  email,
  address,
  custom_domain,
  setup_completed
FROM public.gyms;

GRANT SELECT ON public.gyms_public TO anon, authenticated;

-- Allow anon to read gyms via the view by adding back a column-aware policy
-- (the view inherits RLS; without anon SELECT on gyms, the view returns nothing for anon)
CREATE POLICY "Anon can read gyms via public view"
ON public.gyms
FOR SELECT
TO anon
USING (true);

-- Note: this looks identical to before, but we also need to prevent direct anon access
-- to the underlying table. Postgres RLS doesn't filter columns, so we revoke
-- direct SELECT on the table from anon and only grant on the view.
REVOKE SELECT ON public.gyms FROM anon;
GRANT SELECT (id, name, slug, logo_url, primary_color, phone, email, address, custom_domain, setup_completed) ON public.gyms TO anon;