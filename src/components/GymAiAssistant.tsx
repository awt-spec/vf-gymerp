import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Send, X, Bot } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { useGym } from "@/hooks/useGym";

type Props = {
  module: string;
  context: any;
  moduleLabel?: string;
  suggestions?: string[];
};

const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  socios: ["¿Qué socios están en riesgo de churn?", "Sugerencias de retención", "¿Cómo aumentar socios activos?"],
  planes: ["¿Cuál plan vende más?", "Sugerencias de pricing", "¿Qué plan nuevo lanzar?"],
  ejercicio: ["Generá una rutina full-body 3 días", "Rutina push/pull/legs para principiante", "Plan de hipertrofia 4 días"],
  nutricion: ["Plan de 2000 kcal pérdida de grasa", "Macros para ganar masa muscular", "Comidas pre y post entreno"],
  contabilidad: ["¿En qué gasto más?", "Análisis de margen", "¿Cómo mejorar rentabilidad?"],
  cobranza: ["¿Quién está vencido?", "Estrategia para cobrar", "Riesgo de impago"],
  mercadeo: ["¿Qué leads priorizar?", "Mensaje WhatsApp para reactivar socios", "Idea de campaña este mes"],
  reportes: ["Dame un resumen ejecutivo", "Tendencias del último mes", "¿Qué métricas mejorar?"],
  inventario: ["¿Qué reponer?", "Productos sin movimiento", "Sugerencias de stock"],
  tienda: ["Productos más vendidos", "Promociones recomendadas", "Bundles con membresía"],
  clases: ["¿Qué horarios llenan más?", "Optimizar grilla de clases", "Instructores top"],
  acceso: ["Horas pico", "Frecuencia promedio de socios", "Optimizar personal"],
  dashboard: ["Diagnóstico general", "¿Qué mejorar primero?", "Hallazgos clave"],
};

export default function GymAiAssistant({ module, context, moduleLabel, suggestions }: Props) {
  const { gym } = useGym();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [question, setQuestion] = useState("");

  const ask = async (q?: string) => {
    setLoading(true);
    setResponse("");
    try {
      const { data, error } = await supabase.functions.invoke("gym-ai-assistant", {
        body: { module, context, question: q || question || null, gymName: gym?.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResponse(data.content);
      setQuestion("");
    } catch (err: any) {
      toast({ title: "Error IA", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const tips = suggestions || DEFAULT_SUGGESTIONS[module] || DEFAULT_SUGGESTIONS.dashboard;

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); ask(); }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-br from-primary to-primary/70 hover:opacity-90 text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-semibold tracking-wide">Asistente IA</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[min(420px,calc(100vw-3rem))]">
      <Card className="shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Asistente IA</p>
              <p className="text-[10px] opacity-80">{moduleLabel || module} · {gym?.name}</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
          {loading && !response && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Analizando datos...
            </div>
          )}

          {response && (
            <div className="bg-card rounded-lg p-3 border text-xs leading-relaxed prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-primary dark:prose-invert">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          )}

          {!loading && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Sugerencias</p>
              {tips.map(s => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-card border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-card">
          <form
            onSubmit={(e) => { e.preventDefault(); if (question.trim() && !loading) ask(); }}
            className="flex gap-2"
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Preguntá lo que quieras..."
              className="h-9 text-xs"
              disabled={loading}
            />
            <Button type="submit" size="sm" disabled={loading || !question.trim()} className="h-9 px-3">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
