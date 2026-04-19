// Gym AI Assistant — asistente IA contextual para cada gimnasio (cliente)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODULE_PROMPTS: Record<string, string> = {
  socios: "Sos un consultor de retención de gimnasios. Analizá los socios (activos, inactivos, suspendidos), detectá patrones de churn, socios en riesgo y recomendá acciones de fidelización. Sé directo, breve, usá viñetas y emojis.",
  planes: "Sos un experto en pricing de gimnasios. Revisá los planes de membresía, su distribución, ingresos por plan y sugerí ajustes de precio, nuevos planes o promociones para maximizar revenue.",
  ejercicio: "Sos un entrenador personal certificado. Ayudá a generar rutinas de ejercicio personalizadas, sugerí splits (push/pull/legs, full body, upper/lower), volumen, intensidad y periodización según el objetivo del socio. Da rutinas concretas con ejercicios, series y repeticiones.",
  nutricion: "Sos un nutricionista deportivo. Ayudá a crear planes nutricionales personalizados, calculá macros (proteínas, carbos, grasas), sugerí comidas concretas según el objetivo (pérdida de grasa, ganancia muscular, mantenimiento) y la cantidad de calorías diarias.",
  contabilidad: "Sos un contador especializado en gimnasios. Analizá ingresos, gastos, márgenes, IVA, flujo de caja y presupuestos. Detectá categorías de gasto excesivas, oportunidades de ahorro y recomendá estrategias para mejorar rentabilidad.",
  cobranza: "Sos un experto en cobranzas. Analizá pagos pendientes, vencidos, riesgo de impago por socio y sugerí estrategias de cobro (recordatorios, descuentos por pronto pago, planes de pago).",
  mercadeo: "Sos un experto en marketing para gimnasios. Analizá leads, conversión, campañas activas y sugerí estrategias de captación, mensajes para WhatsApp/email y segmentaciones efectivas.",
  reportes: "Sos un analista de datos del fitness. Interpretá los KPIs del gimnasio, detectá tendencias, anomalías y sugerí qué métricas adicionales medir para mejorar el negocio.",
  inventario: "Sos un experto en gestión de inventario. Analizá stock de productos, equipamiento, productos con bajo stock, rotación y sugerí reposiciones, productos a discontinuar y oportunidades de venta.",
  tienda: "Sos un consultor de retail para gimnasios. Analizá ventas, productos top, márgenes y sugerí promociones, bundles y estrategias de cross-selling con membresías.",
  clases: "Sos un experto en programación de clases grupales. Analizá ocupación, instructores, horarios populares y sugerí cambios para maximizar asistencia y satisfacción.",
  acceso: "Sos un analista de operaciones de gimnasio. Revisá patrones de acceso (horas pico, días más concurridos, frecuencia por socio) y sugerí optimizaciones de personal y horarios.",
  dashboard: "Sos un consultor integral de gimnasios. Analizá la salud general del negocio: socios, ingresos, retención, ocupación. Da un diagnóstico ejecutivo con hallazgos clave y recomendaciones accionables.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { module: mod, context, question, gymName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const systemPrompt = (MODULE_PROMPTS[mod] || MODULE_PROMPTS.dashboard) +
      (gymName ? `\n\nGimnasio: ${gymName}` : "") +
      "\n\nFormato: respondé en español, máximo 250 palabras, con secciones claras y viñetas. Usá markdown.";

    const contextStr = JSON.stringify(context ?? {}, null, 2);

    const userPrompt = question
      ? `Datos actuales del módulo:\n\`\`\`json\n${contextStr}\n\`\`\`\n\nPregunta del usuario: ${question}`
      : `Datos actuales del módulo:\n\`\`\`json\n${contextStr}\n\`\`\`\n\nDame un análisis ejecutivo: 1) Estado actual 2) 2-3 hallazgos clave 3) 2-3 recomendaciones accionables.`;

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
    console.error("gym-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
