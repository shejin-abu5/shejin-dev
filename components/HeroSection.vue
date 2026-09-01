<script setup lang="ts">
import { gsap } from 'gsap'
import { useBallPerch } from '~/composables/useScrollBall'
import { whenPageReady } from '~/composables/usePageReady'

const wrapRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const markRef = ref<HTMLElement | null>(null)
const introRef = ref<HTMLElement | null>(null)
const sloganRef = ref<HTMLElement | null>(null)

// The bio, cut into runs so the two concrete claims in it — the stack and the
// region — can carry the accent while the prose around them stays ink. Two
// highlights rather than one: they are the only load-bearing facts in the
// sentence, and colouring the adjectives instead would be decoration.
//
// A third run naming the client brands used to sit at the end, commented out.
// It is gone rather than left dormant: the site no longer names them anywhere
// in prose — see the meta description in app.vue and the Experience bullet —
// and a commented-out line is the one form of that copy nobody thinks to
// update when the decision changes.
const INTRO_SEGMENTS: { text: string; accent?: boolean }[] = [
  { text: 'Frontend / UX Developer working in' },
  { text: 'Vue.js and React.js.', accent: true },
  {
    text:
      '12+ years shaping enterprise and automotive platforms across the'
  },
  { text: 'Middle East and Africa regions.', accent: true }
]

// One span per word is what the scroll wipe animates. Flattened at module
// scope rather than in the template so the markup stays a single v-for.
const INTRO_WORDS = INTRO_SEGMENTS.flatMap((segment) =>
  segment.text.split(' ').map((word) => ({ word, accent: !!segment.accent }))
)

// The line at the head of the section. "Love to" is fixed and the verb after
// it changes on its own — see the swap in onMounted.
//
// Written in sentence case and uppercased in CSS, the same way the bio's
// accent runs are: the casing is a property of how this line is set, not of
// the words, and putting it in the strings would mean re-typing them to
// change it.
//
// Each has to complete the lead on its own, which is the whole constraint on
// what can go in here. They are read aloud as one sentence — see the
// screen-reader line in the template — so a fragment that only works in a
// list would come out of a screen reader as broken English.
const LOVE_LEAD = 'Obsessed to'
const LOVE_WORDS = ['problems', 'solve', 'execute', 'ship', 'football']

// How long a verb sits still, and how long it takes to change.
//
// The hold is the number that matters and 2.4s is longer than it looks on a
// stopwatch: this is three words on a loop directly above the one paragraph
// on the page that has to be read, so it has to be legible at a glance and
// then stay out of the way. Quicker and it pulls the eye back off the bio
// every couple of seconds, which is the failure mode of every rotating
// headline on the web.
//
// The move is short against it on purpose. A slow swap reads as the thing
// being animated; a quick one reads as the word simply having changed, which
// is what this is for.
const LOVE_HOLD = 2.4
// One leg of the change — the old word leaving, or the new one arriving. A
// change costs two of these, because they run one after the other rather than
// together; see the note on the tweens.
const LOVE_MOVE = 0.3

// How far a word travels as it changes, in px.
//
// A fixed distance rather than a fraction of the line, and small — the word
// steps aside and the new one steps in, and the fade is what carries the
// change. It is the figure the reference carousel uses (motion's `y: 20` on
// enter and `y: -20` on exit), and it is px rather than a percentage for the
// same reason it is there: at 34px type a percentage of the line box would put
// the travel near 46px, which is a throw rather than a step.
//
// This has been a full line, which needed a window to hide the parts that had
// left, and a third of a line with no window, which let the two words cross
// over mid-air and read as a smudge. Neither problem exists at this distance
// because the words are never on screen at the same time.
const LOVE_SLIDE = 20

// Where along the frame the mark has to still be when it hands the ball over.
// Wide enough to clear TheScrollBall's own FADE_PX band at the left edge, so
// the ball leaves the headline at full strength rather than as a sliver, with
// the floor covering the narrowest viewport the journey runs at.
const HERO_LEAVE_X = () => Math.max(0.2 * window.innerWidth, 210)

// And how far left the *fall* may still be dragged by the mark after that.
//
// The hop launches from wherever the mark currently is, which is what carries
// the ball's leftward roll into the air instead of stopping it dead at the
// handover. It works because the mark is normally still in frame — but the mark
// travels `track.offsetWidth - innerWidth + gutter*2`, and the narrower the
// viewport the larger that is relative to the frame: at 1280×800 it is 1176px
// in a 1280px frame, so the mark finishes at x=-119 and took the ball with it,
// off the edge at zero opacity for 240px of scroll. Held here, the follow-
// through survives and the launch point simply stops when the mark has nothing
// left to give.
const HERO_HOLD_X = () => Math.max(0.09 * window.innerWidth, 120)

/**
 * The stretch of the phone's pinned read during which the headline does not
 * move, as fractions of that read.
 *
 * This is the "delay" the volley needs, and it is a hold on the *motion* rather
 * than on the scrollbar. Blocking touch scroll for a second would do what it
 * says on Android and stutter against momentum scrolling on iOS, and it traps
 * anyone who simply wants past the hero. Freezing the headline instead costs the
 * reader nothing — the page still answers the finger — and it buys the same
 * thing the lock was for, which is a strike that happens against a still frame
 * instead of one sliding out from under it.
 *
 * Desktop has no equivalent and wants none: there the read is a third longer in
 * absolute scroll and the ball is handed to a journey that carries on down the
 * page, so there is nothing to pause for.
 */
const HOLD_FROM = 0.24
const HOLD_TO = 0.56

/**
 * How much scroll the hero allows before the volley fires.
 *
 * Owned here rather than in ThePlayer — which is where it used to live as a flat
 * 90 — because on the phone it has to agree with the hold above, and the hold is
 * this component's. Expressed as a fraction of the pinned read rather than in
 * px so the two cannot disagree at any viewport height: 90px is a quarter of a
 * short phone's read and a seventh of a tall one's, and the strike would have
 * drifted out of the still band on one of them.
 *
 * Just inside the hold, so the headline has already come to rest by the time he
 * swings. The desktop number is unchanged.
 */
const volleyAt = () => {
  if (window.innerWidth >= 768) return 90
  const wrap = wrapRef.value
  const frame = wrap?.querySelector<HTMLElement>('.hero-frame')
  if (!wrap || !frame) return 90
  const pinned = Math.max(1, wrap.offsetHeight - frame.offsetHeight)
  return Math.round(pinned * (HOLD_FROM + 0.04))
}

/**
 * The scroll at which the mark's centre reaches HERO_LEAVE_X, as a ScrollTrigger
 * end offset. Re-invoked on every refresh, so a resize re-resolves it.
 *
 * Every term is measured off the same elements the slide itself is measured off
 * — see `distance` in the pinned read below — because the slide is what this is
 * describing. offsetWidth/offsetLeft rather than getBoundingClientRect for the
 * usual reason: they ignore the transform GSAP has on the track, so this reads
 * the untransformed layout whatever the page has scrolled to.
 */
const heroPerchEnd = () => {
  const wrap = wrapRef.value
  const track = trackRef.value
  const mark = markRef.value
  const frame = wrap?.querySelector<HTMLElement>('.hero-frame')
  const pad = wrap?.querySelector<HTMLElement>('.hero-pad')
  if (!wrap || !track || !mark || !frame || !pad) return `+=${Math.round(window.innerHeight)}`

  const scrub = Math.max(1, wrap.offsetHeight - frame.offsetHeight)
  const gutter = parseFloat(getComputedStyle(pad).paddingLeft) || 0
  const distance = Math.max(1, track.offsetWidth - window.innerWidth + gutter * 2)
  // The track is the mark's offsetParent (it is the `relative` box), and it
  // starts flush with the gutter, so this is the mark's centre before the
  // slide has moved it.
  const startX = gutter + mark.offsetLeft + mark.offsetWidth / 2
  // Floored, so a viewport wide enough that the mark never reaches the leave
  // point still gives the ball a headline to ride rather than no window at all.
  const frac = gsap.utils.clamp(0.35, 1, (startX - HERO_LEAVE_X()) / distance)
  return `+=${Math.round(scrub * frac)}`
}

// The ball's home. It sits centred on the mark — `from` and `to` are the same
// point — so it is carried by the heading as that slides left rather than
// rolling along a 9vw rule, which at this length would be a twitch. The
// rotation it picks up is real: it comes from the mark travelling under it.
//
// The window runs from the very top of the page, so the ball is already in the
// headline before a single pixel of scroll. It ends well short of the hero's
// own end for a concrete reason: the mark travels a full viewport left, and by
// the hero's last third it has carried the ball off the left edge of the
// screen.
//
// One screen, not the 1.35 this used to be. The mark reaches the left edge at
// almost exactly a screen of scroll, and the extra third bought nothing but a
// dead stretch: measured, the ball spent 350px of scroll parked at x=1 — a
// sliver at 13% opacity, pinned against the edge, not rolling, while the page
// went on scrolling underneath it. Ending here drops the ball while the mark
// is still in frame, which is what the fall is supposed to launch from, and
// hands those 350px to the fall onto the rule below instead.
//
// Expressed as an offset from the start rather than as a fraction of the
// trigger: `bottom-=55%` reads as "earlier" and is not — it moves the viewport
// marker, which pushes the end *later*.
//
// And derived rather than declared, because "a screen of scroll" is not what
// this end is about. What it is about is the mark reaching the left edge, and
// how much scroll that takes is set by the mark's travel — a fluid heading
// width against the viewport — which no fraction of viewport *height* tracks.
// One screen was right at 1920×1080 and wrong at 1280×800, where the same rule
// rode the ball to x=-75 and held it off-screen at zero opacity for 400px of
// scroll before the fall had even started. Below is the scroll at which the
// mark's centre reaches HERO_LEAVE_X, from the same geometry the scrub itself
// is measured against, so the two cannot drift apart.
useBallPerch(() => markRef.value, {
  trigger: () => wrapRef.value,
  start: 'top top',
  end: heroPerchEnd,
  from: 0.5,
  to: 0.5,
  inset: 0,
  // The fall off the mark is the longest crossing on the page and the only one
  // that has to clear a whole section — the bio and the slogan sit between the
  // headline and Selected Work's rule — so it is the one perch that has to ask
  // for more than the ball's default rather than less. Every other use of
  // `fall` on the site shortens a hop; this one lengthens it.
  //
  // Left at the default 0.3vh it got 324px of scroll to cover ~1100px of
  // descent. Measured at 1920×1080: the ball accelerated to 2.5px of drop per
  // px of scroll, hit the cap that stops a fall aiming below the frame, then
  // jumped 540px in a single frame onto a rule that was still 500px under the
  // fold — and stayed invisible for the next ~600px of scroll while that rule
  // climbed into view. The cap is written on the assumption that a perch's
  // window opens once its surface is in frame; the run from here to the
  // experience chart is scroll-tight enough that layout() was handing the rule
  // over ~620px before its own `top 88%` said to, which is what breaks that
  // assumption.
  //
  // 1.3 is not a free choice. The document gap from the mark to that rule is
  // ~1760px and the ball starts the fall not quite half a screen down, so it
  // has ~560px of frame to descend through — which fixes the scroll at no less
  // than 1200px if the landing is to happen in frame at all, and a little more
  // than that if it is to happen clear of the bottom fade band. Crossings are
  // paid before rolls, so it comes out of the slack the rolls in between
  // declared on top of what they need, not out of how much of any surface the
  // ball rides: measured after, every `ride` in the run is still 1.
  fall: 1.3,
  // Live, and only floored — not pinned. Stating a fixed exit here would stop
  // the ball's leftward roll dead at the handover, a 1.34px/px roll becoming a
  // 0.27px/px drift between one frame and the next. Tracking the mark keeps the
  // follow-through; the floor keeps it in frame. See HERO_HOLD_X.
  exitX: () => {
    const mark = markRef.value
    if (!mark) return HERO_HOLD_X()
    const r = mark.getBoundingClientRect()
    return Math.max(r.left + r.width / 2, HERO_HOLD_X())
  },
  // Measured against the sticky frame rather than the viewport, which is what
  // makes it a constant: while the frame is pinned its own top is 0 and this is
  // just the mark's height on screen; once it unpins both tops fall together
  // and the difference is unchanged. So it answers "how high was the ball when
  // it left the headline" at any scroll position, including the ones long past
  // the point the headline itself has gone.
  exitY: () => {
    const mark = markRef.value
    const frame = wrapRef.value?.querySelector('.hero-frame')
    if (!mark) return 0
    const top = mark.getBoundingClientRect().top
    return frame ? top - frame.getBoundingClientRect().top : top
  }
})

let mm: gsap.MatchMedia | null = null

onMounted(() => {
  if (!import.meta.client || !wrapRef.value) return

  // Intro, sequenced on one timeline. The reminder has to land only once the
  // heading has finished rising, and a hand-tuned delay would silently drift
  // out of sync the moment any duration or stagger below is touched — so the
  // heading's real end is captured as a label and the reminder hangs off it.
  //
  // Built paused and released by the loader — see composables/usePageReady.ts.
  // Playing it on mount instead is the obvious version and it is wrong now that
  // there is a loading screen: this is a clock, not a scrub, so it would run to
  // completion under the overlay and the reader would arrive at a hero that had
  // already finished. Nothing else here needs the gate, because everything else
  // is scroll-driven and a reader cannot scroll past a loader.
  //
  // `from` tweens still render their start values immediately on a paused
  // timeline — that is GSAP's `immediateRender` default and it is what this
  // relies on. Without it the fades below would sit at full opacity until the
  // gate lifted and then snap to zero to begin, which is a flash in the one
  // frame the overlay stops covering.
  const intro = gsap.timeline({ delay: 0.15, paused: true })
  whenPageReady(() => intro.play())

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
  // desktop. matchMedia reverts the whole block — tweens, ScrollTriggers and
  // inline styles — the moment the query stops matching, so a resize past the
  // breakpoint leaves the static layout genuinely untouched.
  //
  // The reduced-motion half of these queries is gone on purpose; the reasoning
  // lives on BALL_QUERY in composables/useScrollBall.ts.
  mm = gsap.matchMedia()

  // The verb changes on a loop of its own, and the line slides so that the
  // word — not the box around it — is what sits in the middle of the page.
  // `all` rather than a width: this is a line of text rather than a pinned
  // read and it works the same everywhere, but it is still an `mm.add`,
  // because that is what reverts the tweens and their inline styles on
  // unmount.
  //
  // The centring is the part worth explaining, and it has been wrong twice.
  //
  // Sizing the slot by the grid makes it as wide as the longest word and
  // leaves the short ones hanging at its left edge: measured at 1280, the box
  // was dead centre but with "ship" showing the ink sat 112px left of it,
  // because 224px of empty slot was being centred along with the words.
  //
  // Animating the slot's width to each word in turn fixes that and buys two
  // worse problems. The box is narrower than the wider of the two words for
  // most of every transition, and `overflow: hidden` then cuts that word off
  // mid-slide — measured at 23px to 45px of it, depending on the pair. And
  // `width` is a layout property, so every frame of the tween reflowed the
  // centred line and re-rasterised the lead, the separator and both words at
  // sub-pixel offsets, which is the shimmer that came with it.
  //
  // So the slot keeps its full width and never moves, and the whole line is
  // translated by half the slack instead: with the word left-aligned in a slot
  // of width W, shifting the line by (W - w) / 2 puts the ink dead centre. It
  // is a transform, so it composites rather than reflowing, and the slot is
  // never narrower than the word inside it, so there is nothing to clip.
  //
  // The cost is unchanged from the previous attempt: "Love to" glides a little
  // as the word changes. A line this size cannot be both optically centred and
  // pinned at the left, because the two ask for opposite things whenever the
  // words are different lengths.
  mm.add('all', () => {
    const slogan = sloganRef.value
    const line = slogan?.querySelector<HTMLElement>('.hero-slogan-line')
    const swap = slogan?.querySelector<HTMLElement>('.hero-slogan-swap')
    const words = slogan?.querySelectorAll<HTMLElement>('.hero-slogan-word')
    if (!slogan || !line || !swap || !words?.length) return

    let tl: gsap.core.Timeline | null = null
    let visible = false

    // Rebuilt rather than retuned when the measurements move, because every
    // offset in the timeline is a number baked in at build time. The font-size
    // is a vw clamp and the face is a webfont, so both a resize and the font
    // finishing loading change what these should be.
    const build = () => {
      tl?.kill()

      // Measured with any previous shift cleared, so the rects are the ones
      // the layout would give rather than the ones the last cycle left.
      gsap.set(line, { clearProps: 'transform' })
      const widths = Array.from(words, (word) => word.getBoundingClientRect().width)
      const slot = swap.getBoundingClientRect().width
      // Half the empty slot to the right of the word, which is exactly what
      // the line has to move right by to put that word in the middle.
      const shift = (i: number) => (slot - widths[i]) / 2

      // Every word starts a step low and the first is brought up onto the line,
      // so it reads correctly on the first frame, before the loop has run.
      gsap.set(words, { y: LOVE_SLIDE, opacity: 0 })
      gsap.set(words[0], { y: 0, opacity: 1 })
      gsap.set(line, { x: shift(0) })

      // Paused, and started by the observer below rather than here.
      tl = gsap.timeline({ repeat: -1, paused: true })

      // One hold-then-move per word, wrapping so the last hands back to the
      // first. `fromTo` on the incoming word rather than `to` is what makes
      // the loop seamless: it re-states the below-the-slot position at the top
      // of every cycle, so the repeat has nothing left over from the last one.
      words.forEach((word, i) => {
        const j = (i + 1) % words.length
        const j2 = j
        // A change costs two legs, so a word's slot on the timeline is its hold
        // plus both of them.
        const at = i * (LOVE_HOLD + LOVE_MOVE * 2) + LOVE_HOLD

        // Out first, and all the way out, before the new one starts coming in.
        //
        // This is the reference's `AnimatePresence mode="wait"`: only one word
        // is ever mounted, so the exit has to finish before the enter begins.
        // Sequencing them the same way here buys the same three things it does
        // there — the words can never overlap, so there is no smudge to design
        // around; they never travel far enough to leave the box, so there is no
        // window and nothing to clip; and the line is briefly wordless, which is
        // the beat that makes it read as a word being replaced rather than two
        // words dissolving.
        tl!
          // `power1.inOut` is the closest GSAP has to motion's default
          // `easeInOut` for a tween given an explicit duration, which is what
          // the reference leaves it at.
          .to(word, { y: -LOVE_SLIDE, opacity: 0, duration: LOVE_MOVE, ease: 'power1.inOut' }, at)
          .fromTo(
            words[j2],
            { y: LOVE_SLIDE, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: LOVE_MOVE,
              ease: 'power1.inOut',
              // Without this the from-state is written the moment the tween is
              // built, paused timeline or not — so every word would be parked a
              // step low at zero opacity and the line would render empty until
              // the loop first ran. The last word wraps to the first, so the one
              // it blanks is the one meant to be showing.
              immediateRender: false
            },
            at + LOVE_MOVE
          )
          // Across both legs rather than either one, so the recentring is a
          // single glide underneath the whole change. It has to be smooth even
          // though the word is away for part of it, because the lead and the
          // separator are on screen throughout and they move with it.
          .to(line, { x: shift(j2), duration: LOVE_MOVE * 2, ease: 'power1.inOut' }, at)
      })
    }

    const restart = () => {
      build()
      if (visible) tl?.play()
    }

    build()

    // Only while it is on screen. This is the one animation on the page that
    // nobody asked for by scrolling or clicking, and the hero above it is two
    // viewports tall — so left running it would spend a timer and a paint per
    // frame on a line that is nowhere near the frame. Same reasoning, and the
    // same margin, as the tool lattice in SkillsSection.vue.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        visible ? tl?.play() : tl?.pause()
      },
      { rootMargin: '120px' }
    )
    io.observe(slogan)

    // The first build runs against whatever face is up at the time, which on a
    // cold load is the fallback — and a fallback mono is not the same width as
    // Plex, so the line would hold the wrong offsets for the rest of the
    // session.
    document.fonts?.ready.then(restart)

    // Debounced, because the font-size is a vw clamp: every pixel of a drag
    // changes the widths, and rebuilding per event would kill and re-create
    // the timeline a hundred times across one resize.
    let resizeAt: number | undefined
    const onResize = () => {
      window.clearTimeout(resizeAt)
      resizeAt = window.setTimeout(restart, 150)
    }
    window.addEventListener('resize', onResize)

    return () => {
      io.disconnect()
      window.removeEventListener('resize', onResize)
      window.clearTimeout(resizeAt)
      tl?.kill()
      gsap.set(line, { clearProps: 'transform' })
    }
  })

  mm.add('(min-width: 768px)', () => {
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
          // The paragraph, not the section around it. The "Love to" line above
          // it is part of that section, so triggering on the section would
          // stretch this window by that line's height and leave the last
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
  // template, 166vh against the desktop's 200vh — so the read is the same
  // motion, quicker to get through on the phone. Putting the difference in a
  // second JS branch instead would be two timelines to keep in step.
  //
  // What matters is the spacer minus the frame, since that difference is what
  // the scrub is mapped over: 100vh of pinned scroll on desktop, ~66vh on the
  // phone. Raising the spacer does not slow the slide down so much as stretch
  // the same travel over more wheel, which is what reads as dead scroll.
  // Two arms rather than the single `all` this was, and the `any: 'all'` member
  // is load-bearing: a gsap.matchMedia given a conditions object runs only while
  // at least one of them matches, so a set of purely max-width arms would leave
  // the desktop with no pinned read at all. `any` is the arm that is always
  // true; `phone` is the one that is read.
  mm.add({ phone: '(max-width: 767.98px)', any: 'all' }, (ctx) => {
    const phone = !!ctx.conditions?.phone
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

    // One window, two scrubs. The slide and the fill are mapped over the same
    // stretch of scroll — same trigger, same start, same end — so they cannot
    // disagree about where the read begins or ends, and both are exact at both
    // ends. What differs is how hard each one is filtered on the way through,
    // and that difference is the effect: the ink is given a longer catch-up
    // than the track, so the colour trails the letters while the wheel is
    // turning and settles onto its true position a moment after it stops.
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
    const read = (scrub: number) => ({
      trigger: wrap,
      start: 'top top',
      end: () => `+=${Math.max(1, wrap.offsetHeight - frame.offsetHeight)}`,
      scrub,
      invalidateOnRefresh: true
    })

    // Seconds of catch-up, not durations: a numeric scrub is how long GSAP
    // takes to ease onto the position the scrollbar is asking for.
    //
    // The track keeps the 0.5 it has always had, and the stylesheet's note
    // about `scrub` trading judder against the headline lagging the scroll is
    // about this number specifically — raising it moves the *type*, and type
    // that arrives late reads as the page being slow to answer. The ink's is
    // deliberately laggier, and it can be, because a soft-edged wipe arriving
    // late does not read as lag at all: there is no hard boundary to measure
    // the delay against, so it reads as the colour soaking into the letters a
    // beat behind them rather than as the page dragging.
    const TRACK_SCRUB = 0.5
    const INK_SCRUB = 1.2

    // The real <h1> is inked in over the grey ghost underneath it. The starting
    // value is set here rather than in CSS on purpose: if this script never
    // runs, the heading stays plainly visible instead of being masked to
    // nothing.
    const ink = track.querySelector('.hero-ink') as HTMLElement | null

    // How wide the fade at the head of the wipe is, in the percent-of-the-track
    // units the fill itself runs in. Read off the element rather than repeated
    // here, so `.hero-ink` in the stylesheet stays the one place it is set —
    // the same reason the gutter is read off .hero-pad rather than hardcoded.
    const soft = ink ? parseFloat(getComputedStyle(ink).getPropertyValue('--fill-soft')) || 0 : 0

    // The fill runs from -soft to 100 rather than 0 to 100, because the mask's
    // two stops are `--fill` and `--fill + --fill-soft`: at -soft the trailing
    // stop sits on the track's left edge and none of it is inked, and at 100 the
    // leading stop sits on its right edge and all of it is. Both ends have to be
    // exact — the track's right edge is still on screen when the read finishes,
    // so an end of 100 would leave the last word under the fade.
    const fillAt = (p: number) => -soft + p * (100 + soft)

    if (!phone) {
      gsap.fromTo(
        track,
        { x: 0 },
        { x: () => -distance(), ease: 'none', scrollTrigger: read(TRACK_SCRUB) }
      )

      gsap.fromTo(
        ink,
        { '--fill': fillAt(0) },
        { '--fill': fillAt(1), ease: 'none', scrollTrigger: read(INK_SCRUB) }
      )
      return
    }

    // The phone runs the same slide with a hold cut into the middle of it.
    //
    // Two timelines rather than the one this was, because the slide and the
    // fill now scrub at different rates and a timeline carries one scrub. They
    // are still not two independent readings of the hold: both are laid out
    // from the same HOLD_FROM/HOLD_TO below, so the stillness falls at the same
    // fraction of the read in each and the only thing between them is the ink's
    // catch-up. Writing the ink's positions as second copies of those numbers
    // instead is what would put them at risk of coming apart.
    //
    // The travel is split in the same proportion as the two moving stretches,
    // which is what keeps the headline's speed identical either side of the
    // pause. Split it evenly instead and the second half runs at a different
    // rate to the first, so the hold reads as a gear change rather than as a
    // held beat.
    const moving = HOLD_FROM + (1 - HOLD_TO)
    const before = HOLD_FROM / moving

    // The hold, and it goes in both timelines. An empty tween, because a gap in
    // a timeline is not a pause — a scrub interpolates across unoccupied time
    // exactly as if it were not there, so the stillness has to be something the
    // timeline is actually doing. A factory rather than one shared object: two
    // tweens handed the same vars is a mutation waiting to happen.
    const hold = () => ({ duration: HOLD_TO - HOLD_FROM })

    // Positions and durations below are fractions of the whole read, and each
    // timeline's add to exactly 1 — a scrub maps the scroll window onto
    // whatever duration the timeline happens to have, so a total of anything
    // else silently rescales every number here. That is why the ink carries the
    // hold too: an ink timeline built from only its two moving stretches would
    // total `moving`, stretch to fill the same window, and run at a different
    // rate to the slide rather than a fixed beat behind it.
    gsap
      .timeline({ scrollTrigger: read(TRACK_SCRUB) })
      .fromTo(
        track,
        { x: 0 },
        { x: () => -distance() * before, ease: 'none', duration: HOLD_FROM },
        0
      )
      .to({}, hold(), HOLD_FROM)
      .to(track, { x: () => -distance(), ease: 'none', duration: 1 - HOLD_TO }, HOLD_TO)

    gsap
      .timeline({ scrollTrigger: read(INK_SCRUB) })
      .fromTo(
        ink,
        { '--fill': fillAt(0) },
        { '--fill': fillAt(before), ease: 'none', duration: HOLD_FROM },
        0
      )
      .to({}, hold(), HOLD_FROM)
      .to(ink, { '--fill': fillAt(1), ease: 'none', duration: 1 - HOLD_TO }, HOLD_TO)
  })

  // The phone's spinning orb used to live here, and the player has taken its
  // job. Both existed to stop the phone hero being a headline on an empty
  // screen, and only one of them can: they are both a large orange sphere in
  // the middle of the same frame, and two of those is one too many.
  //
  // The player is the better answer to the same problem for the reason the orb
  // never quite settled — the note that replaced its CSS loop with a scrub is
  // right that a sphere turning on a timer reads as a spinner, and scrubbing it
  // only meant the top of the page was motionless until someone scrolled. A
  // figure keeping a ball up is doing something either way, and the ball he is
  // juggling is the same ball the rest of the page rides. See ThePlayer.vue.
})

onUnmounted(() => {
  mm?.revert()
})
</script>

<template>
  <!-- 230vh on the phone against the desktop's 200. What the scrub is mapped
       over is `spacer − frame`, so this is 130vh of pinned scroll where it used
       to be 66 — and the extra is spent on two things rather than one: the
       headline's slide is stretched over about a third more wheel, and the hold
       in the middle of it (see HOLD_FROM/HOLD_TO) buys the volley a stage that
       is not moving. The file's standing warning about a taller spacer reading
       as dead scroll is about raising it with nothing to fill it; here the
       thing that fills it is the strike. -->
  <div ref="wrapRef" class="hero-scroll h-[230vh] md:h-[200vh]">
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
            class="hero-layer col-start-1 row-start-1 flex flex-nowrap items-center gap-x-[6vw] font-display font-black uppercase leading-[0.92] tracking-tight text-[clamp(52px,16vw,110px)] md:gap-x-[4vw] md:text-[clamp(80px,12vw,210px)]"
            :class="layer === 'ghost' ? 'flex text-hair' : 'hero-ink text-ink'"
          >
            <span class="block overflow-hidden">
              <span class="hero-line block">Shejin Abu</span>
            </span>

            <span
              class="hero-mark flex w-[14vw] shrink-0 flex-col justify-end md:w-[9vw]"
              aria-hidden="true"
            >
              <!-- Invisible on the phone, not absent: the rule is the ball's
                   perch and the player's aim, and everything about that is
                   measured off this box (offsetLeft/Width in heroPerchEnd, the
                   rect in exitX/exitY). Hidden with opacity rather than
                   `md:block`, so the geometry the scrub and the volley are
                   built on is the same at every width. -->
              <span
                :ref="layer === 'ink' ? (el) => (markRef = el as HTMLElement) : undefined"
                class="block h-px w-full bg-current opacity-0 md:opacity-25"
              />
            </span>

            <span class="block overflow-hidden">
              <span class="hero-line block">
                /
                <em
                  class="not-italic"
                  :class="layer === 'ghost' ? 'text-accent/20' : 'text-accent'"
                >Frontend</em>
                Dev
              </span>
            </span>
          </component>
        </div>
      </div>

      <!-- The bottom of the frame, which is where the blank space was. He is
           inside the pinned frame rather than in the page under it, so he holds
           that band for the whole of the hero's read instead of scrolling out
           of it after a screen. -->
      <div class="hero-player">
        <!-- Aimed at the same mark the page's ball perches on, so the volley
             lands where the journey picks it up. Passed as a getter because
             markRef is not resolved when ThePlayer is created, and because the
             mark slides across the frame while the hero is read. -->
        <ThePlayer variant="hero" :aim-at="() => markRef" :volley-at="volleyAt" />
      </div>

      <!-- The phone's Email / Download CV row stood here, `md:hidden`, so it was
           only ever on the phone and taking it out is a phone-only change.

           What it leaves behind is handled in the stylesheet rather than here:
           the frame centres its children, so removing a 46px row moved the
           heading down half of it, and `.hero-frame`'s bottom pad is what puts
           it back. The `position: relative` rule that used to sit beside that
           pad went with the row — it existed only to keep these buttons painting
           in front of the player, whose shoulder reaches this band.

           Note for anyone restoring it: the phone now has no contact affordance
           above the footer, because TheNav carries none either. -->
    </header>
  </div>

  <section ref="introRef" class="hero-intro" aria-label="Introduction">
    

    <!-- Above the bio, which is where the section now opens. -->
    <p ref="sloganRef" class="hero-slogan">
      <!-- Hidden as a unit rather than word by word. The visible line is three
           alternatives sharing one slot, so read straight it comes out as
           "love to solve problems execute ship" — the stacking is the grammar,
           and a screen reader has no way to hear it. The sentence below says
           the same thing in a form that survives being read aloud. -->
      <span class="hero-slogan-line" aria-hidden="true">
        <span class="hero-slogan-lead text-steel">{{ LOVE_LEAD }}</span>
        <!-- Its own element rather than a character on the end of LOVE_LEAD,
             so it stays out of the screen-reader sentence below — read aloud,
             a heavy teardrop-spoked asterisk is either noise or nothing
             depending on the synthesiser. -->
        <span class="hero-slogan-sep text-accent">✽</span>
        <!-- A grid with every word in the one cell: it sizes itself to the
             widest of them and never changes width, which is what holds the
             lead still while they swap. Measuring them in script and setting a
             px width would do the same thing and go stale on a font swap. -->
        <span class="hero-slogan-swap">
          <span v-for="word in LOVE_WORDS" :key="word" class="hero-slogan-word font-semibold">{{ word }}</span>
        </span>
      </span>
      <span class="sr-only">{{ LOVE_LEAD }} {{ LOVE_WORDS.join(', ') }}.</span>
    </p>

    <p class="hero-intro-copy">
      <span
        v-for="(item, i) in INTRO_WORDS"
        :key="`${i}-${item.word}`"
        class="hero-word"
        :class="{ 'hero-word--steel': item.accent }"
      >{{ item.word }}</span>
    </p>


  </section>
</template>

<style scoped>
/* Mobile only. The frame itself is left at the template's `h-screen`; what is
   set here is what the phone puts in the half of that screen the headline does
   not use.

   This used to be a 50svh frame, on the reasoning that a full screen holds one
   line of heading and a button row — about 140px — and 700px of air is a gap
   wherever it is put. The reasoning was sound and the conclusion was wrong,
   because a frame shorter than the viewport cannot fill it while pinned: for
   `spacer − frame` of scrolling there was nothing under the headline but the
   spacer, up to 66vh of it, and the bio only closed the distance on the very
   last frame of the pin. The gap moved, it did not go.

   A full screen has the opposite property: while the frame is pinned it *is*
   the viewport, so there is no scroll position at which anything empty can show
   underneath it. The air is then inside a composition rather than between two
   of them, which is the whole difference — a centred heading with the ball
   behind it reads as placed on a field, where the same heading with a strip of
   spacer under it reads as having run out. 100vh rather than svh on purpose:
   svh is the height with the URL bar out, so on the taller layout the frame
   would come up short and hand back a strip of the spacer, which is the bug
   this is fixing. Overshooting instead only crops the air below the ball.

   The spacer moves with it: the pinned scrub is `spacer − frame` (see `read`
   in <script>), so 116vh over a 50svh frame and 166vh over a
   full one are the same ~66vh of slide. Change one without the other and the
   heading's travel speeds up or slows down. */
@media (max-width: 767px) {
  /* Room at the foot of the frame for the player to stand in.

     The frame is `h-screen` and `flex flex-col justify-center`, and with
     border-box sizing a bottom pad shrinks the box its contents are centred in
     without changing the frame's height — so this lifts the heading and the
     buttons as a pair and hands the bottom third to him. Without it they are
     centred on the whole screen and his head is in the button row: he is a
     third of a phone tall, which is what it takes for a figure to read as one
     rather than as an icon.

     It also answers what removing the orb left behind. That ball filled the
     middle of this frame, and taking it out for a figure standing at the foot
     of the frame emptied the very part of the screen the complaint was about.
     Moving the type down onto him closes the gap rather than relocating it.

     31vh rather than the 26vh it was, and the five points are the button row.
     The frame centres its children in what the padding leaves, so deleting a
     46px row dropped the heading 23px — half of it — straight onto the ball's
     flight path. A little over 5vh of extra pad on an average phone is the same
     23px back the other way, which holds the heading where it was composed
     rather than where the deletion left it. */
  .hero-frame {
    padding-bottom: 31vh;
  }

  /* The section's usual opening pad, halved. The hero closes on a screen of
     air either way; above `md` this is left alone, because there the pinned
     frame is the only thing separating the two. */
  .hero-intro {
    padding-top: 1rem;
  }
}

/* The wipe that inks the heading in as it slides.

   A mask rather than the `clip-path: inset()` this was, and the whole of the
   difference is the edge. A clip cuts at a hard vertical line, and a hard line
   is the ideal landmark for the eye to measure motion against — which is a
   problem here specifically, because the edge and the type move in opposite
   directions at a combined 3.2px per px of scroll (the fill sweeps the track's
   full width while the track itself travels only a screen). Every wobble in
   scroll velocity is tripled at that boundary and the crisp edge makes all of
   it legible, which is what reads as the fill juddering.

   The wobble is not this component's to remove, and that was measured before
   this was written: the scroll arriving from a mouse wheel already pulses about
   8:1 within each notch, because Chrome eases every notch on its way in, and
   GSAP's numeric `scrub` filters only part of that — every value from
   `scrub: true` to `scrub: 1` trades the pulse against the headline trailing
   after the scroll has stopped, and none of them wins on both. What is left is
   to stop drawing a razor edge across it. The same motion under a soft edge
   reads as smooth, because there is no longer a hard reference to see it
   against.

   That soft edge is also what lets the wipe be scrubbed slower than the type it
   crosses (TRACK_SCRUB against INK_SCRUB in <script>). The trade above is about
   the *headline* trailing the scroll, and the fill is not the headline: with no
   hard boundary to time it against, ink that lands a beat late reads as colour
   soaking into the letters rather than as the page answering slowly.

   Two stops driven by one custom property, rather than an animated
   `mask-position` on a fixed gradient: the fill has to land exactly on both
   ends of the track (see `fillAt` in <script>) and a moving background would
   have to be sized against a track whose width is a fluid font size. */
.hero-ink {
  /* The fade's width, as a percentage of the track — not of the viewport, which
     is why one number holds at every width: the track *is* the headline, so it
     scales with the type, and 1% lands within a hair of 0.17em of the heading's
     own size on both a phone and a desktop. About a fifth of a letter's stem,
     which softens the edge without reading as a gradient of its own. */
  --fill-soft: 1;

  /* Fully inked. The scrubbed read in <script> takes this from -1 to 100, and
     starting at the finished state is what leaves the heading plainly readable
     if that script never runs. */
  --fill: 100;

  -webkit-mask-image: linear-gradient(
    to right,
    #000 calc(var(--fill) * 1%),
    transparent calc((var(--fill) + var(--fill-soft)) * 1%)
  );
  mask-image: linear-gradient(
    to right,
    #000 calc(var(--fill) * 1%),
    transparent calc((var(--fill) + var(--fill-soft)) * 1%)
  );
}
  /* inside the word FRONTEND; the 38vh arm is what holds him
   clear on a short, wide screen without shrinking him on a tall one.

   The figure is ~1.42 units tall for every 1 wide, so 38vh of width is ~54vh of
   player — the bottom half of the frame, which is the half the heading is not
   using. */
.hero-player {
  position: absolute;
  bottom: 0;
  left: 50%;
  z-index: 1;
  width: clamp(215px, min(66vw, 34vh), 300px);
  transform: translateX(-50%);
  pointer-events: none;
}

@media (min-width: 768px) {
  .hero-player {
    left: clamp(16px, 3vw, 64px);
    width: clamp(280px, min(24vw, 38vh), 390px);
    transform: none;
  }
}

/* The accent bloom the orb used to carry, kept and moved onto the player.

   It is the one part of that orb worth surviving it. Its job there was to stop
   a hard orange disc reading as pasted onto the page, and it does the same job
   here for the same reason: a flat vector figure standing on white has no
   light around it, and without this he is a sticker. Wider and softer than the
   orb's, because it is lighting a figure rather than haloing a sphere.

   Behind him, and behind the type — z-index on .hero-player puts the figure
   above this and the stacking context keeps both under the heading. */
.hero-player::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 18% -34% -14%;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(255, 124, 62, 0.15), rgba(255, 124, 62, 0) 66%);
}

/* The static fallback that used to live here — unwinding .hero-scroll's spacer
   and un-pinning .hero-frame under `prefers-reduced-motion: reduce` — is gone
   with the query that summoned it. Both the desktop and phone timelines now run
   unconditionally (see the `mm.add` calls in <script>), so there is no width or
   preference at which the pinned read is absent and the spacer would be left
   standing on its own. See BALL_QUERY in composables/useScrollBall.ts. */

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
.hero-word--steel {
  color: theme('colors.steel');
}

.hero-slogan {
  display: flex;
  justify-content: center;
  /* Opens the section now, so the space that used to sit above it belongs
     below it instead — this line and the bio are one block and the gap between
     them should read as smaller than the gap to the heading above. */
  margin: 0 0 clamp(1.25rem, 3.5vh, 2.25rem);
  padding: 0 1.25rem;
  color: theme('colors.ink');
}

/* Shrink-wrapped and centred as a unit. Because the swap below never changes
   width, centring the pair leaves the lead on exactly the same pixel from the
   first word to the last — which is the point of it being the fixed half. */
.hero-slogan-line {
  display: flex;
  /* Centred rather than `baseline`. It mattered more when the swap was an
     overflow box — those report their bottom margin edge as their baseline, so
     baseline alignment hung the lead off the bottom of it — and the mask has
     since gone. It stays because every part of the line carries the same
     font-size and line-height, which makes centring exact and leaves nothing
     for a baseline to fix. */
  align-items: center;
  gap: 0.5em;
  font-family: theme('fontFamily.data');
  /* Sized so the whole line still fits a phone without wrapping. Monospace
     makes that arithmetic exact rather than a guess: 22 glyphs at the 0.6em
     advance, plus the letter-spacing on each and the two gaps, is 15.5em — so
     at the 18px floor the line is 279px inside the 350px a 390px screen leaves
     after the padding. "Solve problems" is the longest of the three and the
     grid is already sized to it, so that is the case to clear. */
  font-size: clamp(18px, 2.8vw, 34px);
  /* Every weight of IBM Plex Mono shares one advance width, so changing this
     does not move the grid the swap is measured against.

     Note that the face is loaded at 400, 500 and 700 (see nuxt.config.ts), so a
     value between those rounds to the nearest one that exists — 300 renders as
     the 400. Add the weight to that URL if a lighter one is actually wanted. */
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1.35;
}

/* No colour of its own, so it takes the ink from .hero-slogan with everything
   else on the line. */
.hero-slogan-sep {
  white-space: nowrap;
  /* Turning, always — the one thing on this line that is not waiting for a
     scroll. Linear and slow: an eased spin reads as something being *thrown*,
     which would compete with the words swapping beside it, and at six seconds
     a revolution it is a texture rather than an event.

     Safe to run unconditionally on transform: the line is `display: flex`, so
     this span is already a flex item and needs no `inline-block` to be
     transformable, and a transform never feeds back into layout — the glyph
     turns inside the box it already occupied. Nothing in script touches this
     element either (the slogan tween takes .hero-slogan-line, -swap and
     -word), so there is no transform for GSAP to fight over.

     No `prefers-reduced-motion` gate, matching the rest of the site — see
     BALL_QUERY in composables/useScrollBall.ts for why that gating was
     dropped everywhere. */
  animation: hero-slogan-sep-spin 6s linear infinite;
}

@keyframes hero-slogan-sep-spin {
  to {
    transform: rotate(360deg);
  }
}

.hero-slogan-lead {
  white-space: nowrap;
}

/* The slot. Grid rather than absolute positioning so the box still takes its
   size from its children — every word sits in the one cell, so the width is
   the widest word's and the height is one line, and neither has to be
   measured or hardcoded.

   No `overflow: hidden`. It was here when the words travelled a full line and
   had to be hidden once they left the box; at a 20px step they never get far
   enough out to need it, and they are transparent by the time they stop. Taking
   it off means there is no edge anywhere for a word to be cut against — which
   was the complaint that started this, though the actual culprit then was this
   box's *width* being animated between the words' widths while the wider one
   was on screen, slicing 23px to 45px off its right-hand side. The width is
   fixed now and the line is centred with a transform instead. */
.hero-slogan-swap {
  display: grid;
}

/* No colour here either. The word carried the accent while the ✽ was gone;
   with the separator back the line is set in ink throughout, and the weight
   and the size are what give it its emphasis instead. */
.hero-slogan-word {
  grid-area: 1 / 1;
  white-space: nowrap;
  /* Its own width rather than the grid cell's, which is what makes the three of
     them measurable one by one — a stretched item reports the width of the
     widest word whichever one it holds. The box around them is narrower than
     this for every word but the longest, and `overflow: hidden` on the slot is
     what keeps the overflow from showing. */
  width: max-content;
}

</style>
