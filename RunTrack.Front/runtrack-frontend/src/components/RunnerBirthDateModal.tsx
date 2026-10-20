import { useMemo, useState } from "react";

function daysInMonth(month: number) {
  // usamos año 2000 (bisiesto) para febrero bien
  return new Date(2000, month, 0).getDate(); // month 1-12
}

export default function RunnerBirthDateModal({
  open,
  onSave,
  isSaving,
}: {
  open: boolean;
  onSave: (birthDate: string) => void; // "yyyy-MM-dd"
  isSaving: boolean;
}) {
  const [month, setMonth] = useState<number>(1);
  const [day, setDay] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const maxDay = useMemo(() => daysInMonth(month), [month]);

  function handleSave() {
    setError(null);

    if (day < 1 || day > maxDay) {
      setError("Día inválido para ese mes.");
      return;
    }

    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");

    // Año fijo para persistir (no importa)
    const birthDate = `2000-${mm}-${dd}`;

    onSave(birthDate);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">Tu fecha de nacimiento</h2>
        <p className="text-slate-300 text-sm mb-4">
          Elegí tu mes y día de nacimiento (el año no es necesario).
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-200 text-sm mb-2">Mes</label>
            <select
              value={month}
              onChange={(e) => {
                const m = Number(e.target.value);
                setMonth(m);
                // ajusto día si queda fuera
                const newMax = daysInMonth(m);
                if (day > newMax) setDay(newMax);
                setError(null);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none"
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const m = i + 1;
                return (
                  <option key={m} value={m}>
                    {m}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-slate-200 text-sm mb-2">Día</label>
            <select
              value={day}
              onChange={(e) => {
                setDay(Number(e.target.value));
                setError(null);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none"
            >
              {Array.from({ length: maxDay }).map((_, i) => {
                const d = i + 1;
                return (
                  <option key={d} value={d}>
                    {d}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-700/50 bg-red-900/20 p-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          disabled={isSaving}
          onClick={handleSave}
          className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}