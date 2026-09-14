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

    const result = await router.getRecommendation(packet, { mode });
    res.json({ ok: true, result });
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