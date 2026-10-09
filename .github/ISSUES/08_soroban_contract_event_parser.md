---
title: "[Wave]: Soroban Smart Contract Event Evidence Provider"
labels: ["wave-task", "drips-wave", "soroban", "oracle", "verification-engine", "complexity:high (200 pts)"]
assignees: []
---

# [Wave]: Soroban Smart Contract Event Evidence Provider

## Complexity Points Tier
- **Complexity**: `High`
- **Drips Wave Points**: **200 Points**
- **Target Branch**: `dev`

---

## Summary
Implement a dedicated Soroban Event Evidence Provider (`server/verification/evidenceProviders/sorobanEventProvider.ts`) that queries `getEvents` on Soroban RPC to extract, decode, and verify emitted contract event topics and payloads against requirement invariants.

## Why It Matters
When autonomous agents interact with Soroban decentralized finance protocols (minting liquidity tokens, executing limit orders, interacting with lending protocols), transaction envelopes only convey invocation parameters, not internal execution outcomes. Emitted Soroban contract events are the definitive ground truth for contract execution state.

## Architectural Pointers & Affected Files
- `server/verification/evidenceProviders/sorobanEventProvider.ts` (New): Soroban event listener and decoder.
- `server/verification/checkEngine.ts`: Integration of contract event checks into deterministic evaluation engine.
- `server/tests/sorobanEvent.test.ts` (New): Automated test suite mocking Soroban RPC `getEvents`.

## Acceptance Criteria
- [ ] Implement `SorobanEventProvider` querying `getEvents` on `https://soroban-testnet.stellar.org`.
- [ ] Decode event topics (`topics: string[]`) and data (`data: string`) from ScVal XDR using `@stellar/stellar-sdk` `scValToNative`.
- [ ] Match extracted event parameters against requirement invariants (e.g. `event.transfer.amount >= 100`).
- [ ] Provide structured `EvidenceResult` including event ledger, contract ID, decoded topics, and explorer link.
- [ ] Add automated tests in `server/tests/sorobanEvent.test.ts` covering matching events and event mismatch detection.
- [ ] Zero regressions to existing test suites (`npm test`).
- [ ] TypeScript checks clean (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] PR targets the `dev` branch.

## Tech Stack
TypeScript, `@stellar/stellar-sdk`, Soroban RPC JSON-RPC 2.0, Node.js.
