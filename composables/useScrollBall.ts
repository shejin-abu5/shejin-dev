import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Where the ball exists at all. Sections gate their perch registration on the
 * same query the ball component gates itself on, so the two can never disagree
 * about whether the journey is running.
 */
export const BALL_QUERY = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)'

export interface Perch {
  /**
   * The surface the ball rides, resolved on every frame rather than captured.
   * That is what lets pinned, sticky and scrubbed sections work here with no
   * special handling: whatever the element's on-screen rect is at that moment
   * *is* the surface. The ball is position:fixed, so a viewport rect is
   * already in its own coordinate space.
   */
  surface: () => HTMLElement | null
  /**
   * Absolute document scroll positions, [enter, exit] — the stretch of scroll
   * during which the ball is on this perch. Read live, because ScrollTrigger
   * recomputes its own start/end on every refresh.
   */
  range: () => [number, number]
  /**
   * Entry and exit points along the surface, 0–1 of its inset width. Resolved
   * live: the chart's landing points are measured from card geometry that
   * changes with the viewport, so a value captured at registration would be
   * wrong after the first resize.
   */
  from: () => number
  to: () => number
  /**
   * How far along this perch the ball is, 0–1, when the section can answer
   * that better than a scroll lookup can.
   *
   * A section that scrubs its own timeline moves its surfaces on that
   * timeline's clock. The ball has a clock of its own — smoothed scroll — and
   * two different smoothings of the same scroll do not agree: measured against
   * the experience chart the ball sat 117px of scroll behind the page going
   * down and 117px ahead coming up, so at one scroll position it was ~98px
   * further along a card scrolling up than scrolling down. Under a steady
   * scroll that is a constant offset nobody sees. On a reversal both lags flip
   * sign at once, and the swing is most of a short card's whole window.
   *
   * So where a section owns the clock, it hands the ball that clock instead.
   * The ball then cannot be anywhere the surface is not, at any scroll speed,
   * in either direction. Values outside 0–1 are clamped, so a section may
   * return raw progress without checking whether the ball has arrived yet.
   *
   * Omit it and the ball falls back to its own clock against `range()`, which
   * is right for a surface that just sits in the page.
   */
  progress?: () => number
  /**
   * Where the ball leaves this perch, as an absolute viewport x, for a surface
   * whose shape is driven by its section's own timeline.
   *
   * `to` is a fraction of the surface's live rect, which is the right answer
   * for a surface that has one shape. A chart card does not: it opens as the
   * ball arrives and closes as the ball leaves, so a fraction of its live rect
   * is a moving point, and the hop off the end of it launches from wherever
   * that card happened to be at the moment the hop began. Downwards that is a
   * card still fully open and the answer is right; upwards the same hop is
   * entered off a card that has already closed, and the launch point is the
   * collapsed bar's right edge — measured at 651px against the open card's
   * 992px, so the ball spent the hop drifting towards a point a third of the
   * frame from where it belonged, then snapped when it landed.
   *
   * A section that animates its surfaces knows where the open one ends
   * regardless of what it is currently drawing. Where it says so here, the ball
   * uses it and the hop launches from the same place in both directions.
   */
  exitX?: () => number
  /**
   * Where the ball leaves this perch, as an absolute viewport y, for a surface
   * that is pinned while the ball is on it.
   *
   * The vertical counterpart of `exitX`, and it exists for the mirror-image
   * reason. A fall reads both its endpoints live, which is what keeps short
   * hops continuous while the surfaces underneath them are still settling — a
   * surface in normal flow rises at the page's own speed, the target rises with
   * it, and the arc between them is unaffected.
   *
   * A pinned surface does not. It holds still for as long as its section is
   * pinned and then leaves at full scroll speed, and a fall long enough to
   * outlast the pin is anchored to a departure point that is accelerating away
   * upwards. Measured on the hero: the headline unpins 437px into a 1404px
   * fall, and from there the live origin dragged the ball 118px back *up* the
   * frame before the k² term grew enough to overcome it — a hop that visibly
   * reverses direction in mid-air. It is the same failure the skills rail
   * escapes by going sideways, at a scale small enough to look like a wobble
   * rather than a bug.
   *
   * A pinned section knows the height it holds the ball at regardless of where
   * the page has scrolled to, because that height is measured against its own
   * pinned frame rather than against the viewport. Where it says so here, the
   * fall launches from one fixed point and the arc is monotone in both
   * directions — which capturing the live value on entry could never be, since
   * a fall entered from below is entered at k≈1, long after the surface has
   * gone.
   *
   * Omit it for a surface that travels with the page, which is the normal case
   * and already correct read live.
   */
  exitY?: () => number
  /**
   * `exitY` for a surface that travels with the page: hold the fall's launch
   * height, but let the ball work out what it was rather than stating it.
   *
   * Same problem, opposite surface. A fall reads its origin live, and until
   * k = span / 2Δ the k² term is growing more slowly than that origin is
   * climbing, so the ball rises before it falls. Below a viewport of span that
   * is a few dozen px and reads as follow-through; past it, it is most of the
   * arc. The fall onto the footer at a 720px span rose 260px before it began
   * to descend at all, which is why lengthening that fall did almost nothing
   * for the landing — every extra px of scroll went into a taller lob and the
   * descent stayed squeezed into the end.
   *
   * A surface in normal flow has moved exactly as far as the page has, so the
   * height it handed the ball over at is recoverable from how far into the fall
   * the ball is. Nothing is captured, so it is the same value going up as going
   * down. Set it on a perch whose next hop is long enough to matter; `exitY`
   * takes precedence where a section states one.
   */
  holdExit?: boolean
  /** Px pulled in from each end, so the ball can sit clear of a rounded corner. */
  inset: number
  /**
   * Leave this perch sideways, off the edge of the frame, and come back in
   * from the other side at the next one — instead of arcing between the two.
   *
   * For perches whose next neighbour is a long way down the page with
   * something in between the ball has no business crossing. The work deck is
   * the case: an arc from the section heading to the experience chart passes
   * straight over five project cards.
   */
  side: boolean
  /**
   * Least fall between this perch's exit and the next perch's entry, as a
   * fraction of viewport height. Null takes the ball's own default.
   *
   * A fall wants to be as long as the hop is big, and hops are not all the
   * same size. Crossing from one section to the next is most of a screen and
   * needs room; stepping from one card in a row to the card beside it is a
   * couple of hundred pixels and does not. One global figure has to be sized
   * for the crossing, and spending that on every step is how the tail of the
   * page ran out of scroll: Education and Languages sit in a section barely
   * half a viewport tall, and two crossing-sized falls plus two rolls wanted
   * more than twice the scroll that section has.
   *
   * Set it where a section knows its next hop is a short one. The section
   * cannot see its neighbour, but it can see how far the ball has to go.
   */
  fall: number | null
  /**
   * The ball's resting place: it lands here and hops on the spot for as long
   * as the page stays put, instead of rolling on and falling out of frame.
   *
   * Only the last perch has any business setting this. It is the answer to
   * "the page has run out, so what does the ball do now" — anywhere else it
   * would simply strand the ball mid-journey.
   *
   * A resting perch does not roll, so `from`/`to` should be the same value:
   * the point along the surface the ball bounces on.
   */
  bounce: boolean
}

type Fraction = number | (() => number)

const asFn = (v: Fraction | undefined, fallback: number) =>
  typeof v === 'function' ? v : () => v ?? fallback

interface Registry {
  list: Perch[]
  /** Set whenever the list changes, so the consumer knows to re-sort. */
  dirty: boolean
}

// Module-level rather than provide/inject: there is exactly one ball, the
// sections that feed it are scattered across the page, and none of them are
// its ancestors.
export const ballPerches: Registry = { list: [], dirty: true }

export function registerPerch(spec: {
  surface: () => HTMLElement | null
  range: () => [number, number]
  from?: Fraction
  to?: Fraction
  progress?: () => number
  exitX?: () => number
  exitY?: () => number
  holdExit?: boolean
  inset?: number
  side?: boolean
  fall?: number
  bounce?: boolean
}): () => void {
  const perch: Perch = {
    surface: spec.surface,
    range: spec.range,
    from: asFn(spec.from, 0),
    to: asFn(spec.to, 1),
    progress: spec.progress,
    exitX: spec.exitX,
    exitY: spec.exitY,
    holdExit: spec.holdExit ?? false,
    inset: spec.inset ?? 14,
    side: spec.side ?? false,
    fall: spec.fall ?? null,
    bounce: spec.bounce ?? false
  }

  ballPerches.list.push(perch)
  ballPerches.dirty = true

  return () => {
    const i = ballPerches.list.indexOf(perch)
    if (i >= 0) ballPerches.list.splice(i, 1)
    ballPerches.dirty = true
  }
}

/**
 * Declares one surface in a section as somewhere the ball can land, using the
 * same trigger/start/end vocabulary as the rest of the site.
 *
 * Sections that already own a scrubbed timeline (the experience chart) should
 * call `registerPerch` directly instead and derive `range` from their own
 * geometry, so the perch windows stay in step with what that timeline is doing.
 */
export function useBallPerch(
  surface: () => HTMLElement | null,
  opts: {
    trigger: () => Element | null | undefined
    start?: string | number | (() => string | number)
    /**
     * Functions are passed straight through to ScrollTrigger, which re-invokes
     * them on refresh — the way to express "end this many pixels after the
     * start" without it going stale on resize.
     */
    end?: string | number | (() => string | number)
    from?: Fraction
    to?: Fraction
    exitX?: () => number
    exitY?: () => number
    holdExit?: boolean
    inset?: number
    side?: boolean
    fall?: number
    bounce?: boolean
  }
) {
  if (!import.meta.client) return

  let mm: ReturnType<typeof gsap.matchMedia> | null = null

  onMounted(() => {
    mm = gsap.matchMedia()

    mm.add(BALL_QUERY, () => {
      const trigger = opts.trigger()
      if (!trigger || !surface()) return

      // Created for its geometry alone — no animation, no callbacks.
      // ScrollTrigger resolves start/end strings against the live layout and
      // keeps them correct through pins, resizes and refreshes, which is
      // exactly the arithmetic this would otherwise have to repeat by hand.
      const st = ScrollTrigger.create({
        trigger,
        start: opts.start ?? 'top 72%',
        end: opts.end ?? 'bottom 45%'
      })

      const off = registerPerch({
        surface,
        range: () => [st.start, st.end],
        from: opts.from,
        to: opts.to,
        exitX: opts.exitX,
        exitY: opts.exitY,
        holdExit: opts.holdExit,
        inset: opts.inset,
        side: opts.side,
        fall: opts.fall,
        bounce: opts.bounce
      })

      return () => {
        off()
        st.kill()
      }
    })
  })

  onBeforeUnmount(() => {
    mm?.revert()
  })
}
