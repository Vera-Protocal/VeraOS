import test from "node:test";
import assert from "node:assert/strict";
import { TransactionBuilder, Networks, type Operation, type Transaction } from "@stellar/stellar-sdk";
import {
  buildRemediationTransaction,
  DEFAULT_TESTNET_RECIPIENT_ACCOUNT,
  DEFAULT_TESTNET_USDC_ISSUER,
} from "../stellar/remediationBuilder.ts";
import { remediationEngine } from "../verification/remediationEngine.ts";
import { verificationPipeline } from "../verification/pipeline.ts";
import type { Requirement, VerificationCheck } from "../types/domain.ts";

test("Remediation XDR Test 1: 5 USDC required with 0.5 USDC observed produces valid unsigned XDR for 4.5000000 USDC", () => {
  const artifact = buildRemediationTransaction({
    verificationId: "v_9981",
    requiredAmount: 5,
    observedAmount: 0.5,
    assetCode: "USDC",
    recipientAccount: DEFAULT_TESTNET_RECIPIENT_ACCOUNT,
  });

  assert.equal(artifact.deficitAmount, 4.5);
  assert.equal(artifact.formattedAmount, "4.5000000");
  assert.equal(artifact.assetCode, "USDC");
  assert.equal(artifact.memo, "VeraOS:Fix:v_9981");
  assert.ok(artifact.unsignedXdr.length > 40);
  assert.ok(
    artifact.laboratoryUrl.startsWith("https://laboratory.stellar.org/#txsigner?xdr=")
  );
  assert.ok(artifact.laboratoryUrl.includes(encodeURIComponent(artifact.unsignedXdr)));

  // Decode XDR using @stellar/stellar-sdk TransactionBuilder.fromXDR
  const parsed = TransactionBuilder.fromXDR(
    artifact.unsignedXdr,
    Networks.TESTNET
  ) as Transaction;

  const decodedMemo = Buffer.from(parsed.memo.value as string | Uint8Array).toString("utf8");
  assert.equal(decodedMemo, "VeraOS:Fix:v_9981");
  assert.equal(parsed.operations.length, 1);

  const paymentOp = parsed.operations[0] as Operation.Payment;
  assert.equal(paymentOp.type, "payment");
  assert.equal(paymentOp.destination, DEFAULT_TESTNET_RECIPIENT_ACCOUNT);
  assert.equal(paymentOp.amount, "4.5000000");
  assert.equal(paymentOp.asset.isNative(), false);
  assert.equal(paymentOp.asset.getCode(), "USDC");
  assert.equal(paymentOp.asset.getIssuer(), DEFAULT_TESTNET_USDC_ISSUER);
});

test("Remediation XDR Test 2: Native XLM deficit encodes native asset and truncates long verification IDs in memo", () => {
  const artifact = buildRemediationTransaction({
    verificationId: "v_run_extremely_long_verification_identifier_1234567890",
    requiredAmount: 12.25,
    observedAmount: 2.0,
    assetCode: "XLM",
  });

  assert.equal(artifact.deficitAmount, 10.25);
  assert.equal(artifact.formattedAmount, "10.2500000");
  assert.equal(artifact.assetCode, "XLM");
  assert.ok(Buffer.byteLength(artifact.memo, "utf8") <= 28);
  assert.ok(artifact.memo.startsWith("VeraOS:Fix:v_run_"));

  const parsed = TransactionBuilder.fromXDR(
    artifact.unsignedXdr,
    Networks.TESTNET
  ) as Transaction;
  const paymentOp = parsed.operations[0] as Operation.Payment;
  assert.equal(paymentOp.type, "payment");
  assert.equal(paymentOp.amount, "10.2500000");
  assert.equal(paymentOp.asset.isNative(), true);
});

test("Remediation XDR Test 3: RemediationEngine & VerificationPipeline attach unsignedXdr and laboratoryUrl on CORRECT_TRANSACTION", async () => {
  const reqs: Requirement[] = [
    {
      id: "r1",
      description: "Send 5 USDC to recipient",
      type: "transaction",
      expected: {
        amount: 5,
        token: "USDC",
        recipient: DEFAULT_TESTNET_RECIPIENT_ACCOUNT,
      },
      status: "failed",
    },
  ];

  const checks: VerificationCheck[] = [
    {
      id: "check_r1",
      requirementId: "r1",
      method: "deterministic",
      status: "failed",
      expected: "5 USDC",
      observed: "0.5 USDC",
      evidenceIds: ["ev_1"],
      explanation:
        "Expected: 5 USDC\nObserved: 0.5 USDC\nDifference: -4.5 USDC\nPayment mismatch: Expected 5 USDC, but observed receipt shows 0.5 USDC (Deficit: 4.50 USDC).",
    },
  ];

  const packet = remediationEngine.generateRemediation(reqs, checks, 1, 3, "v_fix_42");
  assert.ok(packet);
  const directive = packet.directives.find((d) => d.type === "CORRECT_TRANSACTION");
  assert.ok(directive, "CORRECT_TRANSACTION directive must be generated");
  assert.ok(directive.unsignedXdr, "unsignedXdr must be attached to CORRECT_TRANSACTION directive");
  assert.ok(directive.laboratoryUrl, "laboratoryUrl must be attached to CORRECT_TRANSACTION directive");
  assert.equal(directive.deficitAmount, 4.5);
  assert.equal(directive.assetCode, "USDC");
  assert.equal(directive.memo, "VeraOS:Fix:v_fix_42");

  // Also verify end-to-end pipeline propagation to UI remediationDirectives
  const record = await verificationPipeline.run(
    {
      task: "Pay yourself 5 USDC after completing the task.",
      worker: {
        id: "agent-deficit",
        name: "Deficit Agent",
        output: "Sent 5.0 USDC TxHash: 0x8a7b3c21a4de99f2b1892f3900a41cd",
      },
    },
    1,
    {
      deterministicOverride: {
        actualPaymentAmount: 0.5,
        actualPaymentToken: "USDC",
      },
    }
  );

  const uiDir = record.attempts?.[0]?.remediationDirectives?.find(
    (d) => d.action === "EXECUTE_SUPPLEMENTAL_TRANSFER"
  );
  assert.ok(uiDir);
  assert.ok(uiDir.unsignedXdr);
  assert.ok(uiDir.laboratoryUrl);
  assert.equal(uiDir.deficitAmount, 4.5);
});
