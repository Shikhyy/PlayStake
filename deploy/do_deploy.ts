import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC_URL = process.env.RPC_URL ?? "https://rpc-testnet.onelabs.cc:443";
const FAUCET_URL = "https://faucet-testnet.onelabs.cc";
const client = new SuiClient({ url: RPC_URL });

async function fund(address: string) {
  const r = await fetch(`${FAUCET_URL}/v1/gas`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ FixedAmountRequest: { recipient: address } }),
  });
  return r.json();
}
async function rpc(method: string, params: any): Promise<any> {
  return client.call(method, params);
}
async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

let oracle, player, spectator;

if (process.env.ORACLE_PRIVATE_KEY?.length === 64) {
  oracle = Ed25519Keypair.fromSecretKey(Buffer.from(process.env.ORACLE_PRIVATE_KEY, "hex"));
  player = Ed25519Keypair.fromSecretKey(Buffer.from(process.env.PLAYER_PRIVATE_KEY!, "hex"));
  spectator = Ed25519Keypair.fromSecretKey(Buffer.from(process.env.SPECTATOR_PRIVATE_KEY!, "hex"));
  console.log("Using keys from .env");
} else {
  oracle = Ed25519Keypair.generate();
  player = Ed25519Keypair.generate();
  spectator = Ed25519Keypair.generate();
  console.log("Generated new keys (NOT saving to .env yet)");
}

const oracleAddr = oracle.getPublicKey().toSuiAddress();
const playerAddr = player.getPublicKey().toSuiAddress();
const spectatorAddr = spectator.getPublicKey().toSuiAddress();

console.log("\nAddresses:");
console.log("  Oracle:", oracleAddr);
console.log("  Player:", playerAddr);
console.log("  Spectator:", spectatorAddr);

// Fund and wait
await Promise.all([fund(oracleAddr), fund(playerAddr), fund(spectatorAddr)]);
await sleep(6000);

console.log("\nBalances:");
for (const addr of [oracleAddr, playerAddr, spectatorAddr]) {
  try {
    const bal: any = await rpc("suix_getBalance", { owner: addr });
    const sui = Number(bal.totalBalance) / 1e9;
    console.log(`  ${addr.slice(0,10)}: ${sui} SUI`);
  } catch(e) {
    console.log(`  ${addr.slice(0,10)}: ERROR ${e}`);
  }
}

// Publish
const buildDir = join(__dirname, "../contracts/build/playstake/bytecode_modules");
const modules = ["market","oracle","settle","player"].map(n => 
  Buffer.from(readFileSync(join(buildDir, `${n}.mv`))).toString("base64")
);

console.log("\nBuilding publish tx...");
let txResult: any;
try {
  txResult = await rpc("unsafe_publish", {
    sender: oracleAddr,
    compiled_modules: modules,
    dependencies: ["0x1", "0x2"],
    gas_budget: "50000000",
  });
} catch(e: any) {
  console.error("unsafe_publish failed:", e.message);
  process.exit(1);
}

// txResult.txBytes might be a Promise
const rawTxBytes: any = txResult?.txBytes ?? txResult;
const txBytes: string = rawTxBytes instanceof Promise ? await rawTxBytes : rawTxBytes;

console.log("txBytes type:", typeof txBytes);
if (typeof txBytes !== "string" || !txBytes) {
  console.error("Bad txBytes:", JSON.stringify(txResult).slice(0, 300));
  process.exit(1);
}

console.log("Signing tx...");
const msgBytes = Buffer.from(txBytes, "base64");
const sig = oracle.sign(msgBytes);
const pubkey = oracle.getPublicKey();
const sigBytes = Buffer.concat([Buffer.from([0x00]), Buffer.from(sig), Buffer.from(pubkey.toBytes())]);

console.log("Executing tx...");
const result: any = await rpc("sui_executeTransactionBlock", [
  txBytes,
  [Buffer.from(sigBytes).toString("base64")],
  { showObjectChanges: true, showEffects: true },
  "WaitForEffectsCert",
]);

const pkg = result?.objectChanges?.find((o: any) => o.type === "published");
const PACKAGE_ID = pkg?.packageId;

if (!PACKAGE_ID) {
  console.error("\n\u274c Deployment FAILED");
  console.error(JSON.stringify(result, null, 2).slice(0, 800));
  process.exit(1);
}

console.log(`\n\u2705 PACKAGE_ID: ${PACKAGE_ID}`);
console.log(`   Digest: ${result.digest}`);

await sleep(2000);
const caps: any = await rpc("suix_getOwnedObjects", {
  owner: oracleAddr,
  filter: { StructType: `${PACKAGE_ID}::oracle::OracleCap` },
});
const ORACLE_CAP_ID = caps.data?.[0]?.data?.objectId ?? "";
console.log(`   ORACLE_CAP_ID: ${ORACLE_CAP_ID || "(not found)"}`);

const oK = Buffer.from(oracle.export().secretKey).toString("hex");
const pK = Buffer.from(player.export().secretKey).toString("hex");
const sK = Buffer.from(spectator.export().secretKey).toString("hex");

writeFileSync(join(__dirname, "../.env"),
  `PACKAGE_ID=${PACKAGE_ID}\nORACLE_CAP_ID=${ORACLE_CAP_ID}\n` +
  `ORACLE_PRIVATE_KEY=${oK}\nPLAYER_PRIVATE_KEY=${pK}\nSPECTATOR_PRIVATE_KEY=${sK}\n`
);
writeFileSync(join(__dirname, "../frontend/.env"),
  `VITE_PACKAGE_ID=${PACKAGE_ID}\nVITE_RPC_URL=${RPC_URL}\nVITE_WS_URL=ws://localhost:3001\n`
);
writeFileSync(join(__dirname, "../oracle-relay/.env"),
  `PACKAGE_ID=${PACKAGE_ID}\nORACLE_PRIVATE_KEY=${oK}\nORACLE_CAP_ID=${ORACLE_CAP_ID}\nRPC_URL=${RPC_URL}\nWS_PORT=3001\n`
);
writeFileSync(join(__dirname, "../e2e/.env"),
  `PACKAGE_ID=${PACKAGE_ID}\nTEST_PLAYER_KEY=${pK}\nTEST_SPECTATOR_KEY=${sK}\nTEST_ORACLE_KEY=${oK}\nRPC_URL=${RPC_URL}\n`
);

console.log("\n.env files updated!");
console.log("\n=== Deploy Complete ===");
