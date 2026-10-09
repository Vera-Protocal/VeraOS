---
title: "docs(api): add OpenAPI/Swagger 3.1 specification schema for /v1/verify REST endpoints [Trivial / 100 pts]"
labels: ["wave-task", "documentation", "api", "openapi", "complexity:trivial (100 pts)"]
assignees: []
---

# docs(api): add OpenAPI/Swagger 3.1 specification schema for /v1/verify REST endpoints [Trivial / 100 pts]

## Complexity Points Tier
- **Tier**: `Trivial`
- **Drips Wave Points**: **100 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **P2 — Ecosystem Integration & Tool-Calling Tooling** in our [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), autonomous AI agent frameworks (LangChain, AutoGen, ElizaOS, CrewAI) need a standardized, machine-readable interface to invoke the VeraOS verification pipeline as a tool.

Currently, while our endpoints are operational in `server/api/routes.ts` and validated via Zod schemas in `server/types/schemas.ts`, we lack a formal, validated OpenAPI 3.1 / Swagger specification file. Providing `docs/openapi.yaml` and `docs/openapi.json` allows automated client SDK generation, Swagger UI exploration, and seamless integration into external agentic tool registries.

---

## 2. Technical Requirements & Architecture
- **Schema Format**: OpenAPI 3.1.0 specification stored in both YAML and JSON format:
  - `docs/openapi.yaml`
  - `docs/openapi.json`
- **Endpoints to Document**:
  1. `POST /v1/verify`: Submit task specifications, claimed amounts, and transaction hashes for consensus triangulation.
  2. `GET /v1/verify/{id}`: Retrieve verification record, verdict, delta evaluation, and evidence by ID.
  3. `GET /v1/verifications`: List historical verifications with filtering (status, limit, offset).
  4. `POST /v1/remediate/correct`: Generate corrective remediation directives for failed claims.
  5. `POST /v1/remediate/resubmit`: Submit corrected transaction hashes for verification re-evaluation.
  6. `GET /v1/health`: System status, Soroban RPC connectivity, Horizon connectivity.
  7. `GET /v1/metrics`: Prometheus-compatible verification metrics.
- **Data Models / Components**:
  - `VerificationRequest`: `task_id`, `task_description`, `expected_amount`, `asset_code`, `worker_claim` (amount, tx_hash, memo).
  - `VerificationVerdict`: Enum (`VERIFIED`, `FAILED`, `PARTIAL`).
  - `VerificationRecord`: Full domain record with timestamp, status, evidence traces, and verdict.
  - `RemediationDirective`: Structured remediation payload with corrective instructions and unsigned XDR metadata.
- **Route Exposure**:
  - Expose `GET /docs/openapi.json` in `server/api/routes.ts` serving the schema for Swagger UI / external agent scrapers.
- **Automated Validation Test**:
  - Add `server/tests/openapi.test.ts` to validate that the schema parses without errors and includes all required route paths.

---

## 3. Acceptance Criteria
- [ ] Create `docs/openapi.yaml` and `docs/openapi.json` compliant with OpenAPI 3.1.0.
- [ ] All request bodies, headers, response status codes (`200`, `400`, `404`, `500`), and domain types match `server/types/schemas.ts` and `server/types/domain.ts`.
- [ ] Add `GET /docs/openapi.json` route handler in `server/api/routes.ts`.
- [ ] Implement `server/tests/openapi.test.ts` verifying valid schema structure and route coverage.
- [ ] Pass all checks: `npm test`, `npx tsc -b`, and `npm run lint` with zero errors.
- [ ] PR targets the `dev` branch.

---

## 4. Suggested Execution Steps
1. **Branch Creation**: Following our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b docs/openapi-swagger-spec
   ```
2. **Implementation Files**:
   - `docs/openapi.yaml` (Complete OpenAPI 3.1 definition)
   - `docs/openapi.json` (JSON mirror for REST serving)
   - `server/api/routes.ts` (Serve `/docs/openapi.json` endpoint)
   - `server/tests/openapi.test.ts` (Schema validation test)
3. **Local Validation**:
   ```bash
   npm run lint
   npx tsc -b
   npm test
   npm run build
   ```

---

## 5. Mandatory Contributor PR Requirements
- All PRs must target the **`dev`** branch.
- PR description must include `Closes #<id>` (or `Fixes #<id>`) to link this issue.
- Contributors must follow our [CONTRIBUTING.md](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md) guidelines and Conventional Commits standard (`docs(api): ...`).
