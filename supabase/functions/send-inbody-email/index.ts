import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { inbodyId } = await req.json();
    if (!inbodyId) {
      return new Response(JSON.stringify({ error: "inbodyId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: row, error } = await supabase
      .from("inbody_results")
      .select("*, members(first_name, last_name, email)")
      .eq("id", inbodyId)
      .maybeSingle();
    if (error || !row) throw new Error(error?.message || "InBody not found");
    const member = row.members as any;
    if (!member?.email) throw new Error("Member has no email");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px">
        <h1 style="color:#00E676;margin:0 0 4px">Tu medición InBody</h1>
        <p style="color:#94a3b8;margin:0 0 20px">${new Date(row.measurement_date).toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" })}</p>
        <p>Hola <strong>${member.first_name}</strong>, aquí están los resultados de tu última medición de composición corporal:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          ${[
            ["Peso", row.weight_kg ? `${row.weight_kg} kg` : "—"],
            ["Masa muscular", row.muscle_mass_kg ? `${row.muscle_mass_kg} kg` : "—"],
            ["% Grasa corporal", row.body_fat_pct ? `${row.body_fat_pct} %` : "—"],
            ["Grasa visceral", row.visceral_fat_level ? `Nivel ${row.visceral_fat_level}` : "—"],
            ["IMC", row.bmi ? Number(row.bmi).toFixed(1) : "—"],
            ["Edad metabólica", row.metabolic_age ? `${row.metabolic_age} años` : "—"],
          ].map(([k, v]) => `<tr><td style="padding:8px;border-bottom:1px solid #1e293b;color:#94a3b8">${k}</td><td style="padding:8px;border-bottom:1px solid #1e293b;text-align:right;font-weight:600">${v}</td></tr>`).join("")}
        </table>
        ${row.notes ? `<p style="background:#1e293b;padding:12px;border-radius:8px;color:#cbd5e1"><strong>Notas del coach:</strong> ${row.notes}</p>` : ""}
        <p style="color:#64748b;font-size:12px;margin-top:24px">Ingresá a la app para ver el historial completo y tu progreso.</p>
      </div>`;

    let sendOk = false;
    let sendError = "";

    if (RESEND_API_KEY && LOVABLE_API_KEY) {
      const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: "InBody <onboarding@resend.dev>",
          to: [member.email],
          subject: "Tu medición InBody",
          html,
        }),
      });
      sendOk = r.ok;
      if (!r.ok) sendError = await r.text();
    } else {
      sendError = "Resend no está conectado. Conectá Resend en Connectors para envíos reales.";
    }

    if (sendOk) {
      await supabase.from("inbody_results").update({
        email_sent: true, email_sent_at: new Date().toISOString(),
      }).eq("id", inbodyId);
    }

    return new Response(JSON.stringify({ sent: sendOk, error: sendError || null }), {
      status: sendOk ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
