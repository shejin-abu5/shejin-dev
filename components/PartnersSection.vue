<script setup lang="ts">
import { useReveal } from '~/composables/useReveal'
import { useBallPerch } from '~/composables/useScrollBall'

/*
  The sponsor strip.

  Every other section on this page answers a question about the person; this one
  answers a question about the site. It is the supplier band off a football
  club's own site — a small grey label and a line of marks, nothing else — and
  it is placed last, immediately before the footer, because that is where a
  colophon belongs: after the work, before the contact details.

  Deliberately three and not twenty. The skills lattice above already shows the
  whole toolbox, at chip size, changing every 1.4s. Repeating it here at logo
  size would say nothing new. What this says instead is narrower and checkable:
  *this page*, the one being looked at, is a Nuxt app rendering Vue components
  styled with Tailwind. See nuxt.config.ts — the module list is the citation.

  The band is the quietest thing on the site and is meant to be. It carries no
  heading at section scale, no copy, no rules and no card, because a supplier
  board that competes with the work above it has misunderstood what it is for.
*/

/**
 * The three marks, by filename in assets/img/tools.
 *
 * Braced glob rather than the whole directory: SkillsSection globs all twenty
 * because it draws all twenty, and this draws three. Same `?url` + `eager`
 * treatment, so Vite inlines them as data URIs at build time and the band
 * costs no requests. The path is relative for the reason given there — Vite
 * resolves glob patterns statically, and a relative literal needs no alias.
 */
const MARK = import.meta.glob<string>('../assets/img/tools/{vue,nuxt,tailwindcss}.svg', {
  eager: true,
  query: '?url',
  import: 'default'
})

interface Partner {
  /** Filename in assets/img/tools, without the extension. */
  file: string
  /**
   * How the project writes its own name.
   *
   * This is the mark's `alt` and nothing else — there is no visible caption
   * under these, the way there is none under a real club's supplier row. The
   * marks are the artwork; the names are for anyone not reading the artwork.
   */
  name: string
}

const PARTNERS: Partner[] = [
  { file: 'vue', name: 'Vue.js' },
  { file: 'nuxt', name: 'Nuxt' },
  { file: 'tailwindcss', name: 'Tailwind CSS' }
]

const markUrl = (file: string) => MARK[`../assets/img/tools/${file}.svg`]

const sectionRef = ref<HTMLElement | null>(null)
const railRef = ref<HTMLElement | null>(null)

/**
 * The last rolling perch on the page — the footer takes the ball from here.
 *
 * The line the marks stand on, so the ball rolls along the ground in front of
 * the hoarding rather than through the middle of it. Zero height and no paint,
 * like Education's tile rail: it is a measurement, and getBoundingClientRect
 * reports it either way. Nothing is drawn here because the reference band draws
 * nothing here, and the ball does not need a line to be visible to roll on it.
 *
 * This perch exists because the section does. Before it, Education's last tile
 * hopped straight onto the footer's resting rule, and that fall was tuned
 * against a 666px drop — insert half a screen of page between the two and the
 * same crossing has to cover ~1100px in the same scroll, which is the steep,
 * hurried landing the whole engine is written to avoid. Adding a section here
 * without a perch on it is not a neutral act; it lengthens the last fall on the
 * site and nothing gives the scroll back. So the ball comes down onto the strip,
 * rolls it, and makes the drop to the footer from here instead.
 */
useBallPerch(() => railRef.value, {
  trigger: () => sectionRef.value,
  // Opens while the band is still below the middle of the frame and closes with
  // it around a fifth of the way up, so the whole roll is spent on a line that
  // is comfortably in view. The engine may hand the ball over earlier than this
  // if the run has scroll to spare — see layoutRun in TheScrollBall.vue — but
  // never later than the section can show.
  start: 'top 70%',
  end: 'top 20%',
  // Clear of the first mark, and stopping at the middle. The middle is not a
  // taste call: the footer's resting rule is centred, so any horizontal distance
  // left over here is distance the last fall has to make up on top of the drop.
  // Education's last tile stops short of its own right edge for exactly this
  // reason, and this is the same argument one surface further on.
  //
  // Both are fractions of the *marks' own* box rather than of the container —
  // the strip is shrink-wrapped and centred, so this rail is about as wide as
  // the row of logos and no wider. That is what keeps the roll affordable: this
  // stretch of page, Skills down to the footer's anchored rule, is the one place
  // on the site already spending everything it has, and a full-container rail
  // would ask about three times the scroll for the same fraction ridden.
  from: 0.08,
  to: 0.5,
  // The final hop's tuning is inherited wholesale from the perch that used to
  // own it (Education's last tile): a long fall so the drop is not hurried, and
  // `holdExit` so the extra scroll buys a gentler descent rather than a taller
  // lob. Both numbers were measured against this same landing.
  fall: 0.95,
  holdExit: true
})

onMounted(() => {
  useReveal(sectionRef.value)
})
</script>

<template>
  <!-- Asymmetric padding, unlike every other section on the site, and measured
       rather than chosen. Education already carries 120px of its own below the
       card, so a matching 120px on top of this put ~300px of empty paper between
       the card and the label — at which point the band stops reading as a
       section and starts reading as the gap before the footer. The space below
       stays full: that one is doing a job, holding the strip off the near-black
       block underneath it. -->
  <section id="partners" ref="sectionRef" class="pb-16 pt-8 md:pb-[120px] md:pt-14">
    <div class="mx-auto max-w-[1240px] px-5 md:px-8 text-center">
      <!-- An h2 because the document outline wants one here and every other
           section has one; small and grey because the band is a caption, not a
           headline. The two are not in conflict — heading level is structure,
           and size is emphasis. -->
      <h2 class="reveal partner-label">Official Partners</h2>

      <!-- Shrink-wrapped and centred as a block rather than left full-width with
           the row centring its own items. The two look identical until something
           is measured against this element's box, and the ball's rail is: it
           spans this, so full width would hand the ball a rail the length of the
           container with the logos clustered in the middle third of it. -->
      <div class="partner-board">
        <ul class="partner-row">
          <li v-for="partner in PARTNERS" :key="partner.file" class="reveal partner-cell">
            <!-- No width/height pair: the three have three different aspect
                 ratios and the CSS sizes them by height alone, so any figures
                 here would fight the intrinsic ratio the SVG already carries.
                 There is nothing to reserve space against anyway — Vite inlines
                 all three as data URIs, so they are in the document.

                 A real `alt`, unlike the skills lattice's marks: there the names
                 follow as a written-out list, and here the mark is the only
                 thing that names its partner at all. -->
            <img class="partner-mark" :src="markUrl(partner.file)" :alt="partner.name" decoding="async">
          </li>
        </ul>

        <!-- The ground the marks stand on. Last in the markup so it sits on the
             row's bottom edge, and zero-height so it takes up none of it. -->
        <span ref="railRef" class="partner-rail" aria-hidden="true" />
      </div>
    </div>
  </section>
</template>

<style scoped>
/*
  Bold italic, which is the one place on this site that uses either.

  It is not decoration borrowed from the reference for its own sake. Italic is
  what sports lettering does — kit numbers, league tables, the supplier boards
  this band is copied from — and the whole page is built on a football conceit
  it has so far only spent on illustration and copy. Here the type carries a
  little of it too, at the smallest scale on the page, which is the right place
  to spend something like this.

  Archivo's real italic, not a synthesised one: `ital` was added to the Google
  Fonts request in nuxt.config.ts for this. Faux obliquing a grotesque shears the
  round letters into ellipses and it shows badly at a tracked-out weight.
*/
.partner-label {
  font-family: theme('fontFamily.display');
  font-style: italic;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: 0.01em;
  /* On-palette rather than the reference's lighter warm grey. #6B6F76 clears
     4.5:1 on paper; the softer tone this is standing in for lands around 2.6:1,
     which is under AA for text this size — and this is text, not a rule. */
  color: theme('colors.steel');
}

.partner-board {
  position: relative;
  width: max-content;
  max-width: 100%;
  margin-inline: auto;
  margin-top: 2.5rem;
}

@media (min-width: 768px) {
  .partner-board {
    margin-top: 3.5rem;
  }
}

/*
  A row that wraps rather than a three-column grid. Three marks of three widths
  do not want equal columns — equal columns centre each mark in its own share and
  leave gaps that visibly disagree with each other — and below `sm` the row has
  to be able to break without a media query telling it when.
*/
.partner-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2.5rem clamp(2.75rem, 8vw, 7rem);
}

.partner-cell {
  display: flex;
  align-items: center;
}

/*
  A fixed height and `object-contain`, not a width.

  The three marks have nothing in common geometrically — Vue is a 256x221
  triangle, Nuxt a 256x168 wedge, Tailwind a 54x33 pair of strokes — so sizing
  them by width draws Tailwind at two thirds the presence of Vue. Height is the
  dimension the eye reads a row of logos by, and `object-contain` keeps each
  one's own proportions while the row still reads as one line.
*/
.partner-mark {
  height: 34px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  /*
    Desaturated, and left that way — no colour-on-hover reveal. These are not
    links and nothing else about them responds to a pointer, so a hover state
    here would be the one thing on the band that reacts to being pointed at
    without being able to be clicked.

    Grey is also what lets three marks drawn by three different people read as
    one row. In colour the band is a Vue green, a Nuxt green and a Tailwind blue
    at three different intensities, and the eye sorts them before it reads them;
    stripped of hue they are just three shapes at the same size, which is what a
    supplier strip is.

    The `brightness` is not taste, it is the correction that makes the first
    filter survivable. `grayscale()` weights a colour by luminance, and these
    three are bright: Nuxt's #00DC82 and Tailwind's #38bdf8 both resolve to about
    #A6, which is 2.1:1 on paper — pale enough that the row read as an empty gap
    before the footer rather than as a band. 0.72 takes the pair to roughly #77,
    near 4.9:1, and leaves Vue — whose mark carries a #35495E face and was never
    the problem — dark without crushing its two tones into one shape.
  */
  filter: grayscale(1) brightness(0.72);
}

@media (min-width: 768px) {
  .partner-mark {
    height: 46px;
  }
}

/* Zero height, no paint — see the perch it serves in the script. Absolute so
   that a row which has wrapped still hands the ball the bottom line of the
   whole block rather than adding a phantom row of its own. */
.partner-rail {
  position: absolute;
  inset: auto 0 0 0;
  display: block;
  height: 0;
}
</style>
