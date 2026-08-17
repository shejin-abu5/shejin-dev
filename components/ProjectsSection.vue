<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReveal } from '~/composables/useReveal'
import { BALL_QUERY, ballClock, registerPerch, useBallPerch } from '~/composables/useScrollBall'
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
    summary:' Smart Test Drive tool for great customer experience journey.',
    tech: 'Vue.js · Google Maps API',
    demoUrl: null,
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
    tech: 'Vanilla JS · CMS',
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

/**
 * Where each card's defocus starts and ends, as a percentage of that card's own
 * `view()` range. See `work-card-defocus` in <style> for what the effect is and
 * why these are a table rather than a formula.
 *
 * The short version: a `view()` range on a *sticky* element swallows the whole
 * distance the element spends stuck, so the range is a different length for
 * every card — card 1 holds the frame while five more arrive, card 5 while one
 * does. The same physical moment therefore sits at a different percentage on
 * each card's clock, and the walk from 17% to 31% across the deck is convex,
 * not linear. It was a linear `calc()` off `--index` first, which is within two
 * points at the ends and wrong in the middle: measured, cards 2 to 4 began
 * blurring when the next card was 53-63% up the frame rather than 40%.
 *
 * Each pair is [the next card 40% into the frame, the next card covering this
 * one completely]. Averaged over 375x667, 390x844 and 768x1024 — the numbers
 * move about two points across that span, because the frame height appears on
 * both sides of the fraction and very nearly cancels.
 *
 * Re-measure if the card count, the 5vh gap or the tail changes: scroll the
 * deck in small steps and, for each card, record `getComputedStyle(card)` of a
 * `@property` counter driven by `cover 0% cover 100%` at the two moments.
 */
const DEFOCUS: ReadonlyArray<readonly [number, number]> = [
  [17.3, 85.0],
  [18.8, 82.1],
  [21.3, 79.2],
  [25.3, 76.3],
  [31.3, 73.4]
]

/** The last card has no successor and never defocuses, so it never asks. */
const defocusRange = (i: number) => DEFOCUS[i] ?? DEFOCUS[DEFOCUS.length - 1]

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

/**
 * The deck — at every width now, rather than only above 992px.
 *
 * It used to hand over to a swipe rail below that, and the reason was never
 * that a rail is the right thing on a phone: it was that the card was the
 * wrong shape there. Below `deck` the card fell to a single full-bleed column
 * — shot on top at the container's whole width, copy under it — which measured
 * about 840px tall, and a sticky card cannot pin inside a frame shorter than
 * itself. The rail was a workaround for a card-height problem wearing the
 * clothes of a gesture decision.
 *
 * So the height is what got fixed, in three places, and the rail fell out:
 * `deck` moved to 768px so tablets keep the desktop card's two-column shape;
 * `--shot-cap` derives the shot's height from the frame on phones instead of
 * letting the container's width dictate it; and `--step` narrows the stagger,
 * which is 30px of the budget back on a phone rather than 50.
 *
 * What that buys is one presentation to reason about. The rail was the only
 * place on the page asking the reader to learn a second gesture for the same
 * six things, and it was the only one where the ball's journey — the spine of
 * the whole page — simply stopped and picked up two sections later.
 *
 * Still referenced from script for `--tail`, which is measured rather than
 * derived; see `setTail`.
 */
const deckRef = ref<HTMLElement | null>(null)

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
/** Kept so the ScrollTrigger listener it is registered on can be removed. */
let setTail: (() => void) | null = null

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

  /**
   * The trailing spacer's height — one card's worth, measured off the card.
   *
   * Every card but the last holds the frame for its own height plus the gap,
   * because that is how far it is to the next card's flow position. The last
   * has nothing behind it, so the spacer is what it holds against, and a
   * spacer that is not one card tall makes the deck's final beat the one beat
   * that is a different length from all the others.
   *
   * It was `calc(var(--hero) + 56px)` in CSS, which is the card's height in
   * exactly one of the three layouts it wears — the one where the shot is the
   * tallest thing in it. Below `deck` the card is a column and the shot is
   * about a third of it, so the same expression was short by ~300px and the
   * last card left the frame while the fifth was still arriving. There is no
   * expression that covers all three; a measurement covers all three by not
   * being an expression.
   *
   * On `refreshInit` rather than a ResizeObserver: ScrollTrigger fires it
   * immediately before it measures anything, so the height the deck's own
   * triggers are built against is always the one that is on the element. A
   * ResizeObserver would land on its own schedule and leave them a frame stale.
   */
  const tailCard = cardEls[cardEls.length - 1]
  setTail = () => {
    deckRef.value?.style.setProperty('--tail', `${Math.round(tailCard.offsetHeight)}px`)
  }
  setTail()
  ScrollTrigger.addEventListener('refreshInit', setTail)

  // One perch per card, gated on BALL_QUERY, which is the width the ball itself
  // is gated on — so the two can never disagree about whether the journey is
  // running. The deck stacks below that line too; it just does it without a
  // ball riding it, on nothing but `position: sticky`.
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
  if (setTail) ScrollTrigger.removeEventListener('refreshInit', setTail)
  holdMedia?.revert()
  deckMedia?.revert()
})
</script>

<template>
  <section id="work" ref="sectionRef" class="relative py-12 md:py-[120px]">
    <div ref="headBlockRef" class="relative z-10 mx-auto max-w-[1240px] bg-paper px-5 md:px-8">
      <div class="reveal mb-9 flex flex-wrap items-end justify-between gap-6 md:mb-11">
        <div>
          <span class="mb-3.5 block font-data text-[13px] tracking-wide md:text-accent-text text-steel/60">
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
      <!-- `mb-5` on a phone rather than the 80px this was. The rule inside is
           `hidden md:block`, so below md the margin was separating the heading
           from the deck across an element that isn't drawn — 80px of nothing on
           top of the row's own 36, which pushed the first card most of a
           thumbnail lower than it needed to sit. -->
      <div class="relative mb-5 md:mb-28">
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
      class="work-runway mx-auto max-w-[1240px] px-5 md:px-8 md:pt-0 pt-3"
      :style="{ '--runway': `${HOLD_SCROLL}px` }"
    >
      <div ref="deckRef" class="work-deck">
        <template v-for="(project, i) in cards" :key="project.title">
          <div v-if="i === cards.length - 1" data-stack-end aria-hidden="true" class="h-px w-full" />

          <!-- `--last` opts the final card out of the defocus. Every other card
               blurs because the next one is climbing over it; nothing climbs
               over this one, so the same rule would blur the card the reader is
               still looking at. See `work-card-defocus`. -->
          <article
            class="work-card rounded-[16px] bg-paper p-4 ring-1 ring-hair deck:rounded-[22px] deck:px-8 deck:py-7"
            :class="{ 'work-card--last': i === cards.length - 1 }"
            :style="{
              '--index': i,
              '--lean': i % 2 ? -1 : 1,
              '--dim-from': `${defocusRange(i)[0]}%`,
              '--dim-to': `${defocusRange(i)[1]}%`,
              zIndex: i + 1
            }"
          >
            <!-- Three layouts, not two.

                 At `xl` the card is a row of three: copy, shot, stack. Below
                 `deck` it is a single column with the shot on top. In between it
                 is two columns — copy over stack on the left, shot on the right.

                 `deck` is 900px rather than the 992 it was, and what the move
                 bought is the swipe rail below it going away — see
                 tailwind.config.ts. The column is not a fallback down there;
                 it is the better card, and `--shot-cap` is what keeps it short
                 enough to pin. -->
            <div class="work-card__grid grid grid-cols-1 items-center gap-3.5 deck:grid-cols-[minmax(0,1fr)_auto] deck:gap-7 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-8">
              <div class="reveal min-w-0 deck:self-end xl:max-w-[270px] xl:self-auto">
                <div class="flex items-center gap-2.5">
                  <span class="font-data text-[12px] text-steel">{{ String(i + 1).padStart(2, '0') }}</span>
                  <span class="font-data text-[10px] uppercase tracking-[0.18em] text-accent-text">
                    {{ project.brand }}
                  </span>
                </div>
                <h3 class="mt-2.5 font-display text-[19px] font-bold uppercase leading-tight tracking-tight deck:mt-3 deck:text-[21px] xl:text-[25px]">
                  {{ project.title }}
                </h3>
                <p class="mt-2.5 text-[13px] leading-relaxed text-steel deck:mt-3">{{ project.summary }}</p>
              </div>

              <!-- No `w-full`: below `deck` the box is sized from its height —
                   see `--shot-cap` — and a stretched grid item would override
                   that back to the container's width, which is the shape that
                   made the card too tall to pin in the first place. -->
              <figure
                class="work-hero order-first overflow-hidden rounded-[12px] bg-paper-soft deck:order-none deck:col-start-2 deck:row-span-2 deck:row-start-1 deck:aspect-[3/2] xl:col-start-auto xl:row-span-1"
              >
                <img
                  v-if="project.image"
                  :src="project.image"
                  :alt="`${project.brand} ${project.title} screenshot`"
                  loading="lazy"
                  class="h-full w-full object-cover object-top"
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
                   the card's height.

                   The `pt` is what separates the spec from the copy in one
                   column — a hairline rule did that job first, and it is out
                   because the card carries enough lines already: its own ring,
                   the shot's edge, the deck edges of the cards behind it. The
                   space says the same thing without adding a fourth. -->
              <div class="work-card__foot reveal min-w-0 pt-3.5 deck:pt-0 deck:col-start-1 deck:row-start-2 deck:self-start xl:col-start-auto xl:row-start-auto xl:max-w-[230px] xl:justify-self-end xl:self-auto xl:text-right">
                <!-- Label beside the value on a phone, above it from `deck` up.
                     Stacked, the label costs a 17px line to say what the mono
                     face and the `·` separators already say; inline it is a
                     data row, which is the voice the rest of the card is in.
                     Every stack string fits one line at 12px in the narrowest
                     card this reaches (310px inner at 390px of frame). -->
                <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 deck:block">
                  <span class="font-data text-[10px] uppercase tracking-[0.18em] text-steel">Stack</span>
                  <p class="font-data text-[12px] leading-relaxed text-ink deck:mt-1.5">{{ project.tech }}</p>
                </div>

                <!-- Unadorned, so the arrow is what marks it as a link. That
                     leaves it carried by something other than colour alone,
                     which is the bar an underline was clearing.

                     `active:` rather than only `hover:`: on the surface this is
                     now the primary presentation for, there is no hover, and a
                     44px row that does not acknowledge the tap reads as a dead
                     one for the length of the page load it kicks off. -->
                <a
                  v-if="project.link"
                  :href="project.link.url"
                  :title="project.link.url"
                  target="_blank"
                  rel="noopener"
                  class="mt-3 flex min-h-[44px] items-center gap-2 font-data text-[12px] text-ink no-underline transition-[color,opacity] duration-150 ease-out hover:text-ink/85 active:opacity-60 xl:mt-6 xl:min-h-0 xl:justify-end xl:pl-4"
                >
                  <span class="min-w-0 truncate">View</span>
                  <span class="shrink-0" aria-hidden="true">→</span>
                </a>
                <p v-else class="mt-3 font-data text-[12px] text-steel">Comming soon</p>
              </div>
            </div>
          </article>
        </template>

        <!-- Visible at every width now that the deck stacks at every width; it
             was `hidden deck:block` because below 992 there was a rail here and
             a full-width spacer would have been a seventh slide in it. -->
        <div aria-hidden="true" class="work-stack-tail" />
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

  /* How far each card sits below the one it covers, so a covered card keeps a
     visible edge. A variable rather than the literal it was, because it is
     spent out of the same budget the shot is — six cards is five of these off
     the height available to the front card — and on a phone that budget is
     tight enough that 50px of stagger is worth having back. See `--shot-cap`. */
  --step: 10px;

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

/* The narrow two-column deck — and the copy is what caps the shot here rather
   than the height.

   This band used to be a swipe rail; the card is the same two-column object it
   is at 992, just narrower. Running the 290px cap down here puts a 435px shot
   against a 205px column of text at 900 — three or four words a line, which is
   not a column of text, it is a stack of fragments. 200px puts the shot at 300
   and leaves the copy 410 at the narrow end and ~500 at the wide one.

   The height never binds: at 200px of shot the card is ~300px tall against a
   band of at most 140, so even a 1024-tall frame has 500px in hand. What binds
   is the measure, so the cap is a measure decision.

   `svh` from here down, not `vh`: on a phone `vh` is the *large* viewport — the
   height the frame has only once the browser chrome has retracted — so sizing a
   deck against it is sizing it against a frame the reader does not have yet, and
   the first card runs off the bottom for the whole of the first swipe. */
@media (min-width: 900px) and (max-width: 991px) {
  section {
    /* Clears the fixed nav (~84px at this width) with room over it. */
    --band: clamp(96px, 14svh, 140px);
    --step: 8px;
    --hero: max(150px, min(200px, calc(100svh - 2 * var(--band) - 120px)));
  }
}

/* The column deck — phones, and portrait tablets, which want the same card.

   Everything here exists to answer one question: is the card shorter than the
   frame minus the band? If it is, the deck stacks; if it is not, the last card
   never pins and the section falls apart. This was the question the swipe rail
   was standing in for. */
@media (max-width: 899px) {
  section {
    --band: clamp(88px, 15svh, 140px);
    --step: 6px;

    /* The shot's height budget: the frame, less the band it pins under, less
       everything else the card carries.

       380 is that "everything else", measured at 390px of frame: 317px of card
       — 14 grid gap, 167 of copy (meta 15, title two lines at 19px, summary
       four lines at 13px), 14 gap, 90 of foot (hairline, stack row, 44px link),
       32 of padding — plus the 30px of `--step` the sixth card sits down by,
       plus ~33 so the card clears the bottom edge rather than grazing it.

       It is spent through the *width* — see `.work-hero` — so that the shot
       shrinks proportionally when the cap bites rather than being squashed.
       Capping the height alone leaves a 3:2 screenshot in a 1.7:1 box, which
       `object-cover` resolves by cutting 13% off each side, and the sides of a
       screenshot of a website are the parts that say it is a website.

       The 150px floor is for landscape phones, where the arithmetic goes
       negative; below 500px of frame the deck unstacks anyway, so the floor is
       only guarding the invalid value, not proposing a usable layout. */
    --shot-cap: max(150px, calc(100svh - var(--band) - 380px));
  }

  /* A card is not a container. Left to fill the frame at the top of this
     range, a single-column card runs the summary to ~130 characters a line —
     nearly three times a comfortable measure, and the widest text on the page
     by a distance. 30rem holds it to ~74 and does nothing at all below 512px
     of frame, where the container is already narrower than the cap.

     It is also what makes the column the right card on a portrait tablet
     rather than merely a survivable one: 480px of card is 448 of shot, against
     the 300 the row's shot gets at the same width. */
  .work-card {
    max-width: 30rem;
    margin-inline: auto;
  }

  /* The height budget spent as a width, which is the only form of it that
     keeps the ratio.

     Written as `height: var(--shot-cap)` first, with `aspect-ratio` and
     `max-width: 100%` left to sort the rest out. They don't: `aspect-ratio`
     only ever derives the dimension you *didn't* state, so it set the width
     from the height, `max-width` then clamped that width, and the height it was
     derived from stayed exactly where it was. Measured at 390x844, that is a
     310x337 box holding a 3:2 shot — a 1.7:1 crop, 13% off each side.

     Stating the width instead leaves the height to be derived, so it is
     recomputed from whichever of the two limits binds. Above the cap the
     container wins and the shot is a full-bleed 3:2 block; under it the cap
     wins and the shot shrinks whole and centres. Either way it is 3:2. */
  .work-hero {
    width: min(100%, var(--shot-cap) * 1.5);
    aspect-ratio: 3 / 2;
    /* The figure is a grid item and would otherwise stretch, which overrules
       the width above and restores the full-bleed shot that made the card too
       tall to pin. */
    justify-self: center;
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

/* Cards pile into a deck, each offset `--step` below the one it covers so the
   covered cards keep a visible edge. Purely `position: sticky` — the
   compositor drives it, so it cannot stutter the way a scrubbed transform
   can, and it costs nothing on a phone, which is why this is now the
   presentation at every width. `--index` is set inline per card.

   The scroll cost of one card in the deck is its own height plus this gap, so
   the gap is the cheap knob for pacing the deck: it shortens the hand-off
   without touching the card's proportions. Kept just wide enough that a card
   fully clears the blur band before the next one starts covering it — drop it
   much further and the two events overlap, which reads as a skip. */
.work-card {
  position: sticky;
  top: calc(var(--band) + var(--index) * var(--step));
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
   Only applies where the card is a horizontal row — below `deck` the card is a
   column and the shot is sized from `--shot-cap` instead, which is why this is
   a media query and not a plain rule. Kept in step with the `deck` screen in
   tailwind.config.ts. */
@media (min-width: 900px) {
  .work-hero {
    height: var(--hero);
  }
}

/* Trailing room so the final card actually gets to pin. A sticky element can
   only travel inside its containing block, so when the container ended at the
   last card's bottom edge that card reached its offset and immediately kept
   scrolling — every other card holds while the next one covers it, and the
   rhythm broke at the end. Height matches one card, which is exactly the
   scroll distance the other cards each hold for.

   `--tail` is measured off the last card in script — see `setTail`. The
   fallback is only what stands here between SSR and hydration, so it is a
   round number rather than a derivation: the expression that used to live here
   was `--hero + 56px`, which is the card's height in one of its three layouts
   and short by ~300px in the one this section now spends most of its traffic
   in. */
.work-stack-tail {
  height: var(--tail, 60svh);
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

/* The card arrives askew and straightens as it lands, so it reads as a sheet
   being laid onto the deck rather than a panel sliding up a track.

   Driven by `animation-timeline: view()` rather than by a scrubbed GSAP
   tween, and the reason is the same one that made the deck sticky in the
   first place — see `.work-card`. A view timeline runs on the compositor, so
   this costs a phone nothing during the one scroll on the page that already
   has six sticky cards and a tint band on it. A scrubbed transform would put
   a write on the main thread on every frame of that scroll, which is the
   trade the whole section was built to avoid.

   Wrapped in `@supports` for the same reason it is worth doing at all: where
   the timeline doesn't exist the rule is simply absent and the deck is the
   flat deck it is today. Nothing downstream reads the rotation, so there is
   nothing to strand.

   `entry 12%` to `entry 92%` is the window the card is *coming in* over: from
   just after its top edge clears the bottom of the frame to just before it is
   fully in view. It is straight well before it reaches its sticky offset, so
   a card is never tilted while it is the one being read.

   A tilt in depth, not a rotation in the plane. The first pass was
   `rotate()` — the card arrived cocked a degree off square, which is a
   crooked card rather than a card at an angle to you, and it is the one thing
   this is explicitly not meant to look like. `rotateX`/`rotateY` under a
   `perspective()` puts the card on a plane in space instead: the edge that is
   further away is drawn shorter, so the card reads as leaning back rather than
   as hung badly. Every edge stays square to every other one the whole way in.

   `--depth` is per-element, inside the transform, rather than a `perspective`
   property on the deck. The property version would apply one shared vanishing
   point to all six cards — right for a diorama, wrong here, since a card
   further down the deck would lean harder than one near the top for no reason
   the reader can see. It would also make the deck a containing block, which is
   not a thing to do casually to a stack of sticky elements.

   `--lean` alternates which side recedes, set inline from the index — parity
   can't be read off `:nth-child` here because the deck also carries the
   stack-end sentinel and the trailing spacer. Alternating is the other half of
   keeping the deck flat overall: six cards leaning the same way accumulate into
   a column that is visibly off-square, where alternating cancels and leaves
   only the movement.

   Below 1024 only, which is exactly where the ball isn't. The perches measure
   a card's top edge to stand the ball on it, and `getBoundingClientRect` on a
   transformed element returns the axis-aligned box. The timing works out (the
   card is flat before its perch window opens) but "works out" is not a thing to
   build a measured rig on. */
@media (max-width: 1023px) {
  @supports (animation-timeline: view()) {
    .work-card {
      /* The tip back, which is the one doing the work: at this depth the top
         edge is drawn ~4% narrower than the bottom, which is plainly a lean
         and still leaves the card square. */
      --tilt-x: 5deg;
      /* And a little across, so it isn't a perfectly symmetrical hinge. Small,
         because this is the axis that skews text most on the way in. */
      --tilt-y: 2deg;
      /* Long rather than short. Under ~600px the foreshortening stops reading
         as a lean and starts reading as a fisheye, and the copy goes with it. */
      --depth: 1000px;
      /* Bottom-centre, so the card hinges up off the edge it arrives on and
         looks set down rather than pivoted about its middle. */
      transform-origin: 50% 100%;
      /* How soft a card gets once it is all the way under the next one. */
      --defocus: 5px;
      animation-name: work-card-settle, work-card-defocus;
      /* `auto` — the timeline's range is the duration. The `animation`
         shorthand can't say this: it resets duration to 0s, which is a
         scroll-driven animation that never advances. */
      animation-duration: auto, auto;
      animation-timing-function: linear, linear;
      /* `backwards`, not `both`. `both` holds the last keyframe forever, and
         the last keyframe is still a 3D transform — which keeps every settled
         card on its own composited layer and drops its text from subpixel to
         greyscale antialiasing for the rest of the page's life. Past the range
         `backwards` applies nothing at all, so a landed card is an ordinary
         untransformed box and its copy is rendered the way the rest of the
         page's copy is. The `from` half still covers the card before it
         enters.

         `forwards` for the defocus, and the asymmetry is the point: before its
         range a card carries no `filter` at all — not even `blur(0px)`, which
         would still cost every card a filter pass and a layer for the whole
         page — and after it, the blur persists, which is correct, because a
         card that has been covered stays covered. */
      animation-fill-mode: backwards, forwards;
      animation-timeline: view(), view();
      /* The defocus window is per card and comes in from script — see DEFOCUS
         in <script setup>, and `work-card-defocus` below for why one shared
         pair of percentages cannot say this. */
      animation-range:
        entry 12% entry 92%,
        cover var(--dim-from) cover var(--dim-to);
    }

    /* Nothing climbs over the last card, so it keeps only the settle. Dropping
       it from the name list is what switches the defocus off — the longhands
       below still list two values and the extra is simply unused. */
    .work-card--last {
      animation-name: work-card-settle;
    }
  }

  /* Linear, not eased: the scrubbed clock is the reader's own scroll, and an
     ease on top of it is a second opinion about how fast they are moving.

     Both keyframes carry the same function list in the same order, so the
     interpolation runs per function — `perspective` to `perspective`, each
     rotation to its own zero. Written as a single `from` against the element's
     underlying `none`, it would have had to go through matrix decomposition,
     and the identity for `perspective()` is an infinite one. */
  @keyframes work-card-settle {
    from {
      transform: perspective(var(--depth)) rotateX(var(--tilt-x))
        rotateY(calc(var(--tilt-y) * var(--lean)));
    }
    to {
      transform: perspective(var(--depth)) rotateX(0deg) rotateY(0deg);
    }
  }

  /* The card behind goes out of focus as the one in front climbs over it, so
     the deck reads as depth rather than as sheets of paper at the same
     distance.

     The window comes from DEFOCUS in <script setup>, one pair per card, and it
     has to be per card because the obvious derivation is wrong twice over.

     A `view()` range looks like it should be the frame plus the element — 844
     + 502 = 1346px on a 390x844 phone — and for a card in normal flow it is.
     For a *sticky* one the range also swallows the whole distance the card
     spends stuck: card 1's measured range is 4343px, the extra 2997 being its
     own travel down the deck. So cover% here is mostly a statement about how
     long a card holds the frame, and every card holds it for a different
     length. The same physical moment therefore sits at a different percentage
     on each card's clock. See the table for what that costs.

     The other half of it is subtler: a `view()` timeline on a stuck element
     keeps advancing while the element sits still. Measured, a stuck card stays
     frozen at rectTop 127 while its progress climbs 0.23, 0.26, 0.30. That is
     the only reason this is expressible at all — it means a covered card can be
     driven off its own timeline. The reading that first suggests itself, "blur
     when the *next* card arrives", wants the next card's timeline, and CSS
     cannot reach it: a named timeline is visible to an element's descendants
     and its following siblings, and the card that needs it is the preceding
     one. Hoisting six names through `timeline-scope` would work, and is a lot
     of machinery for a defocus.

     The cost is real and worth stating: `filter` is a repaint, not a
     composite, so unlike the tilt this cannot ride the compositor. What keeps
     it cheap is that only one card is ever mid-ramp — the ones already under
     the deck hold a constant blur, and a constant filter is rasterised once and
     cached. */
  @keyframes work-card-defocus {
    from {
      filter: blur(0px);
    }
    to {
      filter: blur(var(--defocus));
    }
  }

  /* Decoration, and the only thing here that is. Turning it off leaves a flat
     deck and strands nothing — unlike the ball's timeline, which is why that
     one is gated on width and not on this. */
  @media (prefers-reduced-motion: reduce) {
    .work-card {
      animation-name: none;
    }
  }
}

/* The band below `deck` is the tint on its own.

   The blur is three stacked `backdrop-filter` layers re-sampling everything
   behind them every frame, and a phone scrolling a deck of six sticky cards is
   already the most expensive thing this page does on the weakest hardware it
   runs on. The tint is a static gradient and costs nothing, and it is the layer
   doing the actual work anyway: what makes a card read as *surfacing* is that
   the paper closes over it, not that it goes soft on the way down. */
@media (max-width: 991px) {
  .work-fade__blur {
    display: none;
  }
}

/* The two frames with no card in them, where the deck gives up and is a list.

   Everything above sizes the card against the frame. These are the two shapes
   where no size works, and a deck whose cards are taller than the frame is
   worse than no deck — the front card never fully arrives, so every card is
   cut off at the same place and the stacking reads as breakage.

   Under ~500px of height (landscape phones): the band alone is a fifth of the
   screen, and the card still has a shot, a title, a summary and a 44px target
   to fit under it.

   Under 360px of width: here it is the *copy* that doesn't fit, which is why
   there is no height that rescues it. At 320px of frame the measure is 240px,
   the summary wraps to eight lines and the title to three, and the card is
   492px tall with the shot already on its 150px floor — 42px past a 568px
   frame with the shot contributing nothing more to give. Measured on a
   320x568.

   Width-gated at 1023 on the first of them so it can never reach the ball: the
   deck's perches are registered under BALL_QUERY (min-width: 1024px), and
   unstacking underneath them would leave the timeline placing a ball on cards
   that no longer hold. The second needs no such gate — it is already narrower
   than anything the ball runs on. */
@media (max-width: 1023px) and (max-height: 500px), (max-width: 359px) {
  .work-card {
    position: static;
    margin-bottom: 1.5rem;
    /* Nothing to lift off once they are a list rather than a stack, so only
       the ambient half of the deck's shadow — the half that has to carry it on
       its own. */
    box-shadow:
      0 4px 18px -6px rgba(18, 18, 18, 0.1),
      0 1px 4px -1px rgba(18, 18, 18, 0.06);
  }

  .work-stack-tail,
  .work-fade {
    display: none;
  }
}

/* Two `prefers-reduced-motion: reduce` blocks used to sit here: one unwinding
   the deck back to a stacked list above lg, one killing the peek card's fade
   ramp below it. Both are gone with the gate — see BALL_QUERY in
   composables/useScrollBall.ts. The deck is driven by BALL_QUERY, which is now
   width-only, so unwinding it on a preference would strand the cards the
   timeline is still placing.

   Nothing new is owed to the preference by the deck reaching phones, either.
   A sticky card does not animate; it is where it is, and scrolling is what
   moves the page past it. */
</style>
