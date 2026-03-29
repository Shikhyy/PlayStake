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
PlayStake is a decentralized, non-custodial prediction layer where players stake **USDO** on their own in-game performance. By bridging high-fidelity gaming data with Move-based smart contracts on OneChain, PlayStake ensures that every position is settled deterministically via the **OnePlay Oracle**.

### // THE_PROBLEM
Current prediction markets rely on subjective outcomes, are highly susceptible to central manipulation, and require trusting centralized bookmakers who extract high fees (10%+). They also fail to capture the granular performance metrics of massive esports ecosystems natively.

### // THE_SOLUTION
PlayStake utilizes raw telemetry streams and immutable blockchain logic on OneChain. Zero house edge. Zero admin keys. Predictions revolve around micro-events (e.g. "Will Player A get >15 Kills?"). Betting pools are permissionlessly finalized on-chain using cryptographically signed events. A minimal **2% Protocol Fee** is applied only on winning settlements.

---

## 🚀 APP_FLOW

The PlayStake ecosystem is a completely automated loop where the blockchain, off-chain observers, and AI agents collaborate to formulate, populate, and settle predictions. 

### 1. Market Generation (The AI Agent)
Instead of waiting for human operators to create markets, our **Groq-powered AI Agent SDK** continuously monitors gaming schedules. The AI actively queries Groq Models (Llama 3.3) to formulate high-engagement, balanced prediction targets (e.g., *Player XYZ to achieve ≥8000 Damage in Valorant*). 
- The AI Agent generates the market directly on-chain via our Move Contract.
- The Agent pushes the metadata to **Supabase** to ensure <10ms indexing on the frontend.

### 2. Market Staking (The Users)
Users access the **React 19 Frontend**, browsing the active prediction markets aggregated via the Supabase WebSocket layer. 
- Bettors can analyze the market odds organically shifting based on the liquidity pool sizes (`YES` vs `NO`).
- Using `@onelabs/dapp-kit`, bettors construct transactions pushing `$USDO` into the `Market<T>` Escrow object. 

### 3. Match Telemetry (The Oracle Relay)
While the game plays out, the **Node.js Oracle Relay** establishes a WebSocket tunnel over the game server. 
- It actively receives raw match callbacks.
- Upon match finality, the Oracle mathematically parses the payload to prevent injection attacks and submits a `post_result` Move transaction using the secured `OracleCap`.
- The Oracle generates a `MatchResult` object globally visible across the network.

### 4. Deterministic Settlement (The Protocol)
Once the Oracle permanently finalizes the market, settlement opens. 
- Any connected node or user can trigger `settle_bet_entry`. 
- The smart contract evaluates the logic operand securely (e.g., verifying if the player's final Damage `≥ 8000`).
- The contract instantly distributes the escrow payouts to the winning bets (taking 2% Protocol fee) or locks lost stakes entirely inside the pool.

---

## 📦 SYSTEM_ARCHITECTURE

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PLAYSTAKE ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │  AI AGENT    │     │  SPECTATORS  │     │  TELEMETRY   │
    │  (Groq SDK)  │     │  (Bettors)   │     │  (Servers)   │
    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
           │                    │                    │
           │  1. Create Market  │                    │
           │◄───────────────────│                    │
           │                    │                    │
           │                    │  2. Target Bets    │
           │                    │◄───────────────────│
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                      FRONTEND (React 19)                    │
    ├─────────────────┬─────────────────┬─────────────────────────┤
    │  Supabase RPC   │  Dapp-Kit SDK   │   Move Type Bounds      │
    └─────────────────┴─────────────────┴─────────────────────────┘
                                │
                                │ Signed TX
                                ▼
    ┌───────────────────────────────────────────────────────────────┐
    │                    ONECHAIN (Move VM)                        │
    │                                                               │
    │  ┌─────────────┐    ┌─────────────┐    ┌────────────┐         │
    │  │   market    │    │   oracle    │    │   settle   │         │
    │  │  .move      │    │   .move     │    │   .move    │         │
    │  │             │    │             │    │            │         │
    │  │• create     │    │• post_result│    │• settle    │         │
    │  │• place_bet  │    │• finalize   │    │            │         │
    │  └──────┬──────┘    └──────┬─────┘    └─────┬──────┘         │
    └─────────┼──────────────────┼────────────────┼─────────────────┘
              │                  │                │
              ▼                  ▼                ▼
    ┌───────────────────────────────────────────────────────────────┐
    │                       SHARED OBJECTS                          │
    │  [Escrow Pools]      [Cryptographic Sigs]   [User Bets]       │
    └───────────────────────────────────────────────────────────────┘
```

---

## 🛠️ COMPONENT_REPOSITORY

| Directory | Stack | Responsibility |
|:----------|:------|:---------------|
| `contracts/` | `Sui Move` | The core immutability layer. Houses the logic handling funds, claim validation, operator bounds (`<`, `>`, `==`), and decentralized odds construction. |
| `frontend/` | `React 19`, `Vite`, `Tailwind` | High-density brutalist UI data terminal. Fetches raw on-chain structs via native `<T>` parameters and hooks into Supabase events. |
| `oracle-relay/` | `Node.js`, `WebSocket` | Listens to Web2 Server Callbacks, transforms them into SUI Transaction signatures, and posts the results directly to the blockchain securely. |
| `ai-agent/` | `TypeScript`, `Groq API` | Autonomous bot leveraging LLMs to analyze active matches and deploy engaging parameters directly to the chain. |

---

## 💰 THE_ECONOMY

Fee structures are hard-coded into `settle.move`, ensuring completely transparent yields.

### Payout Distribution
- **Zero Losing Fees:** If a user loses their bet, their stake is surrendered entirely to the opposing pool. The protocol extracts absolute $0.00.
- **2% Protocol Fee:** If a user wins their bet, a 2% slice is taken from the absolute payout.
- **Winning Return:** Bettors secure 98% of the payout (which includes their seed capital plus the mathematical odds return). 

---

## 🚀 START_UP_SEQUENCE 

### 1. ENVIRONMENT_SYNC
Sync your `.env` files across `/e2e`, `/frontend`, `/oracle-relay`, and `/ai-agent` with the mapped OneChain parameters:
```bash
PACKAGE_ID=0xc023076e6787351f90b712caa292981e2ae680a3b9d8f03abf7fb2228c1dcd9c
ORACLE_CAP_ID=0x7a3a60a1814d428c61dace05b79df4480eeb44d973d0e93e6974c8d1349b9dad
RPC_URL=https://rpc-testnet.onelabs.cc:443
```

### 2. CORE_START
To simulate the full network ecosystem locally:
```bash
# Terminal 1: Spin up Oracle Sync
cd oracle-relay && npm run dev

# Terminal 2: Connect Visual React Interface
cd frontend && npm run dev

# Terminal 3: (Optional) Initiate Autonomous Groq Liquidity
cd ai-agent && npx tsx scripts/groq-agent.ts
```

---

## 🧪 BLOCKCHAIN_VERIFICATION

The repository relies on rigid test suites confirming cryptographic logic and organic SUI gas economics:

```bash
# Verify localized Move Unit Paths
cd contracts && sui move test

# Trigger the End-to-End Environment Loop (Mints > Places > Settles)
npx tsx e2e/full_flow_test.ts
```

<div align="center">
  <br/>
  <i>BUILT FOR ONEHACK 3.0 // POWERED BY ONECHAIN</i>
</div>
