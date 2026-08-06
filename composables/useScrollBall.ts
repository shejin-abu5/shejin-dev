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
  inset?: number
  side?: boolean
}): () => void {
  const perch: Perch = {
    surface: spec.surface,
    range: spec.range,
    from: asFn(spec.from, 0),
    to: asFn(spec.to, 1),
    progress: spec.progress,
    inset: spec.inset ?? 14,
    side: spec.side ?? false
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
    inset?: number
    side?: boolean
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
        inset: opts.inset,
        side: opts.side
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
