import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Plain `twMerge` has no knowledge of this app's custom font-size scale
 * (text-display-kpi/headline-lg/headline-sm/body-md/body-sm/table-mono/
 * label-caps — defined in styles/index.css's `@theme` block), so it falls
 * back to guessing unrecognized `text-*` classes belong to the text-color
 * group. That meant `cn('text-body-sm', condition ? 'text-foreground' :
 * ...)` could silently drop the font-size class whenever a text-color
 * class appeared later in the same call — confirmed live in the Merchant
 * Center table (Total Spend rendered at the browser-default 16px instead
 * of 13px only when merged through `cn()`, not when written as a static
 * className string). Registering the custom scale under the built-in
 * 'font-size' group fixes the collision at the source rather than
 * requiring every call site to avoid it.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-display-kpi',
        'text-headline-lg',
        'text-headline-sm',
        'text-body-md',
        'text-body-sm',
        'text-table-mono',
        'text-label-caps',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
