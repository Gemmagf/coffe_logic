import { format as dfFormat, type Locale } from 'date-fns';
import { de, fr, it, enGB, ca, el } from 'date-fns/locale';
import i18n from '../i18n';
import { parseLocalDate } from './format';

const LOCALES: Record<string, Locale> = { de, fr, it, en: enGB, ca, el };

export function dateLocale(lang = i18n.language): Locale {
  return LOCALES[(lang || 'de').slice(0, 2)] ?? de;
}

/** Locale-aware date-fns format. Accepts a Date or "YYYY-MM-DD". */
export function fmtDate(d: Date | string, pattern = 'd MMM yyyy'): string {
  const date = typeof d === 'string' ? (d.length === 10 ? parseLocalDate(d) : new Date(d)) : d;
  return dfFormat(date, pattern, { locale: dateLocale() });
}

/** Short weekday labels (Mon..Sun) in the active language. */
export function weekdayShort(dayIndexMondayFirst: number): string {
  // 2024-01-01 is a Monday
  return dfFormat(new Date(2024, 0, 1 + dayIndexMondayFirst), 'EEEEEE', { locale: dateLocale() });
}

export function weekdayLong(dayIndexMondayFirst: number): string {
  return dfFormat(new Date(2024, 0, 1 + dayIndexMondayFirst), 'EEEE', { locale: dateLocale() });
}

/** Maps backend day codes (SUN..SAT) or JS getDay() indices to localized short labels. */
const CODE_TO_JS: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
export function dayLabelFromCode(code: string | number, long = false): string {
  const js = typeof code === 'number' ? code : CODE_TO_JS[code] ?? -1;
  if (js < 0) return String(code);
  const mondayFirst = (js + 6) % 7;
  return long ? weekdayLong(mondayFirst) : weekdayShort(mondayFirst);
}

export function relativeDays(n: number): string {
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });
  return rtf.format(-n, 'day');
}
