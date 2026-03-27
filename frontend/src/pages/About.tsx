import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Icons, getIcon } from "../components/Icons";

const features = [
  {
    icon: "zap",
    title: "Instant Settlements",
    desc: "No waiting for manual verification. Results are posted by OnePlay oracle and bets settle automatically.",
    color: "#2D3250",
  },
  {
    icon: "target",
    title: "Skill-Based",
    desc: "Bet on your own performance, not luck. Your gaming skills determine the outcome.",
    color: "#7077A1",
  },
  {
    icon: "gem",
    title: "No House Edge",
    desc: "Traditional betting platforms take 5-10% vig. PlayStake takes only 2% to sustain operations.",
    color: "#FFF8DE",
  },
  {
    icon: "shield",
    title: "On-Chain Trust",
    desc: "All bets and settlements are recorded on OneChain. Transparent, immutable, and verifiable.",
    color: "#2D3250",
  },
  {
    icon: "globe",
    title: "Permissionless",
    desc: "No admin keys. Anyone can create markets, place bets, or trigger settlements.",
    color: "#7077A1",
  },
  {
    icon: "smartphone",
    title: "Mobile Ready",
    desc: "Built for the gaming generation. Play from anywhere, anytime on any device.",
    color: "#FFF8DE",
  },
];

const techStack = [
  { name: "Move", desc: "Smart contracts", icon: "hexagon" },
  { name: "OneChain", desc: "Blockchain", icon: "link2" },
  { name: "OnePlay", desc: "Oracle", icon: "game" },
  { name: "Sui SDK", desc: "TypeScript SDK", icon: "package" },
];

const team = [
  { name: "Anonymous", role: "Smart Contract Dev", avatar: "code", level: 45 },
  { name: "Anonymous", role: "Frontend Engineer", avatar: "code", level: 38 },
  { name: "Anonymous", role: "Backend/Oracle", avatar: "code", level: 42 },
];

const faqs = [
  {
    q: "How does PlayStake differ from traditional betting?",
    a: "Traditional betting involves luck. PlayStake is purely skill-based — you bet on your own performance in games you play.",
  },
  {
    q: "Is there a house edge?",
    a: "Only 2% fee on winnings. Traditional sportsbooks take 5-10%. We take the minimum to sustain operations.",
  },
  {
    q: "How are results verified?",
    a: "OnePlay oracle posts verified match statistics on-chain. No manual intervention needed.",
  },
  {
    q: "Can I bet on other players?",
    a: "Yes! Spectators can back players they believe in. This improves the player's odds.",
  },
  {
    q: "Is PlayStake deployed on mainnet?",
    a: "Currently on OneChain testnet for the hackathon. Mainnet deployment planned after testing.",
  },
];

export default function About() {
  const [loaded, setLoaded] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-28 pb-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-15"
               style={{ background: "radial-gradient(circle, rgba(87, 106, 143, 0.4) 0%, transparent 70%)" }} />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full opacity-10 animate-float"
               style={{ background: "radial-gradient(circle, rgba(183, 189, 247, 0.2) 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className={`transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg glass-panel-accent mb-10 animate-fade-in-up">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse-glow" style={{ background: '#F6B17A' }} />
              <span className="text-sm font-tech font-medium tracking-wider text-normal">OneHack 3.0 Submission</span>
            </div>
            <h1 className="hero-title-game mb-8">
              <span className="text-white">About</span>
              <br />
              <span className="gradient-text-gaming">PlayStake</span>
            </h1>
            <p className="hero-subtitle-game mx-auto mb-10 max-w-xl">
              The first skill-based prediction market for GameFi. Built on OneChain,
              powered by your gaming skills.
            </p>
          </div>
        </div>
      </section>

      {/* What is PlayStake */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <h2 className="section-title-game gradient-text-gaming mb-6 font-display">What is PlayStake?</h2>
              <div className="space-y-5 text-dim leading-relaxed font-tech">
                <p>
                  PlayStake is a decentralized prediction market that allows gamers to stake on
                  their own in-game performance. Unlike traditional betting or fantasy sports,
                  there's no luck involved — just your actual skill.
                </p>
                <p>
                  Before a match, you can create a market: "I'll deal at least 8,000 damage in
                  Arena of Valor." You stake your prediction, and spectators can back you too.
                </p>
                <p>
                  After the match, OnePlay oracle posts verified stats on-chain. If you hit
                  your target, you win. If not, you lose your stake. Simple, transparent, fair.
                </p>
                <p>
                  No bookmakers. No house edge. Just skill vs. skill.
                </p>
              </div>
            </div>
            <div className="animate-fade-in-up delay-150">
              <div className="card-game p-8 gradient-border">
                <div className="space-y-5">
                  {[
                    { step: 1, text: "You predict your damage: ≥ 15,000", color: "#2D3250" },
                    { step: 2, text: "You stake 100 OCT at 2.4x odds", color: "#7077A1" },
                    { step: 3, text: "Match ends. You dealt 16,200 damage", color: "#2D3250" },
                    { step: 4, text: "Oracle posts results. You win 240 OCT!", color: "#F6B17A" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold font-display flex-shrink-0"
                           style={{ background: item.color, color: item.color === '#F6B17A' ? '#000' : '#fff' }}>
                        {item.step}
                      </div>
                      <p className="text-sm text-normal pt-1.5 font-tech">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title-game gradient-text-gaming mb-4 font-display">Why PlayStake?</h2>
            <p className="text-dim font-tech">
              Built with the best tech for the best experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div
                key={i}
                className="card-game p-6 group animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform text-accent-lavender">
                  {getIcon(feature.icon as keyof typeof Icons, { size: 32 })}
                </div>
                <h3 className="text-base font-semibold font-display mb-2 group-hover:text-accent-lavender transition-colors">{feature.title}</h3>
                <p className="text-sm text-dim font-tech">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title-game gradient-text-gaming mb-4 font-display">Tech Stack</h2>
            <p className="text-dim font-tech">
              Built on battle-tested technologies
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
            {techStack.map((tech, i) => (
              <div
                key={i}
                className="card-game p-6 text-center animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-4xl mb-3 text-accent-lavender flex justify-center">
                  {getIcon(tech.icon as keyof typeof Icons, { size: 32 })}
                </div>
                <h3 className="font-bold font-display mb-1">{tech.name}</h3>
                <p className="text-xs text-dim font-tech">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title-game gradient-text-gaming mb-4 font-display">How It Works</h2>
            <p className="text-dim font-tech">
              From prediction to payout in three steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                icon: "game",
                title: "Choose Your Game",
                desc: "Select from supported games and prediction types. Set your performance target.",
                detail: "Damage, kills, placement, gold earned, and more.",
                color: "#2D3250"
              },
              {
                step: 2,
                icon: "coins",
                title: "Stake & Wait",
                desc: "Lock your stake on your prediction. Watch the match and see if you hit your target.",
                detail: "Spectators can back you, improving your odds.",
                color: "#7077A1"
              },
              {
                step: 3,
                icon: "trophy",
                title: "Collect Winnings",
                desc: "OnePlay oracle posts verified stats. If you won, claim your payout instantly.",
                detail: "No manual claims. Automatic settlement.",
                color: "#F6B17A"
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="card-game p-8 h-full">
                  <div className={`absolute -top-4 left-8 w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold font-display`}
                       style={{ background: item.color, color: item.color === '#F6B17A' ? '#000' : '#fff' }}>
                    {item.step}
                  </div>
                  <div className="text-5xl mb-5 mt-3 text-accent-lavender flex justify-center">
                    {getIcon(item.icon as keyof typeof Icons, { size: 40 })}
                  </div>
                  <h3 className="text-lg font-bold font-display mb-3">{item.title}</h3>
                  <p className="text-sm text-dim font-tech mb-4">{item.desc}</p>
                  <p className="text-xs font-tech" style={{ color: item.color }}>{item.detail}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 w-6 h-0.5" 
                       style={{ background: `linear-gradient(90deg, ${item.color}60, ${['#2D3250','#7077A1','#F6B17A'][i+1]}60)` }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title-game gradient-text-gaming mb-4 font-display">Built by Gamers, for Gamers</h2>
            <p className="text-dim font-tech">
              A hackathon project from OneHack 3.0
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {team.map((member, i) => (
              <div key={i} className="card-game p-6 text-center w-56 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl border-2 border-dim mx-auto mb-4"
                       style={{ background: 'linear-gradient(135deg, rgba(87,106,143,0.2), rgba(183,189,247,0.1))' }}>
                    <Icons.code size={36} className="text-accent-lavender" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 px-2 py-1 rounded-lg text-[10px] font-bold font-display"
                       style={{ background: '#2D3250', color: '#fff' }}>
                    LV.{member.level}
                  </div>
                </div>
                <h3 className="font-bold font-display mb-1">{member.name}</h3>
                <p className="text-xs text-dim font-tech">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="card-game p-14 gradient-border-glow relative overflow-hidden">
            <div className="absolute inset-0 gradient-bg opacity-30" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-5 font-display">
                Ready to Start?
              </h2>
              <p className="text-dim mb-10 max-w-lg mx-auto font-tech">
                Join the future of skill-based gaming rewards. Connect your wallet and start
                predicting today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/markets" className="btn-game btn-primary-game btn-lg">
                  Explore Markets
                </Link>
                <Link to="/" className="btn-game btn-secondary-game btn-lg">
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 gradient-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title-game gradient-text-gaming font-display">FAQ</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="card-game overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left flex items-center justify-between"
                >
                  <h3 className="font-semibold text-sm font-display pr-4">{faq.q}</h3>
                  <span className={`transition-transform flex-shrink-0 text-accent-lavender ${openFaq === i ? 'rotate-180' : ''}`}>
                    <Icons.chevronDown size={20} />
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 animate-fade-in-up">
                    <p className="text-sm text-dim font-tech border-t border-dim/20 pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
