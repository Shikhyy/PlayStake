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
  const names = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "CHAMPION"];
  const idx = Math.min(rank, names.length - 1);
  return (
    <div className="flex items-center gap-2 border border-dim bg-panel px-3 py-1">
      <span className="text-accent-primary uppercase font-display font-bold text-xs tracking-widest">{names[idx]}</span>
    </div>
  );
}


function LevelBar({ level, xp, xpToNext }: { level: number; xp: number; xpToNext: number }) {
  const progress = xpToNext > 0 ? Math.min((xp / xpToNext) * 100, 100) : 0;
  return (
    <div className="border border-dim bg-panel p-4">
      <div className="flex justify-between text-[10px] mb-3 font-mono uppercase tracking-widest">
        <span className="text-dim">Submersion Level {level}</span>
        <span className="text-accent-primary">{xp.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
      </div>
      <div className="h-2 bg-void border border-dim">
        <div className="bg-accent-primary h-full" style={{ width: `${progress}%` }} />
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
  const { bets, isLoading: _betsLoading } = useMyBets(walletAddress);
  const { records: _settlements } = useMySettlements(walletAddress);
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
    if (mySettlements.length === 0) return Array(12).fill(0);
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
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12 border-b border-dim pb-6">
        <h1 className="text-4xl lg:text-5xl font-display font-bold uppercase tracking-tighter text-bright mb-2">Subject Dossier</h1>
        <p className="font-mono text-dim text-sm uppercase">Quantifiable telemetry and on-chain performance records.</p>
      </div>

      {/* States */}
      {!walletAddress ? (
        <div className="flex flex-col items-center justify-center py-32 border border-dim border-dashed bg-panel text-center">
          <Icons.wallet size={48} className="text-dim mb-6" />
          <h2 className="text-2xl font-display font-bold uppercase mb-4 text-bright">Interface Offline</h2>
          <p className="font-mono text-dim text-sm mb-10 max-w-sm uppercase">Establish encrypted wallet bridge to synchronize profile data.</p>
          <ConnectButton className="!bg-[#CEFF00] !text-[#000000] !font-display !font-bold !uppercase !tracking-widest !px-8 !py-3 !rounded-none" />
        </div>
      ) : !profile && !profileLoading ? (
        <div className="flex flex-col items-center justify-center py-32 border border-dim border-dashed bg-panel text-center">
          <Icons.zap size={48} className="text-dim mb-6" />
          <h2 className="text-2xl font-display font-bold uppercase mb-4 text-bright">Profile Uninitialized</h2>
          <p className="font-mono text-dim text-sm mb-10 max-w-sm uppercase">Deploy custom player NFT to enable XP tracking and leaderboard integration.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-game btn-gold px-10">
            [ INITIALIZE PROFILE ]
          </button>
        </div>
      ) : profileLoading ? (
        <div className="flex flex-col items-center justify-center py-32 border border-dim border-dashed bg-panel">
          <div className="w-12 h-12 border-2 border-dim border-t-accent-primary animate-spin mb-4" />
          <p className="font-mono text-dim text-xs uppercase tracking-widest">Querying Chain State...</p>
        </div>
      ) : profile ? (
        <div className="space-y-8 animate-fade-in-up">
          {/* Identity Block */}
          <div className="grid lg:grid-cols-4 border border-dim bg-panel">
            <div className="lg:col-span-1 p-8 border-r border-dim flex flex-col items-center text-center bg-surface">
              <div className="w-32 h-32 bg-void border border-accent-primary flex items-center justify-center text-accent-primary mb-6 relative">
                 <Icons.game size={64} strokeWidth={1.5} />
                 <div className="absolute -bottom-2 -right-2 bg-accent-primary text-void px-2 py-1 font-display font-bold text-xs uppercase">LV.{profile.level}</div>
              </div>
              <h2 className="text-2xl font-display font-bold text-bright uppercase mb-2">{profile.username}</h2>
              <div className="font-mono text-[10px] text-dim mb-6">{walletAddress.slice(0, 16)}...</div>
              <RankBadge rank={profile.rank} />
            </div>

            <div className="lg:col-span-3 p-8 flex flex-col justify-center">
              <LevelBar level={profile.level} xp={profile.xp} xpToNext={profile.xpToNext} />
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-dim mt-8 bg-void">
                {[
                  { label: "NET_MARGIN", value: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(1)}`, color: totalPnl >= 0 ? "text-status-success" : "text-status-error" },
                  { label: "SUCCESS_RATE", value: `${winRate}%`, color: "text-accent-primary" },
                  { label: "COMMIT_COUNT", value: profile.totalBets.toString(), color: "text-bright" },
                  { label: "SURVIVAL_STREAK", value: profile.winStreak.toString(), color: "text-bright" },
                ].map((stat, i) => (
                  <div key={i} className="p-6 border-r border-dim last:border-r-0 hover:bg-surface transition-colors">
                    <div className="text-[10px] text-faint font-mono mb-2 uppercase">{stat.label}</div>
                    <div className={`text-2xl font-bold font-display ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-dim bg-panel p-8">
              <h3 className="text-xs font-mono text-dim uppercase tracking-widest mb-8 pb-3 border-b border-dim">Margin Trajectory</h3>
              <div className="h-40 flex items-end justify-between gap-2">
                {pnlData.map((h, i) => (
                  <div key={i} className="flex-1 bg-void border border-dim relative group">
                    <div className="absolute bottom-0 left-0 right-0 bg-accent-primary transition-all duration-700" style={{ height: `${h}%` }} />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] text-dim opacity-0 group-hover:opacity-100 transition-opacity uppercase">M{i+1}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border border-dim bg-panel p-8">
              <h3 className="text-xs font-mono text-dim uppercase tracking-widest mb-8 pb-3 border-b border-dim">Achievement Distribution</h3>
              <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
                {earnedBadges.slice(0, 12).map((badge) => (
                  <div key={badge.id} className={`w-full aspect-square border flex items-center justify-center transition-all ${badge.earned ? "border-accent-primary bg-accent-primary/5 text-accent-primary" : "border-dim text-dim grayscale opacity-30"}`}>
                    {getIcon("award" as keyof typeof Icons, { size: 24 })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ledger */}
          <div className="border border-dim bg-panel">
            <div className="flex border-b border-dim">
              <button 
                onClick={() => setActiveTab("active")}
                className={`flex-1 py-4 font-display font-bold uppercase tracking-widest border-r border-dim transition-colors ${activeTab === "active" ? "bg-accent-primary text-void" : "bg-void text-dim hover:bg-surface"}`}
              >
                Active Operations [{activeBets.length}]
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-4 font-display font-bold uppercase tracking-widest transition-colors ${activeTab === "history" ? "bg-accent-primary text-void" : "bg-void text-dim hover:bg-surface"}`}
              >
                Archived Log
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-dim bg-surface">
                    <th className="py-4 px-6 text-faint uppercase font-normal tracking-widest">Descriptor</th>
                    <th className="py-4 px-6 text-faint uppercase font-normal tracking-widest">Claim / Logic</th>
                    <th className="py-4 px-6 text-faint uppercase font-normal tracking-widest text-right">Margin</th>
                    <th className="py-4 px-6 text-faint uppercase font-normal tracking-widest text-right">Multiplier</th>
                    <th className="py-4 px-6 text-faint uppercase font-normal tracking-widest text-right">Finality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dim/30">
                  {(activeTab === "active" ? activeBets : settledBets).map((bet) => (
                    <tr key={bet.objectId} className="hover:bg-void transition-colors">
                      <td className="py-5 px-6">
                        <div className="font-bold text-bright mb-1 uppercase tracking-tight">Match #{bet.matchId}</div>
                        <div className="text-[10px] text-faint uppercase font-mono">{bet.subject.slice(0, 16)}...</div>
                      </td>
                      <td className="py-5 px-6">
                        <span className="bg-void border border-dim px-2 py-1 text-bright">
                          {["DMG","ELIMS","RANK","GOLD"][bet.claim.stat]} ≥ {bet.claim.threshold.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-right font-bold text-bright">{bet.stakeUsdo.toFixed(2)}</td>
                      <td className="py-5 px-6 text-right text-accent-primary font-bold">{bet.odds.toFixed(2)}x</td>
                      <td className="py-5 px-6 text-right">
                        <span className={`px-2 py-1 uppercase font-bold text-[9px] border ${bet.settled ? "border-status-success text-status-success" : "border-status-warning text-status-warning"}`}>
                          {bet.settled ? "Resolved" : "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(activeTab === "active" ? activeBets : settledBets).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-dim font-mono uppercase tracking-widest">No matching records found in local memory.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/90 backdrop-blur-sm">
          <div className="bg-panel border border-accent-primary w-full max-w-md p-0 shadow-[8px_8px_0_var(--accent-primary)]">
            <div className="flex items-center justify-between p-4 border-b border-dim bg-surface">
              <h2 className="text-xl font-display font-bold uppercase tracking-widest text-bright">Initialize Protocol</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-dim hover:text-bright font-mono text-xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-xs font-mono text-dim uppercase block mb-2">Subject Handle (ID)</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="GAMER_TAG_01"
                  className="w-full p-4 bg-void border border-dim text-bright font-mono text-sm focus:border-accent-primary focus:outline-none"
                />
              </div>
              {createError && <div className="p-3 bg-void border border-status-error text-status-error text-xs font-mono uppercase">ERR: {createError}</div>}
              {createTx && <div className="p-3 bg-void border border-status-success text-status-success text-xs font-mono uppercase">DEPLOYED_TX: {createTx.slice(0, 20)}...</div>}
              <button
                onClick={() => createProfile(newUsername || "Player")}
                disabled={creating}
                className="w-full py-4 font-display font-bold tracking-widest uppercase bg-accent-primary text-void hover:bg-[#B0DF00] transition-colors disabled:opacity-50"
              >
                {creating ? "Deploying NFT..." : "COMMIT TO CHAIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
