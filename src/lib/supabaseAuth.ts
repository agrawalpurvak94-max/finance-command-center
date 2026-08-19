import { supabase } from '@/lib/supabase'

/**
 * Module 12A session bootstrap. CLAUDE.md's Module 12A contract forbids
 * adding any new page ("Pages: None new"), so there is no login screen —
 * every RLS policy added in the Database Foundation phase requires a real
 * `auth.uid()`, so the app establishes a session silently on startup
 * instead. If VITE_SUPABASE_DEV_EMAIL/VITE_SUPABASE_DEV_PASSWORD are not
 * set (e.g. a future production build with a real auth flow), this
 * resolves without a session and RLS-protected calls will simply return
 * empty/fail — never crashes the app.
 */
let sessionReady: Promise<void> | null = null

export function ensureSupabaseSession(): Promise<void> {
  if (!sessionReady) {
    sessionReady = (async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) return

      const email = import.meta.env.VITE_SUPABASE_DEV_EMAIL
      const password = import.meta.env.VITE_SUPABASE_DEV_PASSWORD
      if (!email || !password) return

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        // Do not throw — a failed dev sign-in should not crash the whole app;
        // RLS-protected reads will just come back empty and surface as an
        // empty state, which is the correct degraded behavior here.
        console.error('Supabase dev session sign-in failed:', error.message)
      }
    })()
  }
  return sessionReady
}

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error('No authenticated Supabase user — cannot resolve owner for this operation.')
  }
  return data.user.id
}
