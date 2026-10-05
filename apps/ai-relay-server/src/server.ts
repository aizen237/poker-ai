import { mkdir } from "node:fs/promises";
import { createOpponentService, HandObservationSchema, ProfileLookupSchema } from "@poker-ai/opponent-db/browser";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cors from "cors";
import {
  createGroqProvider,
  createGeminiProvider,
  createNvidiaProvider,
  createModelRouter,
  getModelsByProvider,
  validateDecisionPacket,
  getPolicyRecommendation,
} from "@poker-ai/ai-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

const groqKey = process.env.GROQ_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
const nvidiaKey = process.env.NVIDIA_API_KEY;

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

if (nvidiaKey) {
  const [nvidiaModel] = getModelsByProvider("nvidia");
  if (nvidiaModel) {
    registeredProviders.push({
      provider: createNvidiaProvider({ apiKey: nvidiaKey, model: nvidiaModel.modelId }),
      config: nvidiaModel,
    });
  }
}

const router = createModelRouter(registeredProviders);
const opponentService = createOpponentService(async () => {
  const dbPath = process.env.OPPONENT_DB_PATH ?? path.resolve(__dirname, "../../../.data/opponents.sqlite");
  if (dbPath !== ":memory:") await mkdir(path.dirname(dbPath), { recursive: true });
  const { openDatabase } = await import("@poker-ai/opponent-db");
  return openDatabase(dbPath);
});

const app = express();
const allowedOrigins = new Set(["https://www.pokernow.com", "https://pokernow.com", "https://www.pokernow.club", "https://pokernow.club"]);
// Reject before handlers, including simple requests; CORS headers alone do not prevent writes.
app.use((req, res, next) => {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(req.hostname) ||
      (req.headers.origin !== undefined && !allowedOrigins.has(req.headers.origin))) {
    res.status(403).json({ ok: false, error: "Local PokerNow access only" }); return;
  }
  next();
});
app.use(cors({ origin: [...allowedOrigins], methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json());

app.post("/opponents/observations", async (req, res) => {
  const parsed = HandObservationSchema.array().max(50).safeParse(req.body?.observations);
  if (!parsed.success) { res.status(400).json({ ok:false, error:"Invalid opponent observations" }); return; }
  res.json({ ok:true, ...await opponentService.record(parsed.data) });
});
app.post("/opponents/profiles", async (req, res) => {
  const parsed = ProfileLookupSchema.array().max(10).safeParse(req.body?.players);
  if (!parsed.success) { res.status(400).json({ ok:false, error:"Invalid opponent identities" }); return; }
  const results = await Promise.all(parsed.data.map(player => opponentService.profile(player.identity, player.displayName)));
  res.json({ ok:true, available:results.every(result=>result.available), profiles:results.map(result=>result.profile) });
});

app.post("/recommendation", async (req, res) => {
  try {
    const mode = req.body?.mode ?? "fast";
    if (!["fast", "strong", "manual"].includes(mode)) {
      res.status(400).json({ ok: false, error: "Live relay supports fast, strong or manual only; consensus is disabled." }); return;
    }
    const packet = validateDecisionPacket(req.body?.decisionPacket);
    // Refresh client-supplied profiles from local storage. Storage failures only supply priors.
    for (const opponent of packet.opponentContext?.opponents ?? []) {
      if (opponent.playerProfile) {
        const result = await opponentService.profile(opponent.playerProfile.identity, opponent.playerProfile.displayName);
        opponent.playerProfile = result.profile;
        opponent.statsStorage = result.available ? "available" : "unavailable";
      }
    }

    const result = await getPolicyRecommendation(packet, router, { mode,
      ...(typeof req.body.manualProviderName === "string" ? { manualProviderName: req.body.manualProviderName } : {}),
    });
    res.json({ ok: true, ...result });
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

const PORT = Number(process.env.RELAY_PORT ?? 8787);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error("Invalid RELAY_PORT");
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[Relay Server] Listening on http://localhost:${PORT}`);
  console.log(`[Relay Server] Registered providers: ${registeredProviders.map((p) => p.provider.metadata.name).join(", ")}`);
});
