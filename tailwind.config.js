/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "border-subtle": "#E8E8E8",
        "surface-card": "#FFFFFF",
        "surface": "#faf9f5",
        "tertiary-fixed-dim": "#9bccf6",
        "surface-container-high": "#e9e8e4",
        "status-success": "#2D7D46",
        "on-tertiary": "#ffffff",
        "on-tertiary-fixed": "#001e30",
        "surface-container-lowest": "#ffffff",
        "surface-container-highest": "#e3e2df",
        "status-invoice": "#7C3AED",
        "background": "#faf9f5",
        "status-financial": "#14532D",
        "outline": "#747878",
        "on-secondary-fixed": "#241a00",
        "surface-container": "#efeeea",
        "status-production": "#F97316",
        "on-error-container": "#93000a",
        "status-draft": "#888888",
        "on-surface-variant": "#444748",
        "on-tertiary-container": "#5889af",
        "status-error": "#C0392B",
        "on-surface": "#1b1c1a",
        "primary": "#000000",
        "secondary": "#745b00",
        "accent-gold": "#C8A84B",
        "surface-dim": "#dbdad6",
        "on-primary": "#ffffff"
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
        "sidebar-width": "260px"
      }
    },
  },
  plugins: [],
}


