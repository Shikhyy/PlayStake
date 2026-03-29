import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import * as dotenv from "dotenv";

dotenv.config();

const PLAYER_KEY = process.env.TEST_PLAYER_KEY ?? "";
const ORACLE_KEY = process.env.TEST_ORACLE_KEY ?? "";
const RPC_URL = process.env.RPC_URL ?? "https://rpc-testnet.onelabs.cc:443";

if (!PLAYER_KEY || !ORACLE_KEY) process.exit(1);

const client = new SuiClient({ url: RPC_URL });
const player = Ed25519Keypair.fromSecretKey(Buffer.from(PLAYER_KEY, "hex"));
const oracle = Ed25519Keypair.fromSecretKey(Buffer.from(ORACLE_KEY, "hex"));

async function fund() {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [150000000]); // 0.15 SUI
  tx.transferObjects([coin], tx.pure.address(oracle.getPublicKey().toSuiAddress()));
  
  tx.setSenderIfNotSet(player.getPublicKey().toSuiAddress());
  tx.setGasBudget(5000000);
  
  const txBytes = await tx.build({ client });
  const { bytes, signature } = await player.signTransaction(txBytes);
  
  const result: any = await client.call("sui_executeTransactionBlock", [
    bytes,
    [signature],
    { showEffects: true },
    "WaitForEffectsCert",
  ]);
  
  console.log("Fund Oracle Result:", result.effects?.status?.status);
}

fund().catch(console.error);
