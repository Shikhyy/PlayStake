# PlayStake AI Agent SDK

SDK for building AI agents that autonomously trade on PlayStake prediction markets.

## Features

- Create markets for prediction events
- Place bets with performance claims
- Settle bets after match completion
- Real-time market data via WebSocket
- Automatic portfolio management

## Installation

```bash
npm install @playstake/ai-agent-sdk
```

## Quick Start

```typescript
import { PlayStakeAgent, STAT, OP } from "@playstake/ai-agent-sdk";

const agent = new PlayStakeAgent(
  "your_private_key_hex",
  "0xpackage_id",
  "testnet"
);

// Get balance
const balance = await agent.getBalance();

// Create a market
const tx = await agent.createMarket(
  12345n,          // match ID
  Date.now() + 3600000n  // deadline: 1 hour from now
);

// Place a bet
await agent.placeBet(
  "0xmarket_object_id",
  "0xsubject_address",
  "Arena of Valor",
  { stat: STAT.DAMAGE, operator: OP.GTE, threshold: 5000n },
  1000000n,  // 1 SUI stake
  true       // YES bet
);

// Get all markets
const markets = await agent.getAllMarkets();
```

## AI Agent Integration

### Coinbase AgentKit

The SDK integrates with [Coinbase AgentKit](https://docs.cdp.coinbase.com/agent-kit/welcome) for natural language trading:

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { PlayStakeAgent } from "@playstake/ai-agent-sdk";

const agentkit = await AgentKit.fromParams({
  rpcUrl: RPC_URL,
  privateKey: AGENT_PRIVATE_KEY,
});

const playstake = new PlayStakeAgent(PRIVATE_KEY, PACKAGE_ID);

// Agent can now understand commands like:
// "Place a 5 SUI bet on match 12345 that I'll deal at least 8000 damage"
```

### MCP Server

Create a Model Context Protocol server for Claude/AI assistants:

```typescript
// mcp-server.ts
import { PlayStakeAgent } from "@playstake/ai-agent-sdk";

const agent = new PlayStakeAgent(process.env.PRIVATE_KEY!, PACKAGE_ID);

const tools = [
  {
    name: "get_markets",
    description: "Get all active prediction markets",
    handler: async () => {
      const markets = await agent.getAllMarkets();
      return { content: JSON.stringify(markets) };
    },
  },
  {
    name: "place_bet",
    description: "Place a bet on a prediction market",
    handler: async (params: any) => {
      const tx = await agent.placeBet(
        params.marketId,
        params.subject,
        params.game,
        params.claim,
        BigInt(params.stake),
        params.isYes
      );
      return { content: `Transaction: ${tx}` };
    },
  },
];
```

## Supported Operations

| Operation | Description |
|-----------|-------------|
| `createMarket` | Create a new prediction market |
| `placeBet` | Place a bet with performance claim |
| `settleBet` | Settle a bet after match result |
| `getMarket` | Get market details |
| `getMyBets` | Get agent's bets |
| `getAllMarkets` | List all markets |
| `postMatchResult` | Post match results (oracle) |
| `addPlayerStats` | Add player statistics |

## Real-time Updates

Subscribe to match updates via WebSocket:

```typescript
await agent.connectToOracleRelay("ws://localhost:3001");

agent.subscribeToMatch("12345", (data) => {
  console.log("Match update:", data);
});
```

## Running the Example Agent

```bash
cp .env.example .env
# Edit .env with your private key
npm run dev
```
