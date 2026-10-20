import { useState } from 'react';
import { isDemoMode, DEMO_COACH, DEMO_RUNNER_DNI } from './mockApi';

/** Aviso fijo que solo aparece en el modo demo, con las credenciales de prueba. */
export default function DemoBanner() {
  const [open, setOpen] = useState(true);
  if (!isDemoMode) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full border border-highlight-400/60 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-highlight-300 shadow-lg backdrop-blur"
      >
        Demo · ver accesos
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-xs text-slate-300">
        <span className="rounded-full bg-highlight-400/15 px-2 py-0.5 font-semibold uppercase tracking-wider text-highlight-300">
          Demo
        </span>
        <span>Datos ficticios, guardados solo en esta pestaña.</span>
        <span>
          Coach: <code className="text-primary-300">{DEMO_COACH.username}</code> /{' '}
          <code className="text-primary-300">{DEMO_COACH.password}</code>
        </span>
        <span>
          Runner (DNI): <code className="text-primary-300">{DEMO_RUNNER_DNI}</code>
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto rounded-lg border border-slate-700 px-3 py-1 text-slate-400 hover:text-slate-100"
        >
          Ocultar
        </button>
      </div>
    </div>
  );
}
