---
title: "feat(remediation): automated remediation retry engine with unsigned XDR injection [High / 200 pts]"
labels: ["wave-task", "stellar", "remediation", "freighter", "complexity:high (200 pts)"]
assignees: []
---

# feat(remediation): automated remediation retry engine with unsigned XDR injection [High / 200 pts]

## Complexity Points Tier
- **Tier**: `High`
- **Drips Wave Points**: **200 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **P0 — Automated Remediation & Correction Loops** in our [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), when an AI agent underpays or incurs an invariant breach (e.g., expected 5.0 USDC, actual 0.5 USDC -> deficit 4.5 USDC), VeraOS emits a structured `RemediationDirective` with `CORRECT_TRANSACTION`.

Currently, the human operator or AI agent must manually calculate the delta and craft a brand-new transaction in external software. To turn VeraOS into an actionable, self-healing execution layer, we need an **Automated Remediation Transaction Synthesizer** that automatically constructs a valid, unsigned Stellar Transaction Envelope XDR transferring the exact deficit amount to the intended recipient. This unsigned XDR can be passed directly to the Freighter browser wallet for 1-click signing or injected into the Stellar Laboratory.

---

## 2. Technical Requirements & Architecture
- **Location**: `server/verification/remediationEngine.ts`, `server/stellar/remediationBuilder.ts`, and `src/pages/CorrectionLoop.tsx`.
- **XDR Construction**:
  - Utilizing `@stellar/stellar-sdk` `TransactionBuilder`:
    - Derive target `destinationAccount` and exact deficit amount (`requiredAmount - observedAmount`).
    - Resolve asset details (native `XLM` or credit alphanum `Asset(code, issuer)`).
    - Query source account sequence number or build with fee configuration suitable for Stellar Testnet/Mainnet.
    - Set transaction memo to `VeraOS:Fix:<verification_id>`.
    - Generate base64 unsigned Envelope XDR.
  - Deep-link generation:
    - Build ready-to-sign Stellar Laboratory URL (`https://laboratory.stellar.org/#txsigner?xdr=...`).
    - Embed Freighter wallet sign prompt payload for web dashboard integration.

---

## 3. Acceptance Criteria
- [ ] Create `server/stellar/remediationBuilder.ts` with `buildRemediationTransaction(params)`.
- [ ] Enhance `server/verification/remediationEngine.ts` to attach `unsignedXdr` and `laboratoryUrl` to `RemediationDirective` whenever `type === "CORRECT_TRANSACTION"`.
- [ ] In `src/pages/CorrectionLoop.tsx`, render a "1-Click Sign with Freighter" button and "Open in Stellar Laboratory" link when `unsignedXdr` is present.
- [ ] Include automated tests in `server/tests/remediationXdr.test.ts` verifying:
  - Correct deficit amount encoding in XDR for both XLM and USDC assets.
  - Verification that XDR successfully decodes via `TransactionBuilder.fromXDR`.
  - Proper formatting of Laboratory URL with URL-encoded XDR.
- [ ] All 84 automated tests continue passing (`npm test`).
- [ ] Typechecks pass (`npx tsc -b`) and linter clean (`npm run lint`).

---

## 4. Suggested Execution Steps
1. **Branch Creation**: Following our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/remediation-unsigned-xdr
   ```
2. **Implementation Files**:
   - `server/stellar/remediationBuilder.ts` (New XDR builder module)
   - `server/verification/remediationEngine.ts` (Integrate builder into directive engine)
   - `src/pages/CorrectionLoop.tsx` (UI Freighter / Lab action buttons)
   - `server/tests/remediationXdr.test.ts` (Unit & integration tests)
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
- Contributors must follow our [CONTRIBUTING.md](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md) guidelines and Conventional Commits standard (`feat(remediation): ...`).
