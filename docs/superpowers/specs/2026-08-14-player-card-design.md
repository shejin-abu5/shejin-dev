# Player card — replacing Education & Languages

**Date:** 2026-08-14
**Component:** `components/EduLangSection.vue`
**References:** `assets/img/SC/playercard.png`, `assets/img/SC/bg-pattern.png`

## What this replaces

The section is currently two half-width cards side by side: Education on the
left, Languages on the right. It becomes a single **player registration card** —
one card carrying four stat tiles over a faint grid pattern.

Languages goes entirely. That is the ask, and it is also the right call on its
own: the section's own note admits the list is ordered against fluency because
English is the working language of every role on the CV, which is a long way of
saying the list was not telling anyone anything.

## Decisions taken

| Question | Answer |
|---|---|
| Palette | **Light** — paper card on the white page, site tokens throughout. Not the reference's dark treatment. |
| Ball path | Rolls the three top tiles as one surface, steps down onto the club tile, falls to the footer. |
| Heading | **Unlabelled** — the `sr-only` h2 stays, no visible eyebrow. `TheFooter` keeps `04 — Get in touch`. |
| Card head | **None** — rounded container, grid pattern, four tiles. Nothing else. |
| Grid pattern | **Generated in CSS**, not the PNG. |

## Content

Four tiles, laid out three across with the fourth below the first — the
reference's arrangement, and the one the ball's path depends on.

| Tile | Label | Value | Sub-line |
|---|---|---|---|
| 1 | ACADEMY | BCA in Computer Science | Bharathiar University · 2008—2011 |
| 2 | POSITION | Frontend Developer | — |
| 3 | NUMBER | #28 | — |
| 4 | CURRENT CLUB | Alternative Agency | — |

Only tile 1 carries a sub-line. It is the one field with provenance worth
keeping — the degree without the institution and the years is a claim rather
than a record — and the tile is tall enough to hold it because every tile is
sized by the tallest.

## Markup and semantics

The two `<article>` elements become one `<dl>`. Four label/value pairs is
exactly what a definition list is for, the labels stop being decorative text,
and it costs nothing in styling.

```
section.player-section
  div.player-shell            max-w-[960px], the page gutter
    h2.sr-only                "Player card"
    div.player-card           the card: radius, shadow, grid pattern
      div.player-grid         decorative, aria-hidden — see below
      dl.player-tiles         the 3+1 grid
        div.player-tile       ×4 — dt label, dd value, optional dd sub-line
```

The card is a `<div>` rather than an `<article>`: it is not independently
distributable content, it is a presentation of four facts.

## Visual specification

**Card.** Radius 22px, `paper`, the same three-layer shadow `.edu-card` already
uses — contact, near falloff, wide negative-spread lift. Padding
`clamp(1.5rem, 3vw, 2.5rem)`. Kept from the current card deliberately: this
section should read as the same family as Selected Work and Skills, and the
shadow stack is what carries that with no hairline and no tint.

**Tiles.** `paper-soft` on a 1px `hair` border, radius 14px, content centred,
`min-height: 168px`. Stacked: glyph (24×24 stroked, `ink`, 26px box), label
(`data` 11px, `0.09em` tracking, uppercase, `steel`), value (`display`
`clamp(19px, 2vw, 25px)`, weight 700, `ink`). Sub-line where present is `data`
11px `steel`.

The reference uses emoji for its four icons. This uses stroked 24×24 SVG paths
in the same idiom as the mortarboard already in this file and the Skills
glyphs — an emoji here would be the one place the site's icon language breaks,
and it renders differently on every platform besides.

Glyphs: mortarboard (academy, reuse the existing `CAP` paths), boot (position),
shirt (number), badge/shield (current club).

**Number tile.** The value is `#28`, and the `#` is set in `accent-text` while
the digits stay `ink`. It is the one place on the card that gets colour, and a
squad number is the one field that is genuinely a *number* rather than a name.

**Grid pattern.** Two `repeating-linear-gradient`s at 28px in `hair` at ~55%
opacity, one per axis, on an absolutely-positioned layer inside the card. Masked
with a `radial-gradient` so the lines fade out toward the card's edges rather
than colliding with its radius. Over it, six absolutely-positioned cells at
28×28 filled with `hair` at 30–60%, placed off-centre and off-grid-diagonal to
echo the scattered light squares in the reference.

Generated rather than shipped because `bg-pattern.png` is a mockup with the
words "Grid Pattern" baked into it — it is a picture *of* the idea, not the
asset. Generated it is also resolution-independent, tinted from the palette
token, and costs no bytes.

The layer is `aria-hidden` and sits under the tiles.

## Ball integration

The section provides the **last two rolling perches on the page**. The footer's
resting perch cannot move — it is anchored 150px from the end of the document —
so everything from the Skills grid to the footer has to fit in the tail the page
happens to have, and this run is already floored at `ROLL_MIN_RIDE`. That is the
binding constraint on everything below.

**Perch 1 — the tile row.** Surface is the wrapper around the three top tiles,
whose top edge is the same line as their tops. One roll across all three.

**Perch 2 — the club tile.** The step down is one tile height plus the row gap,
~182px, against the ~90px the two language rows used to give. A longer drop into
a shorter surface.

Both keep the trigger windows, `fall` and `holdExit` the current perches
declare. Those numbers carry measurements in their comments — particularly
`fall: 0.6` and `holdExit: true` on the last hop, which together are what
stopped the final descent arriving at 5.9px per px of scroll — and nothing about
the redesign invalidates them.

`from` and `to` are the exception and are expected to move: they are fractions
of a surface, and both surfaces change width. They are set by measurement
against the acceptance criteria below rather than carried over.

`holdEntry` is **not** set on either. The section is pinned while the ball is on
it, so a surface here has not been travelling with the page, and the correction
would aim the step above the frame rather than at the tile.

### The scroll problem, stated up front

The new roll is longer than the one it replaces. The tile row is the full inner
width of a 960px card (~896px), where the Education body block was ~430px. At
the current fractions the ball would be asked to cross roughly three times the
distance in a stretch of page that is already short of scroll — and the engine's
answer to that is `ROLL_MIN_RIDE`: it cuts the ride back rather than sprinting,
so the ball would cross about a fifth of the row and stop.

Two levers, in this order:

1. **Raise `PIN_SCROLL`** (currently 620) until `ride` comes back to 1 for both
   perches. The pin is held scroll, not dead scroll — the same trade
   `HOLD_SCROLL` makes in Selected Work.
2. **Narrow the roll** via `from`/`to` on perch 1 if the pin has to grow beyond
   about a screen and a half to fix it.

This is to be **measured, not assumed**: instrument `ride[]` and the achieved
px-per-px for both perches, and land the roll near `ROLL_SPEED` (0.75) the way
the projects rule now does. Acceptance is below.

## Responsive

| Width | Layout |
|---|---|
| `< 640px` | Tiles stack one per row. Card padding drops to 1.25rem. |
| `640–991px` | Two columns; the club tile sits under the first. |
| `≥ 992px` | Three across, club tile below the first — the reference. |
| `< 1024px` (`BALL_QUERY`) | No ball, no perches, no pin. Unchanged from today. |

The 3+1 arrangement only has to hold where the ball rides it, which is `lg` and
up, so the smaller breakpoints are free to be whatever reads best.

## Accessibility

- `h2.sr-only` "Player card" stays — the section keeps a name in the outline
  even though it shows none.
- Grid pattern layer `aria-hidden`, glyphs `aria-hidden` (each has its `dt`
  label beside it in words).
- `#28` reads as "hash twenty-eight" in a screen reader, which is wrong. The
  `dd` carries an `aria-label` of "Number 28" and the visible text is
  `aria-hidden`.
- Contrast: `steel` (#6B6F76) on `paper-soft` (#FAFAF8) is 5.1:1; `accent-text`
  (#CC3D10) is used for the `#` rather than `accent` for the same reason it is
  everywhere else on the page.
- `useReveal` on the section is kept, so the card fades in as today.

## Acceptance

Measured on a running page at 1440×900 unless stated:

1. `ride` is 1 for both perches — the ball crosses the whole tile row and the
   declared length of the club tile, not a cut-back fraction.
2. The roll along the tile row runs at 0.6–0.9 px per px of scroll.
3. The step onto the club tile is monotone — no dive below the tile and back.
4. The fall into the footer still lands on the resting rule with the ball
   visible, and the perch windows before this section (the skills rule, its
   sideways exit) are not measurably slower than they are today.
5. No visible ball snap over 90px anywhere on the page, scrolling both
   directions, as verified for the previous change.
6. Layout holds at 1024, 1280, 1440 and 1760; tiles stack cleanly at 390 and
   768.
7. Production build succeeds.

## Out of scope

- Renumbering the sections. The footer keeps `04 — Get in touch`.
- The nav. This section has no id and no nav link today, and gains neither.
- Any change to `ThePlayer` — no cameo is added to this section. The `education`
  cameo in `usePlayerPoses` stays unused, as it is today.
