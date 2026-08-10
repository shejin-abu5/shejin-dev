import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * True when the visitor has asked their OS to minimise animation. Read at call
 * time rather than cached at module load, so a setting flipped mid-session is
 * picked up by whatever runs next.
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Applies a fade + slide-up reveal to every element matching `selector`
 * within `root`, triggered as each one scrolls into view.
 * No-ops during SSR; call from onMounted (client-only) in components.
 *
 * `start` is a ScrollTrigger start string. Sections that cover their own
 * lower viewport (the work deck's blur band) pass a higher trigger line so
 * the fly-in isn't spent behind something opaque.
 */
export function useReveal(
  root: HTMLElement | null,
  selector = '.reveal',
  start = 'top 88%'
) {
  if (!root || !import.meta.client) return

  const els = root.querySelectorAll<HTMLElement>(selector)
  if (!els.length) return

  // Reduce is not remove. What the setting exists to stop is travel — things
  // crossing the screen, parallax, anything that moves the ground under a
  // reader who is sensitive to it — and a change in opacity is none of that.
  // So the reduced path keeps the fade and drops the 46px rise, the stagger,
  // and most of the duration.
  //
  // This used to bail outright, which meant every section below the fold sat
  // inert: correct by the letter of the setting, but the page read as broken
  // rather than as calm, and that is what it looked like to anyone running
  // macOS "Reduce motion". The pinned reads — the ball's journey, the
  // experience chart, the work deck — stay off entirely; those are travel by
  // definition and have their own static layouts in CSS.
  const reduced = prefersReducedMotion()

  gsap.set(els, {
    opacity: 0,
    y: reduced ? 0 : 46,
    willChange: reduced ? 'opacity' : 'transform, opacity'
  })

  // `batch` rather than one trigger per element: neighbours that cross the
  // line together are animated as one group, which is the only way to stagger
  // them. Independent triggers fire simultaneously for anything sharing a row
  // (the work card's two rails, the skills grid) and land as a slab.
  ScrollTrigger.batch(Array.from(els), {
    start,
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        // expo.out covers most of the distance up front and spends the rest
        // of the duration easing to a stop, so the travel can be long without
        // feeling slow — it glides in and settles rather than sliding and
        // halting. That long tail is what reads as "smooth"; cutting the
        // duration back to match the perceived motion is what kills it.
        //
        // None of which applies with no distance to cover: a 1.3s fade in
        // place is just slow. The reduced path wants to be over quickly.
        duration: reduced ? 0.35 : 1.3,
        ease: reduced ? 'power1.out' : 'expo.out',
        // A stagger is a wave travelling down the page — the group lands
        // together rather than in sequence when motion is being reduced.
        stagger: reduced ? 0 : 0.09,
        // Hand the layer back once it has landed — leaving will-change on
        // pins every revealed element to its own layer, and this section's
        // cards already sit under three backdrop-filters.
        clearProps: 'willChange'
      })
  })
}

/**
 * Animates a numeric count-up from 0 to `target` once the element
 * scrolls into view, appending a "+" suffix.
 */
export function useCountUp(el: HTMLElement | null, target: number) {
  if (!el || !import.meta.client) return

  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => {
      const obj = { val: 0 }
      gsap.to(obj, {
        val: target,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = `${Math.round(obj.val)}+`
        }
      })
    }
  })
}
