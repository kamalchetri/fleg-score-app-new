---
name: Electric Dark Score
colors:
  surface: '#121317'
  surface-dim: '#121317'
  surface-bright: '#38393d'
  surface-container-lowest: '#0d0e12'
  surface-container-low: '#1a1b20'
  surface-container: '#1f1f24'
  surface-container-high: '#292a2e'
  surface-container-highest: '#343439'
  on-surface: '#e3e2e7'
  on-surface-variant: '#c6c9ac'
  inverse-surface: '#e3e2e7'
  inverse-on-surface: '#2f3035'
  outline: '#8f9379'
  outline-variant: '#454933'
  surface-tint: '#b4d400'
  primary: '#ffffff'
  on-primary: '#2b3400'
  primary-container: '#cef201'
  on-primary-container: '#5a6b00'
  inverse-primary: '#556500'
  secondary: '#c4c6d1'
  on-secondary: '#2d3039'
  secondary-container: '#464952'
  on-secondary-container: '#b6b8c3'
  tertiary: '#ffffff'
  on-tertiary: '#003912'
  tertiary-container: '#6aff86'
  on-tertiary-container: '#00752d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cef201'
  primary-fixed-dim: '#b4d400'
  on-primary-fixed: '#181e00'
  on-primary-fixed-variant: '#3f4c00'
  secondary-fixed: '#e0e2ed'
  secondary-fixed-dim: '#c4c6d1'
  on-secondary-fixed: '#181b23'
  on-secondary-fixed-variant: '#44474f'
  tertiary-fixed: '#6aff86'
  tertiary-fixed-dim: '#00e55f'
  on-tertiary-fixed: '#002107'
  on-tertiary-fixed-variant: '#00531d'
  background: '#121317'
  on-background: '#e3e2e7'
  surface-variant: '#343439'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: '800'
    lineHeight: 3.5rem
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.375rem
    fontWeight: '700'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
  score-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '800'
    lineHeight: 2.25rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '500'
    lineHeight: 1.5rem
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1.125rem
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 0.875rem
    letterSpacing: 0.08em
  label-pill:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '700'
    lineHeight: 1rem
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1.25rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system delivers a high-octane, premium sports companion experience. Engineered for passionate fans, fantasy managers, and sports bettors who expect lightning-fast match updates and intuitive stats at a glance.

The visual direction merges **High-Contrast Dark Mode** with **Modern Tactile Fluidity**. Deep obsidian surfaces create zero visual fatigue, punctuated by electric chartreuse-neon signals that instantly communicate dynamic match events, live status, and active selection states. The atmosphere feels like an immersive night match under the floodlights: energetic, focused, ultra-responsive, and modern. 

Key attributes:
- **Kinetic Energy:** Vibrant chartreuse focal points draw attention directly to pivotal moments (ongoing matches, key match days, live clocks).
- **Smooth Sculpted Surfaces:** Deeply rounded organic containers (`rounded-3xl` and `rounded-2xl`) with soft pill badges feel comfortable under hand.
- **Editorial Legibility:** Punchy headings paired with razor-sharp tabular numbers ensure instant score comprehension in split-second views.

## Colors

The palette relies on absolute contrast between an inky, warm-toned charcoal background and an electric neon chartreuse highlight.

- **Primary (`#CEF202`):** Electric Neon Lime. Used for high-priority live hero cards, active calendar pills, live indicators, and primary action controls. When placed on `#CEF202`, foreground text and iconography switch to pitch black (`#0B0C10`) for optimal contrast and punchiness.
- **Secondary (`#1F222A`):** Warm Dark Slate. Serves as the primary surface container for upcoming match fixtures, inactive date pills, and secondary controls.
- **Tertiary (`#10E862`):** Hyper Green. Used for live video feeds, live pulse pips, and positive handicap/odds shifts.
- **Neutral (`#0D0E12`):** Pitch Canvas Black. Anchors the application as the base canvas, keeping light pollution low and battery performance high on OLED mobile displays.

### Surface Tiers
- **Canvas Base:** `#0D0E12`
- **Surface Elevation 1 (Cards, Search Bars):** `#16181F`
- **Surface Elevation 2 (Pills, Secondary Cards):** `#1F222A`
- **Surface Elevation 3 (Floating Controls, Nav Icons):** `#2A2D37`
- **Text Primary:** `#FFFFFF`
- **Text Secondary:** `#8E929E`
- **Text Muted:** `#545763`
- **Alert / Live Red:** `#FF334B`

## Typography

The design system uses **Plus Jakarta Sans** uniformly across display, body, and label roles. Its geometric construction, humanized terminals, and clear numerals guarantee exceptional clarity for real-time scores, team abbreviations, and match timing.

- **Hero & Section Headers:** Prominent, tight letter-spacing (`-0.02em` to `-0.03em`) creates a bold, editorial feel. Use italics sparingly on key verbs (e.g. *Favorite game*) to echo speed and agility.
- **Score Readouts:** Numerical data adopts `score-display` (bold, compact, monospace numeral alignment where available) for instantaneous reading without jitter during score changes.
- **Labels & Micro-data:** Micro badges, match period markers (`1ST HALF 58'`), and odds data leverage `label-caps` and `label-pill` for crisp hierarchy inside small surfaces.

## Layout & Spacing

The layout is built on a responsive mobile-first grid system designed to support single-hand thumb navigation on small screens and card columns on larger surfaces.

- **Mobile (<768px):** Single-column vertical stream. Screen margin is strictly `1.25rem` (`20px`) to maximize surface space while preserving safe edge margins. Outer gap between match cards is `space-md` (`1rem`).
- **Tablet (768px - 1024px):** 2-column masonry or equal-height grid for cards. Margin widens to `margin-tablet` (`2rem`) with `1.5rem` gutters.
- **Desktop (>1024px):** 3-column structured dashboard layout with pinned calendar and league filters on the left, live score feed in center, and match analytics/video player pinned on the right. Maximum viewport constraint is `1280px`.

Interior card padding follows a strict hierarchy:
- High-priority Hero Cards: `space-lg` (`1.5rem`)
- Standard Fixture Cards: `space-md` (`1rem`)
- Date & Filter Strips: `space-xs` (`0.5rem`) inline gaps

## Elevation & Depth

Visual hierarchy is constructed entirely through **Tonal Layering** and **Controlled Neon Glare**, eschewing heavy drop shadows that muddy dark themes.

- **Layer 0 (Canvas):** Pure `#0D0E12`.
- **Layer 1 (Recessed/Input Wells):** `#121319` with a subtle inner border (`rgba(255, 255, 255, 0.05)`).
- **Layer 2 (Primary Floating Cards):** `#16181F` to `#1F222A` surfaces. Edge separation is achieved with an ultra-thin perimeter stroke: `1px solid rgba(255, 255, 255, 0.07)`.
- **Layer 3 (Hero Highlight Cards):** Solid `#CEF202`. Casting an optional subtle ambient luminescence (`0px 12px 32px rgba(206, 242, 2, 0.15)`) to signal live status.
- **Floating Overlays & Controls:** Top and bottom bar buttons (such as live stream back buttons, search pills) utilize translucent dark glass (`rgba(31, 34, 42, 0.85)` with `backdrop-filter: blur(16px)`).

## Shapes

The system implements high roundedness (`level 3`), producing organic, aerodynamic silhouettes inspired by automotive and high-tech athletic gear.

- **Cards & Hero Panels:** `rounded-3xl` (`1.5rem` to `2rem`) softens the edges of big score cards, creating a friendly and modern profile.
- **Interactive Badges & Pills:** Full pill radius (`9999px`) for date pickers, sport categories, live tag badges, and odds buttons.
- **Icon Actions & Team Badges:** Circular `rounded-full` (`50%`) frames for sport equipment icons, user avatars, club emblems, and icon buttons.

## Components

### Hero Match Card (Active / Live)
- **Background:** High-contrast `#CEF202` (Electric Chartreuse).
- **Foreground:** Pitch black typography (`#0B0C10`).
- **Header:** Competition title (`label-caps`) accompanied by an inverted pill badge (`#0B0C10` background, `#CEF202` bold text reading "Ongoing" or "Live").
- **Content:** Team emblems (`48x48px` circular containers), large central score display, match day and running match timer.
- **Border Radius:** `rounded-3xl` (`2rem`).

### Standard Match Card (Upcoming / Finished)
- **Background:** Dark slate `#181A20` with a subtle 1px rim border of `rgba(255, 255, 255, 0.06)`.
- **Foreground:** Crisp white team titles, `#8E929E` period details, and `#FF334B` live dots when in progress.
- **Footer Strip:** Social context / bet count avatars with pill counter (`#CEF202` accent) and microcopy.

### Sport Category & Date Selector Pills
- **Inactive State:** Deep grey background (`#1F222A`), muted white/grey text (`#8E929E`), circular icon cutout.
- **Active State:** Solid `#CEF202` fill, deep black text (`#0B0C10`), bold weight.
- **Date Pill Geometry:** Vertical stacked pill (`width: 48px`, `height: 72px`), showing weekday abbreviated top, date number in bottom circular highlight.

### Buttons & Quick Actions
- **Primary Button:** Full pill, `#CEF202` solid fill, black text (`label-pill`), no border.
- **Icon Action Buttons (Back, Search, Filter):** Circular `44x44px` surfaces in `#1F222A` with centered `20px` monochrome icons.
- **Live Stream Overlay Pill:** Vibrant green or red indicator (`#10E862` or `#FF334B`) with a flashing bullet and text label.

### Inputs & Search Bars
- **Background:** `#16181F` pill shape (`h-12`).
- **Icons:** Leading search glass in `#8E929E`, trailing filter trigger button.
- **Typography:** `#FFFFFF` input value with `#545763` placeholder. No high-contrast borders; uses `1px solid rgba(255, 255, 255, 0.05)`.

### Odds & Bet Selector Chips
- **Geometry:** Horizontal pill layout inside video or score cards.
- **Style:** Neutral dark chips displaying spread/totals (`-5.9`, `o12.5`), with active selected odds illuminated in solid `#CEF202` with black text.