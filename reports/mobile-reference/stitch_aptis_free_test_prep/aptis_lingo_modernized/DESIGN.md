---
name: Aptis Lingo Modernized
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#5d3f3c'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#926f6b'
  outline-variant: '#e6bdb8'
  surface-tint: '#c00014'
  primary: '#ae0011'
  on-primary: '#ffffff'
  primary-container: '#d71920'
  on-primary-container: '#ffece9'
  inverse-primary: '#ffb4ab'
  secondary: '#6d5e00'
  on-secondary: '#ffffff'
  secondary-container: '#fddc00'
  on-secondary-container: '#706000'
  tertiary: '#004ac6'
  on-tertiary: '#ffffff'
  tertiary-container: '#2563eb'
  on-tertiary-container: '#eeefff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000d'
  secondary-fixed: '#ffe24a'
  secondary-fixed-dim: '#e3c600'
  on-secondary-fixed: '#211b00'
  on-secondary-fixed-variant: '#524600'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
  surface-soft: '#FFF8F2'
  success: '#10B981'
  warning: '#F59E0B'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding-mobile: 20px
  container-padding-desktop: 40px
  stack-gap-sm: 12px
  stack-gap-md: 24px
  stack-gap-lg: 48px
---

## Brand & Style

The design system is built to transform a legacy educational resource into a vibrant, modern language-learning platform. The brand personality is **encouraging, energetic, and professional**, moving away from a dated aesthetic toward a clean, high-contrast interface that prioritizes focus and accessibility.

The design style follows a **Modern Corporate** approach with **High-Contrast** accents. It utilizes generous whitespace to reduce cognitive load during study sessions, while leveraging the high-energy yellow and red to highlight progress and critical actions. The interface feels "bouncy" and approachable through the use of significant roundedness and tactile feedback, ensuring the learning experience feels less like a chore and more like a rewarding daily habit.

## Colors

The palette is anchored by the heritage colors of the original brand but refined for digital legibility. 

- **Primary (Red):** Used strategically for brand recognition, primary call-to-actions, and error states.
- **Secondary (Yellow):** Reserved for progress indicators, gamification elements (stars/streaks), and decorative accents that need high visibility without the urgency of red.
- **Tertiary (Blue):** Introduced for secondary interactions and informational links to provide a cooling contrast to the warm primary palette.
- **Neutral (Slate):** A deep, professional slate used for typography and iconography to ensure high readability.
- **Surface Soft:** A warm-tinted off-white used as the main background color to reduce eye strain compared to pure white while maintaining a clean, open feel.

## Typography

**Plus Jakarta Sans** is the exclusive typeface for this design system. It was selected for its friendly, modern geometry and excellent legibility in educational contexts.

- **Display & Headlines:** Utilize tighter letter-spacing and heavier weights (700-800) to create a clear visual anchor on the page.
- **Body Text:** Standardized at 16px (md) and 18px (lg) to ensure accessibility for learners of all ages.
- **Labels:** Used for micro-copy and metadata, employing medium to semi-bold weights to maintain clarity at smaller scales.
- **Hierarchy:** Use the Red primary color sparingly in headlines to draw attention to lesson titles, while keeping the majority of body text in the Slate neutral color.

## Layout & Spacing

This design system uses a **fluid layout model** with a strong emphasis on vertical rhythm. 

- **Mobile:** A single-column layout with 20px side margins. Content cards should span the full width minus margins.
- **Tablet/Desktop:** Content is centered within a maximum width container (1200px), transitioning to a multi-column grid (up to 12 columns) for dashboard views.
- **Rhythm:** All spacing is derived from a base-8 unit. Use `stack-gap-md` (24px) for most section spacing to maintain the "generous whitespace" brand pillar.
- **Negative Space:** Use white space to group related learning concepts, avoiding the use of heavy dividers where layout positioning can suffice.

## Elevation & Depth

To maintain a modern and clean feel, this design system avoids heavy shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Background):** `surface-soft` (#FFF8F2).
- **Level 1 (Cards/Containers):** Pure white (#FFFFFF) with a subtle 1px border (#E2E8F0) and no shadow.
- **Level 2 (Interactive/Floating):** Pure white with a soft, highly diffused ambient shadow (0px 10px 25px rgba(30, 41, 59, 0.05)).
- **Active States:** When a user selects a multiple-choice answer or interacts with a card, use a 2px solid border of the `tertiary-color` (Blue) to indicate focus, rather than increasing shadow depth.

## Shapes

The shape language is defined by **Rounded** geometry to evoke a friendly and safe learning environment. 

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Content blocks and lesson cards use `rounded-lg` (1rem / 16px).
- **Promotional/Progress:** Progress bars and "Success" modals should use `rounded-xl` (1.5rem / 24px) or full pill-shaping to feel more organic and playful.

## Components

- **Buttons:** Primary buttons use a solid Red background with White text. Secondary buttons use a White background with a Blue border and Blue text. Interactive "Option" buttons (for quizzes) should have a slight 2px bottom "thick border" to feel tactile.
- **Chips:** Used for difficulty levels (Easy, Medium, Hard). Use the Blue tertiary color at 10% opacity for the background and 100% for the text.
- **Input Fields:** Large, 16px text height with a 1px Slate border that turns Blue on focus. Labels should always be visible above the field.
- **Progress Bars:** Use a thick (12px height) bar with the Yellow secondary color for the fill and a light gray for the track.
- **Cards:** White background, 16px padding, and 16px corner radius. Use for lesson previews, vocabulary lists, and quiz results.
- **Gamification Icons:** Use a consistent 2px stroke width for icons, matching the Neutral Slate color for clarity.