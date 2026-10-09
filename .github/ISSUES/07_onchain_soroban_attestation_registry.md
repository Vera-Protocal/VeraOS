---
title: "[Wave]: Onchain Soroban Attestation Registry Smart Contract in Rust"
labels: ["wave-task", "drips-wave", "soroban", "rust", "smart-contracts", "complexity:high (200 pts)"]
assignees: []
---

# [Wave]: Onchain Soroban Attestation Registry Smart Contract in Rust

## Complexity Points Tier
- **Complexity**: `High`
- **Drips Wave Points**: **200 Points**
- **Target Branch**: `dev`

---

## Problem Summary
Currently, verification proofs are persisted off-chain or indexed via transaction hashes. Writing attestations directly into a Soroban smart contract creates immutable, composable onchain proofs that other Soroban contracts (such as escrow pools, DAO treasury payouts, or collateral managers) can query prior to releasing funds. We need a Soroban smart contract written in Rust that anchors cryptographic verification certificates into Stellar ledger state whenever an AI agent task achieves a `VERIFIED` verdict.

## Technical Scope & Architecture
- `contracts/attestation_registry/` (New): Rust Soroban smart contract project.
  - `src/lib.rs`: Soroban contract logic.
  - `Cargo.toml`: Package dependencies (`soroban-sdk`).
- `server/verification/pipeline.ts`: Post-verification attestation trigger invoking contract when `verdict === "VERIFIED"`.
- `server/tests/sorobanAttestation.test.ts` (New): Integration test mocking or calling Soroban RPC.

## Expected Test Coverage
- Unit tests written in Rust (`cargo test`) verifying state storage and duplicate attestation prevention.
- Mock Soroban RPC integration test verifying client invocation encoding (`scValToNative`).
- Contract authorization tests ensuring only authorized VeraOS attestor addresses can write records.
- 100% test pass rate across existing automated test suites (`npm test`).
- TypeScript checks clean (`npx tsc -b`) and linter clean (`npm run lint`).

## Acceptance Criteria
- [ ] Create `contracts/attestation_registry/Cargo.toml` and `src/lib.rs`.
- [ ] Implement Soroban contract with methods:
  - `record_attestation(env, verification_id: Symbol, task_hash: BytesN<32>, worker: Address, verdict: u32, timestamp: u64)`
  - `get_attestation(env, verification_id: Symbol) -> Option<AttestationRecord>`
  - `verify_attestation(env, verification_id: Symbol, task_hash: BytesN<32>) -> bool`
- [ ] Include automated Rust unit tests executable via `cargo test`.
- [ ] Provide build instructions producing optimized `.wasm` artifact via `stellar contract build`.
- [ ] Document Testnet deployment steps and Contract ID configuration in `docs/STELLAR_INTEGRATION.md`.
- [ ] TypeScript checks clean (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] PR targets the `dev` branch.

## Tech Stack
Rust, Soroban SDK (`soroban-sdk`), Stellar CLI (`stellar-cli`), TypeScript.
