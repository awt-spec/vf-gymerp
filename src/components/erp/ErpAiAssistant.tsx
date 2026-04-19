import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Send, X, Bot } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Props = {
  tab: string;
  context: any;
  tabLabel?: string;
};

const TAB_SUGGESTIONS: Record<string, string[]> = {
  dashboard: [
    "¿Qué gimnasios necesitan atención?",
    "¿Cómo va el revenue este mes?",
    "Dame insights de crecimiento",
  ],
  gyms: [
    "¿Cuál gimnasio tiene mejor performance?",
    "¿Cuáles tienen pocos socios?",
    "Sugerencias para retener gimnasios",
  ],
  billing: [
    "¿Quién está en riesgo de impago?",
    "Estrategia para facturas vencidas",
    "¿Cómo aumentar el MRR?",
  ],
  infra: [
    "¿Hay cuellos de botella?",
    "Optimizaciones recomendadas",
    "Proyección de uso de recursos",
  ],
};

export default function ErpAiAssistant({ tab, context, tabLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [question, setQuestion] = useState("");

  const ask = async (q?: string) => {
    setLoading(true);
    setResponse("");
    try {
      const { data, error } = await supabase.functions.invoke("erp-ai-assistant", {
        body: { tab, context, question: q || question || null },
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

  const suggestions = TAB_SUGGESTIONS[tab] || TAB_SUGGESTIONS.dashboard;

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); ask(); }}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-semibold tracking-wide">Asistente IA</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[min(420px,calc(100vw-3rem))]">
      <Card className="bg-white border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Asistente IA</p>
              <p className="text-[10px] opacity-80">{tabLabel || tab}</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {loading && !response && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              Analizando datos del ERP...
            </div>
          )}

          {response && (
            <div className="bg-white rounded-lg p-3 border border-slate-200 text-xs leading-relaxed prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-indigo-700">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          )}

          {!loading && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Sugerencias</p>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-200 bg-white">
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
            <Button type="submit" size="sm" disabled={loading || !question.trim()} className="bg-indigo-600 hover:bg-indigo-700 h-9 px-3">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
