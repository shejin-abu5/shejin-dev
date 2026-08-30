/**
 * The signal that the loader has lifted.
 *
 * It exists because a full-screen loader and a mount-triggered intro are the
 * same bug waiting to happen: HeroSection builds its headline timeline in
 * `onMounted` and plays it immediately, the loader covers the viewport for the
 * best part of two seconds, and the rise everyone is meant to see happens
 * behind it. The page would arrive already finished.
 *
 * So the intro is built paused and hung off this instead. Anything else on the
 * page that opens on a clock rather than on scroll belongs here too — scroll-
 * driven work does not, because the reader cannot scroll past a loader.
 *
 * A plain module object rather than a ref or provide/inject, matching
 * `ballEntry` in useScrollBall.ts. There is one page and one loader; reactivity
 * would only buy re-render passes for a boolean that flips once.
 *
 * Two properties make it safe to call in any order, which matters because Vue
 * gives no ordering guarantee about which component mounts first:
 *
 *   - `whenPageReady` after the fact runs its callback immediately, so a
 *     component that mounts late never waits for a signal already sent.
 *   - `markPageReady` is idempotent, so a second loader — or a retry on a
 *     failed load — cannot replay every intro on the page.
 *
 * If the loader is ever removed, nothing calls `markPageReady` and every
 * waiter stalls. `TheLoader` is therefore the one thing that must call it, and
 * it does so on a hard timeout as well as on `load`, so a hung font or a
 * stalled image cannot leave the page frozen mid-intro.
 */
let ready = false
let waiters: Array<() => void> = []

/** Run `fn` once the loader has lifted, or now if it already has. */
export function whenPageReady(fn: () => void) {
  if (ready) {
    fn()
    return
  }
  waiters.push(fn)
}

/** Lift the gate. Safe to call more than once; only the first call does work. */
export function markPageReady() {
  if (ready) return
  ready = true

  // Swapped out before running, so a callback that itself calls
  // `whenPageReady` is executed rather than pushed onto a list nobody will
  // read again.
  const pending = waiters
  waiters = []
  pending.forEach((fn) => fn())
}
