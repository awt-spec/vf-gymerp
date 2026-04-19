import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gym_id, user_id } = await req.json();
    if (!gym_id || !user_id) {
      return new Response(JSON.stringify({ error: "Faltan campos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: gym }, { data: superCheck }] = await Promise.all([
      supabaseAdmin.from("gyms").select("owner_user_id").eq("id", gym_id).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "super_admin"),
    ]);

    const isOwner = gym?.owner_user_id === caller.id;
    const isSuperAdmin = (superCheck ?? []).length > 0;

    if (!isOwner && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Solo el dueño puede remover staff" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (gym?.owner_user_id === user_id) {
      return new Response(JSON.stringify({ error: "No podés remover al dueño del gym" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove from gym_staff for this gym
    await supabaseAdmin.from("gym_staff").delete().eq("gym_id", gym_id).eq("user_id", user_id);

    // Remove staff roles (admin/coach/receptionist) — only if user is no longer staff anywhere
    const { data: stillStaff } = await supabaseAdmin
      .from("gym_staff").select("id").eq("user_id", user_id).limit(1);
    if (!stillStaff || stillStaff.length === 0) {
      await supabaseAdmin.from("user_roles").delete()
        .eq("user_id", user_id)
        .in("role", ["admin", "coach", "receptionist"]);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
