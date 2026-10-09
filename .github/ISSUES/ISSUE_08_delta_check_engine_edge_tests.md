---
title: "test(engine): expand integration test coverage for delta check edge cases [Trivial / 100 pts]"
labels: ["wave-task", "testing", "verification-engine", "complexity:trivial (100 pts)"]
assignees: []
---

# test(engine): expand integration test coverage for delta check edge cases [Trivial / 100 pts]

## Complexity Points Tier
- **Tier**: `Trivial`
- **Drips Wave Points**: **100 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **P0 — Acceptance Test Matrix** in our [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), VeraOS uses a mathematical delta evaluation engine (`server/verification/checkEngine.ts`) to determine financial variance (`expected - observed`) and render verdict classifications (`VERIFIED`, `FAILED`, `PARTIAL`).

While our test suite covers the primary deceptive benchmark (5.0 USDC claimed vs 0.5 USDC actual), we need to expand integration test coverage to rigorously test edge-case numerical scenarios: high-precision floating-point rounding (e.g. 7 decimal places on Stellar stroops), zero amounts, near-zero fractional deficits (e.g. 0.0000001 deficit), negative deltas, and multi-currency conversions. This ensures mathematical infallibility during high-volume autonomous micro-settlements.

---

## 2. Technical Requirements & Architecture
- **Location**: `server/tests/deltaCheckEdge.test.ts` and `server/verification/checkEngine.ts`.
- **Test Matrix Scope**:
  - Test scenarios to add using Node's native test runner (`node:test` via `tsx --test`):
    - **Stroop Precision**: Exact 7-decimal place matching on Stellar native amounts (`0.0000001 XLM`).
    - **Floating Point Rounding Safety**: Invariant matching with `0.1 + 0.2 = 0.30000000000000004` arithmetic guarding against false failure.
    - **Overpayment Tolerance**: Case where worker paid *more* than required (e.g. expected 5 USDC, observed 5.1 USDC) — verify system flags as `VERIFIED` with non-blocking overpayment advisory note.
    - **Zero Amount Rejection**: Worker claiming 0 USDC or negative amounts cleanly fails with `INVALID_AMOUNT`.
    - **Case-Insensitive Asset Codes**: `USDC` vs `usdc` vs `xlm` normalized cleanly.

---

## 3. Acceptance Criteria
- [ ] Create `server/tests/deltaCheckEdge.test.ts` containing at least 8 new test cases covering all edge cases listed above.
- [ ] Ensure all floating-point math uses epsilon comparison (`Number.EPSILON` or `1e-7` stroop precision) in `checkEngine.ts` if any rounding bugs are uncovered.
- [ ] Add the test file to the `npm test` script execution in `package.json`.
- [ ] All new tests pass with 100% success rate without flaky behavior.
- [ ] Zero regressions to existing 84-test automated suite (`npm test`).
- [ ] Typecheck passes cleanly (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] PR targets the `dev` branch.

---

## 4. Suggested Execution Steps
1. **Branch Creation**: Following our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b test/delta-check-edge-cases
   ```
2. **Implementation Files**:
   - `server/tests/deltaCheckEdge.test.ts` (New test suite)
   - `server/verification/checkEngine.ts` (Precision refinements if needed)
   - `package.json` (Include new test file in `test` script)
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
- Contributors must follow our [CONTRIBUTING.md](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md) guidelines and Conventional Commits standard (`test(engine): ...`).
