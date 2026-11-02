---
name: BatchGuard Intelligence
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#404941'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#717970'
  outline-variant: '#c0c9be'
  surface-tint: '#2e6a41'
  primary: '#003b1b'
  on-primary: '#ffffff'
  primary-container: '#14532d'
  on-primary-container: '#87c695'
  inverse-primary: '#96d5a3'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#003553'
  on-tertiary: '#ffffff'
  tertiary-container: '#004c75'
  on-tertiary-container: '#6cbeff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b1f2be'
  primary-fixed-dim: '#96d5a3'
  on-primary-fixed: '#00210d'
  on-primary-fixed-variant: '#12512c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
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
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  data-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies institutional authority, clinical precision, and calm situational control under crisis. It serves quality assurance executives, food safety compliance officers, and supply chain directors managing complex batch genealogies and time-critical recall situations. 

The aesthetic is Modern Corporate with High-Precision Data Ergonomics:
- **Tone:** Authoritative, vigilant, transparent, and structurally disciplined.
- **Visual Stance:** Clean, hyper-organized data density balanced by generous structural whitespace. It abandons flashy decorative trends in favor of structural clarity, high-contrast legibility, and unmistakable state signaling.
- **Functional Integrity:** High signal-to-noise ratio. Complex lineage trees, GS1 batch tracking, and simulated mock recalls demand instantaneous comprehension without cognitive friction.

## Colors

The palette establishes biological and agricultural authenticity reinforced by enterprise stability.

### Primary & Brand Identity
- **Primary Base (`#14532D`):** Deep Forest Green delivers grounding, high-contrast presence for primary CTA controls, top-level navigation, and active operational states.
- **Primary Hover / Active (`#166534`):** Slightly lifted green for micro-interactions and interactive focus states.
- **Accent / Emerald (`#10B981`):** Precision accent for verified batch hashes, timeline progress bars, and positive lineage confirmations.

### Surface & Frame Foundations
- **Canvas / Root Background (`#F8FAFC`):** A soft, low-glare slate neutral reducing optical fatigue during long operational shifts.
- **Surface / Card / Table (`#FFFFFF`):** Crisp pure white containers establishing distinct separation against the canvas.
- **Subtle Structural Border (`#E2E8F0`):** Single-pixel perimeter frames that structure dense multi-tier data grids.

### Typography & Content
- **Text Primary (`#0F172A`):** Deep slate-900 ensuring strict WCAG AAA contrast for batch IDs, timestamps, and metric readouts.
- **Text Secondary (`#64748B`):** Neutral slate-500 for auxiliary labels, table headers, breadcrumb links, and meta properties.
- **Text Muted (`#94A3B8`):** Restrained gray for placeholder tokens and inactive states.

### State & Regulatory Triage
- **Critical / Recall Alert (`#DC2626` base, `#FEE2E2` fill):** High-priority operational interrupts, lot quarantines, and FDA/FSIS mock recall flags.
- **Warning / Review Required (`#F59E0B` base, `#FEF3C7` fill):** Temperature excursions, pending certificate verification, and transit delays.
- **Success / Compliant (`#059669` base, `#D1FAE5` fill):** Verified chain-of-custody, passed sensory audits, and closed investigations.
- **Info / In Transit (`#0284C7` base, `#E0F2FE` fill):** Carrier telemetry, cold chain logs, and informational breadcrumbs.

## Typography

Typography prioritizes tabular numerical legibility and structural hierarchy. 

- **Primary Typeface (`Inter`):** Applied across all interface headings, table contents, and analytical labels. Tight negative tracking is enforced at display and headline scales to maintain typographic tension. Open typographic apertures maximize readability on data-heavy dashboards.
- **Monospaced Utility Typeface (`JetBrains Mono`):** Applied exclusively to serial numbers, GS1 GTINs, cryptographic batch transaction hashes, SKU strings, and timestamp logs.
- **Numbers:** OpenType feature `tnum` (tabular figures) is enabled globally across all table structures and KPI widgets to prevent layout shift during live sensor updates.

## Layout & Spacing

The layout is built upon an 8pt architectural rhythm, optimized for complex data-dense screens without creating visual clutter.

### Grid & Structure
- **Desktop (1280px+):** Fluid 12-column layout with a fixed 280px operational side rail. Gutters are fixed at `1.5rem` (24px) with outer canvas margins of `2rem` (32px).
- **Tablet (768px - 1279px):** Responsive 8-column layout. Sidebar collapses to a 64px icon rail. Gutters contract to `1rem` (16px), margins to `1.5rem` (24px).
- **Mobile (< 768px):** Single-column stack. Modals render as full-screen sliding drawers. Outer margin contracts to `1rem` (16px).

### Internal Rhythm
- Component paddings strictly use the defined spatial scale (`space-xs` through `space-xl`).
- KPI metric widgets enforce `space-lg` (24px) internal clearance.
- Table cell padding enforces `space-md` horizontally (16px) and `space-sm` vertically (10px - 12px) to maximize visible rows above the viewport fold.

## Elevation & Depth

Visual hierarchy uses crisp boundaries over deep shadows. Elevation establishes clear functional layering: base canvas, resting interactive cards, elevated control overlays, and critical modal sheets.

- **Level 0 (Flat / Canvas):** Surface color `#F8FAFC`, zero shadow. Host layer for dashboards, backgrounds, and static timelines.
- **Level 1 (Card & Module Resting):** Surface `#FFFFFF`, border `1px solid #E2E8F0`, shadow `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`. Used for KPI modules, data tables, and timeline nodes.
- **Level 2 (Hover & Filter Dropdowns):** Surface `#FFFFFF`, border `1px solid #CBD5E1`, shadow `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`. Used for action menus, active filter popovers, and interactive card states.
- **Level 3 (Modals & Command Drawers):** Surface `#FFFFFF`, border `1px solid #E2E8F0`, shadow `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`. Paired with a backdrop dim of `rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(2px)` to maintain environmental awareness during mock recalls.

## Shapes

The design system adopts a controlled **Soft (`1`)** geometry. Crisp corners communicate engineering rigor and optimize viewport real estate for dense data displays.

- **Inputs, Buttons, and Table Containers:** `0.25rem` (4px) to `0.375rem` (6px). Ensures crisp, distinct grid alignments.
- **Metric Cards, Dialogs, and Panels:** `0.5rem` (8px, `rounded-lg`). Provides subtle softening at module boundaries without appearing casual.
- **Status Badges, Traceability Nodes, and Pill Filters:** Fully rounded (`rounded-full` / 9999px) to visually distinguish metadata chips and state indicators from rectangular content boxes.

## Components

### Buttons
- **Primary:** Background `#14532D`, foreground `#FFFFFF`, height `38px`, horizontal padding `16px`, font `Inter` 500, radius `6px`. Hover: `#166534`. Active: `#14532D`. Focus: `2px` ring `#10B981` with `2px` offset.
- **Critical Action (Recall Initiation):** Background `#DC2626`, foreground `#FFFFFF`. Hover: `#B91C1C`.
- **Secondary / Outline:** Background `#FFFFFF`, border `1px solid #E2E8F0`, text `#0F172A`. Hover: `#F8FAFC`, border `#CBD5E1`.
- **Ghost:** Zero border, background transparent, text `#64748B`. Hover: `#F1F5F9`, text `#0F172A`.

### Status Badges & Chips
- **Container:** Height `24px`, padding `2px 10px`, radius `9999px` (pill), font `Inter` 11px, weight 600, uppercase with `0.04em` tracking.
- **Recall / Quarantine:** Background `#FEE2E2`, border `1px solid #FECACA`, text `#991B1B`. Features a pulsating `6px` circular dot (`#DC2626`).
- **Compliant / Certified:** Background `#D1FAE5`, border `1px solid #A7F3D0`, text `#065F46`. Solid static `6px` dot (`#059669`).
- **Hold / Under Review:** Background `#FEF3C7`, border `1px solid #FDE68A`, text `#92400E`. Solid `6px` dot (`#D97706`).

### Tables & Data Grids
- **Header:** Sticky top `0`, background `#F8FAFC`, border-bottom `1px solid #E2E8F0`. Typography: `Inter` 11px, weight 600, uppercase tracking `0.05em`, color `#64748B`.
- **Rows:** Resting `#FFFFFF`, height `48px`. Hover: `#F8FAFC` (subtle zebra highlight). Border bottom `1px solid #F1F5F9`.
- **Data Cells:** Monospace values (`JetBrains Mono`) for identifiers, batch IDs, and GTIN-14 strings. Trailing action buttons remain hidden until row hover.

### Metric KPI Cards
- **Structure:** Surface `#FFFFFF`, border `1px solid #E2E8F0`, padding `20px`, radius `8px`.
- **Content Flow:** Upper label (`Inter` 12px, 500, `#64748B`), large numeric tally (`Inter` 28px, 700, `#0F172A`), paired with a trend delta pill.
- **Delta Indicator:** Green text `#059669` with upward vector for positive yield; red text `#DC2626` for unresolved quality flags.

### Input Fields & Controls
- **Text Inputs:** Height `38px`, background `#FFFFFF`, border `1px solid #CBD5E1`, text `#0F172A`, placeholder `#94A3B8`, radius `6px`. Focus: border `#14532D`, ring `1px solid #14532D`.
- **Checkboxes & Radios:** Square `16px` with `4px` radius for checkboxes; circular `16px` for radios. Unchecked: border `1.5px solid #CBD5E1`. Checked: fill `#14532D`, checkmark `#FFFFFF`.

### Supply Chain Timeline & Lineage Nodes
- **Path Track:** `2px` vertical/horizontal connecting rule `#E2E8F0`. Completed trace segments fill with `#10B981`.
- **Node Dot:** Outer container `24px` circular badge with centered icon or `8px` solid core. Active inspection point highlights with an outer halo: `0 0 0 4px #D1FAE5`.

### Modal Dialogs (Recall Operations)
- **Header:** Explicit classification tag (e.g., "FDA Class I Mock Recall"), primary title `Inter` 18px 600, and close button.
- **Destructive Footer Bar:** High-contrast confirmation area, requiring manual confirmation input (e.g., typing "CONFIRM-RECALL-LOT-882") to unlock the primary action button.