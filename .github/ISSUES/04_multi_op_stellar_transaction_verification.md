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

## Problem Summary
AI agents in production frequently bundle operations together into single Stellar transactions to economize on base fees and ensure atomicity. Currently, `stellarRpcProvider.ts` only inspects the first operation in `tx.operations`. If an agent batches multiple payments or executes a DEX path payment (`pathPaymentStrictReceive` or `pathPaymentStrictSend`), VeraOS may falsely report a payment deficit. We need `StellarRpcProvider` to decode and aggregate all payment operations within a single Stellar transaction envelope.

## Technical Scope & Architecture
- `server/verification/evidenceProviders/stellarRpcProvider.ts`: `getTransaction` method and Envelope XDR decoding.
- `server/verification/checkEngine.ts`: Evaluation logic matching expected payments against observed payment arrays.
- `server/tests/stellarRpc.test.ts`: Integration and unit test suites.

## Expected Test Coverage
- Unit tests for envelopes containing 3+ payment operations to the same destination (sum check).
- Unit tests for envelopes with mixed recipients (filtering only target recipient amount).
- Path payment test cases validating observed destination asset and amount.
- Regression tests ensuring single-operation payments continue passing with 100% accuracy.
- Typecheck (`npx tsc -b`) and linter (`npm run lint`) clean with zero errors.

## Acceptance Criteria
- [ ] Iterate through all operations inside `tx.operations` returned by `@stellar/stellar-sdk` TransactionBuilder/Envelope.
- [ ] Aggregate payment amounts sent to the target `destinationAccount` across multiple operations.
- [ ] Support both native asset (`XLM`) and credit alphanum assets (`USDC`, etc.).
- [ ] Support `pathPaymentStrictReceive` and `pathPaymentStrictSend` destination amounts.
- [ ] Add unit tests in `server/tests/stellarRpc.test.ts` covering multi-op scenarios.
- [ ] Existing automated tests pass without regressions (`npm test`).
- [ ] Typechecks pass (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] PR targets the `dev` branch.

## Tech Stack
TypeScript, `@stellar/stellar-sdk`, Stellar RPC / Horizon, Node.js.
