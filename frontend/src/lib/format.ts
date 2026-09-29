import i18n from '../i18n';

/** Intl locale for the active UI language (Swiss variants where they exist). */
export function intlLocale(lang = i18n.language): string {
  const base = (lang || 'de').slice(0, 2);
  return ({ de: 'de-CH', fr: 'fr-CH', it: 'it-CH', en: 'en-CH', ca: 'ca-ES', el: 'el-GR' } as Record<string, string>)[base] ?? 'de-CH';
}

export function fmtCHF(n: number | string | null | undefined, opts: { compact?: boolean; signed?: boolean; decimals?: number } = {}): string {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return '—';
  const decimals = opts.decimals ?? (opts.compact ? 0 : 2);
  const s = new Intl.NumberFormat(intlLocale(), {
    style: 'currency', currency: 'CHF', currencyDisplay: 'code',
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(v).replace(/ /g, ' ');
  return opts.signed && v > 0 ? `+${s}` : s;
}

export function fmtNum(n: number | string | null | undefined, decimals = 0): string {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return '—';
  return new Intl.NumberFormat(intlLocale(), { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(v);
}

export function fmtPct(n: number, decimals = 0): string {
  return `${n > 0 ? '+' : ''}${fmtNum(n, decimals)}%`;
}

/** "YYYY-MM-DD" -> local Date (never shifts by timezone). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = () => toISODate(new Date());

/** Hours between two "HH:MM" strings. */
export function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

export function fmtHours(h: number): string {
  return `${fmtNum(h, 1)} h`;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}
