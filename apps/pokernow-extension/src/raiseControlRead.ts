import { parseChipsValueText } from "@poker-ai/browser-reader";

export const RAISE_SELECTORS = {
  form: "form.raise-controller-form",
  amount: ".raise-bet-value",
  input: "input.value",
  displayedBB: ".bb-value",
  submit: '.action-buttons input[type="submit"].action-button.bet',
} as const;

/** Layout evidence only; visibility does not establish action legality. */
export function isControlVisible(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.hasAttribute("hidden")) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** Reads the selected total, never a legal minimum or a slider value. */
export function readRaiseControl(
  root: ParentNode = document,
  isVisible: (element: Element) => boolean = isControlVisible,
) {
  const issues: string[] = [];
  const forms = [...root.querySelectorAll(RAISE_SELECTORS.form)].filter(isVisible);
  const form = forms.length === 1 ? forms[0]! : null;
  if (forms.length > 1) issues.push("Multiple visible raise forms");
  const containers = form ? [...form.querySelectorAll(RAISE_SELECTORS.amount)].filter(isVisible) : [];
  const container = containers.length === 1 ? containers[0]! : null;
  if (form && containers.length === 0) issues.push("Visible raise form has no visible amount container");
  if (containers.length > 1) issues.push("Multiple visible raise amount containers");
  const inputs = container ? [...container.querySelectorAll<HTMLInputElement>(RAISE_SELECTORS.input)].filter(isVisible) : [];
  const input = inputs.length === 1 ? inputs[0]! : null;
  if (container && inputs.length !== 1) issues.push("Expected exactly one visible selected raise-to input");
  // Read the live value property, not the initial HTML value attribute.
  const selectedRaiseToText = input?.value ?? null;
  let selectedRaiseToChips: number | null = null;
  if (selectedRaiseToText !== null) {
    try { selectedRaiseToChips = parseChipsValueText(selectedRaiseToText); }
    catch { issues.push("Selected raise-to amount is unreadable"); }
  }
  const bbDisplays = container ? [...container.querySelectorAll(RAISE_SELECTORS.displayedBB)].filter(isVisible) : [];
  if (bbDisplays.length > 1) issues.push("Multiple visible raise BB displays");
  const submits = form ? [...form.querySelectorAll<HTMLInputElement>(RAISE_SELECTORS.submit)].filter(isVisible) : [];
  const submit = submits.length === 1 ? submits[0]! : null;
  if (form && submits.length !== 1) issues.push("Expected exactly one visible Raise submit control");
  const raiseSubmitVisible = submit?.value.trim().toLowerCase() === "raise";
  if (submit && !raiseSubmitVisible) issues.push("Submit control is not labeled Raise");
  return {
    formVisible: forms.length > 0,
    amountControlVisible: containers.length > 0,
    selectedRaiseToText,
    selectedRaiseToChips,
    selectedRaiseToSource: selectedRaiseToChips === null ? null : ".raise-bet-value input.value (live value property)",
    displayedBBText: bbDisplays.length === 1 ? bbDisplays[0]!.textContent : null,
    submitText: submit?.value ?? null,
    raiseSubmitVisible,
    raiseSubmitEnabled: raiseSubmitVisible && submit !== null
      ? !submit.disabled && !submit.hasAttribute("disabled") && !submit.closest('fieldset[disabled], [inert], [aria-disabled="true"]')
      : null,
    issues,
  };
}
