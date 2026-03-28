import { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SuiClientProvider } from '@onelabs/dapp-kit';
import { WalletProvider } from '@onelabs/dapp-kit';
import '@onelabs/dapp-kit/dist/index.css';
import Layout from './layouts/Layout';
import { TxToastProvider } from './components/TxToast';
import './index.css';

const Home = lazy(() => import('./pages/Home'));
const Markets = lazy(() => import('./pages/Markets'));
const MarketDetail = lazy(() => import('./pages/MarketDetail'));
const Live = lazy(() => import('./pages/Live'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const About = lazy(() => import('./pages/About'));

window.onerror = (msg, url, line, col, error) => {
  console.error('Global error:', { msg, url, line, col, error });
  return false;
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const networks = {
  testnet: { url: import.meta.env.VITE_RPC_URL || 'https://rpc-testnet.onelabs.cc:443' },
};

console.log('>>> PlayStake starting with RPC:', networks.testnet.url);

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#7077a1] font-tech">Loading...</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider enableUnsafeBurner={true} autoConnect={true}>
          <TxToastProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="markets" element={<Markets />} />
                  <Route path="markets/:id" element={<MarketDetail />} />
                  <Route path="live" element={<Live />} />
                  <Route path="portfolio" element={<Portfolio />} />
                  <Route path="about" element={<About />} />
                </Route>
              </Routes>
            </Suspense>
          </TxToastProvider>
        </WalletProvider>
      </SuiClientProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

console.log('>>> PlayStake rendered');
