import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cors from "cors";
import {
  createGroqProvider,
  createGeminiProvider,
  createModelRouter,
  getModelsByProvider,
  validateDecisionPacket,
  validateActionLegality,
  type RouterOptions,
} from "@poker-ai/ai-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

const groqKey = process.env.GROQ_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

if (!groqKey) {
  throw new Error("GROQ_API_KEY not found in .env -- the relay server cannot start without at least one provider key");
}

const [groqModel] = getModelsByProvider("groq");
if (!groqModel) throw new Error("No Groq model found in the registry");

const registeredProviders = [
  { provider: createGroqProvider({ apiKey: groqKey, model: groqModel.modelId }), config: groqModel },
];

if (geminiKey) {
  const [geminiModel] = getModelsByProvider("gemini");
  if (geminiModel) {
    registeredProviders.push({
      provider: createGeminiProvider({ apiKey: geminiKey, model: geminiModel.modelId }),
      config: geminiModel,
    });
  }
}

const router = createModelRouter(registeredProviders);

const app = express();
app.use(cors());
app.use(express.json());

app.post("/recommendation", async (req, res) => {
  try {
    const packet = validateDecisionPacket(req.body.decisionPacket);
    const mode: RouterOptions["mode"] = req.body.mode ?? "fast";

    if (packet.dataConfidence === "low") {
      res.json({
        ok: true,
        result: {
          action: "FOLD",
          confidence: 0,
          reasoning: "Game state confidence is too low to make a reliable recommendation. Defaulting to FOLD rather than guessing.",
        },
        blocked: true,
        blockedReason: "low_confidence",
      });
      return;
    }

    const result = await router.getRecommendation(packet, { mode });

    if (Array.isArray(result)) {
      // Consensus mode returns multiple providers' results, not one
      // Recommendation -- legality validation isn't applied per-result
      // here yet, since consensus mode isn't what the live extension
      // actually uses today. Documented gap, not silently skipped.
      res.json({ ok: true, result });
      return;
    }

    const legality = validateActionLegality(result, packet);

    if (!legality.isLegal) {
      console.warn(`[Relay Server] AI recommendation rejected as illegal: ${legality.reason}`);
    }

    res.json({
      ok: true,
      result: legality.effectiveRecommendation,
      ...(legality.isLegal ? {} : { blocked: true, blockedReason: "illegal_action", originalReason: legality.reason }),
    });
  } catch (error) {
    console.error("[Relay Server] Error handling /recommendation:", error);
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, providers: registeredProviders.map((p) => p.provider.metadata.name) });
});

const PORT = 8787;
app.listen(PORT, () => {
  console.log(`[Relay Server] Listening on http://localhost:${PORT}`);
  console.log(`[Relay Server] Registered providers: ${registeredProviders.map((p) => p.provider.metadata.name).join(", ")}`);
});