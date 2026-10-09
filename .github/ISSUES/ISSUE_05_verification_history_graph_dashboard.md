---
title: "feat(dashboard): build live verification history graph component with Recharts [Medium / 150 pts]"
labels: ["wave-task", "frontend", "dashboard", "recharts", "complexity:medium (150 pts)"]
assignees: []
---

# feat(dashboard): build live verification history graph component with Recharts [Medium / 150 pts]

## Complexity Points Tier
- **Tier**: `Medium`
- **Drips Wave Points**: **150 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **P1 — Enterprise Scalability & Storage** in our [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), the VeraOS React web dashboard (`src/pages/Dashboard.tsx`) presents metrics via stat cards and a tabular verification list.

Enterprise risk officers overseeing fleets of autonomous AI agents need an immediate visual overview of verification velocity, pass/fail ratios over time, and latency trends. We need a modern, responsive **Verification History Graph Component** integrated into the main dashboard, visualizing cumulative verifications, daily pass/fail distributions, and average RPC response times.

---

## 2. Technical Requirements & Architecture
- **Location**: `src/components/dashboard/VerificationHistoryGraph.tsx` and `src/pages/Dashboard.tsx`.
- **Charting Library**: `recharts` (already compatible with React 19).
- **Component Capabilities**:
  - Time Range Selector: `24H`, `7D`, `30D`, `All Time`.
  - Visualizations:
    - Dual-axis Area/Bar Chart displaying Total Verifications (Area) overlaid with `VERIFIED` (Green `#1D7A46`) and `FAILED` (Red `#D9383A`) volume bars.
    - Interactive Tooltip displaying exact count, failure percentage, and average latency for that time bucket.
    - Responsive design adhering to VeraOS's warm dark/light aesthetic and Tailwind CSS tokens (`#F7F5F0`, `#191513`, `#D97736`).
  - Empty & Loading States: Elegant skeleton loaders and zero-data placeholders.

---

## 3. Acceptance Criteria
- [ ] Create `VerificationHistoryGraph.tsx` in `src/components/dashboard/`.
- [ ] Aggregate raw verification records into hourly (for 24H) or daily (for 7D/30D) timeseries buckets.
- [ ] Embed the component prominently on `src/pages/Dashboard.tsx` above or beside the recent verifications table.
- [ ] Support responsive resizing across mobile (<640px) and desktop viewports without horizontal overflow.
- [ ] Fully typed with TypeScript interfaces matching `VerificationRecord`.
- [ ] Build succeeds cleanly (`npm run build`) without React Compiler or hydration warnings.
- [ ] Linter passes with zero errors (`npm run lint`).
- [ ] PR targets the `dev` branch.

---

## 4. Suggested Execution Steps
1. **Branch Creation**: Following our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/dashboard-history-graph
   ```
2. **Implementation Files**:
   - `src/components/dashboard/VerificationHistoryGraph.tsx` (New chart component)
   - `src/pages/Dashboard.tsx` (Integrate chart into dashboard layout)
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
- Contributors must follow our [CONTRIBUTING.md](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md) guidelines and Conventional Commits standard (`feat(dashboard): ...`).
