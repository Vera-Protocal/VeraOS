---
title: "feat(security): implement rate limiting and payload size guards on /v1/verify API routes [Medium / 150 pts]"
labels: ["wave-task", "security", "api", "backend", "complexity:medium (150 pts)"]
assignees: []
---

# feat(security): implement rate limiting and payload size guards on /v1/verify API routes [Medium / 150 pts]

## Complexity Points Tier
- **Tier**: `Medium`
- **Drips Wave Points**: **150 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **Core Security Architecture & Principles** in our [Security Policy](https://github.com/Vera-Protocal/VeraOS/blob/main/SECURITY.md) and [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), VeraOS must guard against denial-of-service (DoS) attacks, payload ballooning, and upstream Stellar RPC flooding.

Currently, `POST /v1/verify` processes incoming JSON without strict token bucket rate-limiting or payload size capping. An adversarial client or runaway agent loop could flood the verification engine with massive prompt strings (several megabytes) or rapid concurrent requests, saturating server memory and exhausting testnet RPC quotas. We need production-grade rate limiting (e.g. 60 requests/minute per IP/API key) and strict body payload size guards (max 256KB) across both standalone Express server and Vercel serverless gateways.

---

## 2. Technical Requirements & Architecture
- **Location**: `server/middleware/securityGuards.ts`, `server/api/routes.ts`, and `server/api/server.ts`.
- **Security Guard Specifications**:
  - **Body Size Limiter**: Restrict `express.json()` and manual body parsing to `256kb` max payload. Reject oversized payloads immediately with HTTP `413 Payload Too Large` and standard JSON error response.
  - **Rate Limiting**:
    - Implement sliding window or token bucket in-memory rate limiter per client IP or `Authorization` Bearer token.
    - Limits: 60 requests per minute per IP for `/v1/verify`; 120 requests per minute for read-only `/v1/status` and `/v1/evidence`.
    - Emit standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.
    - Return HTTP `429 Too Many Requests` on breach with structured remediation directive.
  - **Input Sanitization**: Guard against nested object recursion attacks and regex denial of service (ReDoS) in task prompts.

---

## 3. Acceptance Criteria
- [ ] Create `server/middleware/securityGuards.ts` containing rate limiter and payload size validation middleware.
- [ ] Wire middleware into `server/api/routes.ts` for all `/v1/*` routes.
- [ ] Enforce 256KB body limit on JSON parsing with HTTP 413 error code.
- [ ] Return HTTP 429 with `Retry-After` header when request quota is exceeded.
- [ ] Add automated tests in `server/tests/securityGuards.test.ts` verifying:
  - Normal requests succeed within limit.
  - 61st request receives HTTP 429 with valid retry headers.
  - Request with >256KB payload receives HTTP 413.
  - Rate limits reset after window expiry.
- [ ] 100% pass rate across existing 84 automated tests (`npm test`).
- [ ] TypeScript checks clean (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] PR targets the `dev` branch.

---

## 4. Suggested Execution Steps
1. **Branch Creation**: Following our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/api-rate-limiting-guards
   ```
2. **Implementation Files**:
   - `server/middleware/securityGuards.ts` (New middleware)
   - `server/api/routes.ts` (Integrate middleware into route tree)
   - `server/tests/securityGuards.test.ts` (Integration tests)
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
- Contributors must follow our [CONTRIBUTING.md](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md) guidelines and Conventional Commits standard (`feat(security): ...`).
