/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FFFFFF', // Light text color from "YAKSEN"
        secondary: '#F0F0F0', // Consider a slightly darker shade if needed, otherwise keeping it light
        accent: {
          DEFAULT: '#ff4719', // Orange/Red color from the logo
          light: '#ff6b3a',  // Lighter shade of accent
          dark: '#c4310f',  // Darker shade of accent
        },
        success: '#34D399', // Keeping success color, may not be relevant in the original palette
        warning: '#FBBF24', // Keeping warning color, may not be relevant in the original palette
        error: '#EF4444',   // Keeping error color, may not be relevant in the original palette
        neutral: {
          100: '#F5F5F5',   // Lightest shade of the background, or a very light grey
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        background: '#12171f', // Dark background color
      },
      spacing: {
        '0.5': '4px',
        '1': '8px',
        '1.5': '12px',
        '2': '16px',
        '2.5': '20px',
        '3': '24px',
        '4': '32px',
        '5': '40px',
        '6': '48px',
        '7': '56px',
        '8': '64px',
        '9': '72px',
        '10': '80px',
      },
      boxShadow: {
        card: '0 2px 10px rgba(0, 0, 0, 0.05)',
        elevated: '0 4px 20px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
