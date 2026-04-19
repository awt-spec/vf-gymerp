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

    const { cedula, email, first_name, last_name, phone, gym_id } = await req.json();

    if (!cedula || !email || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user with cedula as password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: cedula,
      email_confirm: true,
      user_metadata: { full_name: `${first_name} ${last_name}`, cedula },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Assign member role
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "member" });

    // Create member record
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("members")
      .insert({
        first_name,
        last_name,
        email,
        phone: phone || null,
        cedula,
        auth_user_id: userId,
        status: "active",
        gym_id: gym_id || null,
      })
      .select("id")
      .single();

    if (memberError) {
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add to gym_staff if gym_id provided
    if (gym_id) {
      await supabaseAdmin.from("gym_staff").insert({ gym_id, user_id: userId });
    }

    return new Response(JSON.stringify({ member_id: memberData.id, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
