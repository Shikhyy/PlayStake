import { createClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export type { RealtimeChannel };

export interface MarketMeta {
  id: string;
  object_id: string;
  match_id: number;
  game: string;
  stat: string;
  operator: string;
  threshold: number;
  creator: string;
  created_at: string;
  deadline_ms: number;
}

export interface BetPosition {
  id: string;
  market_id: string;
  bettor: string;
  subject: string;
  game: string;
  stat: string;
  operator: string;
  threshold: number;
  stake: number;
  odds: number;
  is_yes: boolean;
  settled: boolean;
  won: boolean | null;
  payout: number;
  created_at: string;
}

export interface PlayerProfileMeta {
  id: string;
  object_id: string;
  wallet: string;
  username: string;
  xp: number;
  wins: number;
  losses: number;
  created_at: string;
}

// Predefined markets for users to join
export const DEFAULT_MARKETS = [
  {
    object_id: "0xb868d69da43af997a3f4fddcb96f847d985141afaf2a94aa110adefe3e4f007b",
    match_id: 1,
    game: "Arena of Valor",
    stat: "DAMAGE",
    operator: "GTE",
    threshold: 5000,
    deadline_ms: Date.now() + 86400000 * 7, // 7 days
  },
  {
    object_id: "0x0000000000000000000000000000000000000000000000000000000000000001",
    match_id: 2,
    game: "PUBG Mobile",
    stat: "KILLS",
    operator: "GTE",
    threshold: 10,
    deadline_ms: Date.now() + 86400000 * 3,
  },
  {
    object_id: "0x0000000000000000000000000000000000000000000000000000000000000002",
    match_id: 3,
    game: "Valorant",
    stat: "DAMAGE",
    operator: "GTE",
    threshold: 10000,
    deadline_ms: Date.now() + 86400000 * 5,
  },
];

export async function createMarketMeta(
  objectId: string,
  matchId: number,
  game: string,
  stat: string,
  operator: string,
  threshold: number,
  creator: string,
  deadlineMs: number
): Promise<MarketMeta | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from("markets")
    .insert({
      object_id: objectId,
      match_id: matchId,
      game,
      stat,
      operator,
      threshold,
      creator,
      deadline_ms: deadlineMs,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error creating market:", error);
    return null;
  }
  return data;
}

export async function getAllMarkets(): Promise<MarketMeta[]> {
  // Always return default markets if Supabase not configured
  if (!supabase) {
    return DEFAULT_MARKETS.map((m, i) => ({
      id: String(i),
      object_id: m.object_id,
      match_id: m.match_id,
      game: m.game,
      stat: m.stat,
      operator: m.operator,
      threshold: m.threshold,
      creator: "0x0000000000000000000000000000000000000000000000000000000000000000",
      created_at: new Date().toISOString(),
      deadline_ms: m.deadline_ms,
    }));
  }
  
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return DEFAULT_MARKETS.map((m, i) => ({
      id: String(i),
      object_id: m.object_id,
      match_id: m.match_id,
      game: m.game,
      stat: m.stat,
      operator: m.operator,
      threshold: m.threshold,
      creator: "0x0000000000000000000000000000000000000000000000000000000000000000",
      created_at: new Date().toISOString(),
      deadline_ms: m.deadline_ms,
    }));
  }
  return data || [];
}

export async function createBetPosition(
  marketId: string,
  bettor: string,
  subject: string,
  game: string,
  stat: string,
  operator: string,
  threshold: number,
  stake: number,
  odds: number,
  isYes: boolean
): Promise<BetPosition | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from("bets")
    .insert({
      market_id: marketId,
      bettor,
      subject,
      game,
      stat,
      operator,
      threshold,
      stake,
      odds,
      is_yes: isYes,
      settled: false,
      won: null,
      payout: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error creating bet:", error);
    return null;
  }
  return data;
}

export async function getBetsByBettor(bettor: string): Promise<BetPosition[]> {
  if (!supabase) return [];
  
  const { data } = await supabase
    .from("bets")
    .select("*")
    .eq("bettor", bettor)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getBetsByMarket(marketId: string): Promise<BetPosition[]> {
  if (!supabase) return [];
  
  const { data } = await supabase
    .from("bets")
    .select("*")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function updateBetSettled(
  betId: string,
  won: boolean,
  payout: number
): Promise<void> {
  if (!supabase) return;
  
  await supabase
    .from("bets")
    .update({ settled: true, won, payout })
    .eq("id", betId);
}

export async function createPlayerProfile(
  objectId: string,
  wallet: string,
  username: string
): Promise<PlayerProfileMeta | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      object_id: objectId,
      wallet,
      username,
      xp: 0,
      wins: 0,
      losses: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase error creating profile:", error);
    return null;
  }
  return data;
}

export async function getProfileByWallet(wallet: string): Promise<PlayerProfileMeta | null> {
  if (!supabase) return null;
  
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet", wallet)
    .single();

  return data || null;
}

export async function updateProfileStats(
  wallet: string,
  won: boolean
): Promise<void> {
  if (!supabase) return;
  
  const profile = await getProfileByWallet(wallet);
  if (!profile) return;

  await supabase
    .from("profiles")
    .update({
      xp: profile.xp + (won ? 100 : 10),
      wins: won ? profile.wins + 1 : profile.wins,
      losses: won ? profile.losses : profile.losses + 1,
    })
    .eq("wallet", wallet);
}

export function subscribeToMarkets(callback: (payload: any) => void): RealtimeChannel | null {
  if (!supabase) return null;
  
  return supabase
    .channel("markets-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "markets" },
      callback
    )
    .subscribe();
}

export function subscribeToBets(marketId: string | null, callback: (payload: any) => void): RealtimeChannel | null {
  if (!supabase) return null;
  
  const channel = supabase
    .channel(`bets-${marketId || "all"}`)
    .on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "bets",
        filter: marketId ? `market_id=eq.${marketId}` : undefined
      },
      callback
    )
    .subscribe();
  
  return channel;
}

export function subscribeToBetsByBettor(bettor: string | null, callback: (payload: any) => void): RealtimeChannel | null {
  if (!supabase || !bettor) return null;
  
  return supabase
    .channel(`bets-bettor-${bettor}`)
    .on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "bets",
        filter: `bettor=eq.${bettor}`
      },
      callback
    )
    .subscribe();
}

export function subscribeToProfiles(wallet: string | null, callback: (payload: any) => void): RealtimeChannel | null {
  if (!supabase || !wallet) return null;
  
  return supabase
    .channel(`profile-${wallet}`)
    .on(
      "postgres_changes",
      { 
        event: "*", 
        schema: "public", 
        table: "profiles",
        filter: `wallet=eq.${wallet}`
      },
      callback
    )
    .subscribe();
}
