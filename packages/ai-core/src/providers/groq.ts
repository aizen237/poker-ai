import { formatCards } from "@poker-ai/shared";
import { evaluateBest } from "@poker-ai/poker-engine";
import { buildAuditRecord } from "../auditRecord.js";
import type { DecisionPacket } from "../decisionPacket.js";
import { parseRecommendation, type Recommendation } from "../recommendation.js";
import type { AIProvider, AIProviderMetadata, GetRecommendationOptions } from "../provider.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const PROMPT_VERSION = "v3-equity-source";

const HAND_CATEGORY_NAMES = [
  "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight",
  "Flush", "Full House", "Four of a Kind", "Straight Flush",
];

/**
 * Builds the prompt from a decision packet. Deliberately concise and
 * structured -- per Rule 4/12 of the original spec, the AI should not
 * receive a huge unnecessary conversation, just the already-computed
 * numbers it needs to reason over.
 *
 * Hero's made hand category is computed via evaluateBest (a function
 * we've tested against 24 known hand-ranking cases) and handed to the
 * AI as an explicit fact, rather than left for the model to infer from
 * raw cards -- this closes a real error we observed in testing, where
 * the model misdescribed ace-king-high as "a premium overpair."
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

  if (packet.dataConfidence !== "high") {
    lines.push(`NOTE: data confidence is ${packet.dataConfidence} -- factor this uncertainty into your reasoning.`);
  }

  lines.push("");
  lines.push(`Respond with ONLY a JSON object matching this exact shape, no markdown, no extra text:`);
  lines.push(`{"action": "FOLD"|"CHECK"|"CALL"|"BET"|"RAISE"|"ALL_IN", "sizingBB": number (optional), "confidence": number 0-1, "reasoning": string, "alternative": {"action": ..., "reasoning": ...} (optional)}`);

  return lines.join("\n");
}

export interface GroqProviderOptions {
  apiKey: string;
  model?: string;
}

export function createGroqProvider(providerOptions: GroqProviderOptions): AIProvider {
  const model = providerOptions.model ?? "openai/gpt-oss-120b";

  const metadata: AIProviderMetadata = {
    name: `groq:${model}`,
    supportsVision: false,
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
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerOptions.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Groq API error (${response.status}): ${body}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
      };

      rawContent = data.choices[0]?.message.content;
      if (!rawContent) {
        throw new Error("Groq API returned no content");
      }

      const recommendation = parseRecommendation(rawContent);
      const latencyMs = Date.now() - start;

      options.onAuditRecord?.(
        buildAuditRecord({
          sessionId: options.sessionId ?? "unknown-session",
          handId: options.handId ?? "unknown-hand",
          decisionPacket: packet,
          provider: "groq",
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
          provider: "groq",
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