<script setup lang="ts">
/**
 * A grid of hairlines with a handful of its cells filled in.
 *
 * The picture is ported from magicui's React `GridPattern`; the drawing is
 * theirs, everything around it — the palette hook, the per-cell opacity, the
 * absence of a `cn()` — is this repo's.
 *
 * SVG rather than the pair of `repeating-linear-gradient`s this replaces, for
 * one reason that matters and one that is merely tidy. The one that matters:
 * gradients draw lines, and a filled cell then has to be a separate absolutely
 * positioned element placed in pixels against a grid also measured in pixels —
 * two expressions of the same number, agreeing only for as long as nobody edits
 * one of them. Here the cell size is a prop and the filled cells are given in
 * cells, so a grid at 24px instead of 28px moves its cells with it. The tidy
 * one: `<pattern>` is what SVG has for exactly this, and it tiles from a single
 * path rather than from a gradient pretending to be a line.
 *
 * Decorative by construction — `aria-hidden` is set here rather than left to
 * each caller, because there is no reading of this element that carries
 * information.
 */

interface Props {
  /**
   * Cell size. Two numbers rather than one because a `<pattern>` tile has two
   * axes and there is no reason to forbid a rectangular one; callers wanting a
   * square grid pass the same value twice, which is what the defaults do.
   */
  width?: number
  height?: number
  /**
   * Where the tiling starts, in px.
   *
   * -1 rather than 0, and not arbitrary: the tile's path runs down x=0.5 and
   * along y=0.5, so a 1px stroke on it paints the band from 0 to 1 — a line
   * sitting *on* the container's own top-left edge, at half the weight of every
   * other line in the grid because the outer half falls outside the box. Backing
   * the origin off by a pixel moves that first line out of the frame entirely
   * and lets the second one, a full cell in, be the first one seen.
   */
  x?: number
  y?: number
  /** Passed to the grid line as-is. '0' is solid; '4 2' gives the dashed variant. */
  strokeDasharray?: string
  /**
   * The cells to fill, in grid units from the same origin the lines start at:
   * `[column, row, opacity?]`.
   *
   * The opacity is this port's addition. The original fills every square at one
   * strength, which reads as a deliberate arrangement of squares; varying it
   * across a set reads as light catching a surface unevenly, which is the thing
   * a texture behind a card is trying to be. Omit it for the original's
   * behaviour.
   */
  squares?: Array<[x: number, y: number, opacity?: number]>
}

withDefaults(defineProps<Props>(), {
  width: 40,
  height: 40,
  x: -1,
  y: -1,
  strokeDasharray: '0',
  squares: undefined
})

/**
 * `<pattern>` is referenced by `url(#id)`, so two of these on one page would
 * otherwise both resolve to whichever `<defs>` the document parsed first — and
 * the second component would silently render the first one's grid. Vue's
 * `useId` (3.5+) is the SSR-safe generator: the id the server writes into the
 * static HTML is the one the client hydrates with, which a counter or a random
 * string would not be.
 */
const id = useId()
</script>

<template>
  <svg aria-hidden="true" class="grid-pattern">
    <defs>
      <pattern :id="id" :width="width" :height="height" patternUnits="userSpaceOnUse" :x="x" :y="y">
        <path :d="`M.5 ${height}V.5H${width}`" fill="none" :stroke-dasharray="strokeDasharray" />
      </pattern>
    </defs>

    <rect width="100%" height="100%" stroke-width="0" :fill="`url(#${id})`" />

    <!-- Nested rather than laid over the top, so the cells inherit the pattern's
         own origin and a cell at [2, 9] is the cell the lines draw at [2, 9]
         rather than one a pixel off it. `overflow-visible` because a nested
         <svg> clips to its own viewport, which starts one pixel out. -->
    <svg v-if="squares?.length" :x="x" :y="y" class="overflow-visible">
      <rect
        v-for="[column, row, opacity] in squares"
        :key="`${column}-${row}`"
        stroke-width="0"
        :width="width - 1"
        :height="height - 1"
        :x="column * width + 1"
        :y="row * height + 1"
        :opacity="opacity"
      />
    </svg>
  </svg>
</template>

<style scoped>
/*
  Fill and stroke come off `currentColor` and `color` is set once, from a custom
  property, rather than from a `fill-*`/`stroke-*` utility pair on the root.

  Not a style preference. A caller retinting this would have to pass `fill-steel`
  alongside the component's own `fill-hair`, and which of two utilities of equal
  specificity wins is decided by the order Tailwind happens to emit them in — the
  problem React's `cn()`/`tailwind-merge` exists to solve, and there is no
  `tailwind-merge` here (nor a reason to add 3kB for one component). A custom
  property has no such fight: there is one `color` declaration, and a caller that
  sets `--grid-color` anywhere up the tree replaces the fallback outright.

  Positioning lives here too because a grid pattern that is not filling something
  else is not a grid pattern; every caller would repeat the same four utilities.
*/
.grid-pattern {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
  pointer-events: none;
  color: var(--grid-color, theme('colors.hair'));
  fill: currentColor;
  stroke: currentColor;
}
</style>
