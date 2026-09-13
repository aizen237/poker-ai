import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { createGroqProvider } from "../src/providers/groq.js";
import { createGeminiProvider } from "../src/providers/gemini.js";
import { createModelRouter, type ConsensusResult } from "../src/modelRouter.js";
import { getModelsByProvider } from "../src/modelRegistry.js";
import type { DecisionPacket } from "../src/decisionPacket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

const groqKey = process.env.GROQ_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
if (!groqKey || !geminiKey) {
  throw new Error("Both GROQ_API_KEY and GEMINI_API_KEY must be set in .env");
}

const [groqModel] = getModelsByProvider("groq");
const [geminiModel] = getModelsByProvider("gemini");
if (!groqModel || !geminiModel) {
  throw new Error("Missing registry entries for groq or gemini");
}

const groqProvider = createGroqProvider({ apiKey: groqKey, model: groqModel.modelId });
const geminiProvider = createGeminiProvider({ apiKey: geminiKey, model: geminiModel.modelId });

const router = createModelRouter([
  { provider: groqProvider, config: groqModel },
  { provider: geminiProvider, config: geminiModel },
]);

// Same packet used throughout this project's testing, for continuity.
const packet: DecisionPacket = {
  hero: {
    holeCards: [
      { rank: 14, suit: "s" },
      { rank: 13, suit: "s" },
    ],
    position: "BTN",
    stackBB: 45,
  },
  table: {
    potBB: 6,
    board: [
      { rank: 7, suit: "h" },
      { rank: 4, suit: "d" },
      { rank: 2, suit: "c" },
    ],
    street: "flop",
    numOpponentsRemaining: 1,
  },
  facingAction: { type: "bet", amountBB: 4 },
  engineCalculations: {
    equity: 0.62,
    potOddsBreakevenPercent: 40,
    callEV: 1.2,
    spr: 7.5,
    boardTexture: {
      suitTexture: "rainbow",
      pairTexture: "unpaired",
      connectivity: "disconnected",
      overall: "dry",
    },
  },
  dataConfidence: "high",
};

console.log("Requesting consensus from Groq + Gemini...\n");
const start = Date.now();

router
  .getRecommendation(packet, { mode: "consensus", sessionId: "consensus-test", handId: "hand-1" })
  .then((results) => {
    const totalMs = Date.now() - start;
    console.log(`Total consensus round completed in ${totalMs}ms\n`);
    for (const result of results as ConsensusResult[]) {
      console.log(`--- ${result.providerName} ---`);
      if (result.recommendation) {
        console.log(`Action: ${result.recommendation.action}`);
        console.log(`Confidence: ${result.recommendation.confidence}`);
        console.log(`Reasoning: ${result.recommendation.reasoning}\n`);
      } else {
        console.log(`ERROR: ${result.error}\n`);
      }
    }
  })
  .catch((error) => {
    console.error("Consensus call failed entirely:", error);
    throw error;
  });