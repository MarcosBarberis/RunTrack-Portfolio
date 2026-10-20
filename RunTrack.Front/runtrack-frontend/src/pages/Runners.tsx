import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Filter, Plus, Power, Pencil } from 'lucide-react';

import { apiClient, Category } from '../services/api';
import { Runner } from '../types';
import Card from '../components/Card';
import Loading from '../components/Loading';

function birthdayDiffDays(birthDateIso?: string | null) {
  if (!birthDateIso) return null;

  const raw = birthDateIso.split('T')[0]; // "2000-04-27"
  const parts = raw.split('-');
  if (parts.length !== 3) return null;

  const m = Number(parts[1]); // 1..12
  const d = Number(parts[2]); // 1..31
  if (!m || !d) return null;

  // Usar zona horaria local para calcular días de forma intuitiva
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < today) next = new Date(now.getFullYear() + 1, m - 1, d);

  const diffMs = next.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatBirthdayDate(birthDateIso?: string | null): string {
  if (!birthDateIso) return '—';
  
  const raw = birthDateIso.split('T')[0]; // "2000-04-27"
  const parts = raw.split('-');
  if (parts.length !== 3) return '—';
  
  const m = parts[1]; // "04"
  const d = parts[2]; // "27"
  
  return `${d}/${m}`;
}

type RunnerRow = Runner;
type RunnerFormDto = {
  fullName: string;
  age: number;
  dni: string;
  goal?: string | null;
  categoryId: number;
};

export default function Runners() {
  const qc = useQueryClient();

  type StatusFilter = 'active' | 'inactive' | 'all';

  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<RunnerFormDto>({
    fullName: '',
    age: 18,
    dni: '',
    goal: '',
    categoryId: 1,
  });

  const { data: runners, isLoading } = useQuery({
    queryKey: ['runners'],
    queryFn: () => apiClient.getRunners(),
  });

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  });

  const createMut = useMutation({
    mutationFn: (dto: RunnerFormDto) => apiClient.createRunner(dto),
    onSuccess: async () => {
      toast.success('Runner creado');
      closeModal();
      await qc.invalidateQueries({ queryKey: ['runners'] });
    },
    onError: () => toast.error('No se pudo crear el runner'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: RunnerFormDto }) =>
      apiClient.updateRunner(id, dto),
    onSuccess: async () => {
      toast.success('Runner actualizado');
      closeModal();
      await qc.invalidateQueries({ queryKey: ['runners'] });
    },
    onError: () => toast.error('No se pudo actualizar el runner'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.updateRunnerStatus(id, isActive),
    onSuccess: async () => {
      toast.success('Estado actualizado');
      await qc.invalidateQueries({ queryKey: ['runners'] });
    },
    onError: () => toast.error('No se pudo cambiar el estado'),
  });

  const allCategories = useMemo(() => {
    return (categoriesData ?? [])
      .slice()
      .sort((a: Category, b: Category) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [categoriesData]);

  const activeCategories = useMemo(() => {
    return allCategories.filter((c: Category) => c.isActive);
  }, [allCategories]);

  function openCreate() {
    const firstActiveId = activeCategories[0]?.id ?? 0;
    setEditingId(null);
    setForm({ fullName: '', age: 18, goal: '', categoryId: firstActiveId, dni: '' });
    setIsModalOpen(true);
  }

  function openEdit(runner: RunnerRow) {
    setEditingId(runner.id);
    setForm({
      fullName: runner.fullName ?? '',
      age: runner.age ?? 18,
      dni: runner.dni ?? '',
      goal: runner.goal ?? '',
      categoryId: runner.categoryId ?? 0,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({ fullName: '', dni: '', age: 18, goal: '', categoryId: 0 });
  }

  function save() {
    console.log('SAVE EJECUTADO', form);

    const fullName = (form.fullName ?? '').trim();
    const rawDni = (form.dni ?? '').trim();

    if (!fullName) return toast.error('El nombre es obligatorio');
    if (!rawDni) return toast.error('El DNI es obligatorio');
    if (/[^0-9]/.test(rawDni)) return toast.error('El DNI debe contener solo números');

    const dni = rawDni.replace(/\D/g, '');
    if (dni.length < 7 || dni.length > 8) return toast.error('El DNI debe tener entre 7 y 8 dígitos');

    const dto: RunnerFormDto = {
      fullName,
      dni,
      age: Number(form.age),
      goal: (form.goal ?? '').trim() || null,
      categoryId: Number(form.categoryId),
    };

    if (!dto.age || dto.age < 1) return toast.error('La edad no es válida');
    if (!dto.categoryId || dto.categoryId < 1)
      return toast.error('Seleccioná una categoría válida');

    if (editingId) updateMut.mutate({ id: editingId, dto });
    else createMut.mutate(dto);
  }

  const categories = useMemo(() => {
    return allCategories.map((c: Category) => c.name);
  }, [allCategories]);

  const filteredRunners = useMemo(() => {
    if (!runners) return [];
    const list = runners;

    const s = (searchTerm ?? '').toLowerCase().trim();

    const base = list.filter((r) => {
      const fullName = (r.fullName ?? '').toLowerCase();
      const goal = (r.goal ?? '').toLowerCase();
	const category = (r.categoryName ?? '').toLowerCase();
      const matchesSearch = !s || fullName.includes(s) || goal.includes(s) || category.includes(s);
	const matchesCategory = !categoryFilter || r.categoryName === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && r.isActive) ||
        (statusFilter === 'inactive' && !r.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // ✅ orden: hoy (diff 0), mañana (diff 1), resto
    return base.slice().sort((a, b) => {
      const ad = birthdayDiffDays(a.birthDate);
      const bd = birthdayDiffDays(b.birthDate);
      const aRank = ad === 0 ? 2 : ad === 1 ? 1 : 0;
      const bRank = bd === 0 ? 2 : bd === 1 ? 1 : 0;
      return bRank - aRank;
    });
  }, [runners, searchTerm, categoryFilter, statusFilter]);

  // ✅ Alerts (sin filtros) para banner + modal
  const birthdayAlerts = useMemo(() => {
    const list = runners ?? [];
    return list
      .map((r) => ({ r, diff: birthdayDiffDays(r.birthDate) }))
      .filter((x) => x.diff !== null && x.diff >= 0 && x.diff <= 30);
  }, [runners]);

  // ✅ Mostrar modal 1 vez por sesión si hay alertas
  useEffect(() => {
    if (birthdayAlerts.length === 0) return;

    const key = 'coach_birthdays_modal_shown';
    if (!sessionStorage.getItem(key)) {
      setShowBirthdayModal(true);
      sessionStorage.setItem(key, '1');
    }
  }, [birthdayAlerts]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <Card gradient>
          <Loading />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ✅ MODAL (dentro del return) */}
      {showBirthdayModal && birthdayAlerts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-700/40 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white">🎉 Cumpleaños</h2>
            <p className="mt-1 text-slate-300 text-sm">
              Tenés corredores con cumpleaños próximos en los próximos 30 días.
            </p>

            <ul className="mt-4 space-y-2">
              {birthdayAlerts.map(({ r, diff }) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2"
                >
                  <div>
                    <div className="text-white font-semibold">{r.fullName}</div>
                    <div className="text-slate-400 text-xs">{r.categoryName ?? '-'}</div>
                  </div>

                  <span
                    className={
                      diff === 0
                        ? 'px-2 py-1 rounded-lg bg-emerald-700 text-white text-xs font-semibold'
                        : 'px-2 py-1 rounded-lg bg-sky-700 text-white text-xs font-semibold'
                    }
                  >
                    {diff === 0 ? '🎂 Hoy' : diff === 1 ? '🎉 Mañana' : `🎉 En ${diff}d`}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setShowBirthdayModal(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-semibold text-white"
              type="button"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Runners
          </h1>
          <p className="mt-2 text-slate-400 font-body">Listado de integrantes del grupo</p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold"
          type="button"
        >
          <Plus className="w-4 h-4" />
          Nuevo runner
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, categoría o objetivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat: string, idx: number) => (
                <option key={`${cat}-${idx}`} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ✅ Banner Cumpleaños (Hoy / próximos 30 días) */}
      {birthdayAlerts.length > 0 && (
        <div className="mb-4 rounded-2xl border border-emerald-700/40 bg-emerald-900/20 p-4">
          <div className="text-white font-semibold">🎉 Cumpleaños</div>
          <ul className="mt-2 text-slate-200 text-sm space-y-1">
            {birthdayAlerts.map(({ r, diff }) => (
              <li key={r.id}>
                {diff === 0 ? '🎂 Hoy' : diff === 1 ? '🎉 Mañana' : `🎉 En ${diff} días`}:{' '}
                <span className="font-semibold">{r.fullName}</span>
                {' · '}
                <span className="text-slate-300">{r.categoryName ?? '-'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Table */}
      <Card gradient>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  DNI
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Edad
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Objetivo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Cumple
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Mejor Racha
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              {filteredRunners.map((runner) => {

                return (
                  <tr key={runner.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{runner.fullName}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{runner.dni ?? '-'}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{runner.age ?? '-'}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
  			<span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">
   			 {runner.categoryName ?? '-'}
  			</span>
		   </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{runner.goal ?? '-'}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-300 text-sm font-medium">
                        {formatBirthdayDate(runner.birthDate)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {runner.isActive ? (
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Activo
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Inactivo
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold">
                        {runner.bestStreak && runner.bestStreak > 0 ? (
                          <span className="text-amber-400">🔥 {runner.bestStreak}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(runner)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/40 text-slate-200"
                          title="Editar"
                          type="button"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </button>

                        <button
                          onClick={() => statusMut.mutate({ id: runner.id, isActive: !runner.isActive })}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/40 text-slate-200"
                          title={runner.isActive ? 'Desactivar' : 'Activar'}
                          type="button"
                        >
                          <Power className="w-4 h-4" />
                          {runner.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Mostrando {filteredRunners.length} de {runners?.length || 0} runners
        </div>
      </Card>

      {/* Modal Alta/Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Editar runner' : 'Nuevo runner'}
              </h2>

              <button onClick={closeModal} className="text-slate-300 hover:text-white" type="button">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Nombre completo"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
              />

              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) }))}
                placeholder="Edad"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
              />

              <input
                value={form.goal ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                placeholder="Objetivo (opcional)"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
              />

              <input
                value={form.dni}
                onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
                placeholder="DNI (solo números)"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
              />

              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                disabled={isLoadingCategories}
              >
                {isLoadingCategories && <option value={0}>Cargando categorías...</option>}

                {!isLoadingCategories && activeCategories.length === 0 && (
                  <option value={0}>No hay categorías activas</option>
                )}

                {!isLoadingCategories &&
                  activeCategories.map((c: Category) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
                type="button"
              >
                Cancelar
              </button>

              <button
                onClick={save}
                disabled={createMut.isPending || updateMut.isPending}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold disabled:opacity-60"
                type="button"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}