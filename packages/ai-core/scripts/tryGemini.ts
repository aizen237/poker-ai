import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { createGeminiProvider } from "../src/providers/gemini.js";
import type { DecisionPacket } from "../src/decisionPacket.js";
import type { AuditRecord } from "../src/auditRecord.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY not found -- check your .env file in the poker-ai root");
}

const provider = createGeminiProvider({ apiKey });

// Same exact decision packet used to test Groq -- deliberately identical
// so the two providers' outputs are directly comparable.
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

let capturedAuditRecord: AuditRecord | undefined;

console.log("Sending decision packet to Gemini...\n");

provider
  .getRecommendation(packet, {
    sessionId: "manual-test-session-1",
    handId: "manual-test-hand-1",
    onAuditRecord: (record) => {
      capturedAuditRecord = record;
    },
  })
  .then((recommendation) => {
    console.log("Recommendation:\n");
    console.log(JSON.stringify(recommendation, null, 2));
    console.log("\nAudit record:\n");
    console.log(JSON.stringify(capturedAuditRecord, null, 2));
  })
  .catch((error) => {
    console.error("Error calling Gemini:", error);
    console.log("\nAudit record (from the error path):\n");
    console.log(JSON.stringify(capturedAuditRecord, null, 2));
    throw error;
  });