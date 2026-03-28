import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount, useSuiClient } from "@onelabs/dapp-kit";
import { usePostMatchResult, useAddPlayerStats, useAllMatchResults } from "../hooks/useMarket";
import { Icons } from "../components/Icons";

const ORACLE_CAP_ID = "0x797af785ba04d3de243eb2e8e9d80a5f6c3eb71f19360b3c0fdedba11b105de4";

const GAMES = ["Call of Duty Mobile", "PUBG Mobile", "Valorant", "Arena of Valor", "League of Legends", "Fortnite"];

async function generateAIMatchStats(game: string, playerCount: number = 8) {
  const gameSpecifics: Record<string, { damageRange: [number, number], killsRange: [number, number], goldRange?: [number, number], placement: boolean }> = {
    "Call of Duty Mobile": { damageRange: [2000, 12000], killsRange: [3, 25], placement: true },
    "PUBG Mobile": { damageRange: [500, 8000], killsRange: [0, 15], placement: true },
    "Valorant": { damageRange: [3000, 15000], killsRange: [5, 30], placement: false },
    "Arena of Valor": { damageRange: [5000, 25000], killsRange: [2, 15], goldRange: [5000, 25000], placement: false },
    "League of Legends": { damageRange: [8000, 30000], killsRange: [1, 12], goldRange: [8000, 20000], placement: false },
    "Fortnite": { damageRange: [1000, 10000], killsRange: [0, 20], placement: true },
  };
  
  const spec = gameSpecifics[game] || gameSpecifics["Call of Duty Mobile"];
  const players: PlayerStat[] = [];
  
  for (let i = 0; i < playerCount; i++) {
    const damage = Math.floor(spec.damageRange[0] + Math.random() * (spec.damageRange[1] - spec.damageRange[0]));
    const kills = Math.floor(spec.killsRange[0] + Math.random() * (spec.killsRange[1] - spec.killsRange[0]));
    const placement = spec.placement ? Math.floor(1 + Math.random() * playerCount) : 1;
    const gold = spec.goldRange ? Math.floor(spec.goldRange[0] + Math.random() * (spec.goldRange[1] - spec.goldRange[0])) : 0;
    
    players.push({
      address: `0x${Math.random().toString(16).slice(2, 42)}`,
      damage,
      kills,
      gold,
      placement,
      alive: kills > 0 || placement <= Math.floor(playerCount / 2),
    });
  }
  
  players.sort((a, b) => {
    if (spec.placement) return a.placement - b.placement;
    return b.kills - a.kills;
  });
  
  return { game, players, matchId: Date.now() };
}

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

export default function Live() {
  const [selectedResult, setSelectedResult] = useState<MatchResultFull | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [aiGame, setAiGame] = useState("Call of Duty Mobile");
  const [aiGenerating, setAiGenerating] = useState(false);

  const account = useCurrentAccount();
  const client = useSuiClient();
  const { results, isLoading: resultsLoading } = useAllMatchResults();
  const { postResult, isLoading: postingResult } = usePostMatchResult();
  const { addStats, isLoading: addingStats } = useAddPlayerStats();

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    try {
      const matchData = await generateAIMatchStats(aiGame, 8);
      
      console.log("🤖 AI Generated Match:", matchData);
      
      const matchId = Math.floor(Math.random() * 100000);
      
      await postResult(ORACLE_CAP_ID, matchId, Date.now());
      
      await new Promise(r => setTimeout(r, 2000));
      
      for (const player of matchData.players) {
        await addStats(
          results[0]?.objectId || "0x0",
          player.address,
          player.damage,
          player.kills,
          player.placement,
          player.gold
        );
      }
      
      alert(`🤖 AI Generated Match!\n\nGame: ${matchData.game}\nPlayers: ${matchData.players.length}\nTop Damage: ${Math.max(...matchData.players.map(p => p.damage))}\nTop Kills: ${Math.max(...matchData.players.map(p => p.kills))}`);
    } catch (e) {
      console.error("AI Generation error:", e);
      alert("Error generating match. Check console.");
    }
    setAiGenerating(false);
  };

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
    const matchIdStr = prompt("SYSTEM: Enter Match ID parameter:");
    if (!matchIdStr) return;
    const oracleCapId = prompt("SYSTEM: Enter OracleCap Object ID:");
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
    ? new Date(selectedResult.finalizedAt).toISOString().split('T')[1].split('.')[0] + ' UTC'
    : "—";

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b border-dim gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 bg-status-success animate-pulse border border-void shadow-[0_0_10px_var(--status-success)]" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-status-success">
              Oracle Stream Active
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold uppercase tracking-tighter text-bright">Telemetry Feed</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={aiGame}
            onChange={(e) => setAiGame(e.target.value)}
            className="px-3 py-2 font-mono text-[10px] uppercase bg-void border border-dim text-bright focus:border-accent-primary outline-none"
          >
            {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button
            onClick={handleAIGenerate}
            disabled={aiGenerating || !account}
            className="px-4 py-2 font-mono text-[10px] uppercase font-bold border border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-void transition-colors disabled:opacity-50"
          >
            {aiGenerating ? "[ GENERATING... ]" : "[ 🤖 AI SIMULATE MATCH ]"}
          </button>
          <button
            onClick={handlePostToChain}
            disabled={postingResult || addingStats || !account}
            className="px-4 py-2 font-mono text-[10px] uppercase font-bold border border-dim text-dim hover:text-bright hover:border-bright transition-colors disabled:opacity-50"
          >
            {postingResult ? "[ POSTING... ]" : "[ INJECT MATCH RESULT ]"}
          </button>
          <button
            onClick={handleAddStats}
            disabled={postingResult || addingStats || !account || !selectedResult}
            className="px-4 py-2 font-mono text-[10px] uppercase font-bold border border-dim text-dim hover:text-bright hover:border-bright transition-colors disabled:opacity-50"
          >
            [ SYNC PLAYER STATS ]
          </button>
        </div>
      </div>

      {/* Match Selector Strip */}
      <div className="mb-10 flex overflow-x-auto no-scrollbar gap-4 pb-4 border-b border-dim border-dashed">
        <div className="sticky left-0 flex-shrink-0 flex items-center bg-void z-10 pr-4 border-r border-dim border-dashed">
          <span className="font-mono text-[10px] uppercase text-dim tracking-widest">Select Node:</span>
        </div>
        {resultsLoading ? (
          <div className="font-mono text-xs text-dim uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-dim animate-spin" /> Fetching blocks...
          </div>
        ) : results.length === 0 ? (
          <div className="font-mono text-xs text-dim uppercase">No records found.</div>
        ) : (
          results.map((r) => (
            <button
              key={r.objectId}
              onClick={() => handleResultSelect(r)}
              className={`flex-shrink-0 px-4 py-2.5 font-mono text-xs uppercase tracking-widest border transition-colors flex items-center gap-3 ${selectedMarket(r.objectId, selectedResult?.objectId)}`}
            >
              <span className="font-bold">ID: {r.matchId}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${r.playerCount > 0 ? "bg-status-success" : "bg-dim"}`} />
            </button>
          ))
        )}
      </div>

      {/* Main Content Dashboard */}
      {isLoadingResult ? (
        <div className="py-32 flex flex-col items-center justify-center border border-dim bg-panel">
          <div className="w-8 h-8 border border-dim border-t-bright rounded-none animate-spin mb-4" />
          <p className="font-mono text-xs text-dim uppercase tracking-widest">Decoding payload...</p>
        </div>
      ) : selectedResult ? (
        <div className="grid lg:grid-cols-4 gap-6">
          
          {/* Main Leaderboard */}
          <div className="lg:col-span-3 border border-dim bg-panel">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-dim bg-surface">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 border border-dim bg-void flex items-center justify-center">
                  <Icons.award size={16} className="text-bright" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-2xl uppercase tracking-widest text-bright">Match #{selectedResult.matchId}</h2>
                  <p className="font-mono text-[10px] text-faint uppercase">TX: {selectedResult.objectId}</p>
                </div>
              </div>
              <div className="mt-4 sm:mt-0 text-right">
                <div className="font-mono text-xl tracking-tighter text-accent-primary font-bold">{finalizedTime}</div>
                <div className="font-mono text-[10px] uppercase text-dim">Chain Finality</div>
              </div>
            </div>

            {/* Terminal Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-dim bg-void">
                    <th className="py-3 px-4 text-dim font-normal uppercase tracking-widest">Rank</th>
                    <th className="py-3 px-4 text-dim font-normal uppercase tracking-widest">Public Key</th>
                    <th className="py-3 px-4 text-dim font-normal uppercase tracking-widest text-right">Elims</th>
                    <th className="py-3 px-4 text-dim font-normal uppercase tracking-widest text-right">Damage</th>
                    <th className="py-3 px-4 text-dim font-normal uppercase tracking-widest text-right">Econ</th>
                    <th className="py-3 px-4 text-dim font-normal uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dim/50">
                  {sortedStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-dim uppercase">
                        Awaiting player synchronization...
                      </td>
                    </tr>
                  ) : sortedStats.map((stat, i) => (
                    <tr key={stat.address} className={`hover:bg-surface transition-colors ${i === 0 ? "bg-accent-primary/10 border-l-[3px] border-l-accent-primary" : "border-l-[3px] border-l-transparent"} ${!stat.alive ? "opacity-50" : ""}`}>
                      <td className="py-4 px-4 font-bold text-bright">{i + 1}</td>
                      <td className="py-4 px-4 font-bold text-accent-primary underline decoration-dim underline-offset-4 cursor-pointer">{stat.address.slice(0, 10)}...</td>
                      <td className="py-4 px-4 text-right text-bright">{stat.kills}</td>
                      <td className="py-4 px-4 text-right font-bold tracking-tighter text-sm">{stat.damage.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right">{stat.gold.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right">
                        <span className={`px-2 py-1 uppercase text-[9px] font-bold tracking-widest border ${stat.alive ? "border-status-success text-status-success bg-status-success/10" : "border-status-error text-status-error bg-status-error/10"}`}>
                          {stat.alive ? "SURVIVED" : "KIA"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side Panels */}
          <div className="space-y-6">
            
            {/* MVP Panel */}
            <div className="border border-dim bg-panel p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 border-l border-b border-dim flex items-center justify-center bg-surface">
                <Icons.crown size={20} className="text-accent-primary" />
              </div>
              
              <div className="font-mono text-[10px] uppercase text-dim tracking-widest mb-4">Prime Asset (MVP)</div>
              <h3 className="font-display font-bold text-xl text-bright mb-6 max-w-[80%]">
                {sortedStats[0]?.address.slice(0, 10) || "UNKNOWN"}
              </h3>
              
              <div className="grid grid-cols-2 gap-[1px] bg-dim border border-dim">
                <div className="bg-panel p-3">
                  <div className="font-mono text-xl tracking-tighter text-accent-primary font-bold">{sortedStats[0]?.damage.toLocaleString() || 0}</div>
                  <div className="font-mono text-[9px] uppercase text-dim">Global DMG</div>
                </div>
                <div className="bg-panel p-3">
                  <div className="font-mono text-xl tracking-tighter text-bright font-bold">{sortedStats[0]?.kills || 0}</div>
                  <div className="font-mono text-[9px] uppercase text-dim">Total Elims</div>
                </div>
              </div>
            </div>

            {/* Aggregated Data */}
            <div className="border border-dim bg-panel p-5">
              <div className="font-mono text-[10px] uppercase text-dim tracking-widest mb-4 pb-2 border-b border-dim">Session Telemetry</div>
              <ul className="space-y-3 font-mono text-xs">
                <li className="flex justify-between">
                  <span className="text-dim">Aggregated Output</span>
                  <span className="text-bright font-bold">{(liveStats.reduce((sum, s) => sum + s.damage, 0) / 1000).toFixed(1)}k</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-dim">Total Casualties</span>
                  <span className="text-bright font-bold">{liveStats.reduce((sum, s) => sum + s.kills, 0)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-dim">Identified Targets</span>
                  <span className="text-bright font-bold">{liveStats.length}</span>
                </li>
                <li className="flex justify-between pt-3 mt-3 border-t border-dim border-dashed">
                  <span className="text-dim">Block Confirmed</span>
                  <span className="text-status-success font-bold">TRUE</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center border border-dim bg-panel">
          <Icons.zap size={32} className="text-dim mb-4" />
          <p className="font-mono text-xs text-dim uppercase tracking-widest">Select a node from the registry above.</p>
        </div>
      )}
    </div>
  );
}

// Logic helper for selected state
function selectedMarket(currentId: string, selectedId: string | undefined) {
  if (currentId === selectedId) {
    return "bg-bright text-void border-bright shadow-[inset_4px_0_0_var(--accent-primary)]";
  }
  return "bg-surface text-dim border-dim hover:bg-panel hover:text-bright";
}
