import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import { useSuiClient } from "@onelabs/dapp-kit";
import {
  useMarket,
  usePlaceBet,
  type BetOnChain,
  type PerformanceClaim,
} from "../hooks/useMarket";
import { Icons, getIcon } from "../components/Icons";
import { SUPPORTED_GAMES } from "../constants/games";

function useMarketBets(betIds: string[]): {
  bets: BetOnChain[]; isLoading: boolean; error: string | null;
} {
  const client = useSuiClient();
  const [bets, setBets] = useState<BetOnChain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (betIds.length === 0) { setBets([]); return; }
    setIsLoading(true);
    setError(null);

    const idAddresses: string[] = betIds.map(id => {
      if (id.startsWith("0x")) return id;
      return `0x${id}`;
    });

    client.multiGetObjects({
      ids: idAddresses,
      options: { showContent: true },
    }).then((responses) => {
      const parsed: BetOnChain[] = [];
      for (const resp of responses) {
        const data = resp.data;
        if (!data || (data as { dataType?: string }).dataType !== "moveObject") continue;
        const content = (data as { content?: { fields?: Record<string, unknown> } }).content;
        const f = (content?.fields || {}) as Record<string, unknown>;
        const claimF = (f.claim as Record<string, unknown>) || {};
        const gameBytes = f.game as unknown[];
        const game = Array.isArray(gameBytes)
          ? String.fromCharCode(...(gameBytes as number[]))
          : "";
        const stakeRaw = BigInt(Number(f.stake || 0));
        parsed.push({
          objectId: data.objectId,
          matchId: String(f.match_id || "0"),
          bettor: String(f.bettor || ""),
          subject: String(f.subject || ""),
          game,
          claim: {
            stat: Number(claimF.stat || 0),
            operator: Number(claimF.operator || 0),
            threshold: Number(claimF.threshold || 0),
          } as PerformanceClaim,
          stakeRaw,
          stakeUsdo: Number(stakeRaw) / 1e6,
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
  }, [client, betIds.join(",")]);

  return { bets, isLoading, error };
}

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const account = useCurrentAccount();
  const { market, isLoading: marketLoading, error: marketError } = useMarket(id || null);
  const { bets, isLoading: betsLoading, error: betsError } = useMarketBets(market?.betIds || []);
  const { placeBet, isLoading: placingBet, error: placeError } = usePlaceBet();

  const [showBetModal, setShowBetModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [game, setGame] = useState("Arena of Valor");
  const [stat, setStat] = useState<"DAMAGE" | "KILLS" | "PLACEMENT" | "GOLD">("DAMAGE");
  const [operator, setOperator] = useState<"GTE" | "LTE" | "EQ">("GTE");
  const [threshold, setThreshold] = useState(1000);
  const [stake, setStake] = useState(10);
  const [betSide, setBetSide] = useState<"YES" | "NO">("YES");

  const totalPool = market ? market.yesPool + market.noPool : 0;
  const effectiveOdds = totalPool > 0 && market
    ? Number((totalPool / Math.max(market.yesPool, 1)).toFixed(2))
    : 1.0;
  const yesPct = totalPool > 0 && market ? Math.round((market.yesPool / totalPool) * 100) : 50;
  const now = Date.now();
  const deadlineStr = market
    ? new Date(market.deadlineMs).toLocaleString()
    : "—";
  const timeLeft = market
    ? market.deadlineMs > now
      ? `${Math.max(0, Math.floor((market.deadlineMs - now) / 60000))} min remaining`
      : "Deadline passed"
    : "";

  const handlePlaceBet = useCallback(async () => {
    if (!id || !account || !subject) return;
    await placeBet(id, {
      subject,
      game,
      claim: {
        stat: stat === "DAMAGE" ? 0 : stat === "KILLS" ? 1 : stat === "PLACEMENT" ? 2 : 3,
        operator: operator === "GTE" ? 0 : operator === "LTE" ? 1 : 2,
        threshold,
      },
      stakeUsdo: stake,
      isYes: betSide === "YES",
    });
  }, [id, account, subject, game, stat, threshold, stake, betSide, placeBet]);

  const STAT_NAMES = ["Damage Dealt", "Kills", "Placement", "Gold Earned"];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link to="/markets" className="inline-flex items-center gap-2 text-sm text-dim hover:text-accent-lavender font-tech mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Markets
        </Link>

        {/* Loading state */}
        {marketLoading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-dim border-t-accent-lavender rounded-full animate-spin mb-4" />
            <p className="text-dim font-tech">Loading market from blockchain...</p>
          </div>
        )}

        {/* Error state */}
        {marketError && (
          <div className="card-game p-8 text-center">
            <div className="text-5xl mb-4 text-accent-crimson flex justify-center">
              {getIcon("cross" as keyof typeof Icons, { size: 48 })}
            </div>
            <h2 className="text-xl font-bold font-display mb-2">Market Not Found</h2>
            <p className="text-dim font-tech mb-4">{marketError}</p>
            <Link to="/markets" className="btn-game btn-primary-game">Browse Markets</Link>
          </div>
        )}

        {/* Market content */}
        {market && (
          <>
            {/* Market header */}
            <div className="card-game p-6 mb-6 gradient-border-glow animate-fade-in-up">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border border-dim"
                       style={{ background: 'linear-gradient(135deg, rgba(87,106,143,0.2), rgba(183,189,247,0.1))' }}>
                    <Icons.game size={32} className="text-accent-lavender" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold font-display mb-1">Match #{market.matchId}</h1>
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://explorer.onelabs.cc/object/${market.objectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-accent-lavender hover:underline"
                      >
                        {market.objectId.slice(0, 12)}...{market.objectId.slice(-6)}
                      </a>
                      <span className={`badge-game text-[10px] ${market.finalized ? "badge-green" : "badge-red"}`}>
                        {market.finalized ? "Finalized" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-dim font-tech mb-1">Deadline</div>
                  <div className="text-sm font-mono font-semibold">{deadlineStr}</div>
                  {!market.finalized && (
                    <div className="text-xs text-accent-lavender font-tech mt-1">{timeLeft}</div>
                  )}
                </div>
              </div>

              {/* Pool stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                  <p className="text-2xl font-bold font-mono text-accent-lavender">
                    {market.yesPool.toFixed(2)}
                  </p>
                  <p className="text-xs text-dim font-tech mt-1">YES Pool (USDO)</p>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                  <p className="text-2xl font-bold font-mono text-accent-crimson">
                    {market.noPool.toFixed(2)}
                  </p>
                  <p className="text-xs text-dim font-tech mt-1">NO Pool (USDO)</p>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                  <p className="text-2xl font-bold font-mono">{bets.length}</p>
                  <p className="text-xs text-dim font-tech mt-1">Total Bets</p>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                  <p className="text-2xl font-bold font-mono">{effectiveOdds}x</p>
                  <p className="text-xs text-dim font-tech mt-1">Est. Odds</p>
                </div>
              </div>

              {/* YES pool bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-dim font-tech mb-1">
                  <span>Pool Distribution</span>
                  <span>{yesPct}% YES</span>
                </div>
                <div className="progress-game h-3">
                  <div className="progress-game-fill" style={{ width: `${yesPct}%` }} />
                </div>
              </div>

              {!market.finalized && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowBetModal(true)}
                    disabled={!account}
                    className="btn-game btn-gold w-full"
                  >
                    {account ? "Place Bet on This Market" : "Connect Wallet to Bet"}
                  </button>
                </div>
              )}
            </div>

            {/* Place Bet Modal */}
            {showBetModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                   style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
                <div className="card-game w-full max-w-md p-8 gradient-border-glow">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold font-display gradient-text-gaming">Place Bet</h2>
                    <button onClick={() => setShowBetModal(false)} className="text-dim hover:text-normal text-2xl">&times;</button>
                  </div>

                  <div className="space-y-5">
                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
                      <div className="text-sm text-dim font-tech mb-1">Market</div>
                      <div className="font-semibold">Match #{market.matchId}</div>
                      <div className="text-xs text-dim font-mono mt-1">Odds: {effectiveOdds}x</div>
                    </div>

                    <div>
                      <label className="text-sm text-dim font-tech mb-2 block">Your Wallet Address (Subject)</label>
                      <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                        placeholder="0x..." className="input-game w-full" />
                    </div>

                    <div>
                      <label className="text-sm text-dim font-tech mb-2 block">Game</label>
                      <select value={game} onChange={e => setGame(e.target.value)} className="input-game w-full">
                        {SUPPORTED_GAMES.map(g => (
                          <option key={g.name} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-dim font-tech mb-2 block">Operator</label>
                      <select value={operator} onChange={e => setOperator(e.target.value as "GTE" | "LTE" | "EQ")} className="input-game w-full">
                        <option value="GTE">≥ Greater or Equal</option>
                        <option value="LTE">≤ Less or Equal</option>
                        <option value="EQ">= Exactly</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-dim font-tech mb-2 block">Stat</label>
                      <select value={stat} onChange={e => setStat(e.target.value as typeof stat)} className="input-game w-full">
                        <option value="DAMAGE">Damage Dealt</option>
                        <option value="KILLS">Kills</option>
                        <option value="PLACEMENT">Placement</option>
                        <option value="GOLD">Gold Earned</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-dim font-tech mb-2 block">Target Value</label>
                      <input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))}
                        className="input-game w-full" min={1} />
                    </div>

                    <div>
                      <label className="text-sm text-dim font-tech mb-2 block">Bet</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBetSide("YES")}
                          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${betSide === "YES" ? "bg-green-600 text-white" : "bg-[#181c25] text-dim border border-dim"}`}
                        >
                          YES
                        </button>
                        <button
                          type="button"
                          onClick={() => setBetSide("NO")}
                          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${betSide === "NO" ? "bg-red-600 text-white" : "bg-[#181c25] text-dim border border-dim"}`}
                        >
                          NO
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-dim font-tech mb-2 block">Stake (SUI)</label>
                      <input type="number" value={stake} onChange={e => setStake(Number(e.target.value))}
                        className="input-game w-full" min={1} step={0.1} />
                    </div>

                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-dim font-tech">Potential Win</span>
                        <span className="text-xl font-bold font-mono text-[#00FF88]">
                          {(stake * effectiveOdds).toFixed(2)} USDO
                        </span>
                      </div>
                    </div>

                    {placeError && (
                      <div className="p-3 rounded-lg text-sm"
                           style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: '#FF3366' }}>
                        {placeError}
                      </div>
                    )}

                    <button
                      onClick={handlePlaceBet}
                      disabled={placingBet || !account || !subject}
                      className="btn-game btn-gold w-full"
                    >
                      {placingBet ? "Placing Bet..." : `Place Bet — ${stake} USDO`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bets on this market */}
            <div className="card-game p-6 animate-fade-in-up delay-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-display">Bets on This Market</h2>
                {betsLoading && <div className="w-4 h-4 border border-dim border-t-accent-lavender rounded-full animate-spin" />}
              </div>

              {betsError && (
                <div className="p-3 rounded-lg mb-4 text-sm"
                     style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: '#FF3366' }}>
                  {betsError}
                </div>
              )}

              {bets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dim/20">
                        <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Bettor</th>
                        <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Prediction</th>
                        <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Stake</th>
                        <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Odds</th>
                        <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Status</th>
                        <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">TX</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bets.map((bet) => (
                        <tr key={bet.objectId} className="border-b border-dim/10">
                          <td className="py-4 px-3">
                            <p className="font-mono text-sm">{bet.bettor.slice(0, 8)}...{bet.bettor.slice(-4)}</p>
                            <p className="text-[10px] text-dim font-tech">{bet.game}</p>
                          </td>
                          <td className="py-4 px-3">
                            <p className="font-mono text-sm">
                              {STAT_NAMES[bet.claim.stat] || 'Unknown'} ≥ {bet.claim.threshold.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-dim font-tech">
                              Subject: {bet.subject.slice(0, 8)}...{bet.subject.slice(-4)}
                            </p>
                          </td>
                          <td className="py-4 px-3 font-mono text-sm">{bet.stakeUsdo.toFixed(2)} USDO</td>
                          <td className="py-4 px-3 font-mono text-sm" style={{ color: '#7077A1' }}>{bet.odds.toFixed(2)}x</td>
                          <td className="py-4 px-3">
                            <span className={`badge-game text-[10px] ${bet.settled ? "badge-green" : "badge-yellow"}`}>
                              {bet.settled ? "Settled" : "Active"}
                            </span>
                          </td>
                          <td className="py-4 px-3">
                            <a
                              href={`https://explorer.onelabs.cc/object/${bet.objectId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-accent-lavender hover:underline"
                            >
                              {bet.objectId.slice(0, 6)}...
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 text-accent-lavender flex justify-center">
                    {getIcon("target" as keyof typeof Icons, { size: 48 })}
                  </div>
                  <p className="text-dim font-tech">No bets placed on this market yet.</p>
                  <p className="text-dim font-tech text-sm">Be the first to place a bet!</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
