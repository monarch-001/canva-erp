---
name: Industrial Authority
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45474c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777c'
  outline-variant: '#c6c6cc'
  surface-tint: '#585e6c'
  primary: '#030813'
  on-primary: '#ffffff'
  primary-container: '#1a202c'
  on-primary-container: '#828796'
  inverse-primary: '#c1c6d7'
  secondary: '#545f72'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f7'
  on-secondary-container: '#586377'
  tertiary: '#0e0700'
  on-tertiary: '#ffffff'
  tertiary-container: '#291e0d'
  on-tertiary-container: '#96856d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde2f3'
  primary-fixed-dim: '#c1c6d7'
  on-primary-fixed: '#161c27'
  on-primary-fixed-variant: '#414754'
  secondary-fixed: '#d8e3fa'
  secondary-fixed-dim: '#bcc7dd'
  on-secondary-fixed: '#111c2c'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#f5dfc4'
  tertiary-fixed-dim: '#d8c3a9'
  on-tertiary-fixed: '#241a09'
  on-tertiary-fixed-variant: '#524531'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  status-success: '#10B981'
  status-warning: '#F59E0B'
  status-danger: '#EF4444'
  data-border: '#E2E8F0'
  trend-up-pos: '#059669'
  trend-up-neg: '#DC2626'
typography:
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  kpi-value:
    fontFamily: IBM Plex Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
  body-fixed:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  table-cell:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-caps:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  status-tag:
    fontFamily: IBM Plex Sans
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 12px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-page: 24px
  table-row-height: 32px
  filter-bar-height: 56px
---

## Brand & Style
The design system is a high-density, utilitarian framework engineered for Industrial MIS environments. It prioritizes **Actionable Intelligence** and **Technical Transparency**, catering to a user base that requires rapid identification of financial variances and operational anomalies.

The visual direction is **Corporate / Modern** with a focus on **Precision-Engineering**. It avoids decorative elements in favor of a rigid structural hierarchy. The aesthetic is "exception-based," meaning the UI remains intentionally quiet and neutral until a data point requires intervention, at which point high-contrast semantic signals are deployed.

- **Authority:** Uses structured grids and heavy-weight typography to convey reliability.
- **Precision:** Employs hairline borders and monospaced numerical data to ensure zero ambiguity.
- **Efficiency:** Maximizes information density, allowing users to view complex P&L statements without excessive scrolling.

## Colors
The palette is rooted in a "Quiet Neutral" philosophy. The background and structural elements use a range of cool grays to reduce eye strain during long-form data analysis. 

### Semantic Logic
- **Primary/Secondary:** Reserved for structural navigation and headers to maintain a professional, grounded feel.
- **Status Colors:** Applied strictly to performance indicators. `status-success` (Green) for margins >25%, `status-warning` (Amber) for caution (15-25%), and `status-danger` (Red) for critical issues (<15%).
- **Trend Indicators:** Directional arrows use color based on *impact* rather than movement. An upward trend in "Waste" is Red, while an upward trend in "Margin" is Green.
- **Readability:** All text-on-background combinations must meet a minimum 4.5:1 contrast ratio to ensure accessibility in factory-floor lighting conditions.

## Typography
The system utilizes a dual-font approach to separate narrative content from raw data. 

- **IBM Plex Sans** is the primary typeface, chosen for its industrial, systematic terminals. It is used for all headers, labels, and UI controls.
- **JetBrains Mono** is used for all numerical data, tables, and P&L line items. The monospaced nature ensures that columns of figures align perfectly, allowing the eye to scan vertical variances without distraction.

**Scale and Hierarchy:**
- **KPI Values:** Large, semi-bold sans-serif for immediate impact.
- **Data Tables:** Small-scale monospaced type to maximize row density.
- **Status Tags:** All-caps bold weight to ensure visibility even at small sizes.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy to ensure data consistency across different workstation resolutions.

- **The Filter Bar:** A persistent 56px horizontal container at the top of the viewport provides global context (Date, Factory, Client).
- **Standard Layout:** Uses a 12-column grid. Financial tables typically span 8-12 columns, while "Insight Panels" (root cause analysis) occupy a 4-column side-rail.
- **High Density:** A strict 4px baseline grid is used. Table row heights are capped at 32px to allow for maximum data visibility without vertical scrolling.
- **Breakpoints:** 
  - **Desktop (1440px+):** Full 12-column view with persistent Side Panel.
  - **Tablet (1024px):** Side Panel converts to a drawer.
  - **Mobile:** Not recommended for this system; restricted to high-level KPI cards only.

## Elevation & Depth
This system uses **Low-contrast Outlines** and **Tonal Layers** rather than shadows. This "Flat-Plus" approach maintains the industrial feel and prevents the UI from feeling cluttered when displaying hundreds of data cells.

- **Surface Tiers:**
  - **Level 0 (Base):** Slate-50 background.
  - **Level 1 (Cards/Tables):** Pure white surface with a 1px `data-border` outline.
  - **Level 2 (Drill-downs):** Slight elevation change signaled by a 2px border accent rather than a shadow.
- **Dividers:** Hairline (1px) dividers are used between table rows. Section breaks (e.g., between "Direct Costs" and "Gross Margin") use a 2px solid dark line for structural emphasis.

## Shapes
Shapes are **Soft (0.25rem)** to provide a modern touch while maintaining a disciplined, "boxed" industrial character.

- **Input Fields & Buttons:** 4px radius.
- **Status Tags:** Pill-shaped (fully rounded) to differentiate them from interactive buttons.
- **Data Containers:** 4px radius with 1px border. 
- **Icons:** Use square-capped strokes to match the systematic nature of the typography.

## Components
Consistent component behavior is critical for an MIS that handles complex financial logic.

- **Data Tables:** Headers must be sticky. Rows should feature a hover state using a subtle tint of the primary color (2% opacity). Negative numbers in financial columns must be colored red and enclosed in parentheses `(120.00)`.
- **Status Tags:** Use a "Light Background / Dark Text" pattern for warnings (Amber) and a "Dark Background / White Text" pattern for critical alerts (Red) to ensure high visibility.
- **Trend Sparklines:** Integrated directly into table cells. They should be simplified line paths (no axes) with a height of 16px, colored according to the trend logic (Green for improvement, Red for worsening).
- **Insight Panels:** Boxed containers with a slightly darker background (`#F1F5F9`) used to provide textual context to data variances.
- **Filter Bar Inputs:** Use a condensed style with labels placed above the input field to save horizontal space.
- **Variance Indicators:** Must show both the absolute value and the percentage variance (e.g., `+15,000 (12%)`).