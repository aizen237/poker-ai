import { formatCards } from "@poker-ai/shared";
import { evaluateBest, HAND_CATEGORY_NAMES } from "@poker-ai/poker-engine";
import { buildAuditRecord } from "../auditRecord.js";
import type { DecisionPacket } from "../decisionPacket.js";
import { parseRecommendation, type Recommendation } from "../recommendation.js";
import type { AIProvider, AIProviderMetadata, GetRecommendationOptions } from "../provider.js";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const PROMPT_VERSION = "v4-decision-policy";

/**
 * Identical prompt-building logic to the Groq provider -- deliberately
 * duplicated rather than shared for now, since the two providers may
 * need to diverge (different context limits, different structured-output
 * support) as more get added. If this duplication grows unwieldy across
 * 3+ providers, extracting a shared prompt builder becomes worth it --
 * not yet, with just two.
 */
function buildPrompt(packet: DecisionPacket): string {
  const lines: string[] = [];

  lines.push(`You are a No-Limit Texas Hold'em decision assistant.`);
  lines.push(`Hero holds ${formatCards(packet.hero.holeCards)} in ${packet.hero.position}, stack ${packet.hero.stackBB}BB.`);
  lines.push(`Street: ${packet.table.street}. Board: ${packet.table.board.length ? formatCards(packet.table.board) : "(none yet)"}.`);

  const allCards = [...packet.hero.holeCards, ...packet.table.board];
  if (allCards.length >= 5) {
    const evaluated = evaluateBest(allCards);
    lines.push(`Hero's CURRENT MADE HAND (already computed, do not recompute or contradict this): ${HAND_CATEGORY_NAMES[evaluated.category]}.`);
  } else {
    lines.push(`Hero has no made hand yet (fewer than 5 total cards) -- preflop or very early street.`);
  }

  lines.push(`Pot: ${packet.table.potBB}BB. Opponents remaining: ${packet.table.numOpponentsRemaining}.`);
  lines.push(`Facing: ${packet.facingAction.type}${packet.facingAction.amountBB ? ` of ${packet.facingAction.amountBB}BB` : ""}.`);
  lines.push(`Candidate actions (the only ones on the table right now): ${packet.candidateActions.join(", ")}.`);

  const calc = packet.engineCalculations;
  if (calc.equity !== undefined) {
    lines.push(`Hero's equity: ${(calc.equity * 100).toFixed(1)}%.`);
    const sourceDescription =
      calc.equitySource === "estimated_range"
        ? "estimated against the opponent's likely range, inferred from their actions this hand (heads-up only)"
        : calc.equitySource === "random_hands"
          ? "computed against random hands, not a modeled range (used for multiway pots, or as a heads-up fallback)"
          : "source not recorded -- treat with extra caution";
    lines.push(`Equity basis: ${sourceDescription}.`);
  }
  if (calc.potOddsBreakevenPercent !== undefined) lines.push(`Pot odds breakeven: ${calc.potOddsBreakevenPercent.toFixed(1)}%.`);
  if (calc.callEV !== undefined) lines.push(`EV of calling: ${calc.callEV.toFixed(2)}BB.`);
  if (calc.spr !== undefined) lines.push(`SPR: ${calc.spr.toFixed(1)}.`);
  if (calc.outs !== undefined) lines.push(`Outs: ${calc.outs}.`);
  if (calc.boardTexture) {
    lines.push(`Board texture: ${calc.boardTexture.overall} (${calc.boardTexture.suitTexture}, ${calc.boardTexture.pairTexture}, ${calc.boardTexture.connectivity}).`);
  }

  if (packet.opponentContext?.estimatedRangeDescription) {
    lines.push(`Opponent read: ${packet.opponentContext.estimatedRangeDescription}`);
  }

  if (packet.dataConfidence !== "high") {
    lines.push(`NOTE: data confidence is ${packet.dataConfidence} -- factor this uncertainty into your reasoning.`);
  }

  lines.push("");
  lines.push(`Respond with ONLY a JSON object matching this exact shape, no markdown, no extra text:`);
  lines.push(`{"action": "FOLD"|"CHECK"|"CALL"|"BET"|"RAISE"|"ALL_IN", "sizingBB": number (optional), "confidence": number 0-1, "reasoning": string, "alternative": {"action": ..., "reasoning": ...} (optional)}`);

  return lines.join("\n");
}

export interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
}

export function createGeminiProvider(providerOptions: GeminiProviderOptions): AIProvider {
  const model = providerOptions.model ?? "gemini-3.5-flash";

  const metadata: AIProviderMetadata = {
    name: `gemini:${model}`,
    supportsVision: true,
    supportsStructuredOutput: false,
    isFree: true,
  };

  async function getRecommendation(
    packet: DecisionPacket,
    options: GetRecommendationOptions = {},
  ): Promise<Recommendation> {
    const prompt = buildPrompt(packet);
    const start = Date.now();
    let rawContent: string | undefined;

    try {
      const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": providerOptions.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${body}`);
      }

      const data = (await response.json()) as {
        candidates?: { content: { parts: { text: string }[] } }[];
      };

      rawContent = data.candidates?.[0]?.content.parts[0]?.text;
      if (!rawContent) {
        throw new Error("Gemini API returned no content");
      }

      const recommendation = parseRecommendation(rawContent);
      const latencyMs = Date.now() - start;

      options.onAuditRecord?.(
        buildAuditRecord({
          sessionId: options.sessionId ?? "unknown-session",
          handId: options.handId ?? "unknown-hand",
          decisionPacket: packet,
          provider: "gemini",
          model,
          promptVersion: PROMPT_VERSION,
          latencyMs,
          rawResponse: rawContent,
          parsedRecommendation: recommendation,
        }),
      );

      return recommendation;
    } catch (error) {
      const latencyMs = Date.now() - start;
      options.onAuditRecord?.(
        buildAuditRecord({
          sessionId: options.sessionId ?? "unknown-session",
          handId: options.handId ?? "unknown-hand",
          decisionPacket: packet,
          provider: "gemini",
          model,
          promptVersion: PROMPT_VERSION,
          latencyMs,
          ...(rawContent !== undefined ? { rawResponse: rawContent } : {}),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }
  }

  return { metadata, getRecommendation };
}