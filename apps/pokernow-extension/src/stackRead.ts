import { isAllInStackText, parseChipsValueText } from "@poker-ai/browser-reader";

/** Read display components only. A settlement base is NOT a settled remaining stack. */
export function readStackDisplay(container: Element | null, winner: boolean) {
  const values = [...(container?.querySelectorAll(".normal-value") ?? [])];
  const prizes = [...(container?.querySelectorAll(".table-player-stack-prize") ?? [])];
  const isSettling = winner || prizes.length > 0;
  let stackText: string | null = null;
  let awardText: string | null = null;
  let awardChips: number | null = null;
  let reason: string | null = null;
  const numeric = (text: string | null) => {
    try { return text === null ? null : parseChipsValueText(text); } catch { return null; }
  };
  const residual = (element: Element) => {
    const copy = element.cloneNode(true) as Element;
    copy.querySelectorAll(".normal-value, .bb-value").forEach(node => node.remove());
    return copy.textContent?.trim() ?? "";
  };
  const chipValue = (element: Element | undefined): Element | null => {
    if (!element?.classList.contains("chips-value")) return null;
    const normal = element.querySelectorAll(".normal-value");
    if (normal.length !== 1 || normal[0]!.parentElement !== element ||
        [...element.children].some(child => !child.classList.contains("normal-value") && !child.classList.contains("bb-value")) ||
        residual(element) !== "") return null;
    return normal[0]!;
  };

  if (!container) {
    reason = "stack container missing or ambiguous";
  } else if (prizes.length > 0) {
    // Captured live structure: direct chips-value base, then direct prize wrapper.
    // Never choose the first of two arbitrary numbers or add the prize to the base.
    const children = [...container.children];
    const base = chipValue(children[0]);
    const prize = prizes[0]!;
    const award = prize.children.length === 1 ? chipValue(prize.children[0]) : null;
    const outside = container.cloneNode(true) as Element;
    [...outside.children].forEach(child => child.remove());
    const amount = numeric(award?.textContent ?? null);
    if (prizes.length === 1 && children.length === 2 && children[1] === prize &&
        values.length === 2 && base && award && numeric(base.textContent) !== null &&
        amount !== null && amount > 0 && !prize.classList.contains("red") &&
        residual(prize) === "+" && (outside.textContent?.trim() ?? "") === "") {
      stackText = base.textContent;
      awardText = prize.textContent;
      awardChips = amount;
    } else {
      reason = "settlement stack/award structure is ambiguous or unsupported";
    }
  } else if (values.length === 1) {
    const value = values[0]!;
    const children = [...container.children];
    const structurallyKnown = children.length === 1 &&
      (children[0] === value || chipValue(children[0]) === value);
    if (structurallyKnown && residual(container) === "" &&
        (numeric(value.textContent) !== null || isAllInStackText(value.textContent))) {
      stackText = value.textContent;
    } else {
      reason = "stack value has unsupported structure or non-numeric text";
    }
  } else if (values.length > 1) {
    reason = `ambiguous stack values (${values.length}); no verified prize separation`;
  } else if (!isAllInStackText(container.textContent)) {
    reason = "stack has no supported numeric value or explicit All In label";
  }

  return {
    stackText, isSettling,
    evidence: {
      status: reason ? "unknown" : isSettling ? "settlement_display" : "ordinary_display",
      reason, displayedBaseText: stackText, displayedBaseChips: numeric(stackText),
      awardText, awardChips, normalValueCount: values.length, prizeCount: prizes.length,
      winnerClass: winner,
      remainingStackReason: isSettling ? "Settlement base/award display is transient; wait for a stable remaining stack." : reason,
      source: "PokerNow stack DOM; prize is display evidence only, never a ledger adjustment",
    },
  };
}
