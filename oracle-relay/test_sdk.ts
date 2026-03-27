import { Client } from "@onelabs/sui";

const client = new Client({ rpcUrl: "https://rpc-testnet.onelabs.cc:443" });
client.getChainIdentifier()
  .then(r => console.log("Chain:", r))
  .catch(e => console.error("Error:", e.message));
