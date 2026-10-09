---
title: "[Wave]: Persistent SQLite / PostgreSQL Database Repository Adapter"
labels: ["wave-task", "drips-wave", "backend", "database", "complexity:medium (150 pts)"]
assignees: []
---

# [Wave]: Persistent SQLite / PostgreSQL Database Repository Adapter

## Complexity Points Tier
- **Complexity**: `Medium`
- **Drips Wave Points**: **150 Points**
- **Target Branch**: `dev`

---

## Summary
Implement a persistent database adapter satisfying `IVerificationRepository`, enabling VeraOS verification records, audit evidence traces, and operator session state to persist durably across server restarts and scale across multiple process instances.

## Why It Matters
Currently, VeraOS includes an in-memory repository (`server/storage/memoryRepository.ts`) and Cloudflare D1 integration. For self-hosted Node.js / Docker production deployments, a swappable SQLite / PostgreSQL adapter using standard connection strings ensures high data integrity and reliability.

## Architectural Pointers & Affected Files
- `server/storage/repository.ts`: Core `IVerificationRepository` interface.
- `server/storage/sqliteRepository.ts` (New): SQLite / PostgreSQL implementation.
- `server/storage/factory.ts`: Repository provider factory switching based on `DATABASE_URL` environment variable.
- `server/tests/repository.test.ts` (New): Automated CRUD integration tests.

## Acceptance Criteria
- [ ] Implement `SqliteRepository` supporting all methods of `IVerificationRepository`:
  - `save(record: VerificationRecord): Promise<void>`
  - `getById(id: string): Promise<VerificationRecord | null>`
  - `list(filter?: RecordFilter): Promise<VerificationRecord[]>`
  - `updateAttempt(id: string, attempt: VerificationAttempt): Promise<void>`
- [ ] Support automated schema migration on initialization.
- [ ] Gracefully fall back to `MemoryRepository` if no `DATABASE_URL` or database file is configured.
- [ ] Add integration tests in `server/tests/repository.test.ts` verifying persistence across repository instances.
- [ ] 100% test pass rate across all suites (`npm test`).
- [ ] TypeScript checks clean (`npx tsc -b`) and linter clean (`npm run lint`).
- [ ] PR targets the `dev` branch.

## Tech Stack
TypeScript, Node.js, SQLite / better-sqlite3 / Kysely.
