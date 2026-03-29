import { useState, useCallback, useEffect, useRef } from "react";
import {
  useCurrentWallet,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@onelabs/dapp-kit";
import { Transaction } from "@onelabs/sui/transactions";
import { fromUsdo, toUsdo, MODULES, STAT, OP, USDO_TYPE } from "../constants";
import { useTxToast } from "../components/TxToast";
import { 
  getAllMarkets, 
  createMarketMeta,
  supabase,
  subscribeToMarkets,
  subscribeToBets,
  getBetsByMarket,
  type BetPosition,
} from "../lib/supabase";

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
          typeArguments: [USDO_TYPE],
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
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { addToast, confirmToast } = useTxToast();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const createMarket = useCallback(
    async (
      matchId: number, 
      deadlineMs: number,
      game: string = "General",
      stat: string = "DAMAGE",
      operator: string = "GTE",
      threshold: number = 0
    ) => {
      console.log(">>> useCreateMarket called", { isConnected, matchId, deadlineMs, game, stat, operator, threshold });
      
      if (!isConnected || !account) { 
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
        tx.setGasBudget(50000000);
        
        tx.moveCall({
          target: target,
          typeArguments: [USDO_TYPE],
          arguments: [tx.pure.u64(matchId), tx.pure.u64(deadlineMs)],
        });
        
        setStatus("Signing transaction...");
        console.log(">>> Executing transaction...");
        
        const result = await signAndExecute({ transaction: tx });
        
        console.log(">>> Result:", result);
        console.log(">>> Digest:", result.digest);
        console.log(">>> Effects:", result.effects);
        
        // Extract created Market object ID and store in Supabase
        if (result.effects && typeof result.effects === 'object') {
          const effects = result.effects as { created?: Array<{ reference?: { objectId?: string } }> };
          if (effects.created && effects.created.length > 0) {
            for (const created of effects.created) {
              if (created.reference?.objectId?.startsWith('0x')) {
                console.log(">>> Created market:", created.reference.objectId);
                const objectId = created.reference.objectId;
                
                // Store in localStorage (fallback)
                addStoredMarketId(objectId);
                
                // Store in Supabase (if configured)
                if (supabase && account) {
                  await createMarketMeta(
                    objectId,
                    matchId,
                    game,
                    stat,
                    operator,
                    threshold,
                    account.address,
                    deadlineMs
                  );
                  console.log(">>> Stored market in Supabase");
                }
              }
            }
          }
        }
        
        setStatus("Transaction submitted!");
        const digest = result.digest;
        setTxHash(digest);
        addToast("Create Market", `Match #${matchId} created`, digest);
        setTimeout(() => confirmToast(digest), 3000);
        setStatus("");
      } catch (e: unknown) {
        console.error(">>> Create market error:", e);
        let errMsg = "Transaction failed";
        if (e && typeof e === 'object' && 'message' in e) {
          errMsg = String((e as { message: unknown }).message);
        } else if (e instanceof Error) {
          errMsg = e.message;
        }
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
        yesPool: toUsdo(BigInt(String(f.yes_pool || "0"))),
        noPool: toUsdo(BigInt(String(f.no_pool || "0"))),
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
        const stakeRaw = BigInt(String(f.stake || "0"));
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
          payout: toUsdo(BigInt(String(f.payout || "0"))),
          stake: toUsdo(BigInt(String(f.stake || "0"))),
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
            typeArguments: [USDO_TYPE],
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
          typeArguments: [USDO_TYPE],
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
    yesPool: toUsdo(BigInt(String(fields.yes_pool || "0"))),
    noPool: toUsdo(BigInt(String(fields.no_pool || "0"))),
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

export function getStoredMarketIds(): string[] {
  try {
    const stored = localStorage.getItem("playstake_market_ids");
    const ids = stored ? JSON.parse(stored) : [];
    if (ids.length === 0) {
      return [];
    }
    return ids;
  } catch {
    return [];
  }
}

function addStoredMarketId(id: string) {
  const ids = getStoredMarketIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem("playstake_market_ids", JSON.stringify(ids));
  }
}

export function useAllMarkets(): {
  markets: MarketOnChainFull[]; isLoading: boolean; error: string | null; refetch: () => void;
} {
  const client = useSuiClient();
  const [markets, setMarkets] = useState<MarketOnChainFull[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof subscribeToMarkets> | null>(null);

  const loadMarkets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const marketsMeta = await getAllMarkets();
      console.log(">>> Got markets from Supabase:", marketsMeta.length);
      
      if (marketsMeta.length === 0) {
        setMarkets([]);
        setIsLoading(false);
        return;
      }

      const marketIds = marketsMeta.map(m => m.object_id);

      const results = await Promise.allSettled(
        marketIds.map(id =>
          client.getObject({ id, options: { showContent: true } })
        )
      );
      
      const parsed: MarketOnChainFull[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const meta = marketsMeta[i];
        
        if (result.status === "fulfilled") {
          const resp = result.value;
          const data = resp.data;
          if (!data || (data as { dataType?: string }).dataType !== "moveObject") {
            parsed.push({
              objectId: meta.object_id,
              matchId: String(meta.match_id),
              yesPool: 0,
              noPool: 0,
              betCount: 0,
              deadlineMs: meta.deadline_ms,
              finalized: false,
            });
            continue;
          }
          const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
          const f = content?.fields || {};
          parsed.push(parseMarketFields(data.objectId, f));
        } else {
          parsed.push({
            objectId: meta.object_id,
            matchId: String(meta.match_id),
            yesPool: 0,
            noPool: 0,
            betCount: 0,
            deadlineMs: meta.deadline_ms,
            finalized: false,
          });
        }
      }
      
      console.log(">>> Loaded markets:", parsed.length);
      parsed.sort((a, b) => Number(b.deadlineMs) - Number(a.deadlineMs));
      setMarkets(parsed);
    } catch (e) {
      console.error(">>> Error loading markets:", e);
      setError(e instanceof Error ? e.message : "Failed to load markets");
    }
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    loadMarkets();

    if (supabase && !channelRef.current) {
      channelRef.current = subscribeToMarkets((payload) => {
        console.log(">>> Realtime market update:", payload);
        loadMarkets();
      });
    }

    return () => {
      if (channelRef.current) {
        supabase?.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadMarkets]);

  return { markets, isLoading, error, refetch: loadMarkets };
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
          stake: toUsdo(BigInt(String(f.stake || "0"))),
          payout: toUsdo(BigInt(String(f.payout || "0"))),
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
  console.log(">>> parsePlayerProfile fields:", JSON.stringify(fields));
  
  const totalBets = Number(fields.total_bets || fields.total_bets || 0);
  const wins = Number(fields.wins || 0);
  const losses = Number(fields.losses || 0);
  const xp = Number(fields.xp || 0);
  const xpToNext = Number(fields.xp_to_next || fields.xpToNext || 100);
  const rank = Number(fields.rank || 0);

  const username = fields.username;
  console.log(">>> username raw:", username, "type:", typeof username);
  
  let usernameStr = "";
  if (Array.isArray(username)) {
    usernameStr = String.fromCharCode(...(username as number[]));
  } else if (typeof username === "string") {
    usernameStr = username;
  }
  console.log(">>> username parsed:", usernameStr);

  return {
    objectId: "",
    owner: String(fields.owner || ""),
    username: usernameStr,
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
  refetch: () => void;
} {
  const client = useSuiClient();
  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!walletAddress) { setProfile(null); return; }
    setIsLoading(true);
    setError(null);

    try {
      let cursor: string | undefined = undefined;
      let foundProfile: PlayerProfileData | null = null;

      do {
        const resp = await client.getOwnedObjects({
          owner: walletAddress,
          cursor,
          limit: 50,
          options: { showContent: true, showType: true },
        });

        console.log(">>> Got objects:", resp.data.length);

        for (const obj of resp.data) {
          const data = obj.data;
          if (!data) continue;
          
          console.log(">>> Checking object type:", data.type);
          
          const type_ = (data as { type?: string }).type;
          
          console.log(">>> type_:", type_, "includes:", type_?.includes("PlayerProfile"));
          
          if (type_ && type_.includes("PlayerProfile")) {
            console.log(">>> FOUND PLAYER PROFILE OBJECT, parsing...");
            const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
            const fields = content?.fields || {};
            console.log(">>> fields keys:", Object.keys(fields));
            const parsed = parsePlayerProfile(fields);
            console.log(">>> parsed result:", parsed);
            if (parsed) {
              parsed.objectId = data.objectId;
              foundProfile = parsed;
              console.log(">>> SET FOUND PROFILE:", foundProfile);
              break;
            }
          }
        }

        cursor = resp.nextCursor ?? undefined;
        if (foundProfile || !resp.hasNextPage) break;
      } while (cursor);

      setProfile(foundProfile);
    } catch (e) {
      console.error("Error loading profile:", e);
      setError(e instanceof Error ? e.message : "Failed to load profile");
    }
    setIsLoading(false);
  }, [client, walletAddress]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile, retryCount]);

  const refetch = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);

  return { profile, isLoading, error, refetch };
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
        tx.setGasBudget(50000000);
        tx.moveCall({
          target: `${MODULES.player}::create_profile`,
          arguments: [tx.pure.string(username)],
        });
        console.log(">>> Creating profile for:", username);
        const result = await signAndExecute({ transaction: tx });
        console.log(">>> Profile result:", result);
        const digest = result.digest;
        setTxHash(digest);
        addToast("Create Profile", `Player "${username}" profile created`, digest);
        setTimeout(() => confirmToast(digest), 3000);
      } catch (e: unknown) {
        console.error(">>> Profile error:", e);
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

// ─── Real-time hooks ───────────────────────────────────────────────────────────

export function useLiveMarketOdds(marketObjectId: string | null): {
  yesOdds: number; noOdds: number; totalVolume: number; isLoading: boolean;
} {
  const client = useSuiClient();
  const [yesOdds, setYesOdds] = useState(180);
  const [noOdds, setNoOdds] = useState(180);
  const [totalVolume, setTotalVolume] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadOdds = useCallback(async () => {
    if (!marketObjectId) return;
    setIsLoading(true);
    
    try {
      const resp = await client.getObject({
        id: marketObjectId,
        options: { showContent: true },
      });
      
      const data = resp.data;
      if (!data || (data as { dataType?: string }).dataType !== "moveObject") {
        setIsLoading(false);
        return;
      }
      
      const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
      const f = content?.fields || {};
      
      const yesPool = BigInt(Number(f.yes_pool || 1));
      const noPool = BigInt(Number(f.no_pool || 1));
      const total = yesPool + noPool;
      
      if (total > 0n) {
        const yesOddsVal = Number((yesPool * 20000n) / total) / 100;
        const noOddsVal = Number((noPool * 20000n) / total) / 100;
        setYesOdds(Math.max(100, Math.min(500, yesOddsVal)));
        setNoOdds(Math.max(100, Math.min(500, noOddsVal)));
        setTotalVolume(Number(total));
      }
    } catch (e) {
      console.error("Error loading odds:", e);
    }
    setIsLoading(false);
  }, [client, marketObjectId]);

  useEffect(() => {
    if (!marketObjectId) return;
    
    loadOdds();
    
    intervalRef.current = setInterval(loadOdds, 3000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [marketObjectId, loadOdds]);

  return { yesOdds, noOdds, totalVolume, isLoading };
}

export function useLiveBets(marketObjectId: string | null): {
  bets: BetPosition[]; isLoading: boolean; refetch: () => void;
} {
  const [bets, setBets] = useState<BetPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof subscribeToBets> | null>(null);

  const loadBets = useCallback(async () => {
    if (!marketObjectId) return;
    setIsLoading(true);
    
    try {
      const marketBets = await getBetsByMarket(marketObjectId);
      setBets(marketBets);
    } catch (e) {
      console.error("Error loading bets:", e);
    }
    setIsLoading(false);
  }, [marketObjectId]);

  useEffect(() => {
    if (!marketObjectId) return;
    
    loadBets();

    if (supabase && !channelRef.current) {
      channelRef.current = subscribeToBets(marketObjectId, (payload) => {
        console.log(">>> Realtime bet update:", payload);
        loadBets();
      });
    }

    return () => {
      if (channelRef.current) {
        supabase?.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [marketObjectId, loadBets]);

  return { bets, isLoading, refetch: loadBets };
}
