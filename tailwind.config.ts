import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#121212',
        paper: '#FFFFFF',
        'paper-soft': '#FAFAF8',
        accent: '#FF4A1F',
        // Darker variant of accent used for small text on light backgrounds.
        // #FF4A1F only reaches ~3.4:1 contrast on white, which fails WCAG AA
        // for normal-size text (needs 4.5:1). This shade reaches ~5:1.
        // Use `accent` for large text (>=24px), backgrounds, and text on
        // dark surfaces; use `accent-text` for small text on light surfaces.
        'accent-text': '#CC3D10',
        steel: '#6B6F76',
        hair: '#E7E5DF'
      },
      fontFamily: {
        display: ['Archivo', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        data: ['"IBM Plex Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
