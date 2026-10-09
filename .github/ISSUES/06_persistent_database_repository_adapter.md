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

## Problem Summary
Currently, VeraOS includes an in-memory repository (`server/storage/memoryRepository.ts`) and Cloudflare D1 integration. For self-hosted Node.js / Docker production deployments, verification records and attempt histories do not survive server restarts unless connected to Cloudflare D1. We need a swappable SQLite / PostgreSQL persistent database adapter using standard connection strings to ensure high data integrity, durability, and horizontal scalability.

## Technical Scope & Architecture
- `server/storage/repository.ts`: Core `IVerificationRepository` interface.
- `server/storage/sqliteRepository.ts` (New): SQLite / PostgreSQL implementation.
- `server/storage/factory.ts`: Repository provider factory switching based on `DATABASE_URL` environment variable.
- `server/tests/repository.test.ts` (New): Automated CRUD integration tests.

## Expected Test Coverage
- CRUD tests for saving and retrieving `VerificationRecord` instances.
- Attempt history update tests ensuring retry loops preserve parent-child link.
- Schema auto-migration test on cold startup.
- Fallback test ensuring `MemoryRepository` is selected if no `DATABASE_URL` is set.
- 100% pass rate across existing automated test suites (`npm test`).
- Typecheck (`npx tsc -b`) and linter (`npm run lint`) clean with zero errors.

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
