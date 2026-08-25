import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // overflow-x-auto alone makes browsers compute overflow-y as `auto`
        // too (a documented CSS quirk: leaving one axis `visible` and the
        // other non-visible forces the visible one to `auto`) — with this
        // list's fixed h-9, that could show a native vertical scrollbar
        // (arrows included) for a 1px overflow that was never meant to
        // scroll. overflow-y-hidden pins the vertical axis so only
        // horizontal scrolling (needed when tabs overflow the width) is
        // ever possible.
        'inline-flex h-9 w-fit items-center gap-1 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-body-sm font-medium text-muted-foreground outline-none transition-colors select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-foreground data-[active]:text-background [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTab, TabsPanel }
