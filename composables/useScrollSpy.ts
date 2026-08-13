/**
 * How far down the frame a section has to reach before the nav calls it the
 * one you are reading, as a fraction of viewport height.
 *
 * Under the nav rather than level with it. At 0 a section would take the nav
 * the instant its first pixel appeared, which on a tall section means the link
 * lights while the previous section still fills the screen. At 0.3 the
 * handover happens once the incoming section owns the top third, which is
 * about when a reader would say they had arrived. It clears both navs by a
 * wide margin — the bar is ~88px at md and ~72px below it, against 192px on a
 * 640px-tall phone — so the line is never behind the thing it is measuring.
 */
const PROBE = 0.3

/**
 * Which of the given sections currently holds the top of the frame, as its
 * element id, or null when none of them does.
 *
 * The rule is one line: of the sections listed, the last one whose top has
 * crossed the probe line wins. Both of the behaviours the nav wants fall out
 * of it rather than being handled — above the first section nothing has
 * crossed, so nothing is lit through the hero; and a stretch of page with no
 * id of its own resets nothing, so Education and Languages leaves Skills lit
 * on its way past instead of blinking the nav off and on again.
 *
 * Live rects on a rAF, rather than ScrollTrigger triggers or an
 * IntersectionObserver band, and that choice is the reason this is a file of
 * its own rather than a few lines in TheNav. This page pins: GSAP parks the
 * experience chart and the work deck at `position: fixed` and leaves a
 * pin-spacer holding their place in the document. A pinned section's rect
 * therefore sits still above the probe for as long as the pin lasts, which is
 * exactly the answer the nav wants, and it is true without anyone arranging
 * for it. Declared start/end positions are not: they are computed against a
 * document whose height the pins themselves change, so a spy built on them
 * would have to be refreshed in the right order relative to every other
 * trigger on the page. Reading the rect asks the browser where the section is
 * now, and the answer cannot go stale.
 *
 * @param ids Section element ids, in document order. Order is the input, not
 *            something this derives — a section that is pinned reports a rect
 *            that no longer sorts against its neighbours'.
 */
export function useScrollSpy(ids: string[]) {
  const active = ref<string | null>(null)

  let targets: { id: string; el: HTMLElement }[] = []
  let frame = 0

  function measure() {
    targets = ids
      .map((id) => ({ id, el: document.getElementById(id) }))
      .filter((t): t is { id: string; el: HTMLElement } => !!t.el)
  }

  function read() {
    frame = 0
    if (!targets.length) return

    // The footer is shorter than the viewport, so once the page bottoms out
    // its top stops descending — several hundred px short of the probe on a
    // desktop frame. Left to the rule above, the last link would be the one
    // link that never lights. Nothing can follow the end of the document, so
    // at the end of the document the last section is the answer.
    const bottom =
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2

    if (bottom) {
      active.value = targets[targets.length - 1].id
      return
    }

    const line = window.innerHeight * PROBE

    let current: string | null = null
    for (const t of targets) {
      if (t.el.getBoundingClientRect().top <= line) current = t.id
    }

    active.value = current
  }

  // Coalesced onto a frame: scroll fires far more often than the nav can
  // change, and four rect reads per frame is cheap enough to leave the
  // measurement exact rather than sampled.
  function schedule() {
    if (frame) return
    frame = requestAnimationFrame(read)
  }

  function onResize() {
    measure()
    schedule()
  }

  onMounted(() => {
    measure()
    // Read once before any scrolling happens, so a page opened deep — a
    // reload part-way down, or an inbound #skills link — starts on the right
    // link instead of waiting for the reader to move.
    read()

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', onResize)
    if (frame) cancelAnimationFrame(frame)
  })

  return { active }
}
