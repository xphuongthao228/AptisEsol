---
name: Aptis Learning System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#404752'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#707783'
  outline-variant: '#c0c7d4'
  surface-tint: '#0060a8'
  primary: '#005ea4'
  on-primary: '#ffffff'
  primary-container: '#0077ce'
  on-primary-container: '#fdfcff'
  inverse-primary: '#a2c9ff'
  secondary: '#506169'
  on-secondary: '#ffffff'
  secondary-container: '#d1e2ec'
  on-secondary-container: '#55656d'
  tertiary: '#186a22'
  on-tertiary: '#ffffff'
  tertiary-container: '#358438'
  on-tertiary-container: '#f7fff1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e4ff'
  primary-fixed-dim: '#a2c9ff'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#004881'
  secondary-fixed: '#d4e5ef'
  secondary-fixed-dim: '#b8c9d3'
  on-secondary-fixed: '#0d1e25'
  on-secondary-fixed-variant: '#394951'
  tertiary-fixed: '#a3f69c'
  tertiary-fixed-dim: '#88d982'
  on-tertiary-fixed: '#002204'
  on-tertiary-fixed-variant: '#005312'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Work Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Work Sans
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  title-lg:
    fontFamily: Work Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  headline-md-mobile:
    fontFamily: Work Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar_width: 240px
  container_max_width: 1200px
  gutter: 1.5rem
  stack_sm: 0.5rem
  stack_md: 1rem
  stack_lg: 2rem
---

## Brand & Style

The design system is engineered for an educational environment that balances focus with motivation. It serves a diverse group of learners preparing for English proficiency exams, requiring a UI that feels structured, reliable, and approachable.

The aesthetic follows a **Modern Corporate** approach with a high-degree of functional clarity. It utilizes a "Split-Canvas" philosophy: a deep, authoritative sidebar for navigation and high-level structure, contrasted against a clean, "paper-white" content area designed to reduce cognitive load during study. Vibrant, color-coded action buttons provide psychological cues for categorization and progress, making the interface feel energetic and responsive rather than purely clinical.

## Colors

The palette is strategically divided into structural neutrals and functional accents.

- **Structural Colors:** The sidebar uses a deep slate (`#343A40`) to ground the application. The main workspace utilizes an off-white background to prevent eye strain, while cards and containers use pure white for maximum separation.
- **Functional Accents:** Vibrant colors are used specifically for categorization and feedback:
    - **Blue:** Primary actions and "Part 1" modules.
    - **Cyan:** "Part 2 & 3" modules.
    - **Yellow:** "Part 4" modules and cautionary navigation (e.g., "Back").
    - **Green:** Success states and "Part 5" modules.
    - **Red:** Critical emphasis or topic headers.

## Typography

This design system uses **Work Sans** as its singular typeface to maintain professional consistency and high legibility across data-heavy dashboard screens and long-form reading passages.

- **Hierarchy:** Headlines use medium and semi-bold weights to clearly demarcate sections. 
- **Readability:** Body text for practice questions utilizes a 16px base with a generous 1.6 line height to ensure learners can scan and process information comfortably.
- **Navigation:** Labels in the sidebar use a slightly smaller, more condensed treatment with a medium weight to maintain clarity at a glance.

## Layout & Spacing

The layout utilizes a **Fixed-Fluid hybrid model**:
- **Navigation:** A fixed-width sidebar (240px) persists on the left for global navigation.
- **Main Stage:** A fluid content area that centers content with a max-width of 1200px to ensure line lengths remain readable for educational content.
- **Grid:** A 12-column grid is used for dashboard layouts, while practice screens transition to a single-column stacked layout to minimize distractions.
- **Rhythm:** An 8px (0.5rem) base unit drives the spacing scale. Elements in the sidebar are tightly grouped, while the main content area uses wider margins (2rem+) to create a "breathing" workspace.

## Elevation & Depth

Visual hierarchy is established through clear tonal layering rather than heavy shadows:
- **Level 0 (Base):** The dark sidebar and light-gray main background.
- **Level 1 (Surface):** Pure white content cards and containers. These use extremely subtle, low-opacity neutral shadows or 1px light borders (`#E0E0E0`) to define edges.
- **Level 2 (Interaction):** Hover states for buttons and list items use a slight tonal shift (brightness increase) rather than an elevation lift.
- **Feedback:** Questions and interactive list items use thin, defined borders to indicate selection or focus, maintaining a flat, modern aesthetic.

## Shapes

The shape language is **Soft** and functional.
- **Standard Radius:** 0.25rem (4px) for most interactive elements like buttons, input fields, and sidebar menu highlights.
- **Container Radius:** Large cards and practice block containers use 0.5rem (8px) to feel distinct from smaller UI elements.
- **Iconography:** Icons are housed within circular or soft-square frames to provide a friendly, accessible visual anchor.

## Components

- **Buttons:** Large, high-contrast blocks with centered icons and text. They use a flat color fill with no gradients. Secondary buttons (e.g., "Check Result") use a lighter blue tint to differentiate from primary navigation.
- **Practice Blocks:** Long, horizontal containers for sentence-ordering or multiple-choice questions. They feature a 1px border and generous internal padding (1rem) to isolate text.
- **Sidebar Items:** Clean list items with left-aligned icons. Active states are indicated by a subtle background highlight and a vertical "active" bar on the edge.
- **Notification Badges:** Small, high-contrast circles (Red/Yellow) placed in the top-right corner of icons to indicate pending tasks or messages.
- **Top Header:** A high-contrast blue bar is reserved for active "Testing Mode," displaying critical info like timer and current question index in bold white text.