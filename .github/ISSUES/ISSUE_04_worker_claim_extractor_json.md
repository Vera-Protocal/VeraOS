---
title: "feat(extractor): enhance worker claim extractor regex for multi-step agent JSON outputs [Medium / 150 pts]"
labels: ["wave-task", "verification-engine", "json", "complexity:medium (150 pts)"]
assignees: []
---

# feat(extractor): enhance worker claim extractor regex for multi-step agent JSON outputs [Medium / 150 pts]

## Complexity Points Tier
- **Tier**: `Medium`
- **Drips Wave Points**: **150 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **P0 — Deterministic Requirement and Claim Extraction Engine** in our [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), the `ClaimExtractor` (`server/verification/claimExtractor.ts`) is designed to extract worker assertions (payment amounts, transaction hashes, recipients, and asset codes) from unstructured text outputs.

Modern AI agent frameworks (LangChain, AutoGen, CrewAI, ElizaOS) increasingly produce multi-step structured JSON outputs, Markdown code fences (````json ... ````), and function calling receipts. When an agent output contains nested JSON fields (such as `{"action": "stellar_payment", "details": {"txHash": "...", "amount": "5.0", "asset": "USDC"}}`), plain regex matching on raw text lines can misinterpret escaped strings, miss nested transaction hashes, or capture partial JSON syntax. We need `ClaimExtractor` to natively parse structured JSON and hybrid Markdown payloads prior to applying regex heuristics.

---

## 2. Technical Requirements & Architecture
- **Location**: `server/verification/claimExtractor.ts` and `server/types/domain.ts`.
- **JSON Parsing & Tree Traversal**:
  - Detect JSON structures within worker output:
    - Pure JSON bodies (`{ ... }` or `[ ... ]`).
    - Markdown fenced code blocks (````json\n{ ... }\n````).
    - Embedded JSON substrings within agent conversational chatter.
  - Safely parse with `JSON.parse` wrapped in try/catch (graceful fallback to text regex on malformed JSON).
  - Recursively traverse JSON objects and arrays to locate standardized agent transaction keys:
    - Transaction hash candidates: `txHash`, `hash`, `transaction_hash`, `tx_id`, `id`.
    - Payment amounts: `amount`, `value`, `total`, `paymentAmount`.
    - Recipient addresses: `recipient`, `destination`, `to`, `target`, `account`.
    - Asset symbols: `asset`, `currency`, `token`, `assetCode`.
- **Hybrid Claim Synthesis**:
  - Normalize claims extracted from JSON into standard `WorkerClaim` objects with high confidence (`confidence: 1.0`).

---

## 3. Acceptance Criteria
- [ ] Add `extractJsonClaims(workerOutput: string)` helper in `server/verification/claimExtractor.ts`.
- [ ] Support nested objects up to 5 levels deep without prototype pollution or performance degradation.
- [ ] Correctly parse Markdown-fenced JSON blocks (` ```json ` and ` ``` `).
- [ ] Preserve existing plain text extraction rules for non-JSON conversational outputs.
- [ ] Add comprehensive automated tests in `server/tests/claimExtractorJson.test.ts` covering:
  - ElizaOS agent transfer output schema.
  - LangChain tool execution output format.
  - CrewAI multi-agent JSON summary string.
  - Malformed/truncated JSON gracefully degrading to text extraction.
- [ ] Existing 84 tests pass without regressions (`npm test`).
- [ ] TypeScript checks clean (`npx tsc -b`) and linter clean (`npm run lint`).

---

## 4. Suggested Execution Steps
1. **Branch Creation**: Following our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/claim-extractor-json
   ```
2. **Implementation Files**:
   - `server/verification/claimExtractor.ts` (JSON parsing & normalization)
   - `server/tests/claimExtractorJson.test.ts` (Test suite for multi-agent payloads)
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
- Contributors must follow our [CONTRIBUTING.md](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md) guidelines and Conventional Commits standard (`feat(extractor): ...`).
