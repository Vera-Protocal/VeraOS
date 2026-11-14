import type {
  Requirement,
  WorkerClaim,
  VerificationCheck,
  Evidence,
} from "../types/domain.ts";
import type { VerificationContext } from "./evidenceProviders/provider.ts";
import { deterministicProvider } from "./evidenceProviders/deterministicProvider.ts";
import { workerOutputProvider } from "./evidenceProviders/workerOutputProvider.ts";
import {
  ConsensusProvider,
  consensusProvider as defaultConsensusProvider,
  type ConsensusEvidenceResult,
} from "./evidenceProviders/consensusProvider.ts";

export interface CheckEngineResult {
  requirements: Requirement[];
  checks: VerificationCheck[];
  evidence: Evidence[];
  consensusResults?: Record<string, ConsensusEvidenceResult>;
}

export class CheckEngine {
  private customConsensusProvider?: ConsensusProvider;

  constructor(customConsensusProvider?: ConsensusProvider) {
    this.customConsensusProvider = customConsensusProvider;
  }

  async executeChecks(
    requirements: Requirement[],
    claims: WorkerClaim[],
    context: VerificationContext
  ): Promise<CheckEngineResult> {
    const checks: VerificationCheck[] = [];
    const allEvidence: Evidence[] = [];
    const updatedRequirements: Requirement[] = [];
    const consensusResults: Record<string, ConsensusEvidenceResult> = {};

    const shouldRunConsensus =
      Boolean(this.customConsensusProvider) ||
      Boolean(process.env.STELLAR_RPC_NODES && process.env.STELLAR_RPC_NODES.trim().length > 0);
    const activeConsensusProvider = this.customConsensusProvider || defaultConsensusProvider;

    // First collect baseline worker output evidence
    for (const req of requirements) {
      const workerEvResult = await workerOutputProvider.verify(req, claims, context);
      allEvidence.push(...workerEvResult.evidence);
    }

    // Next perform deterministic structural verification on each requirement
    for (const req of requirements) {
      const detResult = await deterministicProvider.verify(req, claims, context);
      allEvidence.push(...detResult.evidence);

      let finalStatus = detResult.status;
      let finalObserved = detResult.observed;
      let finalExplanation = detResult.explanation;
      const evidenceIds = detResult.evidence.map((e) => e.id);

      if (shouldRunConsensus && activeConsensusProvider.canHandle(req)) {
        const consensusRes = await activeConsensusProvider.verify(req, claims, context);
        consensusResults[req.id] = consensusRes;
        allEvidence.push(...consensusRes.evidence);
        evidenceIds.push(...consensusRes.evidence.map((e) => e.id));

        if (consensusRes.consensusDivergence || consensusRes.status === "failed") {
          finalStatus = "failed";
          finalObserved = consensusRes.observed;
          finalExplanation = `${detResult.explanation}\n${consensusRes.explanation}`;
        } else if (consensusRes.quorumReached && finalStatus === "passed") {
          finalExplanation = `${detResult.explanation}\n${consensusRes.explanation}`;
        }
      }

      const check: VerificationCheck = {
        id: `check_${req.id}`,
        requirementId: req.id,
        method: "deterministic",
        status: finalStatus,
        expected: detResult.expected,
        observed: finalObserved,
        evidenceIds,
        explanation: finalExplanation,
      };

      checks.push(check);

      updatedRequirements.push({
        ...req,
        status: finalStatus,
      });
    }

    return {
      requirements: updatedRequirements,
      checks,
      evidence: allEvidence,
      ...(Object.keys(consensusResults).length > 0 ? { consensusResults } : {}),
    };
  }
}

export const checkEngine = new CheckEngine();
