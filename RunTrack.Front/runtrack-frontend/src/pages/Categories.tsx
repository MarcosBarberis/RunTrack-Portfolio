import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Filter, Plus, Power, Pencil } from 'lucide-react';

import { apiClient } from '../services/api';
import Card from '../components/Card';
import Loading from '../components/Loading';
import type { Category, CategoryUpsertDto } from '../services/api';
import { Runner } from '../types';

type CategoryRow = Category;

export default function Categories() {
  const qc = useQueryClient();

  type StatusFilter = 'active' | 'inactive' | 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active'); // default Activas

  // Modal (Alta/Edición)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<CategoryUpsertDto>({
    name: '',
    description: '',
    isActive: true,
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  });

  const { data: runners } = useQuery({
    queryKey: ['runners'],
    queryFn: () => apiClient.getRunners(),
  });

  const createMut = useMutation({
    mutationFn: (dto: CategoryUpsertDto) => apiClient.createCategory(dto),
    onSuccess: async () => {
      toast.success('Categoría creada');
      closeModal();
      await qc.invalidateQueries({ queryKey: ['categories'] });
      await qc.invalidateQueries({ queryKey: ['runners'] });
    },
    onError: () => toast.error('No se pudo crear la categoría'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CategoryUpsertDto }) =>
      apiClient.updateCategory(id, dto),
    onSuccess: async () => {
      toast.success('Categoría actualizada');
      closeModal();
      await qc.invalidateQueries({ queryKey: ['categories'] });
      await qc.invalidateQueries({ queryKey: ['runners'] });
    },
    onError: () => toast.error('No se pudo actualizar la categoría'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.updateCategoryStatus(id, isActive),
    onSuccess: async () => {
      toast.success('Estado actualizado');
      await qc.invalidateQueries({ queryKey: ['categories'] });
      await qc.invalidateQueries({ queryKey: ['runners'] });
    },
    onError: () => toast.error('No se pudo cambiar el estado'),
  });

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', description: '', isActive: true });
    setIsModalOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditingId(category.id);
    setForm({
      name: category.name ?? '',
      description: category.description ?? '',
      isActive: !!category.isActive,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({ name: '', description: '', isActive: true });
  }

  function toggleStatus(cat: CategoryRow) {
    if (!cat.isActive) {
      // activar, no necesita advertencia
      statusMut.mutate({ id: cat.id, isActive: true });
      return;
    }

    // desactivar, verificar si tiene runners
    const assignedRunners = (runners ?? []).filter((r: Runner) => r.categoryId === cat.id);
    if (assignedRunners.length > 0) {
      const confirm = window.confirm(
        'Esta categoría tiene runners asignados. Si la desactivás, deberías reasignarlos. ¿Deseás continuar?'
      );
      if (!confirm) return;
    }

    statusMut.mutate({ id: cat.id, isActive: false });
  }

  function save() {
    const dto: CategoryUpsertDto = {
      name: (form.name ?? '').trim(),
      description: (form.description ?? '').trim() || null,
      isActive: !!form.isActive,
    };

    if (!dto.name) return toast.error('El nombre es obligatorio');

    if (editingId) updateMut.mutate({ id: editingId, dto });
    else createMut.mutate(dto);
  }

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const list = categories as unknown as CategoryRow[];

    const s = (searchTerm ?? '').toLowerCase().trim();

    return list.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const description = (c.description ?? '').toLowerCase();

      const matchesSearch = !s || name.includes(s) || description.includes(s);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.isActive) ||
        (statusFilter === 'inactive' && !c.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchTerm, statusFilter]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Categories
          </h1>
          <p className="mt-2 text-slate-400 font-body">Administración de categorías</p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold"
          type="button"
        >
          <Plus className="w-4 h-4" />
          Nueva categoría
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
              <option value="all">Todas</option>
            </select>
          </div>
        </div>
      </Card>

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
                  Descripción
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
              {filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{cat.name}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-300">{cat.description ?? '-'}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {cat.isActive ? (
                      <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Activa
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Inactiva
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/40 text-slate-200"
                        title="Editar"
                        type="button"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar
                      </button>

                      <button
                        onClick={() => toggleStatus(cat)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/40 text-slate-200"
                        title={cat.isActive ? 'Desactivar' : 'Activar'}
                        type="button"
                      >
                        <Power className="w-4 h-4" />
                        {cat.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Mostrando {filteredCategories.length} de {(categories as any)?.length || 0} categorías
        </div>
      </Card>

      {/* Modal Alta/Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Editar categoría' : 'Nueva categoría'}
              </h2>

              <button onClick={closeModal} className="text-slate-300 hover:text-white" type="button">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
              />

              <input
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción (opcional)"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
              />

              <label className="flex items-center gap-2 text-slate-200 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Categoría activa
              </label>
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