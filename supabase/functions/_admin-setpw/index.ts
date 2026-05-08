import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { user_id, password } = await req.json();
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.auth.admin.updateUserById(user_id, { password });
  return new Response(JSON.stringify({ ok: !error, error: error?.message }), { headers: { "Content-Type": "application/json" } });
});
