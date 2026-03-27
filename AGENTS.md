# PlayStake — AGENTS.md

> OpenCode project context. Keep this file updated as the project evolves.

## What is PlayStake

A skill-based prediction market for GameFi on OneChain (Move VM).

Players stake USDO on their own in-game performance before a match ("I'll deal ≥ 8000 damage").
Spectators can also back players. After the match, the OnePlay oracle posts verified stats
on-chain and all bets auto-settle via smart contract. Zero admin key, zero house vig.

## Repository Layout

```
playstake/
├── AGENTS.md                     ← this file
├── contracts/                    ← Move smart contracts
│   ├── Move.toml
│   ├── sources/
│   │   ├── market.move           ← bet placement, escrow, market struct
│   │   ├── oracle.move           ← match result, OracleCap, evaluate_claim
│   │   └── settle.move           ← settlement logic
│   └── tests/
│       └── market_tests.move     ← unit tests (3 scenarios)
├── frontend/                     ← Vite + React 19 + TypeScript + React Router
│   └── src/
│       ├── main.tsx              ← App entry with router, wallet providers
│       ├── index.css             ← Tailwind + custom styles (cyan/violet/amber)
│       ├── constants/index.ts    ← PACKAGE_ID, MODULES, RPC_URL, STAT, OP
│       ├── hooks/useMarket.ts    ← usePlaceBet, useMarketOdds, useMyBets
│       ├── layouts/
│       │   └── Layout.tsx        ← Shared layout with navigation
│       └── pages/
│           ├── Home.tsx          ← Hero, featured markets, how it works
│           ├── Markets.tsx       ← Market listing with filters
│           ├── Live.tsx          ← Real-time match stats
│           ├── Portfolio.tsx     ← User bets, P&L, win rate
│           └── About.tsx          ← About page, FAQ
├── oracle-relay/
│   ├── package.json
│   ├── .env
│   └── index.ts                  ← WebSocket relay (needs OnePlay listener)
└── e2e/
    └── full_flow_test.ts         ← integration test (needs funded wallets)
```

## Tech Stack

- **Smart contracts**: Move (Sui-compatible via `sui move`)
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router
- **Blockchain SDK**: `@onelabs/sui` v1.26.2
- **Wallet**: `@onelabs/dapp-kit` v0.15.6
- **Oracle relay**: Node.js + TypeScript + ws

## Build & Test

```bash
# Build Move contracts
cd contracts && sui move build

# Run unit tests
cd contracts && sui move test

# Expected output:
# [ PASS ] playstake::market_tests::test_build_claim
# [ PASS ] playstake::market_tests::test_create_market
# [ PASS ] playstake::market_tests::test_oracle_init
# Test result: OK. Total tests: 3; passed: 3; failed: 0

# Build frontend
cd frontend && npm run build

# Start frontend dev server
cd frontend && npm run dev  # → http://localhost:5173
```

## Deployed Addresses

```
NETWORK:      testnet
RPC_URL:      https://rpc-testnet.onelabs.cc:443
PACKAGE_ID:   0xa8111bccb58757c9ef3d880e0667b53576648e6f5b3f9286a817e39cb34e3cc9
ORACLE_CAP_ID: 0x797af785ba04d3de243eb2e8e9d80a5f6c3eb71f19360b3c0fdedba11b105de4
CLOCK_OBJ:    0x6
```

## Key Conventions

### Move contracts
- Odds are `u64` where 180 = 1.80× multiplier
- FEE_BPS = 200 (2%) — taken from winning payout only
- Settlement is permissionless — anyone can call after oracle finalizes
- `Bet` has abilities `key, store` — user-owned on-chain object
- `Market` has ability `key` only — shared object

### TypeScript / Frontend
- Multi-page app with React Router (Home, Markets, Live, Portfolio, About)
- All amounts use 6-decimal raw bigint (USDO/OCT decimals)
- Human ↔ raw: `fromUsdo(human)`, `toUsdo(raw)`
- Hooks return `{ isLoading, txHash, error }` pattern
- WebSocket URL from `WS_URL` constant
- Use `@onelabs/sui/client` and `@onelabs/sui/transactions` for SDK imports
- `SuiClientProvider` from `@onelabs/dapp-kit` with `networks` config for OneChain
- Color scheme: cyan primary (#06b6d4), violet secondary (#8b5cf6), amber accent (#f59e0b)

### Testing
- Unit tests in `contracts/tests/market_tests.move`
- E2E test: `npx tsx e2e/full_flow_test.ts` (requires funded wallets)

## Environment Variables

```bash
# contracts/.env (for deploy scripts)
ORACLE_PRIVATE_KEY=<hex>

# oracle-relay/.env
PACKAGE_ID=<deployed>
ORACLE_PRIVATE_KEY=<hex>
RPC_URL=https://rpc-testnet.onelabs.cc:443
WS_PORT=3001

# frontend/.env
VITE_RPC_URL=https://rpc-testnet.onelabs.cc:443
VITE_WS_URL=ws://localhost:3001

# e2e/.env
PACKAGE_ID=<deployed>
TEST_PLAYER_KEY=<hex>
TEST_SPECTATOR_KEY=<hex>
TEST_ORACLE_KEY=<hex>
RPC_URL=https://rpc-testnet.onelabs.cc:443
```

## Current Status

- ✅ Move contracts compile with `sui move build` (warnings only)
- ✅ 3/3 unit tests passing
- ✅ Deployed to OneChain testnet: `0xa8111bccb58757c9ef3d880e0667b53576648e6f5b3f9286a817e39cb34e3cc9`
- ✅ Frontend builds with real PACKAGE_ID from .env
- ✅ Oracle relay with WebSocket listener for game events
- ✅ E2E test fully passing (create market → place bet → post result → settle → verify balances)

## Running the App

```bash
# Terminal 1: Start oracle relay
cd oracle-relay && npm run dev  # → ws://localhost:3001

# Terminal 2: Start frontend
cd frontend && npm run dev      # → http://localhost:5173
```

## Oracle Relay Protocol

Games report match results by sending WebSocket messages to `/game/<gameId>`:

```json
{
  "type": "match_completed",
  "payload": {
    "matchId": 12345,
    "finalizedAt": 1700000000000,
    "playerStats": [
      { "address": "0x...", "damage": 8500, "kills": 12, "placement": 1, "gold": 15000 }
    ]
  }
}
```

Frontend subscribes to updates via `/match/<matchId>`.

## Next Steps

These are all complete! The app is ready to run:

1. **Deploy contracts** — ✅ Already deployed to testnet
2. **Update PACKAGE_ID** — ✅ Synced in all .env files
3. **Test wallet integration** — Run frontend and test Connect Wallet
4. **OnePlay listener** — ✅ Implemented via WebSocket protocol
5. **Fund test wallets** — ✅ E2E test passed with funded wallets

To run locally:
```bash
cd oracle-relay && npm run dev   # Terminal 1: WebSocket relay
cd frontend && npm run dev       # Terminal 2: Frontend at localhost:5173
```
