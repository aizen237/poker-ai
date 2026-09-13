import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { createGroqProvider } from "../src/providers/groq.js";
import type { DecisionPacket } from "../src/decisionPacket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  throw new Error("GROQ_API_KEY not found -- check your .env file in the poker-ai root");
}

const provider = createGroqProvider({ apiKey });

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
  facingAction: {
    type: "bet",
    amountBB: 4,
  },
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

console.log("Sending decision packet to Groq...\n");
const start = Date.now();

provider
  .getRecommendation(packet)
  .then((recommendation) => {
    const durationMs = Date.now() - start;
    console.log(`Response received in ${durationMs}ms:\n`);
    console.log(JSON.stringify(recommendation, null, 2));
  })
  .catch((error) => {
    console.error("Error calling Groq:", error);
    throw error;
  });