import { useState } from 'react'
import { Bell, LogOut, Menu, Monitor, Moon, Search, Sun, User, UserRound } from 'lucide-react'
import { Sidebar } from '@/layouts/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useThemeStore, type ThemeMode } from '@/stores/theme.store'

const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
]

export function TopNav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const mode = useThemeStore((state) => state.mode)
  const setMode = useThemeStore((state) => state.setMode)
  const ActiveThemeIcon = themeOptions.find((option) => option.mode === mode)?.icon ?? Monitor

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-md border-b border-border bg-background/95 px-lg backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex flex-1 items-center gap-lg">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation menu"
              />
            }
          >
            <Menu className="size-5" aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="relative hidden w-full max-w-80 sm:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search…"
            className="rounded-full pl-9"
            aria-label="Global search"
          />
        </div>
      </div>

      <div className="flex items-center gap-sm">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-5" aria-hidden="true" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" aria-label={`Theme: ${mode}`} />}
          >
            <ActiveThemeIcon className="size-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {themeOptions.map(({ mode: optionMode, label, icon: Icon }) => (
              <DropdownMenuItem key={optionMode} onClick={() => setMode(optionMode)}>
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="User menu" />
            }
          >
            <Avatar className="size-8 border border-border">
              <AvatarFallback>
                <UserRound className="size-4" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User className="size-4" aria-hidden="true" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
