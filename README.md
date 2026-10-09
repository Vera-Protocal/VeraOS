# VeraOS

**The verification layer for AI agents.**  
*Verify before you trust.*

[![CI](https://github.com/k-deejah/VeraOS/actions/workflows/ci.yml/badge.svg)](https://github.com/k-deejah/VeraOS/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-84%2F84%20passing-brightgreen)](https://github.com/k-deejah/VeraOS)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Stellar](https://img.shields.io/badge/Stellar-Testnet%20%7C%20Soroban%20RPC-black?logo=stellar)](https://developers.stellar.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)


Autonomous AI agents are increasingly entrusted with high-stakes actions: settling payments, dispatching bounties, deploying liquidity, and executing Soroban smart contracts on Stellar. However, agents self-report their success. When an agent reports *"Payment of 5 USDC executed successfully"*, systems have historically trusted that claim at face value. 

**VeraOS** replaces blind trust with automated, deterministic verification. Sitting between task orchestrators and autonomous agents, VeraOS independently extracts requirements, pulls authoritative ground-truth evidence directly from primary sources (such as the Stellar blockchain ledger), runs deterministic verification checks, and renders a structured verdict with actionable remediation directives.

---

## 1. Product Overview

- **Positioning**: The verification layer for AI agents.
- **Core Mantra**: Verify before you trust.
- **Problem**: Large language models and autonomous agent frameworks suffer from the **self-reporting fallacy**. An agent may hallucinate a transaction hash, underpay due to slippage or parameter error, send to the wrong recipient, or report success on a reverted transaction.
- **Solution**: VeraOS never treats an agent's words as evidence. It extracts the claimed hypothesis and independently proves or disproves it against authoritative blockchain RPC and cryptographic evidence.

---

## 2. Core Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        User & Operator Ingress                         │
│  - Web Dashboard (React 19 + Tailwind CSS)                             │
│  - Telegram Bot (@VeraOSBot via long-polling runner or webhook)        │
│  - REST API Client / Agent Orchestrator (POST /v1/verify)              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      VeraOS Verification Pipeline                      │
│                                                                        │
│   1. Requirement Extractor                                             │
│      Task Prompt ──► [ Invariant Rules & Expected Bounds ]             │
│                                                                        │
│   2. Worker Claim Extractor                                            │
│      Worker Output ──► [ Extracted Claims & Assertions ]               │
│                                                                        │
│   3. Deterministic Check Engine                                        │
│      Triangulates claims against independent evidence providers:       │
│      ├── Stellar RPC Provider (Live Testnet Ledger & Horizon)          │
│      ├── Deterministic Kernel (Cardinality, bounds, structure)         │
│      └── Worker Output Provider (Baseline trace audit)                 │
│                                                                        │
│   4. Mathematical Verdict Synthesizer                                  │
│      Checks Map ──► VERIFIED | FAILED | PARTIAL | UNVERIFIABLE         │
│                                                                        │
│   5. Remediation Directive Engine                                      │
│      Failures ──► Structured Correction Directives (Amount, Target)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           Persistence & Audit                          │
│  - Verification Repository (Attempts, Checks, Evidence, Directives)    │
│  - Public Explorer Proofs (Stellar.Expert Testnet Links)               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Real Stellar Testnet Verification

VeraOS connects directly to **Stellar Soroban RPC** (`https://soroban-testnet.stellar.org`) and **Stellar Horizon** (`https://horizon-testnet.stellar.org`), decoding the signed transaction envelope XDR via `@stellar/stellar-sdk`.

### Critical Benchmark Scenario: Deceptive Worker Detection
1. **Task**: *"Send 5 USDC to GCEYAUYCI3WTE5GOD7CDLRJQPATQCLHMXY4Q3CEQ64RP5SVDWPFF5L2L."*
2. **Worker Claim**: *"Payment completed. I sent 5 USDC to GCEYAU... via transaction 108822f67b10e3ad38db576d60712939c1bdbe372c9d4729928d613605682759."*
3. **VeraOS Result**:
   - Queries Stellar RPC for hash `108822f6...`.
   - Discovers actual ledger payment operation transferred only **0.50 USDC**.
   - **Verdict**: `FAILED`.
   - **Structured Delta Check**:
     ```text
     Expected: 5 USDC
     Observed: 0.5 USDC
     Difference: -4.5 USDC
     Payment mismatch: Expected 5 USDC, but observed receipt shows 0.5 USDC (Deficit: 4.50 USDC).
     ```

### Live Testnet Verification Artifacts
| Role | Account / Transaction Hash | Explorer Link |
| :--- | :--- | :--- |
| **Recipient** | `GCEYAUYCI3WTE5GOD7CDLRJQPATQCLHMXY4Q3CEQ64RP5SVDWPFF5L2L` | [View on Stellar.Expert](https://stellar.expert/explorer/testnet/account/GCEYAUYCI3WTE5GOD7CDLRJQPATQCLHMXY4Q3CEQ64RP5SVDWPFF5L2L) |
| **Deceptive Tx (0.5 USDC)** | `108822f67b10e3ad38db576d60712939c1bdbe372c9d4729928d613605682759` | [View 0.5 USDC Tx](https://stellar.expert/explorer/testnet/tx/108822f67b10e3ad38db576d60712939c1bdbe372c9d4729928d613605682759) |
| **Corrected Tx (5.0 USDC)** | `62256096f306726197208231b00e422628b0bb83e104dabed9a74da5186afbaf` | [View 5.0 USDC Tx](https://stellar.expert/explorer/testnet/tx/62256096f306726197208231b00e422628b0bb83e104dabed9a74da5186afbaf) |

### Soroban RPC Integration Example
VeraOS directly interfaces with the Soroban RPC JSON-RPC 2.0 API (`https://soroban-testnet.stellar.org`) to inspect onchain transaction envelopes:

```typescript
import { TransactionBuilder, Networks } from "@stellar/stellar-sdk";

// 1. Query Soroban RPC for confirmed transaction
const rpcResponse = await fetch("https://soroban-testnet.stellar.org", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: { hash: txHash }
  })
}).then(res => res.json());

// 2. Decode signed envelope XDR on Stellar Testnet
const envelopeXdr = rpcResponse.result.envelopeXdr;
const tx = TransactionBuilder.fromXDR(envelopeXdr, Networks.TESTNET);

// 3. Deterministically inspect payment operations
for (const op of tx.operations) {
  if (op.type === "payment") {
    const destination = op.destination;
    const amount = parseFloat(op.amount);
    const asset = op.asset.isNative() ? "XLM" : op.asset.getCode();
    // Compare actual ledger state against AI agent claim
  }
}
```

---

## 4. Live Environments & Endpoints

| Environment | Service / URL | Status | Description |
| :--- | :--- | :--- | :--- |
| **Production Web Dashboard** | [`https://vera-os.vercel.app`](https://vera-os.vercel.app) | Live | Operator dashboard, verification explorer, evidence graphs |
| **Telegram Bot** | [`@VeraOS_Layer_bot`](https://t.me/VeraOS_Layer_bot) | Live | Conversational operator interface & command runner |
| **1-Click Permanent Invite** | [Join Telegram Bot](https://t.me/VeraOS_Layer_bot?start=invite_VERA-OFFICIAL) | Live | Instant operator onboarding with preloaded testnet credentials |
| **Health API** | `https://vera-os.vercel.app/health` | Live | Operational health check endpoint |
| **Local Dashboard** | `http://localhost:5173` | Local | Vite development server |
| **Local Standalone API** | `http://localhost:3001` | Local | Standalone Node.js Express API runner |
| **Stellar Soroban RPC** | `https://soroban-testnet.stellar.org` | Primary | Authoritative JSON-RPC 2.0 transaction ledger |
| **Stellar Horizon Testnet** | `https://horizon-testnet.stellar.org` | Fallback | High-availability fallback REST endpoint |

---

## 5. Quick Start & Local Setup

### 1. Installation
```bash
git clone https://github.com/Vera-Protocal/VeraOS.git
cd VeraOS
npm install
cp .env.example .env
```

### 2. Run Locally
```bash
# Start Vite development server + integrated API on http://localhost:5173
npm run dev

# Start standalone API server on http://localhost:3001
npm run server

# Start Telegram bot long-polling runner
npm run bot
```

### 3. Run Automated Tests
```bash
# Runs complete automated test suite (84+ passing tests across 13 test suites)
npm test

# Run linter and typecheck
npm run lint
npx tsc -b
```

### 4. Docker Deployment
```bash
# Run via Docker Compose
docker compose up --build
```

---

## 6. Telegram Bot Interface & Deployment

VeraOS includes a dedicated, production-ready Telegram bot supporting both **long-polling** (`getUpdates`) and **webhook** modes.

### Available Commands
- `/start` — Welcome message, system status, and command reference.
- `/verify` — Start interactive verification or inline evaluation (`/verify <task> | <output>`).
- `/status <id>` — Check live status card of a verification run.
- `/evidence <id>` — View onchain evidence and Stellar.Expert explorer links.
- `/correct <id> [note]` — Issue structured remediation directives.
- `/resubmit <id> [tx]` — Re-evaluate with corrected transaction hash.

### Bot Deployment Options

#### Option A: Standalone Long-Polling Runner (Development / VM)
Ideal for local development or dedicated server processes:
```bash
# 1. Set bot token in environment or .env
export TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"
export VERAOS_API_URL="http://localhost:5173"

# 2. Launch long-polling process
npm run bot
```

#### Option B: Serverless Webhook Ingress (Production / Cloud)
Ideal for containerized or edge deployments:
1. Configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in your hosting environment.
2. Register the webhook with Telegram:
   ```bash
   curl -F "url=https://your-domain.com/v1/telegram/webhook" \
        -F "secret_token=your_secret_token" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```
3. Inbound requests to `/telegram/webhook` or `/v1/telegram/webhook` are automatically authenticated and processed.

See [`docs/TELEGRAM_BOT.md`](./docs/TELEGRAM_BOT.md) for full configuration, session state machines, and security architecture.

---

## 7. REST API Reference

### Execute Verification: `POST /v1/verify`
```bash
curl -X POST http://localhost:5173/v1/verify \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Send 5 USDC to GCEYAUYCI3WTE5GOD7CDLRJQPATQCLHMXY4Q3CEQ64RP5SVDWPFF5L2L.",
    "worker": {
      "id": "agent-alpha-09",
      "output": "Payment completed via tx 108822f67b10e3ad38db576d60712939c1bdbe372c9d4729928d613605682759."
    }
  }'
```

See [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) for complete endpoint schemas.

---

## 8. Contributor Backlog & Drips Wave Program

VeraOS maintains a categorized open-source backlog mapped to the official 
- **Technical Roadmap**: Detailed milestone specifications in [`docs/CONTRIBUTOR_ROADMAP.md`](./docs/CONTRIBUTOR_ROADMAP.md).
- **Contributing Guide**: Review branch strategy (`main`/`dev`) and PR standards in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## 9. Documentation Index

- [Architecture & Data Flow](./docs/ARCHITECTURE.md)
- [Stellar RPC & Horizon Integration](./docs/STELLAR_INTEGRATION.md)
- [Telegram Bot Guide](./docs/TELEGRAM_BOT.md)
- [REST API Reference](./docs/API_REFERENCE.md)
- [Technical Roadmap & Backlog](./docs/CONTRIBUTOR_ROADMAP.md)
- [Demo Script & Video Narration](./docs/DEMO_SCRIPT.md)

---

## 10. Security & Governance

- **Security Policy**: See [`SECURITY.md`](./SECURITY.md) for vulnerability disclosure and reporting SLAs.
- **Contributing**: See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for development workflows and PR templates.
- **License**: Released under the [MIT License](./LICENSE).
- **Maintainers**: Maintained by [@k-deejah](https://github.com/k-deejah) and the VeraOS Open Source Contributors.

