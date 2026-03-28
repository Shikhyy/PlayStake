/**
 * PlayStake AI Agent SDK
 * Enables AI agents to interact with PlayStake prediction markets
 */

import { SuiClient, getFullnodeUrl } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import WebSocket from "ws";

export interface Market {
  objectId: string;
  matchId: string;
  yesPool: bigint;
  noPool: bigint;
  deadlineMs: bigint;
  finalized: boolean;
  betIds: string[];
}

export interface Bet {
  objectId: string;
  matchId: string;
  bettor: string;
  subject: string;
  game: string;
  claim: {
    stat: number;
    operator: number;
    threshold: bigint;
  };
  stake: bigint;
  odds: number;
  settled: boolean;
}

export interface PlayerStats {
  address: string;
  damage: bigint;
  kills: bigint;
  placement: bigint;
  gold: bigint;
}

export interface PerformanceClaim {
  stat: number;
  operator: number;
  threshold: bigint;
}

export const STAT = {
  DAMAGE: 0,
  KILLS: 1,
  PLACEMENT: 2,
  GOLD: 3,
} as const;

export const OP = {
  GTE: 0,
  LTE: 1,
  EQ: 2,
} as const;

const OCT_TYPE = "0x2::oct::OCT";

export class PlayStakeAgent {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private address: string;
  private ws: WebSocket | null = null;
  private packageId: string;

  constructor(
    privateKeyHex: string,
    packageId: string,
    network: "testnet" | "mainnet" = "testnet"
  ) {
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
    this.keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKeyHex, "hex"));
    this.address = this.keypair.getPublicKey().toSuiAddress();
    this.packageId = packageId;
  }

  getAddress(): string {
    return this.address;
  }

  async getBalance(): Promise<bigint> {
    const coins = await this.client.getCoins({
      owner: this.address,
      coinType: OCT_TYPE,
    });
    return coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
  }

  async createMarket(matchId: bigint, deadlineMs: bigint): Promise<string> {
    const tx = new Transaction();
    tx.setGasBudget(10000000);
    tx.moveCall({
      target: `${this.packageId}::market::create_market`,
      typeArguments: [OCT_TYPE],
      arguments: [
        tx.pure.u64(matchId),
        tx.pure.u64(deadlineMs),
      ],
    });
    return this.signAndExecute(tx);
  }

  async placeBet(
    marketObjectId: string,
    subject: string,
    game: string,
    claim: PerformanceClaim,
    stakeMist: bigint,
    isYes: boolean
  ): Promise<string> {
    const tx = new Transaction();
    tx.setGasBudget(10000000);
    const [payment] = tx.splitCoins(tx.gas, [stakeMist]);
    tx.moveCall({
      target: `${this.packageId}::market::place_bet`,
      typeArguments: [OCT_TYPE],
      arguments: [
        tx.object(marketObjectId),
        tx.pure.address(subject),
        tx.pure.string(game),
        tx.pure.u8(claim.stat),
        tx.pure.u8(claim.operator),
        tx.pure.u64(claim.threshold),
        payment,
        tx.pure.bool(isYes),
      ],
    });
    return this.signAndExecute(tx);
  }

  async settleBet(
    marketObjectId: string,
    betObjectId: string,
    matchResultObjectId: string
  ): Promise<string> {
    const tx = new Transaction();
    tx.setGasBudget(10000000);
    tx.moveCall({
      target: `${this.packageId}::settle::settle_bet_entry`,
      typeArguments: [OCT_TYPE],
      arguments: [
        tx.object(marketObjectId),
        tx.object(betObjectId),
        tx.object(matchResultObjectId),
      ],
    });
    return this.signAndExecute(tx);
  }

  async getMarket(marketObjectId: string): Promise<Market | null> {
    const result = await this.client.getObject({
      id: marketObjectId,
      options: { showContent: true },
    });
    if (!result.data || (result.data as any).dataType !== "moveObject") return null;
    const fields = (result.data as any).content?.fields || {};
    return {
      objectId: marketObjectId,
      matchId: String(fields.match_id || "0"),
      yesPool: BigInt(fields.yes_pool || 0),
      noPool: BigInt(fields.no_pool || 0),
      deadlineMs: BigInt(fields.deadline_ms || 0),
      finalized: Boolean(fields.finalized),
      betIds: (fields.bet_ids as string[]) || [],
    };
  }

  async getMyBets(): Promise<Bet[]> {
    const result = await this.client.getOwnedObjects({
      owner: this.address,
      filter: { StructType: `${this.packageId}::market::Bet` },
      options: { showContent: true },
    });
    const bets: Bet[] = [];
    for (const obj of result.data) {
      const data = obj.data;
      if (!data || (data as any).dataType !== "moveObject") continue;
      const fields = (data as any).content?.fields || {};
      const claimF = (fields.claim as any)?.fields || {};
      bets.push({
        objectId: data.objectId,
        matchId: String(fields.match_id || "0"),
        bettor: String(fields.bettor || ""),
        subject: String(fields.subject || ""),
        game: String.fromCharCode(...(fields.game as number[])),
        claim: {
          stat: Number(claimF.stat || 0),
          operator: Number(claimF.operator || 0),
          threshold: BigInt(claimF.threshold || 0),
        },
        stake: BigInt(fields.stake || 0),
        odds: Number(fields.odds || 0) / 100,
        settled: Boolean(fields.settled),
      });
    }
    return bets;
  }

  async getAllMarkets(limit = 50): Promise<Market[]> {
    const events = await this.client.queryEvents({
      query: {
        MoveEventModule: {
          module: "market",
          package: this.packageId,
        },
      },
      limit,
      order: "descending",
    });
    const marketIds = [...new Set(events.data.map((e) => (e.parsedJson as any)?.market_id).filter(Boolean))];
    const markets: Market[] = [];
    for (const id of marketIds) {
      const market = await this.getMarket(id);
      if (market) markets.push(market);
    }
    return markets.sort((a, b) => Number(b.deadlineMs - a.deadlineMs));
  }

  calculateOdds(yesPool: bigint, noPool: bigint, stake: bigint, isYes: boolean): number {
    const y = yesPool + 1n;
    const n = noPool + 1n;
    const total = y + n + stake;
    const raw = isYes
      ? Number((total * 100n) / (y + stake))
      : Number((total * 100n) / (n + stake));
    return Math.max(105, Math.min(1000, raw)) / 100;
  }

  connectToOracleRelay(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.on("open", () => {
        console.log("[PlayStakeAgent] Connected to oracle relay");
        resolve();
      });
      this.ws.on("error", reject);
    });
  }

  subscribeToMatch(matchId: string, callback: (data: any) => void): void {
    if (!this.ws) throw new Error("Not connected to oracle relay");
    this.ws.send(JSON.stringify({ type: "subscribe", matchId }));
    this.ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.payload?.matchId === matchId) callback(msg);
    });
  }

  async postMatchResult(
    oracleCapId: string,
    matchId: bigint,
    finalizedAt: bigint
  ): Promise<string> {
    const tx = new Transaction();
    tx.setGasBudget(10000000);
    tx.moveCall({
      target: `${this.packageId}::oracle::post_result`,
      arguments: [
        tx.object(oracleCapId),
        tx.pure.u64(matchId),
        tx.pure.u64(finalizedAt),
      ],
    });
    return this.signAndExecute(tx);
  }

  async addPlayerStats(
    matchResultObjectId: string,
    player: string,
    damage: bigint,
    kills: bigint,
    placement: bigint,
    gold: bigint
  ): Promise<string> {
    const tx = new Transaction();
    tx.setGasBudget(10000000);
    tx.moveCall({
      target: `${this.packageId}::oracle::add_player_stats`,
      arguments: [
        tx.object(matchResultObjectId),
        tx.pure.address(player),
        tx.pure.u64(damage),
        tx.pure.u64(kills),
        tx.pure.u64(placement),
        tx.pure.u64(gold),
      ],
    });
    return this.signAndExecute(tx);
  }

  async finalizeMarket(
    oracleCapId: string,
    marketObjectId: string
  ): Promise<string> {
    const tx = new Transaction();
    tx.setGasBudget(10000000);
    tx.moveCall({
      target: `${this.packageId}::oracle::finalize_market`,
      typeArguments: [OCT_TYPE],
      arguments: [
        tx.object(oracleCapId),
        tx.object(marketObjectId),
      ],
    });
    return this.signAndExecute(tx);
  }

  private async signAndExecute(tx: Transaction): Promise<string> {
    const txBytes = await (tx as any).build({ client: this.client });
    const { bytes, signature } = await this.keypair.signTransaction(txBytes);
    const result = await this.client.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      options: { showEffects: true },
    });
    if (result.effects?.status?.status !== "success") {
      throw new Error(result.effects?.status?.error || "Transaction failed");
    }
    return result.digest;
  }
}

export default PlayStakeAgent;
