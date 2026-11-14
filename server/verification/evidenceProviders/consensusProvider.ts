import { createHash } from "node:crypto";
import { TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import type { Requirement, WorkerClaim, Evidence, CheckStatus } from "../../types/domain.ts";
import type { EvidenceProvider, EvidenceResult, VerificationContext } from "./provider.ts";

export type IEvidenceProvider = EvidenceProvider;

export type ConsensusNodeType = "soroban-rpc" | "horizon";

export interface ConsensusNodeConfig {
  url: string;
  type: ConsensusNodeType;
  name?: string;
}

export interface NodeObservation {
  nodeUrl: string;
  nodeName: string;
  providerType: ConsensusNodeType;
  status: "CONFIRMED" | "FAILED" | "NOT_FOUND" | "TIMEOUT" | "ERROR";
  successful?: boolean;
  ledger?: number;
  envelopeXdr?: string;
  envelopeXdrHash?: string;
  latencyMs: number;
  error?: string;
}

export interface ConsensusStateSnapshot {
  successful: boolean;
  ledger: number;
  envelopeXdrHash: string;
}

export interface ConsensusEvidenceResult extends EvidenceResult {
  quorumReached: boolean;
  agreementRatio: string;
  agreeingNodes: number;
  totalNodes: number;
  consensusDivergence: boolean;
  agreedState?: ConsensusStateSnapshot;
  nodeObservations: NodeObservation[];
}

export interface ConsensusProviderOptions {
  nodes?: Array<string | ConsensusNodeConfig>;
  timeoutMs?: number;
  requiredQuorum?: number;
  networkPassphrase?: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_CONSENSUS_NODES: ConsensusNodeConfig[] = [
  {
    url: "https://soroban-testnet.stellar.org",
    type: "soroban-rpc",
    name: "Stellar Soroban RPC Primary",
  },
  {
    url: "https://horizon-testnet.stellar.org",
    type: "horizon",
    name: "Stellar Horizon Indexer",
  },
  {
    url: "https://soroban-rpc.testnet.stellar.gateway.fm",
    type: "soroban-rpc",
    name: "Gateway.fm Soroban RPC",
  },
];

export function inferNodeType(url: string): ConsensusNodeType {
  const lower = url.toLowerCase();
  if (lower.includes("horizon")) {
    return "horizon";
  }
  return "soroban-rpc";
}

export function parseConsensusNodes(
  input?: Array<string | ConsensusNodeConfig> | string
): ConsensusNodeConfig[] {
  if (Array.isArray(input) && input.length > 0) {
    return input.map((item, idx) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return {
          url: trimmed,
          type: inferNodeType(trimmed),
          name: `ConsensusNode-${idx + 1}`,
        };
      }
      return {
        url: item.url.trim(),
        type: item.type || inferNodeType(item.url),
        name: item.name || `ConsensusNode-${idx + 1}`,
      };
    });
  }

  const envNodes = typeof input === "string" ? input : process.env.STELLAR_RPC_NODES;
  if (envNodes && envNodes.trim().length > 0) {
    const urls = envNodes
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length > 0) {
      return urls.map((url, idx) => ({
        url,
        type: inferNodeType(url),
        name: `ConsensusNode-${idx + 1}`,
      }));
    }
  }

  return DEFAULT_CONSENSUS_NODES;
}

export function computeEnvelopeXdrHash(
  envelopeXdr: string,
  networkPassphrase: string = Networks.TESTNET
): string {
  const normalizedXdr = envelopeXdr.trim();
  try {
    const parsed = TransactionBuilder.fromXDR(normalizedXdr, networkPassphrase);
    const canonicalXdr = parsed.toXDR();
    return createHash("sha256").update(canonicalXdr).digest("hex");
  } catch {
    return createHash("sha256").update(normalizedXdr).digest("hex");
  }
}

export class ConsensusProvider implements IEvidenceProvider {
  name = "ConsensusProvider";
  readonly nodes: ConsensusNodeConfig[];
  readonly timeoutMs: number;
  readonly requiredQuorum: number;
  readonly networkPassphrase: string;
  private fetchImpl: typeof fetch;

  constructor(options: ConsensusProviderOptions = {}) {
    this.nodes = parseConsensusNodes(options.nodes);
    this.timeoutMs = options.timeoutMs ?? 4500;
    this.requiredQuorum =
      options.requiredQuorum ?? Math.max(2, Math.ceil((this.nodes.length * 2) / 3));
    this.networkPassphrase =
      options.networkPassphrase || process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
    this.fetchImpl = options.fetchImpl || globalThis.fetch.bind(globalThis);
  }

  normalizeHash(hash: string): string {
    return hash.toLowerCase().trim().replace(/^0x/, "");
  }

  canHandle(requirement: Requirement): boolean {
    return (
      requirement.type === "transaction" ||
      requirement.type === "trade" ||
      requirement.type === "slippage"
    );
  }

  private async querySingleNode(
    node: ConsensusNodeConfig,
    cleanHash: string
  ): Promise<NodeObservation> {
    const startMs = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (node.type === "soroban-rpc") {
        const response = await this.fetchImpl(node.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTransaction",
            params: { hash: cleanHash },
          }),
          signal: controller.signal,
        });

        const latencyMs = Math.max(1, Math.round(performance.now() - startMs));
        if (!response.ok) {
          return {
            nodeUrl: node.url,
            nodeName: node.name || node.url,
            providerType: node.type,
            status: "ERROR",
            latencyMs,
            error: `HTTP ${response.status}`,
          };
        }

        const payload = (await response.json()) as {
          result?: {
            status?: string;
            ledger?: number;
            envelopeXdr?: string;
          };
          error?: { message?: string };
        };

        if (payload.error) {
          return {
            nodeUrl: node.url,
            nodeName: node.name || node.url,
            providerType: node.type,
            status: "ERROR",
            latencyMs,
            error: payload.error.message || "RPC error",
          };
        }

        const result = payload.result;
        if (!result || result.status === "NOT_FOUND") {
          return {
            nodeUrl: node.url,
            nodeName: node.name || node.url,
            providerType: node.type,
            status: "NOT_FOUND",
            latencyMs,
            error: "Transaction not found on Soroban RPC node",
          };
        }

        const successful = result.status === "SUCCESS";
        const ledger = Number(result.ledger ?? 0);
        const envelopeXdr = result.envelopeXdr || "";
        const envelopeXdrHash = envelopeXdr
          ? computeEnvelopeXdrHash(envelopeXdr, this.networkPassphrase)
          : "";

        return {
          nodeUrl: node.url,
          nodeName: node.name || node.url,
          providerType: node.type,
          status: successful ? "CONFIRMED" : "FAILED",
          successful,
          ledger,
          envelopeXdr,
          envelopeXdrHash,
          latencyMs,
        };
      }

      // Horizon REST endpoint
      const baseUrl = node.url.replace(/\/+$/, "");
      const response = await this.fetchImpl(`${baseUrl}/transactions/${cleanHash}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      const latencyMs = Math.max(1, Math.round(performance.now() - startMs));
      if (response.status === 404) {
        return {
          nodeUrl: node.url,
          nodeName: node.name || node.url,
          providerType: node.type,
          status: "NOT_FOUND",
          latencyMs,
          error: "Transaction not found on Horizon node",
        };
      }

      if (!response.ok) {
        return {
          nodeUrl: node.url,
          nodeName: node.name || node.url,
          providerType: node.type,
          status: "ERROR",
          latencyMs,
          error: `HTTP ${response.status}`,
        };
      }

      const txData = (await response.json()) as {
        successful?: boolean;
        ledger?: number;
        envelope_xdr?: string;
      };

      const successful = Boolean(txData.successful);
      const ledger = Number(txData.ledger ?? 0);
      const envelopeXdr = txData.envelope_xdr || "";
      const envelopeXdrHash = envelopeXdr
        ? computeEnvelopeXdrHash(envelopeXdr, this.networkPassphrase)
        : "";

      return {
        nodeUrl: node.url,
        nodeName: node.name || node.url,
        providerType: node.type,
        status: successful ? "CONFIRMED" : "FAILED",
        successful,
        ledger,
        envelopeXdr,
        envelopeXdrHash,
        latencyMs,
      };
    } catch (err) {
      const latencyMs = Math.max(1, Math.round(performance.now() - startMs));
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || err.message.toLowerCase().includes("abort"));
      return {
        nodeUrl: node.url,
        nodeName: node.name || node.url,
        providerType: node.type,
        status: isAbort ? "TIMEOUT" : "ERROR",
        latencyMs,
        error: isAbort
          ? `Node request timed out after ${this.timeoutMs}ms`
          : err instanceof Error
          ? err.message
          : "Unknown network error",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Executes parallel quorum verification across all configured independent RPC/Horizon nodes
   * and evaluates 2-of-3 agreement on execution status, ledger sequence, and SHA-256 envelope XDR hash.
   */
  async verifyTransactionQuorum(
    txHash: string,
    requirementId = "consensus"
  ): Promise<ConsensusEvidenceResult> {
    const cleanHash = this.normalizeHash(txHash);
    const totalNodes = this.nodes.length;

    const settled = await Promise.allSettled(
      this.nodes.map((node) => this.querySingleNode(node, cleanHash))
    );

    const nodeObservations: NodeObservation[] = settled.map((res, idx) => {
      if (res.status === "fulfilled") {
        return res.value;
      }
      const fallbackNode = this.nodes[idx];
      return {
        nodeUrl: fallbackNode.url,
        nodeName: fallbackNode.name || fallbackNode.url,
        providerType: fallbackNode.type,
        status: "ERROR",
        latencyMs: this.timeoutMs,
        error: res.reason instanceof Error ? res.reason.message : "Promise rejected",
      };
    });

    // Group deterministic ledger observations by (successful, ledger, envelopeXdrHash)
    const stateBuckets = new Map<
      string,
      { snapshot: ConsensusStateSnapshot; observations: NodeObservation[] }
    >();

    const respondingStateObservations = nodeObservations.filter(
      (obs) =>
        (obs.status === "CONFIRMED" || obs.status === "FAILED") &&
        typeof obs.successful === "boolean" &&
        typeof obs.ledger === "number" &&
        Boolean(obs.envelopeXdrHash)
    );

    for (const obs of respondingStateObservations) {
      const key = `${obs.successful ? "SUCCESS" : "FAILED"}:${obs.ledger}:${obs.envelopeXdrHash}`;
      const existing = stateBuckets.get(key);
      if (existing) {
        existing.observations.push(obs);
      } else {
        stateBuckets.set(key, {
          snapshot: {
            successful: obs.successful!,
            ledger: obs.ledger!,
            envelopeXdrHash: obs.envelopeXdrHash!,
          },
          observations: [obs],
        });
      }
    }

    // Find largest agreeing cluster
    let bestCluster:
      | { snapshot: ConsensusStateSnapshot; observations: NodeObservation[] }
      | undefined;
    for (const cluster of stateBuckets.values()) {
      if (!bestCluster || cluster.observations.length > bestCluster.observations.length) {
        bestCluster = cluster;
      }
    }

    const agreeingNodes = bestCluster ? bestCluster.observations.length : 0;
    const agreementRatio = `${agreeingNodes}/${totalNodes}`;

    // Divergence occurs if multiple distinct state snapshots were returned by responding nodes,
    // or if >= 2 nodes responded with state / NOT_FOUND conflict preventing quorum.
    const hasConflictingSnapshots = stateBuckets.size > 1;
    const notFoundCount = nodeObservations.filter((o) => o.status === "NOT_FOUND").length;
    const hasExistenceConflict =
      respondingStateObservations.length > 0 &&
      notFoundCount > 0 &&
      agreeingNodes < this.requiredQuorum;

    const consensusDivergence = hasConflictingSnapshots || hasExistenceConflict;

    const quorumReached =
      Boolean(bestCluster) &&
      agreeingNodes >= this.requiredQuorum &&
      bestCluster!.snapshot.successful === true;

    let status: CheckStatus;
    let explanation: string;

    if (quorumReached && bestCluster) {
      status = "passed";
      explanation = `Multi-provider quorum verified (${agreementRatio} nodes agreed): Transaction ${cleanHash} confirmed SUCCESS at ledger ${bestCluster.snapshot.ledger} with matching XDR SHA-256 hash ${bestCluster.snapshot.envelopeXdrHash.slice(0, 16)}...${consensusDivergence ? " (1 minority node diverged)" : ""}.`;
    } else if (consensusDivergence) {
      status = "failed";
      explanation = `CONSENSUS_DIVERGENCE detected across Stellar providers (${agreementRatio} agreement): Independent nodes returned conflicting ledger state or envelope XDR hashes for transaction ${cleanHash}.`;
    } else if (bestCluster && bestCluster.snapshot.successful === false && agreeingNodes >= this.requiredQuorum) {
      status = "failed";
      explanation = `Multi-provider quorum (${agreementRatio}) confirmed transaction ${cleanHash} FAILED execution on ledger ${bestCluster.snapshot.ledger}.`;
    } else if (notFoundCount >= this.requiredQuorum) {
      status = "failed";
      explanation = `Multi-provider quorum (${notFoundCount}/${totalNodes}) confirmed transaction ${cleanHash} does not exist on ledger.`;
    } else {
      status = "unverifiable";
      explanation = `Insufficient responding nodes to establish ${this.requiredQuorum}-of-${totalNodes} quorum for transaction ${cleanHash} (${agreementRatio} agreed).`;
    }

    const evidence: Evidence = {
      id: `ev_consensus_${requirementId}`,
      type: "blockchain",
      source: "stellar_multi_provider_consensus",
      claim: `Multi-provider consensus verification for ${cleanHash} (${agreementRatio})`,
      value: {
        txHash: cleanHash,
        quorumReached,
        agreementRatio,
        agreeingNodes,
        totalNodes,
        consensusDivergence,
        agreedState: bestCluster?.snapshot,
        nodeObservations,
      },
      strength: "strong",
      status: quorumReached ? "verified" : status === "failed" ? "failed" : "received",
      metadata: {
        quorumReached,
        agreementRatio,
        consensusDivergence,
        ...(consensusDivergence ? { alert: "CONSENSUS_DIVERGENCE" } : {}),
        nodeLatenciesMs: Object.fromEntries(
          nodeObservations.map((o) => [o.nodeUrl, o.latencyMs])
        ),
        nodeLedgers: Object.fromEntries(
          nodeObservations
            .filter((o) => o.ledger !== undefined)
            .map((o) => [o.nodeUrl, o.ledger])
        ),
      },
    };

    return {
      status,
      expected: `${this.requiredQuorum}/${totalNodes} multi-provider consensus on SUCCESS & XDR hash`,
      observed: quorumReached
        ? `${agreementRatio} quorum confirmed (ledger ${bestCluster?.snapshot.ledger})`
        : consensusDivergence
        ? `CONSENSUS_DIVERGENCE (${agreementRatio})`
        : `${agreementRatio} quorum not met`,
      evidence: [evidence],
      explanation,
      quorumReached,
      agreementRatio,
      agreeingNodes,
      totalNodes,
      consensusDivergence,
      agreedState: bestCluster?.snapshot,
      nodeObservations,
    };
  }

  async verify(
    requirement: Requirement,
    claims: WorkerClaim[],
    _context: VerificationContext
  ): Promise<ConsensusEvidenceResult> {
    const txHashClaim = claims.find(
      (c) => c.value && typeof (c.value as { txHash?: string }).txHash === "string"
    );
    const txHash = (txHashClaim?.value as { txHash?: string } | undefined)?.txHash;

    if (!txHash) {
      return {
        status: "unverifiable",
        expected: `${this.requiredQuorum}/${this.nodes.length} multi-provider consensus`,
        observed: "No transaction hash provided",
        evidence: [],
        explanation:
          "Cannot perform multi-provider consensus verification without an onchain transaction hash.",
        quorumReached: false,
        agreementRatio: `0/${this.nodes.length}`,
        agreeingNodes: 0,
        totalNodes: this.nodes.length,
        consensusDivergence: false,
        nodeObservations: [],
      };
    }

    return this.verifyTransactionQuorum(txHash, requirement.id);
  }
}

export const consensusProvider = new ConsensusProvider();
