import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAllMarkets, useAllSettlements, useAllMatchResults } from "../hooks/useMarket";
import { Target, Coins, Trophy, Gamepad2, TrendingUp, Activity } from "lucide-react";

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  const { markets } = useAllMarkets();
  const { settlements } = useAllSettlements();
  const { results: matchResults } = useAllMatchResults();

  useEffect(() => {
    setLoaded(true);
  }, []);

  const activeMarkets = markets.filter(m => !m.finalized);
  const totalStaked = markets.reduce((sum, m) => sum + m.yesPool + m.noPool, 0);
  const totalSettlements = settlements.length;
  const uniqueBettors = new Set(settlements.map(s => s.bettor)).size;

  const featuredMarkets = [...markets]
    .sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool))
    .slice(0, 3);

  const recentSettlements = settlements.slice(0, 6);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-32 border-b border-dim">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            
            {/* Status Strip */}
            <div className="flex items-center gap-3 mb-8">
              <span className="px-2 py-1 bg-accent-primary text-void font-bold font-mono text-xs uppercase">System Live</span>
              <span className="text-dim font-mono text-xs hidden sm:block">/ / CONNECT TO ORACLE STREAM</span>
            </div>

            <h1 className="hero-title-game text-bright mb-6 max-w-4xl uppercase">
              Monetize Your <span className="text-accent-primary">Game Stats</span> On-Chain
            </h1>

            <p className="hero-subtitle-game mb-12 max-w-2xl text-normal font-mono">
              The brutal prediction layer for GameFi. Stake capital on live performance. 
              Zero intermediary intervention. Instant brutal settlement via OnePlay oracle.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 mb-24">
              <Link to="/markets" className="btn-game btn-gold">
                Enter Markets <span className="ml-2">→</span>
              </Link>
              <Link to="/about" className="btn-game btn-secondary-game">
                Read Documentation
              </Link>
            </div>

            {/* Brutalist Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dim bg-panel">
              {[
                { label: "ACV_MARKETS", value: activeMarkets.length.toString() },
                { label: "TOT_LIQUIDITY (USDO)", value: totalStaked >= 1000000 ? `${(totalStaked / 1000000).toFixed(1)}M` : totalStaked >= 1000 ? `${(totalStaked / 1000).toFixed(1)}K` : totalStaked.toFixed(0) },
                { label: "UNQ_ACTORS", value: uniqueBettors.toString() },
                { label: "SETTLED_TX", value: totalSettlements.toString() },
              ].map((stat, i) => (
                <div key={i} className="p-6 border-r border-b border-dim last:border-r-0 md:[&:nth-child(4n)]:border-r-0 hover:bg-surface transition-colors cursor-default group">
                  <div className="text-xs text-dim font-mono mb-2">{stat.label}</div>
                  <div className="text-3xl font-bold font-display text-bright group-hover:text-accent-primary transition-colors">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Markets */}
      <section className="py-24 border-b border-dim bg-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-display font-bold uppercase tracking-tight text-bright mb-2">High Volume Desks</h2>
              <p className="font-mono text-dim text-sm">Aggregated liquidity across top active matches.</p>
            </div>
            <Link to="/markets" className="btn-game btn-ghost border border-dim">
              [ View Orderbook ]
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredMarkets.map((market) => {
              const totalPool = market.yesPool + market.noPool;
              const yesPct = totalPool > 0 ? Math.round((market.yesPool / totalPool) * 100) : 50;
              const now = Date.now();
              const timeLeft = market.deadlineMs > now
                ? `${Math.max(0, Math.floor((market.deadlineMs - now) / 60000))}M`
                : "CLOSED";
              
              return (
                <Link
                  key={market.objectId}
                  to={`/markets/${market.objectId}`}
                  className="card-game p-0 group"
                >
                  <div className="p-5 border-b border-dim flex justify-between items-center bg-surface">
                    <div className="font-mono text-dim text-xs">ID: {market.objectId.slice(0, 8)}...</div>
                    <div className={`font-mono text-[10px] px-2 py-1 uppercase ${market.finalized ? "bg-surface text-dim border border-dim" : "bg-accent-primary text-void font-bold"}`}>
                      {market.finalized ? "Settled" : timeLeft}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="font-display font-bold text-2xl mb-6">MATCH #{market.matchId}</h3>
                    
                    <div className="space-y-4 font-mono">
                      <div className="flex justify-between items-end border-b border-dim pb-2">
                        <span className="text-dim text-xs">Total Margin</span>
                        <span className="text-bright text-lg">{totalPool.toFixed(2)} USDO</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-dim text-xs">Yes Bias</span>
                        <span className="text-accent-primary text-sm font-bold">{yesPct}%</span>
                      </div>
                      <div className="w-full bg-void h-1 mt-1">
                        <div className="bg-accent-primary h-full" style={{ width: `${yesPct}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            {featuredMarkets.length === 0 && (
              <div className="col-span-3 text-center py-20 border border-dim border-dashed bg-surface">
                <Gamepad2 className="w-12 h-12 text-dim mx-auto mb-4" />
                <p className="font-mono text-dim text-sm uppercase">No active operations found.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Protocol Architecture */}
      <section className="py-24 border-b border-dim">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="text-3xl font-display font-bold uppercase tracking-tight text-bright mb-2">Protocol Execution</h2>
            <p className="font-mono text-dim text-sm">Deterministic payout via smart contract logic.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[ 
              { step: "01", icon: Target, title: "Initialize Position", desc: "Select match and formulate a valid claim (Damage, Kills, Gold, Placement)." },
              { step: "02", icon: Coins,  title: "Commit Liquidity",   desc: "Lock USDO margin into the escrow construct. Market odds calculate dynamically." },
              { step: "03", icon: Trophy, title: "Execute Settlement", desc: "Match finale triggers oracle telemetry. Disburse liquidity deterministically." },
            ].map((item, i) => (
              <div key={i} className="card-game p-8 bg-surface">
                <div className="font-mono text-accent-primary text-sm mb-6 pb-4 border-b border-dim">PHASE {item.step}</div>
                <item.icon className="w-8 h-8 text-bright mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-display font-bold uppercase mb-3 text-bright">{item.title}</h3>
                <p className="text-sm text-dim leading-relaxed font-mono">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Terminal View */}
      <section className="py-24 bg-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            
            {/* Ledger feed */}
            <div>
              <div className="flex justify-between items-end mb-6 pb-2 border-b border-dim">
                <h2 className="text-xl font-display font-bold uppercase text-bright">Settlement Ledger</h2>
                <Activity className="w-4 h-4 text-dim" />
              </div>
              <div className="space-y-[1px] bg-dim">
                {recentSettlements.length > 0 ? recentSettlements.map((s) => (
                  <div key={s.objectId} className="flex items-center justify-between p-4 bg-panel hover:bg-surface transition-colors">
                    <div className="flex items-center gap-4">
                      {s.won ? <TrendingUp className="w-4 h-4 text-status-success" /> : <TrendingUp className="w-4 h-4 text-status-error rotate-180" />}
                      <span className="font-mono text-sm text-dim">{s.bettor.slice(0, 6)}..{s.bettor.slice(-4)}</span>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <span className="font-mono text-xs text-dim hidden sm:inline">[{s.stake.toFixed(0)}]</span>
                      <span className={`font-mono text-sm font-bold w-16 text-right ${s.won ? "text-status-success" : "text-status-error"}`}>
                        {s.won ? `+${s.payout.toFixed(1)}` : `-${s.stake.toFixed(1)}`}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 bg-panel text-center font-mono text-sm text-dim uppercase">Waiting for telemetry...</div>
                )}
              </div>
            </div>

            {/* Live stream */}
            <div>
              <div className="flex justify-between items-end mb-6 pb-2 border-b border-dim">
                <h2 className="text-xl font-display font-bold uppercase text-bright">Oracle Telemetry</h2>
                <span className="w-2 h-2 bg-accent-primary animate-pulse" />
              </div>
              
              <div className="space-y-[1px] bg-dim">
                {matchResults.slice(0, 3).map((result) => (
                  <Link key={result.objectId} to="/live" className="flex items-center justify-between p-4 bg-panel hover:bg-surface transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-display font-bold group-hover:text-accent-primary transition-colors">MATCH #{result.matchId}</span>
                      <span className="font-mono text-[10px] text-faint">ID: {result.objectId.slice(0, 10)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs text-bright">V-PLAYERS: {result.playerCount}</div>
                      <div className="font-mono text-[10px] text-dim">{new Date(result.finalizedAt).toLocaleTimeString()}</div>
                    </div>
                  </Link>
                ))}
                {matchResults.length === 0 && (
                  <div className="p-8 bg-panel text-center font-mono text-sm text-dim uppercase">No data received.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}