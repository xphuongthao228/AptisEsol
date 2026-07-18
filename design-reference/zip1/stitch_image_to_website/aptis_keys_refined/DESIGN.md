---
name: Aptis Keys Refined
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#434655'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#006329'
  on-tertiary: '#ffffff'
  tertiary-container: '#007f36'
  on-tertiary-container: '#c7ffca'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system embodies a **Corporate/Modern** aesthetic, specifically tailored for the efficiency and clarity required by high-performance SaaS environments. The brand personality is dependable, precise, and transparent. It focuses on functional minimalism—where whitespace is used strategically to reduce cognitive load and visual noise.

The target audience consists of professional operators and administrators who value speed and clarity. The UI should evoke a sense of organized control through a disciplined use of color, a rigorous grid, and subtle depth cues that guide the user’s eye toward primary actions without distraction.

## Colors
The palette is rooted in a professional "Cool Grey-Blue" spectrum to ensure long-term legibility and reduced eye strain. 

- **Primary Blue** is the engine of the interface, used for primary actions and active states.
- **Surface & Container** logic is strict: The background uses a slightly tinted cool grey (`#F8FAFC`) to allow white surface containers (`#FFFFFF`) like cards and modals to "pop" via contrast rather than just shadows.
- **Status Colors** (Success, Warning, Danger) are vibrant and high-saturation to ensure immediate recognition within data-heavy tables or dashboards.
- **Text Hierarchy** is maintained by contrasting the deep slate of `On-Surface` text against the softer `On-Surface-Variant` for secondary metadata and labels.

## Typography
This design system utilizes **Inter** exclusively to leverage its exceptional legibility and systematic feel. The scale follows a standard SaaS dashboard progression:

- **Headlines & Titles:** Use semi-bold weights (`600`) and slight negative letter-spacing for a modern, "tight" editorial feel.
- **Body Text:** The standard size is `14px` (body-md) for data density, while `16px` (body-lg) is reserved for long-form reading or empty state descriptions.
- **Labels:** Medium weights (`500`) are used for UI micro-copy (buttons, chips, table headers) to distinguish them from standard body text.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a 12-column structure for desktop. 

- **Rhythm:** All spacing is derived from a 4px base unit. 
- **Gutters:** Standardized at `24px` to provide ample breathing room between functional modules.
- **Responsiveness:** 
  - **Desktop (1440px+):** 12 columns, 32px side margins.
  - **Tablet (768px - 1439px):** 8 columns, 24px side margins.
  - **Mobile (<767px):** 4 columns, 16px side margins.
- **Alignment:** Consistent use of `md` (16px) padding inside cards and `lg` (24px) for section headers creates a structured, rhythmic flow.

## Elevation & Depth
Depth is created through **Ambient Shadows** and **Tonal Layering** rather than heavy borders or gradients.

- **Level 0 (Background):** `#F8FAFC` - No shadow.
- **Level 1 (Cards/Resting):** `#FFFFFF` with a very soft shadow: `0 1px 3px rgba(0,0,0,0.08)`. This creates a "lifted" appearance that feels integrated into the surface.
- **Level 2 (Hover/Interaction):** When a user interacts with a card, the elevation increases to `0 8px 24px rgba(0,0,0,0.08)`, suggesting a physical pick-up effect.
- **Level 3 (Modals/Dropdowns):** Uses a deeper, more diffused shadow to ensure clear separation from the layers beneath.

## Shapes
The shape language is consistently **Rounded**, using a `10px` (approximately `0.625rem`) radius as the standard for all primary containers and interactive elements. 

- **Standard Elements:** Buttons, Input Fields, and Search Boxes use the `10px` radius.
- **Large Elements:** Primary cards and dashboard widgets scale up to `rounded-lg` (16px) to maintain visual harmony with their larger surface area.
- **Small Elements:** Tooltips and tags may use `rounded-sm` (4px) to avoid looking "clunky" at small scales.

## Components
- **Buttons:** 
  - Primary: Background `#2563EB`, text `#FFFFFF`. Hover uses `#1D4ED8`, Pressed uses `#1E40AF`.
  - Secondary: Ghost or Outline style using `#475569` text and `#E5E7EB` borders.
  - Padding: `10px 20px` for standard buttons to maintain a professional, balanced footprint.
- **Search Box:** 
  - Height: `40px` fixed.
  - Styling: White background, 1px border (`#E5E7EB`), `10px` radius.
  - Placeholder: `#94A3B8`. Icon (20px) is inset `12px` from the left.
- **Navigation & Icons:** 
  - Size: Icons are strictly `20px`.
  - Spacing: List items in sidebars should have a `24px` horizontal gap between the icon and its label or between adjacent icons.
- **Cards:** 
  - Always white (`#FFFFFF`) with the `10px` radius and Level 1 shadow. 
  - Internal padding should be `24px` for headers and `16px-24px` for content bodies.
- **Inputs:** 
  - Follow the Search Box styling for consistency. Focus state should use a `2px` outer glow in the primary blue at 20% opacity.