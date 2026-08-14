<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReveal } from '~/composables/useReveal'
import { BALL_QUERY, useBallPerch } from '~/composables/useScrollBall'

/**
 * The player's registration card.
 *
 * This section used to be Education beside Languages, two half-width cards. The
 * languages list is gone: its own note admitted the order was against fluency
 * because English is the working language of every role on the CV, which is a
 * long way of saying the list was not telling anyone anything.
 *
 * What replaces it is the one piece of furniture the site's conceit was missing.
 * Everything else here is a footballer's page — a figure keeping the ball up in
 * the hero, a ball that plays down the whole document — and a squad registration
 * card is exactly the shape four facts about a player want to be in.
 */

/**
 * How much scroll the pin absorbs.
 *
 * 620 when this section was two half-width cards and the ball's two rolls were
 * 236px and 271px. One card is one crossing, and a wider one: the rolls below
 * are 504px and 194px, and the scroll they need has to come from somewhere.
 *
 * This is the somewhere, and the number is measured rather than chosen. The ball
 * lays every free perch out between the last anchored one and the footer's
 * resting rule, and when that stretch is short of scroll it cuts back how much
 * of each surface the ball rides rather than speeding it up. At 620 the whole
 * run — this section *and the skills rail above it* — was riding a fraction of
 * itself; at 980 it reached 0.68; at 1400 every perch from the experience chart
 * to the footer rides its full length, both rolls here run at 0.75px per px of
 * scroll, which is the site's cruise, and the skills rail is fully ridden for
 * the first time.
 *
 * It is also, and not by coincidence, about as long as the ball takes to cross
 * the card and drop off it: 504px of roll, the step down, 194px more, and the
 * fall to the footer. The card is held for exactly as long as the ball is on it.
 */
const PIN_SCROLL = 1400

const sectionRef = ref<HTMLElement | null>(null)
const tileRailRef = ref<HTMLElement | null>(null)
const lastTileRef = ref<HTMLElement | null>(null)

/**
 * The tiles: six, three across and two rows deep.
 *
 * It was four — three across with the fourth spanning the bottom two columns,
 * because four tiles in a three-column grid leaves a hole and a wide tile was
 * the better way to fill it. Six fills it properly, so the span is gone and both
 * rows are plain thirds.
 *
 * Order is not free. The ball enters this section from the left, crosses the top
 * row, steps down and crosses again, so the row it lands on has to read as the
 * continuation rather than as a second subject: identity on the top row —
 * academy, position, number — and the career record on the bottom. The last of
 * them is also the ball's final surface on the page, which is why it is the
 * right-hand column and not, as the reference card has it, the left. Measured
 * with the surface bottom-left, the ball rolled to x=522 and then drifted 177px
 * *backwards* and 200px down to reach it, which is not a step onto anything, it
 * is the ball changing its mind.
 */
interface Tile {
  label: string
  value: string
  /** Only the academy carries one — see below. */
  note?: string
  /** Read instead of `value` where the visible text does not say what it means. */
  spoken?: string
  /**
   * Set in `accent-text` in front of the value. Data rather than markup because
   * the `#` used to be hardcoded into the branch that renders `spoken`, which
   * quietly meant the second tile to want a spoken form would have got a `#` in
   * front of it too.
   */
  prefix?: string
  glyph: string[]
}

/**
 * Stroked in a 24×24 box, same idiom as the skills glyphs and the mortarboard
 * this file already had.
 *
 * The reference card uses emoji for these four. Emoji would be the one place on
 * the site the icon language breaks, and they are drawn by the operating system
 * — the same card would be a different card on a Mac, a Windows box and an
 * Android phone.
 */
const CAP = [
  'm12 4.2 9.8 4.4-9.8 4.4-9.8-4.4 9.8-4.4Z',
  'M6.6 11v4.4c0 1.5 2.4 2.7 5.4 2.7s5.4-1.2 5.4-2.7V11',
  'M21.3 9.2v4.6'
]

// A tactics board rather than a boot. "Position" is a place on a pitch, and a
// pitch with a halfway line and a centre circle says that in one glance; a boot
// says "football" again, which the page has already said.
const PITCH = [
  'M3.2 5.2h17.6v13.6H3.2z',
  'M12 5.2v13.6',
  'M12 9.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 1 1 0-5.2',
  'M3.2 9.6h2.6v4.8H3.2',
  'M20.8 9.6h-2.6v4.8h2.6'
]

// The jersey the number is printed on.
const SHIRT = [
  'M9 3.6 5.2 5.4 3.4 9.1l2.6 1.3V20.4h12V10.4l2.6-1.3-1.8-3.7L15 3.6',
  'M9 3.6a3 3 0 0 0 6 0'
]

// A club badge. Same shield the game itself puts a crest on.
const BADGE = ['M12 3.4 20 6v6.1c0 4.2-3.2 6.9-8 8.5-4.8-1.6-8-4.3-8-8.5V6l8-2.6Z', 'M9.2 12.1l2 2 3.6-3.9']

// A fixture calendar for appearances. Built as a match clock first, on the
// argument that a calendar counts dates while this counts matches — overruled,
// and the marked days carry the count better than a clock face does anyway.
const CALENDAR = [
  'M4.2 6.4h15.6v13.4H4.2z',
  'M4.2 10.6h15.6',
  'M8.6 3.6v3.4',
  'M15.4 3.6v3.4',
  'M7.6 14h1.8',
  'M13.2 14H15',
  'M7.6 17h1.8'
]

// The referee's card, held at the angle a referee holds it. The one glyph on the
// card that needs no translation into football — it is the thing itself.
const CARD = ['M9.7 5.2 17.4 7.2 14.3 18.8 6.6 16.8Z']

const TILES: Tile[] = [
  {
    label: 'Academy',
    value: 'BCA Computer Science',
    // The one field with provenance worth keeping. A degree without the
    // institution and the years is a claim rather than a record — and the tile
    // has the room, because every tile is sized by the tallest of them anyway.
    note: 'Bharathiar University · 2008—2011',
    glyph: CAP
  },
  { label: 'Position', value: 'Frontend Developer', glyph: PITCH },
  {
    label: 'Number',
    value: '28',
    // "#28" reads as "hash twenty-eight". The visible text keeps the hash and
    // the spoken one does not.
    spoken: 'Number 28',
    prefix: '#',
    glyph: SHIRT
  },
  { label: 'Current club', value: 'Alternative Agency', glyph: BADGE },
  { label: 'Total appearances', value: '12+ years', glyph: CALENDAR },
  {
    label: 'Red cards',
    value: '0',
    // A bare "0" beside "Red cards" is read as a score, not as a record. The
    // spoken version says what the zero is claiming.
    spoken: 'No red cards',
    glyph: CARD
  }
]

/**
 * The grid, in px.
 *
 * One number, passed to GridPattern on both axes, and the filled cells below are
 * counted in it rather than multiplied by it. It used to be a `--cell` custom
 * property on the card that the lines and the cells each read separately, which
 * is the same number written twice.
 */
const CELL = 40

/**
 * The faint filled cells scattered over the grid, as [column, row, opacity].
 *
 * Given in grid units from the section's top-left, so each one lands exactly
 * inside four lines — a filled cell half a step off its own grid is the detail
 * that makes a pattern read as a texture bitmap instead of a drawing. Off the
 * diagonal and unevenly spaced, because the reference's are and because an even
 * scatter reads as a checkerboard.
 *
 * Seven of them, and the count is the point: at CELL 28 there were thirteen,
 * which on a grid this much coarser reads as a pattern of squares rather than as
 * a few cells that happen to be filled. Bigger cells want fewer.
 *
 * Placed loosely rather than precisely, and the tilt is why. `.player-grid` is
 * skewed 12°, so a cell's painted position is its grid position plus
 * `(x − centre) × tan 12°` in y — about 150px of lift at the left edge of a 1440
 * viewport and 150px of drop at the right. Anything aimed at a specific gap
 * would miss it at every other width, so these are aimed at regions: low and
 * central, where the tilt moves them least, and a couple out wide where it is
 * free to throw them about.
 *
 * Opacities run higher than the card's did — the vignette on the wrapper
 * multiplies every one of these by its own falloff, and 0.3 under a mask already
 * down to half strength is not a cell, it is a rumour.
 */
const CELLS: Array<[x: number, y: number, opacity?: number]> = [
  // The band below the card: open at every width, and the nav is nowhere near it.
  [3, 12, 0.5],
  [9, 14, 0.4],
  [17, 13, 0.55],
  [26, 12, 0.45],
  // Either side, for the screens with room outside a 960px card.
  [6, 5, 0.4],
  [30, 6, 0.5],
  // Above — seen at the widths that do not pin.
  [21, 3, 0.35]
]

/**
 * The ball's last two rolling perches on the page.
 *
 * A zero-height rail sitting on the top row's own top line, then the last tile —
 * bottom right — a row below it. The rail exists because the surface the ball
 * wants is "the tops of the three tiles", which is a line rather than an element
 * — and putting the three of them in a wrapper to get one would mean a <div>
 * between the <dl> and its own terms, which is not a list any more.
 *
 * Everything from the skills grid to the footer's resting rule has to fit in the
 * tail the page happens to have, and the footer's perch cannot move: it is
 * anchored 150px from the end of the document. So the scroll for this roll comes
 * out of the pin below rather than out of the page.
 */
useBallPerch(() => tileRailRef.value, {
  trigger: () => sectionRef.value,
  start: 'top 58%',
  end: 'top 32%',
  // Ends over the tile below that the ball steps onto, so the step down is a
  // step down and not a diagonal — see `from` on the perch after this, which
  // resolves to the same point on the same line.
  //
  // Not the whole row, and that is the page's decision rather than this
  // section's. The old Education perch crossed 236px of a half-width card; the
  // full row is 816px, and asking for all of it puts the roll's appetite at
  // 1090px of scroll in a stretch of page that is already floored at
  // ROLL_MIN_RIDE. Measured with `to: 0.94`, the engine did exactly what it is
  // written to do and cut the ride back to 22% — the ball crossed the first tile
  // and stopped dead over the second. Two thirds it can actually ride beats a
  // whole row it cannot.
  from: 0.06,
  to: 0.7,
  // A short fall, because it is a short hop: one tile down and back to the left.
  // The default is sized for crossing between sections and would spend more
  // scroll on this step than this section has to give.
  fall: 0.16
})

// The last rolling perch on the page — the footer takes the ball from here.
//
// The window has to sit where the tile is still in frame: pushed any later and
// the ball spends its final roll riding a tile that has already scrolled out the
// top, which is not a roll anyone sees.
useBallPerch(() => lastTileRef.value, {
  trigger: () => sectionRef.value,
  start: 'top 22%',
  end: 'top -8%',
  /*
    These two are the same two points they have always been, expressed against a
    narrower surface.

    The bottom row used to be one tile spanning the right two thirds of the card;
    it is three tiles now, and the perch is the last of them — the right-hand
    column, x 553→816 of the 816px content box rather than x 277→816. So the
    fractions had to be restated or the ball would have arrived somewhere new.

    They were restated by solving for the old positions rather than by taste. The
    rail above ends at 0.70 of 816 = x 571; the old `from: 0.54` of the wide tile
    was x 568 and the old `to: 0.8` was x 708. Against a 263px column starting at
    553 those are 0.07 and 0.59. The ball's absolute path over this card is
    unchanged, which is why every measured number below — `fall`, `holdExit`, and
    PIN_SCROLL above — still holds.

    Everything the old comment argued for still applies and is worth keeping:
    `from` puts the ball down directly under the end of the roll above, so the
    drop reads as a step rather than a hop backwards. And `to` stops short of the
    right edge because the footer's resting rule is centred, so wherever the ball
    leaves here is horizontal distance the last fall has to make up — measured,
    leaving at the far edge took the footer stretch from 0.92px per px of scroll
    to 1.32.
  */
  from: 0.07,
  to: 0.59,
  // This used to be the last hop on the page — tile to the footer's resting
  // rule, a 666px drop into an anchor 150px from the end of the document, with
  // nothing but the page's tail to make it in. At 0.1 the ball got 220px of
  // scroll for it and landed at 5.9px per px, the fastest thing on the site and
  // the last thing anyone saw; 0.95 with `holdExit` is what fixed it.
  //
  // The sponsor board now sits between the two, so that whole argument moved on
  // to PartnersSection's perch along with the hop it was about — the numbers are
  // there, unchanged, because the landing they were measured against is still
  // the same landing. What is left here is an ordinary step down onto the board's
  // top rule, roughly a section's padding below this tile. It keeps `holdExit`,
  // which is about this surface rather than about the distance: the tile is
  // inside a pin, so read live its launch height is anchored to something that
  // stops dead and then leaves at full scroll speed.
  //
  // 0.55 rather than 0.95: at ~600px of drop that is close to the 0.92px per px
  // the old landing was tuned to, and the ~430px it hands back is scroll this
  // stretch of page has nowhere else to find. Everything from the skills grid
  // down is spending against one budget, and the board's own roll is new
  // demand on it.
  fall: 0.55,
  holdExit: true
})

let mm: ReturnType<typeof gsap.matchMedia> | null = null

onMounted(() => {
  useReveal(sectionRef.value)

  mm = gsap.matchMedia()

  /**
   * Holds the card still for the ball's last roll.
   *
   * The pin is what the roll is spent inside. Held, the section's top freezes at
   * 0 and the card parks in the middle of the frame — so the ball crosses the
   * tiles with them stationary and comfortably in view, over PIN_SCROLL of
   * scroll it would not otherwise have. Unpinned, the Languages perch's window
   * is 30% of a viewport, about 324px at 1080, and the surface is leaving the
   * top of the frame for most of it.
   *
   * `pinSpacing: true`, unlike Selected Work's hold: there is no deck below this
   * to spend the scroll on, so the spacer is where it goes.
   *
   * Gated on BALL_QUERY because there is no ball below it, so there would be
   * nothing to hold the page for.
   */
  mm.add(BALL_QUERY, () => {
    const el = sectionRef.value
    if (!el) return

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: `+=${PIN_SCROLL}`,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true
    })

    return () => st.kill()
  })
})

onBeforeUnmount(() => {
  mm?.revert()
})
</script>

<template>
  <section ref="sectionRef" class="player-section relative py-12 md:py-[120px]">
    <!-- The grid, and the handful of cells filled on it. Full-bleed: a sibling of
         the container rather than a child of the card, so it spans the section
         edge to edge and the card sits on top of it.

         No z-index. Both this and the container below are positioned, so they
         paint in document order and the card's own opaque background is what
         hides the part of the grid behind it. Decorative — it says nothing the
         tiles do not — and GridPattern is `aria-hidden` in itself, so there is
         nothing to declare here. -->
    <!-- The wrapper is not decoration, it is what lets the grid tilt. The mask
         has to fade against the section's own edges, and a mask on a skewed
         element skews with it — so the vignette lives out here on a square box
         and the skew happens inside, where it can overhang as far as it likes
         and be clipped. -->
    <div class="player-grid-clip" aria-hidden="true">
      <GridPattern class="player-grid" :width="CELL" :height="CELL" :squares="CELLS" />
    </div>

    <!-- Soft dark falloff down the left and right edges. Its own layer rather
         than more gradients on the mask above, because it sits *over* the grid
         and under the card — a shadow on the section, not a hole in the grid. -->
    <div class="player-edges" aria-hidden="true" />

    <!-- The section's name, and its largest piece of type.
         Before the container in the markup because that is where a heading
         belongs in the reading order; painted over it by `z-index` rather than
         by document order, which is the whole trick — see the style block. -->
    <h2 class="player-heading">Stat</h2>

    <div class="relative mx-auto max-w-[960px] px-5 md:px-8">
      <div class="reveal player-card">
        <!-- Sits on the top row's own top line, spanning the card's content box.
             Zero height and no paint: it is a measurement, and
             getBoundingClientRect reports it either way. -->
        <span ref="tileRailRef" class="player-rail" aria-hidden="true" />

        <dl class="player-tiles">
          <div
            v-for="(tile, i) in TILES"
            :key="tile.label"
            :ref="(el) => { if (i === TILES.length - 1) lastTileRef = (el as HTMLElement) ?? null }"
            class="player-tile"
          >
            <svg
              class="player-glyph"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path v-for="d in tile.glyph" :key="d" :d="d" />
            </svg>

            <dt class="player-label">{{ tile.label }}</dt>

            <dd class="player-value">
              <template v-if="tile.spoken">
                <span aria-hidden="true"><span v-if="tile.prefix" class="player-hash">{{ tile.prefix }}</span>{{ tile.value }}</span>
                <span class="sr-only">{{ tile.spoken }}</span>
              </template>
              <template v-else>{{ tile.value }}</template>
            </dd>

            <dd v-if="tile.note" class="player-note">{{ tile.note }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* The card, in the same family as Selected Work's and Skills': paper, a 22px
   radius, and the three-layer shadow doing all the separating. No hairline and
   no tint — a contact shadow to keep the edge crisp, a mid layer for the near
   falloff, and a wide negative-spread layer for the lift. A single large blur at
   this strength goes grey and muddy instead of deep. */
.player-card {
  --pad: clamp(1.25rem, 3vw, 2.5rem);

  position: relative;
  overflow: hidden;
  border-radius: 22px;
  /* Opaque, and load-bearing now rather than incidental: the grid runs the full
     width of the section behind this, and this is what hides the part of it
     under the card. `isolation: isolate` used to sit here to keep that grid's
     negative z-index from falling through — it went out with the grid. */

  padding: var(--pad);
}

/* The square box the tilted grid is masked and clipped against.

   It exists because a mask on a transformed element is transformed with it: put
   the vignette on the skewed grid and the ellipse skews too, so its falloff no
   longer lines up with the section's own top and bottom and the lines get cut
   off against the white page. On an unskewed wrapper the vignette stays true to
   the section whatever the grid inside is doing.

   A vignette, and the radii are the whole of it. The grid runs the full width of
   the viewport, so it has two edges it would not otherwise have — the section's
   top and bottom, with nothing but white page above and below them. Left to stop
   there it would read as a rectangle of graph paper pasted onto the site.

   The two radii are doing opposite jobs, which is why they are not the same
   number. A radial-gradient's radii are measured against the box, so the
   distance from a centred origin to an edge is exactly half the box: 50% is the
   value at which the falloff reaches zero precisely at that edge, and anything
   larger leaves paint on it.

   Vertically that is exactly what is wanted — 50%, the grid gone by the time the
   section ends, nothing to cut off. Horizontally it is the opposite: measured at
   50% the lines faded out about 120px short of the viewport either side, which
   is a band of texture with white margins, not a full-bleed one. 75% carries
   roughly 60% strength off both edges, which is what reads as continuing past
   the frame rather than stopping inside it.

   Held solid to 45% so the bands immediately above and below the card — the only
   part of this most people will see — are not already halfway faded.

   Here rather than passed down as a `[mask-image:…]` utility because the
   `-webkit-` pair is what covers Safari before 15.4, and Tailwind's arbitrary
   values emit the one property they are given. */
.player-grid-clip {
  position: absolute;
  inset: 0;
  /* The grid inside overhangs by design; this is what stops the overhang
     reaching the document and putting a scrollbar across the page. */
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: radial-gradient(75% 50% at 50% 50%, #000 45%, transparent 100%);
  mask-image: radial-gradient(75% 50% at 50% 50%, #000 45%, transparent 100%);
}

/* The tilt, and the overhang that pays for it.

   12° is the reference's angle. Skewing about the centre lifts the left edge and
   drops the right by half the width times tan 12° — 153px each way at 1440 — so
   a box the height of the section would leave two bare triangles across the top
   and bottom. 160% with 30% of overhang above absorbs that at any width the
   section is likely to be, and the wrapper clips whatever is left over.

   `bottom: auto` because GridPattern sets `inset: 0` on itself: with top, bottom
   and height all resolved the browser drops one of them, and this says which.

   Generated rather than the reference PNG, which is a picture *of* this idea
   with the words "Grid Pattern" set across the middle of it. Generated is also
   resolution-independent and takes its colour from the palette token, so it
   follows `hair` if that ever moves. */
.player-grid {
  top: -30%;
  bottom: auto;
  height: 160%;
  transform: skewY(12deg);
}

/* Shadow down the two long edges. Over the grid and under the card — a section
   that recedes at the sides rather than a grid with holes in it.

   Two gradients rather than an `inset` box-shadow: a box-shadow would close the
   top and bottom as well, and those two edges are already being handled by the
   vignette, which would leave the corners doubled and visibly darker. */
.player-edges {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to right, rgb(18 18 18 / 0.07), rgb(18 18 18 / 0) 24%),
    linear-gradient(to left, rgb(18 18 18 / 0.07), rgb(18 18 18 / 0) 24%);
  /* Both gradients run horizontally, so without this the shadow has square top
     and bottom ends and the section finishes on two hard grey stubs against the
     white page — the exact thing the grid's vignette exists to avoid. Fades on
     the same axis and over the same distance as that vignette. */
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent);
}

/* The word, laid across the whole section.

   `z-index: 1` and not document order. It has to paint over the card, and the
   obvious way to get that is to put it after the container in the markup — but
   then a screen reader meets the section's heading after the six facts it heads,
   which is not an outline. So it stays first and is lifted instead.

   `overflow: hidden` on its own box means the word can be sized past the
   viewport without ever reaching the document and adding a horizontal scrollbar;
   at that point it just crops against the section, which is the right failure.

   Opacity is the one number here that is not free. Over `paper-soft` this
   darkens the tiles under it, and the 11px `steel` labels only start at 5.1:1 —
   there is not much of a budget before they drop under the 4.5:1 AA floor.
   Measured on the running page rather than guessed; see the note on the value. */
.player-heading {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  pointer-events: none;
  margin: 0;
  font-family: theme('fontFamily.display');
  /* It does not have to span the section, and that is the one thing worth
     knowing here. The word paints *over* the card rather than behind it, so
     nothing about its size is fighting for a gap to be seen through — it can be
     whatever reads best. At 24vw four letters come out around the width of the
     card itself on a 1440 viewport, which is the size that reads as a stamp
     across the stats rather than as a caption behind them. In `vw` so it holds
     that proportion; capped so it stops growing once the section cannot. */
  font-size: clamp(96px, 24vw, 340px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  color: theme('colors.ink');
  /*
    Measured, not chosen. On the running page the 11px `steel` label sits at
    4.83:1 on `paper-soft`; this word darkens whatever it crosses, and at the
    0.05 it was first built with the label fell to 4.36:1 — under the 4.5:1 AA
    floor for normal text. 0.03 holds it at 4.55:1.

    That is the whole budget. If this ever needs to be stronger, the honest lever
    is the label colour rather than this number.
  */
  opacity: 0.03;
}

/* A line, not a thing. See the note in <script>. */
.player-rail {
  position: absolute;
  left: var(--pad);
  right: var(--pad);
  top: var(--pad);
  height: 0;
}

/* One column on a phone: at this width a three-across grid is three columns of
   two-word wraps. */
.player-tiles {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}

@media (min-width: 560px) {
  .player-tiles {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Three across, two rows deep. Has to hold from `lg` up, because that is where
   the ball rides it and the step down is measured against these columns — the
   `from`/`to` on the second perch are fractions of a third of this row. Below
   that the grid is free to be whatever reads best.

   No `grid-column` span on the last tile any more. It was there to fill the hole
   a fourth tile leaves in a three-column grid; with six there is no hole. */
@media (min-width: 900px) {
  .player-tiles {
    grid-template-columns: repeat(3, 1fr);
  }

}

/* Inset panels on the card rather than cards on a card: paper-soft inside a
   hairline, a smaller radius than the card's, and no shadow of their own. A
   second shadow here would make the card look like a tray of cards. */
.player-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 168px;
  padding: 1.5rem 1rem;
  border: 1px solid theme('colors.hair');
  border-radius: 14px;
  background: theme('colors.paper-soft');
  text-align: center;
  /* All three are for the glyph in the corner: `relative` is what it anchors to,
     `isolate` is what stops its negative z-index dropping it through this
     background and out the back of the tile, and `hidden` is what crops it —
     to the 14px radius, so the bite follows the corner rather than squaring it
     off. */
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

/* Stacked one per row, a tile does not need to be tall enough to sit beside
   another one — and four at the full height is 715px of card on an 844px phone,
   which is a screen spent on four short facts. The height above is there to keep
   three tiles square-ish in a row; in a column nothing is being matched. */
@media (max-width: 559px) {
  .player-tile {
    min-height: 0;
    padding: 1.25rem 1rem;
  }
}

/* The tile's mark, in the top-right corner rather than in the flow above the
   label.

   It can be this big precisely because it is not information: the `dt` beside it
   says the same thing in words, and the glyph is `aria-hidden`. At 26px in the
   flow it was competing with the label for the top of the tile and winning, so
   the eye arrived at a mortarboard before it arrived at "Academy". In the corner
   the reading order starts where it should and the mark becomes the tile's
   watermark.

   Behind the text, not over it — `z-index: -1` against the tile's `isolate`. A
   centred value on a 272px tile reaches into the right-hand corner, so an
   absolutely positioned glyph in the normal paint order would sit on top of the
   words rather than under them. */
.player-glyph {
  /*
    The floor is the constraint, and it is not the phone's width but the phone's
    *tile*: below 560px the tiles stack, `min-height` is dropped, and a one-line
    tile such as Position collapses to about 83px. At 84 the mark clears that
    with the top offset applied and keeps its bottom; much larger and the crop
    stops being a corner bite and starts taking the whole glyph.
  */
  --mark: clamp(84px, 9vw, 124px);

  position: absolute;
  z-index: -1;
  width: var(--mark);
  height: var(--mark);
  /*
    Pinned into the corner and past it, so `overflow: hidden` on the tile takes a
    bite out of the mark. The fractions look arbitrary and are not: they are
    measured off the paths.

    None of these glyphs fill their own viewBox. Across the four, the drawing
    occupies roughly x 3–21 and y 4–20 of the 24-unit box, so the box carries
    about 12% padding on the right and 17% on the top before it reaches any ink.
    Offsets smaller than that crop nothing but air — the mark sits flush to the
    edge looking like a mistake rather than a bleed. These clear the padding
    first and then take a further ~18% off the drawing itself.

    In `calc` against the size rather than in px so the bite stays the same
    fraction of the mark at every step of the clamp.

    The uncropped version — whole mark, 10px inside the corner — was built and
    rejected. Worth knowing why, since the shirt is the argument for it: its
    collar and shoulders both identify it and sit at the top of the box, which is
    the part the bite takes, so it is the one glyph the crop costs something.
    Kept anyway; the corner treatment is the point.
  */
  top: calc(var(--mark) * -0.28);
  right: calc(var(--mark) * -0.26);
  /* `accent`, not `accent-text`. The palette's rule is that small text on a
     light surface takes the darker shade for contrast — this is neither small
     nor text, it is an `aria-hidden` mark 124px across, which is exactly the
     case `accent` is for. */
  color: theme('colors.accent');
  opacity: 0.3;
}

/* The paths are drawn for a 24px box at 1.5 weight, and stroke scales with the
   box: at 68px the same declaration renders a 4.25px line, which reads as a logo
   rather than a line drawing and goes muddy under 30% opacity besides.
   `non-scaling-stroke` pins it to 1.5 device px whatever the clamp resolves to,
   so the mark gets bigger without getting heavier.

   On the paths rather than the <svg>, because `vector-effect` is one of the few
   SVG presentation properties that does not inherit. */
.player-glyph path {
  vector-effect: non-scaling-stroke;
}

.player-label {
  font-family: theme('fontFamily.data');
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: theme('colors.steel');
}

.player-value {
  font-family: theme('fontFamily.display');
  font-size: clamp(18px, 1.9vw, 18px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.015em;
  color: theme('colors.ink');
  text-wrap: balance;
}

/* Colour on the one field that is actually a number rather than a name. It used
   to be the card's only piece of it; the corner glyphs are accent now too, so
   what this marks is the one place accent appears in something being *read*.
   Hence `accent-text` and not `accent`, per the usual rule — small text on a
   light surface. The glyphs take the lighter shade because they are neither. */
.player-hash {
  color: theme('colors.accent-text');
}

.player-note {
  font-family: theme('fontFamily.data');
  font-size: 11px;
  line-height: 1.5;
  color: theme('colors.steel');
}
</style>
