import { useQuery } from "@tanstack/react-query";
import { apiClient, getRunnerUsername, MyMembershipStatusDto } from "../services/api";
import { getEmacStatus, formatDateAR } from "../utils/helpers";

function feeLabel(feeStatus: MyMembershipStatusDto["feeStatus"]) {
  const n = typeof feeStatus === "number" ? feeStatus : null;

  if (n === 0 || feeStatus === "UpToDate") return { tone: "ok", text: "✅ Estás al día con la cuota." };
  if (n === 1 || feeStatus === "DueSoon") return { tone: "warn", text: "🟡 Tu cuota está por vencer." };
  if (n === 2 || feeStatus === "Overdue") return { tone: "bad", text: "🔴 Tu cuota está vencida." };
  return { tone: "warn", text: "🟡 Aún no registrás un pago." };
}

export default function RunnerMembershipBanner() {
  const dni = getRunnerUsername();

  const q = useQuery({
    queryKey: ["membership", "my-status", dni],
    queryFn: () => apiClient.getMyMembershipStatus(),
    enabled: !!dni,
    retry: false,
  });

  if (!dni) return null;

  // Mostramos un mini placeholder mientras carga (así "aparece algo")
  if (q.isLoading) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 mb-4 text-sm text-slate-300">
        Verificando estado de membresía...
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="rounded-2xl border border-rose-700/40 bg-rose-900/20 px-4 py-3 mb-4 text-sm text-rose-200">
        No se pudo cargar tu estado de membresía.
      </div>
    );
  }

  const s = q.data;
  const fee = feeLabel(s.feeStatus);

  const emac = getEmacStatus(undefined, s.emacValidUntil);
  const emacDate = s.emacValidUntil ? formatDateAR(s.emacValidUntil) : undefined;

  const base = "rounded-2xl border px-4 py-3 mb-4 text-sm flex flex-col gap-1";
  const toneClass =
    fee.tone === "ok"
      ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-100"
      : fee.tone === "warn"
      ? "border-amber-700/50 bg-amber-900/20 text-amber-100"
      : "border-rose-700/50 bg-rose-900/20 text-rose-100";

  const showEmacWarning = emac.status === "near-expiry" || emac.status === "expired";
  const emacMessage =
    emac.status === "near-expiry"
      ? `Tu EMMAC vence el ${emacDate}${
          emac.daysRemaining != null ? ` (en ${emac.daysRemaining} días)` : ""
        }. Renovalo antes de tu cumpleaños para evitar inconvenientes.`
      : emac.status === "expired"
      ? `Tu EMMAC está vencido desde el ${emacDate}. Regularizalo para evitar bloqueos.`
      : null;

  return (
    <div className={`${base} ${toneClass}`}>
      <div className="font-semibold">{fee.text}</div>

      {s.dueDate && (
        <div className="opacity-90">
          Vence el <span className="font-semibold">{formatDateAR(s.dueDate)}</span>
          {s.hardBlockDate && (
            <>
              {" "}
              · Bloqueo desde <span className="font-semibold">{formatDateAR(s.hardBlockDate)}</span>
            </>
          )}
        </div>
      )}

      {showEmacWarning && emacMessage && (
        <div
          className={`mt-2 rounded-xl px-4 py-3 text-sm font-semibold ${
            emac.status === "expired"
              ? "bg-rose-900/30 text-rose-200 border border-rose-500/40"
              : "bg-amber-900/30 text-amber-100 border border-amber-500/40"
          }`}
        >
          {emacMessage}
        </div>
      )}

      {!s.planVisible && (
        <div className="mt-2 font-semibold">
          Tu acceso al plan está bloqueado. Contactá al coach para regularizar.
        </div>
      )}
    </div>
  );
}
