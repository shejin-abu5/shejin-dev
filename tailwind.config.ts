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
      screens: {
        // The narrowest width at which a project card is better as a *row* —
        // copy beside the shot — than as a column. Not a device class, which is
        // why it isn't one of Tailwind's own stops.
        //
        // 900px rather than the 992 it was, and the move is what let the swipe
        // rail below it go. The rail was never about touch: it was that a
        // single-column card was ~840px tall down there, taller than the frame
        // it has to pin inside, so the deck couldn't stack and something had to
        // stand in its place. Two things fixed the height instead — this line,
        // and `--shot-cap` in components/ProjectsSection.vue, which sizes the
        // shot from the frame rather than from the container — and once a card
        // fits the frame at every width, the deck runs at every width.
        //
        // Not 768, which is where it was first put and which merely *fits*. At
        // 768 the row's shot is a 300x200 thumbnail against 280px of copy, and
        // the card leaves 475px of empty page under it on a portrait tablet;
        // the column at the same width gets a 448x299 shot and reads as a
        // project rather than a table row. The row is worth having once it has
        // the width to be one, which is around here.
        //
        // Kept in step with the `900px` blocks in
        // components/ProjectsSection.vue.
        deck: '900px'
      },
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
