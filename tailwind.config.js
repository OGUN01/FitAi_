/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@gluestack-ui/themed/**/*.{js,jsx,ts,tsx}'
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary color system - Vibrant Orange/Coral
        primary: {
          DEFAULT: '#FF6B35',
          light: '#FF8A5C',
          dark: '#E55A2B',
          50: '#FFF5F2',
          100: '#FFEAE3',
          200: '#FFD4C7',
          300: '#FFBFAB',
          400: '#FFA58F',
          500: '#FF8A5C',
          600: '#FF6B35',
          700: '#E55A2B',
          800: '#CC4A21',
          900: '#B33A17'
        },
        // Secondary color system - Electric Cyan
        secondary: {
          DEFAULT: '#00D4FF',
          light: '#00FFFF',
          dark: '#00B8E6',
          50: '#E6FBFF',
          100: '#CCF7FF',
          200: '#99EFFF',
          300: '#66E7FF',
          400: '#33DFFF',
          500: '#00D4FF',
          600: '#00B8E6',
          700: '#009DCC',
          800: '#0081B3',
          900: '#006699'
        },
        // Aurora background themes
        aurora: {
          'space-base': '#0A0F1C',
          'space-mid': '#1A1F2E',
          'space-high': '#252A3A',
          'purple-base': '#1C0A1F',
          'purple-mid': '#2E1A2F',
          'purple-high': '#3A252F',
          'ocean-base': '#0A1F1C',
          'ocean-mid': '#1A2F2E',
          'ocean-high': '#253A3A'
        },
        // Background system
        background: {
          DEFAULT: '#0A0F1C',
          secondary: '#1A1F2E',
          tertiary: '#252A3A'
        },
        // Text color system
        text: {
          primary: '#FFFFFF',
          secondary: '#B0B0B0',
          muted: '#8A8A8A',
          disabled: '#5A5A5A'
        },
        // Status colors
        success: {
          DEFAULT: '#4CAF50',
          light: '#81C784',
          dark: '#388E3C'
        },
        warning: {
          DEFAULT: '#FF9800',
          light: '#FFB74D',
          dark: '#F57C00'
        },
        error: {
          DEFAULT: '#F44336',
          light: '#E57373',
          dark: '#D32F2F'
        },
        info: {
          DEFAULT: '#2196F3',
          light: '#64B5F6',
          dark: '#1976D2'
        },
        // Glass surface colors
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          light: 'rgba(255, 255, 255, 0.15)',
          dark: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.18)'
        }
      },
      // Spacing system (8pt grid)
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'xxl': '48px',
        'xxxl': '64px'
      },
      // Border radius system
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'xxl': '24px',
        'full': '9999px'
      },
      // Font size system
      fontSize: {
        'display': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.2', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'micro': ['12px', { lineHeight: '1.5', fontWeight: '400' }]
      },
      // Font weight system
      fontWeight: {
        'light': '300',
        'regular': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800'
      },
      // Shadow system (8 levels)
      boxShadow: {
        'level-1': '0 1px 2px rgba(0, 0, 0, 0.1)',
        'level-2': '0 2px 4px rgba(0, 0, 0, 0.15)',
        'level-3': '0 4px 8px rgba(0, 0, 0, 0.2)',
        'level-4': '0 6px 12px rgba(0, 0, 0, 0.25)',
        'level-5': '0 8px 16px rgba(0, 0, 0, 0.3)',
        'level-6': '0 12px 24px rgba(0, 0, 0, 0.35)',
        'level-7': '0 16px 32px rgba(0, 0, 0, 0.4)',
        'level-8': '0 24px 48px rgba(0, 0, 0, 0.45)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.37)'
      },
      // Animation durations
      transitionDuration: {
        'instant': '100ms',
        'quick': '200ms',
        'normal': '300ms',
        'slow': '500ms',
        'very-slow': '800ms'
      },
      // Animation timing functions
      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      // Background gradients
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF6B35 0%, #FF8A5C 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #00D4FF 0%, #00FFFF 100%)',
        'gradient-aurora-space': 'linear-gradient(180deg, #0A0F1C 0%, #1A1F2E 50%, #252A3A 100%)',
        'gradient-aurora-purple': 'linear-gradient(180deg, #1C0A1F 0%, #2E1A2F 50%, #3A252F 100%)',
        'gradient-aurora-ocean': 'linear-gradient(180deg, #0A1F1C 0%, #1A2F2E 50%, #253A3A 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
      },
      // Blur utilities
      backdropBlur: {
        'glass': '20px',
        'glass-light': '10px',
        'glass-heavy': '30px'
      }
    }
  },
  plugins: []
}
