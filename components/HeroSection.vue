<script setup lang="ts">
import { gsap } from 'gsap'
import { useBallPerch } from '~/composables/useScrollBall'

const wrapRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const markRef = ref<HTMLElement | null>(null)
const introRef = ref<HTMLElement | null>(null)
const sloganRef = ref<HTMLElement | null>(null)

// The bio, cut into runs so the two concrete claims in it — the stack and the
// brands — can carry the accent while the prose around them stays ink. Two
// highlights rather than one: they are the only load-bearing facts in the
// sentence, and colouring the adjectives instead would be decoration.
const INTRO_SEGMENTS: { text: string; accent?: boolean }[] = [
  { text: 'Frontend / UI Developer working in' },
  { text: 'Vue.js and React.js.', accent: true },
  {
    text:
      '10+ years shaping enterprise and automotive platforms across the Middle East and Africa for brands like'
  },
  { text: "Nissan, Ford and INFINITI.", accent: true }
]

// One span per word is what the scroll wipe animates. Flattened at module
// scope rather than in the template so the markup stays a single v-for.
const INTRO_WORDS = INTRO_SEGMENTS.flatMap((segment) =>
  segment.text.split(' ').map((word) => ({ word, accent: !!segment.accent }))
)

// The slogan, typed out one character at a time under the bio. Its spacing
// lives inside the strings rather than between the spans on purpose: Vue
// condenses whitespace in the template, and a swallowed space would knock the
// caret a full character out of line with the text it is supposed to trail.
const SLOGAN_SEGMENTS: { text: string; class?: string }[] = [
  { text: 'Develop' },
  { text: ' * ', class: 'text-accent' },
  { text: "it's necessary", class: 'text-steel' }
]

// The typewriter advances in discrete character steps, so the step count has
// to be derived from the string. Hardcoding it would desync the caret from the
// text the first time a word here changes.
const SLOGAN_LENGTH = SLOGAN_SEGMENTS.reduce((total, s) => total + s.text.length, 0)

// The ball's home. It sits centred on the mark — `from` and `to` are the same
// point — so it is carried by the heading as that slides left rather than
// rolling along a 9vw rule, which at this length would be a twitch. The
// rotation it picks up is real: it comes from the mark travelling under it.
//
// The window runs from the very top of the page, so the ball is already in the
// headline before a single pixel of scroll. It ends well short of the hero's
// own end for a concrete reason: the mark travels a full viewport left, and by
// the hero's last third it has carried the ball off the left edge of the
// screen. Leaving after ~1.35 screens drops the ball while it is still in
// frame, and lands it near the left end of the rule it falls onto.
//
// Expressed as an offset from the start rather than as a fraction of the
// trigger: `bottom-=55%` reads as "earlier" and is not — it moves the viewport
// marker, which pushes the end *later*.
useBallPerch(() => markRef.value, {
  trigger: () => wrapRef.value,
  start: 'top top',
  end: () => `+=${Math.round(window.innerHeight * 1.35)}`,
  from: 0.5,
  to: 0.5,
  inset: 0
})

let mm: gsap.MatchMedia | null = null

onMounted(() => {
  if (!import.meta.client || !wrapRef.value) return

  // Intro, sequenced on one timeline. The reminder has to land only once the
  // heading has finished rising, and a hand-tuned delay would silently drift
  // out of sync the moment any duration or stagger below is touched — so the
  // heading's real end is captured as a label and the reminder hangs off it.
  const intro = gsap.timeline({ delay: 0.15 })

  // Both stacked copies start at position 0 so the ghost and the ink layer
  // rise in lockstep — staggering them relative to each other would offset
  // the two and smear the wipe on the first frame.
  wrapRef.value.querySelectorAll('.hero-layer').forEach((layer) => {
    const lines = layer.querySelectorAll('.hero-line')
    gsap.set(lines, { yPercent: 110 })
    intro.to(lines, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.08 }, 0)
  })

  // Guarded: the bio moved out of the pinned frame into its own block, so on
  // any build where the remaining .hero-fade elements are commented out this
  // is an empty NodeList and GSAP would warn about a targetless tween.
  const fades = wrapRef.value.querySelectorAll('.hero-fade')
  if (fades.length) {
    intro.from(
      fades,
      { opacity: 0, y: 16, duration: 0.8, ease: 'power2.out', stagger: 0.1 },
      0.35
    )
  }

  // Everything below is the pinned horizontal read, and it only exists on
  // desktop for visitors who haven't asked for reduced motion. matchMedia
  // reverts the whole block — tweens, ScrollTriggers and inline styles —
  // the moment the query stops matching, so a resize past the breakpoint
  // leaves the static layout genuinely untouched.
  mm = gsap.matchMedia()

  // The slogan types itself out when it scrolls up into view. Not gated on
  // `md` like the block below it — this one is a line of text rather than a
  // pinned read, and it works the same at any width — but still inside a
  // reduced-motion query, because a caret marching across the line is exactly
  // the kind of thing that query exists to switch off. Without it the CSS
  // leaves the slogan fully typed and the caret hidden.
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const slogan = sloganRef.value
    const ink = slogan?.querySelector<HTMLElement>('.hero-slogan-ink')
    const caret = slogan?.querySelector<HTMLElement>('.hero-slogan-caret')
    if (!slogan || !ink || !caret) return

    // One step per character. In IBM Plex Mono every glyph has the same
    // advance, so an evenly stepped clip lands precisely on glyph boundaries
    // and the caret — stepped over the same duration — sits exactly at the
    // edge of the character that just appeared.
    const ease = `steps(${SLOGAN_LENGTH})`
    const duration = SLOGAN_LENGTH * 0.055

    gsap
      .timeline({
        scrollTrigger: {
          trigger: slogan,
          start: 'top 88%',
          // Types once. A retrigger on every scroll-back would turn a
          // deliberate flourish into a tic.
          once: true
        }
      })
      // Solid, not blinking, while the characters land — the blink is what
      // the caret does when it is waiting, and during the type it isn't.
      .call(() => caret.classList.add('is-live'))
      .fromTo(
        ink,
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration, ease },
        0
      )
      // Measured in a function so a font swap or resize before the trigger
      // fires can't leave the caret typing to a stale width.
      .fromTo(caret, { x: 0 }, { x: () => ink.offsetWidth, duration, ease }, 0)
      .call(() => caret.classList.add('is-resting'))

    // matchMedia reverts tweens and inline styles on its own, but it has no
    // way to know about the two classes above — without this, turning on
    // reduced motion mid-session would leave a caret blinking at the start of
    // a line that is already fully typed.
    return () => caret.classList.remove('is-live', 'is-resting')
  })

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    // The intro's scroll wipe. The dimmed state is written here rather than in
    // CSS for the same reason the heading's clip is: if this never runs — no
    // JS, or reduced motion — the paragraph stays plainly readable instead of
    // sitting at 16% opacity forever.
    //
    // Gated on `md`, and the gate is about proportion, not about whether the
    // window is long enough to finish. It is: from the paragraph's top at 82%
    // of the viewport to its bottom at 58% measures `0.24 × viewport +
    // paragraph height`, ~570px on a phone, and the wipe does land.
    //
    // What breaks is what the reader sees on the way there. Every word starts
    // at 16%, and the paragraph is set at heading size — on a 390px screen it
    // is ~360px of a 844px viewport, so it enters the frame nearly blank and
    // is still part-dim once it is centred. Dim text at the head of a section
    // does not read as an effect, it reads as empty space, and this is the one
    // paragraph on the page that has to be read. Above `md` the same paragraph
    // is a much smaller share of the frame and the stagger reads as the wave
    // it is meant to be.
    //
    // Removing this gate on the theory that the window was the problem puts
    // the blank band straight back. It has been tried.
    const copy = introRef.value?.querySelector<HTMLElement>('.hero-intro-copy')
    const words = copy?.querySelectorAll('.hero-word')
    if (!copy || !words?.length) return

    gsap.fromTo(
      words,
      { opacity: 0.16 },
      {
        opacity: 1,
        // Linear, because the scrub already maps this to the scrollbar — an
        // ease here would fight the user's own scroll velocity.
        ease: 'none',
        // Overlapping rather than sequential: at a stagger shorter than the
        // duration, several words are mid-brighten at once, which reads as a
        // wave washing along the line instead of a cursor stepping word by
        // word.
        duration: 1,
        stagger: 0.45,
        scrollTrigger: {
          // The paragraph, not the section around it. The slogan below it
          // is part of that section, so triggering on the section would
          // stretch this window by the slogan's height and leave the last
          // words of the bio still dim well past the point they are read.
          trigger: copy,
          start: 'top 82%',
          // Finishes above the midline, so the last word lands while the
          // paragraph is still comfortably in frame rather than as it leaves.
          end: 'bottom 58%',
          scrub: 0.5
        }
      }
    )
  })

  // The pinned horizontal read, at every width. It used to be `md` and up, and
  // the phone got a static title card instead — a wrapped two-line heading that
  // filled a screen and then just sat there.
  //
  // Nothing here is width-aware, and that is deliberate: the phone runs the
  // identical timeline, and the only thing that differs is how much scroll it
  // is scrubbed against. That lives in one place — the spacer's height in the
  // template, 170vh against the desktop's 300vh — so the read is the same
  // motion, roughly twice as quick to get through. Putting the difference in a
  // second JS branch instead would be two timelines to keep in step.
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const wrap = wrapRef.value
    const track = trackRef.value
    // The padded element, not the frame: the gutter moved onto this when the
    // frame stopped carrying horizontal padding of its own.
    const pad = wrap?.querySelector<HTMLElement>('.hero-pad')
    const frame = wrap?.querySelector<HTMLElement>('.hero-frame')
    if (!wrap || !track || !pad || !frame) return

    // Read off the element rather than hardcoded. The gutter is px-5 on a phone
    // and md:px-8 above it, and the track has to clear it on both the entry and
    // the exit side — one constant was right for exactly one of the two widths,
    // which is fine while only that width ran this and isn't any more. Called
    // per refresh, so crossing the breakpoint re-resolves it.
    const gutter = () => parseFloat(getComputedStyle(pad).paddingLeft) || 0

    // Measured, never hardcoded: the heading's width follows a fluid font
    // size, so the travel distance is only knowable at runtime. offsetWidth
    // (rather than getBoundingClientRect) because it ignores the transform
    // GSAP is applying to this very element.
    const distance = () => Math.max(0, track.offsetWidth - window.innerWidth + gutter() * 2)

    // One shared config: the heading slides and fills from the same scrub,
    // so the ink can never drift out of step with the travel.
    //
    // The end used to be `bottom bottom`, which is the scroll position where
    // the spacer's foot meets the viewport's — i.e. `+=(spacer − viewport)`.
    // That is the right moment only while the frame is exactly a viewport
    // tall, because what actually ends the read is the frame *unsticking*, and
    // a sticky element does that when the spacer's foot meets its own foot:
    // `+=(spacer − frame)`. The two agree at 100vh and diverge by the
    // difference otherwise — a frame shorter than the screen would finish its
    // slide and then sit pinned and motionless for the remainder, which is the
    // dead scroll you feel rather than see.
    //
    // Written against the measured elements so it stays true at both widths;
    // `invalidateOnRefresh` re-resolves it when the breakpoint is crossed.
    const scrollTrigger = {
      trigger: wrap,
      start: 'top top',
      end: () => `+=${Math.max(1, wrap.offsetHeight - frame.offsetHeight)}`,
      scrub: 0.5,
      invalidateOnRefresh: true
    }

    gsap.fromTo(
      track,
      { x: 0 },
      { x: () => -distance(), ease: 'none', scrollTrigger }
    )

    // The real <h1> is revealed over the grey ghost underneath it. The
    // starting clip is set here rather than in CSS on purpose: if this
    // script never runs, the heading stays plainly visible instead of
    // being clipped to nothing.
    gsap.fromTo(
      track.querySelector('.hero-ink'),
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger }
    )
  })
})

onUnmounted(() => {
  mm?.revert()
})
</script>

<template>
  <div ref="wrapRef" class="hero-scroll h-[116vh] md:h-[300vh]">
    <header
      class="hero-frame sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-[70px] md:pt-0"
    >
      <div class="hero-pad w-full px-5 md:-translate-y-[6vh] md:px-8">
        <div ref="trackRef" class="hero-track relative grid w-max will-change-transform">
          <component
            :is="layer === 'ink' ? 'h1' : 'div'"
            v-for="layer in ['ghost', 'ink']"
            :key="layer"
            :aria-hidden="layer === 'ghost' ? 'true' : undefined"
            class="hero-layer col-start-1 row-start-1 flex flex-nowrap items-center gap-x-[6vw] font-display font-black uppercase leading-[0.92] tracking-tight text-[clamp(52px,16vw,110px)] motion-reduce:flex-wrap motion-reduce:gap-x-[0.25em] md:gap-x-[4vw] md:text-[clamp(80px,12vw,210px)]"
            :class="
              layer === 'ghost'
                ? 'flex text-hair motion-reduce:!hidden'
                : 'hero-ink text-ink'
            "
          >
            <span class="block overflow-hidden">
              <span class="hero-line block">Frontend</span>
            </span>

            <span
              class="hero-mark flex w-[14vw] shrink-0 flex-col justify-end md:w-[9vw]"
              aria-hidden="true"
            >
              <span
                :ref="layer === 'ink' ? (el) => (markRef = el as HTMLElement) : undefined"
                class="block h-px w-full bg-current opacity-25"
              />
            </span>

            <span class="block overflow-hidden">
              <span class="hero-line block">
                /
                <em
                  class="not-italic"
                  :class="layer === 'ghost' ? 'text-accent/20' : 'text-accent'"
                >UI</em>
                Developer
              </span>
            </span>
          </component>
        </div>
      </div>

      <div class="hero-cta mt-9 flex flex-wrap items-center gap-2.5 px-5 md:hidden">
        <a
          href="mailto:shejin.abu@gmail.com"
          class="inline-flex min-h-[46px] items-center rounded-full bg-ink px-5 font-data text-[13px] text-paper transition-colors hover:bg-accent-text"
        >
          Email me
        </a>
        <a
          href="/files/Shejin-Abux1.pdf"
          download="Shejin-Abu-CV.pdf"
          class="inline-flex min-h-[46px] items-center rounded-full border border-hair px-5 font-data text-[13px] text-ink transition-colors hover:border-ink"
        >
          Download CV
        </a>
      </div>
    </header>
  </div>

  <section ref="introRef" class="hero-intro" aria-label="Introduction">
    <p class="hero-intro-copy">
      <span
        v-for="(item, i) in INTRO_WORDS"
        :key="`${i}-${item.word}`"
        class="hero-word"
        :class="{ 'hero-word--accent': item.accent }"
      >{{ item.word }}</span>
    </p>

    <p ref="sloganRef" class="hero-slogan">
      <span class="hero-slogan-line">
        <span class="hero-slogan-ink"><span
          v-for="(segment, i) in SLOGAN_SEGMENTS"
          :key="i"
          :class="segment.class"
        >{{ segment.text }}</span></span>
        <span class="hero-slogan-caret" aria-hidden="true" />
      </span>
    </p>
  </section>
</template>

<style scoped>
/* Mobile only, and an override of the `h-screen` in the template rather than a
   refinement of it.

   A full screen is the wrong frame for this composition on a phone. What it
   holds is one line of heading and a button row — about 140px — so a 844px
   frame is 700px of air whichever end it is put at: centred it sits above the
   headline, biased upward it piles below and reads as a void between the hero
   and the bio. There is no split of 700px that reads as anything but a gap;
   the only answer is for the frame to stop being a screen.

   50svh is that frame sized to its contents: the nav's 70px of clearance, the
   140px it holds, and ~110px to close on. The consequence is deliberate and
   worth stating, because it is the thing that looks like a bug if it is not
   expected — a frame shorter than the viewport cannot fill it while pinned, so
   for `viewport − frame` of scrolling the bio is on screen underneath the
   headline while the headline is still sliding. That is not dead space; it is
   the space the gap used to be.

   Shortening it is only safe because the scrub's end is measured off this
   element — see `scrollTrigger` in <script>. Against the old `bottom bottom`
   the heading would finish sliding and then hold, pinned and still, for the
   ~300px between the two.

   `svh` is the small viewport — the height with the URL bar *out* — so the
   frame holds rather than being cropped when it is. The vh line above it is
   the fallback for engines without `svh`, which is why this is plain CSS and
   not a Tailwind arbitrary value. */
@media (max-width: 767px) {
  .hero-frame {
    height: 50vh;
    height: 50svh;
  }

  /* The hero already closes on ~110px of its own air, so the section's usual
     opening pad would be stacking a second gap on top of a first. Above `md`
     it stays as it was — there the hero ends on a screen of deliberate air and
     this is the only thing separating the two. */
  .hero-intro {
    padding-top: 1rem;
  }
}

/* No pinned read here, so everything that only exists to serve one is dead
   weight: the spacer is a screen and a half of empty scrolling, and the track
   is a nowrap heading clipped to whatever fits — which is "Frontend" and
   nothing else. Unwinding it back to an ordinary block is the whole fallback.

   This was already the case above `md` and had no answer: the spacer height
   and the sticky frame were plain CSS while the timeline that used them was
   behind a `no-preference` query, so a desktop visitor with reduced motion on
   got three viewports of a stuck, half-clipped headline. It only became
   visible once the phone started running the same markup. */
@media (prefers-reduced-motion: reduce) {
  .hero-scroll {
    height: auto;
  }

  .hero-frame {
    position: static;
    height: auto;
    padding-top: 130px;
    padding-bottom: 2.5rem;
  }

  .hero-pad {
    transform: none;
  }

  .hero-track {
    width: 100%;
  }

  /* Nothing to punctuate once the heading wraps to two lines. */
  .hero-mark {
    display: none;
  }
}

/* Asymmetric, because what sits above and below is not symmetric. The pinned
   frame already ends on a screen's worth of air — the heading is lifted 6vh
   off centre, so the bottom of the hero is empty — and stacking a 14vh pad on
   top of that read as a gap rather than as breathing room. The lower pad stays
   larger: below it is Projects, which starts straight into its own heading. */
.hero-intro {
  padding: clamp(1.5rem, 4vh, 3rem) 0 clamp(3.5rem, 9vh, 6.5rem);
}

.hero-intro-copy {
  margin: 0 auto;
  max-width: 1080px;
  padding: 0 1.25rem;
  text-align: center;
  font-family: theme('fontFamily.display');
  font-size: clamp(26px, 3.2vw, 46px);
  /* Not the 900 the h1 runs at. This is a paragraph read at heading size, and
     at black weight it would compete with the wordmark above it. */
  font-weight: 500;
  line-height: 1.28;
  letter-spacing: -0.02em;
  text-wrap: pretty;
}

/* inline-block is what lets each word take its own opacity while still
   wrapping as normal text. The margin replaces the collapsed whitespace
   between spans, in `em` so it tracks the fluid size. */
.hero-word {
  display: inline-block;
  margin-right: 0.24em;
}

/* `accent-text` (#CC3D10, 5:1) rather than `accent` (#FF4A1F, 3.4:1). At this
   size 3:1 would pass, but the paragraph starts dimmed and 3.4:1 has nothing
   left to give once opacity comes off it. */
.hero-word--accent {
  color: theme('colors.accent-text');
}

.hero-slogan {
  display: flex;
  justify-content: center;
  margin: clamp(1.75rem, 4.5vh, 3.25rem) 0 0;
  padding: 0 1.25rem;
  color: theme('colors.ink');
}

/* Shrink-wraps the text so the caret, which is positioned against this box,
   has a right edge to travel to. The line as a whole is what gets centred —
   the type itself still runs left to right inside it, which is why the
   composition doesn't slide sideways as characters land. */
.hero-slogan-line {
  position: relative;
  display: inline-flex;
}

.hero-slogan-ink {
  font-family: theme('fontFamily.data');
  font-size: clamp(15px, 1.9vw, 24px);
  text-transform: uppercase;
  /* Uniform across every glyph, so it stretches the monospace grid without
     breaking it — the stepped clip still lands on character boundaries. */
  letter-spacing: 0.06em;
  /* `pre`, not `nowrap`: the spaces that separate the three segments are
     load-bearing here. Collapsing one would shorten the grid the caret is
     stepping along. */
  white-space: pre;
}

/* Hidden until the typewriter claims it, so the line reads as finished text
   rather than as a stalled prompt when the animation never runs. */
.hero-slogan-caret {
  position: absolute;
  left: 0;
  top: 0.1em;
  bottom: 0.1em;
  width: 2px;
  background: theme('colors.accent');
  opacity: 0;
}

.hero-slogan-caret.is-live {
  opacity: 1;
}

/* Only once the last character has landed. A caret that blinks while it is
   still typing reads as a rendering fault rather than as a cursor. The
   animation overrides `.is-live`'s opacity by cascade, so both classes stay
   on the element. */
.hero-slogan-caret.is-resting {
  animation: hero-caret-blink 1.1s steps(1) infinite;
}

@keyframes hero-caret-blink {
  0%,
  50% {
    opacity: 1;
  }
  50.01%,
  100% {
    opacity: 0;
  }
}
</style>
