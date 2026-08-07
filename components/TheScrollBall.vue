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
const REST_SQUASH = 0.1
// How much of the hop, either side of a contact, the ball is deformed for.
// Contact is brief — a ball leaves the floor round. Widening this is what
// makes a resting ball look permanently flat rather than repeatedly struck:
// the deformation trails it up into the air, where nothing is touching it.
const REST_CONTACT = 0.12

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

// The pace the ball travels at, px of on-screen travel per px of scroll. This
// is the one number the whole journey is laid out against — see layout().
//
// It used to be the other way round, and that is the bug this file was opened
// for. Each section picked its own scroll window and its own from→to, and
// whatever speed fell out of dividing one by the other was the speed the ball
// went. `TARGET_SPEED` sat here claiming perch windows were "sized against
// it"; nothing sized anything. Measured at 1920×1080, horizontally:
//
//   projects rail        0.77      experience → skills   2.70
//   skills rail          0.68      skills → education    3.47
//   languages card       0.77      languages → footer    2.56
//   hero mark            1.34      chart cards           0.19 – 0.40
//
// The pattern is the complaint: the crossings — the moments the ball is most
// visible, arcing alone across open page — were consistently the fastest thing
// on the site, and reversing direction made them worse, not better. The ball
// cruises, bolts, cruises.
//
// So the direction of derivation is inverted. Speed is the invariant and the
// windows are computed from it, every frame, against whatever scroll the page
// actually has between one anchored surface and the next.
//
// ROLL is the cruise, and 0.75 is measured rather than chosen: it is what the
// three plain rails were already doing on their own. It is the pace the page
// reads at when nothing is going wrong.
const ROLL_SPEED = 0.75
// A crossing may run a little quicker than a roll — the ball is airborne, and
// too much hang time reads as float rather than as a hop. Only a little: these
// were the fast part, and the fix is not to license them.
const CROSS_SPEED = 0.9

// Least scroll a crossing gets whatever its width, as a fraction of viewport
// height. This is the vertical budget: a hop that goes almost straight down
// has no horizontal distance to size itself from and still has to fall for
// long enough to read as falling. A perch's own `fall` overrides it, which is
// how a section says "the next hop is a short one" — see useScrollBall.ts.
const MIN_CROSS_VH = 0.3

// How much of its from→to a roll may be cut back to, when a stretch of page
// does not have the scroll to ride all of it at ROLL_SPEED.
//
// Riding part of a rule is invisible — nobody knows how far along the ball was
// supposed to get. Sprinting across the whole of it is not, and that is the
// only other way to make the distance fit. So the ball gives up ground rather
// than composure.
//
// Not 0: a perch the ball lands on and does not roll along at all reads as a
// stop, not as a landing.
const ROLL_MIN_RIDE = 0.22

// How much scroll the exit fall past the last perch is spread over. Short on
// purpose: past the last perch there is nothing left to ride, so the ball
// should be gone rather than drifting.
//
// With the footer registering a resting perch this is now the fallback rather
// than how the page ends — a resting perch's window outlasts the document, so
// there is no "past the last perch" to reach. It still matters if the footer
// is ever absent, and for any page that ends on an ordinary perch.
const EXIT_SCROLL_VH = 0.32

// Bounds on a sideways exit or entry. The leg itself is CROSS_SPEED against
// the distance to the frame edge, same as any other crossing; these only stop
// a degenerate perch producing a leg so short it snaps or so long it creeps.
//
// SIDE_HASTE used to live here — the leg was cut to 55% of its constant-speed
// length and a quadratic made up the difference, which meant the ball left the
// frame at 1.8× the pace it had been rolling and came back in at the same.
// That is half of what "very fast between sections" was. With the leg sized
// from the speed it is joining there is nothing left to make up, so the
// quadratics below only have to match slope, not buy back distance.
const SIDE_LEG_MIN = 120
const SIDE_LEG_MAX = 1400

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
    // Every perch's [enter, exit] for this frame, flat. Computed rather than
    // read: for a free perch these are laid out from the ball's speed, not
    // from what the section declared — see layout().
    let bounds: number[] = []

    // Each surface's ride geometry for this frame: left end, ridable width,
    // and top edge, all in viewport coordinates. Measured once per frame in
    // measure() and read everywhere else.
    //
    // Cached because layout() needs every perch's geometry before it can place
    // any of them — it sizes each crossing from the distance between the two
    // surfaces it joins — and reading a rect per question would mean dozens of
    // getBoundingClientRect calls per frame instead of one per surface. A width
    // of -1 marks a perch whose surface has gone.
    let x0s: number[] = []
    let widths: number[] = []
    let tops: number[] = []

    // How much of its from→to each perch actually rides this frame, 0–1.
    // 1 unless the stretch of page it sits in is too short to ride all of it
    // at ROLL_SPEED — see layout().
    let ride: number[] = []

    // The scroll each section asked for, before layout had its say.
    //
    // Kept because a perch's from→to is not the whole of how far the ball
    // travels on it. A surface can move under the ball: the hero's mark slides
    // a viewport and a half left while the ball sits at one point on it, so its
    // from and to are the same value and its roll distance measures zero.
    // Sizing that window from roll distance alone collapses it to nothing, and
    // the ball spends the whole hero falling towards the next perch instead of
    // riding the headline — which is what happened the first time this was
    // written. A section knows how long its surface needs the ball; layout may
    // lengthen that to keep the pace down, and shortens it only when the page
    // genuinely has no room.
    let declared: number[] = []
    // And the scroll position each section asked to be handed the ball at.
    // Layout may hand it over later — a crossing that needs more room pushes
    // everything after it back — but never earlier: a section's start is the
    // point at which its surface is somewhere the ball can usefully be, and
    // arriving before it means landing on something that is not on screen yet.
    let declStart: number[] = []

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

    // The exit point of each perch that owns its own clock, recorded on every
    // frame the ball is actually riding it.
    //
    // Pinning launchX on entry to the fall is not enough on its own for those,
    // because *when* that entry happens depends on which way you are
    // scrolling. Downwards you enter the hop off a card that is still fully
    // open; upwards you enter the same hop off a card that has already closed,
    // and the pinned value is then the collapsed bar's right edge. Measured on
    // the chart, the same two hops launched from x=705 and x=989 going down
    // but x=450 and x=754 coming up — a quarter of the frame out, and the jump
    // you saw at every handoff scrolling back.
    //
    // Only for those, though, and that qualifier is the whole of a second bug.
    // A recorded anchor is a claim that a perch has one exit point; it is only
    // true of a surface whose shape is driven by its section's timeline, where
    // "open" is a state the ball can wait for. It is false of a surface that
    // travels with the scroll, and the hero's mark travels a viewport and a
    // half. Recorded there, the anchor held whatever x the mark had when the
    // ball last sat on it — on a page loaded at the top, x=1448, the mark's
    // starting position. Scroll to the bottom and come back up and the fall
    // out of the hero launched from 1448 while the mark itself was at x=1,
    // until the ball crossed back into the hero's window and snapped the width
    // of the screen to meet it. That is the jump on the way up through the
    // hero: 1422 to 64 between two frames, at full opacity.
    //
    // A surface with no clock of its own is at the same place at the same
    // scroll position whichever way you arrived, so reading it live is both
    // simpler and correct.
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
      x0s = new Array(sorted.length).fill(0)
      widths = new Array(sorted.length).fill(-1)
      tops = new Array(sorted.length).fill(0)
      ride = new Array(sorted.length).fill(1)
      declared = new Array(sorted.length).fill(0)
      declStart = new Array(sorted.length).fill(0)
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
     * Every surface's ride geometry for this frame, in viewport coordinates.
     * One getBoundingClientRect per perch, before anything is asked about any
     * of them — layout() needs the whole set to size the crossings between
     * them, and asking per question would be dozens of rect reads a frame.
     */
    const measure = () => {
      for (let s = 0; s < sorted.length; s++) {
        const el = sorted[s].surface()
        if (!el) {
          widths[s] = -1
          continue
        }
        const r = el.getBoundingClientRect()
        const a = r.left + sorted[s].inset
        x0s[s] = a
        widths[s] = Math.max(0, r.right - sorted[s].inset - a)
        tops[s] = r.top
      }
    }

    /**
     * A perch whose window is not the ball's to move.
     *
     * A scrubbed section hands the ball its own clock — a card is ridable
     * exactly while it is open, and that is decided by the section's timeline,
     * not by how fast the ball would like to be going. The resting perch is
     * where the document ends, so there is nowhere to move it to. Everything
     * else is free, and free is the normal case.
     */
    const anchored = (s: number) => !!sorted[s].progress || sorted[s].bounce

    /** A point on perch `idx`, `t` as a fraction of its inset width. */
    const pointAt = (idx: number, t: number) => {
      if (widths[idx] < 0) return null
      // Clamping `t` rather than trusting it is what absorbs the residual
      // desync between this ball's follow and a section's own scrub: the ball
      // can never end up past the end of the surface it is supposed to be on.
      return { x: x0s[idx] + widths[idx] * clamp01(t), y: tops[idx] }
    }

    /** Where perch `idx`'s roll ends this frame, after any cutback. */
    const exitT = (idx: number) => {
      const p = sorted[idx]
      const a = p.from()
      return a + (p.to() - a) * ride[idx]
    }

    /** Px the ball travels sideways riding all of perch `idx`. */
    const rollDist = (idx: number) =>
      widths[idx] < 0 ? 0 : Math.abs(sorted[idx].to() - sorted[idx].from()) * widths[idx]

    /**
     * Scroll a crossing from perch `a` to perch `b` needs, at CROSS_SPEED.
     *
     * Measured with both rolls at full length, before any cutback is known —
     * a cutback moves the launch point, so in principle this is circular.
     * Deliberately not iterated: resolving it would make one frame's layout
     * depend on the last one's, and a feedback loop running at 60Hz over
     * geometry that is itself moving is how a ball starts to shimmer. A fixed
     * point that is slightly wrong beats a moving one that is exactly right.
     */
    const crossWant = (a: number, b: number, vh: number) => {
      const floor = vh * (sorted[a].fall ?? MIN_CROSS_VH)
      if (widths[a] < 0 || widths[b] < 0) return floor

      const from = x0s[a] + widths[a] * sorted[a].to()
      const to = x0s[b] + widths[b] * sorted[b].from()

      // Sideways: the ball rolls out past one edge of the frame and comes back
      // in at the other, so the distance is the two legs, not the gap between
      // the perches. What happens in between is off-stage and costs nothing.
      const dist = sorted[a].side
        ? Math.max(0, window.innerWidth + ballR * 4 - from) + Math.max(0, to + ballR * 4)
        : Math.abs(to - from)

      return Math.max(floor, dist / CROSS_SPEED)
    }

    /**
     * Lays every perch window out for this frame at the ball's own speed.
     *
     * The page is a sequence of rolls and crossings between fixed points, and
     * the fixed points are the anchored perches — the scrubbed chart cards and
     * the footer's resting rule, whose windows belong to their sections. Each
     * free stretch between two anchors is a scroll budget, and this spends it
     * on the legs in that stretch in proportion to how far the ball has to
     * travel along each. Speed is then constant across the whole stretch by
     * construction, and there is no arithmetic anywhere that can produce a
     * crossing four times quicker than the roll leading into it.
     *
     * This also settles, without a special case, what resolve() used to need
     * MIN_FALL and MIN_WINDOW for. Sections declare their windows knowing
     * nothing about their neighbours, so two of them could meet exactly or
     * overlap by a few pixels, and where they overlapped a scroll position
     * belonged to both — the lookup picked one or the other depending on which
     * side of the line an easing clock happened to land, flipping between two
     * perches on consecutive frames. Windows are no longer read from sections
     * at all, only their anchors are, so the set is ordered and disjoint
     * because it was built that way.
     */
    const layout = (vh: number) => {
      const n = sorted.length

      for (let s = 0; s < n; s++) {
        const [a, b] = sorted[s].range()
        bounds[s * 2] = a
        bounds[s * 2 + 1] = Math.max(b, a + 1)
        declared[s] = bounds[s * 2 + 1] - bounds[s * 2]
        declStart[s] = bounds[s * 2]
        ride[s] = 1
      }
      if (!n) return

      // Anchored windows stay exactly as declared; the free runs between them
      // are re-laid. Two adjacent anchors have nothing between them to lay.
      let s = 0
      while (s < n) {
        if (anchored(s)) {
          s++
          continue
        }
        let e = s
        while (e < n && !anchored(e)) e++
        layoutRun(s, e, vh)
        s = e
      }

      // Anchors are the sections' own geometry and can still meet or cross
      // each other. Nothing here can fix that — their windows are not the
      // ball's to move — but the lookup must not see a window that starts
      // before the one before it ended.
      for (let i = 1; i < n; i++) {
        if (bounds[i * 2] < bounds[i * 2 - 1]) bounds[i * 2] = bounds[i * 2 - 1]
        if (bounds[i * 2 + 1] <= bounds[i * 2]) bounds[i * 2 + 1] = bounds[i * 2] + 1
      }
    }

    /**
     * Lays out the free perches `[s, e)` and the crossings around them into
     * the scroll between the anchors either side.
     */
    const layoutRun = (s: number, e: number, vh: number) => {
      const n = sorted.length
      // The crossing into this run comes out of the previous anchor's exit;
      // the crossing out of it has to land on the next anchor's entry. With no
      // anchor on a side, the run keeps what that end of it declared.
      const start = s > 0 ? bounds[s * 2 - 1] : bounds[s * 2]
      const end = e < n ? bounds[e * 2] : bounds[(e - 1) * 2 + 1]
      const budget = end - start
      // Two anchors that meet or cross leave nothing to spend. Their windows
      // are the sections' own and not the ball's to move, so the run keeps
      // what it declared and the ordering guard in layout() picks up the
      // pieces — better a squeezed run than spans computed off a negative
      // budget, which would lay the windows out backwards.
      if (budget <= 1) return

      // Legs, in order: an optional crossing in, then roll/crossing pairs,
      // then an optional crossing out. Wants are in scroll px already, so a
      // want is just "the scroll this leg needs to run at the right speed".
      // Two figures per roll. `need` is what riding all of it at ROLL_SPEED
      // costs; `pref` is that or the section's own window, whichever is longer.
      // A window longer than the roll needs is a ball rolling slower than the
      // cruise, which nobody has ever complained about — and for a surface
      // that moves under the ball it is the only thing holding the window open
      // at all. See `declared`.
      const need: number[] = []
      const pref: number[] = []
      let sumNeed = 0
      let sumPref = 0
      for (let i = s; i < e; i++) {
        const nd = rollDist(i) / ROLL_SPEED
        const pf = Math.max(nd, declared[i])
        need.push(nd)
        pref.push(pf)
        sumNeed += nd
        sumPref += pf
      }

      const wantCross: number[] = []
      let sumCross = 0
      let sumSide = 0
      const addCross = (a: number, b: number) => {
        const w = crossWant(a, b, vh)
        wantCross.push(w)
        sumCross += w
        if (sorted[a].side) sumSide += w
      }
      if (s > 0) addCross(s - 1, s)
      for (let i = s; i < e - 1; i++) addCross(i, i + 1)
      if (e < n) addCross(e - 1, e)

      // Crossings are paid first and rolls give way, in that order, because a
      // roll can be shortened invisibly and a crossing cannot: the ball is in
      // open frame for the whole of a crossing, going somewhere definite, and
      // the only way to shorten one is to make it quicker. That is the thing
      // this file exists to stop.
      const forRolls = budget - sumCross
      const rollSpan: number[] = []
      let scale = 1

      if (forRolls >= sumPref) {
        // Room for everything, including whatever the sections asked for.
        for (let j = 0; j < pref.length; j++) rollSpan.push(pref[j])
      } else if (forRolls >= sumNeed) {
        // Room to ride every roll at the cruise, but not for the slack the
        // sections wanted on top. Give that slack back in proportion.
        const t = (forRolls - sumNeed) / Math.max(1, sumPref - sumNeed)
        for (let j = 0; j < need.length; j++) rollSpan.push(need[j] + (pref[j] - need[j]) * t)
      } else {
        // Not even room to ride them all. The ball rides less of each surface
        // rather than crossing it faster.
        const r = Math.max(ROLL_MIN_RIDE, forRolls / Math.max(1, sumNeed))
        for (let j = 0; j < need.length; j++) rollSpan.push(need[j] * r)
        for (let i = s; i < e; i++) ride[i] = Math.min(1, r)

        // Floored out and still short. This is a stretch of page with less
        // scroll in it than the ball has distance to cover, and no arithmetic
        // here can conjure more — so the shortfall is spread evenly over every
        // leg rather than dropped on whichever one happens to be last.
        let sumFloor = 0
        for (const v of rollSpan) sumFloor += v
        if (sumFloor + sumCross > budget) scale = budget / (sumFloor + sumCross)
      }

      // Spare scroll goes off-stage first. A sideways crossing spends most of
      // itself past the edge of the frame, so lengthening one costs nothing
      // that anybody sees — where the alternative, spreading it over the run,
      // is a ball that rolls slower than the page reads.
      let sumRoll = 0
      for (const v of rollSpan) sumRoll += v
      let sideBonus = 0
      let evenBonus = 0
      const spare = budget - (sumRoll + sumCross)
      if (spare > 0) {
        if (sumSide > 0) sideBonus = spare / sumSide
        else evenBonus = spare / Math.max(1, sumRoll + sumCross)
      }

      const span = (want: number, side: boolean) =>
        want * scale * (1 + (side ? sideBonus : evenBonus))

      // Scroll still owed to everything from perch i onwards — its roll, every
      // crossing after it, and the crossing out of the run. Walked backwards
      // so the forward pass below can tell, at each perch, how much of the
      // budget it is not allowed to spend.
      const rollAt = (i: number) => rollSpan[i - s] * scale * (1 + evenBonus)
      // wantCross holds the crossing into the run first, where there is one,
      // then one per gap between perches, then the crossing out.
      const lead = s > 0 ? 1 : 0
      const gapAfter = (i: number) => span(wantCross[lead + (i - s)], sorted[i].side)

      const owed: number[] = new Array(e - s).fill(0)
      let acc = e < n ? span(wantCross[wantCross.length - 1], sorted[e - 1].side) : 0
      for (let i = e - 1; i >= s; i--) {
        acc += rollAt(i)
        owed[i - s] = acc
        if (i > s) acc += gapAfter(i - 1)
      }

      let c = start
      if (lead) c += span(wantCross[0], sorted[s - 1].side)
      for (let i = s; i < e; i++) {
        // Never handed the ball before its section is ready for it. Spending
        // the scroll a crossing asked for can only push a landing later, but
        // spare scroll pulled one earlier — and a perch whose window opens
        // ahead of its declared start is a surface that is not on screen yet.
        // The projects rule showed it: laid out 370px early, the ball met it
        // 370px lower, which is below the fold, so the hop out of the hero
        // dived off the bottom of the frame and the ball reappeared from
        // underneath riding a rule up into view. The scroll this costs goes
        // back to the crossing before it, which is a longer fall — the right
        // place for it.
        //
        // Only as far as the rest of the run can afford, though. Waiting is
        // free until it starts eating what the crossings after it were
        // promised, and then it is the most expensive thing here: the work
        // deck's last card declares a window that runs past the point the
        // experience chart opens, and honouring all of it left the hop into
        // the chart with almost no scroll to happen in — the ball came back
        // into frame at 2.7px per px, which is the whole complaint again in
        // the one place the layout had reserved room to avoid it.
        c = Math.max(c, Math.min(declStart[i], end - owed[i - s]))
        bounds[i * 2] = c
        // A roll never soaks up spare scroll it did not ask for unless the
        // whole run is being stretched evenly — see above.
        c += rollAt(i)
        bounds[i * 2 + 1] = Math.max(c, bounds[i * 2] + 1)
        c = bounds[i * 2 + 1]
        if (i < e - 1) c += gapAfter(i)
      }
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

    /**
     * The `t` for `pointAt` that corresponds to perch `idx`'s current
     * progress, over however much of its from→to it is riding this frame.
     */
    const perchT = (idx: number) => {
      const p = sorted[idx]
      const a = p.from()
      return a + (exitT(idx) - a) * perchK(idx)
    }

    /** Px of horizontal travel per px of scroll while riding perch `idx`. */
    const rollSpeed = (idx: number) => {
      if (widths[idx] < 0) return 0
      const d = Math.abs(exitT(idx) - sorted[idx].from()) * widths[idx]
      return d / Math.max(1, bounds[idx * 2 + 1] - bounds[idx * 2])
    }

    /**
     * Whether a hop from perch `a` to perch `b` can be timed on a clock the
     * two of them share.
     *
     * Only one kind of section hands the ball a clock — one that scrubs its
     * own timeline — and where two such perches are adjacent they are two
     * slices of that same timeline. Two different scrubbed sections could not
     * be neighbours without a plain perch between them, so "both have a clock"
     * is in practice "both have the same clock".
     */
    const sameClock = (a: number, b: number) =>
      a >= 0 && b < sorted.length && !!sorted[a].progress && !!sorted[b].progress

    /**
     * Whether the ball has finished with perch `idx`, and whether it has
     * arrived at it.
     *
     * Handing a section's clock to `perchK` fixed where the ball sits along a
     * card. It did not fix *which* card: that was still decided by comparing
     * the ball's smoothed scroll against the card's window, so the ball chose
     * its card on one clock and placed itself on it with another. The chart
     * scrubs at 0.8 against the ball's 0.12, which at reading speed is several
     * hundred px of scroll apart, and the gap reverses sign with direction —
     * so going down the two roughly agreed and coming up they did not. The
     * ball switched to the next card while the chart still had the previous
     * one open, and jumped 334px backwards in a single frame at full opacity.
     *
     * Where both sides of a handoff keep the same clock, both questions are
     * now asked of that clock. Where they do not — a plain rule handing over
     * to the chart, or the chart to the next rule — the scroll comparison is
     * still the right one and is left alone.
     */
    const donePerch = (idx: number) =>
      sameClock(idx, idx + 1) ? sorted[idx].progress!() >= 1 : smoothed >= bounds[idx * 2 + 1]

    const arrived = (idx: number) =>
      sameClock(idx - 1, idx) ? sorted[idx].progress!() >= 0 : smoothed >= bounds[idx * 2]

    /**
     * How far through a hop from perch `idx - 1` to perch `idx` the ball is.
     *
     * Between two perches on one clock this is "how far past the last one
     * against how far short of the next", each measured on that clock — which
     * is exactly 0 as the ball leaves and exactly 1 as it lands, in both
     * directions, with no boundary that can move underneath it. For a plain
     * pair the same expression reduces to the scroll fraction it has always
     * been, which is what keeps every other hop matched to the scroll layout()
     * budgeted for it.
     */
    const hopK = (idx: number, prevExit: number, span: number) => {
      if (!sameClock(idx - 1, idx)) return clamp01((smoothed - prevExit) / span)
      const wOut = Math.max(1, bounds[idx * 2 - 1] - bounds[idx * 2 - 2])
      const wIn = Math.max(1, bounds[idx * 2 + 1] - bounds[idx * 2])
      const out = Math.max(0, (sorted[idx - 1].progress!() - 1) * wOut)
      const into = Math.max(0, -sorted[idx].progress!() * wIn)
      return clamp01(out / Math.max(1, out + into))
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
      measure()
      layout(vh)

      let i = 0
      while (i < sorted.length && donePerch(i)) i++

      let cx: number
      let cy: number
      // Whether the ball is on a surface this frame. A landing bounce is a
      // thing that happens to a ball resting on something, so it must not
      // carry on into the fall off the other end of it.
      let onPerch = false
      // Whether that surface is the ball's resting place.
      let atRest = false
      // ...and whether the ball is still on its way down to it. The bottom fade
      // exists to say "nothing left to ride, so fade rather than clip at the
      // edge", and the resting perch is already exempt from it for the reason
      // in FADE_PX's note — but the approach to it was not, so the last stretch
      // of the fall dimmed to half strength and then snapped back to full on
      // the frame it landed. The rule the footer rests it on sits low in the
      // frame by design, so the arc onto it is inside the band for its final
      // ~150px whatever else is done. A ball dropping onto its own resting
      // place is no more "out of road" than one sitting on it.
      let homing = false

      if (i >= sorted.length) {
        // Past the last perch — keep falling, out of the frame.
        const last = sorted.length - 1
        const k = (y - bounds[bounds.length - 1]) / (vh * EXIT_SCROLL_VH)
        // Once the fall is spent the ball is gone for good. Without this it
        // stays pinned to a departure point that is itself still scrolling
        // up, which walks it back into the bottom of the frame over the
        // footer — a ball with nothing left to ride, drifting.
        if (k >= 1) {
          park()
          return
        }
        const p = pointAt(last, exitT(last))
        if (!p) return park()
        cx = p.x + 130 * k
        cy = p.y - ballR + vh * 1.15 * k * k
      } else {
        const enter = bounds[i * 2]

        if (arrived(i)) {
          const perch = sorted[i]
          const p = pointAt(i, perchT(i))
          if (!p) return park()
          cx = p.x
          cy = p.y - ballR
          launchFor = -1
          // Recorded here, while the surface is settled and being ridden, so
          // the hop off the end of it launches from the same place whichever
          // way the page is being scrolled. Only for a surface whose shape is
          // its section's business rather than the scrollbar's — see
          // exitAnchor.
          if (perch.progress) {
            const ex = pointAt(i, exitT(i))
            if (ex) exitAnchor[i] = ex.x
          }
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
          const to = pointAt(i, perchT(i))
          if (!to) return park()
          homing = sorted[i].bounce
          const prev = i > 0 ? sorted[i - 1] : null
          const prevExit = prev ? bounds[i * 2 - 1] : enter - vh
          const fromP = prev
            ? pointAt(i - 1, exitT(i - 1))
            : { x: to.x - 90, y: to.y - vh * 0.5 }
          if (!fromP) return park()

          // A section that states its own exit point is the direction-
          // independent answer and needs nothing else. The anchor recorded
          // while the perch was ridden is the fallback for one that does not,
          // and pinning on entry the fallback for a perch this ball has never
          // ridden — a mid-page load scrolled straight upward, or the first
          // frame after a re-sort. A perch with no clock of its own consults
          // neither and needs neither: fromP was read live above and a surface
          // that is not animating is already right.
          const stated = prev?.exitX ? prev.exitX() : null
          const held = stated ?? (prev?.progress ? exitAnchor[i - 1] : null)
          if (held !== null && held !== undefined) {
            launchFor = i
            launchX = held
          } else if (prev && !prev.progress) {
            launchFor = i
            launchX = fromP.x
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
            // Each leg is the distance to the frame edge at CROSS_SPEED —
            // the same rate every other crossing on the page runs at, and the
            // same rate layout() reserved the scroll for. Whatever is left
            // over between the two legs is time spent off-stage, where the
            // ball's speed is nobody's business.
            const offR = vw + ballR * 4
            const offL = -ballR * 4
            const dOut = Math.max(1, offR - fromP.x)
            const dIn = Math.max(1, to.x - offL)
            let legOut = gsap.utils.clamp(SIDE_LEG_MIN, SIDE_LEG_MAX, dOut / CROSS_SPEED)

            // Arriving: sized from the same constants rather than from the
            // perch being joined, deliberately. The chart's first card is
            // still opening while the ball is on its way to it, so its width
            // — and therefore its measured roll speed and entry point — move
            // every frame. A leg length derived from those moves the boundary
            // `k` is counted from, and progress counted from a moving boundary
            // does not advance smoothly, it jumps. Endpoints are free to move;
            // the parameterisation is not.
            let legIn = gsap.utils.clamp(SIDE_LEG_MIN, SIDE_LEG_MAX, dIn / CROSS_SPEED)

            // Neither leg may eat into the other; a short gap scales both.
            const legs = legOut + legIn
            if (legs > span) {
              legOut *= span / legs
              legIn *= span / legs
            }

            // Slope match at each join, recovered from the leg finally used so
            // clamping or scaling above cannot break it. The ball leaves the
            // rule at exactly the pace it was rolling and lands on the next
            // one at exactly the pace it is about to roll; with the legs now
            // sized at CROSS_SPEED these are both near 1, so the quadratics
            // are gentle rather than the catapult SIDE_HASTE made of them.
            const cOut = gsap.utils.clamp(0.05, 1, (rollSpeed(i - 1) * legOut) / dOut)
            const cIn = gsap.utils.clamp(0.05, 1, (ROLL_SPEED * legIn) / dIn)

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
            const k = hopK(i, prevExit, span)

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

            // A fall never aims below the frame. Both endpoints are read live,
            // and early in a long hop the surface being aimed at is still
            // under the fold — a whole viewport under it, on the crossing out
            // of the hero. Aimed there, the ball dives off the bottom of the
            // screen and rides back up as the target climbs into view, which
            // is a third of a screen of nothing followed by a ball
            // reappearing from below.
            //
            // Capped, the ball falls towards the bottom of the frame and the
            // surface comes up to meet it, which is the same hop with the ball
            // still in it. The cap cannot bind at the landing: a perch's window
            // opens when its surface is in frame, so by k=1 the true target is
            // above this line and the arc ends exactly on it.
            const aim = Math.min(to.y, vh - ballR * 2)
            // The height the surface was at when the ball left it, not the
            // height it is at now.
            //
            // Read live, a fall is parameterised against a departure point that
            // is itself travelling up the frame, and the k² term does not
            // outgrow that until k = span/2Δ. For a short hop that is a few
            // dozen px of lift nobody reads as anything; for a long one it is
            // the whole first half of the arc spent going *up*. Measured on the
            // fall into the footer at a 720px span: 260px of rise before the
            // ball began to descend at all, which is why lengthening that fall
            // barely slowed the landing — the descent was being squeezed into
            // whatever was left.
            //
            // A surface that travels with the page has moved exactly as far as
            // the page has since the handover, so `k * span` recovers where it
            // was without capturing anything: the expression is constant across
            // the whole fall, equals fromP.y at k=0 so it joins the roll
            // continuously, and is the same value whichever direction the fall
            // is entered from.
            //
            // Which is why it is opt-in rather than the default. A pinned
            // surface has not moved with the page, so the same correction walks
            // its origin *down* the frame instead of holding it: applied to the
            // experience chart's last card, which is pinned, it steepened the
            // hop onto the skills rule from 0.13 to 1.13px/px on the first
            // frame. A pinned section states its exit height instead — see
            // `exitY` and `holdExit` in useScrollBall.ts.
            const originY = prev?.exitY
              ? prev.exitY()
              : fromP.y + (prev?.holdExit ? k * span : 0)
            cy = originY - ballR + (aim - originY) * k * k
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
        // Squash *is* the contact, so it is measured from the floor rather
        // than from the phase. Distance to the nearer contact — 0 on the
        // surface, 0.5 at the apex — cut off at REST_CONTACT so the ball is
        // round for the whole flight and only deforms where it is touching.
        //
        // `cos(t·π)^n` was the previous shape and is the wrong one however
        // high n goes: it is a curve over the entire hop, so some deformation
        // always survives into the air, and the exponent needed to hide that
        // makes the squash snap rather than land. A window has an edge.
        const contact = Math.max(0, 1 - Math.min(t, 1 - t) / REST_CONTACT)
        // Squared so it eases out of the floor instead of releasing linearly,
        // which is the part that reads as the ball springing back.
        sy = 1 - REST_SQUASH * contact * contact
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
          atRest || homing ? 1 : clamp01((vh - (cy - ballR)) / FADE_PX),
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
