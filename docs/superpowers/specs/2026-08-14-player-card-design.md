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
| Ball path | Rolls the three top tiles as one surface, steps down onto the last tile, falls to the footer. |
| Heading | **"Stat"**, set across the section as a ghost — superseded the original `sr-only`-only decision, see the amendment. `TheFooter` keeps `04 — Get in touch`. |
| Card head | **None** — rounded container, grid pattern, six tiles. Nothing else. |
| Grid pattern | **Generated**, not the PNG. See the amendment below. |

## Content

Six tiles, three across and two rows deep. Identity on the top row, the career
record on the bottom — the order the ball's path depends on, since it crosses the
top row, steps down and crosses again, and the row it lands on has to read as the
continuation rather than as a second subject.

| Tile | Label | Value | Sub-line |
|---|---|---|---|
| 1 | ACADEMY | BCA in Computer Science | Bharathiar University · 2008—2011 |
| 2 | POSITION | Frontend Developer | — |
| 3 | NUMBER | #28 | — |
| 4 | CURRENT CLUB | Alternative Agency | — |
| 5 | TOTAL APPEARANCES | 12+ years | — |
| 6 | RED CARDS | 0 | — |

Only tile 1 carries a sub-line. It is the one field with provenance worth
keeping — the degree without the institution and the years is a claim rather
than a record — and the tile is tall enough to hold it because every tile is
sized by the tallest.

Tiles 5 and 6 were added after the four above shipped. They are also what
retired the wide fourth tile: a span across the bottom two columns was there to
fill the hole four tiles leave in a three-column grid, and six leave none.

## Markup and semantics

The two `<article>` elements become one `<dl>`. A run of label/value pairs is
exactly what a definition list is for, the labels stop being decorative text,
and it costs nothing in styling.

```
section.player-section
  div.player-grid-clip        full-bleed, aria-hidden — the vignette and the clip
    GridPattern.player-grid   the 40px grid, skewed 12°
  div.player-edges            aria-hidden — shadow down the left and right
  h2.player-heading           "Stat" — ghosted over everything by z-index
  div.player-shell            max-w-[960px], the page gutter
    div.player-card           the card: radius, padding
      dl.player-tiles         the 3×2 grid
        div.player-tile       ×6 — dt label, dd value, optional dd sub-line
```

The card is a `<div>` rather than an `<article>`: it is not independently
distributable content, it is a presentation of six facts.

## Visual specification

**Card.** Radius 22px, `paper`, the same three-layer shadow `.edu-card` already
uses — contact, near falloff, wide negative-spread lift. Padding
`clamp(1.5rem, 3vw, 2.5rem)`. Kept from the current card deliberately: this
section should read as the same family as Selected Work and Skills, and the
shadow stack is what carries that with no hairline and no tint.

**Tiles.** `paper-soft` on a 1px `hair` border, radius 14px, content centred,
`min-height: 168px`. Label (`data` 11px, `0.09em` tracking, uppercase, `steel`)
over value (`display` `clamp(19px, 2vw, 25px)`, weight 700, `ink`), with the
sub-line where present in `data` 11px `steel`.

The glyph is not in that stack. It is a watermark pinned into the tile's
top-right corner — `clamp(84px, 9vw, 124px)`, `accent` at 30%, behind the text and
cropped by the corner — and the amendment below says why.

The reference uses emoji for its four icons. This uses stroked 24×24 SVG paths
in the same idiom as the mortarboard already in this file and the Skills
glyphs — an emoji here would be the one place the site's icon language breaks,
and it renders differently on every platform besides.

Glyphs: mortarboard (academy, reuse the existing `CAP` paths), pitch (position —
a tactics board rather than the boot originally specced, because a boot says
"football" again and the page has already said it), shirt (number), badge/shield
(current club), calendar (total appearances — built as a stopwatch first, on the
argument that a calendar counts dates while this counts matches; overruled, and
the marked days carry a count better than a clock face anyway), referee's card
(red cards, held at the angle a referee holds it).

**Number tile.** The value is `#28`, and the `#` is set in `accent-text` while
the digits stay `ink`. A squad number is the one field that is genuinely a
*number* rather than a name, so it is the one that earns the colour.

It was the card's only colour until the corner glyphs went `accent` too. It
remains the only place accent appears in something meant to be *read*, which is
also why the two shades differ: `accent-text` here because this is small text on
a light surface, `accent` on the glyphs because they are neither small nor text.

**Grid pattern.** A 28px grid in `hair` on an absolutely-positioned layer,
masked with a `radial-gradient` so the lines fade out rather than stopping at a
hard edge. Cells filled with `hair` at 35–55%, placed off-centre and
off-grid-diagonal to echo the scattered light squares in the reference.

Generated rather than shipped because `bg-pattern.png` is a mockup with the
words "Grid Pattern" baked into it — it is a picture *of* the idea, not the
asset. Generated it is also resolution-independent, tinted from the palette
token, and costs no bytes.

The layer is `aria-hidden` and sits under the tiles.

> **Amendment, same day — implementation.** Shipped first as two
> `repeating-linear-gradient`s plus six absolutely-positioned `<span>`s; now
> `components/GridPattern.vue`, an SVG `<pattern>`, ported from the React
> reference the mockup came from. Same picture and the same tokens — the reason
> for moving is that the gradients drew lines while the filled cells were placed
> in pixels against them, so the cell size existed as two numbers that only
> agreed until one was edited. The component takes it as a prop and counts the
> cells in it. The mask stays in `EduLangSection`'s scoped CSS, because the
> `-webkit-` pair is what covers Safari before 15.4 and a Tailwind arbitrary
> value emits one property.
>
> **Amendment, same day — placement.** The layer is no longer clipped to the
> card. It is a sibling of the page container, `absolute inset-0` on
> `.player-section`, so the grid runs the full width of the viewport and the card
> sits on top of it as opaque paper. The card keeps no pattern of its own; what
> reads as texture is the frame around it.
>
> **Amendment, same day — the backdrop.** Four changes to the section behind the
> card, all of them in `EduLangSection`'s style block.
>
> **The heading is visible now.** "Stat", `clamp(96px, 24vw, 340px)` Archivo 900,
> centred on the section, `ink` at 3%. It replaces the `sr-only` h2 rather than
> joining it, so the section still has exactly one name in the outline. It paints
> *over* the card via `z-index: 1` and not by sitting later in the markup — a
> heading that follows the six facts it heads is not an outline — and carries
> `overflow: hidden` so it can be sized past the viewport without ever reaching
> the document and adding a scrollbar.
>
> The 3% is the one number here that was measured rather than chosen. The word
> darkens whatever it crosses, and the 11px `steel` label sits at 4.83:1 on
> `paper-soft` to begin with: at the 5% it was first built with, the label fell to
> **4.36:1**, under the 4.5:1 AA floor. 3% holds it at **4.54:1**. That is the
> whole budget; if the word ever needs to be stronger the honest lever is the
> label colour, not this.
>
> **The grid is tilted** 12°, the reference's angle, and **coarser** — `CELL` 28 →
> 40, with the filled cells cut from thirteen to seven, because a coarser grid
> wants fewer or the fills read as a pattern of squares rather than as a few cells
> that happen to be filled.
>
> The tilt is why `.player-grid-clip` exists. A mask on a transformed element is
> transformed with it, so the vignette had to move off the grid and onto an
> unskewed wrapper, or it would skew too and stop lining up with the section's own
> top and bottom. The grid inside runs `height: 160%` at `top: -30%`: skewing
> about the centre lifts one edge and drops the other by half the width times
> tan 12° — 153px each way at 1440 — and a box the height of the section would
> leave bare triangles across the top and bottom.
>
> **Shadow down the left and right edges**, as its own layer over the grid and
> under the card. Two linear gradients rather than an `inset` box-shadow, which
> would close the top and bottom too and double up against the vignette. It needs
> its own vertical mask: both gradients run horizontally, and without one the
> section finished on two hard grey stubs against the white page.
>
> **Amendment, same day — six tiles.** Total appearances (12+) and Red cards (0)
> added, taking the card from four tiles to six and the grid from 3+1 to a plain
> 3×2. `grid-column: 2 / -1` came off `.player-tile:last-child` with it.
>
> The card's height does not change — it was two rows before and is two rows now
> — so `PIN_SCROLL` and everything measured against the pin still hold.
>
> The ball's second perch does change hands, from the wide fourth tile to the
> bottom-right column, and its fractions were restated by solving for the old
> absolute positions rather than re-chosen: the rail above ends at 0.70 of 816 =
> x 571, the old `from: 0.54` of the wide tile was x 568 and `to: 0.8` was x 708,
> and against a 263px column starting at x 553 those are `0.07` and `0.59`. The
> ball's path over the card is unchanged, which is what keeps `fall`, `holdExit`
> and the acceptance numbers valid. `clubTileRef` is `lastTileRef` now, since the
> last tile is no longer the club.
>
> One latent bug fixed on the way in: the `#` was hardcoded into the branch that
> renders a tile's `spoken` form, so Red cards — the second tile to want one —
> came out as `#0`. The prefix is a `Tile` field now.
>
> **Amendment, same day — the glyphs.** Out of the flow above the label and into
> the top-right corner of each tile, `clamp(84px, 9vw, 124px)` against the 26px
> box they had, `accent` at 30% opacity, `z-index: -1` under the text against an
> `isolation: isolate` on the tile.
>
> The mark is pinned past the corner and cropped by `overflow: hidden` on the
> tile, which clips to the 14px radius so the bite follows the corner rather than
> squaring it off. The offsets are fractions of the mark rather than pixels, so
> the bite holds its proportion across the clamp — and they are measured off the
> paths, not chosen: none of the four glyphs fill their viewBox (the drawing runs
> roughly x 3–21, y 4–20 of 24), so an offset under ~12% right or ~17% top crops
> nothing but air and the mark reads as misaligned rather than bled. `-0.26` and
> `-0.28` clear that padding and then take ~18% off the drawing itself.
>
> The 84 floor is the *phone's* tile rather than the phone's width: below 560px
> the tiles stack, `min-height` is dropped, and a one-line tile such as Position
> collapses to about 83px. 84 clears that with the top offset applied and keeps
> its bottom.
>
> **An uncropped variant was built and rejected** — whole mark, 10px inside the
> corner, no `overflow: hidden`. It is worth recording because the shirt is a
> real argument for it: its collar and shoulders both identify it and sit at the
> top of the box, which is the part the bite takes, so it is the one glyph the
> crop costs something. The corner treatment won anyway. If that ever reverses,
> the levers are `-0.28` (less top bite) or the uncropped variant wholesale.
>
> The size is affordable because the glyph is not information — the `dt` says the
> same thing in words and the SVG is `aria-hidden` — and at 26px in the flow it
> took the top of the tile from the label, so the eye reached a mortarboard
> before it reached "Academy". Behind rather than over, because a centred value
> on a 272px tile reaches into that corner and an absolutely positioned element
> otherwise paints above in-flow text.
>
> The paths carry `vector-effect: non-scaling-stroke`. Stroke scales with the
> box, so the 1.5 weight they are drawn at renders 4.25px once the box is 68 —
> a logo rather than a line drawing, and muddy under 30% opacity. Pinned, the
> mark gets bigger without getting heavier. It goes on the paths because
> `vector-effect` is one of the few SVG presentation properties that does not
> inherit.
>
> Three consequences of the full-bleed move, all of them in the code's
> comments. The vignette's radii
> stop being equal — 50% vertically, where the grid must reach zero before the
> section ends, and 75% horizontally, where it must *not*, or it fades out short
> of the viewport and the bleed reads as a band. `isolation: isolate` came off
> the card with the negative z-index it existed for; DOM order does the stacking
> now. And the cells were re-scattered: they sit in the bands above and below and
> in whatever margin the viewport leaves beside a 960px card, weighted toward the
> band *below*, because the fixed nav covers most of the one above for as long as
> the section is pinned.

## Ball integration

The section provides the **last two rolling perches on the page**. The footer's
resting perch cannot move — it is anchored 150px from the end of the document —
so everything from the Skills grid to the footer has to fit in the tail the page
happens to have, and this run is already floored at `ROLL_MIN_RIDE`. That is the
binding constraint on everything below.

**Perch 1 — the tile row.** Surface is the wrapper around the three top tiles,
whose top edge is the same line as their tops. One roll across all three.

**Perch 2 — the last tile, bottom right.** The step down is one tile height plus
the row gap, ~182px, against the ~90px the two language rows used to give. A
longer drop into a shorter surface.

Originally the wide fourth tile spanning the bottom two columns; since the card
went to six tiles it is the right-hand column of the bottom row, x 553→816 of the
816px content box rather than x 277→816. `from`/`to` were restated against the
narrower surface by solving for the old absolute positions — see the amendment.

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
| `640–991px` | Two columns, three rows. |
| `≥ 992px` | Three across, two rows deep. |
| `< 1024px` (`BALL_QUERY`) | No ball, no perches, no pin. Unchanged from today. |

The three-column arrangement only has to hold where the ball rides it, which is
`lg` and up — the second perch's `from`/`to` are fractions of a third of that row
— so the smaller breakpoints are free to be whatever reads best.

## Accessibility

- The section keeps exactly one name in the outline. It was an `sr-only` "Player
  card"; it is now the visible `h2.player-heading` "Stat", which stays first in
  the markup and is lifted over the card by `z-index` rather than being moved
  after the facts it heads.
- Grid pattern layer and edge shadow `aria-hidden`, glyphs `aria-hidden` (each
  has its `dt` label beside it in words).
- The ghost heading darkens the tiles it crosses. Measured on the running page:
  `steel` labels go 4.83:1 → 4.54:1, which still clears the 4.5:1 AA floor. That
  measurement is what fixes its opacity at 3% — see the backdrop amendment.
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
   declared length of the last tile, not a cut-back fraction.
2. The roll along the tile row runs at 0.6–0.9 px per px of scroll.
3. The step onto the last tile is monotone — no dive below the tile and back.
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
