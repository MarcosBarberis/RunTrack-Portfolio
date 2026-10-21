// src/pages/RunnerPlan.tsx
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Card from "../components/Card";
import Loading from "../components/Loading";
import RunnerHeader from "../components/RunnerHeader";
import RunnerMembershipBanner from "../components/RunnerMembershipBanner";
import RunnerTermsModal from "../components/RunnerTermsModal";
import RunnerBirthDateModal from "../components/RunnerBirthDateModal";
import SelfWorkoutModal from "../components/SelfWorkoutModal";
import { formatDateTimeAR, formatDateAR } from "../utils/helpers";

import { apiClient, TrainingEvent, getRunnerUsername } from "../services/api";

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISO() {
  return toLocalISO(new Date());
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

export default function RunnerPlan() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const dni = getRunnerUsername(); // clave para cache

  const [includePast15, setIncludePast15] = useState(false);

  // 0) Runner me (para birthDate)
  const meQ = useQuery({
    queryKey: ['runner-me', dni],
    queryFn: () => apiClient.getRunnerMe(),
    retry: false,
    enabled: !!dni,
    refetchOnMount: 'always',
  });

  const setBirthM = useMutation({
    mutationFn: (birthDate: string) => apiClient.setMyBirthDate({ birthDate }),
    onSuccess: async () => {
      toast.success("Fecha guardada ✅");
      if (dni) await qc.invalidateQueries({ queryKey: ['runner-me', dni] });
    },
  });

  const needBirthDate = !!dni && !!meQ.data && !meQ.data.birthDate;

  // 1) Estado de membresía
  const statusQ = useQuery({
    queryKey: ["membership", "my-status", dni],
    queryFn: () => apiClient.getMyMembershipStatus(),
    retry: false,
    enabled: !!dni,
  });

  const mustAcceptTerms = statusQ.data?.termsAccepted === false;

  // ✅ plan habilitado solo si:
  // - hay DNI
  // - no está bloqueado por cuota
  // - y términos aceptados
  // - y ya cargó fecha de nacimiento (si faltaba)
  const planEnabled =
    !!dni &&
    statusQ.data?.planVisible !== false &&
    !mustAcceptTerms &&
    !needBirthDate;

  // 2) Plan (solo si está habilitado)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["my-training-events", dni, includePast15],
    queryFn: () =>
      apiClient.getMyTrainingEvents({
        from: includePast15 ? addDaysISO(-15) : todayISO(),
        to: addDaysISO(14),
      }),
    retry: false,
    enabled: planEnabled,
    refetchOnMount: 'always',
  });

  const events = useMemo(() => (data ?? []) as TrainingEvent[], [data]);
  // Self workouts
  const [selfWorkoutModalOpen, setSelfWorkoutModalOpen] = useState(false);

  const selfWorkoutsQ = useQuery({
    queryKey: ["my-self-workouts", dni],
    queryFn: () => apiClient.getMyWorkoutLogs({ runnerId: undefined }), // Will filter by runner via API
    enabled: planEnabled,
    refetchOnMount: 'always',
  });

  const createSelfWorkoutM = useMutation({
    mutationFn: (dto: any) => apiClient.createSelfWorkout(dto),
    onSuccess: async () => {
      toast.success("Entrenamiento guardado ✅");
      setSelfWorkoutModalOpen(false);
      if (dni) await qc.invalidateQueries({ queryKey: ['my-self-workouts', dni] });
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteSelfWorkoutM = useMutation({
    mutationFn: (id: number) => apiClient.deleteSelfWorkout(id),
    onSuccess: async () => {
      toast.success("Entrenamiento eliminado");
      if (dni) await qc.invalidateQueries({ queryKey: ['my-self-workouts', dni] });
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const selfWorkouts = useMemo(() => {
    return (selfWorkoutsQ.data ?? []).filter(w => w.isSelfRegistered);
  }, [selfWorkoutsQ.data]);
  // Consideramos “boot” mientras carga membresía o runnerMe (para no parpadear UI)
  const isBootLoading = statusQ.isLoading || meQ.isLoading;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ✅ Modal obligatorio: si falta fecha de nacimiento */}
      <RunnerBirthDateModal
        open={needBirthDate}
        isSaving={setBirthM.isPending}
        onSave={(birthDate) => setBirthM.mutate(birthDate)}
      />

      {/* ✅ Modal obligatorio: si no aceptó términos */}
      <RunnerTermsModal open={mustAcceptTerms} />

      {/* Self workout modal */}
      <SelfWorkoutModal
        open={selfWorkoutModalOpen}
        onClose={() => setSelfWorkoutModalOpen(false)}
        onSave={(dto) => createSelfWorkoutM.mutate(dto)}
        isSaving={createSelfWorkoutM.isPending}
      />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <RunnerHeader hideBack />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Mi Plan</h1>
          <p className="mt-1 text-sm text-slate-400">Tus entrenamientos según tu categoría</p>
        </div>

        <RunnerMembershipBanner />

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-200 shadow-sm">
            <div className="text-sm text-slate-400">🔥 Racha actual</div>
            <div className="mt-1 text-3xl font-semibold text-white">
              {meQ.data ? meQ.data.currentStreak : 0}
            </div>
            <div className="text-xs text-slate-500">Días consecutivos de entrenamientos oficiales completos</div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-200 shadow-sm">
            <div className="text-sm text-slate-400">🏆 Mejor racha</div>
            <div className="mt-1 text-3xl font-semibold text-white">
              {meQ.data ? meQ.data.bestStreak : 0}
            </div>
            <div className="text-xs text-slate-500">Mayor racha histórica registrada</div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {isBootLoading ? (
            <Card gradient>
              <Loading />
            </Card>
          ) : meQ.isError ? (
            <Card>
              <div className="space-y-4 text-slate-200">
                <div className="text-red-300 font-semibold">No se pudo cargar tu perfil.</div>
                <div className="text-slate-400 text-sm">
                  {String((meQ.error as any)?.message ?? "")}
                </div>
                <button
                  onClick={() => nav("/runner/login", { replace: true })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                  type="button"
                >
                  Volver a ingresar DNI
                </button>
              </div>
            </Card>
          ) : statusQ.isError ? (
            <Card>
              <div className="space-y-3 text-slate-200">
                <div className="text-red-300 font-semibold">
                  No se pudo verificar tu estado de membresía.
                </div>
                <div className="text-slate-400 text-sm">
                  {String((statusQ.error as any)?.message ?? "")}
                </div>
              </div>
            </Card>
          ) : statusQ.data?.planVisible === false ? (
            <Card>
              <div className="text-slate-200">
                Tu cuota está vencida hace más de 3 días. Contactá al coach para
                regularizar.
              </div>
            </Card>
          ) : mustAcceptTerms ? (
            <Card>
              <div className="text-slate-200">
                Para continuar, debés aceptar los Términos y Condiciones.
              </div>
            </Card>
          ) : needBirthDate ? (
            <Card>
              <div className="text-slate-200">
                Para continuar, tenés que cargar tu fecha de nacimiento.
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <div className="text-slate-200 text-sm">
                  Entrenamientos de hoy y +14 días{includePast15 ? " + últimos 15 días" : ""}.
                </div>
              </Card>

              {/* TOGGLE -15/+14 */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIncludePast15((prev) => !prev)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    type="button"
                    disabled={!planEnabled}
                  >
                    {includePast15 ? "Ocultar últimos 15 días" : "Ver últimos 15 días"}
                  </button>

                </div>

                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50"
                  type="button"
                  disabled={!planEnabled}
                  title={
                    !planEnabled
                      ? needBirthDate
                        ? "Debés cargar tu fecha de nacimiento"
                        : mustAcceptTerms
                        ? "Debés aceptar los términos"
                        : "Plan bloqueado por membresía"
                      : undefined
                  }
                >
                  {isFetching ? "Actualizando..." : "Actualizar"}
                </button>
              </div>

              <button
                onClick={() => setSelfWorkoutModalOpen(true)}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                type="button"
                disabled={!planEnabled}
                title={
                  !planEnabled
                    ? needBirthDate
                      ? "Debés cargar tu fecha de nacimiento"
                      : mustAcceptTerms
                      ? "Debés aceptar los términos"
                      : "Plan bloqueado por membresía"
                    : undefined
                }
              >
                + Cargar entrenamiento libre
              </button>

              {/* LIST */}
              <Card>
                {isLoading ? (
                  <Loading />
                ) : isError ? (
                  <div className="space-y-4 text-slate-200">
                    <div className="text-red-300 font-semibold">
                      No se pudo cargar tu plan (DNI inválido o sin permisos).
                    </div>
                    <div className="text-slate-400 text-sm">
                      {String((error as any)?.message ?? "")}
                    </div>
                    <button
                      onClick={() => nav("/runner/login", { replace: true })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                      type="button"
                    >
                      Volver a ingresar DNI
                    </button>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-slate-300">No hay entrenamientos en el rango seleccionado.</div>
                ) : (
                  <div className="space-y-3">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="space-y-2">
                          <div className="text-white font-semibold">
                            {formatDateTimeAR(ev.date, ev.time)} — {ev.title ?? "Entrenamiento"}
                          </div>
                          {ev.location && (
                            <div className="text-slate-300 text-sm">{ev.location}</div>
                          )}
                          {ev.notes && (
                            <div className="text-slate-400 text-sm">{ev.notes}</div>
                          )}
                        </div>

                        <button
                          onClick={() => nav(`/runner/event/${ev.id}`)}
                          className="h-11 w-full rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-500 sm:w-auto"
                          type="button"
                        >
                          Abrir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Self workouts section */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Mis entrenamientos libres</h3>
                </div>

                {selfWorkoutsQ.isLoading ? (
                  <Loading />
                ) : selfWorkouts.length === 0 ? (
                  <div className="text-slate-400 text-sm">
                    No tenés entrenamientos libres registrados.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selfWorkouts.map((workout) => (
                      <div
                        key={workout.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/40 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="text-white font-semibold">
                              {formatDateAR(workout.date)} — {workout.selfRegisteredTitle}
                            </div>
                            <div className="text-slate-300 text-sm">
                              {workout.distanceKm} km • {workout.durationMin} min • RPE {workout.rpe}
                              {workout.hadPain && " • Tuvo dolor"}
                            </div>
                            {workout.notes && (
                              <div className="text-slate-400 text-sm">{workout.notes}</div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              if (confirm("¿Eliminar este entrenamiento?")) {
                                deleteSelfWorkoutM.mutate(workout.id);
                              }
                            }}
                            disabled={deleteSelfWorkoutM.isPending}
                            className="rounded-xl border border-red-700/50 bg-red-900/20 px-3 py-1 text-sm text-red-200 hover:bg-red-900/40 disabled:opacity-50"
                            type="button"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

