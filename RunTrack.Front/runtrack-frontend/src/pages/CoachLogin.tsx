import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiClient, setSession, clearSession } from "../services/api";

export default function CoachLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const u = (username ?? "").trim();
    const p = password ?? "";

    if (!u) {
      setErrorMsg("Ingresá tu usuario");
      return;
    }
    if (!p) {
      setErrorMsg("Ingresá tu contraseña");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      // Antes de loguear como coach, limpiamos cualquier sesión anterior
      clearSession();

      const res = await apiClient.coachLogin(u, p);
      setSession(res.token, "coach");

      toast.success("Bienvenido coach");
      nav("/coach", { replace: true });
    } catch {
      setErrorMsg("Usuario o contraseña incorrectos");
      toast.error("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Coach</h1>
          <p className="mt-2 text-slate-400 text-sm">Ingresá tu usuario y contraseña</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: admin"
              autoComplete="username"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
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
            ← Volver
          </button>
        </div>
      </div>
    </div>
  );
}