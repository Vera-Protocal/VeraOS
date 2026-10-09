---
title: "[Wave]: REST API OpenAPI 3.1 Specification & Interactive Documentation"
labels: ["wave-task", "drips-wave", "api", "documentation", "complexity:trivial (100 pts)"]
assignees: []
---

# [Wave]: REST API OpenAPI 3.1 Specification & Interactive Documentation

## Complexity Points Tier
- **Complexity**: `Trivial`
- **Drips Wave Points**: **100 Points**
- **Target Branch**: `dev`

---

## Problem Summary
External AI agent frameworks (LangChain, AutoGen, CrewAI, ElizaOS) require machine-readable schemas to automatically construct tool bindings for autonomous verification calls. Currently, our API documentation is in markdown. We need a machine-readable OpenAPI 3.1 schema definition for all VeraOS REST endpoints and an interactive documentation viewer in the dashboard.

## Technical Scope & Architecture
- `server/api/routes.ts`: Existing REST route handlers (`/v1/verify`, `/v1/status/:id`, `/v1/evidence/:id`, `/v1/correct`, `/health`).
- `server/verification/schemas.ts`: Zod validation schemas for requests and payloads.
- `docs/openapi.json` (New): Machine-readable OpenAPI 3.1 definition.
- `src/pages/Docs.tsx`: Frontend documentation page embedding an interactive schema explorer.

## Expected Test Coverage
- Automated schema validation tests ensuring `docs/openapi.json` is valid OpenAPI 3.1.
- Schema parity test validating that Zod schemas in `server/verification/schemas.ts` match OpenAPI components.
- Zero regressions across existing 84 automated tests (`npm test`).
- Typecheck (`npx tsc -b`) and linter (`npm run lint`) clean with zero errors.

## Acceptance Criteria
- [ ] Document all existing routes:
  - `POST /v1/verify` (Submit task and worker output for evaluation)
  - `GET /v1/status/:id` (Query verification run status and verdict)
  - `GET /v1/evidence/:id` (Retrieve triangulated evidence traces)
  - `POST /v1/correct` (Trigger remediation directive workflow)
  - `GET /health` (System operational health)
- [ ] Request body and response schemas align 1:1 with `server/verification/schemas.ts`.
- [ ] Include Stellar testnet transaction hash and address format descriptions.
- [ ] TypeScript checks clean (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] All automated tests pass without regressions (`npm test`).
- [ ] PR targets the `dev` branch.

## Tech Stack
OpenAPI 3.1, TypeScript, Zod, JSON Schema.
