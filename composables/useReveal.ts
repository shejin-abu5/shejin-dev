import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

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

  // Bail before the hidden state is written, not after — a reduced-motion
  // user who never reaches the trigger would otherwise be left staring at
  // opacity 0. The card stack has the matching opt-out in CSS.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  gsap.set(els, { opacity: 0, y: 46, willChange: 'transform, opacity' })

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
        duration: 1.3,
        ease: 'expo.out',
        stagger: 0.09,
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
