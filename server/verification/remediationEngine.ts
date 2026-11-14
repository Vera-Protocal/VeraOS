import type {
  Requirement,
  VerificationCheck,
  RemediationPacket,
  RemediationDirective,
} from "../types/domain.ts";
import { buildRemediationTransaction } from "../stellar/remediationBuilder.ts";

function extractExpectedPaymentParams(expected: unknown): {
  requiredAmount: number;
  assetCode: string;
  assetIssuer?: string;
  recipientAccount?: string;
} {
  if (expected && typeof expected === "object") {
    const obj = expected as {
      amount?: number;
      token?: string;
      assetCode?: string;
      assetIssuer?: string;
      recipient?: string;
    };
    const requiredAmount = typeof obj.amount === "number" ? obj.amount : 5;
    const assetCode = (obj.token || obj.assetCode || "USDC").toUpperCase();
    return {
      requiredAmount,
      assetCode,
      assetIssuer: obj.assetIssuer,
      recipientAccount: obj.recipient,
    };
  }
  if (typeof expected === "number") {
    return { requiredAmount: expected, assetCode: "USDC" };
  }
  if (typeof expected === "string") {
    const match = expected.match(/(\d+(?:\.\d+)?)\s*([A-Za-z0-9]+)?/);
    if (match) {
      return {
        requiredAmount: parseFloat(match[1]),
        assetCode: (match[2] || "USDC").toUpperCase(),
      };
    }
  }
  return { requiredAmount: 5, assetCode: "USDC" };
}

function extractObservedAmount(observed: unknown, explanation: string): number {
  if (typeof observed === "number" && Number.isFinite(observed)) {
    return observed;
  }
  if (typeof observed === "string") {
    const leadingNum = observed.trim().match(/^(\d+(?:\.\d+)?)\b/);
    if (leadingNum) {
      return parseFloat(leadingNum[1]);
    }
  }
  const expMatch =
    explanation.match(/Observed:\s*(\d+(?:\.\d+)?)/i) ||
    explanation.match(/receipt shows\s*(\d+(?:\.\d+)?)/i);
  if (expMatch) {
    return parseFloat(expMatch[1]);
  }
  return 0;
}

export class RemediationEngine {
  generateRemediation(
    requirements: Requirement[],
    checks: VerificationCheck[],
    attempt = 1,
    maxAttempts = 3,
    verificationId = "run"
  ): RemediationPacket | undefined {
    const failedOrActionableChecks = checks.filter(
      (c) => c.status === "failed" || (c.status === "unverifiable" && c.explanation.includes("omitted"))
    );

    if (failedOrActionableChecks.length === 0) {
      return undefined;
    }

    const directives: RemediationDirective[] = [];
    let dirIndex = 1;

    for (const check of failedOrActionableChecks) {
      const req = requirements.find((r) => r.id === check.requirementId);
      if (!req) continue;

      if (req.type === "count") {
        directives.push({
          id: `dir_${dirIndex++}`,
          type: "SUPPLY_MISSING_RESULTS",
          requirementId: req.id,
          required: req.expected,
          reason: `Cardinality breach: ${check.explanation} Provide all ${req.expected} requested items.`,
        });
      } else if (req.type === "threshold") {
        directives.push({
          id: `dir_${dirIndex++}`,
          type: "REPLACE_TARGET",
          requirementId: req.id,
          target: "Seamless",
          reason: "Claimed TVL does not satisfy required threshold or lacks independent verification.",
          suggestedAlternatives: ["Aerodrome Finance", "Moonwell"],
        });
      } else if (req.type === "transaction") {
        if (check.explanation.toLowerCase().includes("omitted an onchain transaction hash")) {
          directives.push({
            id: `dir_${dirIndex++}`,
            type: "PROVIDE_TRANSACTION_HASH",
            requirementId: req.id,
            required: req.expected,
            reason: "Worker claimed payment but omitted an onchain transaction hash or receipt.",
          });
        } else {
          const { requiredAmount, assetCode, assetIssuer, recipientAccount } =
            extractExpectedPaymentParams(req.expected);
          const observedAmount = extractObservedAmount(check.observed, check.explanation);
          const txArtifact = buildRemediationTransaction({
            verificationId,
            recipientAccount,
            requiredAmount,
            observedAmount,
            assetCode,
            assetIssuer,
          });

          directives.push({
            id: `dir_${dirIndex++}`,
            type: "CORRECT_TRANSACTION",
            requirementId: req.id,
            target: txArtifact.recipientAccount,
            required: req.expected,
            reason: `Payment discrepancy: ${check.explanation} Execute supplemental transfer of ${txArtifact.deficitAmount} ${txArtifact.assetCode} to satisfy required amount.`,
            unsignedXdr: txArtifact.unsignedXdr,
            laboratoryUrl: txArtifact.laboratoryUrl,
            deficitAmount: txArtifact.deficitAmount,
            assetCode: txArtifact.assetCode,
            memo: txArtifact.memo,
          });
        }
      } else if (req.type === "slippage") {
        directives.push({
          id: `dir_${dirIndex++}`,
          type: "CORRECT_SLIPPAGE",
          requirementId: req.id,
          required: req.expected,
          reason: `Slippage breach: ${check.explanation} Execute trade with tighter limit or route through higher liquidity pool.`,
        });
      } else if (req.type === "reconciliation" || req.type === "log_audit") {
        directives.push({
          id: `dir_${dirIndex++}`,
          type: "RECONCILE_DISCREPANCY",
          requirementId: req.id,
          required: req.expected,
          reason: `Log audit discrepancy: ${check.explanation} Re-run ingestion and reconcile missing or erroneous entries.`,
        });
      } else {
        directives.push({
          id: `dir_${dirIndex++}`,
          type: "RETRY_WITH_PROOF",
          requirementId: req.id,
          reason: check.explanation,
        });
      }
    }

    return {
      status: "FAIL",
      retryable: attempt < maxAttempts,
      attempt,
      maxAttempts,
      directives,
    };
  }
}

export const remediationEngine = new RemediationEngine();
