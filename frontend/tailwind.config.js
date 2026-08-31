/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // v3 Core Surface & Line Tokens
        base: 'var(--base)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        overlay: 'var(--overlay)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',

        // v3 Text Tokens
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        'text-mute': 'var(--text-mute)',

        // v3 Accent & Semantic Tokens
        amber: 'var(--amber)',
        'amber-press': 'var(--amber-press)',
        'on-amber': 'var(--on-amber)',
        'amber-soft': 'var(--amber-soft)',
        mint: 'var(--mint)',
        'mint-soft': 'var(--mint-soft)',
        sky: 'var(--sky)',
        'sky-soft': 'var(--sky-soft)',
        rose: 'var(--rose)',
        'rose-soft': 'var(--rose-soft)',
        violet: 'var(--violet)',
        'violet-soft': 'var(--violet-soft)',

        // Legacy compatibility aliases
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
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        serif: ['"Sora"', 'system-ui', 'sans-serif'], // Sora is the primary display/headline typeface in v3
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '10px',
        modal: '20px',
        pill: '999px',
      },
      boxShadow: {
        overlay: '0 16px 40px rgba(0, 0, 0, 0.45)',
      },
      transitionTimingFunction: {
        'v3-ease': 'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        hover: '120ms',
        state: '180ms',
        sheet: '240ms',
        route: '320ms',
      },
    },
  },
  plugins: [],
}
