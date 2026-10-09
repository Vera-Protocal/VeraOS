---
title: "[Wave]: Asynchronous Telegram Completion Webhook Notifications"
labels: ["wave-task", "drips-wave", "telegram", "integrations", "complexity:medium (150 pts)"]
assignees: []
---

# [Wave]: Asynchronous Telegram Completion Webhook Notifications

## Complexity Points Tier
- **Complexity**: `Medium`
- **Drips Wave Points**: **150 Points**
- **Target Branch**: `dev`

---

## Problem Summary
When AI agents submit tasks requiring multi-block confirmation on Stellar or external oracle corroboration, synchronous HTTP requests can time out or force operators to poll `/status`. Asynchronous Telegram dispatch allows operators to fire-and-forget while receiving interactive verdict cards the moment a verdict is reached. We need to add completion webhook dispatch capabilities from the verification engine directly to Telegram.

## Technical Scope & Architecture
- `server/api/routes.ts`: Add optional `telegramChatId` and `notifyOnComplete` fields to `/v1/verify` request schema.
- `server/telegram/bot.ts`: Helper method `sendVerificationVerdictCard(chatId, verification)`.
- `server/verification/pipeline.ts`: Hook into post-verdict completion event to dispatch webhook.
- `server/tests/telegram.test.ts`: Automated test suite validating dispatch behavior and error handling.

## Expected Test Coverage
- Unit tests verifying notification payload formatting with verdict badges (`✅ VERIFIED`, `❌ FAILED`).
- Mocked Telegram API delivery test ensuring failure to deliver does not fail the verification record.
- Security test preventing unauthorized cross-user telegram alert eavesdropping.
- 100% test pass rate across all suites (`npm test`).
- Typecheck (`npx tsc -b`) and linter (`npm run lint`) clean with zero errors.

## Acceptance Criteria
- [ ] Add `telegramChatId?: string | number` and `notifyOnComplete?: boolean` to `VerificationRequestSchema` in `server/verification/schemas.ts`.
- [ ] Implement `sendVerificationVerdictCard` formatting structured verdicts with inline action buttons:
  - "🔍 View Evidence" (direct link to Web Dashboard)
  - "🔄 Request Correction" (callback query for `/correct`)
- [ ] Safely handle network failures or blocked bots without aborting the core verification pipeline.
- [ ] Add tests in `server/tests/telegram.test.ts` verifying notification triggering.
- [ ] 100% test pass rate across all test suites (`npm test`).
- [ ] Zero typecheck errors (`npx tsc -b`) and zero lint errors (`npm run lint`).
- [ ] PR targets the `dev` branch.

## Tech Stack
TypeScript, Node.js, Telegram Bot API, Zod.
