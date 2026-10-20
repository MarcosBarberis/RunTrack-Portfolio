import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  apiClient,
  clearSession,
  setSession,
  setRunnerUsername,
} from "../services/api";

export default function RunnerLogin() {
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nav = useNavigate();
  const qc = useQueryClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    // ✅ DNI solo números
    const cleaned = (dni ?? "").replace(/\D/g, "").trim();

    if (!cleaned) {
      setErrorMsg("Ingresá tu DNI");
      return;
    }

    if (cleaned.length < 7 || cleaned.length > 9) {
      setErrorMsg("DNI inválido");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      // Limpiamos cualquier sesión previa y pedimos un token a la API
      clearSession();
      const res = await apiClient.runnerLogin(cleaned);
      setSession(res.token, "runner");
      setRunnerUsername(cleaned);

      // ✅ limpiamos cache runner anterior para evitar datos viejos
      qc.removeQueries({ queryKey: ['runner-me'], exact: false });
      qc.removeQueries({ queryKey: ['my-training-events'], exact: false });
      qc.removeQueries({ queryKey: ['membership'], exact: false });
      qc.removeQueries({ queryKey: ['training-event'], exact: false });
      qc.removeQueries({ queryKey: ['my-attendance'], exact: false });
      qc.removeQueries({ queryKey: ['my-workout-log'], exact: false });

      // Validamos que el plan sea accesible con el nuevo token
      await apiClient.getMyTrainingEvents();

      nav("/runner/plan", { replace: true });
    } catch (err: unknown) {
      // Si algo falla, no dejamos una sesión a medias
      clearSession();

      const message = err instanceof Error ? err.message : String(err);

      // Si tu ApiClient arma "API Error (403): ..."
      const is403 =
        message.includes("API Error (403)") ||
        message.includes(" 403") ||
        message.includes("(403)") ||
        message.includes("403");

      // Por si el backend devuelve texto específico
      const inactiveByText =
        message.toLowerCase().includes("fuera de actividad") ||
        message.includes("RUNNER_INACTIVE");

      if (is403 || inactiveByText) {
        setErrorMsg(
          "Runner fuera de actividad, contactarse con su profesor para más info"
        );
        toast.error("Runner fuera de actividad");
      } else {
        setErrorMsg("DNI inválido o runner no encontrado");
        toast.error("DNI inválido o runner no encontrado");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Runner
          </h1>
          <p className="mt-2 text-slate-400 text-sm">
            Ingresá tu DNI para ver tu plan
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">DNI</label>
            <input
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 40123456"
              inputMode="numeric"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>

          {errorMsg && <div className="text-red-300 text-sm">{errorMsg}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold disabled:opacity-60 transition"
          >
            {loading ? "Validando…" : "Entrar"}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={() => nav("/login", { replace: true })}
            className="text-sm text-slate-400 hover:text-slate-200 transition"
            type="button"
          >
            ← Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}
