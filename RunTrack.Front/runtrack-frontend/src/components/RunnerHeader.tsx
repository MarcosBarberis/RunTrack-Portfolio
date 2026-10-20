import { clearSession, getRunnerUsername, apiClient } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type Props = {
  onBack?: () => void;
  hideBack?: boolean;
};

function RunnerHeader({ onBack, hideBack }: Props) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const dni = getRunnerUsername();

  const { data: runner } = useQuery({
    queryKey: ['runner-me', dni],
    queryFn: () => apiClient.getRunnerMe(),
    enabled: !!dni,
    retry: false,
    refetchOnMount: 'always',
  });

  const firstName = runner?.fullName?.split(' ')[0] ?? 'Runner';

  function logout() {
    clearSession();

    // Limpiar caché runner para evitar reutilizar datos de la sesión anterior
    qc.removeQueries({ queryKey: ['runner-me'], exact: false });
    qc.removeQueries({ queryKey: ['my-training-events'], exact: false });
    qc.removeQueries({ queryKey: ['membership'], exact: false });
    qc.removeQueries({ queryKey: ['training-event'], exact: false });
    qc.removeQueries({ queryKey: ['my-attendance'], exact: false });
    qc.removeQueries({ queryKey: ['my-workout-log'], exact: false });

    nav('/runner/login', { replace: true });
  }

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {!hideBack && (
          <button
            onClick={() => (onBack ? onBack() : nav('/runner/plan'))}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900 transition"
            type="button"
          >
            ← Volver
          </button>
        )}

        <div className="text-sm font-semibold text-white">
          👋 Hola, {firstName}
        </div>
      </div>

      <button
        onClick={logout}
        className="rounded-xl border border-red-500 bg-transparent px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
        type="button"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export default RunnerHeader;

