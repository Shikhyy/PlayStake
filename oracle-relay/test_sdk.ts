import { SuiClient } from "@onelabs/sui/client";

const client = new SuiClient({ url: "https://rpc-testnet.onelabs.cc:443" });
client.getChainIdentifier()
  .then((r: any) => console.log("Chain:", r))
  .catch((e: any) => console.error("Error:", e.message));
