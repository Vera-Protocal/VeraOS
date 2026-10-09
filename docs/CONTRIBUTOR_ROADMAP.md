# VeraOS Product & Technical Roadmap

Welcome to the **VeraOS Product & Technical Roadmap**. This document outlines our prioritized roadmap and technical milestones for VeraOS.

This document details prioritized development milestones for open-source developers and enterprise integrators.

---

## Prioritized Roadmap Overview

### P0 — Submission Baseline (Completed)
- [x] Deterministic requirement and claim extraction engine.
- [x] Real Stellar RPC + Horizon evidence provider querying live Testnet ledger.
- [x] Envelope XDR parsing via `@stellar/stellar-sdk` for payment amounts, assets, and recipients.
- [x] Acceptance test: Deceptive worker detection (5.0 USDC claimed vs 0.5 USDC actual -> FAILED).
- [x] Dual-mode Telegram bot interface (long-polling runner + webhook endpoint).
- [x] GitHub Actions CI pipeline (Node 20/22 multi-version matrix).
- [x] Open-source hygiene (MIT License, SECURITY.md, CONTRIBUTING.md, Issue/PR templates).

### P1 — Enterprise Scalability & Storage (Active Milestones)
- [x] **Milestone 1**: Cloudflare D1 persistent SQLite database & user authentication schema.
- [ ] **Milestone 2**: Asynchronous Telegram completion webhook notifications.
- [ ] **Milestone 3**: Onchain Soroban Attestation Registry Contract in Rust.
- [ ] **Milestone 4**: Multi-operation Stellar transaction verification (batch payments, path payments).
- [ ] **Milestone 5**: Evidence dossier CSV / JSON export in Web Dashboard.
- [ ] **Milestone 6**: Soroban smart contract event parser for function call verification.

### P2 — Ecosystem Expansion (Future Enhancements)
- [ ] Decentralized Oracle consensus across multiple Soroban RPC nodes.
- [ ] SDK packages for Python (`pip install veraos`) and Go (`go get github.com/k-deejah/veraos-go`).
- [ ] Native Telegram WebApp / MiniApp interface for inline verification audits.
- [ ] Multi-asset liquidity pool slippage verification on Stellar DEX.

---

## Drips Wave Complexity Points Matrix

All backlog milestones are calibrated against the official Drips Stellar Wave Program complexity scale:

| Tier | Drips Points | Description |
| :--- | :--- | :--- |
| **Trivial** | **100 Points** | Scoped UI additions, exporter utilities, API documentation, or simple schema validations. |
| **Medium** | **150 Points** | Core verification logic, evidence provider extensions, async webhook integrations, or persistent database adapters. |
| **High** | **200 Points** | Onchain Soroban Rust smart contracts, decentralized consensus algorithms, or cryptographic attestation registries. |

> **PR Target Requirement**: All contributor PRs implementing roadmap tasks must target the **`dev`** integration branch as specified in [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## Technical Backlog Milestones

### Task 1: Persistent D1 / PostgreSQL Repository Adapter
- **Complexity**: `Medium` (150 Points)
- **Labels**: `wave-task`, `backend`, `database`, `complexity:medium (150 pts)`

#### Summary
Replace the in-memory repository with a swappable SQLite / PostgreSQL persistent database layer, ensuring verification records and attempt histories survive server restarts.

#### Why It Matters
Currently, verification records are held in memory (`server/storage/memoryRepository.ts`). Production deployments require persistent durability across restarts and multi-instance scaling.

#### Acceptance Criteria
- [ ] Implement `SqliteRepository` satisfying the `IVerificationRepository` interface in `server/storage/repository.ts`.
- [ ] Use standard connection string via `DATABASE_URL` environment variable.
- [ ] Auto-run database migrations on startup.
- [ ] Store complete verification records, attempts, checks, evidence, and remediation directives.
- [ ] Add integration tests in `server/tests/repository.test.ts` verifying CRUD operations.
- [ ] Zero regressions to existing automated tests (`npm test`).
- [ ] Pull request targets `dev` branch and passes all CI checks.

#### Tech Stack
TypeScript, Node.js, SQLite / better-sqlite3 or Kysely.

#### Dependencies
None (Ready to claim).

---

### Task 2: Asynchronous Telegram Completion Webhook Notifications
- **Complexity**: `Medium` (150 Points)
- **Labels**: `wave-task`, `telegram`, `integrations`, `complexity:medium (150 pts)`

#### Summary
Enable VeraOS to dispatch an automated Telegram push notification to the operator when an asynchronous verification run completes, especially when querying slow RPC or external oracle checks.

#### Why It Matters
When complex multi-check verifications take longer than a few seconds, users should not be forced to poll `/status`. The bot should proactively notify the user with the final verdict card.

#### Acceptance Criteria
- [ ] Add `telegramChatId` and `notifyOnComplete` flags to verification requests in `server/api/routes.ts`.
- [ ] When verification completes, if `telegramChatId` is present, automatically invoke `veraTelegramBot.sendMessage(chatId, verdictCard)`.
- [ ] Format verdict card with inline action buttons ("View Evidence", "Request Correction").
- [ ] Handle Telegram API network failures with graceful logging (do not block API response).
- [ ] Add unit tests verifying notification dispatch behavior in `server/tests/telegram.test.ts`.
- [ ] Pull request targets `dev` branch and passes all CI checks.

#### Tech Stack
TypeScript, Telegram Bot API, Node.js.

#### Dependencies
None (Ready to claim).

---

### Task 3: Onchain Soroban Attestation Registry Contract in Rust
- **Complexity**: `High` (200 Points)
- **Labels**: `wave-task`, `soroban`, `rust`, `smart-contracts`, `complexity:high (200 pts)`

#### Summary
Build and deploy a Soroban smart contract written in Rust that records cryptographic attestation certificates on the Stellar network whenever a task is successfully `VERIFIED`.

#### Why It Matters
Currently, VeraOS stores verification results in backend storage. Anchoring attestations into Soroban contract storage provides immutable onchain provenance that other smart contracts can query.

#### Acceptance Criteria
- [ ] Create `contracts/attestation_registry/` containing a Soroban smart contract in Rust.
- [ ] Contract function `record_attestation(verification_id, task_hash, worker_address, verdict, timestamp)`.
- [ ] Contract function `get_attestation(verification_id)` returning attestation struct.
- [ ] Deploy contract to Stellar Testnet and document Contract ID.
- [ ] Include automated Rust unit tests with `cargo test`.
- [ ] Update `server/verification/pipeline.ts` to call contract invocation when `VERIFIED`.
- [ ] Pull request targets `dev` branch and passes all CI checks.

#### Tech Stack
Rust, Soroban SDK (`soroban-sdk`), Stellar Testnet.

#### Dependencies
Stellar CLI (`stellar-cli`), Rust toolchain.

---

### Task 4: Multi-Operation Stellar Transaction Verification
- **Complexity**: `Medium` (150 Points)
- **Labels**: `wave-task`, `stellar`, `verification-engine`, `complexity:medium (150 pts)`

#### Summary
Enhance `StellarRpcProvider` to inspect all operations within a Stellar transaction envelope, supporting batch payments, path payments (`pathPaymentStrictReceive`, `pathPaymentStrictSend`), and account merges.

#### Why It Matters
Agents often batch multiple transfers or perform DEX path payments in a single transaction. Currently, `stellarRpcProvider.ts` only inspects the first operation.

#### Acceptance Criteria
- [ ] Update `getTransaction()` in `server/verification/evidenceProviders/stellarRpcProvider.ts` to decode all operations in `tx.operations`.
- [ ] Aggregate total payment amount sent to `destinationAccount` across all operations in the envelope.
- [ ] Support both native XLM and asset credit payments (`Asset.getCode()`).
- [ ] Add test cases in `server/tests/stellarRpc.test.ts` for transactions with 3+ payment operations.
- [ ] Pull request targets `dev` branch and passes all CI checks.

#### Tech Stack
TypeScript, `@stellar/stellar-sdk`, Soroban RPC.

#### Dependencies
None (Ready to claim).

---

### Task 5: Evidence Dossier CSV / JSON Export in Web Dashboard
- **Complexity**: `Trivial` (100 Points)
- **Labels**: `wave-task`, `frontend`, `ux`, `complexity:trivial (100 pts)`

#### Summary
Add an "Export Dossier" button on `VerificationDetail.tsx` and `EvidenceExplorer.tsx` allowing compliance officers to download the complete verification packet as JSON or CSV.

#### Why It Matters
Organizations deploying AI agents require downloadable audit trails for regulatory compliance, internal reporting, and dispute resolution.

#### Acceptance Criteria
- [ ] Add dropdown or button on `VerificationDetail.tsx`: "Export JSON" and "Export CSV".
- [ ] "Export JSON" downloads the raw, untruncated `VerificationRecord` object.
- [ ] "Export CSV" formats check name, status, expected, observed, delta, and Stellar explorer URL into spreadsheet rows.
- [ ] File naming convention: `veraos-verification-[displayId]-[timestamp].[json|csv]`.
- [ ] Test download interaction across modern browsers.
- [ ] Pull request targets `dev` branch and passes all CI checks.

#### Tech Stack
React 19, TypeScript, Tailwind CSS.

#### Dependencies
None (Ready to claim).

---

### Task 6: Soroban Smart Contract Event Parser
- **Complexity**: `High` (200 Points)
- **Labels**: `wave-task`, `soroban`, `oracle`, `complexity:high (200 pts)`

#### Summary
Implement a Soroban event evidence provider (`server/verification/evidenceProviders/sorobanEventProvider.ts`) that queries `getEvents` on Soroban RPC to verify that a worker agent triggered a specific contract event with expected topic and data parameters.

#### Why It Matters
When autonomous agents interact with Soroban protocols (e.g. minting tokens, providing liquidity, voting in DAOs), the ground-truth evidence is the emitted contract event.

#### Acceptance Criteria
- [ ] Implement `SorobanEventProvider` querying `getEvents` on `https://soroban-testnet.stellar.org`.
- [ ] Match event contract ID, topic XDR, and data XDR against requirement invariants.
- [ ] Extract human-readable values from ScVal XDR.
- [ ] Return structured `EvidenceResult` with status `passed` or `failed`.
- [ ] Add automated tests in `server/tests/sorobanEvent.test.ts`.
- [ ] Pull request targets `dev` branch and passes all CI checks.

#### Tech Stack
TypeScript, `@stellar/stellar-sdk`, Soroban RPC JSON-RPC 2.0.

#### Dependencies
None (Ready to claim).

---

### Task 7: REST API OpenAPI 3.1 Specification & Swagger UI
- **Complexity**: `Trivial` (100 Points)
- **Labels**: `wave-task`, `api`, `documentation`, `complexity:trivial (100 pts)`

#### Summary
Generate an OpenAPI 3.1 JSON/YAML specification for all VeraOS verification endpoints and serve an interactive Swagger UI documentation viewer at `/docs/api`.

#### Why It Matters
External AI agent frameworks (such as LangChain, AutoGen, or Eliza) need machine-readable OpenAPI specs to auto-generate client bindings and tool definitions.

#### Acceptance Criteria
- [ ] Provide `openapi.json` documenting `/v1/verify`, `/v1/status/:id`, `/v1/evidence/:id`, and `/v1/correct`.
- [ ] Embed Swagger UI or Scalar interactive docs viewer.
- [ ] Include detailed request/response schemas with Zod schema parity.
- [ ] Pull request targets `dev` branch and passes all CI checks.

#### Tech Stack
TypeScript, OpenAPI 3.1, Zod.

#### Dependencies
None (Ready to claim).

---

### Task 8: Prometheus Health & Latency Metrics Endpoint
- **Complexity**: `Trivial` (100 Points)
- **Labels**: `wave-task`, `observability`, `devops`, `complexity:trivial (100 pts)`

#### Summary
Implement a `GET /metrics` endpoint exposing standard Prometheus-formatted telemetry (verification latency, pass/fail ratios, Stellar RPC round-trip time).

#### Why It Matters
Enterprise node operators running VeraOS in production clusters require Prometheus metrics for alerting, Grafana dashboards, and SLA monitoring.

#### Acceptance Criteria
- [ ] Expose `GET /metrics` returning standard text-based Prometheus format.
- [ ] Track total verifications, count by verdict (`VERIFIED`, `FAILED`), and RPC duration histogram.
- [ ] Add test cases verifying metric counter increments on evaluation.
- [ ] Pull request targets `dev` branch and passes all CI checks.

#### Tech Stack
TypeScript, Prometheus metrics format, Node.js.

#### Dependencies
None (Ready to claim).

