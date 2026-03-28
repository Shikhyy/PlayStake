import { createClient } from "@supabase/supabase-js";
import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const RPC_URL = process.env.RPC_URL || "https://rpc-testnet.onelabs.cc:443";
const PACKAGE_ID = process.env.PACKAGE_ID || "0xa8111bccb58757c9ef3d880e0667b53576648e6f5b3f9286a817e39cb34e3cc9";

if (!GROQ_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Error: Missing environment variables (GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const client = new SuiClient({ url: RPC_URL });

const GAMES_DATA = [
  { id: "aov", name: "Arena of Valor", stats: ["DAMAGE", "KILLS", "GOLD"] },
  { id: "pubg", name: "PUBG Mobile", stats: ["DAMAGE", "KILLS", "PLACEMENT"] },
  { id: "valorant", name: "Valorant", stats: ["DAMAGE", "KILLS", "PLACEMENT"] },
  { id: "lol", name: "League of Legends", stats: ["DAMAGE", "KILLS", "GOLD"] },
  { id: "fortnite", name: "Fortnite", stats: ["DAMAGE", "KILLS", "PLACEMENT"] },
  { id: "cod", name: "Call of Duty", stats: ["DAMAGE", "KILLS"] },
  { id: "apex", name: "Apex Legends", stats: ["DAMAGE", "KILLS", "PLACEMENT"] },
  { id: "mlbb", name: "Mobile Legends", stats: ["DAMAGE", "KILLS", "GOLD"] },
];

interface MarketSuggestion {
  matchId: number;
  game: string;
  player: string;
  stat: string;
  operator: string;
  threshold: number;
  confidence: number;
  reasoning: string;
}

async function callGroq(prompt: string): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a sports betting AI agent for esports prediction markets. Your job is to analyze upcoming esports matches and suggest prediction markets.

For each match, suggest:
- Player name or team
- Stat to predict (DAMAGE, KILLS, PLACEMENT, GOLD)
- Threshold value
- Confidence level (0-100%)

Rules:
1. Only suggest realistic thresholds based on the game
2. For DAMAGE: MOBA = 5000-20000, FPS = 2000-10000
3. For KILLS: MOBA = 2-15, FPS = 5-25
4. For PLACEMENT: 1-20 (lower is better)
5. Always use GTE (greater than or equal) unless PLACEMENT

Respond in JSON format:
[{"match_id": 1, "game": "Arena of Valor", "player": "Faker", "stat": "DAMAGE", "operator": "GTE", "threshold": 8000, "confidence": 85, "reasoning": "Top player averages 10000+ damage"}]`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "[]";
}

async function analyzeAndCreateMarkets(): Promise<MarketSuggestion[]> {
  console.log("\n🧠 Asking Groq AI to analyze upcoming matches...\n");

  const prompt = `Analyze these games and suggest 5 prediction markets:
${GAMES_DATA.map(g => `- ${g.name} (${g.stats.join(", ")})`).join("\n")}

Create varied predictions across different games. Current time: ${new Date().toISOString()}`;

  try {
    const response = await callGroq(prompt);
    console.log("📝 AI Response:", response.substring(0, 200) + "...");
    
    const suggestions = JSON.parse(response) as MarketSuggestion[];
    console.log(`\n🤖 AI suggested ${suggestions.length} markets\n`);
    
    return suggestions;
  } catch (e) {
    console.error("❌ Groq error:", e);
    return [];
  }
}

async function createOnChainMarket(matchId: number, deadlineMs: number): Promise<string | null> {
  const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
  if (!ORACLE_PRIVATE_KEY) {
    console.log("   (No oracle key - creating demo market ID)");
    return `0x${Math.random().toString(16).slice(2, 66)}`;
  }

  try {
    const oracle = Ed25519Keypair.fromSecretKey(Buffer.from(ORACLE_PRIVATE_KEY, "hex"));
    const oracleAddr = oracle.getPublicKey().toSuiAddress();

    const tx = new Transaction();
    tx.setSender(oracleAddr);
    tx.setGasBudget(50000000);
    
    tx.moveCall({
      target: `${PACKAGE_ID}::market::create_market`,
      arguments: [tx.pure.u64(matchId), tx.pure.u64(deadlineMs)],
    });

    const txBytes = await tx.build({ client });
    const { bytes, signature } = await oracle.signTransaction(txBytes);
    
    const result = await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      options: { showEffects: true },
    });

    const effects = result.effects as any;
    if (effects.created) {
      for (const created of effects.created) {
        if (created.reference?.objectId) {
          return created.reference.objectId;
        }
      }
    }
    return null;
  } catch (e) {
    console.error("   ❌ On-chain error:", e);
    return null;
  }
}

async function saveMarketToDatabase(suggestion: MarketSuggestion, marketId: string) {
  const deadlineMs = Date.now() + 86400000 * 7; // 7 days from now

  const { error } = await supabase.from("markets").insert({
    object_id: marketId,
    match_id: suggestion.matchId,
    game: suggestion.game,
    stat: suggestion.stat,
    operator: suggestion.operator,
    threshold: suggestion.threshold,
    creator: "0xai00000000000000000000000000000000000000000000000000000000000000",
    deadline_ms: deadlineMs,
  });

  if (error) {
    console.log(`   ⚠️  ${error.message}`);
  } else {
    console.log(`   ✅ Saved to database`);
  }
}

let marketCounter = Math.floor(Math.random() * 10000);

async function runAgent() {
  console.log("=" .repeat(60));
  console.log("🤖 PlayStake AI Agent with Groq Brain");
  console.log("=" .repeat(60));

  while (true) {
    console.log(`\n🔄 Agent Loop #${marketCounter - 99}`);
    
    // Get AI suggestions
    const suggestions = await analyzeAndCreateMarkets();
    
    // Create markets for suggestions
    for (const suggestion of suggestions) {
      console.log(`\n📊 Creating market:`);
      console.log(`   Game: ${suggestion.game}`);
      console.log(`   Player: ${suggestion.player}`);
      console.log(`   Prediction: ${suggestion.stat} ${suggestion.operator} ${suggestion.threshold}`);
      console.log(`   Confidence: ${suggestion.confidence}%`);
      console.log(`   Reasoning: ${suggestion.reasoning}`);

      const matchId = marketCounter++;
      const deadlineMs = Date.now() + 86400000 * 7;
      const marketId = await createOnChainMarket(matchId, deadlineMs);
      
      if (marketId) {
        await saveMarketToDatabase({...suggestion, matchId}, marketId);
      }
    }

    console.log(`\n✅ Created ${suggestions.length} new markets`);
    
    // Wait before next loop
    console.log("\n💤 Waiting 60 seconds before next analysis...");
    await new Promise(r => setTimeout(r, 60000));
  }
}

runAgent().catch(console.error);
