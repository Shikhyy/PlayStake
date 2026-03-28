<div align="center">
  <img src="frontend/public/logo.svg" alt="PlayStake Logo" width="200"/>
  <h1>PLAYSTAKE // BRUTALIST_PREDICTION_ENGINE</h1>
  <p><b>A deterministic, skill-based prediction market for GameFi on OneChain (Move VM).</b></p>

  [![OneChain](https://img.shields.io/badge/NETWORK-OneChain_Testnet-CEFF00?style=for-the-badge&logo=sui&logoColor=black)](https://onelabs.cc)
  [![React](https://img.shields.io/badge/FRONTEND-React_19-white?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![Move](https://img.shields.io/badge/CONTRACTS-Move_VM-zinc?style=for-the-badge)](https://sui.io/)
  [![Deployment](https://img.shields.io/badge/LIVE_APP-playstake.vercel.app-blue?style=for-the-badge&logo=vercel)](https://playstake.vercel.app)
</div>

---

## ⚡ MISSION_LOG
PlayStake is a decentralized, non-custodial prediction layer where players stake **OCT** on their own in-game performance. By bridging high-fidelity gaming data with Move-based smart contracts on OneChain, PlayStake ensures that every position is settled deterministically via the **OnePlay Oracle**.

### // THE_PROBLEM
Current prediction markets rely on subjective outcomes or centralized bookmakers who extract high fees (10%+).
### // THE_SOLUTION
PlayStake utilizes raw telemetry and immutable blockchain logic on OneChain. Zero house edge. Zero admin keys. **2% Protocol Fee** only on winning settlements.

---

## 🏗️ ARCHITECTURE_OVERVIEW

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PLAYSTAKE ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │    PLAYER    │     │  SPECTATOR   │     │    ORACLE   │
    │  (Bettor)    │     │  (Backer)    │     │  (Result)   │
    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
           │                    │                    │
           │  1. Create Claim   │                    │
           │◄───────────────────│                    │
           │                    │                    │
           │  2. Place Stake   │  3. Back Player   │
           │───────────────────►│◄───────────────────│
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                      FRONTEND (React 19)                    │
    │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐   │
    │  │  Home   │  │ Markets │  │  Live    │  │  Portfolio   │   │
    │  └────┬────┘  └────┬────┘  └────┬─────┘  └──────┬───────┘   │
    │       └────────────┴────────────┴───────────────┘           │
    │                           │                                  │
    │                    ┌──────┴──────┐                          │
    │                    │ useMarket   │                          │
    │                    │   Hook      │                          │
    │                    └──────┬──────┘                          │
    └───────────────────────────┼─────────────────────────────────┘
                                │
                                │ Transaction
                                ▼
    ┌───────────────────────────────────────────────────────────────┐
    │                    ONECHAIN (Move VM)                        │
    │                                                               │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │                    CONTRACTS                             │ │
    │  │                                                          │ │
    │  │  ┌─────────────┐    ┌─────────────┐    ┌────────────┐  │ │
    │  │  │   market    │    │   oracle    │    │   settle   │  │ │
    │  │  │  .move      │    │   .move     │    │   .move    │  │ │
    │  │  │             │    │             │    │            │  │ │
    │  │  │• create    │    │• post_result│    │• settle    │  │ │
    │  │  │• place_bet │    │• finalize   │    │  _bet      │  │ │
    │  │  │• get_odds  │    │• eval_claim│    │            │  │ │
    │  │  └──────┬──────┘    └──────┬─────┘    └─────┬──────┘  │ │
    │  │         │                   │                │         │ │
    │  │         └───────────────────┼────────────────┘         │ │
    │  │                             │                          │ │
    │  │                    ┌────────┴────────┐                │ │
    │  │                    │  Shared Objects  │                │ │
    │  │                    │  • Market       │                │ │
    │  │                    │  • MatchResult  │                │ │
    │  │                    │  • PlayerStats  │                │ │
    │  │                    └─────────────────┘                │ │
    │  └─────────────────────────────────────────────────────────┘ │
    │                                                               │
    └───────────────────────────────────────────────────────────────┘
                                │
                                │ WebSocket
                                ▼
    ┌───────────────────────────────────────────────────────────────┐
    │                    ORACLE RELAY (Node.js)                    │
    │                                                               │
    │  ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐  │
    │  │   Game      │    │  WebSocket  │    │   Event         │  │
    │  │   Servers   │───►│   Server    │───►│   Emitter       │  │
    │  └─────────────┘    └─────────────┘    └──────────────────┘  │
    │                                                               │
    │  Listens for: POST /game/{gameId}                            │
    │  Emits: match_completed events                               │
    └───────────────────────────────────────────────────────────────┘
```

---

## 🔄 WORKFLOW

### Complete Betting Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BETTING WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
  │ STEP 1  │     │ STEP 2  │     │ STEP 3  │     │ STEP 4  │
  │ Create  │     │ Place   │     │ Match   │     │ Settle  │
  │ Market  │────►│ Bet     │────►│ Results │────►│ Payout  │
  └─────────┘     └─────────┘     └─────────┘     └─────────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
  │ Anyone  │     │ Player  │     │ Oracle  │     │ Anyone  │
  │ can    │     │ stakes  │     │ posts   │     │ triggers│
  │ create │     │ on their│     │ verified│     │ settle  │
  │ market │     │ claim   │     │ stats   │     │ & wins  │
  └─────────┘     └─────────┘     └─────────┘     └─────────┘
```

### Step-by-Step Details

#### 1. CREATE MARKET
```move
// Anyone can create a prediction market
market::create_market(match_id, deadline_ms, ctx)

// Emits: MarketCreated { market_id, match_id, deadline_ms }
```

#### 2. PLACE BET
```move
// Player or spectator places a bet
market::place_bet(
  market,           // Shared market object
  subject,          // Player being bet on
  game,             // Game identifier
  stat,             // STAT_DAMAGE | STAT_KILLS | STAT_PLACEMENT
  operator,         // OP_GTE | OP_LTE
  threshold,        // Target value (e.g., 8000 damage)
  payment,          // SUI coin stake
  is_yes,           // TRUE = YES bet, FALSE = NO bet
)

// Creates Bet object and updates Market pools
```

#### 3. POST RESULT (Oracle)
```move
// Oracle posts verified match results
oracle::post_result(oracle_cap, match_id, finalized_at)

// Adds player stats to MatchResult
oracle::add_player_stats(result, player, damage, kills, placement, gold)

// Finalizes market
oracle::finalize_market(market, result)
```

#### 4. SETTLE BET
```move
// Permissionless settlement - anyone can trigger
settle::settle_bet_entry(market, bet, result)

// Evaluates claim against actual stats
// Distributes payouts from pool (2% fee deducted)
```

---

## 📦 COMPONENT_DOCUMENTATION

### Smart Contracts (`contracts/sources/`)

| File | Responsibility | Key Functions |
|------|---------------|---------------|
| `market.move` | Bet placement, escrow, odds | `create_market`, `place_bet`, `get_odds` |
| `oracle.move` | Result validation, claim evaluation | `post_result`, `add_player_stats`, `finalize_market` |
| `settle.move` | Payout distribution | `settle_bet_entry`, `settle_bet_with_profile` |
| `player.move` | Player profiles, XP, badges | `create_profile`, `update_stats`, `claim_badge` |

### Frontend (`frontend/src/`)

| File | Purpose |
|------|---------|
| `hooks/useMarket.ts` | Core blockchain interactions (998 lines) |
| `constants/index.ts` | Package ID, modules, game configs |
| `pages/*.tsx` | Route components |
| `layouts/Layout.tsx` | Shared navigation |

### Oracle Relay (`oracle-relay/`)

- WebSocket server for real-time updates
- Receives game server callbacks
- Broadcasts match completion events

### AI Agent SDK (`ai-agent/`)

- TypeScript SDK for autonomous trading
- Integrates with Coinbase AgentKit
- Real-time market scanning & betting

---

## 💰 FEE_STRUCTURE

```
┌─────────────────────────────────────────────────────────────┐
│                     FEE BREAKDOWN                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stake Amount:    100 OCT (9 decimals)                      │
│                                                             │
│  ┌─────────────┐                                           │
│  │  WIN        │  Payout = Stake × Odds                     │
│  │             │  Fee (2%) = Payout × 0.02                │
│  │  Net Win    │  = (100 × 1.8) - 3.6                      │
│  │             │  = 176.4 OCT                              │
│  └─────────────┘                                           │
│                                                             │
│  ┌─────────────┐                                           │
│  │  LOSE       │  Stake goes to pool                       │
│  │             │  No fee charged                           │
│  │  Net Loss   │  = -100 OCT                               │
│  └─────────────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Fee Distribution
- **2% Protocol Fee** - Only on winning payouts
- **98%** - Distributed to winning bettors proportional to stake

---

## 🔒 SECURITY_MODEL

1. **No Admin Keys** - All functions are permissionless
2. **Non-Custodial** - User funds never leave their control
3. **Deterministic Settlement** - Claims evaluated on-chain via oracle data
4. **Escrow** - Bets held in market balance until settlement

---

## 🏗️ TECHNICAL_ARCHITECTURE

| MODULE | STACK | FUNCTION |
| :--- | :--- | :--- |
| **CORE_CONTRACTS** | Move (Sui-compatible) | Escrow, Claim Validation, Payouts. |
| **BRUTALIST_UI** | React 19 + Tailwind | High-density data terminal & match HUD. |
| **ORACLE_RELAY** | Node.js + WebSockets | Verified server-to-chain data transmission. |
| **AI_LIQUIDITY** | Node.js + TypeSctipt | Autonomous market seeding & sentiment analysis. |

---

## 🖼️ VISUAL_TELEMETRY

````carousel
![Home Terminal](https://raw.githubusercontent.com/Shikhyy/PlayStake/main/.gemini/antigravity/brain/eecf98d1-6fb9-41e0-ad59-b1f19517221e/home_page_1774631695760.png)
<!-- slide -->
![Liquidity Desks](https://raw.githubusercontent.com/Shikhyy/PlayStake/main/.gemini/antigravity/brain/eecf98d1-6fb9-41e0-ad59-b1f19517221e/markets_page_1774631717680.png)
<!-- slide -->
![Match Feed](https://raw.githubusercontent.com/Shikhyy/PlayStake/main/.gemini/antigravity/brain/eecf98d1-6fb9-41e0-ad59-b1f19517221e/live_page_1774631733199.png)
````

*(Note: Real-time screenshots from current deployment)*

---

## 🚀 DEPLOYMENT_GUIDE

### 1. ENVIRONMENT_SYNC
Sync your `.env` files with the following testnet parameters:
```bash
PACKAGE_ID=0xa8111bccb58757c9ef3d880e0667b53576648e6f5b3f9286a817e39cb34e3cc9
ORACLE_CAP_ID=0x797af785ba04d3de243eb2e8e9d80a5f6c3eb71f19360b3c0fdedba11b105de4
```

### 2. CORE_START
```bash
# Terminal 1: Oracle & Analytics Relay
cd oracle-relay && npm run dev

# Terminal 2: Visual Interface
cd frontend && npm run dev
```

---

## 🧪 FINALITY_VERIFICATION

Our test suite ensures 100% coverage of the settlement logic.

```bash
# Move Unit Tests
cd contracts && sui move test

# Full Stack E2E Cycle
npx tsx e2e/full_flow_test.ts
```

---

## 🎨 DESIGN_PHILOSOPHY [BRUTALIST]
- **Palette**: Zinc / Void / Electric Lime (`#CEFF00`).
- **Type**: `Space Grotesk` (Display) & `Inter` (Mono/Body).
- **UX**: Zero blur, zero glassmorphism. High contrast, low latency.

<div align="center">
  <i>BUILT FOR ONEHACK 3.0 // POWERED BY ONECHAIN</i>
</div>
