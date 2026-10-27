import { cardId, fullDeck, validateSimulationInput, type Card } from "@poker-ai/shared";
import { combinations, evaluateBest, HandCategory } from "@poker-ai/poker-engine";
import { createComboRange, type ComboWeight } from "./comboRange.js";

/** Hypotheses only, not inferred tendencies or a solver betting strategy.
 * Uniform within each legal bucket; percentages are total range mixture mass,
 * not per-combo frequencies. Known hero cards affect removal, not classification. */
export function riverBettingAssumptions(hero: readonly Card[], board: readonly Card[]) {
  if (hero.length !== 2 || board.length !== 5) throw new Error("River assumptions require two hero cards and five board cards");
  return bettingAssumptions(hero, board);
}

/** Same explicit value/weak-hand mixture on the turn. Weak hands may include
 * semi-bluffs/draws; no action frequencies or observed tendencies are inferred. */
export function turnBettingAssumptions(hero: readonly Card[], board: readonly Card[]) {
  if (hero.length !== 2 || board.length !== 4) throw new Error("Turn assumptions require two hero cards and four board cards");
  return bettingAssumptions(hero, board);
}

/** Frozen flop hypotheses, including available draws and air in the weak bucket. */
export function flopBettingAssumptions(hero: readonly Card[], board: readonly Card[]) {
  if (hero.length !== 2 || board.length !== 3) throw new Error("Flop assumptions require two hero cards and three board cards");
  return bettingAssumptions(hero, board);
}

function bettingAssumptions(hero: readonly Card[], board: readonly Card[]) {
  validateSimulationInput([...hero, ...board], board.length, 1);
  const known = new Set([...hero, ...board].map(cardId));
  // Four cards cannot form a five-card hand. Only rank multiplicity can make
  // a board-only category at this point (no straight/flush yet).
  const counts = [...new Set(board.map(c => c.rank))].map(r => board.filter(c => c.rank === r).length);
  const boardCategory = board.length === 5 ? evaluateBest(board).category
    : counts.includes(4) ? HandCategory.FourOfAKind : counts.includes(3) ? HandCategory.ThreeOfAKind
    : counts.filter(n => n === 2).length === 2 ? HandCategory.TwoPair
    : counts.includes(2) ? HandCategory.Pair : HandCategory.HighCard;
  const topRank = Math.max(...board.map(c => c.rank));
  const strong: ComboWeight[] = [], thin: ComboWeight[] = [], bluffs: ComboWeight[] = [];
  for (const pair of combinations(fullDeck().filter(c => !known.has(cardId(c))), 2)) {
    const cards = pair as [Card, Card];
    const made = evaluateBest([...cards, ...board]);
    const combo = { cards, weight: 1 };
    // Exclude merely playing the board, including board-only two pair/trips.
    const strongValue = made.category >= HandCategory.TwoPair && made.category > boardCategory;
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
      bluffAssumption: "Unpaired hole cards matching no board rank, with at most one pair in the best hand; uniform within each bucket." +
        (board.length === 4 ? " Includes available draws/semi-bluffs and air; frozen turn range, no river betting model." :
          board.length === 3 ? " Includes available draws/semi-bluffs and air; frozen flop range, no turn/river betting model." : ""),
      valueCombos: p.value.length, bluffCombos: bluffs.length,
      range: createComboRange([
        ...p.value.map(c => ({ ...c, weight: (1 - p.bluffShare) / p.value.length })),
        ...bluffs.map(c => ({ ...c, weight: p.bluffShare / bluffs.length })),
      ]),
    };
  });
}
