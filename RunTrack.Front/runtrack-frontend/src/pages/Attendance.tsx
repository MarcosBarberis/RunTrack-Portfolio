import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { formatDate, formatDateISO, exportToCSV } from '../utils/helpers';
import Card from '../components/Card';
import Loading from '../components/Loading';
import { Calendar, Filter, Download, Users } from 'lucide-react';

function translateStatus(status: string) {
  switch (status) {
    case 'Attended':
    case 'Present':
      return 'Asistió';
    case 'NoShow':
    case 'Ausente':
      return 'Ausente';
    case 'Solo':
      return 'Solo';
    default:
      return status;
  }
}

function firstDayOfCurrentMonthISO() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return formatDateISO(first);
}

export default function Attendance() {
  const today = new Date();

  // ✅ Default: primer día del mes actual → hoy
  const [dateRange, setDateRange] = useState({
    from: firstDayOfCurrentMonthISO(),
    to: formatDateISO(today),
  });

  const [statusFilter, setStatusFilter] = useState('');

  const [runnerFilter, setRunnerFilter] = useState('');

  const { data: runners } = useQuery({
    queryKey: ['runners'],
    queryFn: () => apiClient.getRunners(),
  });

  const activeRunners = useMemo(() => {
    return (runners ?? []).filter(r => r.isActive);
  }, [runners]);

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', dateRange, runnerFilter],
    queryFn: () => apiClient.getAttendance({
      from: dateRange.from,
      to: dateRange.to,
      runnerId: runnerFilter || undefined,
    }),
  });

  const filteredAttendance = useMemo(() => {
    if (!attendance) return [];
    return attendance.filter((record: any) => {
      const matchesStatus =
        !statusFilter || record.statusText === statusFilter;
      const matchesRunner =
        !runnerFilter || record.runnerId == runnerFilter;
      return matchesStatus && matchesRunner;
    });
  }, [attendance, statusFilter, runnerFilter]);

  const stats = useMemo(() => {
    if (!attendance) {
      return { attended: 0, noShow: 0, solo: 0, total: 0 };
    }

    return {
      attended: attendance.filter((a: any) => a.statusText === 'Attended' || a.statusText === 'Present').length,
      noShow: attendance.filter((a: any) => a.statusText === 'NoShow' || a.statusText === 'Ausente').length,
      solo: attendance.filter((a: any) => a.statusText === 'Solo').length,
      total: attendance.length,
    };
  }, [attendance]);

  const handleExport = () => {
    const exportData = filteredAttendance.map((a: any) => ({
      Fecha: formatDate(a.eventDate),
      Corredor: a.runnerName,
      Categoría: a.categoryName,
      Evento: a.eventTitle,
      Estado: translateStatus(a.statusText),
    }));

    exportToCSV(
      exportData,
      `asistencias-${dateRange.from}-a-${dateRange.to}.csv`
    );
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-primary-400 via-accent-500 to-highlight-400 bg-clip-text text-transparent">
            Asistencias
          </h1>
          <p className="mt-2 text-slate-400 font-body">
            Seguimiento de participación en entrenamientos
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all duration-300"
        >
          <Download className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <div className="text-sm text-green-400 font-semibold mb-1">Asistió</div>
          <div className="text-3xl font-bold text-green-400">{stats.attended}</div>
        </Card>

        <Card className="bg-red-500/10 border-red-500/30">
          <div className="text-sm text-red-400 font-semibold mb-1">Ausente</div>
          <div className="text-3xl font-bold text-red-400">{stats.noShow}</div>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <div className="text-sm text-yellow-400 font-semibold mb-1">Solo</div>
          <div className="text-3xl font-bold text-yellow-400">{stats.solo}</div>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <div className="text-sm text-blue-400 font-semibold mb-1">Total</div>
          <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white"
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
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Estado</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white appearance-none"
              >
                <option value="">Todos</option>
                <option value="Attended">Asistió</option>
                <option value="Ausente">Ausente</option>
                <option value="Solo">Solo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Corredor</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select
                value={runnerFilter}
                onChange={(e) => setRunnerFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white appearance-none"
              >
                <option value="">Todos</option>
                {activeRunners.map((runner) => (
                  <option key={runner.id} value={runner.id.toString()}>
                    {runner.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card gradient>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Corredor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Evento</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              {filteredAttendance.map((record: any) => (
                <tr
                  key={`${record.runnerId}-${record.eventTitle}-${record.eventDate}`}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-primary-400 font-mono font-semibold">
                    {formatDate(record.eventDate)}
                  </td>

                  <td className="px-6 py-4 text-sm text-white">
                    {record.runnerName}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-300">
                    {record.eventTitle}
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">
                      {record.categoryName}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-300">
                    {translateStatus(record.statusText)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-slate-400">
          Mostrando {filteredAttendance.length} registros
        </div>
      </Card>
    </div>
  );
}

