/**
 * PlayStake AI Agent
 * Autonomous bot that creates markets for upcoming matches,
 * analyzes player stats to predict outcomes, and provides
 * initial market liquidity by placing automated bets.
 * 
 * Run with: npx tsx agent.ts
 */

import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import * as dotenv from "dotenv";

dotenv.config();

const PACKAGE_ID = process.env.PACKAGE_ID ?? "";
const ORACLE_KEY = process.env.ORACLE_PRIVATE_KEY ?? "";
const RPC_URL = process.env.RPC_URL ?? "https://rpc-testnet.onelabs.cc:443";

if (!PACKAGE_ID || !ORACLE_KEY) {
  console.error("Missing PACKAGE_ID or ORACLE_PRIVATE_KEY in .env");
  process.exit(1);
}

const client = new SuiClient({ url: RPC_URL });
const agentKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(ORACLE_KEY, "hex"));
const agentAddress = agentKeypair.getPublicKey().toSuiAddress();

console.log(`🤖 Base AI Agent initialized with address: ${agentAddress}`);

// Configuration
const GAMES = ["PUBG Mobile", "Valorant", "Arena of Valor"];
const STATS = [
  { name: "DAMAGE", id: 0, thresholds: [3000, 5000, 8000] },
  { name: "KILLS", id: 1, thresholds: [5, 10, 15] }
];

function sui(amount: number) {
  return BigInt(amount * 1_000_000_000);
}

/**
 * Predicts whether a player is likely to hit a threshold based on
 * (mocked) historical performance data analysis.
 */
function analyzePlayerStats(subject: string, stat: string, threshold: number) {
  console.log(`🧠 AI analyzing history for ${subject}...`);
  // Mock AI prediction logic: 70% chance of predicting YES for lower thresholds, lower for higher
  const winProbability = stat === "KILLS" && threshold > 10 ? 0.3 : 0.6;
  const prediction = Math.random() < winProbability ? "YES" : "NO";
  console.log(`📊 AI Prediction: Probability of ${stat} >= ${threshold} is ${Math.round(winProbability * 100)}%. Betting ${prediction}.`);
  return prediction === "YES";
}

async function signAndExec(tx: Transaction): Promise<any> {
  tx.setSenderIfNotSet(agentAddress);
  tx.setGasBudget(10000000);
  const txBytes = await tx.build({ client });
  const { bytes: txB64, signature: sigB64 } = await agentKeypair.signTransaction(txBytes);
  const result: any = await client.call("sui_executeTransactionBlock", [
    txB64, [sigB64],
    { showEffects: true, showObjectChanges: true },
    "WaitForEffectsCert",
  ]);
  
  if (result.effects?.status?.status !== "success") {
    throw new Error(result.effects?.status?.error || "Transaction failed");
  }
  return result;
}

async function runAgentCycle() {
  try {
    const matchId = Math.floor(Math.random() * 10000) + 1000;
    const deadlineMs = Date.now() + 60 * 60 * 1000; // 1 hour from now

    console.log(`\n===========================================`);
    console.log(`🔄 AI Agent Cycle Started | Match #${matchId}`);
    
    // 1. Create Market
    console.log(`📈 Creating market for Match #${matchId}...`);
    const txCreate = new Transaction();
    txCreate.moveCall({
      target: `${PACKAGE_ID}::market::create_market`,
      arguments: [txCreate.pure.u64(matchId), txCreate.pure.u64(deadlineMs)],
    });

    const createResult = await signAndExec(txCreate);
    const marketObj = createResult.objectChanges?.find((o: any) => o.type === "created" && o.objectType?.includes("Market"));
    const marketId = marketObj?.objectId;
    
    if (!marketId) throw new Error("Could not extract market ID");
    console.log(`✅ Market created: ${marketId}`);

    // 2. Decide on a bet (AI Prediction)
    const game = GAMES[Math.floor(Math.random() * GAMES.length)];
    const statDef = STATS[Math.floor(Math.random() * STATS.length)];
    const threshold = statDef.thresholds[Math.floor(Math.random() * statDef.thresholds.length)];
    
    // Agent Bets on themselves or another player
    const subject = agentAddress; 
    
    const isYes = analyzePlayerStats(subject, statDef.name, threshold);
    const stakeAmount = 0.5; // Place 0.5 SUI to seed liquidity

    // 3. Place Bet (Seeding Liquidity)
    console.log(`💧 Seeding liquidity: Placing ${stakeAmount} SUI on ${isYes ? "YES" : "NO"}...`);
    const txBet = new Transaction();
    const [payment] = txBet.splitCoins(txBet.gas, [sui(stakeAmount)]);
    
    txBet.moveCall({
      target: `${PACKAGE_ID}::market::place_bet`,
      arguments: [
        txBet.object(marketId),
        txBet.pure.address(subject),
        txBet.pure.string(game),
        txBet.pure.u8(statDef.id),
        txBet.pure.u8(0), // GTE operator
        txBet.pure.u64(threshold),
        payment,
        txBet.pure.bool(isYes),
      ],
    });

    const betResult = await signAndExec(txBet);
    console.log(`✅ Liquidity seeded. TX Digest: ${betResult.digest}`);
    console.log(`===========================================\n`);
    
  } catch (error) {
    console.error(`❌ Agent Cycle Failed:`, error instanceof Error ? error.message : error);
  }
}

// Run one cycle immediately, then every 5 minutes
runAgentCycle();
setInterval(runAgentCycle, 5 * 60 * 1000);
