import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import KPICard from '../components/KPICard';
import Card from '../components/Card';
import Loading from '../components/Loading';
import { Activity, TrendingUp, Timer, Heart, Zap } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatPace, formatDateAR } from '../utils/helpers';

type GroupBy = 'week' | 'month';

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function defaultFromToThisMonth() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: toISODate(firstDay),
    to: toISODate(today),
  };
}

function addDays(iso: string, days: number) {
  const dt = parseISODate(iso);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

function addMonths(iso: string, months: number) {
  const dt = parseISODate(iso);
  dt.setMonth(dt.getMonth() + months);
  return toISODate(dt);
}

function getWeekStartISO(iso: string) {
  const dt = parseISODate(iso);
  const dow = dt.getDay(); // 0 domingo ... 6 sábado
  const offset = dow === 0 ? 6 : dow - 1; // domingo => 6, lunes => 0
  dt.setDate(dt.getDate() - offset);
  return toISODate(dt);
}

function getMonthStartISO(iso: string) {
  const dt = parseISODate(iso);
  dt.setDate(1);
  return toISODate(dt);
}

export default function Dashboard() {
  // --- filtros UI ---
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [groupBy, setGroupBy] = useState<GroupBy>('week');

  const defaults = useMemo(() => defaultFromToThisMonth(), []);
  const [from, setFrom] = useState<string>(defaults.from);
  const [to, setTo] = useState<string>(defaults.to);

  // --- runners ---
  const { data: runners, isLoading: runnersLoading } = useQuery({
    queryKey: ['runners'],
    queryFn: () => apiClient.getRunners(),
  });

  const [runnerSearch, setRunnerSearch] = useState('');

  const [debouncedRunnerSearch, setDebouncedRunnerSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedRunnerSearch(runnerSearch), 500);
    return () => clearTimeout(timer);
  }, [runnerSearch]);

  const selectedRunner = useMemo(() => {
    const txt = debouncedRunnerSearch.trim().toLowerCase();
    if (!txt) return null;

    const list = runners ?? [];
    const exact = list.find(r => r.fullName.trim().toLowerCase() === txt);
    if (exact) return exact;

    const byContains = list.find(r => r.fullName.toLowerCase().includes(txt));
    return byContains ?? null;
  }, [debouncedRunnerSearch, runners]);

  const runnerId: number | null = selectedRunner?.id ?? null;

  // limpiar categoría si hay runner seleccionado
  useEffect(() => {
    if (runnerId) setCategoryId('');
  }, [runnerId]);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  });

  // regla: si hay runner seleccionado, ignoramos category
  const effectiveCategoryId = runnerId != null ? undefined : (categoryId === '' ? undefined : categoryId);

  const filters = useMemo(() => ({
    from,
    to,
    groupBy,
    runnerId: runnerId ?? undefined,
    categoryId: effectiveCategoryId,
  }), [from, to, groupBy, runnerId, effectiveCategoryId]);

  const shouldFetchKpis = !!from && !!to;

  // --- KPIs serie ---
  const { data: kpisSeries, isLoading: kpisLoading } = useQuery({
    queryKey: ['analytics', 'kpi-series', filters],
    queryFn: () => apiClient.getKpiSeries(filters),
    enabled: shouldFetchKpis,
  });

  // --- Comentarios ---
  const { data: logsWithNotes, isLoading: notesLoading } = useQuery({
    queryKey: ['reports', 'workout-logs-notes', { from, to, runnerId }],
    queryFn: async () => {
      if (!runnerId) return [];
      const logs = await apiClient.getWorkoutLogs({ from, to, runnerId: String(runnerId) });
      return (logs ?? []).filter((l: any) => (l.notes ?? '').trim().length > 0);
    },
    enabled: !!runnerId && !!from && !!to,
  });

  // ✅ Dolor real del período: calculado desde WorkoutLogs (evita “último entrenamiento”)
  const { data: painStats, isLoading: painLoading } = useQuery({
    queryKey: ['reports', 'workout-logs-pain', { from, to, runnerId, effectiveCategoryId }],
    queryFn: async () => {
      if (!from || !to) return { total: 0, pain: 0 };

      // Runner específico
      if (runnerId) {
        const logs = await apiClient.getWorkoutLogs({ from, to, runnerId: String(runnerId) });
        const total = (logs ?? []).length;
        const pain = (logs ?? []).filter((l: any) => l.hadPain).length;
        return { total, pain };
      }

      // Categoría específica
      if (effectiveCategoryId) {
        const logs = await apiClient.getWorkoutLogs({ from, to, categoryId: String(effectiveCategoryId) });
        const total = (logs ?? []).length;
        const pain = (logs ?? []).filter((l: any) => l.hadPain).length;
        return { total, pain };
      }

      // Global
      const logs = await apiClient.getWorkoutLogs({ from, to });
      const total = (logs ?? []).length;
      const pain = (logs ?? []).filter((l: any) => l.hadPain).length;
      return { total, pain };
    },
    enabled: !!from && !!to,
  });

  // Top 5 streaks (coach dashboard) - only when no runner selected
  const { data: topStreaks } = useQuery({
    queryKey: ['runners', 'top-streaks'],
    queryFn: () => apiClient.getTopStreaks(),
    enabled: !runnerId,
  });

  const painRatePeriodFromLogs = useMemo(() => {
    const total = painStats?.total ?? 0;
    const pain = painStats?.pain ?? 0;
    return total > 0 ? pain / total : 0;
  }, [painStats]);

  // ---- DERIVED ----
  const aggregatedByBucket = useMemo(() => {
    const map = new Map<string, any>();

    for (const k of (kpisSeries ?? [])) {
      const key = (k?.weekStart ?? '').toString();
      if (!key) continue;

      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...k });
        continue;
      }

      const sessions = (prev.sessions ?? 0) + (k.sessions ?? 0);
      const totalKm = (prev.totalKm ?? 0) + (k.totalKm ?? 0);

      const paceWeighted =
        (prev.avgPaceMinPerKm ?? 0) * (prev.totalKm ?? 0) +
        (k.avgPaceMinPerKm ?? 0) * (k.totalKm ?? 0);

      map.set(key, {
        ...prev,
        sessions,
        totalKm,
        avgPaceMinPerKm: totalKm > 0 ? paceWeighted / totalKm : 0,
        avgRpe: sessions > 0
          ? (((prev.avgRpe ?? 0) * (prev.sessions ?? 0)) + ((k.avgRpe ?? 0) * (k.sessions ?? 0))) / sessions
          : 0,
        painRate: sessions > 0
          ? (((prev.painRate ?? 0) * (prev.sessions ?? 0)) + ((k.painRate ?? 0) * (k.sessions ?? 0))) / sessions
          : 0,
        activeRunners: Math.max(prev.activeRunners ?? 0, k.activeRunners ?? 0),
      });
    }

    return Array.from(map.values()).sort((a, b) => (a.weekStart ?? '').localeCompare(b.weekStart ?? ''));
  }, [kpisSeries, runnerId]);

  const filledSeries = useMemo(() => {
    if (!from || !to) return [];

    const startKey = groupBy === 'week' ? getWeekStartISO(from) : getMonthStartISO(from);
    const endKey = groupBy === 'week' ? getWeekStartISO(to) : getMonthStartISO(to);

    const byKey = new Map(aggregatedByBucket.map(x => [x.weekStart, x]));
    const out: any[] = [];

    let cur = startKey;
    const step = (key: string) => groupBy === 'week' ? addDays(key, 7) : addMonths(key, 1);

    while (cur <= endKey) {
      const found = byKey.get(cur);
      out.push(
        found ?? {
          weekStart: cur,
          weekEnd: groupBy === 'week' ? addDays(cur, 6) : addDays(addMonths(cur, 1), -1),
          sessions: 0,
          totalKm: 0,
          activeRunners: 0,
          avgPaceMinPerKm: 0,
          painRate: 0,
          avgRpe: 0,
        }
      );
      cur = step(cur);
    }

    return out;
  }, [aggregatedByBucket, from, to, groupBy, runnerId]);

  const periodSummary = useMemo(() => {
    const items = filledSeries;

    const sessions = items.reduce((a, b) => a + (b.sessions ?? 0), 0);
    const totalKm = items.reduce((a, b) => a + (b.totalKm ?? 0), 0);

    const paceWeighted = items.reduce((a, b) => a + ((b.avgPaceMinPerKm ?? 0) * (b.totalKm ?? 0)), 0);
    const avgPace = totalKm > 0 ? paceWeighted / totalKm : 0;

    const rpeWeighted = items.reduce((a, b) => a + ((b.avgRpe ?? 0) * (b.sessions ?? 0)), 0);
    const avgRpe = sessions > 0 ? rpeWeighted / sessions : 0;

    return { sessions, totalKm, avgPaceMinPerKm: avgPace, avgRpe };
  }, [filledSeries]);

  const chartData = useMemo(() => {
    return (filledSeries ?? []).map((kpi: any) => ({
      date: String(kpi.weekStart ?? ""),
      km: Number(kpi.totalKm ?? 0),
      pace: Number(kpi.avgPaceMinPerKm ?? 0),
      sessions: Number(kpi.sessions ?? 0),
      rpe: Number(kpi.avgRpe ?? 0),
    }));
  }, [filledSeries]);

  const loading = runnersLoading || categoriesLoading || kpisLoading || notesLoading || painLoading;
  if (loading) return <Loading />;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
          Panel de rendimiento
        </h1>
        <p className="mt-2 text-slate-400 font-body">
          Filtrá por corredor, categoría y período para ver el progreso.
        </p>
      </div>

      <Card gradient>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Corredor</label>

            <input
              list="runners-list"
              value={runnerSearch}
              onChange={(e) => setRunnerSearch(e.target.value)}
              placeholder="Escribí un nombre… (vacío = todos)"
              className="w-full rounded-xl bg-slate-900/60 border border-slate-700 text-slate-200 px-3 py-2"
            />

            <datalist id="runners-list">
              {(runners ?? []).map(r => (
                <option key={r.id} value={r.fullName} />
              ))}
            </datalist>

            {runnerSearch.trim() && !runnerId && (
              <p className="mt-1 text-xs text-slate-400">
                No se encontró un corredor. Probá otro nombre.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Categoría</label>
            <select
              className="w-full rounded-xl bg-slate-900/60 border border-slate-700 text-slate-200 px-3 py-2 disabled:opacity-50"
              value={categoryId}
              disabled={!!runnerId}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Todas</option>
              {(categories ?? []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!!runnerId && (
              <p className="mt-1 text-xs text-slate-400">La categoría se determina por el corredor.</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Desde</label>
            <input
              type="date"
              className="w-full rounded-xl bg-slate-900/60 border border-slate-700 text-slate-200 px-3 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Hasta</label>
            <input
              type="date"
              className="w-full rounded-xl bg-slate-900/60 border border-slate-700 text-slate-200 px-3 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Agrupar</label>
            <select
              className="w-full rounded-xl bg-slate-900/60 border border-slate-700 text-slate-200 px-3 py-2"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            >
              <option value="week">Semana</option>
              <option value="month">Mes</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard title="Sesiones de entrenamiento" value={periodSummary.sessions} icon={Activity} color="blue" />
        <KPICard title="Distancia total" value={`${periodSummary.totalKm.toFixed(1)} km`} icon={TrendingUp} color="orange" />
        <KPICard title="Ritmo promedio" value={formatPace(periodSummary.avgPaceMinPerKm)} icon={Timer} color="green" />
        <KPICard title="RPE promedio" value={periodSummary.avgRpe.toFixed(1)} icon={Zap} color="purple" />
        <KPICard title="Tasa de dolor" value={`${(painRatePeriodFromLogs * 100).toFixed(0)}%`} icon={Heart} color="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card gradient>
          <h3 className="text-xl font-bold text-white mb-6 font-display">
            Distancia ({groupBy === 'week' ? 'semanal' : 'mensual'})
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Line type="monotone" dataKey="km" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} name="Km" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card gradient>
          <h3 className="text-xl font-bold text-white mb-6 font-display">Ritmo promedio (min/km)</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Line type="monotone" dataKey="pace" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} name="Ritmo" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card gradient className="lg:col-span-2">
          <h3 className="text-xl font-bold text-white mb-6 font-display">Sesiones & RPE</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="sessions" fill="#f97316" name="Sesiones" radius={[8, 8, 0, 0]} />
                <Bar dataKey="rpe" fill="#a855f7" name="RPE prom." radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        {!runnerId && (topStreaks ?? []).length > 0 && (
          <Card gradient>
            <h3 className="text-xl font-bold text-white mb-4 font-display">🏆 Top 5 Rachas Históricas</h3>
            <div className="space-y-2">
              {(topStreaks ?? []).map((t: any, idx: number) => (
                <div key={t.runnerId} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                  <div className="text-sm text-slate-200">
                    <span className="font-semibold">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`}</span>{' '}
                    <span className="ml-2">{t.fullName}</span>
                  </div>
                  <div className="text-sm font-semibold text-amber-400">{t.bestStreak > 0 ? `🔥 ${t.bestStreak}` : '—'}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {runnerId && (logsWithNotes?.length ?? 0) > 0 && (
        <Card gradient>
          <h3 className="text-xl font-bold text-white mb-4 font-display">Comentarios del período</h3>
          <div className="space-y-3">
            {logsWithNotes!.map((l: any, index: number) => (
              <div
                key={l.id ?? `${l.date}-${index}`}
                className="rounded-xl border border-slate-700 bg-slate-900/40 p-3"
              >
                <div className="text-sm text-slate-300">
                  <span className="font-semibold">Fecha:</span>{' '}
                  {formatDateAR(l.date)}
                  {l.distanceKm != null && (
                    <>
                      {' '}• <span className="font-semibold">Km:</span>{' '}
                      {Number(l.distanceKm).toFixed(1)}
                    </>
                  )}
                </div>
                <div className="mt-1 text-slate-100 whitespace-pre-wrap">{l.notes}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}


