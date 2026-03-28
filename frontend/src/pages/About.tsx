import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Icons, getIcon } from "../components/Icons";

const features = [
  { icon: "zap", title: "Atomic Settlement", desc: "No intermediary verification. Payouts trigger immediately upon oracle telemetry confirmation." },
  { icon: "target", title: "Deterministic Output", desc: "Bet on quantifiable performance metrics. Your actual skills generate the yield." },
  { icon: "gem", title: "Optimized Margin", desc: "Traditional platforms extract 10%. PlayStake maintains a strict 2% protocol fee." },
  { icon: "shield", title: "On-Chain Audit", desc: "Every position, claim, and dispersement is recorded on OneChain immutable ledger." },
  { icon: "globe", title: "Universal Protocol", desc: "No permissioned gates. Anyone can seed liquidity or execute settlements." },
  { icon: "smartphone", title: "Terminal Ready", desc: "High-performance interface optimized for low-latency market interactions." },
];

const techStack = [
  { name: "MOVE", desc: "Smart Contracts", icon: "hexagon" },
  { name: "ONECHAIN", desc: "L1 Network", icon: "link2" },
  { name: "ONEPLAY", desc: "Oracle Engine", icon: "game" },
  { name: "ONELABS_SDK", desc: "Protocol Glue", icon: "package" },
];

const faqs = [
  { q: "RE: ARCHITECTURE DIFFERENTIAL", a: "Traditional systems rely on human interpretation. PlayStake utilizes deterministic Move logic to settle positions based on raw match data." },
  { q: "RE: PROTOCOL VIG", a: "2% extraction on winning payouts only. This fuel maintains the oracle relay and decentralized indexers." },
  { q: "RE: TELEMETRY VERIFICATION", a: "The OnePlay oracle pushes signed match payloads directly to the Move VM. The contract validates signatures before disbursing USDO." },
  { q: "RE: SPECTATOR LIQUIDITY", a: "Backing other players creates deeper liquidity pools, providing better odds for skilled claimants." },
];

export default function About() {
  const [loaded, setLoaded] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="mb-24 border-b border-dim pb-16">
        <div className={`transition-all duration-700 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center gap-3 mb-8">
            <span className="px-2 py-1 bg-accent-primary text-void font-bold font-mono text-xs uppercase">File // Documentation</span>
            <span className="text-dim font-mono text-xs">/ / MISSION_PROTOCOL_TRANSCRIPT</span>
          </div>
          <h1 className="hero-title-game text-bright mb-6 uppercase">
            Protocol <span className="text-accent-primary">Manifesto</span>
          </h1>
          <p className="hero-subtitle-game max-w-2xl text-normal font-mono">
            A decentralized prediction layer bridging high-fidelity gaming data with Move-based smart contracts.
          </p>
        </div>
      </section>

      {/* Grid Features */}
      <section className="mb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border border-dim bg-dim">
          {features.map((f, i) => (
            <div key={i} className="bg-panel p-8 border-r border-b border-dim last:border-r-0 md:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(3n)]:border-r-0 hover:bg-surface transition-colors">
              <div className="text-accent-primary mb-6">{getIcon(f.icon as keyof typeof Icons, { size: 32 })}</div>
              <h3 className="text-xl font-display font-bold uppercase text-bright mb-4 tracking-tight">{f.title}</h3>
              <p className="font-mono text-sm text-dim leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Workflow */}
      <section className="mb-24">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h2 className="text-3xl font-display font-bold uppercase text-bright mb-8 border-l-4 border-accent-primary pl-6">Core Execution</h2>
            <div className="space-y-6 font-mono text-sm text-dim">
              <p>PlayStake removes the "house" from gaming predictions. By utilizing the Sui-compatible Move VM, we ensure that payouts are mathematically guaranteed once match results are finalized.</p>
              <p>The OnePlay oracle acts as the source of truth, relaying telemetry from game servers directly to the Move contracts. This creates an immutable link between your skill and your yield.</p>
              <div className="grid grid-cols-2 gap-4 pt-6">
                {techStack.map((t, i) => (
                  <div key={i} className="p-4 border border-dim bg-surface flex items-center gap-3">
                    <div className="text-bright">{getIcon(t.icon as keyof typeof Icons, { size: 16 })}</div>
                    <span className="font-bold text-xs uppercase tracking-widest text-bright">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="border-2 border-accent-primary p-8 bg-panel relative">
               <div className="absolute top-0 right-0 p-2 bg-accent-primary text-void font-bold text-[10px] uppercase">Simulation_v1</div>
               <div className="space-y-6">
                  {["IDENTIFY_CLAIM", "COMMIT_MARGIN", "EXECUTE_ORACLE", "DISTRIBUTE_YIELD"].map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-8 h-8 flex-shrink-0 border border-dim flex items-center justify-center font-display font-bold text-accent-primary text-xs">{i+1}</div>
                      <div className="font-mono text-xs uppercase text-bright tracking-widest">{step}</div>
                      {i < 3 && <div className="h-[2px] flex-1 bg-dim border-b border-dim border-dashed" />}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="mb-24">
        <h2 className="text-3xl font-display font-bold uppercase text-bright mb-12 text-center tracking-tighter">Transmission Queries</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-dim bg-panel">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-surface transition-colors"
              >
                <h3 className="font-display font-bold text-sm uppercase tracking-widest text-bright pr-4">{faq.q}</h3>
                <span className={`transition-transform flex-shrink-0 text-accent-primary ${openFaq === i ? 'rotate-180' : ''}`}>
                  {getIcon("chevronDown" as keyof typeof Icons, { size: 20 })}
                </span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 pt-2 animate-fade-in-up">
                  <p className="text-sm text-dim font-mono leading-relaxed border-t border-dim pt-4">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-20 border-t border-dim border-dashed">
        <h2 className="text-4xl font-display font-bold uppercase text-bright mb-8">Ready For Deployment?</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link to="/markets" className="btn-game btn-gold px-12">
            [ ENTER_EXCHANGE ]
          </Link>
          <Link to="/" className="btn-game btn-ghost border border-dim px-12">
            [ EXIT_MAIN ]
          </Link>
        </div>
      </section>
    </div>
  );
}
