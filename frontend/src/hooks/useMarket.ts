import { useState, useCallback, useEffect } from "react";
import {
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@onelabs/dapp-kit";
import { Transaction } from "@onelabs/sui/transactions";
import { fromUsdo, toUsdo, MODULES, STAT, OP } from "../constants";
import { useTxToast } from "../components/TxToast";

export interface PerformanceClaim {
  stat: number;
  operator: number;
  threshold: number;
}

export interface BetParams {
  subject: string;
  game: string;
  claim: PerformanceClaim;
  stakeUsdo: number;
  isYes: boolean;
}

export interface MarketOnChain {
  objectId: string;
  matchId: string;
  yesPool: number;
  noPool: number;
  deadlineMs: number;
  finalized: boolean;
  betIds: string[];
}

export interface BetOnChain {
  objectId: string;
  matchId: string;
  bettor: string;
  subject: string;
  game: string;
  claim: PerformanceClaim;
  stakeRaw: bigint;
  stakeUsdo: number;
  odds: number;
  settled: boolean;
}

export interface SettlementRecord {
  objectId: string;
  betId: string;
  payout: number;
  stake: number;
  won: boolean;
}

function parseMoveFields(fields: Record<string, unknown>): Record<string, unknown> {
  return fields as Record<string, unknown>;
}

export function usePlaceBet() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const placeBet = useCallback(
    async (marketObjectId: string, params: BetParams) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        tx.setGasBudget(10000000);
        const stakeRaw = fromUsdo(params.stakeUsdo);
        const [payment] = tx.splitCoins(tx.gas, [stakeRaw]);

        tx.moveCall({
          target: `${MODULES.market}::place_bet`,
          arguments: [
            tx.object(marketObjectId),
            tx.pure.address(params.subject),
            tx.pure.string(params.game),
            tx.pure.u8(params.claim.stat),
            tx.pure.u8(params.claim.operator),
            tx.pure.u64(params.claim.threshold),
            payment,
            tx.pure.bool(params.isYes),
          ],
        });

        console.log("Executing bet transaction...");
        const result = await signAndExecute({ transaction: tx });
        console.log("Bet result:", result);
        const digest = result.digest;
        setTxHash(digest);
        addToast("Place Bet", `${params.stakeUsdo} USDO on ${params.isYes ? "YES" : "NO"}`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        console.error("Place bet error:", e);
        const msg = e instanceof Error ? e.message : "Transaction failed";
        setError(msg);
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { placeBet, isLoading: isPending, txHash, error };
}

export function useCreateMarket() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const createMarket = useCallback(
    async (matchId: number, deadlineMs: number) => {
      console.log(">>> useCreateMarket called", { isConnected, matchId, deadlineMs, MODULES: MODULES.market });
      
      if (!isConnected) { 
        const err = "Wallet not connected";
        console.error(">>> Error:", err);
        setError(err); 
        return; 
      }
      
      setTxHash(null);
      setError(null);
      setStatus("Building transaction...");
      
      try {
        const target = `${MODULES.market}::create_market`;
        console.log(">>> Target:", target);
        
        const tx = new Transaction();
        tx.setGasBudget(10000000);
        
        tx.moveCall({
          target: target,
          arguments: [tx.pure.u64(matchId), tx.pure.u64(deadlineMs)],
        });
        
        setStatus("Signing transaction...");
        console.log(">>> Executing transaction...");
        
        const result = await signAndExecute({ transaction: tx });
        
        console.log(">>> Result:", result);
        setStatus("Transaction submitted!");
        const digest = result.digest;
        setTxHash(digest);
        addToast("Create Market", `Match #${matchId} created`, digest);
        setTimeout(() => confirmToast(digest), 3000);
        setStatus("");
      } catch (e: unknown) {
        console.error(">>> Create market error:", e);
        const errMsg = e instanceof Error ? e.message : "Transaction failed";
        setError(errMsg);
        setStatus("");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { createMarket, isLoading: isPending, txHash, error, status };
}

export function useMarket(marketObjectId: string | null): {
  market: MarketOnChain | null; isLoading: boolean; error: string | null;
} {
  const client = useSuiClient();
  const [market, setMarket] = useState<MarketOnChain | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!marketObjectId) { setMarket(null); return; }
    setIsLoading(true);
    setError(null);
    client.getObject({
      id: marketObjectId,
      options: { showContent: true },
    }).then((resp) => {
      const data = resp.data;
      if (!data || (data as { dataType?: string }).dataType !== "moveObject") {
        setMarket(null); setIsLoading(false); return;
      }
      const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
      const f = parseMoveFields(content?.fields || {});
      setMarket({
        objectId: marketObjectId,
        matchId: String(f.match_id || 0),
        yesPool: toUsdo(BigInt(Number(f.yes_pool) || 0)),
        noPool: toUsdo(BigInt(Number(f.no_pool) || 0)),
        deadlineMs: Number(f.deadline_ms || 0),
        finalized: Boolean(f.finalized),
        betIds: (f.bet_ids as string[]) || [],
      });
      setIsLoading(false);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load market");
      setIsLoading(false);
    });
  }, [client, marketObjectId]);

  return { market, isLoading, error };
}

export function useMyBets(walletAddress: string | null): {
  bets: BetOnChain[]; isLoading: boolean; error: string | null;
} {
  const client = useSuiClient();
  const [bets, setBets] = useState<BetOnChain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) { setBets([]); return; }
    setIsLoading(true);
    setError(null);
    client.getOwnedObjects({
      owner: walletAddress,
      filter: { StructType: `${MODULES.market}::Bet` },
      options: { showContent: true },
    }).then((resp) => {
      const parsed: BetOnChain[] = [];
      for (const obj of resp.data) {
        const data = obj.data;
        if (!data || (data as { dataType?: string }).dataType !== "moveObject") continue;
        const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
        const f = parseMoveFields(content?.fields || {});
        const claimF = parseMoveFields((f.claim as Record<string, unknown>) || {});
        const stakeRaw = BigInt(Number(f.stake || 0));
        parsed.push({
          objectId: data.objectId,
          matchId: String(f.match_id || "0"),
          bettor: String(f.bettor || ""),
          subject: String(f.subject || ""),
          game: bytesToStr(f.game, ""),
          claim: {
            stat: Number(claimF.stat || 0),
            operator: Number(claimF.operator || 0),
            threshold: Number(claimF.threshold || 0),
          },
          stakeRaw,
          stakeUsdo: toUsdo(stakeRaw),
          odds: Number(f.odds || 0) / 100,
          settled: Boolean(f.settled),
        });
      }
      setBets(parsed);
      setIsLoading(false);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load bets");
      setIsLoading(false);
    });
  }, [client, walletAddress]);

  return { bets, isLoading, error };
}

export function useMySettlements(walletAddress: string | null): {
  records: SettlementRecord[]; isLoading: boolean; error: string | null;
} {
  const client = useSuiClient();
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) { setRecords([]); return; }
    setIsLoading(true);
    client.getOwnedObjects({
      owner: walletAddress,
      filter: { StructType: `${MODULES.settle}::SettlementRecord` },
      options: { showContent: true },
    }).then((resp) => {
      const parsed: SettlementRecord[] = [];
      for (const obj of resp.data) {
        const data = obj.data;
        if (!data || (data as { dataType?: string }).dataType !== "moveObject") continue;
        const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
        const f = parseMoveFields(content?.fields || {});
        parsed.push({
          objectId: data.objectId,
          betId: String(f.bet_id || ""),
          payout: toUsdo(BigInt(Number(f.payout || 0))),
          stake: toUsdo(BigInt(Number(f.stake || 0))),
          won: Boolean(f.won),
        });
      }
      setRecords(parsed);
      setIsLoading(false);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load settlements");
      setIsLoading(false);
    });
  }, [client, walletAddress]);

  return { records, isLoading, error };
}

export function useSettleAll() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settleAll = useCallback(
    async (marketObjectId: string, matchResultObjectId: string, betObjectIds: string[]) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      if (betObjectIds.length === 0) { setError("No bets to settle"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        for (const betId of betObjectIds) {
          tx.moveCall({
            target: `${MODULES.settle}::settle_bet_entry`,
            arguments: [
              tx.object(marketObjectId),
              tx.object(betId),
              tx.object(matchResultObjectId),
            ],
          });
        }
        const result = await signAndExecute({ transaction: tx });
        const digest = result.digest;
        setTxHash(digest);
        addToast("Settle Bets", `${betObjectIds.length} bet(s) settled`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Settlement failed");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { settleAll, isLoading: isPending, txHash, error };
}

export function usePostMatchResult() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const postResult = useCallback(
    async (oracleCapId: string, matchId: number, finalizedAt: number) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${MODULES.oracle}::post_result`,
          arguments: [
            tx.object(oracleCapId),
            tx.pure.u64(matchId),
            tx.pure.u64(finalizedAt),
          ],
        });
        const result = await signAndExecute({ transaction: tx });
        const digest = result.digest;
        setTxHash(digest);
        addToast("Post Match Result", `Match #${matchId} posted to chain`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to post result");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { postResult, isLoading: isPending, txHash, error };
}

export function useAddPlayerStats() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addStats = useCallback(
    async (matchResultObjectId: string, player: string, damage: number, kills: number, placement: number, gold: number) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${MODULES.oracle}::add_player_stats`,
          arguments: [
            tx.object(matchResultObjectId),
            tx.pure.address(player),
            tx.pure.u64(damage),
            tx.pure.u64(kills),
            tx.pure.u64(placement),
            tx.pure.u64(gold),
          ],
        });
        const result = await signAndExecute({ transaction: tx });
        const digest = result.digest;
        setTxHash(digest);
        addToast("Add Player Stats", `Stats for ${player.slice(0, 8)}... added`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to add stats");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { addStats, isLoading: isPending, txHash, error };
}

export function useFinalizeMarket() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finalize = useCallback(
    async (oracleCapId: string, marketObjectId: string) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${MODULES.oracle}::finalize_market`,
          arguments: [tx.object(oracleCapId), tx.object(marketObjectId)],
        });
        const result = await signAndExecute({ transaction: tx });
        const digest = result.digest;
        setTxHash(digest);
        addToast("Finalize Market", "Market closed for betting", digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to finalize");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { finalize, isLoading: isPending, txHash, error };
}

// ─── Market Discovery (via events) ────────────────────────────────────────────

export interface MarketOnChainFull {
  objectId: string;
  matchId: string;
  yesPool: number;
  noPool: number;
  betCount: number;
  deadlineMs: number;
  finalized: boolean;
}

export interface MatchResultOnChain {
  objectId: string;
  matchId: string;
  finalizedAt: number;
  playerCount: number;
}

export interface SettlementOnChain {
  objectId: string;
  betId: string;
  bettor: string;
  won: boolean;
  stake: number;
  payout: number;
}

function parseMarketFields(objectId: string, fields: Record<string, unknown>): MarketOnChainFull {
  const betIds = (fields.bet_ids as string[]) || [];
  return {
    objectId,
    matchId: String(fields.match_id || 0),
    yesPool: toUsdo(BigInt(Number(fields.yes_pool || 0))),
    noPool: toUsdo(BigInt(Number(fields.no_pool || 0))),
    betCount: betIds.length,
    deadlineMs: Number(fields.deadline_ms || 0),
    finalized: Boolean(fields.finalized),
  };
}

function parseMatchResultFields(objectId: string, fields: Record<string, unknown>): MatchResultOnChain {
  const stats = fields.stats as Record<string, unknown> | undefined;
  let playerCount = 0;
  if (stats && typeof stats === "object") {
    playerCount = Object.keys(stats).length;
  }
  return {
    objectId,
    matchId: String(fields.match_id || 0),
    finalizedAt: Number(fields.finalized_at || 0),
    playerCount,
  };
}

export function useAllMarkets(): {
  markets: MarketOnChainFull[]; isLoading: boolean; error: string | null;
} {
  const client = useSuiClient();
  const [markets, setMarkets] = useState<MarketOnChainFull[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    client.queryEvents({
      query: { MoveEventModule: { module: "market", package: MODULES.market.replace("::market", "") } },
      limit: 50,
      order: "descending",
    }).then(async (resp) => {
      const marketIds: string[] = [];
      for (const evt of resp.data) {
        const parsed = evt.parsedJson as { market_id?: string };
        if (parsed?.market_id) {
          marketIds.push(parsed.market_id);
        }
      }
      const uniqueIds = [...new Set(marketIds)];
      const results = await Promise.allSettled(
        uniqueIds.map(id =>
          client.getObject({ id, options: { showContent: true } })
        )
      );
      const parsed: MarketOnChainFull[] = [];
      for (const result of results) {
        if (result.status === "rejected") continue;
        const resp = result.value;
        const data = resp.data;
        if (!data || (data as { dataType?: string }).dataType !== "moveObject") continue;
        const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
        const f = content?.fields || {};
        parsed.push(parseMarketFields(data.objectId, f));
      }
      parsed.sort((a, b) => b.deadlineMs - a.deadlineMs);
      setMarkets(parsed);
      setIsLoading(false);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load markets");
      setIsLoading(false);
    });
  }, [client]);

  return { markets, isLoading, error };
}

export function useAllMatchResults(): {
  results: MatchResultOnChain[]; isLoading: boolean; error: string | null;
} {
  const client = useSuiClient();
  const [results, setResults] = useState<MatchResultOnChain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    client.queryEvents({
      query: { MoveEventModule: { module: "oracle", package: MODULES.oracle.replace("::oracle", "") } },
      limit: 50,
      order: "descending",
    }).then(async (resp) => {
      const resultIds: string[] = [];
      for (const evt of resp.data) {
        const parsed = evt.parsedJson as { result_id?: string };
        if (parsed?.result_id) {
          resultIds.push(parsed.result_id);
        }
      }
      const uniqueIds = [...new Set(resultIds)];
      const chainResults = await Promise.allSettled(
        uniqueIds.map(id =>
          client.getObject({ id, options: { showContent: true } })
        )
      );
      const parsed: MatchResultOnChain[] = [];
      for (const result of chainResults) {
        if (result.status === "rejected") continue;
        const resp = result.value;
        const data = resp.data;
        if (!data || (data as { dataType?: string }).dataType !== "moveObject") continue;
        const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
        const f = content?.fields || {};
        parsed.push(parseMatchResultFields(data.objectId, f));
      }
      parsed.sort((a, b) => b.finalizedAt - a.finalizedAt);
      setResults(parsed);
      setIsLoading(false);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load match results");
      setIsLoading(false);
    });
  }, [client]);

  return { results, isLoading, error };
}

export function useAllSettlements(): {
  settlements: SettlementOnChain[]; isLoading: boolean; error: string | null;
} {
  const client = useSuiClient();
  const [settlements, setSettlements] = useState<SettlementOnChain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    client.queryEvents({
      query: { MoveEventModule: { module: "settle", package: MODULES.settle.replace("::settle", "") } },
      limit: 100,
      order: "descending",
    }).then((resp) => {
      const parsed: SettlementOnChain[] = [];
      for (const evt of resp.data) {
        const f = evt.parsedJson as Record<string, unknown>;
        parsed.push({
          objectId: String(f.record_id || ""),
          betId: String(f.bet_id || ""),
          bettor: String(f.bettor || ""),
          won: Boolean(f.won),
          stake: toUsdo(BigInt(Number(f.stake || 0))),
          payout: toUsdo(BigInt(Number(f.payout || 0))),
        });
      }
      setSettlements(parsed);
      setIsLoading(false);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load settlements");
      setIsLoading(false);
    });
  }, [client]);

  return { settlements, isLoading, error };
}

// ─── Player Profile ────────────────────────────────────────────────────────────

export interface PlayerProfileData {
  objectId: string;
  owner: string;
  username: string;
  level: number;
  xp: number;
  xpToNext: number;
  xpProgress: number;
  rank: number;
  rankName: string;
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  totalStaked: number;
  totalWon: number;
  totalPnl: number;
  gamesPlayedCount: number;
  badgeCount: number;
  winStreak: number;
  bestStreak: number;
  createdAt: number;
  lastActive: number;
}

export interface GameStatsData {
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  totalStaked: number;
  totalWon: number;
  bestDamage: number;
  bestKills: number;
  bestPlacement: number;
  bestGold: number;
}

export interface BadgeData {
  badgeId: string;
  name: string;
  earned: boolean;
}

const RANK_NAMES = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion"];

const BADGE_DEFINITIONS: { id: string; name: string; desc: string }[] = [
  { id: "first_blood", name: "First Blood", desc: "Place your first bet" },
  { id: "lucky_streak_5", name: "Lucky Streak", desc: "Win 5 bets in a row" },
  { id: "diamond_club", name: "Diamond Club", desc: "Reach Diamond rank" },
  { id: "high_roller", name: "High Roller", desc: "Stake > 10,000 USDO in one bet" },
  { id: "winstreak_10", name: "Unstoppable", desc: "Win 10 bets in a row" },
  { id: "novice", name: "Novice", desc: "Create your profile" },
  { id: "regular", name: "Regular", desc: "Place 10 bets" },
  { id: "veteran", name: "Veteran", desc: "Place 50 bets" },
  { id: "pro_phenom", name: "Pro Phenom", desc: "70%+ win rate with 10+ bets" },
  { id: "war_hero", name: "War Hero", desc: "Win > 5,000 USDO in one settlement" },
  { id: "market_maker", name: "Market Maker", desc: "Win > 1,000 USDO in one settlement" },
  { id: "oracle_trusted", name: "Oracle Trusted", desc: "Contribute to oracle data" },
];

function bytesToStr(bytes: unknown, _fallback = ""): string {
  if (Array.isArray(bytes)) return String.fromCharCode(...(bytes as number[]));
  if (typeof bytes === "string") return bytes;
  return _fallback;
}

function vecSetLength(vecSet: unknown): number {
  if (vecSet && typeof vecSet === "object") {
    const obj = vecSet as Record<string, unknown>;
    if (Array.isArray(obj.contents)) return (obj.contents as unknown[]).length;
  }
  return 0;
}

function parsePlayerProfile(fields: Record<string, unknown>): PlayerProfileData | null {
  const totalBets = Number(fields.total_bets || 0);
  const wins = Number(fields.wins || 0);
  const losses = Number(fields.losses || 0);
  const xp = Number(fields.xp || 0);
  const xpToNext = Number(fields.xp_to_next || 100);
  const rank = Number(fields.rank || 0);

  return {
    objectId: "",
    owner: String(fields.owner || ""),
    username: bytesToStr(fields.username),
    level: Number(fields.level || 1),
    xp,
    xpToNext,
    xpProgress: xpToNext > 0 ? Math.min((xp / xpToNext) * 100, 100) : 0,
    rank,
    rankName: RANK_NAMES[rank] || "Unknown",
    totalBets,
    wins,
    losses,
    winRate: totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0,
    totalStaked: toUsdo(BigInt(Number(fields.total_staked || 0))),
    totalWon: toUsdo(BigInt(Number(fields.total_won || 0))),
    totalPnl: toUsdo(BigInt(Number(fields.total_pnl || 0))),
    gamesPlayedCount: vecSetLength(fields.games_played),
    badgeCount: vecSetLength(fields.unlocked_badges),
    winStreak: Number(fields.win_streak || 0),
    bestStreak: Number(fields.best_streak || 0),
    createdAt: Number(fields.created_at || 0),
    lastActive: Number(fields.last_active || 0),
  };
}

export function usePlayerProfile(walletAddress: string | null): {
  profile: PlayerProfileData | null;
  isLoading: boolean;
  error: string | null;
} {
  const client = useSuiClient();
  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) { setProfile(null); return; }
    setIsLoading(true);
    setError(null);

    client.getOwnedObjects({
      owner: walletAddress,
      filter: { StructType: `${MODULES.player}::PlayerProfile` },
      options: { showContent: true },
    }).then((resp) => {
      if (resp.data.length === 0) { setProfile(null); setIsLoading(false); return; }
      const obj = resp.data[0];
      const data = obj.data;
      if (!data || (data as { dataType?: string }).dataType !== "moveObject") {
        setProfile(null); setIsLoading(false); return;
      }
      const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
      const fields = content?.fields || {};
        const parsed = parsePlayerProfile(fields);
      if (parsed) {
        parsed.objectId = data.objectId;
        setProfile(parsed);
      }
      setIsLoading(false);
    }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load profile");
      setIsLoading(false);
    });
  }, [client, walletAddress]);

  return { profile, isLoading, error };
}

export function useCreateProfile() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createProfile = useCallback(
    async (username: string) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${MODULES.player}::create_profile`,
          arguments: [tx.pure.string(username)],
        });
        const result = await signAndExecute({ transaction: tx });
        const digest = result.digest;
        setTxHash(digest);
        addToast("Create Profile", `Player "${username}" profile created`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create profile");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { createProfile, isLoading: isPending, txHash, error };
}

export function useUpdateOnSettlement() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateOnSettlement = useCallback(
    async (profileObjectId: string, won: boolean, stake: number, payout: number, game: string) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${MODULES.player}::update_on_settlement`,
          arguments: [
            tx.object(profileObjectId),
            tx.pure.bool(won),
            tx.pure.u64(fromUsdo(stake)),
            tx.pure.u64(fromUsdo(payout)),
            tx.pure.string(game),
          ],
        });
        const result = await signAndExecute({ transaction: tx });
        const digest = result.digest;
        setTxHash(digest);
        addToast("Update Profile", `Profile updated after settlement`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to update profile");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { updateOnSettlement, isLoading: isPending, txHash, error };
}

export function useUpdateStats() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStats = useCallback(
    async (profileObjectId: string, game: string, damage: number, kills: number, placement: number, gold: number) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${MODULES.player}::update_stats`,
          arguments: [
            tx.object(profileObjectId),
            tx.pure.string(game),
            tx.pure.u64(damage),
            tx.pure.u64(kills),
            tx.pure.u64(placement),
            tx.pure.u64(gold),
          ],
        });
        const result = await signAndExecute({ transaction: tx });
        const digest = result.digest;
        setTxHash(digest);
        addToast("Update Stats", `Game stats recorded for ${game}`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to update stats");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { updateStats, isLoading: isPending, txHash, error };
}

export function useClaimBadge() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claimBadge = useCallback(
    async (profileObjectId: string, badgeId: string) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${MODULES.player}::claim_badge`,
          arguments: [
            tx.object(profileObjectId),
            tx.pure.string(badgeId),
          ],
        });
        const result = await signAndExecute({ transaction: tx });
        const digest = result.digest;
        setTxHash(digest);
        addToast("Claim Badge", `Achievement badge claimed`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to claim badge");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { claimBadge, isLoading: isPending, txHash, error };
}

export function useSettleWithProfile() {
  const { isConnected } = useCurrentWallet();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settleWithProfile = useCallback(
    async (marketObjectId: string, betObjectId: string, matchResultObjectId: string, profileObjectId: string) => {
      if (!isConnected) { setError("Wallet not connected"); return; }
      setTxHash(null);
      setError(null);
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${MODULES.settle}::settle_bet_with_profile`,
          arguments: [
            tx.object(marketObjectId),
            tx.object(betObjectId),
            tx.object(matchResultObjectId),
            tx.object(profileObjectId),
          ],
        });
        const result = await signAndExecute({ transaction: tx });
        const digest = result.digest;
        setTxHash(digest);
        addToast("Settle with Profile", `Bet settled and profile updated`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Settlement failed");
      }
    },
    [signAndExecute, isConnected, addToast, confirmToast]
  );

  return { settleWithProfile, isLoading: isPending, txHash, error };
}

export { BADGE_DEFINITIONS, RANK_NAMES };


export { STAT, OP };
