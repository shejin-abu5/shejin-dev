<script setup lang="ts">
import { gsap } from 'gsap'
import { useBallPerch } from '~/composables/useScrollBall'

const footerRef = ref<HTMLElement | null>(null)
const restRef = ref<HTMLElement | null>(null)

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
    class="bg-ink pb-0 pt-16 text-paper md:pt-[120px] lg:pb-[120px]"
  >
    <div class="mx-auto max-w-[1240px] px-5 md:px-8">
      <span class="mb-3.5 block font-data text-[13px] tracking-wide text-accent">
        04 — Get in touch
      </span>

      <h2
        class="footer-fade max-w-[900px] font-display text-[clamp(34px,7vw,96px)] font-black uppercase leading-[0.95] tracking-tight"
      >
        Open to Frontend / UI roles in the UAE.
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

      <!-- The name, set as large as the frame allows and run off the bottom of
           the document.

           Below `lg` only, and it is filling a hole rather than decorating one:
           the player cameo above is `lg:block`, so on a phone the last screen
           of the site ends on a row of 13px labels and then stops. This is what
           stands where he stands.

           Decorative to the accessibility tree — the name is already in the
           mailto, the aria-labels and the nav, and a screen reader does not
           need it a fourth time as a six-storey letterform. -->
      <!-- The bloom is its own element rather than a `filter` on the type, and
           that is a compatibility decision rather than a structural one: Safari
           has a long-standing bug where `filter` on the same element as
           `-webkit-background-clip: text` drops the clip and paints the gradient
           as a solid box. This mark is `max-width: 1023px` only, so the browsers
           that would hit it are exactly the phones it is drawn for. Split across
           two elements, neither engine has both properties to reconcile. -->
      <div class="footer-mark" aria-hidden="true">
        <span class="footer-mark-bloom"><span>Shejin</span></span>
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

/* The cut wordmark. Everything about it is stated in `vw` so the proportion
   between the type and the slice of it you get is fixed at every phone width —
   a size in vw against a clip in px would show more of the word on a wide phone
   than a narrow one, which is the one thing a deliberate crop cannot afford. */
.footer-mark {
  display: none;
}

@media (max-width: 1023px) {
  .footer-mark {
    display: block;

    /*
      Room above the cap line for `.footer-mark-bloom` to render into.

      The crop box is `overflow: hidden`, so without this the glow is sliced off
      flush with the letter tops — which is the exact hard edge the whole
      treatment exists to get rid of, reintroduced one layer up. The box is grown
      upwards by this and the margin pulls it back by the same amount, so it
      costs the page nothing; `box-sizing: border-box` is what keeps `height`
      meaning the same slice of the word it meant before.
    */
    --bloom: 2.5rem;

    /*
      And the same room at the sides, where the clip was doing visible damage
      rather than theoretical damage: the word is set to very nearly fill the
      content box, so the S sat 11px off the left edge and its glow was sliced
      flat against it — a hard vertical line down the page, which is the same
      artefact as the cap-line razor and twice as obvious for being straight.

      Exactly the container's own horizontal padding, so the box grows to the
      full width of the frame and not a pixel past it. Any larger and this pushes
      the document wider than the viewport.
    */
    --bleed: 1.25rem;

    margin-top: calc(3.25rem - var(--bloom));
    margin-inline: calc(var(--bleed) * -1);
    padding-top: var(--bloom);
    padding-inline: var(--bleed);
    /* The cut — 88% of the ink height, measured against the real glyph bounds
       from canvas rather than a guess at the font's metrics. At 900px the word
       measures 145px from cap line to the J's terminal, so the coefficient is
       0.1615 of a vw per point of it, and 88 × 0.1615 is the number below.

       It wants to be half, and half is what the reference does, but the
       reference word is FUTER and this one has a J in it. Uppercase J is a bare
       stem until its hook, and in Archivo Black that hook is the bottom quarter
       — it barely descends, 3px below the baseline at a 202px setting, so all of
       it lives inside the cap height where the crop is.

       Rendered at 74/84/90/96% and compared. 74 was the old number and it cuts
       exactly where the curve starts turning: the J keeps its stem and gets a
       stub, which reads as damage rather than as a letter. 84 is the first with
       a hook you can name. 88 clears the turn and lets the cut kiss the terminal
       instead of taking it, which is the version that reads as a J *and* as a
       word running off the end of the document — and every other letter still
       runs off the edge, so nothing about the crop is softened by it.

       12vw is the old cut if the crop should ever matter more than the name. */
    height: calc(14.2vw + var(--bloom));
    overflow: hidden;
    user-select: none;
  }

  /* The container is `px-8` from `md`, so there is more room to bleed into and
     the blur is wider in absolute terms at these widths — 2vw is 20px at 1023
     against 8px on a phone. Same rule as above: take the padding, take no more. */
  @media (min-width: 768px) {
    .footer-mark {
      --bleed: 2rem;
    }
  }

  /*
    The bloom that mixes the word into the black.

    A drop-shadow rather than a glow behind the type, because it is the glyphs'
    own alpha that casts it: it follows the letterforms, pools in the counters of
    the S and the E, and falls off where the ink does. A radial gradient behind
    them would be a lit patch of footer with a word sitting on it.

    It reads the *masked* alpha, since the mask is on the span inside — so the
    glow fades out along the top with the letters rather than outliving them and
    leaving a halo where the type has already gone.

    In `vw` with everything else here, so the spread holds its proportion to the
    type at every width the mark is shown at. Silver rather than black: a dark
    shadow on a near-black footer is nothing at all, and what reads is the word
    throwing its own light onto the page around it. Held lower than the accent
    version was — a light grey glow on #121212 carries further than an orange
    one at the same alpha, and past about 0.22 it stops being a bloom and starts
    being fog around the letters.
  */
  .footer-mark-bloom {
    display: block;
    filter: drop-shadow(0 0 2vw rgba(198, 204, 214, 0.22));
  }

  .footer-mark-bloom > span {
    display: block;
    font-family: theme('fontFamily.display');
    /* Sized to very nearly fill the container's *content* box, which is the
       frame less the 40px of `px-5` on a phone and the 64px of `md:px-8` above
       it. One number cannot fill both exactly, so it is set to the tighter of
       the two: measured, that is 99% of the line at 320px of frame down to 93%
       at 1023. 26.5vw was the first guess and it overflowed the content box by
       14% at every width — the word ran out through the container's padding and
       past the edge of the document, which is a horizontal scrollbar, not a
       full-bleed wordmark. */
    font-size: 22.5vw;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.045em;
    /* Under 1 on purpose — it pulls the cap tops up to the top of the line box
       so the clip above is measured against the letters rather than against
       the leading, which is invisible and would make `height` mean nothing in
       particular. */
    line-height: 0.74;
    /* Rising out of the footer's own black into silver, which is what puts
       the light at the cut. Painted through the glyphs, so the top of the word
       is genuinely the page showing through and not a dark grey.

       The silver is cool rather than neutral (#C6CCD6 over #C6C6C6) because a
       dead-neutral grey against a slightly warm black reads as dirty white; the
       blue lean is what makes it read as metal. It stops short of paper white
       for the same reason the bloom is held down — this is a mark the eye
       should find after the content, not before it. `steel` from the theme was
       the other candidate and is too dark to be the *bright* end of a ramp: at
       #6B6F76 on #121212 the word never resolves, it just gets less black.

       The stops are set against the *crop*, not against this box, and that is
       the correction. The box is the line box — 0.74em, or 16.65vw — while the
       visible slice is 14.2vw of it, so a stop written at 62% of the box landed
       at 73% of what anyone actually sees: the word reached full accent three
       quarters of the way down and the last quarter was a flat bright band with
       no ramp left in it. 85% of the box is the crop line, so full silver lands
       exactly where the document runs out, and the ramp uses the whole of the
       word rather than most of it. */
    background-image: linear-gradient(
      180deg,
      rgba(198, 204, 214, 0.1) 0%,
      rgba(198, 204, 214, 0.46) 46%,
      #c6ccd6 85%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;

    /*
      What takes the hard edge off the top.

      The cap line of six letters set at 22vw is a 350px razor across the footer,
      and five of the six have flat tops — the word arrived as one rectangular
      slab of flat grey with a cut along the top of it. Colour alone cannot fix
      that: however dark the first stop is, the step from background to glyph
      still happens over a single pixel.

      A mask can, because it is the glyphs' own alpha it is fading. The top of
      the word is genuinely absent and becomes present over the first fifth of
      the line box — the letters resolve out of the black instead of being
      stamped onto it, and there is no edge left to see.

      Both spellings: the unprefixed property is what modern engines take, and
      `-webkit-` covers Safari before 15.4, which is the same pair the stats
      section's vignette carries for the same reason.
    */
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 21%);
    mask-image: linear-gradient(180deg, transparent 0%, #000 21%);
  }
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
