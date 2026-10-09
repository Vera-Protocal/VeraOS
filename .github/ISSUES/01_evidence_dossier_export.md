---
title: "[Wave]: Evidence Dossier CSV & JSON Export in Web Dashboard"
labels: ["wave-task", "drips-wave", "frontend", "complexity:trivial (100 pts)"]
assignees: []
---

# [Wave]: Evidence Dossier CSV & JSON Export in Web Dashboard

## Complexity Points Tier
- **Complexity**: `Trivial`
- **Drips Wave Points**: **100 Points**
- **Target Branch**: `dev`

---

## Problem Summary
When AI agents execute financial workflows or settle payments on Stellar, risk managers and enterprise auditors require portable compliance dossiers for audit retention, reporting, and dispute resolution. Currently, records can only be viewed in-browser. We need one-click export capabilities on `VerificationDetail.tsx` and `EvidenceExplorer.tsx` to download complete verification records in structured JSON and flattened CSV formats.

## Technical Scope & Architecture
- `src/pages/VerificationDetail.tsx`: Main verification view where export triggers should appear.
- `src/pages/EvidenceExplorer.tsx`: Detailed evidence triangulation view.
- `src/types/verification.ts`: TypeScript definitions for `VerificationRecord`, `VerificationCheck`, and `EvidenceSource`.
- `src/lib/exportUtils.ts` (New): Utility functions for serializing verification trees into CSV and JSON Blob downloads.

## Expected Test Coverage
- Unit tests validating JSON & CSV serialization structure and encoding.
- Verification tests ensuring complex nested structures (evidence traces, remediation directives) format cleanly without truncation.
- Zero regressions against existing automated test suites (`npm test`).
- Typecheck (`npx tsc -b`) and linter (`npm run lint`) clean with zero errors.

## Acceptance Criteria
- [ ] Create `src/lib/exportUtils.ts` with:
  - `exportVerificationAsJson(record: VerificationRecord): void`
  - `exportVerificationAsCsv(record: VerificationRecord): void`
- [ ] JSON export generates indented, untruncated serialization of the entire verification packet.
- [ ] CSV export flattens checks with columns: `Check Name`, `Status`, `Provider`, `Expected`, `Observed`, `Delta`, `Explorer Link`.
- [ ] Export buttons styled cleanly with Lucide icons (`Download`, `FileSpreadsheet`, `FileCode`) matching the dark-mode aesthetic.
- [ ] Filenames formatted as: `veraos-audit-[displayId]-[timestamp].[json|csv]`.
- [ ] Zero regressions to existing test suites (`npm test`).
- [ ] TypeScript checks clean (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] PR targets the `dev` branch and follows Conventional Commits (`feat(dashboard): ...`).

## Tech Stack
React 19, TypeScript, Tailwind CSS, Lucide React.
