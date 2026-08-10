---
name: Industrial Authority
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#444748'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#745b00'
  on-secondary: '#ffffff'
  secondary-container: '#fdd977'
  on-secondary-container: '#775e00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001e30'
  on-tertiary-container: '#5889af'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffe08c'
  secondary-fixed-dim: '#e5c363'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#584400'
  tertiary-fixed: '#cbe6ff'
  tertiary-fixed-dim: '#9bccf6'
  on-tertiary-fixed: '#001e30'
  on-tertiary-fixed-variant: '#0e4b6e'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
  surface-card: '#FFFFFF'
  border-subtle: '#E8E8E8'
  status-draft: '#888888'
  status-pending: '#F59E0B'
  status-production: '#F97316'
  status-material: '#0891B2'
  status-success: '#2D7D46'
  status-financial: '#14532D'
  status-error: '#C0392B'
  status-invoice: '#7C3AED'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
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
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  status-pill:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar-width: 260px
  container-max: 1440px
---

## Brand & Style

This design system is engineered for the high-stakes environment of factory management. It embodies a **Professional, Utilitarian, and Authoritative** personality, designed to evoke trust and clarity amidst complex operational data. The aesthetic balances a premium manufacturing heritage with modern digital efficiency.

The design style is **Corporate / Modern** with a lean toward **Minimalism**. It prioritizes high information density without sacrificing legibility. By utilizing a soft, off-white background and deep charcoal surfaces, the interface reduces eye strain for long-shift operators while allowing functional status colors to vibrate with maximum intent. The presence of gold accents elevates the brand, signaling quality and precision engineering.

## Colors

The palette is bifurcated into **Structural Colors** and **Operational Status Colors**. 

- **Structural Colors**: The background uses a warm off-white (`#F7F6F2`) to differentiate from standard consumer SaaS. The primary dark (`#1A1A1A`) is used for the sidebar and high-level navigation to provide a strong visual anchor.
- **Operational Colors**: Status colors are strictly mapped to the manufacturing lifecycle. These must be used consistently across tables, badges, and progress indicators to ensure users can "scan" factory health instantly.
- **Contrast**: Text must always maintain a minimum 4.5:1 contrast ratio against background surfaces. Gold (`#C8A84B`) is reserved for primary actions and brand-heavy elements like logo marks or active focus states.

## Typography

This design system uses **Inter** exclusively to ensure maximum legibility and a neutral, systematic tone. 

- **Readability**: The minimum font size is set to **14px** for body text to accommodate diverse lighting conditions on factory floors.
- **Functional Labels**: Form labels and data headers use a semi-bold weight (`600`) to clearly distinguish between data and descriptors.
- **Status Badges**: Text within status badges is set to **12px Bold** with a slight letter spacing and uppercase transform to maximize visibility at small scales.
- **Scale**: Headlines scale down for mobile devices; `headline-lg` should shift to `24px` on screen widths below 768px.

## Layout & Spacing

The layout utilizes a **Fixed-Fluid Hybrid Grid**. 

- **Sidebar**: A fixed-width sidebar (260px) persists on desktop, providing high-level navigation.
- **Main Content**: A fluid container that expands to a maximum of 1440px, ensuring data tables don't become excessively wide and difficult to read.
- **Data Tables**: Tables must support horizontal scrolling on smaller viewports. Sticky headers and sticky first columns (IDs) are required for contextual integrity during horizontal movement.
- **Grid System**: Use a 12-column grid for desktop forms, with labels always positioned above the input field to maintain a vertical rhythm and accessibility.
- **Mobile**: On mobile viewports (<768px), the sidebar transitions to a bottom tab navigation for thumb-friendly interaction.

## Elevation & Depth

This design system employs a **Low-Contrast Outline** strategy to define hierarchy, avoiding heavy shadows that can clutter data-dense interfaces.

- **Level 0**: The main application background (`#F7F6F2`).
- **Level 1**: Cards and containers (`#FFFFFF`). These are defined by a 1px solid border in `#E8E8E8`.
- **Level 2**: Hover states and active dropdowns. Use a very soft, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)) to suggest temporary elevation.
- **Tonal Layering**: The sidebar is Level -1, using the darkest tone (`#1A1A1A`) to recede visually while providing a strong frame for the workspace.

## Shapes

The shape language is **Soft (0.25rem)**, reflecting an industrial aesthetic that is precise but not sharp.

- **Components**: Buttons, input fields, and cards use the base `rounded` (4px) setting.
- **Badges**: Status pills use `rounded-xl` (12px) to create a distinct "pill" shape that contrasts with the rectangular nature of the data grid.
- **Icons**: Icons should follow a consistent 2px stroke weight with slightly rounded terminals to match the component radius.

## Components

### Sidebar Navigation
- **Default**: White text at 80% opacity on `#1A1A1A`.
- **Active State**: Background highlight in `#C8A84B` (Gold) with 100% white text and a 4px left-accent border.

### Data Tables
- **Rows**: Alternating subtle zebra striping is permitted for extremely wide tables.
- **Badges**: Use the specified hex codes from the Color section. Labels should be centered, and the badge background should use a 10-15% opacity version of the status color with a 100% opacity text color for readability.

### Form Fields
- **Label**: Inter Semi-bold, 13px, positioned 4px above the input.
- **Input**: 1px border (`#E8E8E8`), 40px height, 12px horizontal padding.
- **Focus State**: 1px solid border in `#C8A84B`.

### Status & Priority Badges
- **Priority**: 
    - **CRITICAL**: White text on `#C0392B`.
    - **HIGH**: Black text on `#F59E0B`.
- **Workflow Status**: Use the full color palette mapped to the 18 specific lifecycle states (Draft through Financially Closed).

### Buttons
- **Primary**: Solid Gold (`#C8A84B`) with White text.
- **Secondary**: Outlined Dark (`#1A1A1A`) with 1px border.
- **Ghost**: No border, Dark text, used for secondary actions in tables.