import { isControlVisible } from "./raiseControlRead.js";
export const CALL_OBSERVATION_SOURCE = "visible native CALL label; observation only";

/** Native BUTTON/type=button/text="Call 2" is present in saved diagnostics.
 * No PokerNow-specific CALL selector/DOM hierarchy or server permission is
 * established by those observations. Keep this a label-based UI cross-check. */
export function readCallControl(root: ParentNode = document,
  isVisible: (element: Element) => boolean = isControlVisible) {
  const observedAt = Date.now();
  const candidates = [...root.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]')]
    .filter(el => isVisible(el) && /^call\b/i.test((el.tagName === "INPUT"
      ? (el as HTMLInputElement).value : el.textContent ?? "").trim()));
  const issues: string[] = [];
  const contradictions: string[] = [];
  if (candidates.length > 1) contradictions.push("Multiple visible CALL-labeled controls; no unique readiness observation.");
  const el = candidates.length === 1 ? candidates[0]! : null;
  const rawText = el ? el.tagName === "INPUT" ? (el as HTMLInputElement).value : el.textContent : null;
  const supported = el?.tagName === "BUTTON" && el.getAttribute("type") === "button";
  if (el && !supported) issues.push("CALL control structure is outside the observed native button/type=button shape.");
  const match = rawText?.trim().match(/^call\s+(\d+(?:\.\d+)?)$/i);
  const amount = match ? Number(match[1]) : null;
  const amountChips = supported && amount !== null && Number.isFinite(amount) && amount <= Number.MAX_SAFE_INTEGER
    ? amount : null;
  if (el && amountChips === null) issues.push("CALL label does not provide one supported chip amount.");
  const aria = el?.getAttribute("aria-label");
  if (aria && aria.trim().replace(/\s+/g, " ").toLowerCase() !== rawText?.trim().replace(/\s+/g, " ").toLowerCase())
    contradictions.push("CALL accessibility label contradicts or differs from its visible text.");
  return {
    source: CALL_OBSERVATION_SOURCE, observedAt,
    serverAuthorization: "unproven" as const, visibleCount: candidates.length,
    tag: el?.tagName ?? null, type: el?.getAttribute("type") ?? null, rawText,
    amountChips, enabled: el ? !(el as HTMLButtonElement).disabled && !el.hasAttribute("disabled") &&
      !el.closest('fieldset[disabled], [inert], [aria-disabled="true"]') : null,
    issues: [...contradictions, ...issues], contradictions,
  };
}
