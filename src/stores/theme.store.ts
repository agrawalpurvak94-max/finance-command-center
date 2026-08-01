import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return mode === 'dark'
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', resolveIsDark(mode))
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // The finalized Stitch design (apex_ledger) is dark-only, so new
      // sessions default to dark rather than the browser's light default.
      mode: 'dark',
      setMode: (mode) => {
        applyTheme(mode)
        set({ mode })
      },
    }),
    {
      name: 'finance-command-center-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.mode)
      },
    },
  ),
)
