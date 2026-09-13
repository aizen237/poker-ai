import { z } from "zod";
import { DecisionPacketSchema } from "./decisionPacket.js";
import { RecommendationSchema } from "./recommendation.js";

/**
 * A single decision's full audit trail, per the original spec's Rule 3.
 * NOTE: this phase only defines the record shape and how to build one --
 * actual persistence (writing these somewhere durable) is Phase 6's
 * opponent-db job. session_id/hand_id are plain strings here since we
 * don't have a real session/hand-tracking system yet (Phase 7); callers
 * supply their own identifiers until then.
 */
export const AuditRecordSchema = z.object({
  timestamp: z.string().datetime(),
  sessionId: z.string(),
  handId: z.string(),
  decisionPacket: DecisionPacketSchema,
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  rawResponse: z.string().optional(),
  parsedRecommendation: RecommendationSchema.optional(),
  latencyMs: z.number().nonnegative(),
  error: z.string().optional(),
});

export type AuditRecord = z.infer<typeof AuditRecordSchema>;

export interface BuildAuditRecordInput {
  sessionId: string;
  handId: string;
  decisionPacket: z.infer<typeof DecisionPacketSchema>;
  provider: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  rawResponse?: string;
  parsedRecommendation?: z.infer<typeof RecommendationSchema>;
  error?: string;
}

export function buildAuditRecord(input: BuildAuditRecordInput): AuditRecord {
  return AuditRecordSchema.parse({
    timestamp: new Date().toISOString(),
    sessionId: input.sessionId,
    handId: input.handId,
    decisionPacket: input.decisionPacket,
    provider: input.provider,
    model: input.model,
    promptVersion: input.promptVersion,
    latencyMs: input.latencyMs,
    ...(input.rawResponse !== undefined ? { rawResponse: input.rawResponse } : {}),
    ...(input.parsedRecommendation !== undefined ? { parsedRecommendation: input.parsedRecommendation } : {}),
    ...(input.error !== undefined ? { error: input.error } : {}),
  });
}