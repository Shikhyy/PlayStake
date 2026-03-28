import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const UPCOMING_GAMES = [
  { matchId: 1, game: "Arena of Valor", stat: "DAMAGE", operator: "GTE", threshold: 5000, deadline: Date.now() + 86400000 * 7 },
  { matchId: 2, game: "PUBG Mobile", stat: "KILLS", operator: "GTE", threshold: 10, deadline: Date.now() + 86400000 * 3 },
  { matchId: 3, game: "Valorant", stat: "DAMAGE", operator: "GTE", threshold: 8000, deadline: Date.now() + 86400000 * 5 },
  { matchId: 4, game: "League of Legends", stat: "DAMAGE", operator: "GTE", threshold: 15000, deadline: Date.now() + 86400000 * 6 },
  { matchId: 5, game: "Fortnite", stat: "KILLS", operator: "GTE", threshold: 12, deadline: Date.now() + 86400000 * 7 },
];

// Demo market IDs (in real app, these would be created on-chain)
const DEMO_MARKET_IDS = [
  "0xb868d69da43af997a3f4fddcb96f847d985141afaf2a94aa110adefe3e4f007b",
  "0x1111111111111111111111111111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333333333333333333333333333",
  "0x4444444444444444444444444444444444444444444444444444444444444444",
];

async function createMarkets() {
  console.log("🤖 Creating AI Agent Markets...\n");

  for (let i = 0; i < UPCOMING_GAMES.length; i++) {
    const game = UPCOMING_GAMES[i];
    const marketId = DEMO_MARKET_IDS[i];
    
    const { error } = await supabase.from("markets").insert({
      object_id: marketId,
      match_id: game.matchId,
      game: game.game,
      stat: game.stat,
      operator: game.operator,
      threshold: game.threshold,
      creator: "0xai00000000000000000000000000000000000000000000000000000000000000",
      deadline_ms: game.deadline,
    });

    if (error) {
      console.log(`⚠️  Market ${game.matchId} may already exist:`, error.message);
    } else {
      console.log(`✅ Created: ${game.game} #${game.matchId}`);
      console.log(`   Stat: ${game.stat} ${game.operator} ${game.threshold}`);
      console.log(`   Market ID: ${marketId}\n`);
    }
  }

  console.log("✅ All markets created!");

  // Verify
  const { data } = await supabase.from("markets").select("*");
  console.log(`\n📊 Total markets in database: ${data?.length || 0}`);
}

createMarkets().catch(console.error);
