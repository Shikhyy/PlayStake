import { useState } from "react";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import {
  usePlaceBet,
  useCreateMarket,
  useAllMarkets,
  useLiveMarketOdds,
} from "../hooks/useMarket";
import { Icons } from "../components/Icons";
import { SUPPORTED_GAMES } from "../constants/games";

interface PlaceBetModalProps {
  marketId: string;
  matchId: string;
  onClose: () => void;
}

function PlaceBetModal({ marketId, matchId, onClose }: PlaceBetModalProps) {
  const { placeBet, isLoading, txHash, error } = usePlaceBet();
  const account = useCurrentAccount();
  const [stake, setStake] = useState(10);
  const [subject, setSubject] = useState(account?.address || "");
  const [game, setGame] = useState("Arena of Valor");
  const [stat, setStat] = useState<"DAMAGE" | "KILLS" | "PLACEMENT" | "GOLD">("DAMAGE");
  const [operator, setOperator] = useState<"GTE" | "LTE" | "EQ">("GTE");
  const [threshold, setThreshold] = useState(1000);
  const [betSide, setBetSide] = useState<"YES" | "NO">("YES");

  const handlePlaceBet = async () => {
    if (!account) {
      alert("Please connect wallet first!");
      return;
    }
    const subjectAddr = subject || account.address;
    await placeBet(marketId, {
      subject: subjectAddr,
      game,
      claim: {
        stat: stat === "DAMAGE" ? 0 : stat === "KILLS" ? 1 : stat === "PLACEMENT" ? 2 : 3,
        operator: operator === "GTE" ? 0 : operator === "LTE" ? 1 : 2,
        threshold,
      },
      stakeUsdo: stake,
      isYes: betSide === "YES",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/90 backdrop-blur-sm">
      <div className="bg-panel border border-accent-primary w-full max-w-md p-0 shadow-[8px_8px_0_var(--accent-primary)]" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <div className="flex items-center justify-between p-4 border-b border-dim bg-surface">
          <h2 className="text-xl font-display font-bold uppercase tracking-widest text-bright">Execute Trade</h2>
          <button onClick={onClose} className="text-dim hover:text-bright font-mono text-xl">✕</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center p-3 bg-void border border-dim font-mono text-sm">
            <span className="text-dim">TARGET OPERATION</span>
            <span className="text-accent-primary font-bold">MATCH #{matchId}</span>
          </div>

          <div>
            <label className="text-xs font-mono text-dim uppercase block mb-2">Subject Public Key</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 bg-void border border-dim text-bright font-mono text-sm focus:border-accent-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-dim uppercase block mb-2">Simulation Env</label>
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="w-full p-3 bg-void border border-dim text-bright font-mono text-sm focus:border-accent-primary focus:outline-none appearance-none"
            >
              {SUPPORTED_GAMES.map(g => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-dim uppercase block mb-2">Telemetry</label>
              <select
                value={stat}
                onChange={(e) => setStat(e.target.value as any)}
                className="w-full p-3 bg-void border border-dim text-bright font-mono text-sm focus:border-accent-primary focus:outline-none appearance-none"
              >
                <option value="DAMAGE">DMG_DEALT</option>
                <option value="KILLS">ELIMS</option>
                <option value="PLACEMENT">LOBBY_RANK</option>
                <option value="GOLD">ECONOMY</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-dim uppercase block mb-2">Logic</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as "GTE" | "LTE" | "EQ")}
                className="w-full p-3 bg-void border border-dim text-bright font-mono text-sm focus:border-accent-primary focus:outline-none appearance-none"
              >
                <option value="GTE">&gt;= GTE</option>
                <option value="LTE">&lt;= LTE</option>
                <option value="EQ">== EQ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-dim uppercase block mb-2">Threshold Value</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full p-3 bg-void border border-dim text-bright font-mono text-sm focus:border-accent-primary focus:outline-none"
              min={1}
            />
          </div>

          <div>
            <label className="text-xs font-mono text-dim uppercase block mb-2">Direction</label>
            <div className="flex gap-0 border border-dim bg-void p-1">
              <button
                type="button"
                onClick={() => setBetSide("YES")}
                className={`flex-1 py-2 font-display font-bold tracking-widest uppercase transition-colors ${betSide === "YES" ? "bg-status-success text-void" : "text-dim hover:bg-surface"}`}
              >
                Buy Yes
              </button>
              <button
                type="button"
                onClick={() => setBetSide("NO")}
                className={`flex-1 py-2 font-display font-bold tracking-widest uppercase transition-colors ${betSide === "NO" ? "bg-status-error text-void" : "text-dim hover:bg-surface"}`}
              >
                Buy No
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-dim uppercase block mb-2">Margin (USDO)</label>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              className="w-full p-3 lg:text-xl font-bold bg-void border border-dim text-accent-primary font-mono focus:border-accent-primary focus:outline-none"
              min={1}
            />
          </div>

          {error && (
            <div className="p-3 bg-void border border-status-error text-status-error text-xs font-mono uppercase">
              ERR: {error}
            </div>
          )}

          {txHash && (
            <div className="p-3 bg-void border border-status-success text-status-success text-xs font-mono uppercase">
              TX CONFIRMED: {txHash.slice(0, 20)}...
            </div>
          )}

          <button
            onClick={handlePlaceBet}
            disabled={isLoading || !account}
            className="w-full py-4 mt-2 font-display font-bold tracking-widest uppercase border border-accent-primary bg-accent-primary text-void hover:bg-[#B0DF00] hover:shadow-[4px_4px_0_#FFF] transition-all disabled:opacity-50 disabled:hover:shadow-none"
          >
            {isLoading ? "Broadcasting..." : `Commit ${stake} USDO`}
          </button>
        </div>
      </div>
    </div>
  );
}

function MarketCard({
  market, onPlaceBet
}: {
  market: {
    objectId: string;
    matchId: string;
    yesPool: number;
    noPool: number;
    betCount: number;
    deadlineMs: number;
    finalized: boolean;
  };
  onPlaceBet: () => void;
}) {
  const { yesOdds, noOdds, isLoading: oddsLoading } = useLiveMarketOdds(market.objectId);
  
  const totalPool = market.yesPool + market.noPool;
  const yesPct = totalPool > 0 ? Math.round((market.yesPool / totalPool) * 100) : 50;
  const now = Date.now();
  const timeLeft = market.deadlineMs > now
    ? `${Math.max(0, Math.floor((market.deadlineMs - now) / 60000))}M`
    : "CLOSED";

  return (
    <div className="border border-dim bg-panel group hover:border-accent-primary transition-colors flex flex-col justify-between h-full">
      <div className="flex justify-between items-center p-4 border-b border-dim bg-surface">
        <div className="font-mono text-[10px] text-dim uppercase">ID: {market.objectId.slice(0, 8)}...</div>
        <div className={`font-mono text-[10px] px-2 py-1 uppercase font-bold border ${market.finalized ? "bg-surface border-dim text-dim" : "bg-elevated border-accent-primary text-accent-primary group-hover:bg-accent-primary group-hover:text-void transition-colors"}`}>
          {market.finalized ? "Settled" : timeLeft}
        </div>
      </div>

      <div className="p-5 flex-grow">
        <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-bright mb-4">Match #{market.matchId}</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center font-mono">
            <span className="text-dim text-xs">Total Margin</span>
            <span className="text-bright text-lg font-bold">{totalPool.toFixed(2)} USDO</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px] uppercase">
              <span className="text-status-success">YES / {yesPct}%</span>
              <span className="text-status-error">NO / {100 - yesPct}%</span>
            </div>
            <div className="flex h-2 bg-void">
              <div className="bg-status-success h-full" style={{ width: `${yesPct}%` }} />
              <div className="bg-status-error h-full" style={{ width: `${100 - yesPct}%` }} />
            </div>
            <div className="text-right font-mono text-[10px] text-dim mt-1">VOL: {market.betCount} POSITIONS</div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-dim/30">
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-status-success">{(yesOdds / 100).toFixed(2)}x</div>
              <div className="font-mono text-[8px] text-dim uppercase">YES</div>
            </div>
            <div className="flex items-center gap-1">
              {oddsLoading && <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" />}
              <span className="font-mono text-[8px] text-dim">LIVE</span>
            </div>
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-status-error">{(noOdds / 100).toFixed(2)}x</div>
              <div className="font-mono text-[8px] text-dim uppercase">NO</div>
            </div>
          </div>
        </div>
      </div>

      {!market.finalized && (
        <button onClick={onPlaceBet} className="w-full py-3 font-display font-bold uppercase tracking-widest bg-surface text-bright border-t border-dim hover:bg-accent-primary hover:text-void hover:border-accent-primary transition-all">
          Initialize Position
        </button>
      )}
    </div>
  );
}

export default function Markets() {
  const [activeBetModal, setActiveBetModal] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const account = useCurrentAccount();
  const { markets, isLoading: marketsLoading, error: marketsError } = useAllMarkets();
  const { createMarket, isLoading: isCreating, txHash: createTxHash, error: createError } = useCreateMarket();
  
  const [newMatchId, setNewMatchId] = useState(1);
  const [newDeadline, setNewDeadline] = useState(3600000);

  const handleCreateMarket = () => {
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }
    createMarket(newMatchId, Date.now() + newDeadline);
  };

  const filteredMarkets = markets;
  const selectedMarket = activeBetModal ? markets.find(m => m.objectId === activeBetModal) : null;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 border-b border-dim pb-6 gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold uppercase tracking-tighter text-bright mb-2">Liquidity Desks</h1>
          <p className="font-mono text-dim text-sm uppercase max-w-xl">
            Orderbook for live prediction markets. Execute trades against verifiable smart contracts.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-5 py-2.5 font-display font-bold tracking-widest text-sm uppercase border transition-colors ${showCreateForm ? 'bg-surface border-dim text-bright' : 'bg-void border-bright text-bright hover:bg-bright hover:text-void'}`}
        >
          {showCreateForm ? "[ CLOSE TERMINAL ]" : "[ + INIT MARKET ]"}
        </button>
      </div>

      {/* Admin Create Form */}
      {showCreateForm && (
        <div className="p-6 mb-10 border border-accent-primary bg-panel shadow-[4px_4px_0_var(--accent-primary)] animate-fade-in-down">
          <div className="flex items-center gap-3 mb-6 pb-3 border-b border-dim">
            <span className="w-2 h-2 bg-accent-primary animate-pulse" />
            <h3 className="text-lg font-display font-bold uppercase tracking-widest text-bright">Deploy New Market</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="text-xs font-mono text-dim uppercase block mb-2">Target Match Node (ID)</label>
              <input
                type="number"
                value={newMatchId}
                onChange={(e) => setNewMatchId(Number(e.target.value))}
                className="w-full p-3 bg-void border border-dim text-bright font-mono text-sm focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-dim uppercase block mb-2">TTL Duration (MS)</label>
              <input
                type="number"
                value={newDeadline}
                onChange={(e) => setNewDeadline(Number(e.target.value))}
                className="w-full p-3 bg-void border border-dim text-bright font-mono text-sm focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreateMarket}
                disabled={isCreating}
                className="w-full py-3.5 font-display font-bold uppercase tracking-widest bg-accent-primary text-black hover:bg-white hover:text-black transition-all disabled:opacity-50"
              >
                {isCreating ? "Deploying..." : "Execute Deploy"}
              </button>
            </div>
          </div>
          
          {createError && (
            <div className="p-3 bg-void border border-status-error text-status-error text-xs font-mono uppercase">
              ERR: {createError}
            </div>
          )}
          {createTxHash && (
            <div className="p-3 bg-void border border-status-success text-status-success text-xs font-mono uppercase">
              SUCCESS / TX: {createTxHash.slice(0, 30)}...
            </div>
          )}
          {!account && (
            <p className="text-status-warning text-xs mt-2 font-mono uppercase border-l-2 border-status-warning pl-2">WARN: Wallet connection absent.</p>
          )}
        </div>
      )}

      {/* System Status / Error */}
      {marketsError && (
        <div className="p-4 mb-8 border border-status-error bg-void text-status-error font-mono text-sm uppercase">
          SYS_ERR: {marketsError}
        </div>
      )}

      {marketsLoading && (
        <div className="flex flex-col items-center justify-center py-32 border border-dim border-dashed bg-panel">
          <div className="w-12 h-12 border-2 border-dim border-t-accent-primary rounded-none animate-spin mb-4" />
          <p className="font-mono text-dim text-xs uppercase tracking-widest">Compiling Market Index...</p>
        </div>
      )}

      {!marketsLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.objectId}
              market={market}
              onPlaceBet={() => setActiveBetModal(market.objectId)}
            />
          ))}
        </div>
      )}

      {!marketsLoading && filteredMarkets.length === 0 && (
        <div className="text-center py-32 border border-dim border-dashed bg-panel">
          <Icons.game size={32} className="mx-auto mb-4 text-dim" />
          <p className="font-mono text-dim text-sm uppercase tracking-widest">No Active Markets Detected</p>
        </div>
      )}

      {/* Modals */}
      {selectedMarket && (
        <PlaceBetModal
          marketId={selectedMarket.objectId}
          matchId={selectedMarket.matchId}
          onClose={() => setActiveBetModal(null)}
        />
      )}
    </div>
  );
}
