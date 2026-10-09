---
title: "feat(telegram): stateful session persistence with SQLite/Redis for conversational recovery [High / 200 pts]"
labels: ["wave-task", "telegram", "storage", "backend", "complexity:high (200 pts)"]
assignees: []
---

# feat(telegram): stateful session persistence with SQLite/Redis for conversational recovery [High / 200 pts]

## Complexity Points Tier
- **Tier**: `High`
- **Drips Wave Points**: **200 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **P1 — Enterprise Scalability & Storage** in our [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), the Telegram bot currently maintains user conversational state machines (`AWAITING_VERIFY_INPUT`, `AWAITING_CORRECT_INPUT`, `AWAITING_RESUBMIT_INPUT`) purely in-memory within `server/telegram/bot.ts`. 

In serverless webhook environments (e.g., Vercel Functions, Cloudflare Workers, or multi-replica Docker containers), process restarts or request routing across distinct worker instances wipe out active conversational sessions. If an operator starts a `/verify` prompt and enters payment output seconds later, the serverless instance might have recycled, causing an `unknown command` or lost context. We require a persistent session storage adapter (supporting SQLite for embedded instances and Redis for distributed clusters) that guarantees seamless multi-step conversational recovery across restarts.

---

## 2. Technical Requirements & Architecture
- **Location**: `server/telegram/sessionStore.ts` and `server/telegram/bot.ts`.
- **Session Architecture**:
  - Define an abstract `ITelegramSessionStore` interface with methods:
    - `getSession(chatId: string | number): Promise<TelegramSession | null>`
    - `setSession(chatId: string | number, session: TelegramSession, ttlSeconds?: number): Promise<void>`
    - `clearSession(chatId: string | number): Promise<void>`
  - Implement two pluggable backends:
    - `SqliteSessionStore`: Stored in local SQLite file or Cloudflare D1.
    - `RedisSessionStore` (or `MemorySessionStore` fallback): Powered by standard Redis URL (`REDIS_URL`).
  - Maintain a configurable TTL (default: 15 minutes / 900 seconds) after which abandoned conversational sessions cleanly expire.
  - Store pending task payloads, target transaction hashes, active verification IDs, and operator authorization contexts.

---

## 3. Acceptance Criteria
- [ ] Define `ITelegramSessionStore` interface in `server/telegram/sessionStore.ts`.
- [ ] Implement `SqliteSessionStore` with auto-migration (`telegram_sessions` table with columns: `chat_id`, `state`, `payload`, `updated_at`, `expires_at`).
- [ ] Support Redis adapter via standard connection string when `REDIS_URL` is set; fallback gracefully to SQLite or memory.
- [ ] Refactor `VeraTelegramBot` in `server/telegram/bot.ts` to use async session retrieval and updates instead of the in-memory Map.
- [ ] Add automated test suite in `server/tests/telegramSession.test.ts` validating:
  - Session preservation across bot instance instantiation.
  - Expiration and cleanup of stale sessions past TTL.
  - Concurrent updates from distinct chat IDs.
- [ ] 100% passing tests across all test suites (`npm test`).
- [ ] Zero TypeScript errors (`npx tsc -b`) and zero lint errors (`npm run lint`).

---

## 4. Suggested Execution Steps
1. **Branch Creation**: Following our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/telegram-stateful-sessions
   ```
2. **Implementation Files**:
   - `server/telegram/sessionStore.ts` (New session store interface & adapters)
   - `server/telegram/bot.ts` (Refactor session calls to use async sessionStore)
   - `server/tests/telegramSession.test.ts` (Integration test suite)
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
- Contributors must follow our [CONTRIBUTING.md](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md) guidelines and Conventional Commits standard (`feat(telegram): ...`).
