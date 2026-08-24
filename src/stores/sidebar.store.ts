import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  collapsed: boolean
  toggleCollapsed: () => void
}

/** Desktop sidebar collapse preference only — the mobile navigation Sheet
 * never reads this and always renders expanded (Stage 2B §20). */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    { name: 'finance-command-center-sidebar' },
  ),
)
