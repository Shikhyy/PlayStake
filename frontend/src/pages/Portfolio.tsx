import { useState, useMemo } from "react";
import { ConnectButton, useCurrentAccount } from "@onelabs/dapp-kit";
import {
  usePlayerProfile,
  useCreateProfile,
  useMyBets,
  useMySettlements,
  useAllSettlements,
  BADGE_DEFINITIONS,
} from "../hooks/useMarket";
import { Icons, getIcon } from "../components/Icons";

function RankBadge({ rank }: { rank: number }) {
  const colors = ["#CD7F32", "#C0C0C0", "#FFD700", "#F6B17A", "#7077A1", "#FF6B6B"];
  const iconNames = ["medal", "medal", "award", "gem", "hexagon", "trophy"];
  const names = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion"];
  const idx = Math.min(rank, colors.length - 1);
  return (
    <div className="flex items-center gap-2">
      <span className="text-accent-lavender">{getIcon(iconNames[idx] as keyof typeof Icons, { size: 24 })}</span>
      <span className="font-bold font-display" style={{ color: colors[idx] }}>{names[idx]}</span>
    </div>
  );
}

function BadgeCard({ name, desc, earned }: { name: string; desc: string; earned: boolean }) {
  return (
    <div className={`p-3 rounded-xl text-center transition-all ${earned ? "opacity-100" : "opacity-30 grayscale"}`}
      style={{ background: earned ? 'rgba(87,106,143,0.15)' : 'var(--bg-raised)', border: earned ? '1px solid rgba(183,189,247,0.3)' : '1px solid var(--border-dim)' }}>
      <div className="text-2xl mb-1 text-accent-lavender">{earned ? getIcon("award" as keyof typeof Icons, { size: 20 }) : getIcon("lock" as keyof typeof Icons, { size: 20 })}</div>
      <div className="text-xs font-bold font-display">{name}</div>
      <div className="text-[10px] text-dim font-tech mt-0.5">{desc}</div>
    </div>
  );
}

function LevelBar({ level, xp, xpToNext }: { level: number; xp: number; xpToNext: number }) {
  const progress = xpToNext > 0 ? Math.min((xp / xpToNext) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5 font-tech">
        <span className="text-dim">Level {level}</span>
        <span className="text-accent-lavender">{xp.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
      </div>
      <div className="bar-container">
        <div className="bar-xp bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}


export default function Portfolio() {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const account = useCurrentAccount();
  const walletAddress = account?.address ?? null;

  const { profile, isLoading: profileLoading } = usePlayerProfile(walletAddress);
  const { createProfile, isLoading: creating, txHash: createTx, error: createError } = useCreateProfile();
  const { bets, isLoading: _betsLoading, error: betsError } = useMyBets(walletAddress);
  const { records: settlements } = useMySettlements(walletAddress);
  const { settlements: allSettlements } = useAllSettlements();

  const [newUsername, setNewUsername] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeBets = bets.filter(b => !b.settled);
  const settledBets = bets.filter(b => b.settled);

  const mySettlements = allSettlements.filter(s =>
    walletAddress && s.bettor.toLowerCase() === walletAddress.toLowerCase()
  );

  const cumulativePnl = useMemo(() => {
    if (mySettlements.length === 0) return 0;
    return mySettlements.reduce((sum, s) => sum + (s.won ? s.payout - s.stake : -s.stake), 0);
  }, [mySettlements]);

  const pnlData = useMemo(() => {
    if (mySettlements.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const months = Array(12).fill(0);
    const sorted = [...mySettlements].reverse();
    let running = 0;
    sorted.forEach(s => {
      const pnl = s.won ? s.payout - s.stake : -s.stake;
      running += pnl;
      const actualMonth = new Date().getMonth();
      months[actualMonth] = running;
    });
    const maxAbs = Math.max(...months.map(Math.abs), 1);
    return months.map(v => Math.max(Math.round((v / maxAbs) * 100), v > 0 ? 1 : 0));
  }, [mySettlements]);

  const wins = mySettlements.filter(s => s.won).length;
  const totalBetsCount = mySettlements.length;
  const winRate = totalBetsCount > 0 ? Math.round((wins / totalBetsCount) * 100) : 0;
  const totalPnl = cumulativePnl;

  const unlockedBadgeIds = profile ? new Set(
    Object.keys((profile as unknown as { unlocked_badges?: Record<string, boolean> }).unlocked_badges || {})
  ) : new Set<string>();

  const earnedBadges = BADGE_DEFINITIONS.map(b => ({
    ...b,
    earned: b.id === "novice" || unlockedBadgeIds.has(b.id) || (profile?.badgeCount ?? 0) > 0,
  }));

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="hero-title-game mb-3">
            <span className="gradient-text-gaming">Player Profile</span>
          </h1>
          <p className="text-dim font-tech text-sm">Your on-chain gaming identity and performance stats</p>
        </div>

        {/* Not connected */}
        {!walletAddress && (
          <div className="card-game p-16 text-center gradient-border-glow mb-8">
            <div className="text-5xl mb-4 text-accent-lavender flex justify-center">
              {getIcon("game" as keyof typeof Icons, { size: 48 })}
            </div>
            <h2 className="text-2xl font-bold font-display mb-3">Connect Your Wallet</h2>
            <p className="text-dim mb-8 font-tech max-w-md mx-auto">
              Connect your wallet to view your on-chain player profile, XP, rank, and achievements.
            </p>
            <ConnectButton className="btn-game btn-primary-game btn-lg" />
          </div>
        )}

        {/* Profile not created */}
        {walletAddress && !profile && !profileLoading && (
          <div className="card-game p-16 text-center gradient-border-glow mb-8">
            <div className="text-5xl mb-4 text-accent-gold flex justify-center">
              {getIcon("zap" as keyof typeof Icons, { size: 48 })}
            </div>
            <h2 className="text-2xl font-bold font-display mb-3">Create Your Player Profile</h2>
            <p className="text-dim mb-6 font-tech max-w-md mx-auto">
              Your player profile is an NFT stored on OneChain. It tracks your XP, rank, badges, and game stats.
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn-game btn-gold btn-lg">
              Create Profile
            </button>
          </div>
        )}

        {/* Create Profile Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
            <div className="card-game w-full max-w-md p-8 gradient-border-glow">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-display gradient-text-gaming">Create Profile</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-dim hover:text-normal text-2xl">&times;</button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-sm text-dim font-tech mb-2 block">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter your gamer tag"
                    maxLength={20}
                    className="input-game w-full"
                  />
                </div>
                {createError && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: '#FF3366' }}>
                    {createError}
                  </div>
                )}
                {createTx && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: '#00FF88' }}>
                    Profile created! TX: {createTx.slice(0, 20)}...
                  </div>
                )}
                <button
                  onClick={() => createProfile(newUsername || "Player")}
                  disabled={creating}
                  className="btn-game btn-gold w-full"
                >
                  {creating ? "Creating..." : "Create on Chain"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Profile */}
        {profile && (
          <>
            {/* Profile Card */}
            <div className="card-game p-6 mb-6 gradient-border-glow animate-fade-in-up">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Avatar & Identity */}
                <div className="flex items-start gap-5">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl border-2 border-accent-lavender"
                         style={{ background: 'linear-gradient(135deg, rgba(87,106,143,0.3), rgba(183,189,247,0.15))' }}>
                      <Icons.game size={40} className="text-accent-lavender" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-lg text-xs font-bold font-display"
                         style={{ background: '#2D3250', color: '#fff' }}>
                      LV.{profile.level}
                    </div>
                    <div className="absolute -top-2 -left-2">
                      <RankBadge rank={profile.rank} />
                    </div>
                  </div>
                  <div className="pt-6">
                    <h2 className="text-xl font-bold font-display text-normal mb-1">{profile.username || "Anonymous"}</h2>
                    <p className="text-sm font-mono text-dim mb-2">{walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)}` : ""}</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.winStreak > 0 && (
                        <span className="badge-game badge-gold text-[10px] flex items-center gap-1">
                          <Icons.flame size={12} /> {profile.winStreak}W Streak
                        </span>
                      )}
                      {profile.bestStreak >= 5 && (
                        <span className="badge-game badge-purple text-[10px] flex items-center gap-1">
                          <Icons.zap size={12} /> Best: {profile.bestStreak}W
                        </span>
                      )}
                      <span className="badge-game badge-blue text-[10px] flex items-center gap-1">
                        <Icons.game size={12} /> {profile.gamesPlayedCount} games
                      </span>
                      <span className="badge-game badge-green text-[10px] flex items-center gap-1">
                        <Icons.award size={12} /> {profile.badgeCount} badges
                      </span>
                    </div>
                  </div>
                </div>

                {/* XP Bar */}
                <div className="flex-1 pt-4">
                  <LevelBar level={profile.level} xp={profile.xp} xpToNext={profile.xpToNext} />
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-lg font-bold font-display" style={{ color: '#7077A1' }}>{profile.totalBets}</div>
                      <div className="text-[10px] text-dim font-tech">Total Bets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold font-display text-accent-lavender">{profile.winRate}%</div>
                      <div className="text-[10px] text-dim font-tech">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold font-display" style={{ color: totalPnl >= 0 ? '#00FF88' : '#FF3366' }}>
                        {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-dim font-tech">Net P&L</div>
                    </div>
                  </div>
                </div>

                {/* Connect */}
                <ConnectButton className="btn-game btn-primary-game hidden lg:flex self-start mt-2" />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Staked", value: profile.totalStaked.toFixed(2), color: '#FFF8DE', icon: "coins" },
                { label: "Total Won", value: profile.totalWon.toFixed(2), color: '#00FF88', icon: "trophy" },
                { label: "Wins", value: profile.wins.toString(), color: '#00FF88', icon: "check" },
                { label: "Losses", value: profile.losses.toString(), color: '#FF3366', icon: "cross" },
              ].map((stat, i) => (
                <div key={i} className="card-game p-5 text-center animate-fade-in-up" style={{ animationDelay: `${i * 75}ms` }}>
                  <div className="text-2xl mb-1.5 text-accent-lavender flex justify-center">
                    {getIcon(stat.icon as keyof typeof Icons, { size: 24 })}
                  </div>
                  <div className="text-xl font-bold font-mono font-display" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs text-dim font-tech mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Win Rate & P&L */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="card-game p-6 animate-fade-in-up delay-200">
                <h3 className="text-sm font-semibold text-dim font-tech mb-5">Win Rate</h3>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <svg className="w-36 h-36 transform -rotate-90">
                      <circle cx="72" cy="72" r="60" stroke="var(--bg-raised)" strokeWidth="10" fill="none" />
                      <circle cx="72" cy="72" r="60"
                        stroke="url(#winGrad)" strokeWidth="10" fill="none"
                        strokeDasharray={`${(winRate / 100) * 377} 377`}
                        className="transition-all duration-1000" strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="winGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#2D3250" />
                          <stop offset="100%" stopColor="#7077A1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold font-mono font-display gradient-text-gaming">{winRate}%</span>
                      <span className="text-xs text-dim font-tech">Win Rate</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-10 mt-5">
                  <div className="text-center">
                    <p className="text-xl font-bold font-display" style={{ color: '#00FF88' }}>{profile.wins}</p>
                    <p className="text-xs text-dim font-tech">Wins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold font-display" style={{ color: '#FF3366' }}>{profile.losses}</p>
                    <p className="text-xs text-dim font-tech">Losses</p>
                  </div>
                </div>
              </div>

              <div className="card-game p-6 animate-fade-in-up delay-300">
                <h3 className="text-sm font-semibold text-dim font-tech mb-5">Monthly P&L</h3>
                <div className="h-36 flex items-end justify-between gap-1.5">
                  {pnlData.map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm transition-all hover:opacity-80"
                      style={{ height: `${h}%`, background: i >= 10 ? "linear-gradient(180deg, #2D3250 0%, #424769 100%)" : "linear-gradient(180deg, #3d4650 0%, #2d3640 100%)" }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-3 text-[10px] text-dim font-tech">
                  <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                  <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="card-game p-6 mb-6 animate-fade-in-up delay-400">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold font-display">Achievement Badges</h3>
                <span className="badge-game badge-purple text-xs">
                  {earnedBadges.filter(b => b.earned).length} / {earnedBadges.length} Unlocked
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {earnedBadges.map((badge) => (
                  <BadgeCard key={badge.id} {...badge} earned={badge.earned} />
                ))}
              </div>
            </div>

            {/* My Bets */}
            <div className="card-game p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-display">My Bets</h2>
                <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                  <button onClick={() => setActiveTab("active")}
                    className={`px-4 py-2 rounded-lg text-xs font-medium font-tech transition-all ${activeTab === "active" ? "text-white" : "text-dim hover:text-normal"}`}
                    style={activeTab === "active" ? { background: '#2D3250' } : {}}>
                    Active ({activeBets.length})
                  </button>
                  <button onClick={() => setActiveTab("history")}
                    className={`px-4 py-2 rounded-lg text-xs font-medium font-tech transition-all ${activeTab === "history" ? "text-white" : "text-dim hover:text-normal"}`}
                    style={activeTab === "history" ? { background: '#2D3250' } : {}}>
                    History
                  </button>
                </div>
              </div>

              {betsError && (
                <div className="p-3 rounded-lg text-sm mb-4" style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: '#FF3366' }}>
                  {betsError}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dim/20">
                      <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Player</th>
                      <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Prediction</th>
                      <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Stake</th>
                      <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Odds</th>
                      <th className="text-left py-3 px-3 text-xs text-dim font-tech font-medium">Status</th>
                      <th className="text-right py-3 px-3 text-xs text-dim font-tech font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === "active" ? activeBets : settledBets).map((bet) => (
                      <tr key={bet.objectId} className="border-b border-dim/10">
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-dim"
                                 style={{ background: 'linear-gradient(135deg, rgba(87,106,143,0.1), rgba(183,189,247,0.05))' }}>
                              <Icons.game size={20} className="text-accent-lavender" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{bet.subject.slice(0, 8)}...</p>
                              <p className="text-[10px] text-dim font-tech">Match #{bet.matchId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <p className="font-mono text-sm">{["Damage","Kills","Placement","Gold"][bet.claim.stat] || 'Unknown'} ≥ {bet.claim.threshold.toLocaleString()}</p>
                        </td>
                        <td className="py-4 px-3 font-mono text-sm">{bet.stakeUsdo.toFixed(2)} USDO</td>
                        <td className="py-4 px-3 font-mono text-sm" style={{ color: '#7077A1' }}>{bet.odds.toFixed(2)}x</td>
                        <td className="py-4 px-3">
                          <span className={`badge-game text-[10px] ${bet.settled ? "badge-green" : "badge-yellow"}`}>
                            {bet.settled ? (
                              <span className="flex items-center gap-1"><Icons.check size={12} /> Settled</span>
                            ) : (
                              <span className="flex items-center gap-1"><Icons.clock size={12} /> Active</span>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-right">
                          {!bet.settled && <button className="btn-game btn-ghost text-xs px-3 py-1.5">Cancel</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(activeTab === "active" ? activeBets : settledBets).length === 0 && (
                <div className="text-center py-14">
                  <div className="text-5xl mb-4 text-accent-lavender flex justify-center">
                    {getIcon("chart" as keyof typeof Icons, { size: 48 })}
                  </div>
                  <p className="text-dim font-tech">
                    {activeTab === "active" ? "No active bets" : "No bet history"}
                  </p>
                </div>
              )}
            </div>

            {/* Settlements */}
            {settlements.length > 0 && (
              <div className="card-game p-6 mb-6">
                <h2 className="text-lg font-bold font-display mb-4">Settlement Records</h2>
                <div className="space-y-3">
                  {settlements.map((s) => {
                    const pnl = s.won ? s.payout - s.stake : -s.stake;
                    return (
                      <div key={s.objectId} className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl ${s.won ? "text-[#00FF88]" : "text-[#FF3366]"}`}>
                            {s.won ? getIcon("check" as keyof typeof Icons, { size: 24 }) : getIcon("cross" as keyof typeof Icons, { size: 24 })}
                          </span>
                          <div>
                            <p className="font-mono text-sm" style={{ color: pnl >= 0 ? '#00FF88' : '#FF3366' }}>
                              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} USDO
                            </p>
                            <p className="text-[10px] text-dim font-tech">Stake: {s.stake.toFixed(2)} • Payout: {s.payout.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`badge-game text-[10px] ${s.won ? "badge-green" : "badge-red"}`}>
                            {s.won ? "Won" : "Lost"}
                          </span>
                          <a
                            href={`https://explorer.onelabs.cc/object/${s.objectId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-accent-lavender hover:underline font-mono"
                          >
                            {s.objectId.slice(0, 8)}...
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading state */}
        {walletAddress && profileLoading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-dim border-t-accent-lavender rounded-full animate-spin mb-4" />
            <p className="text-dim font-tech">Loading on-chain profile...</p>
          </div>
        )}
      </div>
    </div>
  );
}
