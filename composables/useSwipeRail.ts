/**
 * Below this width Projects and Experience present as swipe rails. It is the
 * same line as BALL_QUERY in useScrollBall.ts and as the `max-width: 1023px`
 * blocks in main.css and both section stylesheets — the rail exists exactly
 * where the ball, the deck and the chart don't, so the two must never
 * disagree about which presentation is running.
 */
export const RAIL_QUERY = '(max-width: 1023px)'

/**
 * Tracks which slide of a scroll-snap rail currently holds the frame, and
 * scrolls to a given one.
 *
 * The rail itself is CSS — see `.swipe-rail` in assets/css/main.css. This only
 * supplies the active index the dots need, and it does that with an
 * IntersectionObserver rather than a scroll handler: the observer reports on
 * the compositor's terms, so it cannot be made to jitter by a fast fling the
 * way a scroll listener sampling `scrollLeft` can.
 *
 * `count` stays with the caller, which already has the array — deriving it
 * from the DOM would make the dots depend on a mounted measurement and render
 * nothing during SSR.
 *
 * @param railFn        Resolves the scroll container.
 * @param slideSelector Matches the slides *within* it. Explicit because both
 *                      rails carry non-slide children — the work deck's
 *                      sentinel and its trailing spacer.
 */
export function useSwipeRail(
  railFn: () => HTMLElement | null,
  slideSelector: string
) {
  const active = ref(0)
  /** Whether the rail presentation is the one currently running. Drives the
      ARIA that would otherwise describe a plain list as a carousel. */
  const isRail = ref(false)

  let io: IntersectionObserver | null = null
  let mql: MediaQueryList | null = null
  let slides: HTMLElement[] = []

  // Ratio per slide rather than "whichever entry arrived last": a fast swipe
  // reports several slides in one callback, and the last of them is not
  // necessarily the one on screen.
  const ratios = new Map<Element, number>()

  function attach() {
    const rail = railFn()
    if (!rail || io) return

    slides = Array.from(rail.querySelectorAll<HTMLElement>(slideSelector))
    if (!slides.length) return

    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio)

        let best = -1
        let bestIndex = active.value
        slides.forEach((slide, i) => {
          const ratio = ratios.get(slide) ?? 0
          if (ratio > best) {
            best = ratio
            bestIndex = i
          }
        })
        active.value = bestIndex
      },
      // Stepped rather than a single threshold: with one crossing point the
      // observer goes quiet mid-swipe and the dot lags the card by most of
      // the gesture.
      { root: rail, threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    for (const slide of slides) io.observe(slide)
  }

  function detach() {
    io?.disconnect()
    io = null
    ratios.clear()
    slides = []
    active.value = 0
  }

  function goTo(index: number) {
    const rail = railFn()
    if (!rail || !slides.length) return

    const i = Math.max(0, Math.min(index, slides.length - 1))

    // Measured against the first slide rather than from the rail's padding
    // edge: at scrollLeft 0 slide 0 already sits on the snap line, so the
    // difference between the two offsets *is* the scroll distance. Reading
    // the padding back off the computed style would say the same thing and
    // depend on how the browser resolves offsetLeft for a scroll container.
    const left = slides[i].offsetLeft - slides[0].offsetLeft

    // Always smooth — see BALL_QUERY in composables/useScrollBall.ts for why
    // the reduced-motion branch that used to pick 'auto' here is gone.
    rail.scrollTo({ left, behavior: 'smooth' })
  }

  function onQueryChange(event: MediaQueryList | MediaQueryListEvent) {
    isRail.value = event.matches
    if (event.matches) attach()
    else detach()
  }

  onMounted(() => {
    mql = window.matchMedia(RAIL_QUERY)
    onQueryChange(mql)
    mql.addEventListener('change', onQueryChange)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', onQueryChange)
    detach()
  })

  return { active, isRail, goTo }
}
