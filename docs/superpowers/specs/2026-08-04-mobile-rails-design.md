# Mobile: swipe rails and the sections around them

**Date:** 2026-08-04
**Status:** approved, implementing

## The problem

Below `lg` the page is not a design, it is what is left after the desktop
design is switched off. The ball is gated at `min-width: 1024px`
(`BALL_QUERY`), the work deck at `1280px`, the experience chart at `1024px`.
Nothing replaces them, so mobile inherits the fallback path of four separate
components and reads as an unstyled CV.

Measured at 390×844:

| Section    | Height | Fault                                                        |
| ---------- | ------ | ------------------------------------------------------------ |
| Hero       | 343px  | Fills 40% of the screen and stops. No call to action.         |
| Intro      | 409px  | Half the paragraph sits at 16% opacity — the wipe never lands. |
| Work       | 4130px | Six full cards stacked, ~5 screens.                           |
| Experience | 1505px | Raw text. Every card and tint discarded below `lg`.           |
| Skills     | 2291px | Nine cards of mostly empty air, glyphs cropped mid-shape.     |
| Edu/Lang   | 713px  | Fine.                                                        |
| Footer     | 810px  | Fine.                                                        |

~10,200px — about twelve screens.

## The idea

Desktop's motion is horizontal: the ball rolls, the heading tracks sideways,
the deck advances. Mobile gets the same motion under the thumb. **The swipe
rail is mobile's signature**, standing in for the deck and the chart the way
those stand in for a list on desktop.

## Rail

One primitive, shared. CSS scroll-snap, no dependency — the OS owns momentum
and rubber-banding, so there is no inertia to reimplement and nothing that can
disagree with the platform. A GSAP Draggable build would cost ~11kb to do it
worse.

- Classes live in `assets/css/main.css` (`.swipe-rail`, `.swipe-dots`), not in
  a component: both sections use them and neither owns them. Scoped styles
  cannot be shared without one component importing the other's stylesheet.
- `composables/useSwipeRail.ts` owns the active index and `goTo`. The only JS
  is an `IntersectionObserver` rooted on the rail — no scroll listener, nothing
  to jitter, matching how `ProjectsSection` already tracks its stack end.
- Slides are `flex: 0 0 calc(100% - var(--rail-peek))` with
  `scroll-snap-align: start`. The rail cancels its container's gutter with a
  negative margin and restores it as padding, so the first card starts on the
  same left margin as the heading above it.
- `::after` spacer equal to one peek. Without it the scroll range runs one peek
  short of the last card's snap line, and an unreachable mandatory snap point
  is what leaves a final card hanging mid-gesture.
- Dots are `<button>`s with a 44px hit area around a 7px mark, labelled with
  the card's own title rather than "slide 3".

Switches at **1024px** for both sections — the same line as `BALL_QUERY`, so
there is one breakpoint to reason about.

## Per section

**Projects** — cards become slides; the card turns into a flex column so
stack-and-link sit on a shared baseline across all six. The `data-stack-end`
sentinel goes `position: absolute` below `lg` so it is not a flex item. The
link's `pl-4` (meant for the `xl` right-aligned rail) is removed below it.

**Experience** — `.gantt-chart` itself becomes the rail; no DOM restructuring,
the element already has two unrelated display modes. Rows finally use
`cardTint(i)` on mobile. Body copy moves to `--card-ink` (#3D4148) because
`steel` measures ~4.2:1 on the darker tints, under AA — the same reasoning the
`lg` block already documents. Bullet markers move off `hair`, which is
invisible on a tint. Rail is `align-items: flex-start`: bullet counts run 1 to
4, and stretching would leave the first card 70% empty.

**Skills** — a rail too, one card per slide. Tried as a compacted two-column
grid first; at ~170px per card the chips wrapped inside themselves and the
back face still drove the height. The rail gives each card ~326px, which is
within 50px of the width it gets in the desktop three-column grid, so the card
needs no mobile variant at all — full glyph, full chips, context sentence
restored. 1340px → 687px.

Its slide width is capped at 420px, unlike the other two. A project carries a
screenshot and a role carries four bullets, so both earn a full-width frame;
this card is a name, a glyph and a row of chips, and past ~420px it letterboxes.
The cap is inert on a phone and only bites across the tablet range, where it
shows a second card rather than stretching one.

That cap is why `--rail-item` exists as a variable: the trailing spacer has to
be `max(peek, 100% − item)`, because the shortfall the last card needs to
clear is the part of the frame it does not fill, which equals one peek only
while the rail is uncapped.

Nine dots at a full 44px overrun a 390px screen, so `.swipe-dot` shrinks on the
width axis (floor 30px) and keeps its 44px of height. A wrapped second row of
dots reads as a second rail.

The 34×34 toggle is **not** a tap-target fault: `.skill-toggle::after` is
positioned against `.skill-face`, so the real target is the whole card.

**Hero** — `min-h-[86svh]` and centred on mobile, plus an Email / Download CV
pair. `svh` not `vh` so the iOS URL bar does not crop it. Typo: "its
necessery" → "it's necessary".

**Intro** — the word wipe moves inside the existing
`(min-width: 768px) and (prefers-reduced-motion: no-preference)` matchMedia
block. Below it the words are never dimmed, so the paragraph is plainly
readable. This is a correctness fix, not a preference.

**Nav** — the "Open to relocation" text is shown at all widths. Hidden below
`sm` it left a bare orange dot reading as a stray bullet, and the row measures
~275px of the 350px available.

## Out of scope

Desktop is untouched. Every change is inside a `max-width: 1023px` /
`max-md:` boundary or adds mobile-only markup.
