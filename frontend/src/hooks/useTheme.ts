import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePref = 'light' | 'dark' | 'system';

interface ThemeState {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

function apply(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#12141D' : '#2D3250');
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      pref: 'system',
      setPref: (pref) => { apply(pref); set({ pref }); },
    }),
    {
      name: 'cafgic-theme',
      onRehydrateStorage: () => (state) => { if (state) apply(state.pref); },
    },
  ),
);

/** Resolved theme, reactive to OS changes when pref is "system". */
export function resolvedTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
