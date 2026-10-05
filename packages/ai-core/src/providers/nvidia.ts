import { decisionPolicyPromptLines } from "../decisionPolicy.js";
import { preflopPromptLines } from "../preflopContext.js";
import { formatCards } from "@poker-ai/shared";
import { evaluateBest, HAND_CATEGORY_NAMES } from "@poker-ai/poker-engine";
import { buildAuditRecord } from "../auditRecord.js";
import { describeEquitySource, opponentRangePromptLines, type DecisionPacket } from "../decisionPacket.js";
import { parseRecommendation, type Recommendation } from "../recommendation.js";
import type { AIProvider, AIProviderMetadata, GetRecommendationOptions } from "../provider.js";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const PROMPT_VERSION = "v9-engine-policy";

function buildPrompt(packet: DecisionPacket): string {
  const lines: string[] = [];

  lines.push("You are a No-Limit Texas Hold'em decision assistant.");
  lines.push(`Hero holds ${formatCards(packet.hero.holeCards)} in ${packet.hero.position}, stack ${packet.hero.stackBB}BB.`);
  lines.push(`Street: ${packet.table.street}. Board: ${packet.table.board.length ? formatCards(packet.table.board) : "(none yet)"}.`);

  const allCards = [...packet.hero.holeCards, ...packet.table.board];
  if (allCards.length >= 5) {
    const evaluated = evaluateBest(allCards);
    lines.push(`Hero's CURRENT MADE HAND (already computed, do not recompute or contradict this): ${HAND_CATEGORY_NAMES[evaluated.category]}.`);
  } else {
    lines.push("Hero has no made hand yet (fewer than 5 total cards) -- preflop or very early street.");
  }

  lines.push(`Pot: ${packet.table.potBB}BB. Opponents remaining: ${packet.table.numOpponentsRemaining}.`);
  lines.push(`Facing: ${packet.facingAction.type}${packet.facingAction.amountBB ? ` of ${packet.facingAction.amountBB}BB` : ""}.`);
  lines.push(`Candidate actions (the only ones on the table right now): ${packet.candidateActions.join(", ")}.`);

  lines.push(...preflopPromptLines(packet));
  lines.push(...decisionPolicyPromptLines(packet));
  const calc = packet.engineCalculations;
  if (calc.equity !== undefined) {
    lines.push(`Hero's equity: ${(calc.equity * 100).toFixed(1)}%.`);
    const sourceDescription = describeEquitySource(calc.equitySource);
    lines.push(`Equity basis: ${sourceDescription}.`);
  }
  if (calc.potOddsBreakevenPercent !== undefined) lines.push(`Pot odds breakeven: ${calc.potOddsBreakevenPercent.toFixed(1)}%.`);
  if (calc.callEV !== undefined) lines.push(`EV of calling: ${calc.callEV.toFixed(2)}BB.`);
  if (calc.spr !== undefined) lines.push(`SPR: ${calc.spr.toFixed(1)}.`);
  if (calc.outs !== undefined) lines.push(`Outs: ${calc.outs}.`);
  if (calc.boardTexture) {
    lines.push(`Board texture: ${calc.boardTexture.overall} (${calc.boardTexture.suitTexture}, ${calc.boardTexture.pairTexture}, ${calc.boardTexture.connectivity}).`);
  }
  lines.push(...opponentRangePromptLines(packet));
  if (packet.dataConfidence !== "high") lines.push(`NOTE: data confidence is ${packet.dataConfidence} -- factor this uncertainty into your reasoning.`);

  lines.push("");
  lines.push("Respond with ONLY a JSON object matching this exact shape, no markdown, no extra text:");
  lines.push('{"action": "FOLD"|"CHECK"|"CALL"|"BET"|"RAISE"|"ALL_IN", "sizingBB": number (optional), "confidence": number 0-1, "reasoning": string, "alternative": {"action": ..., "reasoning": ...} (optional)}');
  return lines.join("\n");
}

export interface NvidiaProviderOptions {
  apiKey: string;
  model?: string;
}

export function createNvidiaProvider(providerOptions: NvidiaProviderOptions): AIProvider {
  const model = providerOptions.model ?? "openai/gpt-oss-20b";
  const metadata: AIProviderMetadata = {
    name: `nvidia:${model}`,
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
      const response = await fetch(NVIDIA_API_URL, {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerOptions.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1024,
          stream: false,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`NVIDIA API error (${response.status}): ${body}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      rawContent = data.choices?.[0]?.message?.content ?? undefined;
      if (!rawContent) throw new Error("NVIDIA API returned no content");

      const recommendation = parseRecommendation(rawContent);
      options.onAuditRecord?.(buildAuditRecord({
        sessionId: options.sessionId ?? "unknown-session",
        handId: options.handId ?? "unknown-hand",
        decisionPacket: packet,
        provider: "nvidia",
        model,
        promptVersion: PROMPT_VERSION,
        latencyMs: Date.now() - start,
        rawResponse: rawContent,
        parsedRecommendation: recommendation,
      }));
      return recommendation;
    } catch (error) {
      options.onAuditRecord?.(buildAuditRecord({
        sessionId: options.sessionId ?? "unknown-session",
        handId: options.handId ?? "unknown-hand",
        decisionPacket: packet,
        provider: "nvidia",
        model,
        promptVersion: PROMPT_VERSION,
        latencyMs: Date.now() - start,
        ...(rawContent !== undefined ? { rawResponse: rawContent } : {}),
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }

  return { metadata, getRecommendation };
}
