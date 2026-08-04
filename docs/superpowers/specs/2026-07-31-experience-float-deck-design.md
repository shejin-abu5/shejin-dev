# Experience section — pinned float deck

**Date:** 2026-07-31
**File:** `components/ExperienceSection.vue` (full rewrite)
**Reference:** `assets/img/sc/experience/1.png`, `2.png`

## Problem

The current Experience section is a 3D flip carousel: four cards stacked in one
box, each rotating 180° on Y as scroll advances, with five per-card layers at
staggered Z depth. It does not read well — the off-axis magnification and the
edge-on blink make it feel unstable rather than premium.

The 3D version is preserved untouched at `components/ExperienceSection-3d.vue`.

## Target behaviour

From the reference screenshots:

- The section pins. A giant word sits centred and still in the pinned viewport.
- Cards rise from below the fold and travel upward past the heading, **in front
  of** it, occluding it, then clip out at the top.
- Cards surface one at a time at staggered horizontal lanes, not in a column.
- Cards are flat light slabs — a title block at the top, a short note at the
  bottom, nothing else.
- Shot 1 → shot 2 shows cards 01 and 02 each moving up by the same distance, so
  the base motion is a shared upward translation with per-card start offsets,
  not per-card speeds.

This is **not** a slider. There is no current item, no rail, no counter, and no
live region — the cards' travel is the only progress signal.

## Structure

```
<section id="experience">              ← ScrollTrigger trigger, pinned
  └ .exp-stage    100vh, relative, overflow-hidden
      ├ .exp-title    z-0   eyebrow "02 — Career" + giant centred EXPERIENCE
      └ .exp-card ×4  z-10  absolutely positioned, GSAP drives y + opacity
```

No track wrapper — cards are absolutely positioned in the stage directly and
carry their own `z-index`. Fewer nodes, and the static path only has to unwind
`position: absolute` rather than a nested container too.

## Data

`ExperienceItem` changes:

- **Add `org: string`** — short company name for the floating card
  (`Alternative Agency`, `Golden Star Media`, `Tecrizon`, `GL Infotech`). The
  existing `company` keeps its full name-plus-location string for the static
  list; `Golden Star Media Production & Event Management, Dubai, UAE` is far too
  long for a card bottom line.
- **Add `summary: string`** — one sentence distilled from the entry's first
  bullet, e.g. `Lead frontend for automotive CMS platforms across 8+ regional
  markets.`
- **Remove `icon`** and the `icons` map — the badge glyphs only existed for the
  3D layer stack.
- **Keep** `years`, `period`, `role`, `company`, `current`, `bullets`.

`badgeTint()` and `pointsVars()` are deleted along with the badge and the
per-entry bullet-box sizing they fed.

## Card

A **black tile** on the section's `paper-soft` background, lit from the
top-left: `linear-gradient(158deg, #262626, #161616 52%, #0d0d0d)`. Angled
rather than vertical so the ramp runs across the diagonal and reads as a lit
surface instead of a banded one. Built around `ink` (#121212) so the tile is
the same black as the site's type. `rounded-[18px]`, matching the site's card
language (`work-card` is `rounded-[20px]`); the reference's square corners are
deliberately **not** adopted.

The reference's flat light slab was the earlier treatment and is superseded.

- Size: `clamp(260px, 25vw, 420px)` wide × `clamp(320px, 54vh, 520px)` tall.
  Derived from the reference, where a card measures ~25vw × ~54vh.
- Top: `01 — Senior Frontend / UI Developer`
- Bottom: `Alternative Agency · 2020 — NOW`, then the summary sentence.
- `box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 26px 64px -32px rgba(18,18,18,.55)`.
  The hairline is load-bearing, not decoration: the heading behind the tile is
  near-black type on near-white paper, so where the tile crosses a letter its
  edge would otherwise vanish. The soft shadow lifts it off the paper
  everywhere else.

### Type on the tile

Every colour is re-set inside the motion query — `ink` on black is invisible
and `steel` lands at 1.5:1. Warm greys rather than pure neutrals, to match the
paper the section sits on. Measured against the gradient's worst stop:

| element | colour | contrast | needs |
|---|---|---|---|
| role, 22px bold | `#FFFFFF` | 15.1:1 | 3.0 |
| summary 14px, meta 12px | `#C9C6BE` | 8.9:1 | 4.5 |
| index `01 —`, 22px bold | `#8A8781` | 4.2:1 | 3.0 |

The static list has no tile and keeps its dark-on-paper colours, so none of
these overrides apply there.

## Motion

Gated by `gsap.matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)')`,
matching how the current file gates its carousel and staying in step with the
`<style>` media queries.

### Lanes

| i | `left` | `dwell` nudge |
|---|--------|---------------|
| 0 | 6%     | −34px         |
| 1 | 50%    | +28px         |
| 2 | 20%    | −22px         |
| 3 | 62%    | +40px         |

`left` percentages come from the reference (cards 01/02/03 sit at ~7%, ~50%,
~17% of viewport width); lane 3 continues the alternation. Every lane clears the
right edge — 62% + 25vw lands at ~87%.

`dwell` offsets a card from dead-centre when it parks, so the four resting
positions are not identical.

### Rise, hold, exit

A card that never stops moving is a card you cannot read. So the shared-track
model — every card riding one `−p × TRAVEL` term at constant speed — is
rejected: it has no moment where anything is legible.

Instead each card runs its own three-phase cycle on its own clock, measured in
abstract units:

| phase | units | behaviour |
|---|---|---|
| `RISE` | 0.8 | travels from below the fold to its dwell position, `power2.out` |
| `HOLD` | 1.4 | **stationary** at the dwell position |
| `EXIT` | 0.8 | travels from dwell to above the top edge, `sine.in` |

Decelerating into the dwell is what makes the stop read as a landing rather
than as the animation stalling.

Leaving is `sine.in` rather than `power2.in`. Both start from zero velocity, so
the handoff out of the hold is smooth either way — but cubic-in finishes at 3×
its average speed and the card visibly snaps away at the end, where sine.in
tops out at ~1.57× and reads as an even glide. Measured over the exit in even
scroll steps, the final step is 1.45× the average.

A single scalar `p: 0 → 1` scrubs across the pin and maps to
`u = p × totalUnits`. Card `i` reads its own clock as `local = u − i × STEP`,
so position stays a pure function of scroll and reversing is free.

- `STEP = 1.4` — the stagger. At this value the outgoing card's hold ends
  exactly as the incoming card's begins, and each card rises into view while
  its predecessor is still parked. There is always one card settled to read and
  one arriving; never four in transit at once.
- `UNIT_VH = 55` — viewport heights of scrolling per unit, and the dial for
  overall pace. The pin runs `((n − 1) × STEP + SPAN) × UNIT_VH`, so at four
  cards it is ~3.96 screens, of which each card spends ~0.77 stationary.
- `drift_i` alternates `+1, −1, +1, −1` for a bounded ±26px float applied
  **only during RISE and EXIT** — it peaks mid-travel and is exactly zero at
  both the start and the dwell. A card that wobbles while parked is a card you
  are still trying to read. Per-card speed multipliers were rejected outright:
  over the full travel they diverge without bound and cards collide.
- No x drift. The reference cards are strictly axis-aligned and hold their lane.

### Opacity

`clamp01(local / (RISE × 0.35)) × power1.out(clamp01((SPAN − local) / EXIT))`,
and 0 before the card's clock starts.

A card fades in over the first third of its rise. The fade **out** spans the
whole exit, so it begins dissolving the moment it leaves the dwell rather than
staying solid and then vanishing near the top edge. That ramp is eased
(`power1.out`) rather than linear: straight-line over the full exit puts the
card at 50% opacity while it is still well inside the frame, which reads as
muddy. Eased, it is 0.84 at the exit's 40% mark and 0.64 at 60%.

Fully opaque for the whole hold.

### ScrollTrigger

```
trigger: sectionRef, start: 'top top', pin: true, pinSpacing: true,
end: () => `+=${UNIT_VH / 100 * window.innerHeight * totalUnits}`,
scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true
```

`startY`, the dwell positions, and the exit positions are all vh-derived, so
they are recomputed against `window.innerHeight` on every ScrollTrigger refresh
rather than captured at load. Card height is read from `offsetHeight` at the
same time rather than assumed from the CSS clamp.

Per-frame writes go through `gsap.quickSetter` for `y` and `opacity`, as the
current file does — these run on every scroll frame and the property-parsing
overhead is the difference between a clean scrub and a stuttering one.

### Cleanup

The `matchMedia` teardown runs on resize past `lg` or an OS motion-setting flip.
`gsap.matchMedia` reverts the timeline and the pin itself; the callback only
needs `gsap.set(cards, { clearProps: 'all' })`.

## Static path

`@media (max-width: 1023px), (prefers-reduced-motion: reduce)` — no pin, no
absolute positioning, no stage height.

- Ordinary vertical list, entries separated by a `hair` hairline, as the current
  file's fallback already does.
- Heading returns to normal size and left alignment, matching
  `ProjectsSection`'s header rhythm.
- **Full bullets are visible here.** The condensed card is a desktop-only
  treatment.

## Accessibility and SEO

The floating card drops the bullets, which are the section's substance. So the
bullet list is rendered in the markup **always**, and the `lg` motion path hides
it with the standard `sr-only` clip (`position:absolute; width:1px; height:1px;
clip:rect(0,0,0,0)`) rather than `display:none`. Screen readers and crawlers
keep the full detail; sighted desktop readers get the reference's clean card.

All four cards stay in the accessibility tree at all times — unlike the
carousel, nothing is ever `aria-hidden`. The `aria-live` region and
`activeIndex` are deleted: with no current item there is nothing to announce.

## Removed

- All 3D: `transformPerspective`, `rotationY`, `preserve-3d`,
  `backface-visibility`, the `translateZ` depth ladder, per-layer shadows.
- The five-layer card anatomy (`.exp-panel`, `.exp-badge`, `.exp-role`,
  `.exp-year`, `.exp-points`) and the `icons` map.
- The progress rail and its `activeIndex` binding.
- The `aria-live` status paragraph and `carouselActive`.
- `badgeTint()`, `pointsVars()`, and the `--exp-*` custom properties.

## Out of scope

`components/ExperienceSection-3d.vue` is the user's backup and is not touched.
No other section changes.
