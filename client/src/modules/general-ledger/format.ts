export function fmtMoney(n: number | string): string {
  const num = Number(n);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(d: string | Date): string {
  return new Date(d).toISOString().split('T')[0];
}

export const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  POSTED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  LOCKED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
};
