/**
 * Example AI Agent using PlayStake SDK
 * This demonstrates how an AI agent can autonomously trade on prediction markets
 */

import { PlayStakeAgent, STAT, OP, type Market, type Bet } from "./index.js";

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || "";
const PACKAGE_ID = process.env.PACKAGE_ID || "0x...";
const RPC_URL = process.env.RPC_URL || "https://rpc-testnet.onelabs.cc:443";
const WS_URL = process.env.WS_URL || "ws://localhost:3001";

class TradingAgent {
  private client: PlayStakeAgent;
  private minStake = 1_000_000n;
  private maxRiskPerBet = 0.02;
  private walletBalance: bigint = 0n;

  constructor(privateKey: string) {
    this.client = new PlayStakeAgent(privateKey, PACKAGE_ID, "testnet");
  }

  async start() {
    console.log(`🤖 Trading Agent started`);
    console.log(`   Address: ${this.client.getAddress()}`);

    await this.syncBalance();
    await this.scanAndTrade();

    setInterval(() => this.scanAndTrade(), 60000);
  }

  private async syncBalance() {
    this.walletBalance = await this.client.getBalance();
    console.log(`💰 Balance: ${this.formatSui(this.walletBalance)} SUI`);
  }

  private async scanAndTrade() {
    try {
      const markets = await this.client.getAllMarkets();
      const activeMarkets = markets.filter(
        (m) => !m.finalized && m.deadlineMs > BigInt(Date.now())
      );

      for (const market of activeMarkets.slice(0, 5)) {
        await this.analyzeAndBet(market);
      }

      await this.manageExistingBets();
    } catch (error) {
      console.error("❌ Agent error:", error);
    }
  }

  private async analyzeAndBet(market: Market): Promise<void> {
    const { matchId, yesPool, noPool, deadlineMs } = market;
    const timeLeft = Number(deadlineMs - BigInt(Date.now()));
    if (timeLeft < 300000) return;

    const totalPool = yesPool + noPool;
    if (totalPool < 1000000n) return;

    const yesOdds = this.client.calculateOdds(yesPool, noPool, this.minStake, true);
    const noOdds = this.client.calculateOdds(yesPool, noPool, this.minStake, false);

    const expectedValue = this.calculateExpectedValue(yesPool, noPool, yesOdds, true);
    if (expectedValue > 1.05) {
      const stake = this.calculateStake(yesPool, noPool, yesOdds);
      console.log(`🎯 Betting YES on match ${matchId}: ${this.formatSui(stake)} SUI @ ${yesOdds}x`);

      try {
        await this.client.placeBet(
          market.objectId,
          this.client.getAddress(),
          "Auto Trading",
          { stat: STAT.DAMAGE, operator: OP.GTE, threshold: 5000n },
          stake,
          true
        );
      } catch (e) {
        console.error("Bet failed:", e);
      }
    }
  }

  private async manageExistingBets(): Promise<void> {
    const bets = await this.client.getMyBets();
    const pendingBets = bets.filter((b) => !b.settled);

    for (const bet of pendingBets) {
      console.log(`📊 Pending bet: ${bet.stake} @ ${bet.odds}x ${bet.settled ? "Settled" : "Active"}`);
    }
  }

  private calculateExpectedValue(yesPool: bigint, noPool: bigint, odds: number, isYes: boolean): number {
    const total = Number(yesPool + noPool);
    const yesProbability = Number(yesPool) / total;
    return isYes ? yesProbability * odds : (1 - yesProbability) * odds;
  }

  private calculateStake(yesPool: bigint, noPool: bigint, odds: number): bigint {
    const maxStake = this.walletBalance * BigInt(this.maxRiskPerBet * 100);
    const minStake = this.minStake;
    const calculated = this.walletBalance / BigInt(Math.floor(10 / odds));
    return calculated < minStake ? minStake : calculated > maxStake ? maxStake : calculated;
  }

  private formatSui(mist: bigint): string {
    return (Number(mist) / 1_000_000).toFixed(2);
  }
}

if (require.main === module) {
  if (!AGENT_PRIVATE_KEY) {
    console.error("❌ AGENT_PRIVATE_KEY not set");
    process.exit(1);
  }
  const agent = new TradingAgent(AGENT_PRIVATE_KEY);
  agent.start();
}

export { TradingAgent };
