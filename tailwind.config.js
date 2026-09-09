/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "border-subtle": "#E6E1D6",
        "border-strong": "#D3CCBC",
        "surface-card": "#FFFFFF",
        "surface": "#FFFFFF",
        "surface-alt": "#FBFAF7",
        "background": "#F7F5F1",
        "primary": "#1F2E27", // Deep Forest Green Brand Ink
        "primary-light": "#2C4237",
        "secondary": "#B8892B", // Gold Accent
        "accent-gold": "#B8892B",
        "gold-light": "#F3E7CD",
        "ink-900": "#171512",
        "ink-700": "#4A443B",
        "ink-500": "#7A7266",
        "ink-300": "#A79E8E",
        "on-surface": "#171512",
        "on-surface-variant": "#4A443B",
        "on-primary": "#FFFFFF",
        
        // Status Colours (Figma 18 States)
        "status-draft": "#64748B",
        "status-pending-review": "#2563EB",
        "status-supervisor-approved": "#4F46E5",
        "status-approved-pending-bom": "#7C3AED",
        "status-bom-approved": "#0891B2",
        "status-partial-material": "#D97706",
        "status-material-ready": "#0D9488",
        "status-in-production": "#EA580C",
        "status-production-complete": "#65A30D",
        "status-qc-pending": "#CA8A04",
        "status-qc-passed": "#16A34A",
        "status-ready-for-dispatch": "#0284C7",
        "status-in-transit": "#2563EB",
        "status-delivered-pending-confirmation": "#0D9488",
        "status-delivered-confirmed": "#16A34A",
        "status-invoice-raised": "#9333EA",
        "status-financially-closed": "#059669",
        "status-cancelled": "#DC2626",
        "status-success": "#16A34A",
        "status-error": "#DC2626"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "xl": "32px",
        "base": "4px",
        "xs": "4px",
        "sm": "8px",
        "container-max": "1440px",
        "md": "16px",
        "lg": "24px",
        "sidebar-width": "220px"
      }
    },
  },
  plugins: [],
}


