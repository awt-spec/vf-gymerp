// ERP AI Assistant — analyzes platform data and answers super-admin questions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TAB_PROMPTS: Record<string, string> = {
  dashboard: "Sos un analista de negocio del ERP central de gimnasios. Resumí KPIs, detectá patrones de crecimiento, riesgos de churn, y recomendaciones accionables. Sé directo, breve, usá viñetas y emojis.",
  gyms: "Sos un consultor de operaciones multi-gym. Analizá rendimiento por gimnasio, identificá los que necesitan atención (pocos socios, baja conversión, etc.) y sugerí acciones concretas.",
  billing: "Sos un analista financiero SaaS. Revisá MRR, facturas vencidas/pendientes, riesgo de impago y recomendá estrategias de cobro o upsell.",
  infra: "Sos un SRE/DevOps. Analizá uso de recursos por gimnasio, detectá picos o cuellos de botella y sugerí optimizaciones de infraestructura.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tab, context, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const systemPrompt = TAB_PROMPTS[tab] || TAB_PROMPTS.dashboard;
    const contextStr = JSON.stringify(context ?? {}, null, 2);

    const userPrompt = question
      ? `Datos actuales del ERP:\n\`\`\`json\n${contextStr}\n\`\`\`\n\nPregunta del super-admin: ${question}`
      : `Datos actuales del ERP:\n\`\`\`json\n${contextStr}\n\`\`\`\n\nDame un análisis ejecutivo con: 1) Estado general 2) 2-3 hallazgos clave 3) 2-3 recomendaciones accionables. Máximo 200 palabras.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Esperá un momento." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Sin créditos en Lovable AI. Agregá saldo en Workspace > Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Error en el gateway de IA");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "Sin respuesta";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("erp-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
