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

    // Check super_admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin");

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Solo super_admin puede eliminar gimnasios" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gym_id } = await req.json();
    if (!gym_id) {
      return new Response(JSON.stringify({ error: "gym_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get gym info to find owner
    const { data: gym } = await supabaseAdmin.from("gyms").select("owner_user_id").eq("id", gym_id).single();
    if (!gym) {
      return new Response(JSON.stringify({ error: "Gimnasio no encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete in order (child tables first)
    const tables = [
      "gym_features", "gym_invoices", "gym_subscriptions", "gym_staff",
      "promotion_targets", "promotions", "shop_sales", "shop_products",
      "class_bookings", "class_schedules", "classes",
      "meal_logs", "nutrition_plans", "exercise_plans", "workout_logs",
      "body_measurements", "achievements", "member_onboarding",
      "check_ins", "payments", "subscriptions", "members",
      "budgets", "cash_registers", "expenses", "fixed_assets", "inventory", "plans",
    ];

    for (const table of tables) {
      await supabaseAdmin.from(table).delete().eq("gym_id", gym_id);
    }

    // Delete the gym itself
    await supabaseAdmin.from("gyms").delete().eq("id", gym_id);

    // Delete gym owner's staff entries, roles, profile, and auth user
    const staffUserId = gym.owner_user_id;
    await supabaseAdmin.from("user_roles").delete().eq("user_id", staffUserId);
    await supabaseAdmin.from("profiles").delete().eq("id", staffUserId);
    await supabaseAdmin.auth.admin.deleteUser(staffUserId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
