/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // === TYPOGRAPHY ===
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        // Legacy fonts for backwards compatibility
        "body-l-medium": "var(--body-l-medium-font-family)",
        "body-m-medium": "var(--body-m-medium-font-family)",
        "body-m-regular": "var(--body-m-regular-font-family)",
        "h4-web": "var(--h4-web-font-family)",
        "other-caption-medium": "var(--other-caption-medium-font-family)",
        "other-caption-regular": "var(--other-caption-regular-font-family)",
      },
      fontSize: {
        // Desktop sizes
        'display-1': ['60px', { lineHeight: '1.1', fontWeight: '700' }],
        'display-2': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        'heading-1': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-2': ['32px', { lineHeight: '1.2', fontWeight: '600' }],
        'heading-3': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-4': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
      },

      // === SPACING (8px base) ===
      spacing: {
        '18': '72px',
        '22': '88px',
        '26': '104px',
        '30': '120px',
      },

      // === BORDER RADIUS ===
      borderRadius: {
        'card': '16px',
        'card-lg': '20px',
        'button': '8px',
        'pill': '9999px',
        'input': '12px',
        'image': '12px',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // === COLORS (CSS Variables) ===
      colors: {
        page: 'var(--bg-page)',
        card: 'var(--bg-card)',
        surface: 'var(--bg-surface)',
        'input-bg': 'var(--bg-input)',

        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-inverse': 'var(--text-inverse)',

        'border-default': 'var(--border-default)',
        'border-active': 'var(--border-active)',

        primary: {
          DEFAULT: 'var(--primary-main)',
          hover: 'var(--primary-hover)',
          50: '#F3F0FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: 'var(--secondary-accent)',
          pink: '#D946EF',
          cyan: '#06B6D4',
          foreground: "hsl(var(--accent-foreground))",
        },

        // Legacy colors for backwards compatibility
        "brand-coreprimary-electric-purple": "var(--brand-coreprimary-electric-purple)",
        "neutralsbg-app-background": "var(--neutralsbg-app-background)",
        "neutralscharcoal-gray": "var(--neutralscharcoal-gray)",
        "neutralselev-1-cards": "var(--neutralselev-1-cards)",
        "neutralselev-2-header-footer-overlay": "var(--neutralselev-2-header-footer-overlay)",
        "neutralsline-border": "var(--neutralsline-border)",
        "neutralssurface-panel-utama": "var(--neutralssurface-panel-utama)",
        "neutralstext-primary": "var(--neutralstext-primary)",
        "neutralstext-secondary": "var(--neutralstext-secondary)",
        "neutralstext-tertiary": "var(--neutralstext-tertiary)",
        semanticsuccess: "var(--semanticsuccess)",

        // Shadcn UI colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },

      // === BOX SHADOWS ===
      boxShadow: {
        'card-light': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-dark': '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow-purple': '0 0 60px rgba(139, 92, 246, 0.3)',
        'glow-pink': '0 0 60px rgba(217, 70, 239, 0.3)',
        'glow-sm': '0 0 20px rgba(139, 92, 246, 0.2)',
      },

      // === BACKDROP BLUR ===
      backdropBlur: {
        'glass': '12px',
      },

      // === ANIMATIONS ===
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'spin-slow': 'spin 20s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'fade-in-down': 'fade-in-down 0.6s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'slide-in-left': 'slide-in-left 0.4s ease-out',
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(139, 92, 246, 0.5)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },

      // === TRANSITIONS ===
      transitionDuration: {
        '400': '400ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
  },
  plugins: [],
};
