import { afterEach, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
const mocks = vi.hoisted(() => ({ read: vi.fn(), assess: vi.fn() }));
vi.mock("../../../apps/pokernow-extension/src/opponentStats.js", () => ({ createLiveOpponentClient: () => ({ tick() {}, observe() {}, profile() { return null; } }) }));
vi.mock("../../../apps/pokernow-extension/src/tableRead.js", () => ({ readLiveTable: mocks.read }));
vi.mock("@poker-ai/browser-reader", async importOriginal => ({ ...await importOriginal<object>(), assessLiveState: mocks.assess }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it.each(["changed DOM", "malformed result", "consensus array", "HTTP error"])("withholds %s at the live response boundary", async scenario => {
  vi.resetModules();
  const { document } = parseHTML("<html><body></body></html>");
  const location = { origin: "https://pokernow.com", pathname: "/games/test", href: "https://pokernow.com/games/test" };
  vi.stubGlobal("document", document); vi.stubGlobal("location", location); vi.stubGlobal("window", { location });
  vi.stubGlobal("localStorage", { getItem: () => null });
  let poll = () => {};
  vi.stubGlobal("setInterval", (callback: () => void) => { poll = callback; return 1; });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  let complete!: (value: unknown) => void;
  const fetchMock = vi.fn(() => new Promise(resolve => { complete = resolve; }));
  vi.stubGlobal("fetch", fetchMock);
  let observedStack = 25;
  mocks.read.mockImplementation(() => ({ raw: { observedStack }, context: { readErrors: [], dealerSeatNumber: 2 }, raiseControl: null }));
  // Synthetic independently verified policy inputs solely to reach the response
  // boundary in this test. Real live pot/legality gates remain disabled.
  const seats = [
    { seatNumber: 1, isOccupied: true, isYou: true, playerName: "Hero", stack: 18, currentBet: 0, isCurrentToAct: true, isChecking: true,
      isFolded: false, isOffline: false, holeCards: [{ rank: 14, suit: "h" }, { rank: 13, suit: "h" }] },
    { seatNumber: 2, isOccupied: true, isYou: false, playerName: "Opponent", stack: 25, currentBet: 3, isCurrentToAct: false, isChecking: false,
      isFolded: false, isOffline: false, holeCards: [] },
  ];
  mocks.assess.mockReturnValue({ state: { seats, street: "flop", board: [{ rank: 2, suit: "s" }, { rank: 8, suit: "s" }, { rank: 8, suit: "d" }], potMainValue: 4, potTotalValue: 7 },
    confidence: { level: "high", reasons: [] }, bigBlind: 2, smallBlind: 1, amountToCall: 3, activeOpponents: 1,
    positions: new Map([[1, "BB"], [2, "BTN"]]), decisionPot: 7,
    pot: { unit: "chips", mainPot: 4, displayedTotalPot: 7, decisionPot: 7, decisionPotSource: "test evidence", isPotSemanticsVerified: true } });
  await import("../../../apps/pokernow-extension/src/contentScript.js");
  poll();
  expect(fetchMock).toHaveBeenCalledOnce();
  if (scenario === "changed DOM") observedStack = 20; // No second poll: re-read at delivery.
  const result = scenario === "consensus array" ? [] : { action: scenario === "malformed result" ? "INVALID" : "CALL", confidence: 0.99, reasoning: "stale recommendation" };
  complete({ ok: scenario !== "HTTP error", json: async () => ({ ok: true, result }) });
  await vi.waitFor(() => expect(document.getElementById("poker-ai-reader-overlay")!.textContent).toContain(scenario === "changed DOM" ? "Table changed" : "invalid response"));
  expect(document.getElementById("poker-ai-reader-overlay")!.textContent).not.toContain("stale recommendation");
});
