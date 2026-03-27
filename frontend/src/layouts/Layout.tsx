import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ConnectButton } from "@onelabs/dapp-kit";
import { Icons } from "../components/Icons";

const navLinks = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/markets", label: "Markets", icon: MarketsIcon },
  { to: "/live", label: "Live", icon: LiveIcon, badge: "LIVE" },
  { to: "/portfolio", label: "Portfolio", icon: PortfolioIcon },
  { to: "/about", label: "About", icon: AboutIcon },
];

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen gradient-bg">
      {/* Gaming grid background */}
      <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
      <div className="fixed inset-0 scanline-overlay pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" 
           style={{
              backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(87, 106, 143, 0.12) 0%, transparent 50%)`
            }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-[#252a38]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            {/* Logo */}
            <NavLink to="/" className="flex items-center py-2 -ml-4">
              <img src="/leggo.png" alt="PlayStake" className="w-60 h-50 object-contain" />
            </NavLink>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `nav-link flex items-center gap-2 mx-1 font-tech uppercase tracking-wider text-sm ${isActive ? 'active' : ''}`}
                >
                  <link.icon />
                  {link.label}
                  {link.badge && (
                    <span className="badge-game badge-red text-[9px] px-1.5 py-0.5 ml-1">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Network badge */}
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-lg" 
                   style={{ background: 'rgba(87, 106, 143, 0.1)', border: '1px solid rgba(87, 106, 143, 0.2)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: '#F6B17A' }} />
                <span className="text-xs font-tech font-medium text-normal">OneChain Testnet</span>
              </div>

              {/* Connect Wallet */}
              <div className="flex-shrink-0">
                <ConnectButton className="!bg-[#F6B17A] !text-[#1a1a2e] !font-bold !px-4 !py-2 !rounded-lg !border-0 hover:!bg-[#e59f6a] hover:!shadow-[0_0_20px_rgba(246,177,122,0.5)] transition-all" />
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2.5 rounded-lg border border-dim hover:border-accent-violet transition-all"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden glass-panel border-t border-[#252a38] animate-fade-in-down">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3.5 rounded-lg font-tech uppercase tracking-wider text-sm transition-all ${
                      isActive
                        ? "text-accent-lavender bg-[rgba(183,189,247,0.1)]"
                        : "text-dim hover:text-normal hover:bg-[#181c25]"
                    }`
                  }
                >
                  <link.icon />
                  {link.label}
                  {link.badge && (
                    <span className="badge-game badge-red text-[10px]">LIVE</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="pt-24">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#252a38] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" 
                     style={{ background: 'linear-gradient(135deg, #2D3250 0%, #25343F 100%)' }}>
                  <Icons.zap size={24} className="text-accent-gold" />
                </div>
                <span className="text-xl font-bold font-display gradient-text-gaming">PlayStake</span>
              </div>
              <p className="text-dim text-sm leading-relaxed max-w-md font-tech">
                Skill-based prediction markets for GameFi. Stake on in-game performance, 
                verified by OnePlay oracle. No house edge, instant settlements.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-5 text-sm uppercase tracking-widest text-dim font-tech">Platform</h4>
              <ul className="space-y-3 text-sm font-tech">
                <li><NavLink to="/markets" className="text-normal hover:text-accent-lavender transition-colors">Markets</NavLink></li>
                <li><NavLink to="/live" className="text-normal hover:text-accent-lavender transition-colors">Live Matches</NavLink></li>
                <li><NavLink to="/portfolio" className="text-normal hover:text-accent-lavender transition-colors">Portfolio</NavLink></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-5 text-sm uppercase tracking-widest text-dim font-tech">Resources</h4>
              <ul className="space-y-3 text-sm font-tech">
                <li><NavLink to="/about" className="text-normal hover:text-accent-lavender transition-colors">About</NavLink></li>
                <li><a href="#" className="text-normal hover:text-accent-lavender transition-colors">Documentation</a></li>
                <li><a href="#" className="text-normal hover:text-accent-lavender transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-[#252a38] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-faint font-tech">
              Built on OneChain for OneHack 3.0
            </p>
            <div className="flex items-center gap-4">
              <span className="badge-game badge-blue">
                <span className="w-1.5 h-1.5 bg-accent-lavender rounded-full animate-pulse-glow" />
                Testnet Active
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Icons
function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function MarketsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function LiveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}