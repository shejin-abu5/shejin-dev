<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useBallPerch } from '~/composables/useScrollBall'
import hereWeGo from '~/assets/img/SC/here-we-go.webp'

const footerRef = ref<HTMLElement | null>(null)
const restRef = ref<HTMLElement | null>(null)
const markRef = ref<HTMLElement | null>(null)
const markBoxRef = ref<HTMLElement | null>(null)
const headRef = ref<HTMLElement | null>(null)
const photoRef = ref<HTMLElement | null>(null)

/** Last size `fitMark` applied, so it can skip writes that change nothing. */
let markSize = 0

/**
 * Sizes the footer wordmark to fill the width of its box.
 *
 * The obvious alternative is a hand-tuned `vw`, and it cannot be right at more
 * than one width. The container's horizontal padding is a much larger fraction
 * of a 320px phone than of the 1240px the container caps at, so a single
 * number either fills the frame on a phone and runs out through the padding on
 * a tablet, or fits the tablet and leaves the phone visibly short. And above
 * 1240 a `vw` keeps growing after the container has stopped, which is the same
 * overflow again with no breakpoint to catch it. Measuring is the only thing
 * that holds at every width, and it costs one layout read per resize.
 *
 * Read at a nominal 100px and scaled from there rather than iterated: the
 * advance width of a line of type is linear in font-size, so a single
 * measurement gives the exact ratio.
 *
 * The scale factor is 99 rather than 100 — i.e. the word is fitted to 99% of
 * the width available to it — and that one point is for the tracking.
 * `letter-spacing` applies after the last glyph as well as between glyphs, and
 * this one is negative, so the measured advance comes back a shade narrower
 * than the ink actually sets. Without the margin the word would sit a hair
 * proud of its box.
 */
const fitMark = () => {
  const box = markBoxRef.value
  const span = markRef.value
  if (!box || !span) return

  const style = getComputedStyle(box)
  const inner =
    box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  if (inner <= 0) return

  // Measured by overriding the *span*, never the box. The box's `height` is an
  // `em` of its own font-size, so probing at a nominal 100px there would have
  // resized the box as a side effect of measuring it — and the ResizeObserver
  // below watches that box, so the measurement would have retriggered itself.
  // The span carries no geometry the box depends on: it is `overflow: hidden`
  // above, so the span can be any size it likes without the box noticing.
  //
  // A Range over the text rather than the span's own `offsetWidth`, because
  // the span is a block: its width is its parent's width, not its type's, so
  // `offsetWidth` would hand back the box we are trying to fit *to* and the
  // ratio would come out a fixed 1 at every size. A Range measures the glyphs.
  //
  // Making the span `inline-block` so it shrink-wraps is the other way to get
  // a real width out of it, and it is the wrong one — an inline box sits on
  // the parent's baseline, and this parent has a strut 1.5x the mark's own
  // (very large) font-size, courtesy of the `line-height: 1.5` Tailwind's
  // preflight puts on `html`. That pushed the word most of the way down the
  // crop and left about 18% of the letters showing.
  span.style.fontSize = '100px'
  const range = document.createRange()
  range.selectNodeContents(span)
  const natural = range.getBoundingClientRect().width
  span.style.fontSize = ''
  if (!natural) return

  const next = (inner / natural) * 99
  // Sub-pixel churn is not worth a repaint, and skipping it keeps the observer
  // from having anything to react to on a width that did not really change.
  if (Math.abs(next - markSize) < 0.5) return

  markSize = next
  box.style.setProperty('--mark-size', `${next}px`)
}

let markResize: ResizeObserver | null = null

/**
 * "Here we go" — the window onto the photo that opens on the headline.
 *
 * The headline is this site's transfer listing, so the reveal over it is the
 * announcement: a soft disc opens on the line and there he is, phone to ear.
 * It opens, drifts a little, and goes — the same single pass at every width.
 * It used to park on the line and follow the cursor where there was one, and
 * that is gone for the reason the fade at the end of the pass now runs to zero:
 * a photograph of a face left sitting on the page reads as whose page it is.
 * The joke is worth telling once; it is not worth an avatar.
 *
 * This is where it opens, and it is a fraction of the headline's box rather
 * than px because the type resets from 34px to 96px across its `clamp` and
 * rewraps on the way: only a fraction stays on the same words, and the words it
 * stays on are "Open to", which is the half of the line that is actually the
 * listing.
 */
const REST = { x: 0.19, y: 0.26 }

/**
 * Seconds the no-pointer pass sits still at the end of its travel before it
 * fades back. Long enough to be a beat and read as deliberate, short enough
 * that nobody waiting on the page has to wait for it.
 */
const HOLD = 0.65

/**
 * How far the pass carries the disc from where it opens, in fractions of the
 * disc's own diameter.
 *
 * A short move rather than the crossing this used to be, and measured against
 * the disc rather than against the headline's box — which is the whole reason
 * it is a short move at a phone width and not merely a smaller fraction. The
 * fractions the pass used before ran 0.16 → 0.86 of the box, and the box is the
 * only thing that changes between a phone and a monitor: at 390px that came out
 * as ~210px of travel for a 140px disc, so the picture crossed a screen and a
 * half of its own width and read as something being carried past rather than
 * something drifting. Against the diameter it is the same gesture at every
 * width, because the thing moving and the distance it moves scale together.
 *
 * The vertical is much the smaller of the two on purpose, and on a phone it is
 * smaller still without being asked: `inside` clamps the centre to half a
 * diameter from each edge, and a three-line headline is barely taller than the
 * disc is wide, so there is only ~17px of legal travel on that axis anyway.
 */
const PASS_TRAVEL = { x: 0.45, y: 0.12 }

let hwgCtx: gsap.Context | null = null

onBeforeUnmount(() => {
  markResize?.disconnect()
  markResize = null
  hwgCtx?.revert()
  hwgCtx = null
})

// Where the page's ball ends up: it falls the length of the footer, lands on
// the rule above the contact block and hops there for as long as the page
// stays put, instead of dropping out of the frame and leaving the last screen
// of the site with nothing on it. Scrolling back up takes it off this perch
// and into the fall from Languages, unwound exactly as it came.
//
// This rule rather than the footer's top edge. The top edge is the wrong
// surface for a *resting* ball for the same reason it is the right one for a
// falling one: a footer taller than the viewport carries it up out of the
// frame — and under the nav — well before the document runs out, so the ball
// would come to rest somewhere it cannot be seen. This rule sits a couple of
// hundred px above the end of the document, which is to say it is still in
// frame, near the bottom, at every scroll position from which it is reachable
// at all.
//
// `from` and `to` are equal because a resting ball does not roll. It lands
// dead centre and stays there.
useBallPerch(() => restRef.value, {
  // Triggered off the footer's own bottom rather than off the rule, and in
  // viewport-independent terms: 150px before the document runs out, whatever
  // the viewport is — which puts the rule just inside the bottom of the frame
  // as the ball arrives, and 150px further up by the time the page stops.
  //
  // Anchoring to the rule instead would mean a start expressed as a fraction
  // of viewport height, and the rule is only ~210px clear of the document
  // bottom: on a tall viewport any such fraction resolves past the end of the
  // page, and a perch the scroll cannot reach is a ball that never lands.
  trigger: () => footerRef.value,
  start: 'bottom bottom+=150',
  // Well past the end of the document, on purpose. This perch has no exit:
  // the ball is meant to still be on it when the page runs out, so the window
  // has to outlast the scroll rather than hand over to anything.
  end: '+=4000',
  from: 0.5,
  to: 0.5,
  bounce: true
})

onMounted(() => {
  if (!import.meta.client || !footerRef.value) return

  gsap.from(footerRef.value.querySelectorAll('.footer-fade'), {
    opacity: 0,
    y: 24,
    duration: 0.9,
    ease: 'power2.out',
    stagger: 0.15,
    scrollTrigger: {
      trigger: footerRef.value,
      start: 'top 75%'
    }
  })

  // The wordmark rises out of its own crop.
  //
  // `yPercent` rather than a `y` in px, so the distance is the word's own
  // height whatever `fitMark` has just sized it to — a px offset would have to
  // be recomputed on every resize alongside it, and would be wrong for the
  // frame in between. At 100 the span's top sits a full line box below the top
  // of the crop, which is past the crop's bottom edge since the crop is the
  // shorter of the two, so it starts genuinely absent rather than peeking.
  // Coming up, the cap tops cross the bottom edge first and travel to their
  // place — the reveal a cropped mark wants: the word surfacing through the
  // end of the document rather than fading onto it.
  //
  // Plays once, and for everyone — no reduced-motion branch, per the note on
  // BALL_QUERY in composables/useScrollBall.ts.
  if (markRef.value && markBoxRef.value) {
    fitMark()

    // Archivo arrives from Google Fonts behind `display=swap`, so the read
    // above is of whatever grotesque the OS stood in while it was in flight.
    // Re-fit when the real cut lands, or the word keeps the fallback's
    // proportions — and a fallback that sets wider than Archivo leaves the
    // mark overflowing its box for the rest of the session.
    document.fonts?.ready.then(fitMark)

    // The box tracks the container's width, so this covers window resizes,
    // orientation changes and the appearance of a scrollbar alike — all three
    // change the width the word has to fill, and only one of them is a
    // `resize` event.
    markResize = new ResizeObserver(fitMark)
    markResize.observe(markBoxRef.value)

    gsap.from(markRef.value, {
      yPercent: 100,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: footerRef.value,
        start: 'top 75%'
      }
    })
  }

  if (headRef.value && photoRef.value) {
    const head = headRef.value
    const photo = photoRef.value

    // Half a diameter, and the reason every point below is clamped to it: the
    // frame clips to the headline's box, so a centre nearer the edge than this
    // hangs part of the picture off it — and a face with a third of it cut away
    // is a crescent, not a face. On a phone the box is a three-line block
    // barely taller than the disc is wide, which is where it bites hardest.
    const radius = () => photo.offsetWidth / 2

    const inside = (v: number, extent: number) => {
      const r = radius()
      return extent < 2 * r ? extent / 2 : Math.min(Math.max(v, r), extent - r)
    }

    // One behaviour now, where there used to be two.
    //
    // The split was between devices: with a pointer the disc parked on the line
    // and followed the cursor, because a parked disc is an invitation and a
    // pointer is something to invite; with no pointer there was nothing to
    // invite, so it made a single pass instead and left a trace of itself
    // behind. Both halves of that are gone, and for one reason rather than two
    // — a photograph of somebody's face that stays on the page stops reading as
    // a joke about a transfer listing and starts reading as whose face this
    // site belongs to. Following the cursor is the strongest version of that: it
    // makes the picture the thing you are handling. So the disc opens, drifts a
    // little, holds, and fades out completely, and does the same at every width.
    //
    // `gsap.context` rather than the `matchMedia` this was, because there is no
    // longer a query to answer — what is left of it is the collection and the
    // single `revert()` on unmount.
    hwgCtx = gsap.context(() => {
      gsap.set(photo, { scale: 0, opacity: 1 })

      let pass: gsap.core.Timeline | null = null

      const sweep = () => {
        // Re-entering while it is still running restarts nothing; the pass owns
        // the disc until it has put it away.
        if (pass?.isActive()) return

        // Measured per pass rather than once, because the only thing that can
        // have changed it is a rotation or a resize, and both of those happen
        // between passes rather than during one. This is also what replaced the
        // ResizeObserver the pointer branch needed: that one had to re-home a
        // disc that was sitting on the line indefinitely, and nothing sits on
        // the line indefinitely any more.
        const box = head.getBoundingClientRect()

        // Where it opens, and the short move out from there.
        const d = photo.offsetWidth
        const fromX = inside(box.width * REST.x, box.width)
        const fromY = inside(box.height * REST.y, box.height)
        const toX = inside(fromX + d * PASS_TRAVEL.x, box.width)
        const toY = inside(fromY + d * PASS_TRAVEL.y, box.height)

        pass = gsap
          .timeline()
          // `opacity` reset alongside the rest, or a second pass starts from
          // wherever the first one faded to and never comes back to full.
          .set(photo, { x: fromX, y: fromY, scale: 0, opacity: 1 })
          .to(photo, { scale: 1, duration: 0.5, ease: 'power3.out' })
          // Overlapped with the opening rather than queued after it: a disc
          // that opens, stops, and only then sets off reads as two events, and
          // this is one. It is already moving by the time it is fully open.
          //
          // Slower than the distance alone would suggest, and that is the
          // point: over ~210px this duration was a traverse, over a third of
          // that it is a drift. Cutting the time with the distance would have
          // kept the speed and turned the move into a twitch.
          .to(photo, { x: toX, y: toY, duration: 1.2, ease: 'power1.inOut' }, '<0.15')
          // Then it holds, and the hold is the point rather than padding: the
          // disc is crossed by white bands of type every 32px on a phone, so
          // the face arrives in slices, and slices of a *moving* face are most
          // of a second's work to assemble. An earlier cut shut it 0.3s before
          // it even arrived, and it was already going by the time it resolved.
          //
          // And then it goes, all the way. This used to stop at 0.3 and leave a
          // warm cast on the line, on the argument that fading rather than
          // shutting keeps the picture in the page instead of making the whole
          // thing an interruption. The argument is sound and it was answering
          // the wrong question: what is left at 0.3 is still a face, and a face
          // that stays is a portrait of whoever the site is about. Fading is
          // still the right *exit* — it is gentler than a shut, and the disc
          // has already drifted, so nothing snaps. It just runs to zero.
          .to(photo, { opacity: 0, duration: 0.7, ease: 'power2.out' }, `+=${HOLD}`)
      }

      // Both directions. Coming back up to the footer having missed it the
      // first time is the one case where a reveal that fires `once` is simply
      // gone, and the whole joke with it — and it matters more now than it did,
      // because there is no longer anything left on the line to have missed.
      const st = ScrollTrigger.create({
        trigger: footerRef.value,
        start: 'top 55%',
        onEnter: sweep,
        onEnterBack: sweep
      })

      return () => {
        // Created inside a ScrollTrigger callback rather than inside this
        // function, so the context around it never saw it and cannot revert it.
        pass?.kill()
        pass = null
        st.kill()
      }
    })
  }
})
</script>

<template>
  <!-- The bottom padding is split off from the top rather than written as `py`,
       so the wordmark below is cut by the end of the page instead of floating
       above a band of spare black — the cut has to read as the document running
       out, which is the whole idea.

       `pb-0 lg:pb-[120px]` rather than the `max-lg:pb-0` this was: `max-lg` and
       `md` are both one class of specificity, so between 768 and 1023 the
       winner is whichever Tailwind happens to emit last, and it emitted
       `md:py-[120px]`. Measured, that left exactly 120px of black under the cut
       on a tablet. Stating the floor for everyone and lifting it at `lg` has no
       such argument to lose. -->
  <footer
    id="contact"
    ref="footerRef"
    class="relative bg-ink pb-0 pt-16 text-paper md:pt-[120px] lg:pb-[120px]"
  >
    <!-- The name, set as large as the frame allows and run off the bottom of
         the document.

         A watermark rather than a block of its own: it is pinned to the
         footer's bottom edge, behind everything, and the rule above the
         contact row and the labels under it paint straight over the top of
         it. That is why it costs no layout — it is out of flow, so nothing
         above it moves, and the band of black that the `lg:pb-[120px]` leaves
         under the content is where the bottom of the word lives instead of
         being empty.

         Positioned elements paint above static ones whatever the DOM order,
         so putting this first is not enough on its own to get it behind the
         content — the `relative z-10` on the container below is the other
         half of that, and the two only work as a pair.

         Decorative to the accessibility tree — the name is already in the
         mailto, the aria-labels and the nav, and a screen reader does not
         need it a fourth time as a six-storey letterform. -->
    <div ref="markBoxRef" class="footer-mark" aria-hidden="true">
      <span ref="markRef">Shejin</span>
    </div>

    <div class="relative z-10 mx-auto max-w-[1240px] px-5 md:px-8">
      <span class="mb-3.5 block font-data text-[13px] tracking-wide text-accent">
        04 — Get in touch
      </span>

      <h2
        ref="headRef"
        class="footer-fade hwg relative max-w-[900px] font-display text-[clamp(34px,7vw,96px)] font-black uppercase leading-[0.95] tracking-tight"
      >
        Open to Frontend / UI roles in the UAE.

        <!-- The window onto the photo. Absolutely placed, so it takes no part
             in the line breaking above it — the headline wraps exactly as it
             did before this existed.

             Two elements rather than one: the frame is the clip, the disc is
             the thing that moves. Putting the `overflow: hidden` on the h2
             itself is the version that saves an element and it clips the type,
             which sets on a 0.95 line box and has its cap tops nearer the edge
             of that box than a round number would suggest.

             Decorative, and deliberately so. The joke is a photograph of
             somebody else's face; there is no alt text that carries it, and
             announcing "man on phone" between the heading and the email address
             is worse than silence. -->
        <!-- <span class="hwg-frame" aria-hidden="true">
          <span
            ref="photoRef"
            class="hwg-photo"
            :style="{ '--hwg-src': `url(${hereWeGo})` }"
          ></span>
        </span> -->
      </h2>

      <p class="footer-fade mt-6 max-w-[520px] text-[18px] leading-relaxed text-white/60">
        hire me to juggle ⚽
      </p>

      <div class="footer-fade md:mt-9 mt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
        <a
          href="mailto:shejin.abu@gmail.com"
          aria-label="Email Shejin Abu at shejin.abu@gmail.com"
          class="inline-flex items-center gap-3.5 border-b border-white/30 pb-1.5 font-data text-lg transition-colors hover:border-accent hover:text-accent"
        >
          shejin.abu@gmail.com →
        </a>

        <a
          href="/files/ShejinAbu-26.pdf"
          download="Shejin-Abu-CV.pdf"
          class="inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 font-data text-[13px] text-ink transition-colors hover:bg-accent-text hover:text-white"
        >
          Download CV
        </a>
      </div>

      <div
        ref="restRef"
        class="relative md:mt-24 mt-12 flex flex-wrap items-end justify-between gap-6 md:border-t border-white/15 pt-8"
      >
        <!-- The last frame of the journey. The ball comes to rest bouncing at
             the midpoint of this rule, so he stands to the right of it with his
             hands on his hips, tapping a foot — the game is over and he is
             waiting on you, which is what the bottom of a page is.

             Absolutely placed inside the rule's own row, so `bottom-full` is
             its top border and his feet land on exactly the line the ball is
             bouncing on. Out of flow, so the flex row below is untouched.

             No `start`/`end` here, unlike every other cameo, because this one is
             not scrubbed: the tap runs on a clock (see the `tap` branch in
             ThePlayer). That also retires the problem the window it used to
             carry existed to work around — this cameo sits inside the last
             screen of the document, where a scrubbed move is asking for scroll
             that does not exist, and at maximum scroll he is still 65% down the
             viewport. A move that finishes on its own cannot be caught half way
             through one.

             The `lie` pose built from the reference photo is still in the pose
             table, unused, if this should ever change its mind. -->
        <!-- The one cameo that is not `--cameo` wide, and it is a deliberate
             exception rather than a drift. Every other player stands on white
             at 152px; this one stands on near-black, where a flat figure loses
             its edges to the background and reads smaller than it measures.
             205px puts it back. -->
        <div class="player-glow pointer-events-none absolute bottom-full right-[7%] hidden w-[205px] lg:block">
          <ThePlayer move="footer" flip tone="dark" />
        </div>
        <div class="flex flex-wrap gap-10">
          <div class="text-xs uppercase tracking-wide text-white/50">
            Location
            <span class="mt-1.5 block font-data text-[13px] normal-case tracking-normal text-paper">
              Dubai, UAE
            </span>
          </div>
          <div class="text-xs uppercase tracking-wide text-white/50">
            Phone
            <a href="tel:+971563834835">
            <span class="mt-1.5 block font-data text-[13px] normal-case tracking-normal text-paper">
              +971 56 383 4835
            </span>
          </a>
          </div>
          <div class="text-xs uppercase tracking-wide text-white/50">
            Status
            <span class="mt-1.5 block font-data text-[13px] normal-case tracking-normal text-paper">
              Open to relocation
            </span>
          </div>
        </div>

        <div class="flex gap-6">
          <a
            href="https://linkedin.com/in/shejin-abu-dev"
            target="_blank"
            rel="noopener"
            aria-label="Shejin Abu on LinkedIn (opens in a new tab)"
            class="text-[13px] text-white/60 transition-colors hover:text-accent"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/shejin-abu5"
            aria-label="GitHub"
            class="text-[13px] text-white/60 transition-colors hover:text-accent"
          >
            GitHub
          </a>
          <a
            href="mailto:shejin.abu@gmail.com"
            aria-label="Email Shejin Abu"
            class="text-[13px] text-white/60 transition-colors hover:text-accent"
          >
            Email
          </a>
        </div>
      </div>

    </div>
  </footer>
</template>

<style scoped>
/* A soft lift behind the player, and the only place on the page that needs one.

   Everywhere else he stands on paper and his own edges do the separating. Here
   the ground is #121212 and the figure's darkest parts — hair, the back leg's
   shading, the shadow under his boots — are close enough to it that the
   silhouette breaks up: he reads as a few bright shapes rather than one person.

   Warm rather than neutral, and the same accent the ball is, so it reads as
   light coming off the pitch rather than as a vignette pasted behind him. */
/* `isolation` is load-bearing, not tidiness. The glow is a `z-index: -1`
   pseudo-element, and without a stacking context of its own here that -1 is
   resolved against the footer — which paints its own near-black background in
   the same context, directly over the top of it. The glow was there the whole
   time and behind the wall. */
.player-glow {
  isolation: isolate;
}

/*
  "Here we go" — the disc that opens on the headline. See the block in the
  script for what drives it; this is what it looks like.
*/
/*
  Padding the disc is allowed to spill into, cancelled by an equal negative
  margin so the footer lays out exactly as it did without it.

  The frame below clips to this box, and clipped to the *type* alone the effect
  dies on a phone: three lines of black caps at 34px leave a 108px disc almost
  no uncovered ground to show a photograph through, so what opens is a warm
  haze rather than a face. It is not a size problem — the block is only ~97px
  tall, so the disc is already taller than everything it is allowed to paint on.
  Thirty px top and bottom is enough for the arcs of the circle to land on plain
  black and for the picture to close into a face, with the headline crossing it.

  Not a media query, because it does no harm at the top of the range either: at
  96px type the same 30px is a rounding error against a 204px disc, and it gives
  the first and last lines the same courtesy.
*/
.hwg {
  padding-block: 30px;
  margin-block: -30px;
}

.hwg-frame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.hwg-photo {
  /* Not in `em`, and the first cut of this was.

     Tying the disc to the headline's own font-size is the tidy answer and it
     fails at the bottom of the range: `clamp(34px,7vw,96px)` bottoms out at
     34px, so a disc of 2.1em came out 71px on a phone, and at 71px a
     photograph of a face is not a photograph of a face — measured on a 390px
     viewport it read as an orange stain over "OPEN TO". The whole effect is
     one recognisable person, so its floor is set by recognisability rather
     than by proportion, and that floor is absolute.

     Hence a clamp of its own: 140px so he survives the smallest phone, 13.5vw
     through the middle so it still grows with the page, 204px so it never
     swamps the line on a monitor.

     The floor is 140 rather than the 108 it was first set to, and the reason is
     the type crossing it rather than the disc itself. Three lines of caps at
     34px on a 0.95 line box put a ~24px white band across the picture every
     32px, so at 108px what showed of him was three ~10px slivers — enough to
     see there is a photograph there, not enough to see a face. Every px of
     diameter widens the gaps and not the bands. */
  --hwg-d: clamp(140px, 13.5vw, 204px);

  position: absolute;
  left: 0;
  top: 0;
  width: var(--hwg-d);
  height: var(--hwg-d);
  /* Pulled back half its own size on both axes, which is what makes GSAP's
     `x`/`y` the *centre* of the disc rather than its top-left corner — so the
     pointer's offsets can be fed straight in with no arithmetic per move. */
  margin: calc(var(--hwg-d) / -2) 0 0 calc(var(--hwg-d) / -2);
  pointer-events: none;

  /* The photo is a cold, dim press shot and the footer is near-black, so left
     alone it reads as a grey smudge on the line rather than as a picture.
     Two layers blended in `color` fix the colour half of that: the photo keeps
     its own luminosity, the accent wash over it supplies hue and saturation, so
     what opens on the headline is lit by the same #FF4A1F as the ball. The
     `brightness` is the other half — a warm dark photo is still dark.

     `background-size` over 100% so the framing is adjustable at all: the source
     is square and so is this box, which means at `cover` the position has
     nothing left to do and the disc is just the whole photo with its corners
     bitten off — which put the circle's centre on his beard and the hand
     holding the phone, and took his eyes off the top edge. At 145% the visible
     window is ~69% of the source and the position can put the middle of his
     face in the middle of the disc, which is the only framing that reads. */
  background-image:
    linear-gradient(rgba(255, 74, 31, 0.42), rgba(255, 74, 31, 0.24)),
    var(--hwg-src);
  background-blend-mode: color;
  background-size: 145% auto;
  background-position: 24% 18%;
  filter: brightness(1.22) contrast(1.05);

  /*
    The one decision the whole effect rests on.

    Laid over the type as an ordinary opaque disc, a dark photograph punches a
    hole in a white headline: the words under it are simply gone, and a couple
    of missing words in the middle of a line reads as a rendering fault, not as
    a reveal. `screen` keeps them. Screening anything with white returns white,
    so every letter the disc passes over stays exactly as bright as it was,
    while the near-black around the letters — transparent as far as this blend
    group is concerned — takes the photo at full strength. The picture opens
    *behind* the headline and the headline is never once illegible.
  */
  mix-blend-mode: screen;

  /* A hard circle would be a sticker; this is meant to be a window. `closest-side`
     resolves to half the box on a square element, so the gradient is inscribed
     whatever `--hwg-d` currently is, and the fade from 58% out is the edge. */
  -webkit-mask-image: radial-gradient(closest-side, #000 58%, rgba(0, 0, 0, 0) 100%);
  mask-image: radial-gradient(closest-side, #000 58%, rgba(0, 0, 0, 0) 100%);

  /* Shut before anything can run, and this is not belt-and-braces for the
     `gsap.set` in the script — it is the only thing covering the gap in front
     of it. The span is server-rendered, so between first paint and hydration
     the disc has no transform of its own: it sits open at full size with its
     centre on the headline's top-left corner, a quarter-circle of somebody's
     face wedged into the corner of the frame. Brief on a fast connection and
     not brief at all on a slow one.

     It is also the right resting state for a browser that never runs the
     script: no reveal, and a headline that is exactly the headline. */
  transform: scale(0);

  will-change: transform;
}

/*
  The cut wordmark, pinned to the bottom edge of the document.

  Both the type size and the slice of it you get are stated against the same
  `font-size`, so the proportion between them is fixed at every width — a size
  that scales against a clip that does not would show more of the word on a
  wide screen than a narrow one, which is the one thing a deliberate crop
  cannot afford.

  `left/right: 0` with `margin-inline: auto` against a `max-width` is what
  centres an absolutely positioned box, and the max-width and padding are the
  container's own (`max-w-[1240px] px-5 md:px-8`) so the word starts and ends
  on exactly the edges the rule above it does.
*/
.footer-mark {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 0;
  margin-inline: auto;
  max-width: 1240px;
  padding-inline: 1.25rem;
  /* `--mark-size` is written by `fitMark()` in the script above, which is what
     actually sizes this — see the note there for why the width is measured
     rather than stated.

     The `min()` is the value before that runs: it is what the server renders,
     what shows for the frame or two before hydration, and what stands if the
     script never runs at all. Deliberately a little under what the fit will
     land on, since the failure modes are not symmetric — a mark that sets
     slightly narrow is a mark nobody notices, and one that sets wide runs out
     through the container's padding and puts a horizontal scrollbar on the
     document. The px term caps the vw at roughly where the container itself
     caps, so the fallback does not keep growing on a wide monitor. */
  font-size: var(--mark-size, min(29vw, 360px));
  /* The cut. 0.7 of the 0.74em line box, so a little under a third of the ink
     is taken by the end of the document — which is what the reference does,
     and what makes the mark read as the page running out rather than as a band
     of type parked at the bottom.

     In `em`, so it is tied to whatever the font-size above resolves to and
     rides the fit with it. Any absolute unit would show a different slice of
     the word at every width, which is the one thing a deliberate crop cannot
     afford. */
  height: 0.52em;
  overflow: hidden;
  user-select: none;
}

@media (min-width: 768px) {
  .footer-mark {
    padding-inline: 2rem;
  }
}

/* `block` rather than `inline-block`, and it matters. An inline box is aligned
   on its parent's baseline, and this parent's strut is 1.5x the mark's own
   font-size — `line-height: 1.5` from Tailwind's preflight on `html`, against
   a font-size of a few hundred px. That put the span's baseline a third of the
   way down a crop only 0.52em tall and left a sliver of the letters showing.
   A block box has no baseline to be aligned on and starts at the top of the
   content area, which is where the crop expects it.

   `nowrap` is for the measurement: at the nominal 100px `fitMark` probes with,
   the word is wider than a phone, and without this the reading would be of a
   wrapped two-line block. */
.footer-mark > span {
  display: block;
  white-space: nowrap;
  font-family: theme('fontFamily.display');
  font-weight: 900;
  letter-spacing: -0.045em;
  /* Under 1 on purpose — it pulls the cap tops up to the top of the line box
     so the crop above is measured against the letters rather than against the
     leading, which is invisible and would make `height` mean nothing in
     particular. */
  line-height: 0.74;
  /*
    Flat, and barely there. Roughly a 15-point step off the footer's own
    #121212, which lands the letters near #1E1E1E — the word is something you
    notice after the content rather than before it, and at this contrast it
    never competes with the 13px labels sitting on top of it.

    A flat fill rather than the silver gradient this used to carry, and that
    also retires two things the gradient needed. The `drop-shadow` bloom is
    gone: a glow is a claim on attention, which is the opposite of a watermark.
    So is the `mask-image` that faded the cap line — it existed because six
    flat-topped letters in silver drew a razor across the footer, and at 5%
    alpha there is no edge left for it to soften.
  */
  color: rgba(255, 255, 255, 0.05);
}

.player-glow::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -16% -34% -10%;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(255, 124, 62, 0.26), rgba(255, 124, 62, 0) 70%);
}
</style>
