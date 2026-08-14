<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CAMEOS, POSES, RIG, type Joint } from '~/composables/usePlayerPoses'
import { ballEntry } from '~/composables/useScrollBall'

/**
 * The footballer.
 *
 * One posable SVG figure, used twice over: once at full size in the hero, where
 * he juggles and then volleys the ball into the page's own ball journey, and
 * once per section as a small cameo that plays a different touch as the ball
 * arrives. Both are this component; the difference is `variant`.
 *
 * The figure is a rig rather than a drawing. Each limb is a <g> nested inside
 * the joint above it and drawn hanging straight down from its own pivot, so
 * every pose in composables/usePlayerPoses.ts is just a rotation per joint and
 * a move is a tween between two of them. That is what buys a keepy-up, a trap,
 * a knee-up and an overhead kick out of a single 300-line drawing — and what
 * makes a new move cost a dozen numbers instead of another asset.
 *
 * Why it is not the flat PNG it was drawn from: a PNG has one pose. Juggling
 * needs real in-betweens (a cross-fade between two stills reads as a dissolve,
 * not as a ball being struck), the ball has to leave the foot at the right
 * moment, and the figure has to hold the site's own colours rather than baked
 * ones. All three fall out of a rig and none of them out of a sprite sheet.
 */

const props = withDefaults(
  defineProps<{
    /**
     * Which cameo to play, keyed into CAMEOS. Ignored by the hero, which runs
     * its own juggle-then-volley sequence rather than a single touch.
     */
    move?: keyof typeof CAMEOS
    variant?: 'hero' | 'cameo'
    /** Face left instead of right. A mirror on the wrapper, not a second rig. */
    flip?: boolean
    /**
     * Which ground he is standing on.
     *
     * Only two things in the figure are drawn in the page's ink rather than in
     * his own palette — his hair and the shadow under his boots — and both of
     * them disappear on the footer, which is `bg-ink`. Black hair on a black
     * background is not a subtle loss of contrast: it read as a bald man, and
     * the shadow simply was not there.
     */
    tone?: 'light' | 'dark'
    /**
     * What the hero's volley is aimed at — the element the page's own ball
     * perches on once it has been handed over.
     *
     * A getter rather than the element, because it is a template ref that does
     * not exist when this component is created, and because the thing it points
     * at slides across the frame.
     */
    aimAt?: () => HTMLElement | null | undefined
    /**
     * What a cameo scrubs against. Defaults to the wrapper he is placed by,
     * which is the right answer when the move is "he reacts as he comes into
     * view".
     *
     * It is the wrong answer when the move has to land on a specific moment in
     * the ball's journey — a contact, rather than a shape held while the ball
     * goes past. Pass the surface the ball is actually riding and the same
     * window the perch declares, and his timing is the ball's timing by
     * construction rather than by coincidence.
     */
    anchor?: () => HTMLElement | null | undefined
    /** ScrollTrigger window for a cameo, against `anchor`. */
    start?: string
    end?: string
    /**
     * How far through his move he is, 0–1 — supplied by the section instead of
     * scrubbed off `anchor`/`start`/`end`.
     *
     * For the one case where the contact has to *coincide* with the ball rather
     * than merely happen near it. A scrub is a smoothing of scroll and so is the
     * ball's own clock, and two smoothings of one scroll position are two
     * different numbers: at reading speed the projects strike and the ball
     * rolling onto the boot sat a tenth of the hold apart, and the gap reverses
     * sign when you scroll back up. Handed the same clock the ball is reading,
     * the boot and the ball are two views of one number and cannot drift.
     *
     * Where this is set, `start`/`end` are unused — the section's own window is
     * already what its clock is measured against.
     */
    progress?: () => number
  }>(),
  {
    variant: 'cameo',
    flip: false,
    tone: 'light',
    // Wide on purpose. A cameo is scrubbed, so its window *is* how long the
    // move takes to watch — and the default used to be narrow enough that
    // Education and the footer played out over 300px of scroll, which is a
    // tenth of a second at any real scrolling speed. Both ends are still inside
    // the frame; he simply starts gathering earlier and settles later.
    start: 'top 100%',
    end: 'top 26%'
  }
)

/**
 * Hair, and the shadow under him, against the ground he is standing on.
 *
 * On dark the hair lifts to a charcoal rather than inverting to blond — it has
 * to still read as the same character's black hair, just lit from a room that
 * is dark, so it goes up only as far as it takes to separate from #121212. The
 * shadow flips outright: a dark smudge on a dark floor is nothing, and what
 * sits under a figure on a dark ground is spill light, not shade.
 */
/**
 * Whether the head is drawn from behind. Written by `applyRig` from the turn's
 * progress, so it survives being scrubbed in either direction.
 */
const back = ref(false)

const hair = computed(() => (props.tone === 'dark' ? '#5E6172' : '#16171B'))
const shade = computed(() =>
  props.tone === 'dark'
    ? { fill: '#FFFFFF', opacity: 0.14 }
    : { fill: '#121212', opacity: 0.12 }
)

/**
 * Whether this figure draws a ball of its own.
 *
 * The hero does, because at the top of the page the site's own ball has not
 * entered play yet — it *is* this ball, and the volley is the handover. A cameo
 * does not: the ball arriving at a cameo is the real one, rolling down the page,
 * and a second one beside it would be one ball too many.
 *
 * Derived from the variant rather than offered as a prop, and that is worth a
 * line because the prop version silently drew no ball at all. Vue types an
 * optional `ball?: boolean` as a Boolean prop, and an absent Boolean prop
 * arrives as `false` rather than `undefined` — so `props.ball ?? isHero` never
 * reached its fallback, and the hero juggled an invisible ball. There is no
 * case for the two disagreeing anyway: owning a ball is what being the hero
 * means here.
 */
const ownsBall = computed(() => props.variant === 'hero')

/**
 * Instance-unique suffix for the gradient and clip-path ids below.
 *
 * SVG resolves `url(#x)` against the whole document, not against the SVG it is
 * written in, so six players sharing one set of ids is six elements answering
 * to the same name — invalid markup, and a first-one-wins lookup that happens
 * to work only because all six definitions are identical. Rename any of them
 * and the bug appears somewhere else on the page.
 */
const uid = useId()
const gid = (name: string) => `p-${name}-${uid}`

const rootRef = ref<SVGSVGElement | null>(null)
const rigRef = ref<SVGGElement | null>(null)
const ballRef = ref<SVGGElement | null>(null)
const spinRef = ref<SVGGElement | null>(null)

/**
 * Every joint the rig exposes, in the order they hang off each other. Kept in
 * step with the `data-j` attributes in the template and with `Joint` in the
 * pose table — a name in one and not the others is a joint that silently never
 * moves, which is the one failure here that looks like a design choice.
 */
const JOINTS: Joint[] = [
  'torso',
  'head',
  'armB',
  'forearmB',
  'armF',
  'forearmF',
  'legB',
  'shinB',
  'footB',
  'legF',
  'shinF',
  'footF'
]

/**
 * One full turn of the juggle, in seconds: strike, flight, strike again.
 *
 * A real keepy-up sits around three quarters of a second per touch. 0.92 was
 * measurably slower than that and read as it — the ball hung, and a hang is
 * indistinguishable from a stall.
 */
const JUGGLE_PERIOD = 0.76
/**
 * The top of the ball's flight between touches, in rig units.
 *
 * Only the apex is a free choice — both ends of the arc are the contact point,
 * and that is worked out from the boot rather than picked (see frontFootBall).
 * It sits a little back towards the body as well as high, because a ball
 * juggled straight up on the spot is a ball on a string; a real one drifts in
 * and is met with a step.
 *
 * Floored by the chin rather than by taste: the ball is painted over the torso,
 * so an apex much above this puts it across his face at the top of every touch.
 * The head runs to y=112 and the ball's radius is 22.
 */
const JUGGLE_APEX = { x: 172, y: 136 }
/**
 * Where the ball starts the page, in rig units, and how long it takes to fall.
 *
 * Well above the rig's own box: the figure occupies y 64–322 of a 340 viewBox,
 * so -380 puts the ball clear of the hero frame entirely at any size it is
 * drawn at. The frame clips it until it enters, which is what makes it read as
 * dropping in rather than fading up.
 *
 * The fall is eased `power2.in`, so most of this time is spent in the slow part
 * at the top and the ball is still quick by the time it reaches the boot —
 * lengthening it buys a readable entrance without making the contact limp. At
 * 0.85 the whole drop was over before the eye had found it.
 */
const DROP_FROM = -380
const DROP_TIME = 1.25

/** How much scroll the hero allows before the volley fires. */
const VOLLEY_AT = 90

/**
 * The floor on how long the hero's run takes, in seconds — and the whole of why
 * it is not a plain `scrub`.
 *
 * A scrub maps the run onto the scrollbar, which means a flick plays it at
 * whatever speed the flick had. The pinned read is one screen of scroll and a
 * trackpad covers that in about a fifth of a second: eight strides, a turn and
 * the width of the frame, all inside a single blink. The move was there and
 * nobody could see it happen.
 *
 * Raising the scrub number does not fix that, which is worth saying because it
 * is the obvious first try. ScrollTrigger smooths a scrub with `expo.out`, and
 * that ease spends four fifths of its catch-up in the first quarter of its
 * duration — so the burst survives intact and only the tail behind it gets
 * longer. Big enough to tame a flick, it also puts a visible lag on ordinary
 * scrolling, which is the half that was never broken.
 *
 * Capping the playhead's *speed* separates the two cases cleanly. Below the cap
 * he still tracks the scrollbar frame for frame; above it he simply runs at his
 * own top pace and catches the page up afterwards. 1.5s across the frame is
 * eight strides at a little over five a second — a sprint, which is what he is
 * doing.
 */
const RUN_MIN_TIME = 1.5
/**
 * Time constant of the catch-up once the page is back within the cap's reach.
 *
 * Short, and deliberately the same value the page's own ball follows scroll
 * with: this is here to take the step out of the last fraction of the follow,
 * not to add lag of its own. The cap above is what does the slowing.
 */
const RUN_TAU = 0.12
/**
 * How far each limb travels sideways as he turns to face away, in rig units.
 *
 * This is what a rotating card cannot do, and therefore what the whole turn
 * rests on. In profile the two arms sit twelve units apart — that gap is the
 * body's *depth*, front to back. Turned to face away, the same two arms are at
 * opposite shoulders, forty units apart: that gap is its *width*. A body turning
 * swaps one for the other, so its limbs slide apart and its silhouette opens
 * out. Scaling cannot express it at all, because scaling moves everything
 * towards or away from one centre line and these move apart from each other.
 *
 * Getting this backwards is what made the first two attempts read as a picture
 * being flipped: they narrowed him through the middle of the turn, when the
 * middle of a turn is the widest a body ever is.
 */
const SPREAD: Record<string, number> = {
  armB: -17,
  armF: 17,
  legB: -10,
  legF: 10
}

/** How much wider the torso reads facing away than in profile. */
const TORSO_WIDEN = 0.14

/**
 * Where the striking boot sits across a cameo's box, as a fraction of its
 * width, and how the ball's approach maps onto the strike.
 *
 * Measured off the box rather than off the boot itself, and that is the whole
 * trick: read the live boot and the strike moves it, which changes the distance
 * that drove the strike, which moves it again. A fixed point on a box that
 * never moves cannot feed back.
 */
const CONTACT_X = 0.73
/** Progress through the strike sequence at which the foot meets the ball. */
const CONTACT_AT = 0.62
/**
 * How far out, in px, he starts winding up.
 *
 * This is the whole of how long a contact takes to watch. The move is scrubbed
 * against the ball's approach, so the reader gets exactly as much of it as the
 * ball spends covering this distance — widen it and the wind-up starts sooner
 * and lasts longer, at every scroll speed.
 *
 * 300 was enough to be correct and not enough to be seen: measured end to end,
 * the Selected Work strike occupied 900px of scroll, which at a brisk flick is
 * under a third of a second.
 */
const CONTACT_NEAR = 460
/** And how far past him the ball gets before he has finished following through. */
const CONTACT_PAST = 220
/**
 * Vertical slack, in px, within which the ball counts as being on his surface.
 * Outside it the ball is somewhere else on the page entirely, and he is either
 * still waiting for it or long done.
 */
const CONTACT_VERT = 260

/**
 * Height of the volley's arc above the straight line to the mark, in rig units.
 *
 * Added as a half-sine on top of the run to the target rather than built into
 * the path, so the arc keeps its shape while the target moves under it.
 */
const VOLLEY_ARC = 86

let mm: gsap.MatchMedia | null = null

onMounted(() => {
  const svg = rootRef.value
  const rig = rigRef.value
  if (!import.meta.client || !svg || !rig) return

  const jointEl = (j: Joint) => rig.querySelector<SVGGElement>(`[data-j="${j}"]`)
  /**
   * Every element carrying a joint's name, because the torso carries two.
   *
   * It is split in half so the shirt can be painted between the back leg and
   * the front one — see the template. Both halves turn on the same hip and take
   * the same transform; they are one joint that happens to be drawn in two
   * places.
   */
  const jointEls = (j: Joint) => rig.querySelectorAll<SVGGElement>(`[data-j="${j}"]`)

  /**
   * A joint's pivot, read off the element rather than held in a second table.
   *
   * `svgOrigin` takes a point in the SVG's own user space, which is exactly
   * what the drawing is laid out in — so the pivot can live on the element it
   * belongs to, next to the shapes drawn around it. A parallel table of origins
   * is the same information written twice, and the copy that drifts is always
   * the one you are not looking at.
   */
  const originOf = (el: Element) => el.getAttribute('data-o') ?? `${RIG.hip[0]} ${RIG.hip[1]}`

  const shadowEl = svg.querySelector('.p-shadow')

  /**
   * The rig's live state in degrees, and the function that puts it on screen.
   *
   * GSAP never touches the rig's transforms. It animates the plain numbers
   * below and this writes them out as SVG `rotate(deg cx cy)` — which is the
   * native way to turn something about a point, and is exactly as many
   * characters as the alternative.
   *
   * The alternative is what this replaces, and it is worth saying why it went.
   * Tweening the groups directly means handing GSAP an `svgOrigin` on every
   * tween, and GSAP treats a restated origin on an already-rotated element as
   * something to smooth over: it back-calculates an x/y offset so the element
   * does not jump to its new pivot. State one origin per tween, on eight stride
   * poses scrubbed back and forth, and those corrections compound — measured on
   * the front thigh mid-run, 56px of translation on a joint whose rotation
   * accounts for −9.6, which on screen is a leg detached from the hip drifting
   * across the frame. Pinning the origin once instead does not fix it, because
   * an origin is not a property that persists between tweens; it took the whole
   * figure apart.
   *
   * Writing the attribute sidesteps all of it. There is no transform cache to
   * disagree with, no origin to restate, and a joint is at exactly the angle
   * the pose table says it is.
   */
  const state: Record<string, number> = {}
  for (const j of JOINTS) state[j] = 0
  const root = { x: 0, y: 0, rot: 0, shadow: 1, shadowOp: shade.value.opacity, turn: 0 }

  /**
   * The far limbs' shading, and the near shade each one resolves to as he turns.
   *
   * The back arm and back leg are painted a step darker than the front pair,
   * and that difference is the figure's depth in profile — it is what stops two
   * legs at the same angle reading as one shape. Facing away it is a lie: both
   * arms are the same distance from you, so they are the same colour, and a
   * lingering dark one is the last thing telling you which way he is meant to
   * be facing. Equalised at the midpoint, the two halves are interchangeable,
   * which is the whole premise of `backView`.
   */
  const FAR_NEAR: Record<string, [string, string]> = {
    skin: ['#C99566', '#F2BF95'],
    shorts: ['#1642AE', '#1B4FD1'],
    sock: ['#DDDDE2', '#F4F4F6'],
    band: ['#C08079', '#E8402F'],
    boot: ['#C6420F', '#FF4A1F'],
    sleeve: ['#E8E8EC', '#FFFFFF']
  }

  const mixHex = (a: string, b: string, t: number) => {
    const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16)
    const at = (i: number) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t)
    return `#${[1, 3, 5].map((i) => at(i).toString(16).padStart(2, '0')).join('')}`
  }

  const farEls = Array.from(svg.querySelectorAll<SVGElement>('[data-far]'))
  const hipEl = svg.querySelector('.p-hip')
  let farAt = -1

  const applyRig = () => {
    const k = gsap.utils.clamp(0, 1, root.turn)
    // 0 in profile at either end, 1 facing away in the middle. Everything the
    // turn does is scaled by this.
    const open = Math.sin(k * Math.PI)
    // Facing. It is a clean ±1 with no magnitude of its own, because the flip
    // is hidden by the pose being symmetric rather than by the figure being too
    // thin to read — see `backView`.
    const face = k >= 0.5 ? -1 : 1

    for (const j of JOINTS) {
      const els = jointEls(j)
      const el = els[0]
      if (!el) continue
      const o = originOf(el)
      const [ox, oy] = o.split(' ').map(Number)
      const rot = `rotate(${state[j].toFixed(3)} ${o})`
      let t = ''
      // Limbs slide apart towards the shoulders and hips they really hang from.
      const dx = (SPREAD[j] ?? 0) * open
      if (dx) t += `translate(${dx.toFixed(2)} 0) `
      // The chest broadens with them...
      if (j === 'torso' && open > 0.001) {
        const w = 1 + TORSO_WIDEN * open
        t += `translate(${ox} ${oy}) scale(${w.toFixed(4)} 1) translate(${-ox} ${-oy}) `
      }
      // ...but the head does not, so it is given back what the torso it hangs
      // inside just took. A skull is about as wide as it is deep; broadening it
      // with the shoulders turns it into an egg at the exact moment it is the
      // thing being looked at.
      if (j === 'head' && open > 0.001) {
        const w = 1 / (1 + TORSO_WIDEN * open)
        t += `translate(${ox} ${oy}) scale(${w.toFixed(4)} 1) translate(${-ox} ${-oy}) `
      }
      for (const e of els) e.setAttribute('transform', t + rot)
    }

    const [hx, hy] = RIG.hip

    // The waistband broadens with the chest, so the two shorts panels still
    // meet in the middle once they have moved to opposite hips.
    if (hipEl && open > 0.001) {
      const w = 1 + TORSO_WIDEN * open
      hipEl.setAttribute(
        'transform',
        `translate(${hx} ${hy}) scale(${w.toFixed(4)} 1) translate(${-hx} ${-hy})`
      )
    } else if (hipEl) {
      hipEl.removeAttribute('transform')
    }

    rig.setAttribute(
      'transform',
      `translate(${root.x.toFixed(2)} ${root.y.toFixed(2)}) translate(${hx} ${hy}) scale(${face} 1) translate(${-hx} ${-hy}) rotate(${root.rot.toFixed(3)} ${hx} ${hy})`
    )

    if (shadowEl) {
      const [cx, cy] = [120, 325]
      // Broadens with him. A figure standing over its own shadow casts a wider
      // one when its shoulders are square to you than when they are edge-on.
      const s = root.shadow * (1 + 0.16 * open)
      shadowEl.setAttribute(
        'transform',
        `translate(${cx} ${cy}) scale(${s.toFixed(3)} 1) translate(${-cx} ${-cy})`
      )
      shadowEl.setAttribute('opacity', root.shadowOp.toFixed(3))
    }

    // Depth shading resolves as the two sides become equidistant. Skipped
    // entirely when nothing is turning, which is almost always.
    const want = Math.round(open * 100) / 100
    if (want !== farAt) {
      farAt = want
      for (const el of farEls) {
        const pair = FAR_NEAR[el.getAttribute('data-far') ?? '']
        if (pair) el.setAttribute('fill', mixHex(pair[0], pair[1], want))
      }
    }

    // And the face goes away. A mirror slides a face across; a person shows you
    // the back of their head.
    const wantBack = k > 0.3 && k < 0.7
    if (back.value !== wantBack) back.value = wantBack
  }

  /**
   * A timeline that moves the whole figure into `name` over `duration`.
   *
   * Every joint is tweened whether or not the pose names it — a joint left out
   * of a pose means zero, not "leave it where it was". Without that, a move
   * would inherit stray angles from whatever played before it, and the same
   * cameo would look different depending on which direction you scrolled into
   * it.
   */
  const poseTl = (name: string, duration: number, ease = 'power2.out', withBall = true) => {
    const pose = POSES[name]
    const tl = gsap.timeline()
    if (!pose) return tl

    // One tween for every joint at once, because they are now all properties of
    // a single plain object. `applyRig` is what puts the numbers on screen.
    const joints: Record<string, unknown> = { duration, ease, onUpdate: applyRig }
    for (const j of JOINTS) joints[j] = pose.joints[j] ?? 0
    tl.to(state, joints, 0)

    // The root carries what no joint can: the lift and the near-horizontal roll
    // of an overhead kick, and the few inches of air under a header.
    //
    // The shadow rides with it, and stays on the ground while the figure leaves
    // it — a shadow that goes up with the player is the single fastest way to
    // make a jump read as a slide.
    const r = pose.root ?? {}
    // Only *upward* movement counts as leaving the ground. `Math.abs` here was
    // wrong and had been since the seated poses arrived: those drop the hip by
    // 105 to put him on the floor, and an absolute value read that as a 105px
    // jump — so every pose that sat or lay down shrank its own shadow by nearly
    // half and faded it, at the exact moment the figure is most obviously
    // *on* the ground.
    const lift = Math.max(0, -(r.y ?? 0))
    tl.to(
      root,
      {
        x: r.x ?? 0,
        y: r.y ?? 0,
        rot: r.rot ?? 0,
        shadow: 1 - Math.min(0.45, lift / 150),
        shadowOp: shade.value.opacity * (1 - Math.min(0.6, lift / 110)),
        duration,
        ease,
        onUpdate: applyRig
      },
      0
    )

    if (withBall && ownsBall.value && pose.ball && ballRef.value) {
      tl.to(ballRef.value, { x: pose.ball.x, y: pose.ball.y, duration, ease }, 0)
    }

    return tl
  }

  // Opening state, set before anything animates so the figure is never drawn in
  // its untransformed all-zero layout — which is a man standing bolt upright
  // with his arms welded to his sides.
  //
  // The hero opens on `watch`: the page begins with him stood looking up and
  // the ball still above the frame. The juggle's own cycle starts at `juggleUp`
  // — that pose *is* the contact — and the intro below hands over to it exactly
  // as the ball lands, so the loop still begins where it ends. Opened straight
  // on `juggleDown` instead, the first half-turn tweened juggleDown to
  // juggleDown and the legs stood still for half a second while the ball sailed
  // off a foot that had not moved.
  poseTl(props.variant === 'hero' ? 'watch' : 'stand', 0).progress(1)

  mm = gsap.matchMedia()

  // The ball turns for as long as it is on screen. Unlike everything else here
  // this one is a plain loop, because a ball's spin has no beginning or end to
  // scrub against — and unlike the orb this replaces, it is attached to
  // something that is visibly acting on it, so it reads as a ball being played
  // rather than as a spinner.
  if (ownsBall.value && spinRef.value) {
    gsap.to(spinRef.value, {
      rotation: 360,
      duration: 1.6,
      ease: 'none',
      repeat: -1,
      svgOrigin: '0 0'
    })
  }

  if (props.variant === 'hero') {
    mm.add('all', () => {
      const ball = ballRef.value
      if (!ball) return

      /**
       * The keepy-up.
       *
       * Deliberately on a clock rather than on the scrollbar, which is the
       * opposite of the rule the rest of this site is built on — the phone's
       * orb had its CSS loop taken away for exactly this reason, and the note
       * on it is right that a hop firing every 1.5s regardless of the page
       * reads as a spinner.
       *
       * A juggle is not that. The complaint about the orb was that a rotating
       * sphere is not *doing* anything, so its only possible meaning was
       * "loading"; a figure keeping a ball up is doing something whether or not
       * you scroll, and the whole point of putting him here is that the top of
       * the page has to be alive before the first wheel click. Scrub this to
       * scroll instead and at rest you get a man frozen mid-touch, which is
       * worse than the blank space it was meant to fix.
       *
       * The legs and the ball are timed separately rather than the ball being
       * carried in the poses. Interpolated between two poses the ball tracks
       * the boot exactly, which is a ball glued to a foot; given its own arc it
       * overshoots the top of the touch and falls back, which is a ball.
       */
      // Paused: the intro below starts it, once the ball has arrived and there
      // is something to keep up. Started here it would run against a ball still
      // somewhere above the frame.
      const juggle = gsap.timeline({ repeat: -1, paused: true })
      // The ball's flight is symmetric because gravity is: up for half, down
      // for half, apex in the middle. The foot's is not — see below.
      const half = JUGGLE_PERIOD / 2
      // The foot falls away from the strike over rather more than half the
      // cycle and then snaps back up to meet the ball. Split evenly, with the
      // same ease each way, the leg swings like a metronome and the contact
      // reads as a coincidence rather than as him going to get it.
      const drop = JUGGLE_PERIOD * 0.58
      const lift = JUGGLE_PERIOD - drop

      juggle
        // Away from the strike, decelerating...
        .add(poseTl('juggleDown', drop, 'sine.out', false), 0)
        // ...then accelerating into the next one. `power2.in` is the whole
        // difference between a foot that arrives under the ball and a foot that
        // happens to be there.
        .add(poseTl('juggleUp', lift, 'power2.in', false), drop)
        // Rising off the boot, decelerating into the apex...
        .to(ball, { y: JUGGLE_APEX.y, duration: half, ease: 'power2.out' }, 0)
        // ...then accelerating back down onto it. The two eases are the whole
        // of the ball's weight: swap either for a linear one and it floats.
        .to(ball, { y: POSES.juggleUp.ball!.y, duration: half, ease: 'power2.in' }, half)
        .to(ball, { x: JUGGLE_APEX.x, duration: half, ease: 'sine.inOut' }, 0)
        .to(ball, { x: POSES.juggleUp.ball!.x, duration: half, ease: 'sine.inOut' }, half)
        // Contact, and the timing of these two is what stopped the loop
        // stuttering.
        //
        // The squash used to run to JUGGLE_PERIOD and the release to start
        // there — which made the timeline 0.12s longer than the cycle it was
        // describing, so every repeat ended with an eighth of a second in which
        // the legs had finished, the ball had landed, and the only thing still
        // moving was a ball relaxing on the spot. That is the pause: not a
        // dropped frame, a hold written into the loop.
        //
        // A contact at the end of a cycle *is* a contact at the start of the
        // next one, so the release belongs at 0. `fromTo` is what makes that
        // safe on the first pass, where nothing has squashed the ball yet.
        .fromTo(
          ball,
          { scaleY: 0.88, scaleX: 1.1 },
          { scaleY: 1, scaleX: 1, duration: 0.12, ease: 'power2.out' },
          0
        )
        .to(ball, { scaleY: 0.88, scaleX: 1.1, duration: 0.08, ease: 'power2.in' }, JUGGLE_PERIOD - 0.08)

      /**
       * How the page opens: the ball drops in from above and he takes it.
       *
       * The first touch is the whole reason this exists. Loaded straight into
       * the loop, the ball simply *was* there, mid-keepy-up, from frame one —
       * which reads as a looping graphic. A ball that falls in and is caught on
       * a boot reads as something starting.
       *
       * It comes from above the frame rather than from an edge: `.hero-frame`
       * is `overflow-hidden`, so a ball parked at DROP_FROM is clipped until it
       * enters, and needs no fade to hide where it came from.
       *
       * The fall accelerates and nothing eases it out — a dropped ball does not
       * slow down before it is hit. What absorbs it is the boot rising to meet
       * it on `power2.in`, arriving at `juggleUp` on the frame the ball does.
       * That pose is also where the loop's cycle begins, so the handover into
       * the juggle needs no extra frame to settle: the intro ends standing
       * exactly where the loop expects to start.
       */
      const contact = POSES.juggleUp.ball!
      gsap.set(ball, { x: contact.x, y: DROP_FROM, opacity: 1 })

      const intro = gsap.timeline({
        onComplete: () => juggle.play()
      })

      intro
        .to(ball, { y: contact.y, duration: DROP_TIME, ease: 'power2.in' }, 0)
        // He watches it down and lifts the boot into it. Started a little after
        // the drop so the eye reads the ball first and the leg as the answer.
        .add(poseTl('juggleUp', DROP_TIME * 0.55, 'power2.in', false), DROP_TIME * 0.45)
        // Struck, not caught: the same squash the loop uses at every touch, so
        // the first contact is indistinguishable from the ones that follow.
        .to(ball, { scaleY: 0.88, scaleX: 1.1, duration: 0.07, ease: 'power2.in' }, DROP_TIME - 0.07)

      /**
       * Where the volley is aimed, in the rig's own SVG units.
       *
       * The target is a DOM element somewhere else on the page, so this is the
       * one place the figure has to leave its own coordinate system: measure
       * both rects in viewport pixels, then scale the difference by the SVG's
       * units-per-pixel. Resolved when the tween starts rather than captured,
       * so it is right at any viewport size and wherever the headline has
       * slid to.
       */
      const aimPoint = () => {
        const target = props.aimAt?.()
        const box = svg.getBoundingClientRect()
        if (!target || !box.width || !box.height) return { x: 430, y: -40 }
        const m = target.getBoundingClientRect()
        return {
          x: (m.left + m.width / 2 - box.left) * (240 / box.width),
          y: (m.top + m.height / 2 - box.top) * (340 / box.height)
        }
      }

      /**
       * The handover.
       *
       * He strikes the ball up and onto the headline, and the site's own scroll
       * ball takes over from there. `ballEntry` keeps the two from ever being
       * on screen together: until this plays, TheScrollBall holds its ball at
       * zero opacity instead of fading it in on a timer.
       *
       * The ball is aimed at the mark and lands on it. It used to be thrown at
       * a hardcoded point off the top-right corner and faded out in mid-flight
       * while the other ball faded up in the headline — two balls, neither of
       * them arriving anywhere, and a handover you had to be told about. Landing
       * the strike on the perch and swapping the two balls *at that point*
       * costs nothing extra and is the whole difference: one ball, kicked onto
       * the headline.
       *
       * Split into a rise and a fall rather than one tween, because a single
       * eased move between two points is a straight line however it is eased,
       * and a struck ball travels on an arc. The rise overshoots the mark and
       * the fall settles onto it.
       */
      const volley = gsap.timeline({
        paused: true,
        onStart: () => {
          // The intro is on a clock and the volley is on the scrollbar, so a
          // visitor who scrolls straight away can start this while the ball is
          // still falling. Finishing the drop first is what stops the strike
          // being played at a ball that is not there yet — `progress(1)` lands
          // it on the boot and leaves the rig in `juggleUp`, which is where the
          // volley expects to take over from anyway.
          if (intro.progress() < 1) intro.progress(1)
          juggle.pause()
        },
        onReverseComplete: () => {
          juggle.play()
          gsap.set(ball, { opacity: 1 })
        }
      })

      // The flight, solved per frame rather than tweened to a fixed endpoint.
      //
      // A function end-value looks like it would do — and it does not, because
      // GSAP resolves one exactly once, when the tween starts. The mark it is
      // aimed at slides the width of the frame across this very window, so the
      // ball flew to where the mark had been: measured, 83px wide of it by the
      // time it landed, two ball-widths, with the page barely moving. Reading
      // the target on every frame is what the page's own ball does with every
      // surface it aims at, and for this reason.
      const flight = { k: 0 }
      const launch = { x: 0, y: 0 }

      volley
        .add(poseTl('volley', 0.24, 'power3.out', false), 0)
        .to(
          flight,
          {
            k: 1,
            duration: 0.62,
            ease: 'none',
            onStart: () => {
              launch.x = gsap.getProperty(ball, 'x') as number
              launch.y = gsap.getProperty(ball, 'y') as number
            },
            onUpdate: () => {
              const aim = aimPoint()
              const k = flight.k
              // Horizontally eased out, so the ball commits early to roughly
              // where it is going and the last of the mark's travel only nudges
              // it — the same trick, for the same reason, as the `kx` term on
              // the page's long fall out of this hero.
              const kx = 1 - (1 - k) * (1 - k)
              // Vertically a straight run to the target plus a half-sine lift,
              // which is an arc that lands exactly on the mark whatever height
              // the mark is at. Tweening up and then down in two steps cannot
              // do that once the endpoint is allowed to move.
              gsap.set(ball, {
                x: launch.x + (aim.x - launch.x) * kx,
                y: launch.y + (aim.y - launch.y) * k - Math.sin(k * Math.PI) * VOLLEY_ARC
              })
            }
          },
          0.06
        )
        // The swap, at the moment of arrival and over the same tenth of a
        // second, so the two balls are never both visible and never both gone.
        .to(ball, { opacity: 0, duration: 0.12, ease: 'none' }, 0.64)
        .to(ballEntry, { v: 1, duration: 0.16, ease: 'power2.out' }, 0.62)
        // And he settles back to standing, watching it go.
        .add(poseTl('stand', 0.5, 'power2.out', false), 0.42)

      // Fired off scroll rather than played on a delay: the juggle should carry
      // on for as long as somebody is looking at the top of the page, and end
      // the moment they decide to move.
      const st = ScrollTrigger.create({
        trigger: document.documentElement,
        start: VOLLEY_AT,
        end: VOLLEY_AT + 1,
        onEnter: () => volley.play(),
        onLeaveBack: () => volley.reverse()
      })

      return () => {
        st.kill()
        volley.kill()
        intro.kill()
        juggle.kill()
        ballEntry.v = 0
      }
    })

    /**
     * After the volley: he chases the ball across the frame and turns to watch
     * it go.
     *
     * Scrubbed against the hero's own pinned read — the same window the
     * headline slides over and the same one the ball rides it for — so the run
     * is paced by the reader rather than by a clock. That is the right choice
     * here and the wrong one for the juggle above, and the difference is what
     * each is answering to: a keepy-up is something he does while you are
     * looking at the page, a chase is something he does *because* the ball
     * left, and the ball leaves on scroll.
     *
     * Desktop only. Not for want of room in the timeline but for want of room
     * on the floor: a phone is 390px wide and he is 215 of them, so the whole
     * run would be a shuffle of a body-width. It is also the width at which
     * `.hero-player` stops centring itself with a transform — which is the
     * property this tweens, and the two cannot both have it.
     */
    mm.add('(min-width: 768px)', () => {
      const wrap = svg.closest<HTMLElement>('.hero-scroll')
      const frame = wrap?.querySelector<HTMLElement>('.hero-frame')
      const host = svg.parentElement
      if (!wrap || !frame || !host) return

      // Right edge ending as far from its wall as the left edge started from
      // its own, so he pulls up balanced against the frame rather than jammed
      // into the corner — he stops here and turns, so where he stops is a
      // composition rather than an exit.
      const travel = () =>
        Math.max(0, window.innerWidth - host.offsetWidth - host.offsetLeft * 2)

      // Paused, and driven by hand at the foot of this block rather than by a
      // scrub — see RUN_MIN_TIME for why the scroll position is a target here
      // rather than the playhead itself.
      const run = gsap.timeline({ paused: true })

      // Fractions of the pinned read. The run starts well after the volley's
      // own trigger at VOLLEY_AT so the two are not writing to the same joints
      // in the same frames — the volley is on a clock and this is not, and a
      // scrubbed pose fighting a playing one reads as a twitch.
      const FROM = 0.26
      const TO = 0.68
      const STRIDES = 8
      const step = (TO - FROM) / STRIDES

      run.to(host, { x: travel, ease: 'none', duration: TO - FROM }, FROM)

      // The stride cycle. Alternating contact poses rather than one tween: a
      // run is a loop, and the number of strides is what makes the distance
      // read as covered rather than slid.
      for (let i = 0; i < STRIDES; i++) {
        run.add(poseTl(i % 2 ? 'runB' : 'runA', step, 'sine.inOut', false), FROM + i * step)
      }

      // Pulls up, opens out to face away, closes back into profile. Sequential
      // rather than overlapping: these all tween the same joint numbers, and
      // two tweens writing one property in the same frame is a fight whose
      // winner depends on render order.
      run.add(poseTl('stand', 0.06, 'power2.out', false), TO)
      run.add(poseTl('backView', 0.1, 'sine.inOut', false), TO + 0.06)
      run.add(poseTl('stand', 0.12, 'sine.inOut', false), TO + 0.16)

      // And the turn itself, which owns the spread, the widening and the
      // facing. `turn` is the only thing here no pose writes to, so it can
      // overlap them freely — see applyRig, where a number from 0 to 1 becomes
      // a body going round.
      //
      // Timed so its halfway point lands exactly where `backView` completes. It
      // has to: that is the frame the facing flips on, and it is only invisible
      // because the pose standing there is its own mirror image.
      run.to(root, { turn: 1, duration: 0.22, ease: 'sine.inOut', onUpdate: applyRig }, TO + 0.05)

      // Pad the timeline to exactly 1.
      //
      // Progress is a fraction of the timeline's own duration, whatever that
      // happens to be — so without this the positions above are fractions of
      // 0.90 rather than of the read, everything is stretched by
      // 1/0.9, and the last thing scheduled runs off the end. The turn was the
      // casualty: written at 0.77 it did not begin until 86% of the pinned
      // scroll and did not finish inside it at all, so he simply never turned
      // round. Padding here rather than rescaling keeps each number meaning the
      // fraction of the read it says it is.
      run.to({}, { duration: 0.02 }, 0.98)

      /**
       * The playhead, and the scroll position it is chasing.
       *
       * `p` is what the timeline is rendered at; `st.progress` is where the
       * scrollbar says it ought to be. Everything interesting happens in the
       * gap between the two — he is allowed to fall behind the page and then
       * make it up at his own speed, rather than being dragged through the run
       * as fast as a wrist can move.
       *
       * Declared before the trigger below because that trigger refreshes as it
       * is created, and its `onRefresh` reads this.
       */
      let p = 0

      const st = ScrollTrigger.create({
        trigger: wrap,
        start: 'top top',
        // The pinned read's own end: a sticky frame unsticks when the spacer's
        // foot meets its own, which is `spacer − frame`. Written out again
        // rather than shared because HeroSection resolves it inside its own
        // matchMedia scope.
        end: () => `+=${Math.max(1, wrap.offsetHeight - frame.offsetHeight)}`,
        // What `invalidateOnRefresh` did while this was a scrub, by hand. The
        // order is the whole of it: rewound first, so the run's `x` tween
        // re-records its start from 0 rather than from wherever he had got to;
        // then invalidated, so `travel` resolves against the new viewport; then
        // put back where it was.
        onRefreshInit: () => run.progress(0),
        onRefresh: () => {
          run.invalidate()
          run.progress(p)
        }
      })

      // The cap, as a fraction of the timeline per second. Measured over the
      // run itself rather than over the whole timeline, so RUN_MIN_TIME means
      // the seconds it says it does.
      const rate = (TO - FROM) / RUN_MIN_TIME

      // Whether the playhead has been put somewhere yet. A reload part-way down
      // the page restores its scroll position before this mounts, so the first
      // frame is a placement rather than a move — capped like any other it
      // would have him sprint in from the left edge to catch up with a page
      // that was never scrolled.
      let placed = false

      const drive = (_time: number, deltaMs: number) => {
        const target = st.progress
        if (!placed) {
          placed = true
          p = target
          run.progress(p)
          return
        }
        if (target === p) return

        // Clamped for the same reason the ball's follow is: a backgrounded tab
        // hands over one enormous delta on return, and a step taken from it
        // would be exactly the teleport this exists to prevent.
        const dt = Math.min(deltaMs / 1000, 0.05)

        // Nothing is scheduled before FROM — he is stood still there, watching
        // the volley go — so the playhead crosses that stretch at whatever
        // speed it is asked to. Capped, a flick would spend most of its
        // catch-up on a man standing still and he would set off a second after
        // the page had already left.
        if (p < FROM) p = Math.min(target, FROM)

        const d = target - p
        const cap = rate * dt
        // Within the cap this is a plain exponential follow and he tracks the
        // scrollbar; beyond it the clamp takes over and he runs at his own
        // pace until the page comes back within reach. Snapped at the end so a
        // follow that is asymptotic by construction still actually arrives.
        p =
          Math.abs(d) < 0.0005
            ? target
            : p + gsap.utils.clamp(-cap, cap, d * (1 - Math.exp(-dt / RUN_TAU)))

        run.progress(p)
      }

      gsap.ticker.add(drive)

      return () => {
        gsap.ticker.remove(drive)
        st.kill()
        run.kill()
        gsap.set([host, svg], { clearProps: 'transform' })
        root.x = 0
        root.y = 0
        root.rot = 0
        root.turn = 0
        applyRig()
      }
    })

    // Announces that something on the page is responsible for handing the ball
    // over. Without a hero player mounted, TheScrollBall falls back to its own
    // timed intro rather than waiting forever for a volley that never comes.
    ballEntry.claimed = true
    onBeforeUnmount(() => {
      ballEntry.claimed = false
      ballEntry.v = 0
    })
  } else {
    /**
     * A cameo, scrubbed against where it is standing.
     *
     * The trigger is the wrapper this figure is placed by, which is to say the
     * figure himself. That started out as the enclosing <section> and was
     * wrong for a reason worth recording: a section is as tall as its content,
     * and Selected Work's is a five-card deck several viewports deep. Scrubbed
     * over that, the whole touch — windup, contact, settle — was spread across
     * more scroll than the section's rail is even on screen for, so at every
     * scroll position anyone actually reads it at, he was a couple of percent
     * off standing still. The move was there and nobody could ever see it.
     *
     * His own box is the right window because it is the rail's window: he is
     * placed on the rail, so "he is coming into view" and "the ball is arriving
     * at this surface" are the same event, at every viewport height, with no
     * per-section tuning.
     *
     * Scrubbed rather than fired on enter, because the thing he is reacting to
     * is scrubbed: the ball's position on the rail is a function of scroll, so
     * a touch played on a timer would meet it only at whatever speed the page
     * happened to be moving when it triggered.
     */
    mm.add('(min-width: 1024px)', () => {
      const anchor = props.anchor?.() ?? svg.parentElement
      const cam = CAMEOS[props.move ?? 'work']
      if (!anchor || !cam) return

      /**
       * A cameo that keeps the ball up, rather than reacting to it going past.
       *
       * Two things run off one timeline and that is the point of doing it here
       * rather than in the section: his feet alternate, and `.p-touch` — an
       * invisible rect at the contact point — traces the ball's flight. The
       * page's ball perches on that rect's top edge, so animating the rect *is*
       * animating the ball, and the touch cannot drift out of time with the
       * foot that is supposed to be making it.
       *
       * On a clock, not the scrollbar, for the same reason the hero's juggle
       * is: keeping a ball up is something he does while you read the section,
       * not something the page does to him.
       */
      if (cam.loop && cam.hit) {
        const touch = svg.querySelector<SVGRectElement>('.p-touch')
        const T = cam.period ?? 0.8
        const half = T / 2
        const lift = cam.lift ?? 70

        // Opened on the pose the cycle *ends* on, which is the only way a
        // repeat is seamless. A tween records its start values the first time
        // it renders and replays from those on every repeat — so with the rig
        // left standing, the first half of every single cycle was stand→sitA,
        // not sitB→sitA. Measured mid-loop the joints sat at a third of their
        // angles and the figure never actually got to the floor: he stood up
        // and half sat down, once per touch, forever.
        poseTl(cam.hit, 0, 'none', false).progress(1)

        const keepy = gsap.timeline({ repeat: -1 })
        keepy
          .add(poseTl(cam.enter, half, 'sine.inOut', false), 0)
          .add(poseTl(cam.hit, half, 'sine.inOut', false), half)

        if (touch) {
          // Up decelerating, down accelerating — the ball's weight, and the
          // only thing separating a bounce from a hover. Two touches per turn
          // of the legs, one per foot.
          keepy
            .to(touch, { y: -lift, duration: half * 0.5, ease: 'power2.out' }, 0)
            .to(touch, { y: 0, duration: half * 0.5, ease: 'power2.in' }, half * 0.5)
            .to(touch, { y: -lift, duration: half * 0.5, ease: 'power2.out' }, half)
            .to(touch, { y: 0, duration: half * 0.5, ease: 'power2.in' }, half * 1.5)
        }

        return () => keepy.kill()
      }

      /**
       * A move that makes contact, driven by where the ball actually is.
       *
       * The sequence is built once and then scrubbed by hand every frame
       * against the ball's distance from the point his boot arrives at — so the
       * strike is not timed to happen near the ball, it is timed *by* the ball.
       * Nothing here depends on how the ball's own engine chose to lay its
       * windows out, which is what a scrub would be guessing at.
       */
      if (cam.track && cam.hit) {
        const host = svg.parentElement
        const ballEl = document.querySelector<HTMLElement>('.scroll-ball')
        if (!host || !ballEl) return

        const seq = gsap.timeline({ paused: true })
        seq.add(poseTl('stand', 0.001, 'none', false), 0)
        // A move that has to be gathered first gets a third of the approach to
        // do it in, and gives up the same from the move itself. `power2.in` on
        // the way down into a crouch and `power2.out` on the way up out of it
        // is the weight: he sinks slowly and leaves quickly.
        if (cam.prep) {
          seq
            .add(poseTl(cam.prep, 0.2, 'power2.in', false), 0.04)
            .add(poseTl(cam.enter, 0.24, 'power2.out', false), 0.26)
        } else {
          seq.add(poseTl(cam.enter, 0.4, 'power2.out', false), 0.05)
        }
        seq
          .add(poseTl(cam.hit, 0.12, 'power4.out', false), CONTACT_AT - 0.07)
          .add(poseTl(cam.settle, 0.3, 'power2.inOut', false), CONTACT_AT + 0.08)
          .to({}, { duration: 0.01 }, 0.99)

        const [fx, fy] = cam.contact ?? [CONTACT_X, 1]

        const follow = () => {
          const h = host.getBoundingClientRect()
          const b = ballEl.getBoundingClientRect()
          if (!h.width || !b.width) return

          const cx = h.left + fx * h.width
          const dy = b.top + b.height / 2 - (h.top + fy * h.height)

          let prog: number
          if (dy < -CONTACT_VERT) prog = 0
          else if (dy > CONTACT_VERT) prog = 1
          else {
            const dx = b.left + b.width / 2 - cx
            prog =
              dx < 0
                ? CONTACT_AT * (1 - Math.min(1, -dx / CONTACT_NEAR))
                : CONTACT_AT + (1 - CONTACT_AT) * Math.min(1, dx / CONTACT_PAST)
          }
          seq.progress(prog)
        }

        gsap.ticker.add(follow)
        follow()

        return () => {
          gsap.ticker.remove(follow)
          seq.kill()
        }
      }

      // Driven by the section where it hands one over, scrubbed against its own
      // window otherwise. A section that owns the moment — a pin the contact
      // happens inside of, with the ball anchored to the same clock — is the
      // only thing on the page that can answer "how far through this are we" in
      // a way the ball will agree with; scrubbing him separately makes the boot
      // and the ball two smoothings of one scroll position, which is the bug
      // that comment in usePlayerPoses is about. See `progress`.
      const driven = !!props.progress
      const tl = gsap.timeline(
        driven
          ? { paused: true }
          : {
              scrollTrigger: {
                trigger: anchor,
                start: props.start,
                end: props.end,
                scrub: 0.6,
                invalidateOnRefresh: true
              }
            }
      )

      // Positions below are fractions of the scroll window, and only because
      // the timeline is padded to exactly 1 at the end. A scrub maps the whole
      // window onto whatever duration the timeline happens to have, so without
      // that padding every number here is silently divided by the total and the
      // last thing scheduled runs off the end of the scroll.
      tl.add(poseTl('stand', 0.14, 'none'), 0)
        .add(poseTl(cam.enter, 0.3, 'power2.out'), 0.14)

      // The contact, late in the window on purpose: where a cameo is anchored
      // to the surface the ball rides, the ball reaches the end of that surface
      // as the window closes, so a contact belongs near the end rather than in
      // the middle where a held shape would sit.
      //
      // How long it takes is the cameo's to say — see `hitAt`/`hitDur`. A
      // header is a snap and a kick is a swing, and one duration cannot be both.
      const hitAt = cam.hitAt ?? 0.68
      const hitDur = cam.hitDur ?? 0.09
      if (cam.hit) tl.add(poseTl(cam.hit, hitDur, 'power1.inOut', false), hitAt)

      // Settles after the contact has finished, whenever that is — and inside
      // the window, which is the part this used to get wrong.
      //
      // Every position here is a fraction of the timeline's *duration*, so a
      // settle that runs past 1 does not simply overhang the end: it stretches
      // the total, and everything before it is divided by the larger number and
      // fires early. Selected Work is where that showed. Its contact is late
      // (hitAt 0.54 over a hitDur of 0.28, so the settle starts at 0.86), and a
      // flat 0.24 settle on top of that made the timeline 1.10 long — so the
      // swing ran from 0.49 to 0.745 of the hold instead of 0.54 to 0.82, and
      // the boot swept through the ball's landing point at 0.64 of a window
      // where the ball does not arrive until 0.71. That is the kick that fires
      // before the ball reaches the foot: not a mistimed pose, a timeline that
      // was 10% longer than the fractions in it claimed.
      //
      // Clipped rather than moved, because when the contact is this late the
      // settle is the only leg with anything to give: the wind-up and the swing
      // are the move, and what follows them is a return to standing.
      const settleAt = Math.max(0.78, hitAt + hitDur + 0.04)
      tl.add(poseTl(cam.settle, Math.min(0.24, 1 - settleAt), 'power2.inOut'), settleAt)
      tl.to({}, { duration: 0.001 }, 0.999)

      // Driven off the section's clock rather than the scrollbar. A ticker
      // rather than a watcher: the value it reads is smoothed per frame, so the
      // only sampling rate that cannot alias it is the frame.
      let drive: gsap.TickerCallback | null = null
      if (driven) {
        drive = () => tl.progress(gsap.utils.clamp(0, 1, props.progress!()))
        gsap.ticker.add(drive)
        drive()
      }

      return () => {
        if (drive) gsap.ticker.remove(drive)
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    })
  }
})

onBeforeUnmount(() => {
  mm?.revert()
})
</script>

<template>
  <svg
    ref="rootRef"
    class="player"
    :class="[`player--${variant}`, { 'player--flip': flip }]"
    viewBox="0 0 240 340"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <radialGradient :id="gid('ball')" cx="34%" cy="28%" r="72%">
        <stop offset="0%" stop-color="#ffa877" />
        <stop offset="40%" stop-color="#ff7c3e" />
        <stop offset="76%" stop-color="#e8551c" />
        <stop offset="100%" stop-color="#c6420f" />
      </radialGradient>

      <radialGradient :id="gid('spec')" cx="33%" cy="25%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>

      <!-- The shirt's stripes are rects, cut to the shirt rather than drawn to
           fit it: the torso is a curved shape and a stripe hand-fitted to it
           would need redrawing the moment the silhouette changed. -->
      <clipPath :id="gid('shirt')">
        <path
          d="M100 203C99 176 98 141 99 131C100 120 107 114 120 113C133 114 140 120 141 131C142 141 141 176 140 203Z"
        />
      </clipPath>
    </defs>

    <!-- Outside the rig, so it stays on the turf when a jump lifts him off it.
         See the `lift` term in poseTl. A class rather than an id: there are as
         many of these on the page as there are players. -->
    <!-- The surface the ball bounces on for a looping cameo, and nothing at
         all for any other. Placed over the seated figure's raised boot, sized
         to a boot rather than a point so the ball has somewhere to sit rather
         than balance, and animated by the same timeline that alternates his
         feet — see the `loop` branch in <script>.

         Outside the rig on purpose: it traces the ball's arc, not the foot's,
         and the two only meet at the contact. `fill="none"` because it is a
         measurement, not a drawing; `getBoundingClientRect` reports it either
         way. -->
    <rect class="p-touch" x="226" y="266" width="38" height="6" fill="none" />

    <ellipse
      class="p-shadow"
      cx="120"
      cy="325"
      rx="54"
      ry="8"
      :fill="shade.fill"
      :opacity="shade.opacity"
    />

    <g ref="rigRef" class="p-rig">
      <!-- The waistband, and it is drawn before either leg rather than inside
           the torso where it started.

           Paint order is the whole reason. Inside the torso it sits after the
           back leg and before the front one, so it covered the back leg's
           shorts panel and not the front's — invisible in profile, where the
           two panels are on the same centre line anyway, and glaring at the
           midpoint of a turn, where they have separated to opposite hips and
           only one of them still has any shorts on. That midpoint is the one
           frame that has to be perfectly symmetric, because the facing flips on
           it. Drawn first, both panels paint over it and it bridges between
           them, which is what a pair of shorts looks like from behind.

           It also stops following the torso's lean, which is a small
           improvement rather than a cost: a lean is a bend in the spine, and
           the pelvis is below it. -->
      <rect class="p-hip" x="99" y="186" width="42" height="32" rx="10" fill="#1B4FD1" />
      <!-- ── BACK LEG ────────────────────────────────────────────────────
           Drawn first, so everything else paints over it. Its tones are a
           step darker than the front leg's throughout: that difference is
           the whole of the figure's depth, and without it the two legs read
           as one flat shape whenever a pose brings them close together.

           EVERY LIMB IS LAID OUT THE SAME WAY, and it is the one rule in this
           drawing that is not a matter of taste. A segment running from joint A
           to joint B at half-width w is
                 x = Ax − w,  y = Ay − w,  height = (By − Ay) + 2w,  rx = w
           so that both rounded caps are circles centred exactly on the joints.
           A cap centred on the pivot sweeps into itself under rotation and the
           joint is seamless at any angle, whatever the limb above it is doing.

           Off by even a few units and it is not: the thigh used to start at
           y=176 with rx=15, putting its cap centre at 191 against a hip pivot
           at 186. Standing still nobody could see it. Raise the leg and that
           five-unit offset swung the whole cap out of the hip — a lump
           appearing and disappearing at the top of the thigh through the middle
           of every juggle, and the same thing a size smaller at each knee. -->
      <!-- ── TORSO, LOWER HALF ───────────────────────────────────────────
           Pivots at the hip, same as the thighs, so a lean bends him at the
           waist rather than tipping the whole figure.

           It is in two halves, and the seam is where the back leg goes. Each
           thigh carries a panel of shorts so the shorts follow a swinging leg,
           and that panel has to include the hip it turns about — which puts its
           rounded top at y=170, nineteen units above the shirt's hem. With one
           torso group the shirt landed between the two panels: it covered the
           back leg's and the front leg's covered it. Nobody could see that in
           profile, where the two panels sit on the same centre line and only
           the front one shows. Facing away they have separated to opposite
           hips, and it was a lopsided blue dome over one side.

           Split here, the shirt paints before both panels and neither is
           singled out. The two halves carry the same `data-j`, take the same
           transform, and are one joint drawn in two places — see jointEls. -->
      <g data-j="torso" data-o="120 186">
        <!-- Back arm, behind the shirt. Same joint-centred capsule rule as the
             legs — shoulder at 124, elbow at 162, hand at 200. -->
        <!-- Shoulder 124, elbow 164, hand 206 — four units longer in each
             segment than before, because the arms hang off a torso that is now
             fourteen units longer and a hand that stops at the waistband reads
             as a stump. They finish just onto the thigh, which is where arms
             finish. -->
        <g data-j="armB" data-o="114 124">
          <rect data-far="skin" x="105" y="115" width="18" height="58" rx="9" fill="#C99566" />
          <rect data-far="sleeve" x="104" y="114" width="20" height="34" rx="10" fill="#E8E8EC" />
          <g data-j="forearmB" data-o="114 164">
            <rect data-far="skin" x="106" y="156" width="16" height="58" rx="8" fill="#C99566" />
            <circle data-far="skin" cx="114" cy="206" r="9" fill="#C99566" />
          </g>
        </g>

        <!-- The neck, and it lives on the torso rather than in the head group.
             Hung off the head it swung with every glance up at the ball, which
             is a neck rotating out of its own collar. -->
        <rect x="112" y="100" width="16" height="26" rx="7" fill="#DCA87C" />

        <!-- The shirt, hemmed at the hip line. Long enough to cover the top of
             the hip block — cut shorter it exposed a band of midriff that
             opened and closed as he leaned, which reads as a shirt riding up —
             and no longer, because a hem below the hip hides the shorts
             entirely and leaves a blue crescent that reads as nothing at all. -->
        <path
          d="M100 203C99 176 98 141 99 131C100 120 107 114 120 113C133 114 140 120 141 131C142 141 141 176 140 203Z"
          fill="#FFFFFF"
        />
        <g :clip-path="`url(#${gid('shirt')})`">
          <rect x="94" y="137" width="52" height="10" fill="#1B4FD1" />
          <rect x="94" y="147" width="52" height="10" fill="#E8402F" />
          <rect x="94" y="157" width="52" height="10" fill="#1B4FD1" />
        </g>
      </g>

      <!-- ── BACK LEG ────────────────────────────────────────────────────
           Between the two halves of the torso: behind the shirt, in front of
           nothing. Its tones are a step darker than the front leg's throughout,
           and that difference is the whole of the figure's depth — without it
           the two legs read as one flat shape whenever a pose brings them close
           together. They resolve to the front leg's tones through a turn, where
           both legs are the same distance away and a dark one would be the last
           thing still claiming he faces right.

           EVERY LIMB IS LAID OUT THE SAME WAY, and it is the one rule in this
           drawing that is not a matter of taste. A segment running from joint A
           to joint B at half-width w is
                 x = Ax − w,  y = Ay − w,  height = (By − Ay) + 2w,  rx = w
           so that both rounded caps are circles centred exactly on the joints.
           A cap centred on the pivot sweeps into itself under rotation and the
           joint is seamless at any angle, whatever the limb above it is doing.

           Off by even a few units and it is not: the thigh used to start at
           y=176 with rx=15, putting its cap centre at 191 against a hip pivot
           at 186. Standing still nobody could see it. Raise the leg and that
           five-unit offset swung the whole cap out of the hip — a lump
           appearing and disappearing at the top of the thigh through the middle
           of every juggle, and the same thing a size smaller at each knee. -->
      <g data-j="legB" data-o="120 200">
        <rect data-far="skin" x="105" y="185" width="30" height="89" rx="15" fill="#C99566" />
        <!-- The shorts leg: a semicircle centred on the hip, straight sides, and
             a flat hem. Rounded at the top because it turns with the thigh and
             has to stay on it, square at the bottom because a hem is square —
             which a plain rounded rect could not give, and which is what had
             this reading as a loose blue disc. -->
        <!-- Geometrically identical to the front leg's panel, unlike the limbs
             around it. The far leg is drawn a shade narrower everywhere else as
             a depth cue; on the shorts that cue is carried by the colour alone,
             because two hems two units apart leave a visible step down the
             middle of him at the one moment the two are side by side. -->
        <path data-far="shorts" d="M103 200a17 17 0 0 1 34 0v32h-34z" fill="#1642AE" />

        <g data-j="shinB" data-o="120 259">
          <rect data-far="skin" x="107" y="246" width="26" height="77" rx="13" fill="#C99566" />
          <path data-far="sock" d="M107 283h26v27a13 13 0 0 1-26 0z" fill="#DDDDE2" />
          <rect data-far="band" x="107" y="287" width="26" height="8" fill="#C08079" />

          <g data-j="footB" data-o="120 310">
            <path
              data-far="boot"
              d="M107 310a13 13 0 0 1 26 0v6l23 2c6.8.6 10.6 3.9 10.6 8.6v1.5c0 2.4-1.9 4.3-4.3 4.3h-55.8c-3.9 0-7-3.1-7-7z"
              fill="#C6420F"
            />
            <rect x="112" y="306" width="4" height="14" rx="2" fill="#F0EDE6" opacity="0.45" />
          </g>
        </g>
      </g>

      <!-- ── TORSO, UPPER HALF ───────────────────────────────────────────
           The same joint as the lower half and the same transform; only the
           painting order separates them. -->
      <g data-j="torso" data-o="120 186">
        <!-- ── HEAD ─────────────────────────────────────────────────────
             Pivots at the neck. He looks up at the ball through most of the
             moves here, which is the negative `head` value in the poses.

             r=24 rather than the 26 this started at. At 26 the head was a fifth
             of his standing height, which is the proportion of a small child —
             and it read as one. Two units is the difference between stylised
             and infantile at this scale. -->
        <g data-j="head" data-o="120 118">
          <circle cx="122" cy="88" r="24" fill="#F2BF95" />

          <!-- Seen from behind: hair over the whole skull and an ear at each
               side. Nothing else — no eye, no fringe, no jaw. The absence is
               the point, and a plain filled circle is the most legible version
               of it at the width he is when it appears. -->
          <!-- Centred on 120, not on the 122 the profile head is drawn at. Two
               units is nothing to look at and everything to the flip: this is
               the drawing that has to be its own mirror image, and a head two
               units off-axis is the one thing in `backView` that would not
               have been. -->
          <template v-if="back">
            <circle cx="98" cy="92" r="4.5" fill="#DCA87C" />
            <circle cx="142" cy="92" r="4.5" fill="#DCA87C" />
            <circle cx="120" cy="88" r="24" :fill="hair" />
          </template>

          <!-- Seen from the side. Hair as a cap over the whole skull, not a
               fringe across the front of it: what this replaces covered the top
               and stopped, leaving the back of his head as bare skin from the
               crown to the collar.

               The outer edge is an arc on the skull circle itself, from the
               nape up over the crown to the hairline; the curves back down are
               the hairline. Sweep-flag 1, and it is worth knowing why: SVG's
               positive-angle direction is measured in a y-down space, so the
               flag that takes the arc *over* the head is the one that reads as
               clockwise. Set to 0 it goes the other way round — under the jaw
               and across the face — and the two ends still join, so it does not
               fail, it just fills the entire head in black. -->
          <template v-else>
            <circle cx="103" cy="94" r="5" fill="#DCA87C" />
            <path
              d="M100 97A24 24 0 0 1 144 77c-7-4-15-5-20-3-11 4-20 8-22 12-1 4-2 8-2 11z"
              :fill="hair"
            />
            <circle cx="132" cy="88" r="2.3" :fill="hair" />
          </template>
        </g>

        <!-- Front arm, over the shirt. -->
        <g data-j="armF" data-o="126 124">
          <rect x="117" y="115" width="18" height="58" rx="9" fill="#F2BF95" />
          <rect x="116" y="114" width="20" height="34" rx="10" fill="#FFFFFF" />
          <g data-j="forearmF" data-o="126 164">
            <rect x="118" y="156" width="16" height="58" rx="8" fill="#F2BF95" />
            <circle cx="126" cy="206" r="9" fill="#F2BF95" />
          </g>
        </g>
      </g>

      <!-- ── BALL ────────────────────────────────────────────────────────
           Between the torso and the front leg on purpose. In front of the
           body so it is never buried, behind the front boot so a trap puts
           the sole on top of it and a rest puts the foot on it — which is
           what those two poses are, and neither works with the ball painted
           last. -->
      <!-- Radii here are RIG.ballR and its marks scaled to match. The constant
           is the one that matters — it is what the contact points are computed
           from — so if these two ever disagree the ball is drawn one size and
           met at another. -->
      <g v-if="ownsBall" ref="ballRef" class="p-ball">
        <circle r="22" :fill="`url(#${gid('ball')})`" />
        <!-- Marks, so the spin is legible. A bare sphere turning reads as a
             sphere sliding. Same idea as .scroll-ball-spin. -->
        <g ref="spinRef">
          <circle cy="-13.5" r="4.3" fill="#8B2C08" opacity="0.26" />
          <circle cy="13.5" r="4.3" fill="#8B2C08" opacity="0.26" />
          <circle cx="-13.5" r="3.5" fill="#8B2C08" opacity="0.18" />
        </g>
        <!-- Highlight, above the spinning layer and outside it: the light does
             not orbit with the ball. -->
        <circle r="22" :fill="`url(#${gid('spec')})`" />
      </g>

      <!-- ── FRONT LEG ───────────────────────────────────────────────────
           The one that does the work in every pose in the table. -->
      <g data-j="legF" data-o="120 200">
        <rect x="104" y="184" width="32" height="91" rx="16" fill="#F2BF95" />
        <path d="M103 200a17 17 0 0 1 34 0v32h-34z" fill="#1B4FD1" />

        <g data-j="shinF" data-o="120 259">
          <rect x="106" y="245" width="28" height="79" rx="14" fill="#F2BF95" />
          <path d="M106 282h28v28a14 14 0 0 1-28 0z" fill="#F4F4F6" />
          <rect x="106" y="286" width="28" height="8" fill="#E8402F" />

          <g data-j="footF" data-o="120 310">
            <path
              d="M106 310a14 14 0 0 1 28 0v6l25 2c7 .6 11 4 11 8.8v1.5c0 2.4-1.9 4.3-4.3 4.3h-58.7c-4 0-7-3.1-7-7z"
              fill="#FF4A1F"
            />
            <rect x="112" y="306" width="4.5" height="15" rx="2.2" fill="#FFFFFF" opacity="0.7" />
            <rect x="120" y="307" width="4.5" height="14" rx="2.2" fill="#FFFFFF" opacity="0.7" />
          </g>
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped>
/* Sized by whatever places it — the hero wants a figure most of a screen tall
   and a cameo wants one a fraction of that, and neither is this file's business.
   What is: the overflow, because an overhead kick and a volleyed ball both
   leave the viewBox by design, and a clipped bicycle kick is a man lying down. */
.player {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  pointer-events: none;
}

.player--flip {
  transform: scaleX(-1);
}

/* Both layers the ball's own tweens write to, declared once here rather than
   inline: GSAP sets transforms on these every frame. */
.p-ball,
.p-rig {
  will-change: transform;
}
</style>
