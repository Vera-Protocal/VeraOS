import test from "node:test";
import assert from "node:assert/strict";
import {
  ConsensusProvider,
  computeEnvelopeXdrHash,
  parseConsensusNodes,
} from "../verification/evidenceProviders/consensusProvider.ts";
import { CheckEngine } from "../verification/checkEngine.ts";
import type { Requirement, WorkerClaim } from "../types/domain.ts";

const SAMPLE_TX_HASH = "62256096f306726197208231b00e422628b0bb83e104dabed9a74da5186afbaf";
const SAMPLE_ENVELOPE_XDR = "AAAAAgAAAABiJWCW8wZyYZcggjGwDkImKLC7g+EE2r7Zp02lGG+68wAAAGQAD3C6AAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADK8A==";
const TAMPERED_ENVELOPE_XDR = "AAAAAgAAAABiJWCW8wZyYZcggjGwDkImKLC7g+EE2r7Zp02lGG+68wAAAGQAD3C6AAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAD999==";

test("Consensus Test 1: Normal 3-of-3 quorum across Soroban RPC, Horizon, and Tertiary RPC", async () => {
  const mockFetch: typeof fetch = async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("horizon")) {
      return new Response(
        JSON.stringify({
          id: SAMPLE_TX_HASH,
          hash: SAMPLE_TX_HASH,
          successful: true,
          ledger: 4688150,
          envelope_xdr: SAMPLE_ENVELOPE_XDR,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          status: "SUCCESS",
          txHash: SAMPLE_TX_HASH,
          ledger: 4688150,
          envelopeXdr: SAMPLE_ENVELOPE_XDR,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const provider = new ConsensusProvider({
    nodes: [
      "https://soroban-testnet.stellar.org",
      "https://horizon-testnet.stellar.org",
      "https://soroban-rpc.testnet.stellar.gateway.fm",
    ],
    fetchImpl: mockFetch,
  });

  const result = await provider.verifyTransactionQuorum(SAMPLE_TX_HASH, "req_tx_1");

  assert.equal(result.status, "passed");
  assert.equal(result.quorumReached, true);
  assert.equal(result.agreementRatio, "3/3");
  assert.equal(result.agreeingNodes, 3);
  assert.equal(result.totalNodes, 3);
  assert.equal(result.consensusDivergence, false);
  assert.ok(result.agreedState);
  assert.equal(result.agreedState.successful, true);
  assert.equal(result.agreedState.ledger, 4688150);
  assert.equal(result.agreedState.envelopeXdrHash, computeEnvelopeXdrHash(SAMPLE_ENVELOPE_XDR));
  assert.equal(result.nodeObservations.length, 3);
  for (const obs of result.nodeObservations) {
    assert.equal(obs.status, "CONFIRMED");
    assert.equal(obs.ledger, 4688150);
    assert.ok(obs.latencyMs >= 1);
  }
});

test("Consensus Test 2: 2-of-3 quorum recovery when 1 node fails or times out", async () => {
  const mockFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Simulate tertiary node timing out via AbortController signal
    if (url.includes("gateway.fm")) {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const abortErr = new Error("The operation was aborted");
          abortErr.name = "AbortError";
          reject(abortErr);
        });
      });
    }

    if (url.includes("horizon")) {
      return new Response(
        JSON.stringify({
          id: SAMPLE_TX_HASH,
          hash: SAMPLE_TX_HASH,
          successful: true,
          ledger: 4688150,
          envelope_xdr: SAMPLE_ENVELOPE_XDR,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          status: "SUCCESS",
          txHash: SAMPLE_TX_HASH,
          ledger: 4688150,
          envelopeXdr: SAMPLE_ENVELOPE_XDR,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const provider = new ConsensusProvider({
    nodes: [
      "https://soroban-testnet.stellar.org",
      "https://horizon-testnet.stellar.org",
      "https://soroban-rpc.testnet.stellar.gateway.fm",
    ],
    timeoutMs: 60,
    fetchImpl: mockFetch,
  });

  const result = await provider.verifyTransactionQuorum(SAMPLE_TX_HASH, "req_tx_2");

  assert.equal(result.status, "passed");
  assert.equal(result.quorumReached, true);
  assert.equal(result.agreementRatio, "2/3");
  assert.equal(result.consensusDivergence, false);

  const timeoutObs = result.nodeObservations.find((o) => o.nodeUrl.includes("gateway.fm"));
  assert.ok(timeoutObs);
  assert.equal(timeoutObs.status, "TIMEOUT");
});

test("Consensus Test 3: CONSENSUS_DIVERGENCE detected when nodes report conflicting status or XDR hash", async () => {
  const mockFetch: typeof fetch = async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Node 1 reports SUCCESS with SAMPLE_ENVELOPE_XDR
    if (url.includes("soroban-testnet.stellar.org")) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            status: "SUCCESS",
            txHash: SAMPLE_TX_HASH,
            ledger: 4688150,
            envelopeXdr: SAMPLE_ENVELOPE_XDR,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Node 2 (Horizon) reports FAILED execution status
    if (url.includes("horizon")) {
      return new Response(
        JSON.stringify({
          id: SAMPLE_TX_HASH,
          hash: SAMPLE_TX_HASH,
          successful: false,
          ledger: 4688150,
          envelope_xdr: SAMPLE_ENVELOPE_XDR,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Node 3 reports SUCCESS but with a tampered XDR envelope hash
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          status: "SUCCESS",
          txHash: SAMPLE_TX_HASH,
          ledger: 4688150,
          envelopeXdr: TAMPERED_ENVELOPE_XDR,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const provider = new ConsensusProvider({
    nodes: [
      "https://soroban-testnet.stellar.org",
      "https://horizon-testnet.stellar.org",
      "https://soroban-rpc.testnet.stellar.gateway.fm",
    ],
    fetchImpl: mockFetch,
  });

  const req: Requirement = {
    id: "req_div",
    description: "Send 5 USDC to recipient",
    type: "transaction",
    expected: { amount: 5, token: "USDC" },
    status: "pending",
  };
  const claims: WorkerClaim[] = [
    {
      id: "claim_1",
      requirementId: "req_div",
      statement: `Sent 5 USDC via ${SAMPLE_TX_HASH}`,
      value: { amount: 5, token: "USDC", txHash: SAMPLE_TX_HASH },
      source: "worker",
    },
  ];

  const result = await provider.verify(req, claims, {
    task: "Send 5 USDC",
    workerOutput: `Sent 5 USDC via ${SAMPLE_TX_HASH}`,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.quorumReached, false);
  assert.equal(result.consensusDivergence, true);
  assert.equal(result.agreementRatio, "1/3");
  assert.ok(result.explanation.includes("CONSENSUS_DIVERGENCE"));
  assert.equal(result.evidence[0]?.metadata?.alert, "CONSENSUS_DIVERGENCE");

  // Also verify CheckEngine propagates CONSENSUS_DIVERGENCE failure
  const engine = new CheckEngine(provider);
  const engineResult = await engine.executeChecks(reqsFrom(req), claims, {
    task: "Send 5 USDC",
    workerOutput: `Sent 5 USDC via ${SAMPLE_TX_HASH}`,
  });

  assert.equal(engineResult.checks[0]?.status, "failed");
  assert.ok(engineResult.checks[0]?.explanation.includes("CONSENSUS_DIVERGENCE"));
});

test("Consensus Test 4: STELLAR_RPC_NODES env parsing configures custom node pool", () => {
  const nodes = parseConsensusNodes(
    "https://rpc1.stellar.org, https://horizon-custom.stellar.org , https://rpc2.stellar.org"
  );
  assert.equal(nodes.length, 3);
  assert.equal(nodes[0]?.type, "soroban-rpc");
  assert.equal(nodes[1]?.type, "horizon");
  assert.equal(nodes[2]?.type, "soroban-rpc");
});

function reqsFrom(req: Requirement): Requirement[] {
  return [req];
}
