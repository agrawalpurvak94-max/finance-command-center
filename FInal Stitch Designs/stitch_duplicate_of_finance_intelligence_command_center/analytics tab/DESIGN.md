---
name: Apex Ledger
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#b7c8e1'
  on-secondary: '#213145'
  secondary-container: '#3a4a5f'
  on-secondary-container: '#a9bad3'
  tertiary: '#ffb596'
  on-tertiary: '#581e00'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-kpi:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  table-mono:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for high-stakes financial operations, blending the precision of developer tools with the premium finish of modern fintech giants. The brand personality is authoritative, silent, and exceptionally efficient, designed to reduce cognitive load during complex auditing and fiscal reporting tasks.

The visual style is a fusion of **Minimalism** and **Corporate Modern**. It prioritizes information density without clutter, utilizing a "Deep UI" approach where depth is communicated through subtle tonal shifts rather than heavy shadows. The aesthetic is inspired by the utilitarian elegance of platforms like Linear and Stripe, favoring crisp borders, monospaced numerical data, and a monochromatic foundation punctuated by high-intent blue accents.

## Colors

The palette is rooted in a "Zinc & Slate" dark mode. The canvas uses a near-black Zinc-950 to provide maximum contrast for data visualization.

- **Primary:** A refined Blue-600 serves as the single point of intent for actions and active states.
- **Surface Scale:** We use a stepped neutral scale (Zinc 900, 800, 700) to create container hierarchy.
- **Semantic Accents:** Success (Emerald), Destructive (Rose), and Warning (Amber) are desaturated to maintain a professional, non-vibrant environment, only gaining vibrancy on interaction.
- **Data Visualization:** Use a cold spectrum of blues, teals, and purples to represent different fiscal categories, avoiding warm tones unless indicating a deficit or risk.

## Typography

This design system utilizes **Geist** exclusively for its geometric precision and excellent legibility in high-density environments.

For all financial figures, enable tabular lining (`tnum`) to ensure decimal points and currency symbols (₹) align perfectly in vertical columns.

- **Large KPI Values:** Use `display-kpi` with tight letter spacing for dashboard headers.
- **Data Tables:** Use `table-mono` for all row data.
- **Hierarchy:** Use `label-caps` for table headers and section overlines to differentiate from interactive labels.
- **Indian Numbering:** Ensure the UI correctly formats numbers using the Lakh/Crore system (e.g., ₹1,00,000 instead of ₹100,000).

## Layout & Spacing

The system follows a strict **8px linear scale**. All padding, margins, and component heights must be multiples of 8.

- **Grid Model:** 12-column fluid grid for main dashboards.
- **Density:** High-density layout. Vertical spacing in data tables is compressed to 8px (sm) or 12px padding per row to maximize data visibility.
- **Sidebars:** Fixed-width navigation (240px) or collapsed (64px) to prioritize the workspace.
- **Fiscal Context:** Headers should always display the current Indian Fiscal Year (e.g., "FY 2024-25") in the top right utility area.

## Elevation & Depth

Elevation is achieved through **Tonal Layers** and **Low-contrast outlines**. We avoid traditional drop shadows in favor of a "stacked" appearance:

1.  **Level 0 (Canvas):** Zinc-950 - The base background.
2.  **Level 1 (Cards/Containers):** Zinc-900 with a 1px solid border (Zinc-800).
3.  **Level 2 (Modals/Popovers):** Zinc-800 with a subtle 1px Zinc-700 border and a 10% opacity black shadow with a 20px blur.

Interactive elements use a "Flash" state—a subtle background brightening on hover rather than an elevation lift.

## Shapes

A consistent **8px (0.5rem) corner radius** is applied to all primary containers, including buttons, input fields, and cards.

- **Small elements:** Tags and status badges use a 4px radius.
- **Selection states:** Checkboxes and radio buttons maintain a slight 2px or 4px radius respectively to match the geometric language of Geist.
- **Consistency:** Avoid pill-shaped buttons; stick to the 8px standard to maintain the "Industrial/Enterprise" feel.

## Components

- **Buttons:** Primary buttons are Solid Blue-600 with white text. Secondary buttons use a Zinc-800 ghost style with a subtle border.
- **Data Tables:** The core of the system. Rows have a 1px bottom border (Zinc-800). Header cells use `label-caps` and are sticky. Right-align all numerical/currency columns.
- **Input Fields:** Zinc-900 background, 1px Zinc-800 border. Focus state moves the border to Blue-600 with a 1px inner blue glow.
- **KPI Cards:** Feature a top-aligned `label-caps` title, a large `display-kpi` value, and a small trend indicator at the bottom.
- **Chips/Status:** Use subtle background tints (e.g., 10% opacity Emerald for "Processed") with high-contrast text. No heavy backgrounds.
- **Audit Logs:** Use a condensed list format with monospaced timestamps and user identifiers.
