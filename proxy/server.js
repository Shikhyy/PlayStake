const express = require('express');
const cors = require('cors');
const { default: axios } = require('axios');

const app = express();
const PORT = 4000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Handle all RPC methods - both GET and POST
app.all('/rpc', async (req, res) => {
  try {
    const method = req.body?.method || req.query?.method || 'unknown';
    console.log('Proxy received:', req.method, method);
    
    const response = await axios.post('https://rpc-testnet.onelabs.cc:443', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      timeout: 60000,
    });
    
    console.log('Proxy responded:', method, response.data.result ? 'OK' : 'ERROR');
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message, error.response?.status);
    res.status(200).json({ 
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: error.message 
      },
      id: req.body?.id || 1
    });
  }
});

// Handle root
app.get('/', (req, res) => {
  res.send('PlayStake RPC Proxy Running - use /rpc endpoint');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
