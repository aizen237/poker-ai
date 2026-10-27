import { cardId, fullDeck, validateSimulationInput, type Card } from "@poker-ai/shared";
import { combinations, evaluateBest, HandCategory } from "@poker-ai/poker-engine";
import { createComboRange, type ComboWeight } from "./comboRange.js";

/** Hypotheses only, not inferred tendencies or a solver betting strategy.
 * Uniform within each legal bucket; percentages are total range mixture mass,
 * not per-combo frequencies. Known hero cards affect removal, not classification. */
export function riverBettingAssumptions(hero: readonly Card[], board: readonly Card[]) {
  if (hero.length !== 2 || board.length !== 5) throw new Error("River assumptions require two hero cards and five board cards");
  validateSimulationInput([...hero, ...board], 5, 1);
  const known = new Set([...hero, ...board].map(cardId));
  const boardHand = evaluateBest(board);
  const topRank = Math.max(...board.map(c => c.rank));
  const strong: ComboWeight[] = [], thin: ComboWeight[] = [], bluffs: ComboWeight[] = [];
  for (const pair of combinations(fullDeck().filter(c => !known.has(cardId(c))), 2)) {
    const cards = pair as [Card, Card];
    const made = evaluateBest([...cards, ...board]);
    const combo = { cards, weight: 1 };
    // Exclude merely playing the board, including board-only two pair/trips.
    const strongValue = made.category >= HandCategory.TwoPair && made.category > boardHand.category;
    const topPair = made.category === HandCategory.Pair &&
      (cards.some(c => c.rank === topRank) || cards[0].rank === cards[1].rank && cards[0].rank > topRank);
    if (strongValue) strong.push(combo);
    if (strongValue || topPair) thin.push(combo);
    // Explicit weak unpaired holdings; no made straights/flushes or board-only
    // monsters called "bluffs". This model does not pretend to identify missed draws.
    if (made.category <= HandCategory.Pair && cards[0].rank !== cards[1].rank &&
        cards.every(c => board.every(b => b.rank !== c.rank))) bluffs.push(combo);
  }
  const profiles = [
    { label: "Strong value / 10% bluffs", value: strong, bluffShare: 0.10,
      valueAssumption: "Two pair or better with a higher hand category than the board." },
    { label: "Thin value / 30% bluffs", value: thin, bluffShare: 0.30,
      valueAssumption: "The strong-value bucket plus top pair and overpairs." },
  ];
  return profiles.map(p => {
    if (!p.value.length || !bluffs.length) throw new Error(`${p.label}: no legal ${!p.value.length ? "value" : "bluff"} combinations; assumption cannot be evaluated`);
    return {
      label: p.label, valueAssumption: p.valueAssumption, bluffShare: p.bluffShare,
      bluffAssumption: "Unpaired hole cards matching no board rank, with at most one pair in the best hand; uniform within each bucket.",
      valueCombos: p.value.length, bluffCombos: bluffs.length,
      range: createComboRange([
        ...p.value.map(c => ({ ...c, weight: (1 - p.bluffShare) / p.value.length })),
        ...bluffs.map(c => ({ ...c, weight: p.bluffShare / bluffs.length })),
      ]),
    };
  });
}
