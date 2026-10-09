---
title: "feat(telegram): add Telegram bot inline query support for instant agent checks [Medium / 150 pts]"
labels: ["wave-task", "telegram", "integrations", "complexity:medium (150 pts)"]
assignees: []
---

# feat(telegram): add Telegram bot inline query support for instant agent checks [Medium / 150 pts]

## Complexity Points Tier
- **Tier**: `Medium`
- **Drips Wave Points**: **150 Points**
- **Target Integration Branch**: `dev`

---

## 1. Problem Summary & Roadmap Alignment
As outlined in **P2 — Ecosystem Expansion & Telegram MiniApp** in our [Contributor Roadmap](https://github.com/Vera-Protocal/VeraOS/blob/main/docs/CONTRIBUTOR_ROADMAP.md), the Telegram bot currently processes commands via direct chat messages (`/verify`, `/status`).

In multi-agent governance groups, DAOs, and developer channels, operators need to verify agent claims inline (e.g. typing `@VeraOS_Layer_bot V-1234` or `@VeraOS_Layer_bot agent_id` directly in any chat). Telegram Inline Queries enable instant lookup and sharing of verified cards without inviting the bot to the group or navigating away from conversation. We need to implement full Telegram Inline Query handling within the bot runner and webhook gateway.

---

## 2. Technical Requirements & Architecture
- **Location**: `server/telegram/bot.ts`, `server/telegram/types.ts`, and `server/api/routes.ts`.
- **Inline Query Specification**:
  - Handle `inline_query` updates in Telegram Update payload:
    - Match input string against verification ID patterns (`V-\d+` or UUID).
    - Match input string against registered Agent IDs (`agent-...`).
  - Answer inline queries with `answerInlineQuery` containing formatted `InlineQueryResultArticle` cards:
    - Title: Verification Verdict (`[VERIFIED] Task ...` or `[FAILED] Task ...`)
    - Description: Onchain proof status, Stellar transaction hash, and timestamp.
    - InputMessageContent: Rich markdown verdict card with direct link to Web Dashboard evidence explorer.
    - InlineKeyboardMarkup: "🔍 View Evidence on VeraOS" button linking to `https://vera-os.vercel.app/verifications/:id`.
  - Cache results using Telegram's `cache_time` parameter (30 seconds) to reduce backend load.

---

## 3. Acceptance Criteria
- [ ] Add `inline_query` event handling to `VeraTelegramBot` in `server/telegram/bot.ts`.
- [ ] Implement query matcher returning up to 5 matching recent verification runs or agent audit cards.
- [ ] Support fast query filtering with debounce.
- [ ] Add automated tests in `server/tests/telegramInline.test.ts` validating:
  - Parsing and answering valid inline query for verification ID.
  - Graceful response for unknown or empty query.
  - Format of `answerInlineQuery` payload.
- [ ] Zero regressions to existing 84-test automated suite (`npm test`).
- [ ] Typecheck passes cleanly (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] PR targets the `dev` branch.

---

## 4. Suggested Execution Steps
1. **Branch Creation**: Following our [branch strategy](https://github.com/Vera-Protocal/VeraOS/blob/main/CONTRIBUTING.md), branch off the `dev` branch:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/telegram-inline-queries
   ```
2. **Implementation Files**:
   - `server/telegram/bot.ts` (Inline query router & formatter)
   - `server/tests/telegramInline.test.ts` (Integration test suite)
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
