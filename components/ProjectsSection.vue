<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReveal } from '~/composables/useReveal'
import { BALL_QUERY, ballClock, registerPerch, useBallPerch } from '~/composables/useScrollBall'
import { useSwipeRail } from '~/composables/useSwipeRail'
import newPatrolImg from '~/assets/img/works/new-patrol.webp'
import partsImg from '~/assets/img/works/Genuine-Nissan-Parts-GHANA.webp'
import magniteImg from '~/assets/img/works/magnite.webp'
import infinitiImg from '~/assets/img/works/infiniti.webp'
import petrominImg from '~/assets/img/works/Nissan-KSA-Petromin.webp'
import smartImg from '~/assets/img/works/smart.webp'

interface Project {
  brand: string
  title: string
  summary: string
  tech: string
  demoUrl: string | null
  liveUrl: string | null
  demoLabel: string | null
  image: string | null
}

const projects: Project[] = [
  {
    brand: 'Nissan',
    title: 'New Patrol Launch Platform',
    summary:
      'Launch platform for the new Nissan Patrol across Middle East and Africa markets. Built the frontend from Figma designs and the GSAP/WebGL launch animation.',
    tech: 'Vue.js · GSAP · WebGL',
    demoUrl: null,
    liveUrl: 'https://en.allnewpatrol.nissan-dubai.com/',
    demoLabel: 'allnewpatrol.nissan-dubai.com',
    image: newPatrolImg
  },
  {
    brand: 'Nissan',
    title: 'Parts e-commerce',
    summary:
      'Storefront for ordering genuine Nissan parts. Built the frontend and connected it to the parts catalog and checkout APIs.',
    tech: 'Vue.js · Pinia · Tailwind CSS',
    demoUrl: null,
    liveUrl: 'https://parts.nissanghana.com/',
    demoLabel: null,
    image: partsImg
  },
  {
    brand: 'Nissan',
    title: 'Magnite Microsite',
    summary:
      'Model microsite for the Nissan Magnite, including the Arabic/English RTL layout.',
    tech: 'GSAP · Tailwind CSS',
    demoUrl: null,
    liveUrl: 'https://en.allnewmagnite.nissan-saudiarabia.com/',
    demoLabel: null,
    image: magniteImg
  },
  {
    brand: 'Nissan',
    title: 'Smart Test Drive',
    summary:' Smart Test Drive tool for great customer experience.',
    tech: 'Vue.js · Google Maps API',
    demoUrl: 'https://smartdrive-app.alt-test-server.com/en/choose-language?showroomId=0010N00004IfscmQAB&debug=true',
    liveUrl: null,
    demoLabel: null,
    image: smartImg
  },
  
  {
    brand: 'INFINITI',
    title: 'Inventory Tool',
    summary: 'Dealership-facing tool for browsing vehicle inventory, built on top of the inventory data API.',
    tech: 'Vue.js · Axios',
    demoUrl: null,
    liveUrl: 'https://www.infiniti-dubai.com/infiniti-certified.html',
    demoLabel: null,
    image: infinitiImg
  },
  {
    brand: 'Nissan',
    title: 'Petromin KSA',
    summary:
      'Dealer website for Nissan in Saudi Arabia, part of the Middle East rollout with RTL-aware layouts.',
    tech: 'Vanilla JS · SASS',
    demoUrl: null,
    liveUrl: 'https://en.petromin-nissan.com/',
    demoLabel: null,
    image: petrominImg
  }
]

// Each card shows one link: the production URL when the work is live, the
// demo/staging URL otherwise. The label falls back to the host — which is what
// the one hand-written `demoLabel` already was — so a demo URL carrying a query
// string doesn't have to be readable to be linkable.
function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

const cards = projects.map((project) => {
  const url = project.liveUrl ?? project.demoUrl
  return {
    ...project,
    link: url ? { url, label: project.demoLabel ?? hostLabel(url) } : null
  }
})

const sectionRef = ref<HTMLElement | null>(null)
const railRef = ref<HTMLElement | null>(null)

/**
 * The heading and the rule — held still while he strikes, then released into
 * the deck.
 *
 * Holding anything costs scroll, and that scroll has to be spent on *something*
 * visible. There are only two candidates and both were built wrong first:
 *
 *   pinSpacing: true   spends it on nothing. The spacer reserves the hold's
 *                      whole duration as padding below the block, which is an
 *                      empty band between the rule and the first card — and it
 *                      sits there long before the pin is anywhere near.
 *   pinSpacing: false  spends it on the deck, which is right, but only if the
 *                      deck has somewhere to come *from*. Adjacent, it rode
 *                      straight up past the held block and the first card
 *                      rendered above and below the heading at once.
 *
 * The fix is the second one plus a runway: the rule carries an extra
 * HOLD_SCROLL of bottom margin at `lg`, so the deck begins the hold exactly
 * that far low and arrives at its normal spacing on the frame the pin releases.
 * The scroll is spent on the cards coming to meet the heading, which is the
 * thing the section wanted to say anyway.
 *
 * Not the section, either. A pin sets its element `position: fixed`, and
 * `position: sticky` needs a scrolling ancestor — pinning the whole section
 * dropped every deck card back to flow for the hold and snapped them back the
 * frame it ended. Measured: 289px.
 */
const headBlockRef = ref<HTMLElement | null>(null)

/**
 * The window the whole contact plays over: the roll down the rule, the wind-up,
 * the strike, the follow-through.
 *
 * The rule's perch and the player's own scrub are both given this identical
 * range — two windows describing one moment is the bug this keeps walking into.
 *
 * Short, because it is borrowed: the heading is held still for exactly this
 * much scroll and the reader gets nothing else in return but the kick. It is
 * also the deck's runway — the rule's bottom margin at `lg` is the normal 112
 * plus this — so the two are one number and must stay one number. Raise it and
 * the deck starts lower to match; they cannot be tuned apart.
 */
// 620 rather than the 420 it ran at, and the roll is what bought the extra 200.
// The ball crosses 335px of rule between where it lands (`from`) and the boot
// (DECK_FROM), and it is given CONTACT_AT of this window to do it in — so at 420
// the roll ran at 1.11px of travel per px of scroll, half again the 0.75 cruise
// that every plain rail on the page is laid out against, and the fastest roll
// anywhere on the site. 620 × 0.72 is 446px of scroll for those 335, which is
// the cruise. The scroll is not wasted while it is spent: the deck's runway is
// this same number, so what the reader gets for it is the cards climbing into
// place behind the held heading.
const HOLD_SCROLL = 620
/**
 * Where the block comes to rest.
 *
 * 260 rather than flush, and the nav is what sets it: at `top+=120` the rule
 * settled around y=245, putting the player's box top at 30 under an 88px nav —
 * he played the whole strike with his head cut off. The ball's own top fade
 * band (190px) is satisfied either way, so the nav is the binding constraint.
 */
const HOLD_START = 'top top+=260'

/**
 * The pin, kept so the hold's own geometry can be read back off it.
 *
 * `holdProgress` used to live here as a ref written from the pin's `onUpdate`,
 * and it was the wrong number in a way nothing about it looked wrong: a
 * ScrollTrigger's progress is raw scroll. Everything else about the ball is
 * smoothed — that is what FOLLOW_TAU is for — so the one perch on the page that
 * was supposed to be the best synchronised was also the only one whose roll
 * advanced in wheel-sized steps, and the only one that ran at the page's
 * instantaneous speed rather than the ball's. See `holdK`.
 */
let holdST: ScrollTrigger | null = null

/**
 * How far into the hold the ball reaches his boot.
 *
 * The perch reads `to` at progress 1, so handed the window's progress raw the
 * ball arrived exactly as it closed — he struck it on the last frame and the
 * entire follow-through fell outside. Finishing the roll at 71% leaves the last
 * near-third of the window for the strike, which is the part worth the room.
 *
 * 0.71 rather than a round number, and it is a measurement rather than a taste:
 * it is where his boot passes the point the ball comes to rest on. The swing
 * runs from 0.54 to 0.82 of the hold (`hitAt`/`hitDur` on the `work` cameo) and
 * the boot crosses the ball's landing x three fifths of the way through it —
 * measured at 1440×900, x=792 against a ball that stops at 790. Put the ball
 * there at the same moment and the contact is a contact; the two were 0.08 of
 * the hold apart before, which is the boot arriving first and swinging through
 * an empty spot. See the settle note in ThePlayer for why they were.
 */
const CONTACT_AT = 0.71

/**
 * The hold's progress on the ball's clock — the one number the roll, the
 * wind-up and the strike are all three read off.
 *
 * Not the pin's own progress: that is raw scroll, and the ball is smoothed. Two
 * smoothings of one scroll position are two different numbers, and the file this
 * is imported from carries the measurements of what that costs.
 */
const holdK = () => {
  const st = holdST
  if (!st) return 0
  const span = Math.max(1, st.end - st.start)
  return gsap.utils.clamp(0, 1, (ballClock.y - st.start) / span)
}
const stackEnded = ref(false)

// Below lg the deck is a swipe rail — see composables/useSwipeRail.ts and
// `.swipe-rail` in assets/css/main.css. `deckRef` is the same element in both
// presentations: a plain block that holds the sticky cards above lg, the
// scroll container below it.
const deckRef = ref<HTMLElement | null>(null)

/**
 * Where this deck becomes a swipe rail — lower than the shared RAIL_QUERY.
 *
 * Selected Work stacks as a deck down to 992px, which is below the line the
 * other rails switch at, so between 992 and 1023 it is a deck while Skills and
 * Experience are already rails. One shared constant cannot say that, hence the
 * override. Kept in step with the `deck` screen in tailwind.config.ts and the
 * `max-width: 991px` blocks in <style> below.
 */
const DECK_RAIL_QUERY = '(max-width: 991px)'

const { active, isRail, goTo } = useSwipeRail(
  () => deckRef.value,
  '.work-card',
  DECK_RAIL_QUERY
)

// Where along the deck's width the walk starts and finishes. The heading rule
// is its first step and the six cards are the rest, so the ball crosses the
// section once, left to right, rather than resetting on every card.
//
// Left to right and not the other way, though the other way looked better on
// paper: the experience chart starts at the left-hand end of its first card,
// so a deck finishing on the left would hand over with almost no distance to
// cover. What that ignores is that the last card has to *release* the ball
// while it is still on screen. The deck scrolls away well before the chart
// opens, and a ball still riding the last card at that point rides it up out
// of the frame and then snaps back down into the middle of the screen when the
// chart finally takes over — measured as a 120px jump appearing at full
// opacity from nothing. Finishing on the right means the handoff can go off
// the edge of the frame instead, which is what `side` is for.
// Where the ball leaves the rule and joins the deck — and therefore where the
// player has to be standing, because this is the point he strikes it at.
//
// 0.14 for a long time, which put the handover a seventh of the way along the
// rule. That is directly beneath the section heading, and a figure big enough
// to read as one cannot stand there: standing on the rule he is nearly two
// hundred pixels tall and the heading's foot is forty above it.
//
// 0.48 rather than the 0.42 tried first, and the six points are measured, not
// hedged: SELECTED WORK sets to about 420px at the size it clamps to, which
// ends a shade past 0.42 of the rule — he stood on the K. This clears the
// longest the heading gets and the rule still has a good run into him.
//
// The deck's walk pays for it: the ball crosses the cards from here rather than
// from 0.14, a little over half of what it used to. Worth it — the roll it
// gives up is the invisible part, and what it buys is the contact.
const DECK_FROM = 0.56
const DECK_TO = 0.88

/**
 * Px pulled in from each end of the *rule*, so the ball sits clear of its ends.
 *
 * Stated rather than left to the ball's own default, because the player's
 * position is derived from it — see `.work-player` — and a handover point
 * measured two different ways is a boot and a ball in two different places. Not
 * the deck's 26: that one is clearing a card's corner radius, this one is the
 * end of a hairline, and they are only the same kind of number by coincidence.
 */
const RAIL_INSET = 14
/**
 * Where his striking boot sits across his own box, as a fraction of its width.
 *
 * The same point CONTACT_X names in ThePlayer, which is where a *tracked* cameo
 * measures the ball's approach from. This cameo is not tracked — it is driven by
 * the hold's clock — so nothing in the script consults it, and the alignment is
 * geometric instead: he has to be standing such that this point on him lands on
 * DECK_FROM. Measured at 1440×900 against the live rig, the boot's centre at the
 * moment of contact sits at 0.717 of his box.
 */
const BOOT_AT = 0.72

// The ball rides down the deck: the rule under the section heading first, then
// the top edge of each card as that card comes to the front of the stack.
//
// It used to roll off the right edge of the frame instead and stay off it
// until the experience chart, on the reasoning that a ball crossing in front
// of the cards competes with the thing it is meant to be leading you to. What
// that cost, measured, was three viewports of scroll — a third of the page —
// with no ball on screen at all, which is a longer absence than the journey
// can carry. Riding the deck keeps it present without putting it over any
// copy: a card's top edge is its border, and the ball sits on it.
//
// The rule is the first step of that walk and the cards are the rest — see
// DECK_FROM — so the whole section reads as one crossing rather than seven.
useBallPerch(() => railRef.value, {
  // The pinned block, over exactly the pin's range. Struck against the rule
  // itself the markers stop moving the moment it is held, so the whole roll —
  // and the strike that ends it — was over before the hold began.
  trigger: () => headBlockRef.value,
  // In frame, not below it. At 106% the ball landed on a rule that was still
  // a screen's-worth under the fold, so it spent the fall diving to meet it —
  // measured at 3.3px of descent per px of scroll, down to within 70px of the
  // bottom edge — and then rode back up as the rule came into view. A ball
  // that plunges off the bottom of the screen and returns is not a hop, and it
  // was the one place on the page where the vertical read faster than the
  // horizontal. Landing on a rule that is already in frame makes the fall a
  // fall.
  start: HOLD_START,
  // A quarter of the frame, not the 86% of it this used to claim.
  //
  // The window a section declares is not free. layout() spends the scroll in a
  // run on the legs that need it, but it also walks backwards from the end of
  // the run working out what every perch after this one is owed — and a perch
  // may not be handed the ball later than that arithmetic allows, even when its
  // own trigger says it should be. A fat declaration here is therefore charged
  // against the *fall into it*: measured at 1920×1080, this rule's 928px window
  // for a 165px roll (0.19px per px of scroll, a quarter of the cruise) forced
  // the hop out of the hero to land ~620px before this trigger's own `top 88%`,
  // which is a rule still half a screen under the fold. The dive off the bottom
  // of the frame the comment above describes was never fixed by moving the
  // start line; it was only moved out of this section's own arithmetic.
  //
  // Short enough that the roll runs near ROLL_SPEED and the slack goes back to
  // the fall, which is the leg that has somewhere to be.
  //
  // It closes at the contact rather than at the end of the hold, which is a
  // change of a third of the window. A perch's window is how long the ball is
  // *on* it, and the ball is on this rule until it is kicked — held open to the
  // end of the pin instead, it sat parked at the boot for the last 180px of
  // scroll while the follow-through swung out and came back through it, which is
  // a struck ball that has not gone anywhere. Ending here hands those 180px to
  // the crossing down onto the deck, which is the leg that is supposed to have
  // them: it is the flight off his foot.
  end: `+=${Math.round(HOLD_SCROLL * CONTACT_AT)}`,
  // The ball lands part-way along the rule rather than at its left-hand end,
  // and that is about *when* the handover happens rather than where.
  //
  // The ball paces itself: layout() gives a roll however much scroll it needs
  // to run at ROLL_SPEED, so the length of the roll sets how far down the page
  // it finishes. Rolling the full width to a handover at 0.48 costs ~765px of
  // scroll against the ~234px this trigger declares, and layout duly stretched
  // the window — which pushed the contact until the rule had scrolled to the
  // top of the frame. Measured: the striking boot was at y=-73, off the top of
  // the screen, and the ball was down to a tenth of its opacity in the fade
  // band by the time it got kicked.
  //
  // Landing at 0.28 leaves a fifth of the rule to roll, which finishes with the
  // rule around the middle of the frame — where somebody can see it. It costs
  // nothing: the ball arrives here out of the air from the hero, and where it
  // touches down is a free choice.
  from: 0.28,
  to: DECK_FROM,
  // The ball's own default, written down — see RAIL_INSET. `.work-player`
  // resolves DECK_FROM through the same number to stand him on it.
  inset: RAIL_INSET,
  // The hold's own clock — see `holdK`. Also what stops layout() moving this
  // window out from under the pin. Compressed into the first CONTACT_AT of it so
  // the strike lands with the hold still running.
  progress: () => Math.min(1, holdK() / CONTACT_AT)
})

let stackEndObserver: IntersectionObserver | null = null
let deckMedia: ReturnType<typeof gsap.matchMedia> | null = null

let holdMedia: ReturnType<typeof gsap.matchMedia> | null = null

onMounted(() => {
  holdMedia = gsap.matchMedia()

  /**
   * Holds the heading and the rule still while he strikes the ball.
   *
   * Without it the whole contact happened on a block travelling past at the
   * page's own speed — measured, 900px of scroll, which is under a third of a
   * second at any real scrolling pace, on a moving target.
   *
   * What is pinned and how is the whole of this — see `headBlockRef`, which
   * carries the two ways it was got wrong first.
   *
   * Gated on BALL_QUERY: below it there is no ball, no player, and nothing to
   * hold the page for. Also the width at which the deck stops being a deck, so
   * pinning there would only be taking scroll from a phone.
   */
  holdMedia.add(BALL_QUERY, () => {
    const el = headBlockRef.value
    if (!el) return

    // Pinned without spacing, and the deck's runway is what makes that work —
    // see the rule's wrapper in the template. Its start and end are also the
    // hold's geometry, which `holdK` reads back so the roll, the wind-up and the
    // strike are three views of one number and cannot drift.
    const st = ScrollTrigger.create({
      trigger: el,
      start: HOLD_START,
      end: `+=${HOLD_SCROLL}`,
      pin: true,
      pinSpacing: false,
      anticipatePin: 1,
      invalidateOnRefresh: true
    })
    holdST = st

    return () => {
      st.kill()
      holdST = null
    }
  })

  // Cards rise into view through the blur band, which owns the bottom ~22vh.
  // At the default 88% line the fly-in plays out entirely behind that blur and
  // the card surfaces already-arrived. Triggering above the band spends the
  // motion where it can actually be seen.
  useReveal(sectionRef.value, '.reveal', 'top 74%')

  const cardEls = sectionRef.value?.querySelectorAll<HTMLElement>('.work-card')
  const sentinel = sectionRef.value?.querySelector('[data-stack-end]')
  if (!cardEls?.length || !sentinel) return

  // Once the last card has settled there is nothing left below it to rise out
  // of the blur, so the band gets out of the way rather than sitting on it.
  //
  // The sentinel sits at the last card's flow position and that card pins at
  // `pinOffset`, so the moment the sentinel crosses that line is exactly the
  // moment the card settles — independent of viewport and card height. A
  // discrete class toggle, not a scroll handler, so it can't jitter.
  const pinOffset = parseFloat(getComputedStyle(cardEls[cardEls.length - 1]).top) || 0

  // The huge bottom inset is load-bearing: it stretches the root box far past
  // the viewport so the sentinel is either above the pin line or inside the
  // box, never in a third "below the viewport" state. With only two states,
  // isIntersecting always flips on a fast scroll or an anchor jump. Bounding
  // the box at the viewport instead lets both sides read isIntersecting:false,
  // and a fling that skips the crossing frame leaves the band stuck off.
  stackEndObserver = new IntersectionObserver(
    ([entry]) => {
      stackEnded.value = !entry.isIntersecting
    },
    { rootMargin: `-${pinOffset}px 0px 100000px 0px` }
  )

  stackEndObserver.observe(sentinel)

  // One perch per card, gated on the same query the ball itself is gated on so
  // the two can never disagree about whether the journey is running. Below lg
  // the deck is a swipe rail and none of this exists.
  //
  // registerPerch rather than useBallPerch because a card's window is not
  // expressible as one trigger's start and end: a card is the front of the
  // deck from the moment it sticks until the *next* card sticks over it, which
  // is two different elements' geometry.
  deckMedia = gsap.matchMedia()
  deckMedia.add(BALL_QUERY, () => {
    const deck = Array.from(cardEls)
    if (deck.length < 2) return

    // Read off the element rather than recomputing `--band + index * 10px` by
    // hand, so the stacking offset stays defined in exactly one place. Called
    // per refresh, so a viewport change that moves the band re-resolves it.
    const stickAt = (i: number) => parseFloat(getComputedStyle(deck[i]).top) || 0

    const sts = deck.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: () => `top top+=${stickAt(i)}`,
        // The card that covers this one ends it. The last has nothing above
        // it, so it holds the ball until the deck itself is leaving.
        endTrigger: i + 1 < deck.length ? deck[i + 1] : el,
        end:
          i + 1 < deck.length
            ? () => `top top+=${stickAt(i + 1)}`
            : () => `+=${Math.round(window.innerHeight * 0.5)}`
      })
    )

    const step = (i: number) => DECK_FROM + (DECK_TO - DECK_FROM) * (i / deck.length)

    /**
     * The clock every card in the deck reads, and the reason they read one at
     * all.
     *
     * These were free perches, and a free perch's window is the ball's to move:
     * layout() spends the scroll between two anchors on the legs that need it,
     * and it may hand a perch over earlier than the section asked for when the
     * run as a whole is short of room. This run always is — six cards declaring
     * a screenful each, plus a sideways exit, against the page between the
     * heading and the experience chart — so every card after the first was
     * handed over early, further each time. Measured: the third card's window
     * opened 174px of scroll before that card had finished stacking, so the step
     * onto it was aimed 174px lower than the step actually is, and the ball dived
     * a hundred-odd pixels below the deck and climbed back out as the card
     * arrived. That is the drop between cards that does not read as a drop.
     *
     * But a card is ridable exactly while it is the front card, and when that is
     * is a fact about the sticky stack rather than a budget: it is the same kind
     * of window the experience chart's cards have, and it belongs to the section
     * for the same reason. Anchored, each window sits where the card really is,
     * the step is the ten pixels it looks like, and nothing is compressed.
     *
     * A plain object as the identity: the six of them share this clock, and the
     * projects rule above and the chart below must not be mistaken for sharing
     * it. See `clock` in useScrollBall.ts.
     */
    const deckClock = {}

    /**
     * How much of a card's turn at the front is the step onto the next card
     * rather than a roll along this one.
     *
     * The windows are contiguous — a card's turn ends where the next one's
     * begins — so without this the step would have no scroll to happen in and
     * the ball would change cards between one frame and the next. 0.15 of a
     * card's turn is 69px of scroll for a 10px drop, which is 0.15px of travel
     * per px of scroll: the same pace as the roll it interrupts (62px of rule
     * over the other 392px), so the ball does not change speed to step down.
     */
    const CARD_HOP = 0.15

    /** Where card `i`'s roll ends and the step onto card `i + 1` begins. */
    const ridableTo = (i: number) => {
      const a = sts[i].start
      const b = sts[i].end
      // The last card has nothing to step onto — it leaves sideways — so it
      // keeps the whole of its window.
      return i + 1 < deck.length ? a + (b - a) * (1 - CARD_HOP) : b
    }

    const offs = deck.map((el, i) =>
      registerPerch({
        surface: () => el,
        range: () => [sts[i].start, ridableTo(i)],
        // Unclamped on purpose: a hop between two perches on one clock is timed
        // by how far past 1 the one behind is against how far short of 0 the one
        // ahead is, so both have to be free to say. `perchK` clamps it before
        // anything is placed with it.
        progress: () =>
          (ballClock.y - sts[i].start) / Math.max(1, ridableTo(i) - sts[i].start),
        clock: deckClock,
        // Each card carries the ball one step of the way across, so the deck
        // reads as one continuous walk rather than six rolls that each reset
        // to the left-hand edge.
        from: () => step(i),
        to: () => step(i + 1),
        // Only the last card's is consulted now — the steps between cards are
        // anchor to anchor and take their scroll from CARD_HOP rather than from
        // layout() — and there it is a floor under the sideways exit, which is
        // sized from the distance to the frame edge and never comes near it.
        fall: 0.07,
        // ...and a step down is all it may be. The card being stepped onto is
        // still climbing towards its sticky offset when the hop starts, so aimed
        // where it is at that moment the ball dived a hundred pixels under the
        // deck and climbed back out as the target arrived — measured between the
        // second and third cards, 123px down at 3px per px of scroll against a
        // roll of 0.2. Aimed where the card *will* be, the same hop is the ten
        // pixels it actually is. See `holdEntry` in useScrollBall.ts.
        holdEntry: true,
        // The last card hands over to the experience chart, which is a whole
        // section away and starts at the left-hand edge again. Off the right
        // of the frame and back in at the left, rather than an arc across
        // everything in between — and it has to leave while the card is still
        // in frame, since the deck scrolls away long before the chart opens.
        side: i === deck.length - 1,
        // Clear of the 22px corner radius.
        inset: 26
      })
    )

    return () => {
      for (const off of offs) off()
      for (const st of sts) st.kill()
    }
  })
})

onBeforeUnmount(() => {
  stackEndObserver?.disconnect()
  holdMedia?.revert()
  deckMedia?.revert()
})
</script>

<template>
  <section id="work" ref="sectionRef" class="relative py-12 md:py-[160px]">
    <div ref="headBlockRef" class="relative z-10 mx-auto max-w-[1320px] bg-paper px-6 md:px-12">
      <div class="reveal mb-9 flex flex-wrap items-end justify-between gap-6 md:mb-11">
        <div>
          <span class="mb-3.5 block font-data text-[13px] tracking-wide text-accent-text">
            01 — Selected work
          </span>
          <h2 class="font-display text-[clamp(30px,4.5vw,58px)] font-black uppercase leading-none tracking-tight">
            Selected Work
          </h2>
        </div>
      </div>

      <!-- The rail, and the player standing on it.

           He is inside a relative wrapper rather than positioned against the
           section, so his feet are on the same line the ball rolls along
           whatever the heading above it wraps to — the margin moved up here
           with him for the same reason.

           Facing right, unflipped, and standing at DECK_FROM. Both follow from
           the same fact: the ball enters this rule at the left, rolls right to
           DECK_FROM, and leaves there for the deck below. So that is where the
           contact is, and forward is the way the ball is already going. He used
           to stand at the far right facing left, which put him most of a rule
           away from the only point on it the ball ever reaches.

           `left` is short of DECK_FROM by the distance from his own left edge to
           his boot, so it is the *foot* that lands on the handover and not his
           hip — and it is computed from DECK_FROM rather than stated, because the
           two are only the same number at one viewport width otherwise. It was
           `left-[47%]`, which is where DECK_FROM lands on a 1224px rule and not
           where it lands on any other: at the 1024px the ball exists from at all,
           the handover point is at x=490 of the rule and 47% of it is 436, so the
           ball came to rest 31px short of a boot swinging through thin air. See
           `.work-player`. -->
      <div class="relative mb-20 md:mb-28">
        <span ref="railRef" class="hidden h-px w-full bg-hair md:block" aria-hidden="true" />

        <div
          class="work-player pointer-events-none absolute -bottom-1.5 hidden w-[var(--cameo)] lg:block"
          :style="{ '--contact': DECK_FROM, '--boot': BOOT_AT, '--rail-inset': `${RAIL_INSET}px` }"
        >
          <!-- Handed the hold's progress on the ball's own clock, rather than
               scrubbed against the same window separately — so his boot and the
               ball are two readings of one number rather than two smoothings of
               one scroll position, which is what they were. See `holdK`. -->
          <ThePlayer move="work" :progress="holdK" />
        </div>
      </div>
    </div>

    <!-- The deck's runway, and it has to live out here rather than on the rule.

         The margin is HOLD_SCROLL, bound from the constant rather than written
         out again: the two are one number and the whole composition breaks
         quietly if they drift, so there is no version of this that should be
         typed twice. (It was `lg:mt-[420px]` beside a comment saying so, which
         is how the pair survived the hold going to 620.)

         The heading above is pinned
         without spacing for that distance, so the deck keeps moving while the
         heading does not — starting a hold's-worth lower is what makes it
         *arrive* at its normal spacing on the frame the pin releases, rather
         than riding straight up past the heading and rendering above it.

         It was tried as bottom margin on the rule's wrapper, which is inside
         the pinned block: ScrollTrigger wraps that block in a `.pin-spacer`
         with an explicit height, and the child margin no longer collapses
         through it. The 532px was applied and measured — and the gap it was
         supposed to produce was 1px. Out here there is no spacer to swallow it.

         Only at `lg`, where the pin runs at all; below that it would be 420px
         of dead page. -->
    <div
      class="work-runway mx-auto max-w-[1320px] px-6 md:px-12 md:pt-0 pt-3"
      :style="{ '--runway': `${HOLD_SCROLL}px` }"
    >
      <!-- `swipe-rail` is bound rather than static: the shared rule for it in
           main.css runs to 1023px, and between 992 and 1023 this deck is a
           deck. Wearing the class there would hand it a scroll-snap flex row to
           fight the sticky stack with. -->
      <div
        ref="deckRef"
        class="work-deck"
        :class="{ 'swipe-rail': isRail }"
        :role="isRail ? 'group' : undefined"
        :aria-roledescription="isRail ? 'carousel' : undefined"
        :aria-label="isRail ? 'Selected work' : undefined"
        :tabindex="isRail ? 0 : undefined"
        @keydown.arrow-left.prevent="goTo(active - 1)"
        @keydown.arrow-right.prevent="goTo(active + 1)"
      >
        <template v-for="(project, i) in cards" :key="project.title">
          <div v-if="i === cards.length - 1" data-stack-end aria-hidden="true" class="h-px w-full" />

          <article
            class="work-card rounded-[16px] bg-paper px-5 py-6 ring-1 ring-hair md:rounded-[22px] md:px-8 md:py-7"
            :class="{ 'work-card--peek': isRail && active !== i }"
            :style="{ '--index': i, zIndex: i + 1 }"
          >
            <!-- Three layouts, not two.

                 At `xl` the card is a row of three: copy, shot, stack. Below
                 `deck` it is a single column with the shot on top. In between it
                 is two columns — copy over stack on the left, shot on the right
                 — and that middle case exists so the deck can keep stacking down
                 to 992px. A single-column card at this width is about 840px
                 tall, which is taller than the frame it would have to pin
                 inside; a two-column one is about 430px, which is not. -->
            <div class="work-card__grid grid grid-cols-1 items-center gap-4 deck:grid-cols-[minmax(0,1fr)_auto] deck:gap-7 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-8">
              <div class="reveal min-w-0 deck:self-end xl:max-w-[270px] xl:self-auto">
                <div class="flex items-center gap-2.5">
                  <span class="font-data text-[12px] text-steel">{{ String(i + 1).padStart(2, '0') }}</span>
                  <span class="font-data text-[10px] uppercase tracking-[0.18em] text-accent-text">
                    {{ project.brand }}
                  </span>
                </div>
                <h3 class="mt-3 font-display md:text-xl text-lg font-bold uppercase leading-tight tracking-tight md:text-[25px]">
                  {{ project.title }}
                </h3>
                <p class="mt-3 text-[13px] leading-relaxed text-steel">{{ project.summary }}</p>
              </div>

              <figure
                class="work-hero order-first w-full overflow-hidden rounded-[12px] bg-paper-soft ring-1 ring-hair deck:order-none deck:col-start-2 deck:row-span-2 deck:row-start-1 deck:w-auto deck:aspect-[3/2] xl:col-start-auto xl:row-span-1"
              >
                <img
                  v-if="project.image"
                  :src="project.image"
                  :alt="`${project.brand} ${project.title} screenshot`"
                  loading="lazy"
                  class="h-full w-full object-cover object-top max-deck:aspect-[3/2]"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center py-16 font-data text-[11px] uppercase tracking-wide text-steel"
                >
                 coming soon
                </div>
              </figure>

              <!-- In the two-column case this sits under the copy rather than
                   in a column of its own, which is what keeps the shot's height
                   the card's height. -->
              <div class="work-card__foot reveal min-w-0 deck:col-start-1 deck:row-start-2 deck:self-start xl:col-start-auto xl:row-start-auto xl:max-w-[230px] xl:justify-self-end xl:self-auto xl:text-right">
                <span class="block font-data text-[10px] uppercase tracking-[0.18em] text-steel">Stack</span>
                <p class="mt-1.5 font-data text-[12px] leading-relaxed text-ink">{{ project.tech }}</p>

                <a
                  v-if="project.link"
                  :href="project.link.url"
                  :title="project.link.url"
                  target="_blank"
                  rel="noopener"
                  class="mt-4 flex min-h-[44px] items-center gap-2 font-data text-[12px] text-ink underline underline-offset-4 transition-colors hover:text-ink/85 xl:mt-6 xl:min-h-0 xl:justify-end xl:pl-4"
                >
                  <span class="min-w-0 truncate">{{ project.link.label }}</span>
                  <span class="shrink-0" aria-hidden="true">→</span>
                </a>
                <p v-else class="mt-2 font-data text-[12px] text-steel">Not listed</p>
              </div>
            </div>
          </article>
        </template>

        <div aria-hidden="true" class="work-stack-tail hidden deck:block" />
      </div>

      <div class="swipe-dots">
        <button
          v-for="(project, i) in cards"
          :key="`dot-${project.title}`"
          type="button"
          class="swipe-dot"
          :aria-label="`Show ${project.title}`"
          :aria-current="active === i ? 'true' : undefined"
          @click="goTo(i)"
        >
          <span />
        </button>
      </div>
    </div>

    <div class="work-fade" :class="{ 'work-fade--out': stackEnded }" aria-hidden="true">
      <div class="work-fade__blur work-fade__blur--1" />
      <div class="work-fade__blur work-fade__blur--2" />
      <div class="work-fade__blur work-fade__blur--3" />
      <div class="work-fade__tint" />
    </div>
  </section>
</template>

<style scoped>
/*
  The stacking and the blur band are the two things here Tailwind has no
  utility for: the per-card sticky offset is computed from the card's index,
  and the band is a masked stack of backdrop-filter layers (a single
  backdrop-filter can't ramp its blur radius across the element).
*/

section {
  /* One measure for both insets: the deck's top offset and the band's height
     are the same number, so a pinned card sits the same distance from the top
     of the viewport as it does from the top of the band. Changing this moves
     both ends together — that symmetry is the point, so don't split it back
     into two values. */
  --band: clamp(150px, 22vh, 240px);

  /* The hero has to be derived, not chosen, once the insets are symmetric.
     Budget: viewport, less both insets, less the 40px the last card sits
     below the first, less the card's 56px of vertical padding, less 24px so
     that card clears the band instead of grazing it. Capped for tall screens.

     Picking a flat 44vh instead fits only above ~930px of viewport height; at
     every laptop height below that the last card's bottom edge parks inside
     the blur and stays there.

     The floor only bites below ~570px of viewport height, where the deck is
     unusable anyway; it is there because a negative height is an invalid
     value, and the fallback to `auto` collapses a figure whose width and
     aspect-ratio are both derived from it. */
  --hero: max(180px, min(370px, calc(100vh - 2 * var(--band) - 120px)));
}

/* The two-column deck: same derivation, lower cap.

   The shot's width follows its height through the 3:2 aspect, and in two
   columns whatever it takes comes straight out of the copy beside it. At the
   full 370px cap that is a 555px shot against a 257px column of text at
   1000px wide — legible, but the card reads as a screenshot with a caption
   rather than a project with a picture. 290px puts the shot at 435 and gives
   the copy back about 120px, which is the difference between two words a line
   and four.

   Only in this band: at `xl` the card has a third column and the shot is no
   longer competing with the copy for the same space. */
@media (min-width: 992px) and (max-width: 1279px) {
  section {
    --hero: max(180px, min(290px, calc(100vh - 2 * var(--band) - 120px)));
  }
}

/* Where he stands, so that his boot is on the handover point rather than near
   it.

   `100%` is the rule's width, since that is what he is positioned inside. The
   first two terms are the ball's resting place — the same expression the perch
   resolves DECK_FROM through, inset and all — and the third steps back from it by
   the distance from his own left edge to his boot. Every term is bound from the
   constant it belongs to, because this is one point measured twice and the two
   measurements have to agree at every width, not just at the one it was eyeballed
   at. */
.work-player {
  left: calc(
    var(--rail-inset) + (100% - 2 * var(--rail-inset)) * var(--contact) - var(--boot) *
      var(--cameo)
  );
}

/* The hold's runway — see the wrapper in the template. `lg` only, matching
   BALL_QUERY: below it nothing is pinned and this would be a screen of dead
   page. The value comes from HOLD_SCROLL through `--runway`, because a hold and
   its runway are the same number. */
@media (min-width: 1024px) {
  .work-runway {
    margin-top: var(--runway);
  }
}

/* Cards pile into a deck, each offset 10px below the previous one so the
   covered cards keep a visible edge. Purely `position: sticky` — the
   compositor drives it, so it cannot stutter the way a scrubbed transform
   can. `--index` is set inline per card.

   The scroll cost of one card in the deck is its own height plus this gap, so
   the gap is the cheap knob for pacing the deck: it shortens the hand-off
   without touching the card's proportions. Kept just wide enough that a card
   fully clears the blur band before the next one starts covering it — drop it
   much further and the two events overlap, which reads as a skip. */
.work-card {
  position: sticky;
  top: calc(var(--band) + var(--index) * 10px);
  margin-bottom: 5vh;
  /* Two layers, because one can't do both jobs at this weight. The first is
     the deck's: cast upward, off the top edge, so a card reads as a sheet
     lying over the one it covers. The second is ambient — a short, soft seat
     all round, which is what actually makes the shadow visible against white
     once the cast layer is light enough not to look heavy. */
  box-shadow:
    0 -14px 36px -24px rgba(18, 18, 18, 0.24),
    0 2px 12px -4px rgba(18, 18, 18, 0.08);
}

/* Height-driven so the 3:2 screenshot is never cropped; the width follows.
   Only applies where the card is a horizontal row — below `deck` it stacks and
   the image goes full-width, which is why this is a media query and not a
   plain rule. */
@media (min-width: 992px) {
  .work-hero {
    height: var(--hero);
  }
}

/* Trailing room so the final card actually gets to pin. A sticky element can
   only travel inside its containing block, so when the container ended at the
   last card's bottom edge that card reached its offset and immediately kept
   scrolling — every other card holds while the next one covers it, and the
   rhythm broke at the end. Height matches one card plus the inter-card gap,
   which is exactly the scroll distance the other cards each hold for. */
.work-stack-tail {
  /* One card: the hero plus the card's vertical padding. */
  height: calc(var(--hero) + 56px);
}

.work-fade {
  --fade-height: var(--band);
  position: sticky;
  bottom: 0;
  z-index: 20;
  height: var(--fade-height);
  /* Overlap the tail of the stack instead of adding layout height. */
  margin-top: calc(var(--fade-height) * -1);
  pointer-events: none;
}

/* Set once the last card has settled — nothing is left below it to emerge
   from the blur, so the band dissolves and leaves the card sharp.

   The transition lives here, not on .work-fade, so it is deliberately
   one-way: fading out is graceful, but scrolling back up restores the band
   instantly. A symmetric fade means 400ms of three backdrop-filter layers
   re-sampling the backdrop every frame mid-scroll, which janks. */
.work-fade--out {
  opacity: 0;
  transition: opacity 400ms ease;
}

.work-fade__blur {
  position: absolute;
  inset: 0;
}

/* Each layer blurs harder and starts lower, so the masks add up to a blur
   that ramps toward the bottom edge rather than switching on at a hard line. */
.work-fade__blur--1 {
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 30%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 30%);
}

.work-fade__blur--2 {
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  mask-image: linear-gradient(to bottom, transparent 30%, #000 62%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 30%, #000 62%);
}

.work-fade__blur--3 {
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  mask-image: linear-gradient(to bottom, transparent 60%, #000 90%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 60%, #000 90%);
}

/* Colour fade to the page background, so cards surface out of the paper
   rather than sliding under a visible grey slab. */
.work-fade__tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.55) 58%,
    theme('colors.paper') 100%
  );
}

/* Below `deck` the card is a single stacked column (image over text), so there
   is no deck to pin — a card that shape is about 840px tall, which cannot pin
   inside a frame shorter than itself — and pinning one on a phone is a
   scroll-hijack that fights the user anyway.
   Must stay in step with the deck: prefixes in the template. */
@media (max-width: 991px) {
  .work-card {
    position: static;
    margin-bottom: 2.5rem;
    /* Nothing to lift off here — the cards sit side by side rather than over
       one another — so only the ambient half of the deck's shadow, which is
       the half that has to carry it on its own. */
    box-shadow:
      0 4px 18px -6px rgba(18, 18, 18, 0.1),
      0 1px 4px -1px rgba(18, 18, 18, 0.06);
  }

  .work-fade {
    display: none;
  }
}

/* The rail. Must come after the block above so its margin reset wins, and
   must stay in step with `.swipe-rail` in assets/css/main.css and with
   RAIL_QUERY in composables/useSwipeRail.ts. */
@media (max-width: 991px) {
  .work-deck {
    /* Matches the container's px-6, so the first card starts on the same
       margin as the heading over it. */
    padding-bottom: 1.5rem;
    --rail-gutter: 1.5rem;
    /* The card takes 85% of the frame and the cut next to it gets the other
       15% — the two are the same number, since --rail-item is derived as
       100% - --rail-peek, so a slide can only be widened by taking it out of
       the peek. A percentage rather than a rem keeps that split fixed at
       every width. The 0.875rem gap comes out of the visible cut, so what
       actually shows of the next card is 15% less about 14px. */
    --rail-peek: 15%;
  }

  .work-card {
    /* The rail spaces the cards; the stacked list's bottom margin would show
       up as dead width at the end of a horizontal row. */
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
  }

  /* Every card but the one holding the frame — in practice the half-cut one
     at the edge, since it is the only other one on screen. Held back far
     enough to sit behind the card you are reading and no further: the peek
     has to stay legible as a card, because looking like the next one is what
     makes it worth swiping to.

     Set from `active`, not from a scroll position, so it changes on the same
     signal the dots do and the two can't disagree — see useSwipeRail.ts. */
  .work-card--peek {
    opacity: 0.55;
    transition: opacity 260ms ease;
  }

  /* Cards are stretched to a common height by the rail, so the slack has to
     go somewhere, and the last row is where it lands. `items-center` in the
     template would centre each row in its track, which puts the foot mid-slack.
  */
  .work-card__grid {
    flex: 1;
    grid-template-rows: auto auto 1fr;
    align-items: start;
  }

  /* The slack is split rather than given to one end. The stack follows the
     summary at the row gap — parking the whole foot on the floor put the
     difference between the longest summary and the shortest into a hole right
     under the description — while the link alone takes the leftover and sits
     on the card's floor, so it lands in the same place on every slide. */
  .work-card__foot {
    align-self: stretch;
    display: flex;
    flex-direction: column;
  }

  /* The link, or the "Not listed" line standing in for it. `auto` collapses
     to nothing on the tallest card, which is the one with no slack to spend,
     so the padding is what guarantees it never closes up on the stack. */
  .work-card__foot > :last-child {
    margin-top: auto;
    padding-top: 1rem;
  }

  /* Marks a flow position for the blur band, which is an xl-only device. In
     the rail it would otherwise be a full-width flex item wedged between two
     cards. */
  [data-stack-end] {
    position: absolute;
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .work-deck {
    /* Follows the container to md:px-12. */
    --rail-gutter: 3rem;
  }
}

/* Two `prefers-reduced-motion: reduce` blocks used to sit here: one unwinding
   the deck back to a stacked list above lg, one killing the peek card's fade
   ramp below it. Both are gone with the gate — see BALL_QUERY in
   composables/useScrollBall.ts. The deck is driven by BALL_QUERY, which is now
   width-only, so unwinding it on a preference would strand the cards the
   timeline is still placing. */
</style>
