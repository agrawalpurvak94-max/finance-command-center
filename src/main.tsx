import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import { ensureSupabaseSession } from '@/lib/supabaseAuth'
import '@/styles/index.css'

// Module 12A: establish the RLS session before any repository can be
// queried. No new page/component — see supabaseAuth.ts for why.
void ensureSupabaseSession().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
