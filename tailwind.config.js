/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1b1f24', soft: '#454d57', mute: '#68717d' },
        asphalt: { 950: '#101418', 900: '#161b21', 800: '#20262e', 700: '#2c343e', 600: '#3b4550' },
        road: { DEFAULT: '#f5b700', dark: '#d49d00', soft: '#fff3c4' },
        plate: { DEFAULT: '#0b4aa2', dark: '#083a80', soft: '#e7effb' },
        cash: { DEFAULT: '#1d7a50', soft: '#e2f3ea' },
        alarm: { DEFAULT: '#c4352a', soft: '#fbe6e4' },
        amberx: { DEFAULT: '#b26a00', soft: '#fdf0dc' },
        paper: '#eceef1',
        card: '#fbfcfd',
        line: '#dbe0e6',
      },
      fontFamily: {
        sans: ['var(--font-vazir)', 'Tahoma', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 1px 0 rgba(16,20,24,.04), 0 8px 24px -12px rgba(16,20,24,.18)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        dash: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '-48px 0' } },
        lanev: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '0 44px' } },
      },
      animation: {
        rise: 'rise .45s cubic-bezier(.2,.7,.2,1) both',
        dash: 'dash 2.4s linear infinite',
        lanev: 'lanev 3s linear infinite',
      },
    },
  },
  plugins: [],
};
