export function formatDateISO(date: Date) {
  // Use local date components to avoid UTC conversions that shift the day
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateOnly(dateString?: string | null): string {
  if (!dateString) return "-";
  // Expecting 'yyyy-MM-dd' or 'yyyy-MM-ddTHH:mm:ss' – extract date portion
  const raw = String(dateString).split('T')[0];
  const parts = raw.split('-');
  if (parts.length !== 3) return "-";
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function formatDate(value: any) {
  if (!value) return "-";

  // If it's a DateOnly string (yyyy-MM-dd), format it without timezone
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDateOnly(value);
  }

  // Fallback: accept Date objects
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString();
}

export function formatDateAR(value: any): string {
  if (!value) return "-";

  // If it's a DateOnly string, format directly to DD/MM/YYYY without timezone
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDateOnly(value);
  }

  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "-";

  const formatter = new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(d);
}

export function formatDateTimeAR(date: any, time?: string): string {
  if (!date) return "-";
  // If it's a DateOnly string, format without timezone
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const formattedDate = formatDateOnly(date);
    if (time) {
      const timeStr = time.includes(":") ? time.substring(0, 5) : time;
      return `${formattedDate} ${timeStr}`;
    }
    return formattedDate;
  }

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "-";

  const formatter = new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const formattedDate = formatter.format(d);
  if (time) {
    const timeStr = time.includes(":") ? time.substring(0, 5) : time;
    return `${formattedDate} ${timeStr}`;
  }

  return formattedDate;
}

export function calculatePace(distanceKm: number, durationMin: number): number {
  if (distanceKm === 0) return 0;
  return durationMin / distanceKm;
}

export function formatPace(paceMinPerKm: number): string {
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function exportToCSV<T extends Record<string, unknown>>(data: T[], filename: string): void {
  if (data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        // Escape commas and quotes
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
}

export function getLast12Weeks(): { from: string; to: string } {
  const today = new Date();
  const twelveWeeksAgo = new Date(today.getTime() - 84 * 24 * 60 * 60 * 1000); // 12 weeks
  return {
    from: formatDateISO(getWeekStart(twelveWeeksAgo)),
    to: formatDateISO(today),
  };
}

export function getLastWeek(): { from: string; to: string } {
  const today = new Date();
  const lastWeekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    from: formatDateISO(getWeekStart(lastWeekStart)),
    to: formatDateISO(getWeekEnd(lastWeekStart)),
  };
}

export type EmacStatus = 'pending' | 'unknown' | 'valid' | 'near-expiry' | 'expired';

export function getEmacStatus(
  emacDeliveredAt?: string | null,
  emacValidUntil?: string | null,
  today = new Date()
): { status: EmacStatus; daysRemaining?: number | null; validUntil?: string | null } {
  // Si no hay nada de EMMAC (ni entrega ni vencimiento), está pendiente
  if (!emacDeliveredAt && !emacValidUntil) return { status: 'pending' };

  // Si hay fecha de vencimiento, la usamos para calcular estado (asumimos entrega hecha)
  if (!emacValidUntil) return { status: 'unknown' };

  // Parse emacValidUntil as a date-only string to avoid timezone shifts
  let until: Date;
  if (typeof emacValidUntil === 'string' && /^\d{4}-\d{2}-\d{2}/.test(emacValidUntil)) {
    const [yy, mm, dd] = emacValidUntil.split('-').map(Number);
    until = new Date(yy, mm - 1, dd);
  } else {
    until = emacValidUntil ? new Date(emacValidUntil) : new Date(NaN);
  }
  if (isNaN(until.getTime())) return { status: 'unknown' };

  const todayCopy = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffMs = until.getTime() - todayCopy.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return { status: 'expired', daysRemaining, validUntil: emacValidUntil };
  if (daysRemaining <= 30) return { status: 'near-expiry', daysRemaining, validUntil: emacValidUntil };
  return { status: 'valid', daysRemaining, validUntil: emacValidUntil };
}

export function getThisWeek(): { from: string; to: string } {
  const today = new Date();
  return {
    from: formatDateISO(getWeekStart(today)),
    to: formatDateISO(today),
  };
}
