import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from '@/layouts/Sidebar'
import { TopNav } from '@/layouts/TopNav'
import { useThemeStore } from '@/stores/theme.store'

export function AppShell() {
  const mode = useThemeStore((state) => state.mode)

  // Guarantees the .dark class is applied on first paint even if the
  // persisted store hasn't finished rehydrating yet.
  useEffect(() => {
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  }, [mode])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-md focus:py-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <Sidebar className="hidden md:flex" />

      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav />
        <main id="main-content" className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
