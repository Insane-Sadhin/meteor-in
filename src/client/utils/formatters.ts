export function formatISTTime(dateStr?: string): string {
  if (!dateStr || dateStr === 'NOT AVAILABLE') return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const timeStr = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${timeStr} IST`;
  } catch {
    return dateStr;
  }
}

export function formatISTDateTime(dateStr?: string): string {
  if (!dateStr || dateStr === 'NOT AVAILABLE') return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${datePart}, ${timePart} IST`;
  } catch {
    return dateStr;
  }
}

export function getTemperatureColor(temp: number): string {
  if (temp < 10) return '#38bdf8'; // Sky cyan cold
  if (temp < 20) return '#2dd4bf'; // Teal mild
  if (temp < 28) return '#10b981'; // Emerald pleasant
  if (temp < 34) return '#f59e0b'; // Amber warm
  if (temp < 40) return '#f97316'; // Orange hot
  return '#ef4444'; // Red extreme heat
}

export function getSeverityBadge(severity: string): { bg: string; text: string; border: string } {
  switch (severity?.toUpperCase()) {
    case 'LOW':
      return { bg: 'bg-emerald-950/50', text: 'text-emerald-400', border: 'border-emerald-800' };
    case 'MODERATE':
      return { bg: 'bg-amber-950/50', text: 'text-amber-400', border: 'border-amber-800' };
    case 'HIGH':
      return { bg: 'bg-orange-950/50', text: 'text-orange-400', border: 'border-orange-800' };
    case 'SEVERE':
      return { bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-700' };
    case 'EXTREME':
      return { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-600' };
    default:
      return { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  }
}

export function getVerificationBadge(status?: string): { bg: string; text: string; border: string } {
  switch (status?.toUpperCase()) {
    case 'CORRELATED':
    case 'VERIFIED':
      return { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-800' };
    case 'UNDER REVIEW':
      return { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-800' };
    case 'CONTRADICTED':
      return { bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-800' };
    case 'DUPLICATE':
      return { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-800' };
    case 'REJECTED':
      return { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' };
    default:
      return { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' };
  }
}

export function getSourceStatusStyle(status: string): { dot: string; text: string } {
  switch (status?.toUpperCase()) {
    case 'ONLINE':
      return { dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]', text: 'text-emerald-400' };
    case 'CONFIG_REQUIRED':
      return { dot: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]', text: 'text-amber-400' };
    case 'NOT_CONFIGURED':
      return { dot: 'bg-zinc-500', text: 'text-zinc-400' };
    case 'DEGRADED':
      return { dot: 'bg-orange-500', text: 'text-orange-400' };
    case 'NOT_CONNECTED':
      return { dot: 'bg-slate-600', text: 'text-slate-500' };
    case 'OFFLINE':
    case 'FAILED':
      return { dot: 'bg-rose-500', text: 'text-rose-400' };
    default:
      return { dot: 'bg-slate-500', text: 'text-slate-400' };
  }
}
