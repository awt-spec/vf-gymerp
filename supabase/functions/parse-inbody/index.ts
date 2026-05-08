import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { fileUrl, fileType } = await req.json();
    if (!fileUrl) {
      return new Response(JSON.stringify({ error: "fileUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch the file
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`);

    const isPdfOrImage = (fileType || "").includes("pdf") || (fileType || "").includes("image");
    let userContent: any;

    if (isPdfOrImage) {
      // Send as base64 image to multimodal model
      const buf = new Uint8Array(await fileRes.arrayBuffer());
      let bin = ""; for (const b of buf) bin += String.fromCharCode(b);
      const b64 = btoa(bin);
      const mime = fileType?.includes("pdf") ? "application/pdf" : (fileType || "image/png");
      userContent = [
        { type: "text", text: "Extract InBody composition data from this report." },
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
      ];
    } else {
      // Treat as text/XML
      const text = await fileRes.text();
      userContent = `Extract InBody composition data from this XML/text:\n\n${text.slice(0, 30000)}`;
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You extract InBody body composition results. Return ONLY valid JSON with these numeric fields (null if missing): weight_kg, muscle_mass_kg, body_fat_pct, body_fat_mass_kg, visceral_fat_level, bmi, metabolic_age, body_water_kg, bone_mass_kg, bmr_kcal, measurement_date (YYYY-MM-DD).",
          },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_inbody",
            description: "Save extracted InBody data",
            parameters: {
              type: "object",
              properties: {
                weight_kg: { type: ["number", "null"] },
                muscle_mass_kg: { type: ["number", "null"] },
                body_fat_pct: { type: ["number", "null"] },
                body_fat_mass_kg: { type: ["number", "null"] },
                visceral_fat_level: { type: ["integer", "null"] },
                bmi: { type: ["number", "null"] },
                metabolic_age: { type: ["integer", "null"] },
                body_water_kg: { type: ["number", "null"] },
                bone_mass_kg: { type: ["number", "null"] },
                bmr_kcal: { type: ["integer", "null"] },
                measurement_date: { type: ["string", "null"] },
              },
              required: [],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_inbody" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI error ${aiRes.status}: ${t}`);
    }

    const data = await aiRes.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = call ? JSON.parse(call.function.arguments) : {};

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
