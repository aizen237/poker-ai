import type { AuditRecord } from "./auditRecord.js";
import type { DecisionPacket } from "./decisionPacket.js";
import type { Recommendation } from "./recommendation.js";

export interface AIProviderMetadata {
  name: string;
  supportsVision: boolean;
  supportsStructuredOutput: boolean;
  isFree: boolean;
}

export interface GetRecommendationOptions {
  /** Identifiers for the audit trail -- see Rule 3. Optional since not
   *  every caller (e.g. quick manual tests) needs full audit tracking. */
  sessionId?: string;
  handId?: string;
  /** Called with the full audit record after the call completes, whether
   *  it succeeded or failed. */
  onAuditRecord?: (record: AuditRecord) => void;
}

export interface AIProvider {
  readonly metadata: AIProviderMetadata;

  getRecommendation(
    packet: DecisionPacket,
    options?: GetRecommendationOptions,
  ): Promise<Recommendation>;
}