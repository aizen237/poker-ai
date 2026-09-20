import { evaluateBest, HAND_CATEGORY_NAMES } from "@poker-ai/poker-engine";
import type { DecisionPacket } from "./decisionPacket.js";
import type { Recommendation } from "./recommendation.js";

export interface ConsistencyResult {
  isConsistent: boolean;
  /** Human-readable, for logging -- not shown to end users, and never blocks or replaces the recommendation (unlike validateActionLegality). */
  warnings: string[];
}

/**
 * Deterministic check for whether the AI's stated reasoning contradicts
 * a fact it was actually given. v1 covers exactly one thing: whether the
 * reasoning names a made-hand category other than hero's real one (e.g.
 * says "flush" when the true hand is two pair). Deliberately narrow --
 * this is a controlled, 9-word vocabulary, so false positives are rare,
 * unlike fuzzier checks (e.g. "does the reasoning's tone imply a
 * different action") which risk flagging normal prose as a contradiction.
 *
 * This does NOT judge strategic quality, and does NOT block or replace
 * the recommendation the way validateActionLegality does -- a
 * contradiction here means the AI's language doesn't match the facts,
 * not that the action itself is illegal or wrong. Surfaced as a warning
 * for a person reviewing the log, nothing more yet.
 */
export function validateReasoningConsistency(recommendation: Recommendation, packet: DecisionPacket): ConsistencyResult {
  const warnings: string[] = [];
  const allCards = [...packet.hero.holeCards, ...packet.table.board];

  // Same precondition as the prompt builders' own "made hand" line --
  // fewer than 5 total cards means there's no made hand to contradict.
  if (allCards.length >= 5) {
    const actualCategory = HAND_CATEGORY_NAMES[evaluateBest(allCards).category];
    const mentioned = findMentionedHandCategories(recommendation.reasoning);
    if (mentioned.length > 0 && !mentioned.includes(actualCategory)) {
      warnings.push(
        `Reasoning mentions ${mentioned.join("/")} but hero's actual made hand is ${actualCategory}.`,
      );
    }
  }

  return { isConsistent: warnings.length === 0, warnings };
}

/**
 * Finds which HAND_CATEGORY_NAMES appear in the text. Checks longer
 * names first and masks out each match before checking shorter ones, so
 * "Two Pair" doesn't also spuriously register as a "Pair" mention (the
 * only real substring collision in this 9-name vocabulary).
 */
function findMentionedHandCategories(text: string): string[] {
  const lower = text.toLowerCase();
  const sortedByLengthDesc = [...HAND_CATEGORY_NAMES].sort((a, b) => b.length - a.length);
  let masked = lower;
  const found: string[] = [];
  for (const name of sortedByLengthDesc) {
    const needle = name.toLowerCase();
    if (masked.includes(needle)) {
      found.push(name);
      masked = masked.split(needle).join(" ".repeat(needle.length));
    }
  }
  return found;
}