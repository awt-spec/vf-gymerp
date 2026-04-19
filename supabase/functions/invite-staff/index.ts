import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = ["admin", "coach", "receptionist"];

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

    const { gym_id, email, password, full_name, role } = await req.json();

    if (!gym_id || !email || !password || !role) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos (gym_id, email, password, role)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: `Rol inválido. Solo: ${ALLOWED_ROLES.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is owner of gym OR super_admin
    const [{ data: gym }, { data: superCheck }] = await Promise.all([
      supabaseAdmin.from("gyms").select("owner_user_id").eq("id", gym_id).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "super_admin"),
    ]);

    const isOwner = gym?.owner_user_id === caller.id;
    const isSuperAdmin = (superCheck ?? []).length > 0;

    if (!isOwner && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Solo el dueño del gym puede invitar staff" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to create user, or find existing
    let userId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });

    if (createErr) {
      const isDup = /already been registered|already exists|email_exists/i.test(createErr.message);
      if (!isDup) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // find existing user
      let page = 1;
      while (!userId && page <= 20) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) break;
        const match = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (match) { userId = match.id; break; }
        if (list.users.length < 200) break;
        page++;
      }
      if (!userId) {
        return new Response(JSON.stringify({ error: "No se pudo encontrar el usuario existente" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = created!.user.id;
    }

    // Upsert profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: full_name || email,
    });

    // Add to gym_staff (idempotent)
    const { data: existingStaff } = await supabaseAdmin
      .from("gym_staff").select("id").eq("gym_id", gym_id).eq("user_id", userId).maybeSingle();
    if (!existingStaff) {
      await supabaseAdmin.from("gym_staff").insert({ gym_id, user_id: userId });
    }

    // Assign role (avoid duplicates)
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles").select("id").eq("user_id", userId).eq("role", role).maybeSingle();
    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    }

    return new Response(JSON.stringify({ user_id: userId, gym_id, role }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
