import type { DecisionPacket, ScopedProof } from "@poker-ai/ai-core";
import type { LiveStateAssessment } from "@poker-ai/browser-reader";
import type { LiveTableRead } from "./tableRead.js";
import type { LiveTimelineDiagnostic } from "./liveTimeline.js";
import { currentFirstUtg, currentHj, currentCo, currentBtn, currentSb } from "./firstUtgLive.js";

/** ONE producer for engine sizing and raiseLegality. No bound/grid inference
 * from mR, mAVTB, nR, slider attributes or HTML validity. See Phases 2/3B-3E. */
export function openingSizeEvidence(read: LiveTableRead, assessment: LiveStateAssessment,
  timeline: LiveTimelineDiagnostic | null, epoch: string) {
  type Exact = NonNullable<NonNullable<DecisionPacket["preflopExecution"]>["exactOpeningSize"]>;
  const fail = (reason: string, contradicted = false): { size: Exact | null; proof: ScopedProof } => ({ size: null,
    proof: { scope: "raiseLegality", status: contradicted ? "contradicted" : "insufficient", confidence: "low",
      provenance: ["Dependent UTG/HJ/CO/BTN/SB exact five-chip opening rule"], reasons: [reason] } });
  const utg = currentFirstUtg(read, assessment, timeline);
  const hj = currentHj(read, assessment, timeline);
  const co = currentCo(read, assessment, timeline);
  const btn = currentBtn(read, assessment, timeline);
  const sb = currentSb(read, assessment, timeline);
  const first = utg ?? hj ?? co ?? btn ?? sb;
  const role = utg ? "UTG" : hj ? "HJ" : co ? "CO" : btn ? "BTN" : "SB";
  const proof = utg ? timeline?.sourceStatus.firstUtgProof : hj ? timeline?.sourceStatus.hjProof : co ? timeline?.sourceStatus.coProof : btn ? timeline?.sourceStatus.btnProof : timeline?.sourceStatus.sbProof;
  if (!first || !proof || Date.now() < first.receivedAt || Date.now() >= proof.expiresAt ||
      proof.expiresAt !== first.receivedAt + 10_000)
    return fail("No fresh cross-checked UTG/HJ/CO/BTN/SB decision proof; sizing cannot renew source evidence.");
  if (first.openingSizeProfile !== "pokernow-0.1.72-th-4fun-1-2-exact5-v1")
    return fail("Unknown or changed PokerNow exact-five-chip rule profile/version.");
  const hero = assessment.state!.seats.find(s => s.isYou)!;
  const sourceHero = first.players.find(p => p.playerId === first.heroId)!;
  const contribution = sb ? 1 : 0;
  const investment = sb ? 4 : 5;
  if (!epoch || first.bigBlind !== 2 || sourceHero.position !== role ||
      sourceHero.contribution !== contribution || hero.stack === null || hero.stack < 200 || hero.stack <= investment)
    return fail("Exact five-chip rule requires a supported first opening turn, its proven contribution and deep remaining capacity.");
  const c = read.raiseControl;
  if (c.issues.length) return fail(`Contradictory Raise controls: ${c.issues.join("; ")}`, true);
  if (c.formVisible && (!c.amountControlVisible || !c.raiseSubmitVisible || c.raiseSubmitEnabled !== true))
    return fail("Open Raise panel lacks a usable selected input or enabled Raise submit.");
  // A different selection is NOT readiness for our certified total. It does not
  // itself contradict that total's legality. Never certify the selected size.
  const bbMatch = c.displayedBBText?.trim().match(/^(\d+(?:\.\d+)?)\s*BB$/);
  if (c.formVisible && (c.selectedRaiseToChips === null || c.selectedRaiseToChips < contribution || c.selectedRaiseToChips - contribution > hero.stack || !bbMatch ||
      Number(bbMatch[1]) * 2 !== c.selectedRaiseToChips))
    return fail("Visible selected amount/BB display/capacity observations contradict each other.", true);
  if (!c.formVisible && (c.amountControlVisible || c.raiseSubmitVisible || c.selectedRaiseToChips !== null))
    return fail("Raise-control visibility/amount observations contradict a closed panel.", true);
  const provenance = sb ? "Exact-size empirical SB rule: paired hand224 screenshot shows input5/2.5BB with SB1; matching cards/stacks/table and user pairing link frame11 accepted tB[hero]=5/cHB=5 to frame12 BB turn. Total5 minus posted1 means additional4. Same 0.1.72 normal no-ante 1/2 play-money profile; not live server preflight or general min/max/grid. Historical acceptance was after expiry; original fresh sbProof deadline applies." : "Exact-size empirical rule: hand169 first-UTG server acceptance (frame66 tB[hero]=5, cHB=5, frame67 next actor), matching 0.1.72 normal no-ante 1/2 play-money Hold'em profile. Not a live server acknowledgment, generic minimum, maximum or chip grid. " +
    (utg ? "Original firstUtgProof deadline applies." : `${role} equivalence: explicit zero-contribution ${hj ? "UTG fold then first HJ turn" : co ? "UTG fold, HJ turn/fold then first CO turn" : "UTG fold, HJ turn/fold, CO turn/fold then first BTN turn"}; unchanged forced-blind wagers/profile, no prior hero action or reopening restriction. Original ${hj ? "hjProof" : co ? "coProof" : "btnProof"} activation deadline applies, not the anchor's time.`);
  const size: Exact = { rule: sb ? "pokernow-0.1.72-th-4fun-1-2-sb-exact5-v1" : first.openingSizeProfile, provenance, decisionWindow: proof.scope,
    tableId: first.tableId, handId: first.handId, heroId: first.heroId, heroSeat: first.heroSeat,
    generation: first.generation, sourceCursor: first.cursor, decisionEpoch: epoch,
    receivedAt: first.receivedAt, expiresAt: proof.expiresAt, units: "chips", bigBlindChips: 2,
    contributionChips: contribution, raiseToChips: 5, investmentChips: investment, remainingStackChips: hero.stack,
    controls: !c.formVisible ? "panel_closed_unchecked" : c.selectedRaiseToChips === 5 ? "selected_amount_matches" : "selected_amount_differs" };
  return { size, proof: { scope: "raiseLegality", status: "proven", confidence: "high",
    provenance: [provenance, `Table ${first.tableId}, hand ${first.handId}, actor ${first.heroId}, generation ${first.generation}, cursor ${first.cursor}, epoch ${epoch}, expiry ${proof.expiresAt}.`], reasons: [] } satisfies ScopedProof };
}
