import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search, FileText } from "lucide-react";

import Card from "../components/Card";
import Loading from "../components/Loading";
import { apiClient, RunnerDocumentsRow } from "../services/api";
import { getEmacStatus, formatDateAR } from "../utils/helpers";

type Filter =
  | "all"
  | "waiver_pending"
  | "emac_pending"
  | "emac_near_expiry"
  | "emac_expired"
  | "ok";

export default function Documents() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RunnerDocumentsRow | null>(null);

  const [waiverDeliveredAt, setWaiverDeliveredAt] = useState<string>("");
  const [emacDeliveredAt, setEmacDeliveredAt] = useState<string>("");

  const q = useQuery({
    queryKey: ["runners", "documents"],
    queryFn: () => apiClient.getRunnersDocuments(),
  });

  const saveMut = useMutation({
    mutationFn: (payload: { id: number; waiver: string | null; emac: string | null }) =>
      apiClient.updateRunnerDocuments(payload.id, {
        waiverDeliveredAt: payload.waiver,
        emacDeliveredAt: payload.emac,
      }),
    onSuccess: async () => {
      toast.success("Documentación actualizada");
      setOpen(false);
      setSelected(null);
      await qc.invalidateQueries({ queryKey: ["runners", "documents"] });
      await qc.invalidateQueries({ queryKey: ["membership", "my-status"], exact: false }); // por si el runner está logueado
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo actualizar"),
  });

  const rows = useMemo(() => {
    const list = (q.data ?? []) as RunnerDocumentsRow[];
    const s = search.trim().toLowerCase();

    // Filtrar runners inactivos (backend puede devolverlos)
    const activeList = list.filter((r) => r.isActive !== false);

    return activeList.filter((r) => {
      const matchSearch =
        !s ||
        (r.fullName ?? "").toLowerCase().includes(s) ||
        (r.dni ?? "").toLowerCase().includes(s);

      const emac = getEmacStatus(r.emacDeliveredAt, r.emacValidUntil);
      const waiverPending = !r.waiverDeliveredAt;
      const emacPending = emac.status === 'pending' || emac.status === 'unknown';
      const emacExpired = emac.status === 'expired';
      const ok = !waiverPending && !emacPending && !emacExpired;

      const matchFilter =
        filter === "all" ||
        (filter === "waiver_pending" && waiverPending) ||
        (filter === "emac_pending" && emacPending) ||
        (filter === "emac_near_expiry" && emac.status === "near-expiry") ||
        (filter === "emac_expired" && emacExpired) ||
        (filter === "ok" && ok);

      return matchSearch && matchFilter;
    });
  }, [q.data, search, filter]);

  function openModal(r: RunnerDocumentsRow) {
    setSelected(r);
    setWaiverDeliveredAt(r.waiverDeliveredAt ? r.waiverDeliveredAt.slice(0, 10) : "");
    setEmacDeliveredAt(r.emacDeliveredAt ? r.emacDeliveredAt.slice(0, 10) : "");
    setOpen(true);
  }

  function save() {
    if (!selected) return;

    saveMut.mutate({
      id: selected.id,
      waiver: waiverDeliveredAt ? waiverDeliveredAt : null,
      emac: emacDeliveredAt ? emacDeliveredAt : null,
    });
  }

  if (q.isLoading) return <Loading />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
          Documentos
        </h1>
        <p className="mt-2 text-slate-400 font-body">
          EMAC (vigencia anual) y Deslinde (sin vencimiento)
        </p>
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

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Todos</option>
            <option value="waiver_pending">Deslinde pendiente</option>
            <option value="emac_pending">EMAC pendiente / no calculable</option>
            <option value="emac_near_expiry">EMAC próximo a vencer</option>
            <option value="emac_expired">EMAC vencido</option>
            <option value="ok">Todo OK</option>
          </select>

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
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Deslinde</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">EMAC</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Vigente hasta</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              {rows.map((r) => {
                const waiverPending = !r.waiverDeliveredAt;

                return (
                  <tr key={r.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{r.fullName}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{r.dni ?? "-"}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {waiverPending ? (
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                          Pendiente
                        </span>
                      ) : (
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Entregado
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                {(() => {
                  const emac = getEmacStatus(r.emacDeliveredAt, r.emacValidUntil);

                  if (emac.status === 'pending' || emac.status === 'unknown') {
                    return (
                      <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-slate-500/20 text-slate-200 border border-slate-500/30">
                        Pendiente / No calculable
                      </span>
                    );
                  }

                  if (emac.status === 'expired') {
                    return (
                      <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30">
                        Vencido
                      </span>
                    );
                  }

                  if (emac.status === 'near-expiry') {
                    return (
                      <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                        Próximo a vencer
                      </span>
                    );
                  }

                  return (
                    <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Vigente
                    </span>
                  );
                })()}
              </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{formatDateAR(r.emacValidUntil)}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openModal(r)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold"
                        type="button"
                      >
                        <FileText className="w-4 h-4" />
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal editar */}
      {open && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Documentación</h2>
              <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white" type="button">
                ✕
              </button>
            </div>

            <div className="mt-3 text-sm text-slate-300">
              Runner: <span className="font-semibold text-white">{selected.fullName}</span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-slate-300">Deslinde entregado (sin vencimiento)</label>
                <input
                  type="date"
                  value={waiverDeliveredAt}
                  onChange={(e) => setWaiverDeliveredAt(e.target.value)}
                  className="mt-1 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
                <button
                  className="mt-2 text-xs text-slate-400 hover:text-slate-200"
                  type="button"
                  onClick={() => setWaiverDeliveredAt("")}
                >
                  Marcar como pendiente (vaciar)
                </button>
              </div>

              <div>
                <label className="text-sm text-slate-300">EMAC entregado (vigencia 1 año)</label>
                <input
                  type="date"
                  value={emacDeliveredAt}
                  onChange={(e) => setEmacDeliveredAt(e.target.value)}
                  className="mt-1 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
                <button
                  className="mt-2 text-xs text-slate-400 hover:text-slate-200"
                  type="button"
                  onClick={() => setEmacDeliveredAt("")}
                >
                  Marcar como pendiente (vaciar)
                </button>
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
                onClick={save}
                disabled={saveMut.isPending}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold disabled:opacity-60"
                type="button"
              >
                {saveMut.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
