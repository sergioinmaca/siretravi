export function toDateInput(date: Date): string {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateSafe(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const cleaned = dateStr.split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return new Date(NaN);
  const [y, m, d] = cleaned.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDisplayDate(date: Date | string): string {
  if (typeof date === 'string') {
    const [y, m, d] = date.split('-');
    if (!y || !m || !d || isNaN(+y) || isNaN(+m) || isNaN(+d)) return '';
    return `${d}/${m}/${y}`;
  }
  if (!date || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
