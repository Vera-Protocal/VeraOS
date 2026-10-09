---
title: "docs(infra): update README and guides with Docker Compose execution and troubleshooting [Trivial / 100 pts]"
labels: ["wave-task", "documentation", "docker", "devops", "complexity:trivial (100 pts)"]
assignees: []
---

# docs(infra): update README and guides with Docker Compose execution and troubleshooting [Trivial / 100 pts]

## Complexity Points Tier
- **Tier**: `Trivial`
- **Drips Wave Points**: **100 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **Contributor Onboarding & Runtime Parity** in our [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), new contributors across different operating systems (Windows WSL2, macOS Apple Silicon, Linux) must be able to spin up VeraOS with deterministic parity using Docker Compose without encountering silent failures.

Currently, `README.md` only includes a minimal 2-line snippet (`docker compose up --build`), and `docker-compose.yml` lacks service healthchecks and guidance for running the app without an active Telegram bot token. Contributors frequently run into issues such as container restart loops when `TELEGRAM_BOT_TOKEN` is unset, port 3001 collisions, and confusion on how to execute test suites within containerized environments.

---

## 2. Technical Requirements & Architecture
- **Documentation Updates**:
  - Create dedicated guide: `docs/DOCKER_GUIDE.md` detailing containerized architecture, service dependencies, environment configuration, and execution flows.
  - Update `README.md` Section 5 ("Docker Deployment") to provide an expanded quickstart and link directly to `docs/DOCKER_GUIDE.md`.
  - Update `docs/CONTRIBUTOR_ROADMAP.md` under development environment setup.
- **Docker Compose Enhancements (`docker-compose.yml`)**:
  - Add container healthcheck definition to `app` service using `/v1/health` (or `/health`):
    ```yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/v1/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 5s
    ```
  - Ensure `bot` service uses `condition: service_healthy` on `app` dependency so the bot does not start before the API is ready.
  - Ensure graceful fallback if `TELEGRAM_BOT_TOKEN` is empty (run app-only mode via `docker compose up app`).
- **Troubleshooting Scenarios to Document**:
  1. **Token Absence**: Explaining how to start VeraOS API without Telegram bot (`docker compose up app` or setting `TELEGRAM_MODE=disabled`).
  2. **Port Conflicts**: Resolving `bind: address already in use` on port 3001 (`PORT=3002 docker compose up`).
  3. **Container Test Execution**: Instructions on running the test suite inside the container (`docker compose run --rm app npm test`).
  4. **Soroban RPC Connectivity**: Verifying outbound HTTPS requests to `https://soroban-testnet.stellar.org` and DNS debugging inside Docker networks.
  5. **Live Log Inspection**: How to stream logs (`docker compose logs -f app` / `docker compose logs -f bot`).

---

## 3. Acceptance Criteria
- [ ] Create `docs/DOCKER_GUIDE.md` covering architecture, setup, commands, test execution, and comprehensive troubleshooting FAQ.
- [ ] Update `docker-compose.yml` with proper healthcheck and dependency conditions.
- [ ] Update `README.md` Section 5 with clear Docker run options (standalone app vs full stack with bot).
- [ ] Update `docs/CONTRIBUTOR_ROADMAP.md` linking to the new Docker Guide.
- [ ] Validate Docker Compose syntax with `docker compose config` (if Docker installed locally) or YAML linting.
- [ ] All automated tests (`npm test`), TypeScript check (`npx tsc -b`), and linter (`npm run lint`) pass cleanly.
- [ ] PR targets the `dev` branch.

---

## 4. Suggested Execution Steps
1. **Branch Creation**: Following our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b docs/docker-compose-troubleshooting
   ```
2. **Implementation Files**:
   - `docs/DOCKER_GUIDE.md` (New comprehensive guide)
   - `docker-compose.yml` (Healthcheck and service dependencies)
   - `README.md` (Update Docker deployment section)
   - `docs/CONTRIBUTOR_ROADMAP.md` (Update setup docs index)
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
- Contributors must follow our [CONTRIBUTING.md](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md) guidelines and Conventional Commits standard (`docs(infra): ...`).
