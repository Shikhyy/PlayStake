import { useState } from "react";
import { useCurrentAccount } from "@onelabs/dapp-kit";
import {
  usePlaceBet,
  useCreateMarket,
  useAllMarkets,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="card-game gradient-border-glow w-full max-w-md p-6" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Place Bet</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded bg-[#181c25]">
            <div className="text-sm text-gray-400">Match #{matchId}</div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Subject Address</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="0x..."
              className="w-full p-2 rounded bg-[#181c25] border border-[#252a38]"
            />
          </div>

          <div>
            <label className="text-sm text-dim font-tech block mb-1">Game</label>
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="input-game w-full"
            >
              {SUPPORTED_GAMES.map(g => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Stat</label>
            <select
              value={stat}
              onChange={(e) => setStat(e.target.value as any)}
              className="w-full p-2 rounded bg-[#181c25] border border-[#252a38]"
            >
              <option value="DAMAGE">Damage Dealt</option>
              <option value="KILLS">Kills</option>
              <option value="PLACEMENT">Placement</option>
              <option value="GOLD">Gold Earned</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Operator</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as "GTE" | "LTE" | "EQ")}
              className="w-full p-2 rounded bg-[#181c25] border border-[#252a38]"
            >
              <option value="GTE">≥ Greater or Equal</option>
              <option value="LTE">≤ Less or Equal</option>
              <option value="EQ">= Exactly</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Target Value</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full p-2 rounded bg-[#181c25] border border-[#252a38]"
              min={1}
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Bet</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBetSide("YES")}
                className={`flex-1 py-2 rounded font-bold ${betSide === "YES" ? "bg-green-600 text-white" : "bg-[#181c25] text-gray-400 border border-[#252a38]"}`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setBetSide("NO")}
                className={`flex-1 py-2 rounded font-bold ${betSide === "NO" ? "bg-red-600 text-white" : "bg-[#181c25] text-gray-400 border border-[#252a38]"}`}
              >
                NO
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Stake (USDO)</label>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              className="w-full p-2 rounded bg-[#181c25] border border-[#252a38]"
              min={1}
            />
          </div>

          {error && (
            <div className="p-3 rounded bg-red-900/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {txHash && (
            <div className="p-3 rounded bg-green-900/30 text-green-400 text-sm">
              Bet placed! TX: {txHash.slice(0, 20)}...
            </div>
          )}

          <button
            onClick={handlePlaceBet}
            disabled={isLoading || !account}
            className="w-full py-3 rounded font-bold bg-[#F6B17A] text-black hover:bg-[#e59f6a] disabled:opacity-50"
          >
            {isLoading ? "Confirming..." : `Place Bet — ${stake} USDO`}
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
  const totalPool = market.yesPool + market.noPool;
  const yesPct = totalPool > 0 ? Math.round((market.yesPool / totalPool) * 100) : 50;
  const now = Date.now();
  const timeLeft = market.deadlineMs > now
    ? `${Math.max(0, Math.floor((market.deadlineMs - now) / 60000))}m`
    : "Closed";

  return (
    <div className="p-4 rounded-lg border border-[#252a38] bg-[#11131a]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">Match #{market.matchId}</h3>
          <p className="text-xs text-gray-500 font-mono">{market.objectId.slice(0, 8)}...</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${market.finalized ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"}`}>
          {market.finalized ? "Settled" : timeLeft}
        </span>
      </div>

      <div className="mb-3 p-3 rounded bg-[#181c25]">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total Pool</span>
          <span className="font-mono font-bold">{totalPool.toFixed(2)} USDO</span>
        </div>
      </div>

      <div className="flex justify-between text-sm text-gray-400 mb-3">
        <span>YES: {market.yesPool.toFixed(0)}</span>
        <span>Bets: {market.betCount}</span>
        <span>YES: {yesPct}%</span>
      </div>

      {!market.finalized && (
        <button onClick={onPlaceBet} className="w-full py-2 rounded bg-[#2D3250] hover:bg-[#424769]">
          Place Bet
        </button>
      )}
    </div>
  );
}

export default function Markets() {
  const [activeBetModal, setActiveBetModal] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const account = useCurrentAccount();
  console.log(">>> Markets render, account:", account?.address);
  
  const { markets, isLoading: marketsLoading, error: marketsError } = useAllMarkets();
  const { createMarket, isLoading: isCreating, txHash: createTxHash, error: createError } = useCreateMarket();
  
  const [newMatchId, setNewMatchId] = useState(1);
  const [newDeadline, setNewDeadline] = useState(3600000);

  const handleCreateMarket = () => {
    console.log(">>> handleCreateMarket called, account:", account?.address);
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }
    createMarket(newMatchId, Date.now() + newDeadline);
  };

  const filteredMarkets = markets;

  const selectedMarket = activeBetModal
    ? markets.find(m => m.objectId === activeBetModal)
    : null;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Markets</h1>
            <p className="text-gray-400">Browse and bet on in-game performance</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 rounded bg-[#F6B17A] text-black font-bold hover:bg-[#e59f6a]"
          >
            {showCreateForm ? "Cancel" : "+ Create Market"}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="p-6 mb-6 rounded-lg border border-[#252a38] bg-[#11131a]">
            <h3 className="text-lg font-semibold mb-4">Create New Market</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Match ID</label>
                <input
                  type="number"
                  value={newMatchId}
                  onChange={(e) => setNewMatchId(Number(e.target.value))}
                  className="w-full p-2 rounded bg-[#181c25] border border-[#252a38]"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Duration (ms)</label>
                <input
                  type="number"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(Number(e.target.value))}
                  className="w-full p-2 rounded bg-[#181c25] border border-[#252a38]"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCreateMarket}
                  disabled={isCreating}
                  className="w-full py-2 rounded bg-[#F6B17A] text-black font-bold hover:bg-[#e59f6a] disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Market"}
                </button>
              </div>
            </div>
            {createError && (
              <div className="p-3 rounded bg-red-900/30 text-red-400 text-sm">
                Error: {createError}
              </div>
            )}
            {createTxHash && (
              <div className="p-3 rounded bg-green-900/30 text-green-400 text-sm">
                ✓ Market created! TX: {createTxHash.slice(0, 30)}...
              </div>
            )}
            {!account && (
              <p className="text-yellow-400 text-sm mt-2">Connect wallet to create markets</p>
            )}
          </div>
        )}

        {/* Error banner */}
        {marketsError && (
          <div className="p-4 mb-4 rounded bg-red-900/30 text-red-400">
            Error loading markets: {marketsError}
          </div>
        )}

        {/* Loading */}
        {marketsLoading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gray-600 border-t-[#F6B17A] rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Loading markets...</p>
          </div>
        )}

        {/* Markets Grid */}
        {!marketsLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.objectId}
                market={market}
                onPlaceBet={() => setActiveBetModal(market.objectId)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!marketsLoading && filteredMarkets.length === 0 && (
          <div className="text-center py-20">
            <Icons.game size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold mb-2">No markets yet</h3>
            <p className="text-gray-400">Create a market to get started!</p>
          </div>
        )}
      </div>

      {/* Bet Modal */}
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
