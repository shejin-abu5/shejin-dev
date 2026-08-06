<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { BALL_QUERY, ballPerches, type Perch } from '~/composables/useScrollBall'

// One ball for the whole page. It starts perched in the hero's headline, rides
// it sideways, then falls, rolls and lands its way down through every section
// that has registered a surface for it — see composables/useScrollBall.ts.

// Landing bounce and squash, on a clock in seconds.
//
// This used to be measured in px of scroll, which is wrong for the same reason
// a real impact is not: an impact has a duration of its own, and the page
// stopping does not stop it. Parameterised by scroll, the whole bounce froze
// wherever the wheel stopped — and stopping anywhere in a contact phase left
// the ball sitting permanently squashed at 0.88, a visibly flat ball resting
// on a rail with no way out of it but scrolling further. Every perch showed
// it; which ones you noticed just depended on where you happened to stop.
//
// A clock also settles the sizing question the scroll version could never get
// right. Perches differ enormously in how much scroll they span (the hero is
// two viewports, an experience chart card a few hundred px), so no px figure
// suited all of them and no fraction did either — hence the cap that used to
// live here. In seconds a landing is just a landing, on every perch.
const BOUNCE_TIME = 0.62
const BOUNCE_PX = 18
const SQUASH = 0.12

// The rest bounce on a `bounce` perch — see useScrollBall.ts. Slower and
// taller than a landing, because it is not settling into anything: the page
// has run out and this is the ball hopping on the spot until it moves again.
const REST_PERIOD = 0.7
const REST_PX = 40
const REST_SQUASH = 0.16

// A resting ball is exempt from the bottom fade — see FADE_PX. That band means
// "nothing left to ride, so fade out rather than clip at the edge", and a
// resting ball is the opposite of that: it is exactly where it is meant to be.
// The rule the footer rests it on sits a couple of hundred px above the end of
// the document, so it is at the low end of the frame when the ball first
// arrives and rises from there — faded, it would land at a quarter strength
// and brighten in place, which reads as a blink rather than a landing.

// Fade band at each viewport edge. This is the whole of the "only visible
// where it has something to ride" rule: over a long stretch with no perch the
// ball is simply somewhere off-screen, and this fades it rather than letting
// it clip at the edge.
const FADE_PX = 190

// Every handoff gets at least this much scroll of fall between the two
// perches, and no perch keeps less than MIN_WINDOW of roll. Both as fractions
// of viewport height.
//
// Sections size their own windows and cannot see their neighbours, so two of
// them can meet exactly — Skills' rule ended on the very scroll position
// Education's row began, leaving no fall at all between them: the ball stopped
// at the right-hand end of one rule and was already at the left-hand end of
// the next, most of a screen away, with the edge fades snapping it out and
// back in over a handful of frames.
const MIN_FALL = 0.3
const MIN_WINDOW = 0.24

// How much scroll the exit fall past the last perch is spread over. Short on
// purpose: past the last perch there is nothing left to ride, so the ball
// should be gone rather than drifting.
//
// With the footer registering a resting perch this is now the fallback rather
// than how the page ends — a resting perch's window outlasts the document, so
// there is no "past the last perch" to reach. It still matters if the footer
// is ever absent, and for any page that ends on an ordinary perch.
const EXIT_SCROLL_VH = 0.32

// Bounds on a sideways exit or entry. Within them the leg is derived from the
// roll speed of the perch it joins, so the ball leaves the frame at exactly
// the pace it was rolling and arrives at the pace it will roll — no velocity
// step at either handoff. These only stop a degenerate perch producing a leg
// so short it snaps or so long it creeps.
const SIDE_LEG_MIN = 120
const SIDE_LEG_MAX = 1400

// Fraction of the constant-speed length a sideways leg actually gets. Below 1
// the ball accelerates away as it leaves and decelerates as it arrives, which
// is how the leg can be short without the handoff stepping: what has to be
// continuous at a join is the velocity, not the acceleration.
const SIDE_HASTE = 0.55

// The pace the page rolls at, px of travel per px of scroll. Perch windows are
// sized against it so the ball crosses a full-width rule and a chart card at
// something like one speed. Under 1, so the ball travels less than the page
// does — it reads as unhurried rather than as something being flung along.
const TARGET_SPEED = 0.85

// Time constant of the ball's follow. Every position here is looked up against
// a scroll value, so the clock has to *be* scroll — smoothed, never rescaled.
//
// Deriving it from a scrubbed tween of 0 → ScrollTrigger.maxScroll() looks
// equivalent and is not: the tween's end value and its trigger's `end` are
// resolved at different moments, and pinned sections grow the document between
// those moments by adding their spacers. The two disagreed by 29%, so the
// clock ran ahead of the page and every window lookup landed on the wrong
// perch — the ball sat on the chart's fourth card while the chart was showing
// its first.
//
// This used to be sized to sit near the experience chart's own 0.8 scrub, on
// the theory that two similar lags would cancel. They do not: the residual
// measured 117px of scroll each way, and it *reverses sign* with scroll
// direction, so reversing swung the ball two thirds of a short card away from
// the card it was riding. Sections that scrub now hand the ball their own clock
// instead — see `progress` in useScrollBall.ts — which leaves this responsible
// only for taking the grain off a plain rail's roll. Short, because lag here
// buys nothing now: at 720px/s it is ~86px rather than the old 187px, and that
// is what stops the ball being dropped onto the skills rail while the rail is
// still below the fold.
const FOLLOW_TAU = 0.12

const ballRef = ref<HTMLElement | null>(null)
const spinRef = ref<HTMLElement | null>(null)

let mm: ReturnType<typeof gsap.matchMedia> | null = null

onMounted(() => {
  mm = gsap.matchMedia()

  mm.add(BALL_QUERY, () => {
    const ball = ballRef.value
    const spin = spinRef.value
    if (!ball || !spin) return

    const setX = gsap.quickSetter(ball, 'x', 'px')
    const setY = gsap.quickSetter(ball, 'y', 'px')
    const setSX = gsap.quickSetter(ball, 'scaleX')
    const setSY = gsap.quickSetter(ball, 'scaleY')
    const setO = gsap.quickSetter(ball, 'opacity')
    const setSpin = gsap.quickSetter(spin, 'rotation', 'deg')

    // Scaled about the bottom edge, so a squash flattens the ball onto the
    // surface instead of pushing it through.
    gsap.set(ball, { transformOrigin: '50% 100%' })

    const clamp01 = gsap.utils.clamp(0, 1)

    let sorted: Perch[] = []
    // Every perch's [enter, exit] resolved once per frame, flat. Rebuilt
    // rather than read ad hoc so the windows can be forced monotonic — see
    // resolve().
    let bounds: number[] = []
    let ballR = ball.offsetWidth / 2
    // null means "the ball did not get here by rolling" — a teleport across an
    // off-stage gap, or a refresh. The next frame starts a fresh rotation
    // baseline instead of spinning the ball by the size of the jump.
    let lastX: number | null = null
    let rot = 0

    // Horizontal launch point of the fall currently in progress, and which
    // perch it is a fall into. Held rather than re-read because the surface
    // being left is often still animating: a chart card closes as the ball
    // leaves it, so its right edge — the ball's launch point — retreats by
    // more than the width of the hop itself. Read live, that drags the ball
    // backwards before the target pulls it forward, and a ball that moves
    // left mid-hop is the hitch you see at a card handoff. The launch height
    // stays live; only x is pinned, because the vertical movement is the
    // section legitimately scrolling.
    let launchX: number | null = null
    let launchFor = -1

    // Each perch's exit point, recorded on every frame the ball is actually
    // riding it.
    //
    // Pinning launchX on entry to the fall is not enough on its own, because
    // *when* that entry happens depends on which way you are scrolling.
    // Downwards you enter the hop off a card that is still fully open;
    // upwards you enter the same hop off a card that has already closed, and
    // the pinned value is then the collapsed bar's right edge. Measured on the
    // chart, the same two hops launched from x=705 and x=989 going down but
    // x=450 and x=754 coming up — a quarter of the frame out, and the jump you
    // saw at every handoff scrolling back.
    //
    // Riding, by contrast, happens over the same geometry in both directions,
    // so the last value recorded here is the open card's edge either way.
    let exitAnchor: (number | null)[] = []

    let smoothed = window.scrollY

    // Seconds since the ball started running, advanced by the ticker. Bounces
    // are read off this rather than off scroll, so they play out and settle
    // whether or not the page is still moving.
    let clock = 0
    // Clock reading of the last landing. -Infinity once it has played out, and
    // at rest before the first one.
    let landAt = -Infinity
    // The last perch the ball actually *rode*, as opposed to fell towards.
    // Changing it is the definition of a landing, and it is deliberately left
    // alone while falling: dithering across a perch's entry line then reads as
    // one arrival, not as the bounce restarting on every other frame.
    let riding = -1

    // The ball must not be sitting in the headline before the headline has
    // finished arriving.
    const intro = { v: 0 }
    gsap.to(intro, { v: 1, duration: 0.7, delay: 1.05, ease: 'power2.out' })

    const resort = () => {
      ballR = ball.offsetWidth / 2
      sorted = ballPerches.list
        .filter((p) => {
          const [a, b] = p.range()
          return p.surface() && Number.isFinite(a) && Number.isFinite(b) && b > a
        })
        .sort((a, b) => a.range()[0] - b.range()[0])
      bounds = new Array(sorted.length * 2).fill(0)
      // Indices can move under a re-sort, so anchors recorded against the old
      // order would be attached to the wrong surfaces. Each is refilled by the
      // first frame the ball rides that perch.
      exitAnchor = new Array(sorted.length).fill(null)
      lastX = null
      // Indices have moved, so the perch the ball was on is no longer named by
      // the number held for it. Cleared rather than remapped: a refresh is not
      // a landing, and the alternative is the ball bouncing every time the
      // window is resized.
      riding = -1
      ballPerches.dirty = false
    }

    /**
     * Resolves every perch window for this frame and forces the set to be
     * strictly non-overlapping and ascending.
     *
     * Sections declare their windows independently and know nothing about each
     * other, so two neighbours can overlap by a few pixels — and where they
     * do, a scroll position belongs to both. The lookup below would then pick
     * one or the other depending on which side of the overlap the clock landed
     * on, and a clock that is easing can cross that line several times: the
     * ball flips between two perches on consecutive frames. That reads as
     * jitter at exactly the section boundaries.
     */
    const resolve = (vh: number) => {
      for (let s = 0; s < sorted.length; s++) {
        const [a, b] = sorted[s].range()
        bounds[s * 2] = a
        bounds[s * 2 + 1] = Math.max(b, a + 1)
      }

      const floor = vh * MIN_WINDOW

      // Left to right, so each fix is made against windows already settled.
      for (let s = 1; s < sorted.length; s++) {
        // The fall belongs to the perch being left — it is the one that knows
        // how far the ball has to go from here.
        const gap = vh * (sorted[s - 1].fall ?? MIN_FALL)

        // First try to buy the gap out of the earlier perch's roll — it has
        // already been ridden, and ending it a little sooner costs less than
        // moving the section that is arriving.
        //
        // A resting perch is where the page ends, so it cannot be moved to
        // make room and the earlier window gives way without a floor. Every
        // other perch keeps its floor and is shifted instead.
        const anchored = sorted[s].bounce
        bounds[s * 2 - 1] = Math.min(
          bounds[s * 2 - 1],
          Math.max(bounds[s * 2] - gap, bounds[s * 2 - 2] + (anchored ? 1 : floor))
        )

        // If that was not enough, shift the later window bodily rather than
        // truncating it: a perch whose window is cut short is one the ball
        // crosses at double speed, which is the opposite of what a handoff
        // needs.
        //
        // Never a resting perch, though — shifting that one past the end of
        // the document is a ball that falls forever and never lands.
        const short = bounds[s * 2 - 1] + gap - bounds[s * 2]
        if (short > 0 && !anchored) {
          bounds[s * 2] += short
          bounds[s * 2 + 1] += short
        }
      }
    }

    /** A point on a perch, `t` as a fraction of its inset width. */
    const pointAt = (p: Perch, t: number) => {
      const el = p.surface()
      if (!el) return null
      const r = el.getBoundingClientRect()
      const x0 = r.left + p.inset
      const x1 = Math.max(x0, r.right - p.inset)
      // Clamping `t` rather than trusting it is what absorbs the residual
      // desync between this ball's follow and a section's own scrub: the ball
      // can never end up past the end of the surface it is supposed to be on.
      return { x: x0 + (x1 - x0) * clamp01(t), y: r.top }
    }

    /**
     * How far along perch `idx` the ball belongs, 0–1 of from→to.
     *
     * The perch's own clock wins where it has one, so the ball reads the same
     * moment its surface was drawn at. Otherwise it is the ball's clock
     * against the perch's window, as before.
     *
     * Clamped, which is what makes this safe to call for a perch the ball has
     * not reached yet: a fall aims at wherever its target currently is, and
     * before that target has started moving, that is its entry point.
     */
    const perchK = (idx: number) => {
      const p = sorted[idx]
      if (p.progress) return clamp01(p.progress())
      const enter = bounds[idx * 2]
      return clamp01((smoothed - enter) / Math.max(1, bounds[idx * 2 + 1] - enter))
    }

    /** The `t` for `pointAt` that corresponds to perch `idx`'s current progress. */
    const perchT = (idx: number) => {
      const p = sorted[idx]
      const a = p.from()
      return a + (p.to() - a) * perchK(idx)
    }

    /** Px of horizontal travel per px of scroll while riding perch `idx`. */
    const rollSpeed = (idx: number) => {
      const p = sorted[idx]
      const el = p.surface()
      if (!el) return 0
      const w = Math.max(1, el.getBoundingClientRect().width - p.inset * 2)
      return (
        (Math.abs(p.to() - p.from()) * w) / Math.max(1, bounds[idx * 2 + 1] - bounds[idx * 2])
      )
    }

    /** Leaves the ball hidden and breaks the rotation chain. */
    const park = () => {
      setO(0)
      lastX = null
    }

    // Quadratics through (0,0)–(1,1) with a prescribed slope `c` at the end
    // that joins a roll: `leaving` matches at k=0 and runs free after,
    // `arriving` runs free and matches at k=1.
    const leaving = (k: number, c: number) => c * k + (1 - c) * k * k
    const arriving = (k: number, c: number) => (2 - c) * k - (1 - c) * k * k

    const apply = () => {
      if (ballPerches.dirty) resort()
      if (!sorted.length) {
        setO(0)
        return
      }
      const y = smoothed
      const vh = window.innerHeight
      const vw = window.innerWidth
      resolve(vh)

      let i = 0
      while (i < sorted.length && y >= bounds[i * 2 + 1]) i++

      let cx: number
      let cy: number
      // Whether the ball is on a surface this frame. A landing bounce is a
      // thing that happens to a ball resting on something, so it must not
      // carry on into the fall off the other end of it.
      let onPerch = false
      // Whether that surface is the ball's resting place.
      let atRest = false

      if (i >= sorted.length) {
        // Past the last perch — keep falling, out of the frame.
        const last = sorted[sorted.length - 1]
        const k = (y - bounds[bounds.length - 1]) / (vh * EXIT_SCROLL_VH)
        // Once the fall is spent the ball is gone for good. Without this it
        // stays pinned to a departure point that is itself still scrolling
        // up, which walks it back into the bottom of the frame over the
        // footer — a ball with nothing left to ride, drifting.
        if (k >= 1) {
          park()
          return
        }
        const p = pointAt(last, last.to())
        if (!p) return park()
        cx = p.x + 130 * k
        cy = p.y - ballR + vh * 1.15 * k * k
      } else {
        const enter = bounds[i * 2]

        if (y >= enter) {
          const perch = sorted[i]
          const p = pointAt(perch, perchT(i))
          if (!p) return park()
          cx = p.x
          cy = p.y - ballR
          launchFor = -1
          // Recorded here, while the surface is settled and being ridden, so
          // the hop off the end of it launches from the same place whichever
          // way the page is being scrolled.
          const ex = pointAt(perch, perch.to())
          if (ex) exitAnchor[i] = ex.x
          onPerch = true
          atRest = perch.bounce
          // A landing is arriving on a perch that is not the one the ball was
          // last riding — which covers dropping onto the next one going down
          // and dropping back onto the previous one coming up, both of which
          // are arrivals out of the air. Perch 0 is where the ball starts the
          // page rather than somewhere it landed, and `riding` of -1 is the
          // first frame or a refresh, so neither of those bounces.
          if (i > 0 && riding >= 0 && riding !== i) landAt = clock
          riding = i
        } else {
          // Falling into perch i. Both endpoints are read live, so the arc
          // stays continuous while the surfaces underneath it are still
          // moving — which they are, since the target is usually still
          // scrolling up towards the fold.
          // Aimed at where the target is *now*, not at its entry point. With a
          // section-driven clock those differ: the ball's window can open a
          // little before or after the section starts moving the surface, and
          // aiming at a fixed entry point would then step the moment the ball
          // switched from falling to riding.
          const to = pointAt(sorted[i], perchT(i))
          if (!to) return park()
          const prev = i > 0 ? sorted[i - 1] : null
          const prevExit = prev ? bounds[i * 2 - 1] : enter - vh
          const fromP = prev ? pointAt(prev, prev.to()) : { x: to.x - 90, y: to.y - vh * 0.5 }
          if (!fromP) return park()

          // The anchor recorded while the previous perch was ridden is the
          // direction-independent answer; pinning on entry is the fallback for
          // a perch this ball has never ridden — a mid-page load scrolled
          // straight upward, or the first frame after a re-sort.
          const anchored = prev ? exitAnchor[i - 1] : null
          if (anchored !== null && anchored !== undefined) {
            launchFor = i
            launchX = anchored
          } else if (launchFor !== i || launchX === null) {
            launchFor = i
            launchX = fromP.x
          }
          fromP.x = launchX!

          const span = Math.max(1, enter - prevExit)

          if (prev?.side) {
            // Sideways handoff: the ball rolls straight off the edge of the
            // frame and comes back in at the other side for the next perch,
            // rather than arcing between the two. What is in between — the
            // work deck — is content it should pass behind the edge of,
            // not over.
            //
            // Each leg is timed from the roll speed it joins, so the ball
            // leaves at the pace it was rolling and arrives at the pace it is
            // about to roll. That is the whole of what keeps this smooth: a
            // fixed leg length would step the velocity at both ends.
            const offR = vw + ballR * 4
            const offL = -ballR * 4
            const dOut = Math.max(1, offR - fromP.x)
            const dIn = Math.max(1, to.x - offL)
            // Leaving: the perch being left is a settled surface, so its exit
            // point and its roll speed are both steady and the departure slope
            // can be matched to them exactly.
            const sOut = rollSpeed(i - 1)
            let legOut = gsap.utils.clamp(
              SIDE_LEG_MIN,
              SIDE_LEG_MAX,
              sOut > 0.01 ? (SIDE_HASTE * dOut) / sOut : SIDE_LEG_MIN
            )

            // Arriving: measured against TARGET_SPEED and a fixed fraction of
            // the viewport, deliberately *not* against the perch being joined.
            // The chart's first card is still opening while the ball is on its
            // way to it, so its width — and therefore its measured roll speed
            // and entry point — move every frame. A leg length derived from
            // those moves the boundary `k` is counted from, and progress
            // counted from a moving boundary does not advance smoothly, it
            // jumps. Endpoints are free to move; the parameterisation is not.
            let legIn = gsap.utils.clamp(
              SIDE_LEG_MIN,
              SIDE_LEG_MAX,
              (SIDE_HASTE * vw * 0.5) / TARGET_SPEED
            )

            // Neither leg may eat into the other; a short gap scales both.
            const legs = legOut + legIn
            if (legs > span) {
              legOut *= span / legs
              legIn *= span / legs
            }

            // Recovered from the leg finally used, so clamping or scaling
            // above cannot break the departure's slope match.
            const cOut = gsap.utils.clamp(0.05, 1, (sOut * legOut) / dOut)
            const cIn = SIDE_HASTE

            if (y <= prevExit + legOut) {
              // Still rolling, now off the right edge. Level, because it is a
              // continuation of the roll rather than a fall.
              cx = fromP.x + dOut * leaving((y - prevExit) / legOut, cOut)
              cy = fromP.y - ballR
            } else if (y >= enter - legIn) {
              cx = offL + dIn * arriving((y - (enter - legIn)) / legIn, cIn)
              cy = to.y - ballR
            } else {
              // Off-stage. Nothing to draw, and the ball that comes back in at
              // the far side did not roll there — park() breaks the rotation
              // chain so the re-entry does not spin it by a screen's width.
              park()
              return
            }
          } else {
            const k = clamp01((y - prevExit) / span)

            // Running off an edge carries no upward velocity, so the arc is a
            // plain parabola: x linear, y quadratic.
            //
            // Except horizontally on a long fall. Both endpoints are read
            // live, which is what keeps short hops continuous while the
            // surfaces underneath are still settling — but over a long fall a
            // departure point can travel a long way on its own. The hero's
            // mark is the case in point: it slides a full viewport left, so a
            // fall anchored to it gets dragged off the left edge of the screen
            // instead of heading for its target. Easing x out spends the drag
            // early and commits the ball to where it is actually going.
            const kx = span > vh * 0.9 ? 1 - (1 - k) * (1 - k) : k
            cx = fromP.x + (to.x - fromP.x) * kx
            cy = fromP.y - ballR + (to.y - fromP.y) * k * k
          }
        }
      }

      let sy = 1
      if (atRest) {
        // One hop per REST_PERIOD, forever. |sin| is the right shape for it:
        // a cusp at each contact and a rounded apex between, which is what a
        // ball leaving and meeting a surface actually does. A plain sine would
        // ease *into* the floor, and a ball that decelerates on its way down
        // reads as floating.
        const t = (clock % REST_PERIOD) / REST_PERIOD
        cy -= REST_PX * Math.sin(t * Math.PI)
        // Squash *is* the contact, so it is sharply concentrated at the ends
        // of the hop and absent for the whole flight.
        sy = 1 - REST_SQUASH * Math.abs(Math.cos(t * Math.PI)) ** 6
      } else if (onPerch) {
        const bt = (clock - landAt) / BOUNCE_TIME
        if (bt >= 0 && bt < 1) {
          const decay = 1 - bt
          // Height above the surface. Zero at each contact — bt of 0, ½ and 1
          // — and peaking between them.
          cy -= BOUNCE_PX * decay * Math.abs(Math.sin(bt * Math.PI * 2))
          // On the same clock as the height, deliberately: full where the ball
          // is touching, none at the top of a hop. Giving it a clock of its
          // own drifted it out of phase with the bounce — peak squash landed a
          // dozen pixels into the air, which reads as an egg, not an impact.
          sy = 1 - SQUASH * decay * Math.abs(Math.cos(bt * Math.PI * 2))
        }
      }

      // Rotation from horizontal displacement actually travelled, which is
      // what reads as rolling.
      //
      // Discontinuities are marked explicitly, by park() clearing lastX, and
      // not inferred from the size of the step. A magnitude threshold looked
      // equivalent and was not: on a fast rail one flick of the wheel moves
      // the ball further in a frame than the threshold allowed, so the guard
      // fired on ordinary rolling and the spin froze for a frame at a time
      // whenever the scroll was quick. Explicit is also correct at the other
      // end — a teleport smaller than the threshold no longer spins it.
      if (lastX !== null) rot += ((cx - lastX) / ballR) * (180 / Math.PI)
      lastX = cx

      setX(cx - ballR)
      setY(cy - ballR)
      setSY(sy)
      setSX(1 / sy)
      setSpin(rot)
      // Faded against all four edges, not just the top and bottom. The hero's
      // mark travels a full viewport leftward while the ball rides it, so a
      // perch really can carry the ball out of frame sideways — and a ball
      // that is off-screen at full opacity is a ball that pops back in.
      setO(
        Math.min(
          clamp01((cy + ballR) / FADE_PX),
          atRest ? 1 : clamp01((vh - (cy - ballR)) / FADE_PX),
          clamp01((cx + ballR) / FADE_PX),
          clamp01((vw - (cx - ballR)) / FADE_PX)
        ) * intro.v
      )
    }

    // Every frame, not only the frames the scroll changed: the surfaces move
    // for reasons of their own — a pinned section settling, a scrubbed card
    // still opening — so the ball has to be re-solved regardless.
    //
    // Added to the ticker after ScrollTrigger's own listener, so by the time
    // this runs every scrub for the frame has been applied and the rects it
    // reads are this frame's, not last frame's.
    const tick = (_time: number, deltaMs: number) => {
      // Clamped: coming back to a backgrounded tab hands over one enormous
      // delta, which would snap the ball across the page in a single frame.
      const dt = Math.min(deltaMs / 1000, 0.05)
      clock += dt
      smoothed += (window.scrollY - smoothed) * (1 - Math.exp(-dt / FOLLOW_TAU))
      apply()
    }

    // A refresh re-resolves every perch's start/end, which can reorder them.
    const onRefresh = () => {
      ballPerches.dirty = true
    }

    resort()
    apply()
    gsap.ticker.add(tick)
    ScrollTrigger.addEventListener('refresh', onRefresh)

    return () => {
      gsap.ticker.remove(tick)
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      gsap.set([ball, spin], { clearProps: 'all' })
    }
  })
})

onBeforeUnmount(() => {
  mm?.revert()
})
</script>

<template>
  <div ref="ballRef" class="scroll-ball" aria-hidden="true">
    <span ref="spinRef" class="scroll-ball-spin" />
  </div>
</template>

<style scoped>
.scroll-ball {
  position: fixed;
  top: 0;
  left: 0;
  /* Under the nav's z-100 — the ball passes behind the bar rather than over
     it. Above everything else, including the work deck's blur band. */
  z-index: 90;
  width: clamp(32px, 2.8vw, 46px);
  height: clamp(32px, 2.8vw, 46px);
  border-radius: 9999px;
  background: radial-gradient(circle at 34% 28%, #ffa877, #ff7c3e 40%, #e8551c 76%, #c6420f);
  box-shadow: 0 10px 18px -10px rgba(198, 66, 15, 0.55);
  opacity: 0;
  pointer-events: none;
  will-change: transform, opacity;
}

/* The sphere's shading is fixed — light does not orbit with the ball — so
   rotation lives on this layer, and needs marks on it to be legible at all.
   Two soft poles read as a rolling ball; a bare gradient reads as one
   sliding. */
.scroll-ball-spin {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 13%, rgba(139, 44, 8, 0.34) 0 17%, transparent 18%),
    radial-gradient(circle at 50% 87%, rgba(139, 44, 8, 0.34) 0 17%, transparent 18%);
}

/* Specular highlight, above the spinning layer and deliberately outside it. */
.scroll-ball::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 33% 25%, rgba(255, 255, 255, 0.5), transparent 45%);
}

/* Belt and braces with the BALL_QUERY gate in <script>: if the journey is not
   running, the element is not there to be found. */
@media (max-width: 1023px), (prefers-reduced-motion: reduce) {
  .scroll-ball {
    display: none;
  }
}
</style>
