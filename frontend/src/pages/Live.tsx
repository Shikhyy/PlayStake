import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount, useSuiClient } from "@onelabs/dapp-kit";
import { usePostMatchResult, useAddPlayerStats, useAllMatchResults } from "../hooks/useMarket";
import { Icons, getIcon } from "../components/Icons";

interface PlayerStat {
  address: string;
  damage: number;
  kills: number;
  gold: number;
  placement: number;
  alive: boolean;
}

interface MatchResultFull {
  objectId: string;
  matchId: string;
  finalizedAt: number;
  players: PlayerStat[];
}

function parseVecMap(vecMap: unknown): Map<string, PlayerStat> {
  const result = new Map<string, PlayerStat>();
  if (!vecMap || typeof vecMap !== "object") return result;
  const obj = vecMap as Record<string, unknown>;
  if (!Array.isArray(obj.contents)) return result;
  for (const entry of obj.contents as unknown[]) {
    if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      const key = String(e.key || "");
      const fields = (e.value as Record<string, unknown>) || {};
      result.set(key, {
        address: key,
        damage: Number(fields.damage_dealt || 0),
        kills: Number(fields.kills || 0),
        gold: Number(fields.gold_earned || 0),
        placement: Number(fields.placement || 0),
        alive: Number(fields.placement || 99) <= 50,
      });
    }
  }
  return result;
}

function getRankBadgeClass(rank: number) {
  if (rank === 1) return "rank-diamond shadow-[0_0_15px_rgba(0,191,255,0.4)] text-black";
  if (rank === 2) return "rank-platinum text-black";
  if (rank === 3) return "rank-gold text-black";
  if (rank <= 10) return "rank-silver text-black";
  return "rank-bronze text-white";
}

export default function Live() {
  const [selectedResult, setSelectedResult] = useState<MatchResultFull | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  const account = useCurrentAccount();
  const client = useSuiClient();
  const { results, isLoading: resultsLoading } = useAllMatchResults();
  const { postResult, isLoading: postingResult } = usePostMatchResult();
  const { addStats, isLoading: addingStats } = useAddPlayerStats();

  const fetchMatchDetail = useCallback(async (objectId: string) => {
    setIsLoadingResult(true);
    try {
      const resp = await client.getObject({
        id: objectId,
        options: { showContent: true },
      });
      const data = resp.data;
      if (data && (data as { dataType?: string }).dataType === "moveObject") {
        const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
        const fields = content?.fields || {};
        const statsMap = parseVecMap(fields.stats);
        const players: PlayerStat[] = Array.from(statsMap.values());
        setSelectedResult({
          objectId,
          matchId: String(fields.match_id || 0),
          finalizedAt: Number(fields.finalized_at || 0),
          players,
        });
      }
    } catch { /* ignore */ }
    setIsLoadingResult(false);
  }, [client]);

  useEffect(() => {
    if (results.length > 0 && !selectedResult) {
      fetchMatchDetail(results[0].objectId);
    }
  }, [results, selectedResult, fetchMatchDetail]);

  const handleResultSelect = (r: { objectId: string }) => {
    setSelectedResult(null);
    fetchMatchDetail(r.objectId);
  };

  const handlePostToChain = async () => {
    if (!account) return;
    const matchIdStr = prompt("Enter Match ID to post result for:");
    if (!matchIdStr) return;
    const oracleCapId = prompt("Enter your OracleCap Object ID:");
    if (!oracleCapId) return;
    await postResult(oracleCapId, Number(matchIdStr), Date.now() + 5000);
  };

  const handleAddStats = async () => {
    if (!account || !selectedResult) return;
    for (const player of selectedResult.players) {
      await addStats(
        selectedResult.objectId,
        player.address,
        player.damage,
        player.kills,
        player.placement,
        player.gold
      );
    }
  };

  const liveStats = selectedResult?.players || [];
  const sortedStats = [...liveStats].sort((a, b) => {
    if (b.damage !== a.damage) return b.damage - a.damage;
    return b.kills - a.kills;
  });

  const finalizedTime = selectedResult
    ? new Date(selectedResult.finalizedAt).toLocaleString()
    : "—";

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold font-display gradient-text-gaming">Live Matches</h1>
              <span className="badge-game badge-red">
                <span className="w-2 h-2 bg-accent-crimson rounded-full relative">
                  <span className="absolute inset-0 bg-accent-crimson rounded-full animate-ping" />
                </span>
                {results.length} ON-CHAIN
              </span>
            </div>
            <p className="text-dim font-tech">Oracle-verified match results on OneChain</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
            <span className="text-xs font-tech text-dim">On-Chain Data</span>
          </div>
        </div>

        {/* Oracle Actions */}
        <div className="glass-panel p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-tech text-dim">
              Oracle: Posting verified stats to blockchain
              {selectedResult && <strong className="text-normal ml-1">Match #{selectedResult.matchId}</strong>}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePostToChain}
              disabled={postingResult || addingStats || !account}
              className="btn-game btn-gold text-xs px-4 py-2 flex items-center gap-2"
            >
              {postingResult ? "Posting..." : <><Icons.externalLink size={14} /> Post Match Result</>}
            </button>
            <button
              onClick={handleAddStats}
              disabled={postingResult || addingStats || !account || !selectedResult}
              className="btn-game btn-secondary-game text-xs px-4 py-2"
            >
              Add Stats
            </button>
          </div>
        </div>

        {/* Match Selector */}
        {resultsLoading ? (
          <div className="text-center py-8 mb-8">
            <div className="inline-block w-8 h-8 border-2 border-dim border-t-accent-lavender rounded-full animate-spin mb-4" />
            <p className="text-dim font-tech">Loading match results from blockchain...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 mb-8 card-game">
            <div className="text-5xl mb-4 text-accent-lavender flex justify-center">
              {getIcon("trophy" as keyof typeof Icons, { size: 48 })}
            </div>
            <p className="text-dim font-tech mb-4">No match results on-chain yet.</p>
            <p className="text-dim font-tech text-sm">The oracle posts verified results here after each match.</p>
          </div>
        ) : (
          <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
            {results.map((r) => (
              <button
                key={r.objectId}
                onClick={() => handleResultSelect(r)}
                className={`flex-shrink-0 card-game p-4 min-w-[200px] ${selectedResult?.objectId === r.objectId ? "border-accent-lavender" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent-crimson rounded-full animate-pulse-glow" />
                    <span className="font-semibold font-display">Match #{r.matchId}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-dim font-tech">
                  <span>{r.playerCount} players</span>
                  <span className="badge-game badge-green text-[10px]">On-chain</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Main Content */}
        {isLoadingResult ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-dim border-t-accent-lavender rounded-full animate-spin mb-4" />
            <p className="text-dim font-tech">Loading player stats...</p>
          </div>
        ) : selectedResult ? (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="card-game p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-dim">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl border border-dim"
                         style={{ background: 'linear-gradient(135deg, rgba(87,106,143,0.2), rgba(183,189,247,0.1))' }}>
                      <Icons.game size={28} className="text-accent-lavender" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold font-display">Match #{selectedResult.matchId}</h2>
                      <p className="text-sm text-dim font-tech">{selectedResult.objectId.slice(0, 12)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold font-mono font-display text-accent-lavender">{finalizedTime}</div>
                    <div className="text-xs text-dim font-tech">Finalized On-Chain</div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-tech font-medium text-dim uppercase tracking-wider mb-2">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Player</div>
                  <div className="col-span-2 text-center">Kills</div>
                  <div className="col-span-3 text-center">Damage</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>

                <div className="space-y-2">
                  {sortedStats.map((stat, i) => (
                    <div key={stat.address}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-xl transition-all ${stat.alive ? "bg-[#181c25] hover:bg-[#1f2432]" : "bg-[#0a0b10] opacity-60"} ${i === 0 ? "border border-accent-gold/30" : ""}`}
                    >
                      <div className="col-span-1 flex items-center">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display ${getRankBadgeClass(i + 1)}`}>
                          #{i + 1}
                        </span>
                      </div>
                      <div className="col-span-4 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.alive ? "text-accent-lavender" : "text-dim"}`}>
                          {stat.alive ? getIcon("game" as keyof typeof Icons, { size: 18 }) : getIcon("skull" as keyof typeof Icons, { size: 18 })}
                        </div>
                        <div>
                          <p className={`font-medium font-mono text-xs ${i === 0 ? "text-accent-gold" : ""}`}>
                            {stat.address.slice(0, 8)}...{i === 0 && <span className="ml-2">{getIcon("crown" as keyof typeof Icons, { size: 14, className: "text-accent-gold" })}</span>}
                          </p>
                          <p className="text-xs text-dim font-tech">K: {stat.kills} G: {stat.gold}</p>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="font-mono font-bold">{stat.kills}</span>
                      </div>
                      <div className="col-span-3 flex items-center justify-center">
                        <span className="font-mono font-bold">{stat.damage.toLocaleString()}</span>
                      </div>
                      <div className="col-span-2 flex items-end justify-end">
                        <span className={`badge-game ${stat.alive ? "badge-green" : "badge-red"} text-[10px]`}>
                          #{stat.placement}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="card-game p-6 text-center">
                <div className="text-5xl mb-3 text-accent-gold flex justify-center">
                  {getIcon("crown" as keyof typeof Icons, { size: 48 })}
                </div>
                <p className="text-sm text-dim mb-1 font-tech">Current Leader</p>
                <h3 className="text-xl font-bold font-display mb-4 font-mono text-xs">
                  {sortedStats[0]?.address.slice(0, 10)}...
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                    <p className="text-2xl font-bold font-mono text-accent-lavender">{sortedStats[0]?.damage.toLocaleString()}</p>
                    <p className="text-xs text-dim font-tech">Damage</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                    <p className="text-2xl font-bold font-mono text-accent-crimson">{sortedStats[0]?.kills}</p>
                    <p className="text-xs text-dim font-tech">Kills</p>
                  </div>
                </div>
              </div>

              <div className="card-game p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-display">
                  <span className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: '#F6B17A' }} />
                  Verified Stats
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {sortedStats.slice(0, 10).map((stat) => (
                    <div key={stat.address} className="p-3 rounded-xl transition-all"
                      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-mono text-xs">{stat.address.slice(0, 8)}...</span>
                        <span className="text-xs text-dim font-mono">{stat.damage.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px] text-dim font-tech">
                        <span>K: {stat.kills}</span>
                        <span>G: {stat.gold}</span>
                        <span>#{stat.placement}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-game p-6">
                <h3 className="text-lg font-bold mb-4 font-display">Match Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-dim font-tech">Total Damage</span>
                    <span className="font-mono font-semibold">
                      {(liveStats.reduce((sum, s) => sum + s.damage, 0) / 1000).toFixed(1)}K
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dim font-tech">Total Kills</span>
                    <span className="font-mono font-semibold">{liveStats.reduce((sum, s) => sum + s.kills, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dim font-tech">Players</span>
                    <span className="font-mono font-semibold">{liveStats.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dim font-tech">Result ID</span>
                    <span className="font-mono font-semibold text-xs">{selectedResult.objectId.slice(0, 6)}...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 card-game">
            <div className="text-5xl mb-4 text-accent-lavender flex justify-center">
              {getIcon("trophy" as keyof typeof Icons, { size: 48 })}
            </div>
            <h3 className="text-xl font-semibold mb-2 font-display">No Match Selected</h3>
            <p className="text-dim font-tech">Select a match from the list above to view verified on-chain stats.</p>
          </div>
        )}
      </div>
    </div>
  );
}
