import { formatCards } from "@poker-ai/shared";
import { evaluateBest } from "@poker-ai/poker-engine";
import type { DecisionPacket } from "../decisionPacket.js";
import { parseRecommendation, type Recommendation } from "../recommendation.js";
import type { AIProvider, AIProviderMetadata } from "../provider.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const HAND_CATEGORY_NAMES = [
  "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight",
  "Flush", "Full House", "Four of a Kind", "Straight Flush",
];

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
  if (calc.equity !== undefined) lines.push(`Hero's equity: ${(calc.equity * 100).toFixed(1)}%.`);
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

export function createGroqProvider(options: GroqProviderOptions): AIProvider {
  const model = options.model ?? "openai/gpt-oss-120b";

  const metadata: AIProviderMetadata = {
    name: `groq:${model}`,
    supportsVision: false,
    supportsStructuredOutput: false,
    isFree: true,
  };

  async function getRecommendation(packet: DecisionPacket): Promise<Recommendation> {
    const prompt = buildPrompt(packet);

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
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

    const rawContent = data.choices[0]?.message.content;
    if (!rawContent) {
      throw new Error("Groq API returned no content");
    }

    return parseRecommendation(rawContent);
  }

  return { metadata, getRecommendation };
}