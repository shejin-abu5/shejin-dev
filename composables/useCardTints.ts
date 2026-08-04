/**
 * The pastel card palette behind the Experience chart.
 *
 * Each entry is [base, wash, deep]. `base` and `wash` are the two stops of a
 * card's gradient; `deep` is the same hue carried further down, for a hover
 * that intensifies a mark rather than recolouring it — the accent would win
 * over the card's own identity every time.
 *
 * Experience is the only caller: it fills its bars base→wash. The Skills grid
 * used to tint its ghost glyphs from here too, and now runs one silver mark
 * across all nine instead — kept general rather than folded into that one
 * component in case a second tinted surface turns up.
 *
 * Not in tailwind.config.ts because these are never used as utility classes:
 * they are read as CSS custom properties by the card components alone.
 */
export const CARD_TINTS: [string, string, string][] = [
  ['#E4DEF8', '#F2EFFC', '#B9A9EC'], // lavender
  ['#D9F3C6', '#ECFAE2', '#A8DE84'], // mint
  ['#FBD4CD', '#FDE9E5', '#F2A093'], // blush
  ['#FAEDD5', '#FCF6EA', '#EBC98A'], // cream
  ['#D7E8F8', '#EBF3FC', '#9CC6EC'] // sky
]

/**
 * Secondary text on the tints. `steel` (#6B6F76) measures ~4.2:1 against the
 * darker ones — under the 4.5:1 AA needs at the sizes these cards use. This
 * clears 8:1 on all five, so secondary copy can stay secondary without going
 * illegible on the mint and blush cards.
 */
export const CARD_INK = '#3D4148'

/**
 * The custom properties for card `i`, cycling through the palette.
 *
 * Bound with `:style`, which is safe alongside the per-frame `row.style` writes
 * in the Experience chart: Vue patches individual properties rather than
 * rewriting cssText, and these values never change after mount, so it has
 * nothing to re-apply.
 */
export function cardTint(i: number) {
  const [base, wash, deep] = CARD_TINTS[i % CARD_TINTS.length]
  return {
    '--tint': base,
    '--tint-wash': wash,
    '--tint-deep': deep,
    '--card-ink': CARD_INK
  }
}
