import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Filter, Search, Pencil, Power, Eye } from "lucide-react";
import Card from "../components/Card";
import Loading from "../components/Loading";
import { formatDateAR } from "../utils/helpers";
import { apiClient } from "../services/api";

type CategoryRow = { id: number; name: string; isActive: boolean };
type StatusFilter = "active" | "inactive" | "all";

type TrainingEventRow = {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  title?: string | null;
  location?: string | null;
  notes?: string | null;
  categoryId?: number | null;
  isActive?: boolean;
  category?: { id: number; name: string } | null;
};

type TrainingEventFormDto = {
  date: string;
  time: string;
  title: string;
  location: string;
  notes: string;
  categoryId: number | 0 | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// ✅ IMPORTANTE: setHours para evitar problemas por zona horaria
function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}
function startOfPreviousMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfPreviousMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ✅ búsqueda robusta (sin tildes, etc.)
function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function TrainingEvents() {
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchTerm, setSearchTerm] = useState("");

  const today = new Date();
  const todayISO = toIsoDate(today);

  // ✅ por defecto: MES ACTUAL
  const [from, setFrom] = useState(() => toIsoDate(startOfMonth(today)));
  const [to, setTo] = useState(() => toIsoDate(endOfMonth(today)));

  // modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewOnly, setViewOnly] = useState(false);

  const [form, setForm] = useState<TrainingEventFormDto>({
    date: todayISO,
    time: "20:00:00",
    title: "",
    location: "",
    notes: "",
    categoryId: 0,
  });

  const searchRef = useRef<HTMLInputElement | null>(null);

  // categories
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery<CategoryRow[]>({
    queryKey: ["categories"],
    queryFn: () => apiClient.getCategories(),
  });

  const allCategories = useMemo(() => {
    return (categoriesData ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [categoriesData]);

  const activeCategories = useMemo(() => allCategories.filter((c) => c.isActive), [allCategories]);

  // events (coach)
  const { data: events = [], isLoading } = useQuery<TrainingEventRow[]>({
    queryKey: ["training-events", from, to],
    queryFn: () => apiClient.getTrainingEvents({ from, to }),
  });

  const createMut = useMutation({
    mutationFn: (dto: any) => apiClient.createTrainingEvent(dto),
    onSuccess: async () => {
      toast.success("Evento creado");
      closeModal();
      await qc.invalidateQueries({ queryKey: ["training-events"] });
    },
    onError: () => toast.error("No se pudo crear el evento"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) => apiClient.updateTrainingEvent(id, dto),
    onSuccess: async () => {
      toast.success("Evento actualizado");
      closeModal();
      await qc.invalidateQueries({ queryKey: ["training-events"] });
    },
    onError: () => toast.error("No se pudo actualizar el evento"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.updateTrainingEventStatus(id, isActive),
    onSuccess: async () => {
      toast.success("Estado actualizado");
      await qc.invalidateQueries({ queryKey: ["training-events"] });
    },
    onError: () => toast.error("No se pudo cambiar el estado"),
  });

  function openCreate() {
    const firstActiveId = activeCategories[0]?.id ?? 0;

    setViewOnly(false);
    setEditingId(null);
    setForm({
      date: todayISO,
      time: "20:00:00",
      title: "",
      location: "",
      notes: "",
      categoryId: firstActiveId,
    });
    setIsModalOpen(true);
  }

  function openEdit(ev: TrainingEventRow) {
    setViewOnly(false);
    setEditingId(ev.id);
    setForm({
      date: ev.date,
      time: ev.time,
      title: ev.title ?? "",
      location: ev.location ?? "",
      notes: ev.notes ?? "",
      categoryId: ev.categoryId ?? 0,
    });
    setIsModalOpen(true);
  }

  function openView(ev: TrainingEventRow) {
    setViewOnly(true);
    setEditingId(ev.id);
    setForm({
      date: ev.date,
      time: ev.time,
      title: ev.title ?? "",
      location: ev.location ?? "",
      notes: ev.notes ?? "",
      categoryId: ev.categoryId ?? 0,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setViewOnly(false);
  }

  function save() {
    if (viewOnly) return;

    const dto = {
      date: form.date,
      time: form.time,
      title: form.title.trim() || null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      categoryId: form.categoryId && form.categoryId > 0 ? form.categoryId : null,
    };

    if (!dto.date) return toast.error("La fecha es obligatoria");
    if (!dto.time) return toast.error("La hora es obligatoria");

    if (editingId) updateMut.mutate({ id: editingId, dto });
    else createMut.mutate(dto);
  }

  // filtro front
  const filtered = useMemo(() => {
    const list = (events ?? []).slice();
    const s = norm(searchTerm);

    return list.filter((e) => {
      const title = norm(e.title ?? "");
      const loc = norm(e.location ?? "");
      const notes = norm(e.notes ?? "");
      const cat = norm(e.category?.name ?? "");
      const date = norm(e.date ?? "");

      const matchesSearch =
        !s || title.includes(s) || loc.includes(s) || notes.includes(s) || cat.includes(s) || date.includes(s);

      const isActive = e.isActive !== false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, statusFilter]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Eventos de entrenamiento
          </h1>
          <p className="mt-2 text-slate-400 font-body">
            Planificación de entrenamientos (podés buscar pasados por fecha, solo lectura)
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold"
          type="button"
        >
          <Plus className="w-4 h-4" />
          Nuevo evento
        </button>
      </div>

      {/* ✅ FILTROS UNIFORMES */}
      <Card>
        {/* Fila 1: Buscar | Desde | Hasta | Estado */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Buscar */}
          <div className="relative md:col-span-5">
            <button
              type="button"
              onClick={() => searchRef.current?.focus()}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              title="Buscar"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

            <input
              ref={searchRef}
              type="search"
              placeholder="Buscar por título, lugar, notas o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Desde */}
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-11 px-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Hasta */}
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-11 px-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Estado */}
          <div className="relative md:col-span-3">
            <label className="block text-xs text-slate-400 mb-1">Estado</label>
            <Filter className="absolute left-3 top-[calc(50%+10px)] -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full h-11 pl-10 pr-4 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="active">Activos</option>
              <option value="inactive">Cancelados</option>
              <option value="all">Todos</option>
            </select>
          </div>

          {/* Fila 2: Botones izquierda | Rango derecha */}
          <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setFrom(toIsoDate(startOfPreviousMonth(d)));
                  setTo(toIsoDate(endOfPreviousMonth(d)));
                }}
                className="h-10 px-4 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Mes anterior
              </button>

              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setFrom(toIsoDate(startOfMonth(d)));
                  setTo(toIsoDate(endOfMonth(d)));
                }}
                className="h-10 px-4 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Este mes
              </button>
            </div>

            <div className="text-sm text-slate-400">
              Rango: <span className="text-slate-200">{from}</span> a{" "}
              <span className="text-slate-200">{to}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card gradient>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Hora
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Lugar
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              {filtered.map((ev) => {
                const isActive = ev.isActive !== false;
                const isPast = ev.date < todayISO;

                return (
                  <tr key={ev.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">{formatDateAR(ev.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">{ev.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{ev.title ?? "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                        {ev.category?.name ?? "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{ev.location ?? "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isActive ? (
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/25">
                          Activo
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-accent-500/15 text-accent-300 border border-accent-500/25">
                          Cancelado
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openView(ev)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/40 text-slate-200"
                          title="Ver"
                          type="button"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </button>

                        {!isPast && (
                          <button
                            onClick={() => openEdit(ev)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/40 text-slate-200"
                            title="Editar"
                            type="button"
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </button>
                        )}

                        {!isPast && (
                          <button
                            onClick={() => statusMut.mutate({ id: ev.id, isActive: !isActive })}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/40 text-slate-200"
                            title={isActive ? "Cancelar" : "Reactivar"}
                            type="button"
                          >
                            <Power className="w-4 h-4" />
                            {isActive ? "Cancelar" : "Reactivar"}
                          </button>
                        )}

                        {isPast && (
                          <span className="px-3 py-2 text-xs text-slate-500">Pasado (solo lectura)</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Mostrando {filtered.length} de {(events ?? []).length} eventos
        </div>
      </Card>

      {/* Modal Alta/Edición/Ver */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {viewOnly ? "Ver evento" : editingId ? "Editar evento" : "Nuevo evento"}
              </h2>

              <button onClick={closeModal} className="text-slate-300 hover:text-white" type="button">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white disabled:opacity-60"
                disabled={viewOnly}
              />

              <input
                type="time"
                value={form.time.slice(0, 5)}
                onChange={(e) => setForm((f) => ({ ...f, time: `${e.target.value}:00` }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white disabled:opacity-60"
                disabled={viewOnly}
              />

              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Título (opcional)"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white disabled:opacity-60"
                disabled={viewOnly}
              />

              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Lugar (opcional)"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white disabled:opacity-60"
                disabled={viewOnly}
              />

              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notas (opcional)"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white min-h-[90px] disabled:opacity-60"
                disabled={viewOnly}
              />

              <select
                value={form.categoryId ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white disabled:opacity-60"
                disabled={viewOnly || isLoadingCategories}
              >
                {isLoadingCategories && <option value={0}>Cargando categorías...</option>}
                {!isLoadingCategories && (
                  <>
                    <option value={0}>Sin categoría</option>
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
                type="button"
              >
                Cerrar
              </button>

              {!viewOnly && (
                <button
                  onClick={save}
                  disabled={createMut.isPending || updateMut.isPending}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold disabled:opacity-60"
                  type="button"
                >
                  Guardar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}