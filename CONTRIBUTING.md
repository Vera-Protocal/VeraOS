# Contributing to VeraOS

Thank you for your interest in contributing to **VeraOS — The verification layer for AI agents**!

VeraOS is an open-source verification platform for autonomous agents and financial workflows on the Stellar network. We welcome contributions from developers, researchers, and AI agent creators across the ecosystem.

---

## 1. Development Setup

### Prerequisites
- **Node.js**: v20.x or higher (v22+ recommended)
- **npm**: v10.x or higher
- **Git**

### Clone & Install
```bash
# Clone repository
git clone https://github.com/k-deejah/VeraOS.git
cd VeraOS

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### Running Locally
```bash
# Run web dashboard and API (Vite development server)
npm run dev

# Run standalone API server (port 3001)
npm run server

# Run Telegram bot runner (long-polling)
npm run bot
```

The web dashboard is served at `http://localhost:5173`.
The system health check is available at `http://localhost:5173/health`.

---

## 2. Architecture Quick Reference

Before making changes, understand where your code belongs:

- `server/verification/`: Core verification engine.
  - `requirementExtractor.ts`: Extracts invariants from task descriptions.
  - `claimExtractor.ts`: Parses worker output claims.
  - `checkEngine.ts`: Executes deterministic evaluations.
  - `evidenceProviders/`:
    - `stellarRpcProvider.ts`: Authoritative Stellar RPC & Horizon queries, Envelope XDR decoding.
    - `deterministicProvider.ts`: Local deterministic kernel for counts, bounds, and payment delegation.
  - `verdictEngine.ts`: Synthesizes final `VERIFIED` or `FAILED` structured verdict.
  - `remediationEngine.ts`: Generates precise correction directives for failed runs.
- `server/telegram/`:
  - `bot.ts`: Telegram bot command router, session management, and long-polling engine.
  - `runner.ts`: Standalone process runner.
- `src/`: React 19 + Tailwind CSS frontend (Landing page, Verify widget, Evidence explorer, Correction loop).

---

## 3. Testing & Quality Standards

Every contribution must maintain full automated test coverage and pass all lint and typecheck checks:

```bash
# Run the automated test suite (28+ tests)
npm test

# Run linter
npm run lint

# Run TypeScript typecheck
npx tsc -b

# Verify production build
npm run build
```

---

## 4. Branch Strategy & Git Workflow

We enforce a clean, disciplined Git branching model to ensure production stability:

```text
       hotfix/* ───────────────┐
                               ▼
main  ─────────●───────────────●─────────●──────── (Production Releases)
               ▲               ▲         ▲
               │ release/*     │         │
dev   ─────────●───────●───────●─────────●──────── (Active Integration)
                       ▲       ▲
                       │       │
              feat/* ──┘       └── fix/*
```

### Primary Branches
- **`main` (Production)**:
  - Contains strictly stable, audited, production-ready code.
  - Releases are tagged on `main` following SemVer (e.g., `v0.2.0`).
  - **Protected**: Direct pushes are blocked. Merges into `main` require a signed release PR originating from `dev` or a hotfix PR.
- **`dev` (Active Integration)**:
  - The default development and integration branch.
  - **All contributor Pull Requests must target `dev`** (unless submitting an urgent emergency hotfix against `main`).
  - Continuously tested by our multi-version CI pipeline (Node 20.x and 22.x).

### Working Branches
Always branch off the latest `dev` branch:
- `feat/<feature-name>`: New verification engines, evidence providers, UI components, or integrations.
- `fix/<bug-description>`: Bug fixes and error remediation.
- `docs/<topic>`: Documentation enhancements, architecture diagrams, or contributor guides.
- `test/<suite-name>`: New test coverage, mocks, or acceptance test scenarios.
- `hotfix/<patch-name>`: Urgent production fixes branched from `main` and backported to `dev`.

```bash
# Ensure you are on the latest dev branch
git checkout dev
git pull origin dev

# Create your feature branch
git checkout -b feat/stellar-multi-operation
```

### Commit Conventions
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
```text
<type>(<scope>): <short description>

Examples:
feat(stellar): add multi-operation payment inspection
fix(telegram): handle rate-limit retry backoff gracefully
docs(readme): document live testnet transaction explorer links
test(engine): add deceptive worker edge cases for slippage bounds
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

### Critical Hygiene Rules
- **DO NOT** use `git add .`. Explicitly stage modified files (`git add <file>`).
- **DO NOT** commit secrets, private keys, bot tokens, or `.env` files.
- Rebase onto `origin/dev` prior to submitting your PR to ensure a linear, conflict-free history:
  ```bash
  git fetch origin
  git rebase origin/dev
  ```

---

## 5. Pull Request & Review Guidelines

Every Pull Request is thoroughly evaluated for correctness, code quality, and security:

### PR Preparation Checklist
Before opening a Pull Request, confirm that:
1. **Target Branch is `dev`**: Verify your PR is opened against `base: dev`.
2. **Issue Linked**: The PR body includes `Fixes #<issue-number>` or `Closes #<issue-number>`.
3. **PR Template Completed**: Complete all sections of `.github/pull_request_template.md`.
4. **Pre-flight Quality Checks Pass Locally**:
   ```bash
   # 1. Zero lint warnings
   npm run lint

   # 2. TypeScript compilation clean
   npx tsc -b

   # 3. Complete automated test suite (84+ tests passing across 13 suites)
   npm test

   # 4. Production build succeeds cleanly
   npm run build
   ```
5. **No Regressions**: No existing tests are broken or skipped.

### Code Review & Merging Policy
- **Automated CI**: GitHub Actions runs the `validate` workflow across Node 20.x and 22.x on push and PR. All matrix runs must pass green.
- **Maintainer Approval**: At least one maintainer review from `@k-deejah` (or designated code owners) is required.
- **Merge Strategy**: PRs are merged via **Squash and Merge** to maintain a clean, readable commit log on `dev`.

---

## 6. Drips Wave Contributor Program & Complexity Points

VeraOS proudly participates in the **Drips Stellar Wave Program** to reward open-source contributors:

### Point Allocation Tiers
Tasks in our backlog and issue tracker are tagged with standardized complexity points:

| Tier | Drips Points | Description & Scope | Example Tasks |
| :--- | :--- | :--- | :--- |
| **Trivial** | **100 Points** | Low-effort improvements, export utilities, UI polish, docs | Evidence dossier CSV/JSON export, OpenAPI spec, doc guides |
| **Medium** | **150 Points** | Core feature extensions, new API routes, webhook dispatchers | Multi-operation Stellar envelope decoding, Telegram async alerts, SQLite repository |
| **High** | **200 Points** | Complex onchain logic, Soroban smart contracts, cryptography | Soroban Attestation Registry contract in Rust, Soroban event parser, multi-RPC consensus |

### How to Claim & Submit Wave Tasks
1. **Select a Task**: Browse open issues tagged `wave-task` or review `docs/CONTRIBUTOR_ROADMAP.md` and `.github/ISSUES/`.
2. **Claim the Task**: Comment on the issue: *"I would like to work on this task. @k-deejah please assign to me."* Wait for assignment confirmation before writing code.
3. **Implement on `dev`**: Branch off `dev`, implement the requirements, and add automated tests under `server/tests/`.
4. **Submit PR**: Open your PR targeting `dev`, tagging the issue (`Fixes #<number>`) and selecting the `🌊 Drips Wave task completion` checkbox.
5. **Point Distribution**: Upon maintainer review and merge into `dev`, completion will be verified and Drips points credited.

---

## 7. Community & Communication

- **Telegram Operator Community**: Join our developer discussion on Telegram via [@VeraOSBot](https://t.me/VeraOSBot).
- **Issue Tracker**: Use GitHub Issues for bug reports and feature proposals.
- **Security Inquiries**: Email `security@veraos.network` or submit a private GitHub advisory (see [`SECURITY.md`](./SECURITY.md)).

