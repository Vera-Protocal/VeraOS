---
title: "feat(engine): implement multi-provider consensus verification [High / 200 pts]"
labels: ["wave-task", "stellar", "verification-engine", "complexity:high (200 pts)"]
assignees: []
---

# feat(engine): implement multi-provider consensus verification [High / 200 pts]

## Complexity Points Tier
- **Tier**: `High`
- **Drips Wave Points**: **200 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **P2 — Ecosystem Expansion & Oracle Consensus** in our [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), VeraOS currently relies on a primary Soroban RPC endpoint (`https://soroban-testnet.stellar.org`) with a sequential fallback to Stellar Horizon (`https://horizon-testnet.stellar.org`). 

In production, single-node RPC latency spikes, temporary desynchronization, or stale ledger state can lead to false indeterminate verdicts. To achieve institutional-grade Byzantine fault tolerance for AI agent verification, VeraOS requires a **Multi-Provider Consensus Verification Engine** that concurrently queries multiple independent Stellar RPC and Horizon endpoints, cross-references transaction envelopes, confirms ledger sequence finality, and produces a mathematically corroborated quorum verdict.

---

## 2. Technical Requirements & Architecture
- **Location**: `server/verification/evidenceProviders/consensusProvider.ts` and `server/verification/evidenceProviders/stellarRpcProvider.ts`.
- **Concurrency & Quorum**:
  - Dispatch simultaneous ledger requests to a configurable pool of endpoints:
    - Primary: `https://soroban-testnet.stellar.org` (Soroban JSON-RPC 2.0 `getTransaction`)
    - Secondary: `https://horizon-testnet.stellar.org` (Stellar Horizon `/transactions/{hash}`)
    - Tertiary: Configurable community RPC node (e.g., PublicNode or custom validator endpoint via `STELLAR_RPC_NODES` env).
  - Enforce a 2-of-3 quorum on transaction success status (`SUCCESS`), confirmed ledger sequence, and parsed operation envelope XDR hash.
  - Detect and flag ledger divergence or fork discrepancies with an explicit `CONSENSUS_DIVERGENCE` check status.
- **Failover & Timeout Handling**:
  - Implement configurable timeout boundaries (default: 4,500ms per provider) using `AbortController`.
  - Ensure slow or down nodes do not block the overall verification pipeline.

---

## 3. Acceptance Criteria
- [ ] Create `ConsensusProvider` class in `server/verification/evidenceProviders/consensusProvider.ts` implementing `IEvidenceProvider`.
- [ ] Support multi-node configuration via `STELLAR_RPC_NODES` comma-separated environment variable with sensible defaults.
- [ ] Compute cryptographic hash of decoded transaction envelope XDR across responding nodes to guarantee 100% byte-for-byte data consensus.
- [ ] Return structured `ConsensusEvidenceResult` detailing participating nodes, response latencies, ledger sequence consensus, and agreement ratio.
- [ ] Integrate into `server/verification/checkEngine.ts` and verification pipeline.
- [ ] Add automated integration tests in `server/tests/consensus.test.ts` mocking 3-node responses (normal quorum, 1 slow node recovery, divergence detection).
- [ ] Zero regressions to existing 84-test automated suite (`npm test`).
- [ ] Typecheck passes cleanly (`npx tsc -b`) and linter passes with zero errors (`npm run lint`).

---

## 4. Suggested Execution Steps
1. **Branch Creation**: In accordance with our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the latest `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/multi-provider-consensus
   ```
2. **Implementation Files**:
   - `server/verification/evidenceProviders/consensusProvider.ts` (New provider)
   - `server/verification/evidenceProviders/stellarRpcProvider.ts` (Refactor for standalone re-use)
   - `server/verification/checkEngine.ts` (Wire consensus checks)
   - `server/tests/consensus.test.ts` (Test suite)
3. **Local Validation**:
   ```bash
   npm run lint
   npx tsc -b
   npm test
   npm run build
   ```

---

## 5. Mandatory Contributor PR Requirements
- All Pull Requests must target the **`dev`** branch (never `main`).
- PR description must include `Closes #<id>` (or `Fixes #<id>`) to link this issue.
- Contributors must follow our [CONTRIBUTING.md](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md) guidelines and Conventional Commits standard (`feat(engine): ...`).
