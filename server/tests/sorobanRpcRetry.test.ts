import test from "node:test";
import assert from "node:assert/strict";
import { Networks } from "@stellar/stellar-sdk";
import { StellarRpcProvider } from "../verification/evidenceProviders/stellarRpcProvider.ts";
import type { Requirement, WorkerClaim } from "../types/domain.ts";

const TEST_HASH = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
const RECIPIENT = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

test("Soroban RPC Retry Test 1: Ledger confirmation polling recovers from transient NOT_FOUND responses", async () => {
  let callCount = 0;

  const mockFetch: typeof fetch = async () => {
    callCount++;
    if (callCount < 3) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: callCount,
          result: { status: "NOT_FOUND" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: callCount,
        result: {
          status: "SUCCESS",
          txHash: TEST_HASH,
          ledger: 5012345,
          createdAt: "2026-11-14T16:00:00Z",
          sourceAccount: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
          destinationAccount: RECIPIENT,
          assetCode: "USDC",
          amount: 5.0,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const provider = new StellarRpcProvider(
    "https://soroban-testnet.stellar.org",
    "https://horizon-testnet.stellar.org",
    Networks.TESTNET,
    {
      maxRetries: 3,
      pollIntervalMs: 15,
      baseBackoffMs: 10,
      enableHorizonFallback: false,
      fetchImpl: mockFetch,
    }
  );

  const verification = await provider.verifyPayment(TEST_HASH, 5.0, "USDC", RECIPIENT);
  assert.equal(verification.exists, true);
  assert.equal(verification.successful, true);
  assert.equal(verification.amount, 5.0);
  assert.equal(verification.attempts, 3);
  assert.equal(verification.lastRpcStatus, "SUCCESS");
  assert.ok((verification.rpcResponseTimeMs ?? 0) >= 20);
});

test("Soroban RPC Retry Test 2: Exponential backoff recovers from HTTP 503 and transient network errors", async () => {
  let callCount = 0;

  const mockFetch: typeof fetch = async () => {
    callCount++;
    if (callCount === 1) {
      return new Response("Service Unavailable", { status: 503 });
    }
    if (callCount === 2) {
      throw new Error("ECONNRESET transient socket hang up");
    }

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: callCount,
        result: {
          status: "SUCCESS",
          txHash: TEST_HASH,
          ledger: 5012399,
          createdAt: "2026-11-14T16:01:00Z",
          sourceAccount: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
          destinationAccount: RECIPIENT,
          assetCode: "USDC",
          amount: 5.0,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const provider = new StellarRpcProvider(
    "https://soroban-testnet.stellar.org",
    "https://horizon-testnet.stellar.org",
    Networks.TESTNET,
    {
      maxRetries: 3,
      pollIntervalMs: 10,
      baseBackoffMs: 15,
      enableHorizonFallback: false,
      fetchImpl: mockFetch,
    }
  );

  const req: Requirement = {
    id: "req_retry_503",
    description: "Pay 5 USDC",
    type: "transaction",
    expected: { amount: 5, token: "USDC", recipient: RECIPIENT },
    status: "pending",
  };
  const claims: WorkerClaim[] = [
    {
      id: "c1",
      requirementId: "req_retry_503",
      statement: `Paid 5 USDC via ${TEST_HASH}`,
      value: { amount: 5, token: "USDC", txHash: TEST_HASH },
      source: "worker",
    },
  ];

  const result = await provider.verify(req, claims, {
    task: "Pay 5 USDC",
    workerOutput: `Paid 5 USDC via ${TEST_HASH}`,
  });

  assert.equal(result.status, "passed");
  const ev = result.evidence[0];
  assert.ok(ev);
  assert.equal(ev.metadata?.attempts, 3);
  assert.equal(ev.metadata?.lastRpcStatus, "SUCCESS");
  assert.ok(typeof ev.metadata?.rpcResponseTimeMs === "number");
});

test("Soroban RPC Retry Test 3: Exhaustion after maxRetries records diagnostic metadata on failure", async () => {
  let callCount = 0;

  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: callCount,
        result: { status: "NOT_FOUND" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const provider = new StellarRpcProvider(
    "https://soroban-testnet.stellar.org",
    "https://horizon-testnet.stellar.org",
    Networks.TESTNET,
    {
      maxRetries: 3,
      pollIntervalMs: 10,
      baseBackoffMs: 10,
      enableHorizonFallback: false,
      fetchImpl: mockFetch,
    }
  );

  const tx = await provider.getTransaction(TEST_HASH);
  assert.equal(tx, null);

  const diag = provider.getLastDiagnostics();
  assert.equal(diag.attempts, 4); // 1 initial attempt + 3 retries
  assert.equal(diag.lastRpcStatus, "NOT_FOUND");
  assert.ok(diag.rpcResponseTimeMs >= 20);
});
