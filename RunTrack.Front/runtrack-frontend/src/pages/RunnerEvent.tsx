import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Card from "../components/Card";
import Loading from "../components/Loading";
import RunnerHeader from "../components/RunnerHeader";
import { formatDateTimeAR } from "../utils/helpers";
import {
  apiClient,
  getRunnerUsername,
  RunnerTrainingSubmissionDto,
  TrainingEvent,
} from "../services/api";
import { useState, useEffect, useMemo } from "react";

type Status = 0 | 1 | 2 | 3 | 4;

const statusOptions: { value: Status; label: string }[] = [
  { value: 0, label: "Desconocido" },
  { value: 2, label: "Asistí" },
  { value: 3, label: "No asistí" },
  { value: 4, label: "Solo" },
];

interface MyAttendanceResponse {
  exists: boolean;
  status?: number;
  note?: string;
}

interface MyWorkoutLogResponse {
  exists: boolean;
  distanceKm?: number;
  durationMin?: number;
  rpe?: number;
  hadPain?: boolean;
  notes?: string;
}

function extractApiMessage(err: unknown) {
  const error = err as { message?: string };
  const msg = String(error?.message ?? "");
  const idx = msg.indexOf(":");
  if (idx >= 0) return msg.slice(idx + 1).trim();
  return msg || "Error";
}

function parseDateOnly(iso: string) {
  // iso = "YYYY-MM-DD"
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function normalizeDuration(minutesStr: string, secondsStr: string): { minutes: string; seconds: string } {
  const minVal = minutesStr.replace(/,/g, '.').trim();
  const secVal = secondsStr.replace(/,/g, '.').trim();

  let minutes = parseInt(minVal) || 0;
  let seconds = parseInt(secVal) || 0;

  const extraMinutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  minutes += extraMinutes;

  return {
    minutes: minutes > 0 ? String(minutes) : "",
    seconds: seconds >= 0 ? String(seconds) : ""
  };
}

function normalizeDecimalValue(value: string): string {
  const normalized = value.replace(/,/g, '.').trim();
  if (!normalized) return "";

  const cleaned = normalized.replace(/[^0-9.]/g, '');
  const [integerPart, decimalPart] = cleaned.split('.');
  if (!decimalPart) return integerPart;

  return `${integerPart}.${decimalPart.slice(0, 2)}`;
}

type ConfirmAction = () => void;

type ConfirmState =
  | { open: false }
  | { open: true; step: 1 | 2; action: ConfirmAction };

export default function RunnerEvent() {
  const { id } = useParams();
  const trainingEventId = Number(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const dni = getRunnerUsername();

  const enabledEvent = Number.isFinite(trainingEventId) && trainingEventId > 0;

  // asistencia
  const [status, setStatus] = useState<Status>(2);

  // resultados
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<string>("");
  const [rpe, setRpe] = useState<number>(3);
  const [hadPain, setHadPain] = useState<boolean>(false);
  const [wNote, setWNote] = useState<string>("");

  // modal doble confirmación
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });

  // estado para deshabilitar botón después de guardar exitosamente
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // 1) Evento (lo buscamos desde "my plan")
  const evQ = useQuery({
    queryKey: ["training-event", dni, trainingEventId],
    queryFn: async () => {
      const list = await apiClient.getMyTrainingEvents();
      return list.find((x) => x.id === trainingEventId) ?? null;
    },
    enabled: enabledEvent && !!dni,
    retry: false,
    refetchOnMount: 'always',
  });

  // 2) Mi asistencia
  const myAttQ = useQuery({
    queryKey: ["my-attendance", dni, trainingEventId],
    queryFn: () => apiClient.getMyAttendance(trainingEventId),
    enabled: enabledEvent && !!dni,
    retry: false,
    refetchOnMount: 'always',
  });

  // 3) Mi log
  const myLogQ = useQuery({
    queryKey: ["my-workout-log", dni, trainingEventId],
    queryFn: () => apiClient.getMyWorkoutLog(trainingEventId),
    enabled: enabledEvent && !!dni,
    retry: false,
    refetchOnMount: 'always',
  });

  const event = evQ.data as TrainingEvent | null;

  const isFutureEvent = useMemo(() => {
    if (!event?.date) return false;
    const evDate = parseDateOnly(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    evDate.setHours(0, 0, 0, 0);
    return evDate > today;
  }, [event?.date]);

  const isExpired = useMemo(() => {
    if (!event?.date) return false;
    const evDate = parseDateOnly(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    return evDate < twoDaysAgo;
  }, [event?.date]);

  const myAtt = myAttQ.data as MyAttendanceResponse | undefined;
  const myLog = myLogQ.data as MyWorkoutLogResponse | undefined;

  const alreadySubmitted = !!myAtt?.exists || !!myLog?.exists;
  const readOnly = isFutureEvent || alreadySubmitted || isExpired;

  // precarga asistencia
  useEffect(() => {
    if (!myAtt?.exists) return;
    if (typeof myAtt.status === "number") setStatus(myAtt.status as Status);
  }, [myAtt?.exists, myAtt?.status]);

  // precarga resultados
  useEffect(() => {
    if (!myLog?.exists) return;
    setDistanceKm(myLog.distanceKm != null ? String(myLog.distanceKm) : "");
    if (myLog.durationMin != null) {
      const totalMinutes = Number(myLog.durationMin);
      const minutes = Math.floor(totalMinutes);
      const seconds = Math.round((totalMinutes - minutes) * 60);
      setDurationMinutes(String(minutes));
      setDurationSeconds(String(seconds));
    } else {
      setDurationMinutes("");
      setDurationSeconds("");
    }
    setRpe(typeof myLog.rpe === "number" ? myLog.rpe : 3);
    setHadPain(!!myLog.hadPain);
    setWNote(myLog.notes ?? "");
  }, [myLog?.exists, myLog?.distanceKm, myLog?.durationMin, myLog?.rpe, myLog?.hadPain, myLog?.notes]);

  const submitTrainingMut = useMutation({
    mutationFn: (dto: RunnerTrainingSubmissionDto) =>
      apiClient.submitRunnerTraining(trainingEventId, dto),
    onSuccess: async () => {
      toast.success("Entrenamiento guardado correctamente");
      setHasSubmitted(true);
      await qc.invalidateQueries({ queryKey: ["my-attendance", trainingEventId] });
      await qc.invalidateQueries({ queryKey: ["my-workout-log", trainingEventId] });
      await qc.invalidateQueries({ queryKey: ["weekly-kpis"] });
      await qc.invalidateQueries({ queryKey: ["workout-logs"] });
    },
    onError: (err: unknown) => {
      toast.error(extractApiMessage(err) || "No se pudo guardar el entrenamiento");
    },
  });

  function requestDoubleConfirm(action: ConfirmAction) {
    setConfirm({ open: true, step: 1, action });
  }
  function closeConfirm() {
    setConfirm({ open: false });
  }
  function nextConfirmStep() {
    if (!confirm.open) return;
    if (confirm.step === 1) setConfirm({ ...confirm, step: 2 });
    else {
      const a = confirm.action;
      closeConfirm();
      a();
    }
  }

  function saveTraining() {
    if (readOnly) return;

    // Validaciones
    if (status === 0) return toast.error("Seleccioná un estado de asistencia válido");
    if (status === 3) {
      // Si no asistió o está confirmado, no puede enviar resultados
      if (distanceKm.trim() || durationMinutes.trim() || durationSeconds.trim()) {
        return toast.error("Si no asististe, no podés enviar resultados");
      }
    } else {
      // Si asistió, debe enviar resultados
      const d = Number(distanceKm);
      const min = Number(durationMinutes) || 0;
      const sec = Number(durationSeconds) || 0;
      const dur = min + sec / 60;

      if (!Number.isFinite(d) || d <= 0) return toast.error("Distancia (km) inválida");
      if (!Number.isFinite(dur) || dur <= 0) return toast.error("Duración inválida");
      if (rpe < 1 || rpe > 5) return toast.error("RPE debe ser 1..5");

      // Nuevas validaciones del backend
      if (d < 0.5 || d > 60) return toast.error("Distancia debe estar entre 0.5 y 60 km");
      if (dur < 5 || dur > 480) return toast.error("Duración debe estar entre 5 y 480 minutos");
      const pace = dur / d;
      if (pace < 2.5 || pace > 20) return toast.error(`Ritmo implícito (${pace.toFixed(2)} min/km) debe estar entre 2.5 y 20 min/km`);
      if (wNote.trim().length > 500) return toast.error("Notas no pueden superar 500 caracteres");
    }

    const dto: RunnerTrainingSubmissionDto = {
      status,
      distanceKm: Number(distanceKm) || 0,
      durationMin: (Number(durationMinutes) || 0) + (Number(durationSeconds) || 0) / 60,
      rpe,
      hadPain,
      notes: wNote.trim() || null,
    };

    const action = () => {
      submitTrainingMut.mutate(dto);
    };

    requestDoubleConfirm(action);
  }

  // Render states (después de hooks)
  if (evQ.isLoading) return <Loading />;

  if (!event) return <div className="text-white">Evento no encontrado.</div>;

  const confirmTitle = "Guardar entrenamiento";

  const confirmText1 = "Vas a registrar este entrenamiento. Revisá bien los datos antes de continuar.";

  const confirmText2 = "Confirmá el envío. Después de guardar, no vas a poder modificar esta información.";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <RunnerHeader onBack={() => nav('/runner/plan')} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Entrenamiento</h1>
          <p className="mt-1 text-sm text-slate-400">Registrá asistencia y resultados de esta sesión</p>
        </div>
        {/* Modal doble confirmación */}
        {confirm.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white">{confirmTitle}</h2>

              <p className="mt-2 text-slate-300 text-sm">
                {confirm.step === 1 ? confirmText1 : confirmText2}
              </p>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={closeConfirm}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
                  type="button"
                >
                  Cancelar
                </button>

                <button
                  onClick={nextConfirmStep}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold"
                  type="button"
                >
                  {confirm.step === 1 ? "Continuar" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Avisos */}
        <div className="space-y-3">
          {isFutureEvent && (
            <div className="rounded-2xl border border-sky-600/30 bg-sky-900/20 p-4">
              <div className="flex items-start gap-2">
                <span className="text-xl">ℹ️</span>
                <div>
                  <div className="text-white font-semibold">Entrenamiento futuro</div>
                  <div className="text-slate-200 text-sm">
                    Podés verlo, pero no podés cargar asistencia ni resultados hasta el día del entrenamiento.
                  </div>
                </div>
              </div>
            </div>
          )}

          {alreadySubmitted && (
            <div className="rounded-2xl border border-amber-600/30 bg-amber-900/20 p-4">
              <div className="flex items-start gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="text-white font-semibold">Entrenamiento ya registrado</div>
                  <div className="text-slate-200 text-sm">
                    Este entrenamiento ya fue registrado y no puede modificarse.
                  </div>
                </div>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="rounded-2xl border border-red-600/30 bg-red-900/20 p-4">
              <div className="flex items-start gap-2">
                <span className="text-xl">⏰</span>
                <div>
                  <div className="text-white font-semibold">Entrenamiento caducado</div>
                  <div className="text-slate-200 text-sm">
                    Han pasado más de 2 días desde la fecha del entrenamiento. Ya no se pueden cargar asistencia ni resultados.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resumen evento */}
        <Card>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-white">
                  {formatDateTimeAR(event.date, event.time)} — {event.title ?? "Entrenamiento"}
                </div>
                {event.location && <div className="text-slate-300 text-sm">{event.location}</div>}
              </div>

              <div className="text-xs text-slate-400">ID #{event.id}</div>
            </div>

            {event.notes && (
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-slate-200 whitespace-pre-line leading-relaxed">
                {event.notes}
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Asistencia */}
          <Card>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Asistencia</h2>
              {myAttQ.isLoading && <span className="text-slate-400 text-sm">Cargando...</span>}
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm text-slate-300">Estado</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value) as Status)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                  disabled={readOnly}
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </Card>

          {/* Resultados */}
          <Card>
            <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-white">Resultados</h2>
                  {myLogQ.isLoading && <span className="text-slate-400 text-sm">Cargando...</span>}
                </div>

                <div className="mt-5 space-y-4">

                  {/* FILA PRINCIPAL */}
                  <div className="flex flex-wrap items-end gap-4">

                    {/* DISTANCIA */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-slate-300">Distancia (km)</label>
                      <input
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(e.target.value)}
                        onBlur={() => setDistanceKm(normalizeDecimalValue(distanceKm))}
                        placeholder="7.2"
                        className="w-[90px] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white text-sm focus:border-primary-500 focus:outline-none"
                        inputMode="decimal"
                        disabled={readOnly}
                      />
                    </div>

                    {/* DURACIÓN */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-slate-300">Duración</label>

                    <div className="w-[120px] flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2 py-2">
                        <input
                          value={durationMinutes}
                          onChange={(e) => {
                            const normalized = normalizeDuration(e.target.value, durationSeconds);
                            setDurationMinutes(normalized.minutes);
                            setDurationSeconds(normalized.seconds);
                          }}
                          onBlur={() => {
                            const normalized = normalizeDuration(durationMinutes, durationSeconds);
                            setDurationMinutes(normalized.minutes);
                            setDurationSeconds(normalized.seconds);
                          }}
                          placeholder="mm"
                          className="w-[32px] bg-transparent text-center text-white text-sm focus:outline-none"
                          inputMode="numeric"
                          disabled={readOnly}
                        />

                        <span className="text-slate-400 text-sm">:</span>

                        <input
                          value={durationSeconds}
                          onChange={(e) => {
                            const normalized = normalizeDuration(durationMinutes, e.target.value);
                            setDurationMinutes(normalized.minutes);
                            setDurationSeconds(normalized.seconds);
                          }}
                          onBlur={() => {
                            const normalized = normalizeDuration(durationMinutes, durationSeconds);
                            setDurationMinutes(normalized.minutes);
                            setDurationSeconds(normalized.seconds);
                          }}
                          placeholder="ss"
                          className="w-[45px] bg-transparent text-center text-white text-sm focus:outline-none"
                          inputMode="numeric"
                          disabled={readOnly}
                        />
                      </div>
                    </div>

                    {/* RPE 1–5 */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-slate-300">Esfuerzo (1 a 5)</label>
                      <select
                        value={rpe}
                        onChange={(e) => setRpe(Number(e.target.value))}
                        className="w-[140px] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white text-sm focus:border-primary-500 focus:outline-none"
                        disabled={readOnly}
                      >
                        {[
                        { value: 1, label: "1 - Muy fácil" },
                        { value: 2, label: "2 - Fácil" },
                        { value: 3, label: "3 - Moderado" },
                        { value: 4, label: "4 - Difícil" },
                        { value: 5, label: "5 - Muy difícil" },
                      ].map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      </select>
                    </div>

                  </div>

                  {/* CHECK */}
                  <div>
                    <label className="flex items-center gap-3 text-slate-200">
                      <input
                        type="checkbox"
                        checked={hadPain}
                        onChange={(e) => setHadPain(e.target.checked)}
                        className="h-5 w-5"
                        disabled={readOnly}
                      />
                      Tuve dolor / molestia
                    </label>
                  </div>

                  {/* NOTAS */}
                  <div className="space-y-2">
                    <label className="block text-sm text-slate-300">Notas (opcional)</label>
                    <input
                      value={wNote}
                      onChange={(e) => setWNote(e.target.value)}
                      placeholder="Ej: me sentí bien, viento fuerte..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                      disabled={readOnly}
                    />
                  </div>

                </div>
              </Card>
            </div>

        {/* Botón único */}
        <div className="hidden md:flex justify-center">
          <button
            onClick={saveTraining}
            disabled={readOnly || submitTrainingMut.isPending || hasSubmitted}
            className="w-full max-w-md rounded-2xl bg-primary-600 px-6 py-4 text-lg font-semibold text-white hover:bg-primary-500 disabled:opacity-60 transition"
            type="button"
          >
            {submitTrainingMut.isPending ? "Guardando..." : hasSubmitted ? "Guardado" : "Guardar entrenamiento"}
          </button>
        </div>
      </main>

      {/* Sticky bottom button (mobile) */}
      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur border-t border-slate-800 p-4 md:hidden">
          <button
            onClick={saveTraining}
            disabled={submitTrainingMut.isPending || hasSubmitted}
            className="w-full rounded-2xl bg-primary-600 px-5 py-3 text-base font-semibold text-white hover:bg-primary-500 disabled:opacity-60 transition"
            type="button"
          >
            {submitTrainingMut.isPending ? "Guardando..." : hasSubmitted ? "Guardado" : "Guardar entrenamiento"}
          </button>
        </div>
      )}
    </div>
  );
}

