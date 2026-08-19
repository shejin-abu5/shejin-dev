/**
 * Send one custom event to Umami.
 *
 * Named as a plain function rather than `useTrack`, and that is deliberate
 * rather than a slip against the `useX` files beside it. Those hold reactive
 * state and lifecycle hooks and have to be called from `setup`; this holds
 * neither and can be called from anywhere, including a click handler halfway
 * down a template. Dressing it as a composable would imply a binding contract
 * it does not have. Nuxt auto-imports every named export under `composables/`,
 * so the call site is `track('cv-download')` with no import either way.
 *
 * ## Why every call is guarded
 *
 * `window.umami` being missing is the ordinary case, not the exotic one. The
 * script is a third-party analytics beacon on a public domain, which is the
 * exact fingerprint every content blocker ships a rule for — a meaningful
 * share of this site's audience is developers, who block it at a much higher
 * rate than the general web. It is also absent for the ordinary reasons: the
 * tag is `defer`, so a visitor who lands on the footer and clicks Download CV
 * before the parser gets there finds nothing on `window` yet, and
 * `data-domains` pins delivery to shejinabu.com, so on the dev server the
 * global exists but stays quiet.
 *
 * All of which is fine — analytics is allowed to miss. What is not allowed is
 * a portfolio's primary call to action throwing because a beacon did not
 * load. So the optional chain covers the global being absent, and the
 * try/catch covers it being present and unhappy; between them there is no
 * arrangement of a blocker, a slow network, or a bad script version that can
 * turn "the numbers are wrong" into "the CV button is dead".
 *
 * @param event Event name, kebab-case, matching the names in Umami's dashboard.
 * @param data  Optional properties. Keep them low-cardinality — these become
 *              breakdown rows, and a unique value per visitor makes a list
 *              nobody can read.
 */
export function track(event: string, data?: Record<string, unknown>) {
  // Reachable during SSR only if a call ever moves out of an event handler,
  // but this is what makes the function safe to call from anywhere without
  // the caller having to know that.
  if (import.meta.server) return

  try {
    window.umami?.track(event, data)
  } catch {
    // Swallowed on purpose. See above: a failed measurement must never be
    // visible to the person being measured.
  }
}

declare global {
  interface Window {
    /**
     * Installed by the Umami tag in `nuxt.config.ts`. Optional because it is
     * genuinely often not there — see the note above.
     */
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void
    }
  }
}
