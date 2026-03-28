import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SuiClientProvider } from '@onelabs/dapp-kit';
import { WalletProvider } from '@onelabs/dapp-kit';
import '@onelabs/dapp-kit/dist/index.css';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Markets from './pages/Markets';
import MarketDetail from './pages/MarketDetail';
import Live from './pages/Live';
import Portfolio from './pages/Portfolio';
import About from './pages/About';
import { TxToastProvider } from './components/TxToast';
import './index.css';

// Global error handler
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider enableUnsafeBurner={true} autoConnect={true}>
          <TxToastProvider>
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
          </TxToastProvider>
        </WalletProvider>
      </SuiClientProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

console.log('>>> PlayStake rendered');
