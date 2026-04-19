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

    // Verify caller is super_admin
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
      return new Response(JSON.stringify({ error: "Solo super_admin puede crear gimnasios" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gym_name, slug, admin_email, admin_password, admin_name, admin_phone } = await req.json();

    if (!gym_name || !slug || !admin_email || !admin_password || !admin_name) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create auth user for the gym admin (or reuse if email already exists)
    let userId: string;
    const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { full_name: admin_name },
    });

    if (createErr) {
      const isDuplicate = /already been registered|already exists|email_exists/i.test(createErr.message);
      if (isDuplicate) {
        // Check if this user already owns/manages a gym
        let ownedGymName: string | null = null;
        let page = 1;
        let foundId: string | null = null;
        while (!foundId && page <= 20) {
          const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (listErr) break;
          const match = list.users.find(u => u.email?.toLowerCase() === admin_email.toLowerCase());
          if (match) { foundId = match.id; break; }
          if (list.users.length < 200) break;
          page++;
        }
        if (foundId) {
          const { data: existingGym } = await supabaseAdmin
            .from("gyms").select("name").eq("owner_user_id", foundId).maybeSingle();
          if (existingGym) ownedGymName = existingGym.name;
        }
        return new Response(JSON.stringify({
          error: "EMAIL_ALREADY_REGISTERED",
          message: ownedGymName
            ? `Este email ya está registrado y es dueño del gimnasio "${ownedGymName}". Usá otro email para crear un nuevo gimnasio.`
            : "Este email ya tiene una cuenta registrada en la plataforma. Usá otro email para crear un nuevo gimnasio.",
        }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = authData!.user.id;

    // 2. Assign admin role (ignore duplicate)
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" }).then(r => r.error?.code === "23505" ? null : r);

    // 3. Create profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: admin_name,
      phone: admin_phone || null,
    });

    // 4. Create gym
    const { data: gymData, error: gymErr } = await supabaseAdmin
      .from("gyms")
      .insert({
        name: gym_name,
        slug,
        owner_user_id: userId,
        email: admin_email,
        phone: admin_phone || null,
      })
      .select("id")
      .single();

    if (gymErr) {
      return new Response(JSON.stringify({ error: gymErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Add owner as staff
    await supabaseAdmin.from("gym_staff").insert({
      gym_id: gymData.id,
      user_id: userId,
    });

    // 6. Create default features
    const defaultFeatures = [
      "socios", "planes", "pagos", "contabilidad", "inventario",
      "clases", "tienda", "nutricion", "ejercicio", "acceso", "reportes", "mercadeo"
    ];
    await supabaseAdmin.from("gym_features").insert(
      defaultFeatures.map(f => ({ gym_id: gymData.id, feature_name: f, enabled: true }))
    );

    // 7. Create default subscription (trial)
    await supabaseAdmin.from("gym_subscriptions").insert({
      gym_id: gymData.id,
      plan_type: "basic",
      monthly_amount: 0,
      currency: "USD",
      status: "active",
    });

    return new Response(JSON.stringify({ gym_id: gymData.id, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
