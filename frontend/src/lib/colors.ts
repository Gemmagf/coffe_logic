/** Stable identity colors for employees (chips, avatars, timelines). */
const HUES = [
  { light: '#2a78d6', dark: '#3987e5' },
  { light: '#eb6834', dark: '#d95926' },
  { light: '#1baf7a', dark: '#199e70' },
  { light: '#eda100', dark: '#c98500' },
  { light: '#e87ba4', dark: '#d55181' },
  { light: '#4a3aa7', dark: '#9085e9' },
  { light: '#008300', dark: '#2fa02f' },
  { light: '#e34948', dark: '#e66767' },
];

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (s.charCodeAt(i) + ((h << 5) - h)) | 0;
  return Math.abs(h);
}

export function colorFor(key: string): string {
  const isDark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
  const c = HUES[hashString(key) % HUES.length];
  return isDark ? c.dark : c.light;
}

export const STATUS_COLOR = {
  DRAFT: 'warning', SENT: 'info', RECEIVED: 'success',
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger',
} as const;
