export const SUPPORTED_GAMES = [
  { id: "arena_of_valor", name: "Arena of Valor", icon: "⚔️", stats: ["DAMAGE", "KILLS", "GOLD"] },
  { id: "pubg_mobile", name: "PUBG Mobile", icon: "🔫", stats: ["DAMAGE", "KILLS", "PLACEMENT"] },
  { id: "valorant", name: "Valorant", icon: "🎯", stats: ["DAMAGE", "KILLS", "PLACEMENT"] },
  { id: "fortnite", name: "Fortnite", icon: "🏗️", stats: ["DAMAGE", "KILLS", "PLACEMENT", "GOLD"] },
  { id: "call_of_duty", name: "Call of Duty", icon: "💥", stats: ["DAMAGE", "KILLS"] },
  { id: "league_of_legends", name: "League of Legends", icon: "🧙", stats: ["DAMAGE", "KILLS", "GOLD"] },
  { id: "apex_legends", name: "Apex Legends", icon: "🦊", stats: ["DAMAGE", "KILLS", "PLACEMENT"] },
  { id: "mobile_legends", name: "Mobile Legends", icon: "📱", stats: ["DAMAGE", "KILLS", "GOLD"] },
] as const;
