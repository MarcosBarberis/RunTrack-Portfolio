import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { formatDate, formatDateISO, formatDateAR, exportToCSV } from '../utils/helpers';
import Card from '../components/Card';
import Loading from '../components/Loading';
import { Calendar, Filter, Download, User } from 'lucide-react';

function formatPaceSafe(paceMinPerKm: any) {
  const p = Number(paceMinPerKm);
  if (!isFinite(p) || p <= 0) return '-';

  const totalSeconds = Math.round(p * 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;

  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function firstDayOfCurrentMonthISO() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return formatDateISO(first);
}

export default function Workouts() {
  const today = new Date();

  // ✅ Default: desde 1er día del mes actual hasta hoy
  const [dateRange, setDateRange] = useState({
    from: firstDayOfCurrentMonthISO(),
    to: formatDateISO(today),
  });

  const [categoryFilter, setCategoryFilter] = useState('');
  const [runnerFilter, setRunnerFilter] = useState<number | ''>('');

  // Workouts con rango (y runner si está seleccionado)
  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workout-logs', dateRange, runnerFilter],
    queryFn: () =>
      apiClient.getWorkoutLogs({
        from: dateRange.from,
        to: dateRange.to,
        ...(runnerFilter ? { runnerId: String(runnerFilter) } : {}),
      }),
  });

  // Select de runners
  const { data: runners } = useQuery({
    queryKey: ['runners'],
    queryFn: () => apiClient.getRunners(),
  });

  const categories = useMemo(() => {
    if (!workouts) return [];
    return Array.from(new Set(workouts.map((w: any) => w.categoryName).filter(Boolean))).sort();
  }, [workouts]);

  const filteredWorkouts = useMemo(() => {
    if (!workouts) return [];
    return workouts.filter((workout: any) => {
      const matchesCategory = !categoryFilter || workout.categoryName === categoryFilter;
      return matchesCategory;
    });
  }, [workouts, categoryFilter]);

  const handleExport = () => {
    const exportData = filteredWorkouts.map((w: any) => {
      // ✅ Nombres reales del DTO
      const durationMin = w.durationMin ?? 0;
      const pace = w.paceMinPerKm ?? (w.distanceKm > 0 ? durationMin / w.distanceKm : 0);

      return {
        Fecha: formatDate(w.date),
        Corredor: w.runnerName,
        Categoría: w.categoryName,
        Tipo: w.type ?? 'Entrenamiento', // tu DTO no trae type → fallback
        'Distancia (km)': w.distanceKm,
        'Duración (min)': durationMin,
        'Ritmo (min/km)': `${formatPaceSafe(pace)}/km`,
        RPE: w.rpe,
        Dolor: w.hadPain ? 'Sí' : 'No',
        Notas: w.notes,
      };
    });

    exportToCSV(exportData, `entrenamientos-${dateRange.from}-a-${dateRange.to}.csv`);
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Entrenamientos
          </h1>
          <p className="mt-2 text-slate-400 font-body">Seguimiento de sesiones y rendimiento</p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all duration-300"
        >
          <Download className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Runner */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Corredor</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={runnerFilter}
                onChange={(e) => setRunnerFilter(e.target.value ? Number(e.target.value) : '')}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="">Todos</option>
                {(runners ?? []).map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Categoría</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="">Todas</option>
                {categories.map((cat, idx) => (
                  <option key={`${cat}-${idx}`} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card gradient>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Corredor
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Distancia
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Ritmo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  RPE
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Dolor
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              {filteredWorkouts.map((workout: any, idx: number) => {
                const durationMin = workout.durationMin ?? 0;
                const paceMinPerKm =
                  workout.paceMinPerKm ?? (workout.distanceKm > 0 ? durationMin / workout.distanceKm : 0);

                return (
                  <tr
                    key={
                      workout.workoutLogId ??
                      workout.workoutLogID ??
                      workout.id ??
                      `${workout.date}-${workout.runnerName}-${idx}`
                    }
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-400 font-mono font-semibold">
                      {formatDateAR(workout.date)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{workout.runnerName}</div>
                      <div className="text-xs text-slate-400">{workout.categoryName}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-accent-500/20 text-accent-400 border border-accent-500/30">
                        {workout.type ?? 'Entrenamiento'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                      {Number(workout.distanceKm ?? 0).toFixed(1)} km
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                      {Number(durationMin ?? 0)} min
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-400 font-mono font-semibold">
                      {formatPaceSafe(paceMinPerKm)}/km
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(Number(workout.rpe ?? 0) / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-300 font-mono">
                          {Number(workout.rpe ?? 0).toFixed(0)}/5
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-300 font-mono">
                        {workout.hadPain ? 'Sí' : 'No'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Mostrando {filteredWorkouts.length} entrenamientos
        </div>
      </Card>
    </div>
  );
}


