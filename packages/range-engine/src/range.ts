import type { Card } from "@poker-ai/shared";
import { allHandTypes, expandHandType, formatHandType, parseHandType, type HandType } from "./handNotation.js";

/** Maps hand type notation (e.g. "AKs") to a weight 0-1 (0 = excluded). */
export type Range = Map<string, number>;

/** Creates an empty range (no hands included). */
export function emptyRange(): Range {
  return new Map();
}

/** Adds or updates a hand type's weight in a range. Weight must be 0-1. */
export function setHandWeight(range: Range, hand: HandType | string, weight: number): Range {
  if (weight < 0 || weight > 1) {
    throw new Error(`Weight must be between 0 and 1, got ${weight}`);
  }
  const key = typeof hand === "string" ? formatHandType(parseHandType(hand)) : formatHandType(hand);
  const next = new Map(range);
  if (weight === 0) {
    next.delete(key);
  } else {
    next.set(key, weight);
  }
  return next;
}

export function getHandWeight(range: Range, hand: HandType | string): number {
  const key = typeof hand === "string" ? formatHandType(parseHandType(hand)) : formatHandType(hand);
  return range.get(key) ?? 0;
}

/**
 * Builds a range from a simple list of hand type strings, all at weight 1
 * (always included). Convenient for defining static opening ranges.
 */
export function rangeFromList(hands: readonly string[]): Range {
  const range: Range = new Map();
  for (const h of hands) {
    range.set(formatHandType(parseHandType(h)), 1);
  }
  return range;
}

/** Total combos in the range, weighted (e.g. AA at weight 1 = 6, at 0.5 = 3). */
export function rangeComboCount(range: Range): number {
  let total = 0;
  for (const [handStr, weight] of range) {
    const combos = expandHandType(parseHandType(handStr)).length;
    total += combos * weight;
  }
  return total;
}

/**
 * Expands a range into actual [Card,Card] combinations, weighted, with
 * any combo overlapping `excludeCards` removed (e.g. hero's own hole
 * cards or known board cards can't also be in an opponent's range).
 */
export interface WeightedCombo {
  cards: [Card, Card];
  weight: number;
}

export function expandRange(range: Range, excludeCards: readonly Card[] = []): WeightedCombo[] {
  const excludeIds = new Set(excludeCards.map((c) => `${c.rank}${c.suit}`));
  const result: WeightedCombo[] = [];

  for (const [handStr, weight] of range) {
    const combos = expandHandType(parseHandType(handStr));
    for (const combo of combos) {
      const overlaps = combo.some((c) => excludeIds.has(`${c.rank}${c.suit}`));
      if (!overlaps) {
        result.push({ cards: combo, weight });
      }
    }
  }
  return result;
}

/** Percentage of all 169 hand types (unweighted count, not combo-weighted) included at all. */
export function rangePercentile(range: Range): number {
  return (range.size / allHandTypes().length) * 100;
}