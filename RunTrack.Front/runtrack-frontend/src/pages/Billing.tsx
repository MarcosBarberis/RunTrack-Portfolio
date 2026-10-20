import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, CreditCard, Filter } from 'lucide-react';

import Card from '../components/Card';
import Loading from '../components/Loading';
import { formatDateAR } from '../utils/helpers';
import { apiClient, RunnerBillingDto } from '../services/api';

type FeeFilter = 'all' | 'uptodate' | 'duesoon' | 'overdue' | 'notpaid' | 'blocked';

function feeInfo(feeStatus: RunnerBillingDto['feeStatus']) {
  const n = typeof feeStatus === 'number' ? feeStatus : null;

  // 0 UpToDate | 1 DueSoon | 2 Overdue | 3 NotPaidYet
  if (n === 0 || feeStatus === 'UpToDate')
    return { label: 'Al día', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  if (n === 1 || feeStatus === 'DueSoon')
    return { label: 'Por vencer', cls: 'bg-amber-500/20 text-amber-200 border-amber-500/30' };
  if (n === 2 || feeStatus === 'Overdue')
    return { label: 'Vencida', cls: 'bg-rose-500/20 text-rose-200 border-rose-500/30' };
  return { label: 'Sin pago', cls: 'bg-slate-500/20 text-slate-200 border-slate-500/30' };
}

export default function Billing() {
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');

  // modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RunnerBillingDto | null>(null);
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [months, setMonths] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['runners', 'billing'],
    queryFn: () => apiClient.getRunnersBilling(),
  });

  const payMut = useMutation({
    mutationFn: ({ runnerId, paidAt, months }: { runnerId: number; paidAt: string; months: number }) =>
      apiClient.registerPayment(runnerId, { paidAt, months }),
    onSuccess: async () => {
      toast.success('Pago registrado');
      setOpen(false);
      setSelected(null);
      await qc.invalidateQueries({ queryKey: ['runners', 'billing'] });
      await qc.invalidateQueries({ queryKey: ['membership', 'my-status'], exact: false });
      await qc.invalidateQueries({ queryKey: ['my-training-events'], exact: false });
    },
    onError: (e: any) => toast.error(e?.message ?? 'No se pudo registrar el pago'),
  });

  const rows = useMemo(() => {
    const list = (data ?? []) as RunnerBillingDto[];
    const s = search.trim().toLowerCase();

    // Filtrar runners inactivos (backend puede devolverlos)
    const activeList = list.filter((r) => r.isActive !== false);

    return activeList.filter((r) => {
      const matchSearch =
        !s ||
        (r.fullName ?? '').toLowerCase().includes(s) ||
        (r.dni ?? '').toLowerCase().includes(s);

      const info = feeInfo(r.feeStatus);
      const isBlocked = r.planVisible === false;

      const matchFee =
        feeFilter === 'all' ||
        (feeFilter === 'uptodate' && info.label === 'Al día') ||
        (feeFilter === 'duesoon' && info.label === 'Por vencer') ||
        (feeFilter === 'overdue' && info.label === 'Vencida') ||
        (feeFilter === 'notpaid' && info.label === 'Sin pago') ||
        (feeFilter === 'blocked' && isBlocked);

      return matchSearch && matchFee;
    });
  }, [data, search, feeFilter]);

  function openPay(r: RunnerBillingDto) {
    setSelected(r);
    setPaidAt(new Date().toISOString().slice(0, 10));
    setMonths(1);
    setOpen(true);
  }

  function confirmPay() {
    if (!selected) return;
    if (!paidAt) return toast.error('Elegí una fecha');
    if (!months || months < 1) return toast.error('Período inválido');

    payMut.mutate({ runnerId: selected.id, paidAt, months });
  }

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Cuotas
          </h1>
          <p className="mt-2 text-slate-400 font-body">Control de pagos y vencimientos</p>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <select
              value={feeFilter}
              onChange={(e) => setFeeFilter(e.target.value as FeeFilter)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="uptodate">Al día</option>
              <option value="duesoon">Por vencer (día 25)</option>
              <option value="overdue">Vencida (día 30)</option>
              <option value="notpaid">Sin pago</option>
              <option value="blocked">Plan bloqueado (+37)</option>
            </select>
          </div>

          <div className="text-sm text-slate-400 flex items-center">
            Mostrando <span className="mx-1 font-semibold text-slate-200">{rows.length}</span> runners
          </div>
        </div>
      </Card>

      <Card gradient>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">DNI</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Vence</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Bloqueo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              {rows.map((r) => {
                const info = feeInfo(r.feeStatus);
                return (
                  <tr key={r.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{r.fullName}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{r.dni ?? '-'}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full border ${info.cls}`}>
                        {info.label}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{formatDateAR(r.dueDate)}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{formatDateAR(r.hardBlockDate)}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {r.planVisible ? (
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Visible
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30">
                          Bloqueado
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openPay(r)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold"
                        type="button"
                      >
                        <CreditCard className="w-4 h-4" />
                        Registrar pago
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal registrar pago */}
      {open && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Registrar pago</h2>
              <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white" type="button">
                ✕
              </button>
            </div>

            <div className="mt-3 text-sm text-slate-300">
              Runner: <span className="font-semibold text-white">{selected.fullName}</span> ({selected.dni ?? 'sin DNI'})
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="text-sm text-slate-300">Fecha de pago</label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="mt-1 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">Período</label>
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="mt-1 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                >
                  <option value={1}>1 mes (30 días)</option>
                  <option value={2}>2 meses (60 días)</option>
                  <option value={3}>3 meses (90 días)</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                </select>
              </div>

              <div className="text-xs text-slate-400">
                * “Por vencer” aparece desde el día 25. “Vencida” desde el día 30. “Plan bloqueado” desde el día 37.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800"
                type="button"
              >
                Cancelar
              </button>

              <button
                onClick={confirmPay}
                disabled={payMut.isPending}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold disabled:opacity-60"
                type="button"
              >
                Guardar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
