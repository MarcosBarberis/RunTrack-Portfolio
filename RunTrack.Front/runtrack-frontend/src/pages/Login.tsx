import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();

function loginAsCoach() {
  nav("/coach-login", { replace: true });
}

function loginAsRunner() {
  nav("/runner/login", { replace: true });
}


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            AFRunning
          </h1>
          <p className="mt-2 text-slate-400">Elegí tu perfil para continuar</p>
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={loginAsCoach}
            className="w-full px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold transition"
            type="button"
          >
            Ingresar como Coach
          </button>

          <button
            onClick={loginAsRunner}
            className="w-full px-4 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-white font-semibold transition"
            type="button"
          >
            Ingresar como Runner
          </button>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={() => nav("/", { replace: true })}
            className="text-sm text-slate-400 hover:text-slate-200 transition"
            type="button"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
