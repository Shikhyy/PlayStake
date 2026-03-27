import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAllMarkets, useAllSettlements, useAllMatchResults } from "../hooks/useMarket";
import { Target, Coins, Trophy, Gamepad2, TrendingUp, BarChart3 } from "lucide-react";
import { Icons } from "../components/Icons";

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { markets } = useAllMarkets();
  const { settlements } = useAllSettlements();
  const { results: matchResults } = useAllMatchResults();

  useEffect(() => {
    setLoaded(true);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 12,
        y: (e.clientY / window.innerHeight - 0.5) * 12,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
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
      <section className="relative pt-28 pb-40 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full opacity-30"
            style={{
              background: "radial-gradient(circle, rgba(183, 189, 247, 0.15) 0%, transparent 60%)",
              transform: `translate(-50%, -50%) translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)`,
              transition: "transform 0.1s ease-out",
            }}
          />
          <div 
            className="absolute top-1/2 left-1/3 w-[800px] h-[800px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(246, 177, 122, 0.15) 0%, transparent 60%)",
              transform: `translate(-50%, -50%) translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)`,
              transition: "transform 0.3s ease-out",
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-20 animate-float"
               style={{ background: "radial-gradient(circle, rgba(45, 50, 80, 0.4) 0%, transparent 70%)" }} />
          <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-25 animate-float"
               style={{ background: "radial-gradient(circle, rgba(255, 51, 102, 0.15) 0%, transparent 70%)", animationDelay: "-2s" }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className={`text-center transition-all duration-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg glass-panel-accent mb-10 animate-fade-in-up delay-150">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse-glow" style={{ background: '#F6B17A' }} />
              <span className="text-sm font-tech font-medium tracking-wider text-normal">Live on OneChain Testnet</span>
            </div>

            {/* Main title */}
            <h1 className="hero-title-game mb-8">
              <span className="text-white">Bet on Your</span>
              <br />
              <span className="gradient-text-gaming">Gaming Skills</span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle-game mx-auto mb-12 max-w-xl">
              Stake on in-game performance. OnePlay oracle verifies results on-chain.
              Zero house edge. Instant settlements.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link to="/markets" className="btn-game btn-primary-game btn-lg animate-fade-in-up delay-225">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Explore Markets
              </Link>
              <Link to="/about" className="btn-game btn-secondary-game btn-lg animate-fade-in-up delay-300">
                How It Works
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { label: "Active Markets", value: activeMarkets.length.toString(), up: true },
                { label: "Total Staked", value: totalStaked >= 1000000 ? `${(totalStaked / 1000000).toFixed(1)}M` : totalStaked >= 1000 ? `${(totalStaked / 1000).toFixed(1)}K` : totalStaked.toFixed(0), up: true },
                { label: "Players", value: uniqueBettors.toString(), up: true },
                { label: "Settlements", value: totalSettlements.toString(), up: true },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="stat-box animate-fade-in-up hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(183,189,247,0.1)] transition-all duration-300 group cursor-default"
                  style={{ animationDelay: `${375 + i * 75}ms` }}
                >
                  <div className="stat-value group-hover:text-lavender transition-colors" style={{ color: '#7077A1' }}>{stat.value}</div>
                  <div className="stat-label group-hover:text-white transition-colors delay-100">{stat.label}</div>
                  <div className="text-[10px] mt-2 text-[#00FF88] opacity-80 group-hover:opacity-100 tracking-widest uppercase">Live on-chain</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <svg className="w-6 h-6 text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Featured Markets */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="section-title-game gradient-text-gaming mb-3">Featured Markets</h2>
              <p className="text-dim text-sm font-tech">Popular predictions from top players</p>
            </div>
            <Link to="/markets" className="btn-game btn-ghost hidden sm:flex">
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {featuredMarkets.map((market, i) => {
              const totalPool = market.yesPool + market.noPool;
              const yesPct = totalPool > 0 ? Math.round((market.yesPool / totalPool) * 100) : 50;
              const effectiveOdds = totalPool > 0 ? (totalPool / Math.max(market.yesPool, 1)).toFixed(2) : "1.00";
              const now = Date.now();
              const timeLeft = market.deadlineMs > now
                ? `${Math.max(0, Math.floor((market.deadlineMs - now) / 60000))}m`
                : "Closed";
              
              return (
                <Link
                  key={market.objectId}
                  to={`/markets/${market.objectId}`}
                  className={`card-game group p-6 animate-fade-in-up hover:shadow-[0_20px_40px_rgba(45,50,80,0.5)] transition-all`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-dim text-xl"
                           style={{ background: 'linear-gradient(135deg, rgba(87,106,143,0.1), rgba(183,189,247,0.05))' }}>
                        <Gamepad2 className="w-6 h-6 text-accent-muted" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-normal group-hover:text-accent-lavender transition-colors">
                          Match #{market.matchId}
                        </h3>
                        <p className="text-xs text-dim font-tech font-mono">{market.objectId.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <span className={`badge-game text-[10px] ${market.finalized ? "badge-green" : "badge-red"}`}>
                      {market.finalized ? "Settled" : timeLeft}
                    </span>
                  </div>

                  <div className="mb-5 p-4 rounded-xl" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm text-dim">Total Pool</span>
                      <span className="text-xs text-dim font-mono">Odds (est.)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold font-mono font-display tracking-tight">
                        {totalPool.toFixed(2)}
                      </span>
                      <span className="text-2xl font-bold font-mono font-display" style={{ color: '#7077A1' }}>
                        {effectiveOdds}x
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-dim mb-1 font-tech">Pool Size</p>
                      <p className="font-mono text-sm font-medium">{totalPool >= 1000 ? `${(totalPool / 1000).toFixed(1)}K` : totalPool.toFixed(0)} USDO</p>
                    </div>
                    <div className="progress-game w-20">
                      <div className="progress-game-fill" style={{ width: `${yesPct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
            {featuredMarkets.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <div className="flex justify-center mb-4"><Gamepad2 className="w-16 h-16 text-dim" /></div>
                <p className="text-dim font-tech">No markets on-chain yet. Be the first to create one!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title-game gradient-text-gaming mb-4">How It Works</h2>
            <p className="text-dim font-tech">
              Three simple steps to start earning from your gaming skills
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[ 
              { 
                step: 1, 
                icon: Target, 
                title: "Choose a Prediction", 
                desc: "Select from various in-game performance metrics - damage dealt, kills, placement, gold earned.",
                color: "#2D3250"
              },
              { 
                step: 2, 
                icon: Coins, 
                title: "Stake Your Prediction", 
                desc: "Lock your stake on the outcome. Spectators can back you too. Odds adjust based on pool liquidity.",
                color: "#7077A1"
              },
              { 
                step: 3, 
                icon: Trophy, 
                title: "Win Automatically", 
                desc: "OnePlay oracle verifies results on-chain. Winners claim instantly. No delays, no disputes.",
                color: "#F6B17A"
              },
            ].map((item, i) => (
              <div 
                key={i}
                className="relative card-game p-8 text-center animate-fade-in-up"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-display"
                     style={{ background: item.color, color: item.color === '#F6B17A' ? '#000' : '#fff' }}>
                  {item.step}
                </div>

                {/* Icon */}
                <div className="mb-6 mt-3">
                  <item.icon className="w-12 h-12 mx-auto" style={{ color: item.color }} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-3 font-display">{item.title}</h3>
                <p className="text-sm text-dim leading-relaxed font-tech">{item.desc}</p>

                {/* Connector */}
                {i < 2 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 w-6 h-0.5" 
                       style={{ background: `linear-gradient(90deg, ${item.color}40, ${['#2D3250','#7077A1','#F6B17A'][i+1]}40)` }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Recent Activity */}
            <div>
              <h2 className="section-title-game mb-6 font-display">Recent Activity</h2>
              <div className="space-y-3">
                {recentSettlements.length > 0 ? recentSettlements.map((s, i) => (
                  <div
                    key={s.objectId}
                    className="card-game p-4 flex items-center justify-between animate-slide-in-left"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                           style={{ background: 'var(--bg-raised)' }}>
                        {s.won ? <TrendingUp className="w-5 h-5 text-[#00FF88]" /> : <TrendingUp className="w-5 h-5 text-[#FF3366] rotate-180" />}
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium text-accent-lavender">
                            {s.bettor.slice(0, 8)}...{s.bettor.slice(-4)}
                          </span>
                          <span className="text-dim"> {s.won ? "won" : "lost"}</span>
                        </p>
                        <p className="text-xs text-dim font-mono">Bet: {s.stake.toFixed(2)} USDO</p>
                      </div>
                    </div>
                    <span className={`font-mono text-sm font-medium ${s.won ? "text-[#00FF88]" : "text-[#FF3366]"}`}>
                      {s.won ? `+${s.payout.toFixed(2)}` : `-${s.stake.toFixed(2)}`}
                    </span>
                  </div>
                )                ) : (
                  <div className="text-center py-10">
                    <div className="flex justify-center mb-3"><BarChart3 className="w-10 h-10 text-dim" /></div>
                    <p className="text-dim font-tech text-sm">No settlements yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Matches */}
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <h2 className="section-title-game font-display">Live Matches</h2>
                <span className="badge-game badge-red">
                  <span className="w-1.5 h-1.5 bg-accent-crimson rounded-full animate-ping" />
                  LIVE
                </span>
              </div>
              
              <div className="space-y-3">
                {matchResults.slice(0, 3).map((result, i) => (
                  <Link
                    key={result.objectId}
                    to="/live"
                    className="card-game p-4 flex items-center justify-between animate-slide-in-right"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-dim"
                             style={{ background: 'linear-gradient(135deg, rgba(87,106,143,0.1), rgba(183,189,247,0.05))' }}>
                          <Gamepad2 className="w-6 h-6 text-accent-muted" />
                        </div>
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-crimson rounded-full animate-pulse-glow" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Match #{result.matchId}</h3>
                        <p className="text-sm text-dim font-tech">
                          {result.playerCount} players verified
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-accent-lavender">On-chain</p>
                      <p className="text-xs text-dim">Finalized</p>
                    </div>
                  </Link>
                ))}
                {matchResults.length === 0 && (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3 text-accent-lavender flex justify-center">
                      <Icons.trophy size={40} />
                    </div>
                    <p className="text-dim font-tech text-sm">No match results on-chain yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card-game p-14 gradient-border-glow relative overflow-hidden">
            {/* Background effect */}
            <div className="absolute inset-0 gradient-bg opacity-40" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-5 font-display">
                Ready to Put Your Skills to the Test?
              </h2>
              <p className="text-dim mb-8 max-w-lg mx-auto font-tech">
                Join thousands of gamers earning from their performance. No house edge,
                instant payouts, fully on-chain.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/markets" className="btn-game btn-gold btn-lg">
                  Start Betting
                </Link>
                <button className="btn-game btn-secondary-game">
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}