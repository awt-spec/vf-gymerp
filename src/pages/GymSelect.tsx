import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function GymSelect() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!clean) return;
    navigate(`/gym/${clean}/login`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5">
            <Dumbbell className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1 font-display">Mi Gimnasio</h1>
          <p className="text-sm text-slate-500 mb-6">Ingresá el slug de tu gimnasio.</p>

          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-stretch gap-2">
              <span className="inline-flex items-center px-3 rounded-lg bg-slate-100 text-slate-400 text-sm">
                /gym/
              </span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="prueba"
                autoFocus
                className="h-11 flex-1"
              />
            </div>
            <Button
              type="submit"
              disabled={!slug.trim()}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Ir al login
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
