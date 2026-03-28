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
    <div className="min-h-screen bg-void text-bright font-tech selection:bg-accent-primary selection:text-void">
      {/* Brutalist grid background */}
      <div className="fixed inset-0 grid-pattern opacity-60 pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-panel border-b border-dim backdrop-blur-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="PlayStake" className="w-10 h-10" />
              <span className="text-xl font-bold font-display tracking-tight text-bright uppercase">PlayStake</span>
            </NavLink>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => 
                    `flex items-center gap-2 font-display uppercase font-bold text-sm tracking-widest transition-all
                     ${isActive ? 'text-accent-primary' : 'text-dim hover:text-bright'}`
                  }
                >
                  <link.icon />
                  {link.label}
                  {link.badge && (
                    <span className="badge-game bg-void text-accent-primary border-accent-primary ml-1 animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Network badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-dim bg-surface">
                <span className="w-2 h-2 rounded-none bg-status-success animate-pulse" />
                <span className="text-xs font-mono font-medium text-dim uppercase">OneChain Testnet</span>
              </div>

              {/* Connect Wallet */}
              <div className="flex-shrink-0">
                <ConnectButton className="!bg-[#CEFF00] !text-[#000000] !font-display !font-bold !uppercase !tracking-widest !px-6 !py-2.5 !rounded-none !border-none hover:!bg-[#B0DF00] transition-colors" />
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 border border-dim text-dim hover:text-bright hover:border-bright transition-colors bg-surface"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-panel border-t border-dim">
            <div className="px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 font-display uppercase font-bold tracking-widest border border-transparent
                     ${isActive ? "text-void bg-accent-primary" : "text-dim hover:text-bright hover:border-dim hover:bg-surface"}`
                  }
                >
                  <link.icon />
                  {link.label}
                  {link.badge && (
                    <span className="ml-auto text-[10px] bg-void text-accent-primary px-2 py-1 border border-accent-primary">LIVE</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-dim mt-auto bg-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-bright flex items-center justify-center">
                  <Icons.zap size={16} className="text-void" />
                </div>
                <span className="text-xl font-bold font-display uppercase tracking-widest">PlayStake</span>
              </div>
              <p className="text-dim text-sm font-mono max-w-sm">
                Prediction markets for GameFi. Zero house edge. Total on-chain transparency.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-widest text-bright font-display">Platform</h4>
              <ul className="space-y-3 text-sm font-mono text-dim">
                <li><NavLink to="/markets" className="hover:text-accent-primary transition-colors">/markets</NavLink></li>
                <li><NavLink to="/live" className="hover:text-accent-primary transition-colors">/live_matches</NavLink></li>
                <li><NavLink to="/portfolio" className="hover:text-accent-primary transition-colors">/portfolio</NavLink></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-widest text-bright font-display">System</h4>
              <ul className="space-y-3 text-sm font-mono text-dim">
                <li><NavLink to="/about" className="hover:text-accent-primary transition-colors">/protocol_docs</NavLink></li>
                <li><a href="#" className="hover:text-accent-primary transition-colors">/github_repo</a></li>
                <li><a href="#" className="hover:text-accent-primary transition-colors">/oracle_status</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-dim flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-faint font-mono uppercase">
              SYS.BUILD // ONECHAIN TESTNET // V1.0.0
            </p>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] text-status-success uppercase flex items-center gap-2 border border-status-success px-2 py-1">
                <span className="w-2 h-2 bg-status-success" />
                Network Online
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Icons (Brutalist stark lines SVG)
function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M3 10h3v11h12V10h3L12 3 3 10z" />
    </svg>
  );
}

function MarketsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M3 3h18v18H3V3z M3 9h18 M9 21V9" />
    </svg>
  );
}

function LiveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M19.07 4.93a10 10 0 010 14.14M4.93 19.07a10 10 0 010-14.14M15.54 8.46a5 5 0 010 7.07M8.46 15.54a5 5 0 010-7.07" />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M4 4h16v16H4V4z M4 8h16 M8 20V8" />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M12 11v6 M12 7h.01 M3 3h18v18H3V3z" />
    </svg>
  );
}