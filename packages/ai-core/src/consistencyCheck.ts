import { evaluateBest, HAND_CATEGORY_NAMES } from "@poker-ai/poker-engine";
import type { DecisionPacket } from "./decisionPacket.js";
import type { Recommendation } from "./recommendation.js";

export interface ConsistencyResult {
  isConsistent: boolean;
  /** Human-readable, for logging and the overlay -- never blocks or replaces the recommendation (unlike validateActionLegality). */
  warnings: string[];
}

/**
 * Any whitespace, hyphen, or Unicode hyphen/dash (U+2010-U+2013). LLM
 * output often uses a non-breaking hyphen (U+2011) that a plain "-"
 * would silently fail to match.
 */
const SEP = "[\\s\\-\\u2010-\\u2013]";

const CATEGORY_PATTERNS = [
  { name: "High Card", pattern: `high${SEP}card` },
  { name: "Pair", pattern: "pairs?" },
  { name: "Two Pair", pattern: `two${SEP}pairs?` },
  { name: "Three of a Kind", pattern: `three${SEP}of${SEP}a${SEP}kind` },
  // Negative lookahead so "straight flush" isn't ALSO read as a "straight" claim.
  { name: "Straight", pattern: `straight(?!${SEP}flush)` },
  { name: "Flush", pattern: "flush" },
  { name: "Full House", pattern: `full${SEP}house` },
  { name: "Four of a Kind", pattern: `four${SEP}of${SEP}a${SEP}kind` },
  { name: "Straight Flush", pattern: `straight${SEP}flush` },
] as const;

/** "Hero has", "You've made", "We hold", "Hero only has", "Hero is holding", ... */
const CLAIM_PREFIX =
  "\\b(?:hero|you|we)(?:['\\u2019]ve)?\\s+(?:(?:only|just|already|now|currently|still|is|are)\\s+)*" +
  "(?:has|have|had|hold|holds|holding|made|make|makes|flopped|turned|hit|hits|got|own|owns)";

/** Short adjectives/articles allowed between the verb and the category: "a middle pair", "only bottom-pair". */
const FILLER_WORDS =
  "only|just|a|an|the|top|middle|bottom|weak|strong|marginal|made|nut|low|high|small|big|solid|decent|current|already|now|still";

/** A category followed by one of these is a draw/possibility, not a made hand: "flush draw", "straight outs". */
const NOT_A_MADE_HAND = "draws?|possibilit\\w*|potential|outs?|blockers?|equity";

/**
 * Finds which hand categories the reasoning explicitly claims HERO has.
 * A mention only counts when it's anchored to a hero-subject claim
 * ("Hero has two pair") -- so "the board is paired", "opponents could
 * hold a flush", and "a flush draw" are all correctly ignored.
 */
function findHeroClaimedHandCategories(text: string): string[] {
  const found: string[] = [];
  for (const { name, pattern } of CATEGORY_PATTERNS) {
    const claim = new RegExp(
      `${CLAIM_PREFIX}(?:${SEP}+(?:${FILLER_WORDS})){0,4}${SEP}+(?:${pattern})\\b(?!${SEP}+(?:${NOT_A_MADE_HAND}))`,
      "i",
    );
    if (claim.test(text)) found.push(name);
  }
  return found;
}

/**
 * Deterministic check for whether the AI's stated reasoning contradicts
 * a fact it was actually given: specifically, whether it explicitly
 * claims hero has a made-hand category other than hero's real one.
 *
 * Deliberately conservative -- a false alarm shown in the overlay
 * teaches the user to ignore warnings, which is worse than missing a
 * contradiction. KNOWN LIMITATION: it only recognizes explicit
 * "Hero has / You've made ..." phrasing, so a contradiction worded any
 * other way ("your hand is a flush") is not caught.
 *
 * This does NOT judge strategic quality, and does NOT block or replace
 * the recommendation the way validateActionLegality does.
 */
export function validateReasoningConsistency(recommendation: Recommendation, packet: DecisionPacket): ConsistencyResult {
  const warnings: string[] = [];
  const allCards = [...packet.hero.holeCards, ...packet.table.board];

  // Same precondition as the prompt builders' own "made hand" line --
  // fewer than 5 total cards means there's no made hand to contradict.
  if (allCards.length >= 5) {
    const actualCategory = HAND_CATEGORY_NAMES[evaluateBest(allCards).category];
    const claimed = findHeroClaimedHandCategories(recommendation.reasoning);
    if (claimed.length > 0 && !claimed.includes(actualCategory)) {
      warnings.push(
        `Reasoning claims hero has ${claimed.join("/")} but hero's actual made hand is ${actualCategory}.`,
      );
    }
  }

  return { isConsistent: warnings.length === 0, warnings };
}