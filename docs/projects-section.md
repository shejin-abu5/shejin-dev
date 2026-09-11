# Selected Work (`components/ProjectsSection.vue`)

Reference for the `#work` section: what the moving parts are, the order they run
in, and why the non-obvious numbers are the numbers they are.

The `<script setup>` block carries per-constant JSDoc — that is the detail
record. This file is the map: read it first, then go to the constant.

---

## 1. What the section does

Four things happen over one scroll, and they overlap:

1. **The heading pins.** `SELECTED WORK` and the hairline rule under it hold
   still for `HOLD_SCROLL` px while the page keeps scrolling.
2. **The ball rolls the rule.** The site-wide scroll ball enters the rule at the
   left and travels right to `DECK_FROM`.
3. **The player strikes it.** A `ThePlayer` cameo stands on the rule at that
   point, winds up, and kicks the ball at the moment it arrives.
4. **The deck climbs.** Project cards stack up sticky behind the held heading,
   each one blurring as the next one covers it.

Then the pin releases, the deck finishes, and a blur band at the bottom of the
viewport fades out.

---

## 2. Flow

```
onMounted
  │
  ├─ holdMedia (lg and up only) ──────────── the heading pin
  │     ScrollTrigger.create({ pin: headBlockRef, start: HOLD_START })
  │     └─ stored in `holdST` so its geometry can be read back
  │
  ├─ tail sizing ───────────────────────────  .work-stack-tail height
  │     measured from the last card, re-run on ScrollTrigger `refreshInit`
  │
  └─ deckMedia ────────────────────────────── the card deck
        per-card ScrollTrigger, one each
        └─ feeds the ball's path across the card tops (DECK_FROM → DECK_TO)
```

Two separate `gsap.matchMedia()` instances, because the two systems have
different breakpoints: the pin is `lg`-and-up only, the deck runs at every
width. Both are killed on unmount, and the `refreshInit` listener is removed by
hand.

### The clock

The one thing worth understanding before anything else: **the ball, the boot and
the roll are all read off a single number, `holdK()`** — not off the pin's own
progress.

`holdST.progress` is *raw scroll*. Everything else about the ball is smoothed
(`FOLLOW_TAU`). Handing the cameo raw scroll made the one perch on the page that
was supposed to be the best-synchronised into the only one that advanced in
wheel-sized steps. `holdK()` re-derives the hold's progress from `ballClock.y`
instead, so the boot and the ball are two readings of one number rather than two
smoothings of one scroll position.

```ts
const holdK = () => {
  const st = holdST
  if (!st) return 0
  const span = Math.max(1, st.end - st.start)
  return gsap.utils.clamp(0, 1, (ballClock.y - st.start) / span)
}
```

---

## 3. The numbers

| Constant | Value | Why |
|---|---|---|
| `HOLD_SCROLL` | `620` | At 420 the roll ran 1.11px per px of scroll — half again the 0.75 cruise every other rail is laid out against, and the fastest roll on the site. 620 × 0.72 gives the cruise. |
| `HOLD_START` | `top top+=260` | Not flush. At `top+=120` the rule settled near y=245, putting the player's head under an 88px nav. The nav is the binding constraint, not the ball's fade band. |
| `CONTACT_AT` | `0.71` | Where the boot actually passes the ball's landing point — measured, not chosen. The swing runs 0.54→0.82 of the hold; the boot crosses at three fifths of it. At progress 1 the ball arrived on the last frame and the whole follow-through fell outside the window. |
| `DECK_FROM` | `0.56` | The heading sets to ~420px, ending a shade past 0.42 of the rule — at 0.42 the player stood on the K. 0.56 clears the longest the heading gets. |
| `DECK_TO` | `0.88` | End of the ball's walk across the card tops. |
| `RAIL_INSET` | `14` | Px pulled in from each end of the *rule*. Stated rather than defaulted, because the player's position is derived from it — a handover measured two ways is a boot and a ball in two places. Not the deck's 26 (that clears a card's corner radius). |
| `BOOT_AT` | `0.72` | Where the striking boot sits across the player's own box. This cameo is not tracked, so the alignment is geometric: he must stand such that this point lands on `DECK_FROM`. Measured at 1440×900. |
| `DEFOCUS` | 5 pairs | Per-card blur ramp start/end, in scroll-progress %. Measured against a `@property` counter, not derived. **Re-measure if the card count, the 5vh gap or the tail changes.** |

---

## 4. Template layout decisions

These were inline comments in the template. They are here instead.

### The player sits in a wrapper, not against the section

He is inside the same `relative` wrapper as the rule so his feet land on the
line the ball rolls along, whatever the heading above wraps to.

He faces **right, unflipped**, standing at `DECK_FROM`. Both follow from one
fact: the ball enters the rule at the left, rolls right to `DECK_FROM`, and
leaves there for the deck. That is where the contact is, and forward is the way
the ball is already going. He used to stand at the far right facing left — most
of a rule away from the only point on it the ball ever reaches.

`left` is **computed from `DECK_FROM`**, short by the distance from his box's
left edge to his boot, so the *foot* lands on the handover and not his hip. It
was hardcoded `left-[47%]`, which is where `DECK_FROM` lands on a 1224px rule
and nowhere else — at 1024px the handover is x=490 and 47% is 436, so the ball
came to rest 31px short of a boot swinging through air. See `.work-player`.

### The rule's wrapper margin

`mb-5` on a phone, `md:mb-28` above. The rule inside is `hidden md:block`, so
below `md` the old 80px margin was separating the heading from the deck across
an element that is not drawn — 80px of nothing on top of the row's own 36,
pushing the first card most of a thumbnail lower than it needed to sit.

### The runway lives outside the pinned block

```
<div class="work-runway" :style="{ '--runway': `${HOLD_SCROLL}px` }">
```

The margin **is** `HOLD_SCROLL`, bound from the constant rather than written
out. The two are one number and the composition breaks quietly if they drift.
(It was `lg:mt-[420px]` beside a comment saying not to let them drift, which is
how the pair survived the hold going to 620.)

The heading is pinned without spacing for that distance, so the deck keeps
moving while the heading does not. Starting a hold's-worth lower is what makes
the deck *arrive* at normal spacing on the frame the pin releases, instead of
riding up past the heading and rendering above it.

It was tried as bottom margin on the rule's wrapper, which is inside the pinned
block. ScrollTrigger wraps that block in a `.pin-spacer` with an explicit
height, so the child margin no longer collapses through it: 532px was applied
and measured, and the gap it produced was 1px. Out here there is no spacer to
swallow it. Only at `lg`, where the pin runs at all — below that it is dead
page.

### `--last` on the final card

Every card blurs because the next one is climbing over it. Nothing climbs over
the last one, so the same rule would blur the card the reader is still looking
at. `work-card--last` opts it out. See `work-card-defocus`.

### The card grid: two layouts, not three

Below `deck` (900px): one column, shot on top.
From `deck` up: two columns — copy over stack on the left, shot on the right.

At `xl` it used to be a row of **three**: copy | shot | stack. That is gone
because the container is 1240px and site-wide (the section heading uses the
same one), so the third column could only be paid for out of the shot. It cost
555px of shot beside two 247px columns — the picture at half the card, which is
not what this section is for. Folding the stack under the copy widened both
things that matter: the shot to 759, the copy to 325.

`deck` is **900px, not the 992 it was**, and what the move bought is the swipe
rail below it going away (see `tailwind.config.ts`). The single column is not a
fallback down there; it is the better card, and `--shot-cap` keeps it short
enough to pin.

### No `w-full` on the figure

Below `deck` the box is sized from its height (`--shot-cap`). A stretched grid
item would override that back to the container's width — the shape that made
the card too tall to pin in the first place.

### The foot row sits under the copy

In the two-column case it is `col-start-1 / row-start-2`, not a column of its
own. That is what keeps the shot's height the card's height.

The `pt-3.5` separates the link from the copy in the one-column case. A hairline
rule did that job first and is out: the card already carries its own ring, the
shot's edge, and the deck edges of the cards behind it. The space says the same
thing without a fourth line.

### The link is unadorned

No underline — the `→` is what marks it as a link, so it is carried by something
other than colour alone, which is the bar an underline was clearing.

`active:opacity-60` as well as `hover:`: on the surface this is now the primary
presentation for there is no hover, and a 44px row that does not acknowledge the
tap reads as dead for the length of the page load it kicks off.

### The stack tail

Visible at every width, now that the deck stacks at every width. It was
`hidden deck:block` because below 992 there was a swipe rail here and a
full-width spacer would have been a seventh slide in it.

---

## 5. Things that will bite

- **`DEFOCUS` is measured.** Adding or removing a project, or changing the 5vh
  gap or the tail, invalidates all five pairs. The method is in the constant's
  JSDoc: scroll the deck in small steps and read a `@property` counter driven by
  `cover 0% cover 100%` at the two moments.
- **`HOLD_SCROLL` appears in two places** — the constant and `--runway` — but is
  bound, not typed twice. Keep it that way.
- **`BOOT_AT` and `CONTACT_AT` are measured at 1440×900** against the live rig.
  If the cameo art changes, re-measure both.
- **The pin only exists at `lg`.** Anything that assumes `holdST` is non-null is
  wrong below that; `holdK()` returns 0 there.
- **`RAIL_INSET` is consumed by both** the ball's path and the player's `left`.
  Changing it moves both, which is the point — do not special-case one.
