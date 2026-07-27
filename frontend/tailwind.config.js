/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bone: 'var(--bone)',
        paper: 'var(--paper)',
        'paper-sunk': 'var(--paper-sunk)',
        ink: 'var(--ink)',
        graphite: 'var(--graphite)',
        ash: 'var(--ash)',
        rule: 'var(--rule)',
        signal: 'var(--signal)',
        'signal-ink': 'var(--signal-ink)',
        gain: 'var(--gain)',
        warn: 'var(--warn)',
        loss: 'var(--loss)',
        marker: 'var(--marker)',
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
