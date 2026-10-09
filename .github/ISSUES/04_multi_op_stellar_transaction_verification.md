---
title: "[Wave]: Multi-Operation Stellar Transaction Envelope Decoding"
labels: ["wave-task", "drips-wave", "stellar", "verification-engine", "complexity:medium (150 pts)"]
assignees: []
---

# [Wave]: Multi-Operation Stellar Transaction Envelope Decoding

## Complexity Points Tier
- **Complexity**: `Medium`
- **Drips Wave Points**: **150 Points**
- **Target Branch**: `dev`

---

## Summary
Enhance `StellarRpcProvider` to decode and aggregate all payment operations within a single Stellar transaction envelope, properly handling batch transfers, path payments (`pathPaymentStrictReceive` and `pathPaymentStrictSend`), and account merges.

## Why It Matters
AI agents in production frequently bundle operations together into single Stellar transactions to economize on base fees and ensure atomicity. Currently, `stellarRpcProvider.ts` inspects only the first operation, which can cause false rejections on multi-payment envelopes.

## Architectural Pointers & Affected Files
- `server/verification/evidenceProviders/stellarRpcProvider.ts`: `getTransaction` method and Envelope XDR decoding.
- `server/verification/checkEngine.ts`: Evaluation logic matching expected payments against observed payment arrays.
- `server/tests/stellarRpc.test.ts`: Integration and unit test suites.

## Acceptance Criteria
- [ ] Iterate through all operations inside `tx.operations` returned by `@stellar/stellar-sdk` TransactionBuilder/Envelope.
- [ ] Aggregate payment amounts sent to the target `destinationAccount` across multiple operations.
- [ ] Support both native asset (`XLM`) and credit alphanum assets (`USDC`, etc.).
- [ ] Support `pathPaymentStrictReceive` and `pathPaymentStrictSend` destination amounts.
- [ ] Add unit tests in `server/tests/stellarRpc.test.ts` covering:
  - Envelope with 3 distinct payments to same destination (cumulative sum check).
  - Envelope with mixed destinations (filtering correct recipient).
  - Path payment with slippage bounds.
- [ ] Existing 84 tests pass without regressions (`npm test`).
- [ ] Typechecks pass (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] PR targets the `dev` branch.

## Tech Stack
TypeScript, `@stellar/stellar-sdk`, Stellar RPC / Horizon, Node.js.
