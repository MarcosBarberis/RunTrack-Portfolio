import { useState } from "react";
import { SelfWorkoutCreateDto } from "../services/api";

function toLocalISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function SelfWorkoutModal({
  open,
  onSave,
  onClose,
  isSaving,
}: {
  open: boolean;
  onSave: (dto: SelfWorkoutCreateDto) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [date, setDate] = useState(() => toLocalISO(new Date()));
  const [title, setTitle] = useState("");
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [rpe, setRpe] = useState<number>(3);
  const [hadPain, setHadPain] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setDate(toLocalISO(new Date()));
    setTitle("");
    setDistanceKm(0);
    setDurationMin(0);
    setDurationSec(0);
    setRpe(3);
    setHadPain(false);
    setNotes("");
    setError(null);
  }

  function handleSave() {
    setError(null);

    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    if (title.length > 100) {
      setError("El título no puede superar los 100 caracteres.");
      return;
    }

    if (distanceKm <= 0 || distanceKm > 60) {
      setError("La distancia debe estar entre 0.1 y 60 km.");
      return;
    }

    if (durationMin < 0 || durationMin > 480) {
      setError("La duración debe ser válida.");
      return;
    }

    if (durationSec < 0 || durationSec > 59) {
      setError("Los segundos deben estar entre 0 y 59.");
      return;
    }

    const totalSeconds = durationMin * 60 + durationSec;
    const totalMinutes = Math.ceil(totalSeconds / 60);

    if (totalMinutes < 5 || totalMinutes > 480) {
      setError("La duración debe estar entre 5 minutos y 480 minutos.");
      return;
    }

    if (rpe < 1 || rpe > 5) {
      setError("El RPE debe estar entre 1 y 5.");
      return;
    }

    const pace = totalMinutes / distanceKm;
    if (pace < 2.5 || pace > 20) {
      setError("Los valores de distancia y duración no parecen realistas.");
      return;
    }

    // Parse date-only string (YYYY-MM-DD) without creating a Date from string
    const parts = date.split('-').map(Number);
    const selectedDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      setError("No puedes crear entrenamientos para fechas futuras.");
      return;
    }

    const dto: SelfWorkoutCreateDto = {
      date,
      title: title.trim(),
      distanceKm,
      durationMin: totalMinutes,
      rpe,
      hadPain,
      notes: notes.trim() || null,
    };

    onSave(dto);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-2">Cargar entrenamiento libre</h2>
        <p className="text-slate-300 text-sm mb-4">
          Registrá un entrenamiento que hiciste por tu cuenta.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-slate-200 text-sm mb-2">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-200 text-sm mb-2">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Rodaje parque"
              maxLength={100}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-200 text-sm mb-2">Distancia (km)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="60"
                value={distanceKm || ""}
                onChange={(e) => setDistanceKm(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-200 text-sm mb-2">Duración</label>
              <div className="grid grid-cols-[1fr_1fr] gap-3">
                <div>
                  <input
                    type="number"
                    min="0"
                    max="480"
                    value={durationMin || ""}
                    onChange={(e) => setDurationMin(Number(e.target.value) || 0)}
                    placeholder="Min"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none"
                  />
                  <div className="mt-1 text-xs text-slate-500">min</div>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationSec || ""}
                    onChange={(e) => setDurationSec(Number(e.target.value) || 0)}
                    placeholder="Seg"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none"
                  />
                  <div className="mt-1 text-xs text-slate-500">seg</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-200 text-sm mb-2">Esfuerzo percibido (RPE)</label>
            <select
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none"
            >
              <option value={1}>1 - Muy fácil</option>
              <option value={2}>2 - Fácil</option>
              <option value={3}>3 - Moderado</option>
              <option value={4}>4 - Difícil</option>
              <option value={5}>5 - Muy difícil</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-slate-200 text-sm">
              <input
                type="checkbox"
                checked={hadPain}
                onChange={(e) => setHadPain(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800"
              />
              Tuve dolor/molestia
            </label>
          </div>

          <div>
            <label className="block text-slate-200 text-sm mb-2">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-700/50 bg-red-900/20 p-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-xl bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}