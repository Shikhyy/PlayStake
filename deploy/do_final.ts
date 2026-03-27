import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@onelabs/sui/cryptography";
import { Transaction } from "@onelabs/sui/transactions";
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
async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function rpcCall(method: string, params: any, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await client.call(method, params);
    } catch (e: any) {
      if (i < retries - 1) {
        await sleep(2000);
        continue;
      }
      throw e;
    }
  }
}

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
  console.log("Generated new keys");
}

const oracleAddr = oracle.getPublicKey().toSuiAddress();
const playerAddr = player.getPublicKey().toSuiAddress();
const spectatorAddr = spectator.getPublicKey().toSuiAddress();

console.log("\nOracle:", oracleAddr);
console.log("Player:", playerAddr);
console.log("Spectator:", spectatorAddr);

await Promise.all([fund(oracleAddr), fund(playerAddr), fund(spectatorAddr)]);
await sleep(8000);

for (const addr of [oracleAddr, playerAddr, spectatorAddr]) {
  try {
    const bal: any = await rpcCall("suix_getBalance", { owner: addr });
    console.log(`  ${addr.slice(0,10)}: ${Number(bal.totalBalance)/1e9} SUI`);
  } catch(e: any) {
    console.log(`  ${addr.slice(0,10)}: (balance check failed, will retry)`);
  }
}

const buildDir = join(__dirname, "../contracts/build/playstake/bytecode_modules");
const modules = ["market","oracle","settle","player"].map(n => 
  readFileSync(join(buildDir, `${n}.mv`)).toString("base64")
);

console.log("\nBuilding publish transaction...");
const tx = new Transaction();
tx.setSenderIfNotSet(oracleAddr);
tx.setGasBudget("100000000");
const cap = tx.publish({ modules, dependencies: ["0x1", "0x2"] });
tx.transferObjects([cap], oracleAddr);

const txBytes = await tx.build({ client });
console.log("txBytes len:", txBytes.length);

console.log("Signing...");
const { bytes: txB64, signature: sigB64 } = await oracle.signTransaction(txBytes);

console.log("Executing...");
const result: any = await rpcCall("sui_executeTransactionBlock", [
  txB64,
  [sigB64],
  { showObjectChanges: true, showEffects: true },
  "WaitForEffectsCert",
]);

const pkg = result?.objectChanges?.find((o: any) => o.type === "published");
const PACKAGE_ID = pkg?.packageId;

if (!PACKAGE_ID) {
  console.error("\n❌ Deployment FAILED");
  console.error(JSON.stringify(result).slice(0, 800));
  process.exit(1);
}

console.log(`\n✅ PACKAGE_ID: ${PACKAGE_ID}`);
console.log(`   Digest: ${result.digest}`);

let ORACLE_CAP_ID = "";
for (let i = 0; i < 5; i++) {
  try {
    await sleep(3000);
    const caps: any = await rpcCall("suix_getOwnedObjects", {
      address: oracleAddr,
      query: { filter: { StructType: `${PACKAGE_ID}::oracle::OracleCap` } },
    });
    ORACLE_CAP_ID = caps.data?.[0]?.data?.objectId ?? "";
    break;
  } catch (e: any) {
    console.log(`   OracleCap query attempt ${i+1} failed: ${e.message.slice(0, 40)}`);
    if (i === 4) console.log("   Skipping OracleCap fetch");
  }
}
console.log(`   ORACLE_CAP_ID: ${ORACLE_CAP_ID || "(not found)"}`);

function toHex(k: Ed25519Keypair): string {
  return Buffer.from(decodeSuiPrivateKey(k.getSecretKey()).secretKey).toString("hex");
}
const oK = toHex(oracle);
const pK = toHex(player);
const sK = toHex(spectator);

writeFileSync(join(__dirname, "../.env"),
  `PACKAGE_ID=${PACKAGE_ID}\nORACLE_CAP_ID=${ORACLE_CAP_ID}\n` +
  `ORACLE_PRIVATE_KEY=${oK}\nPLAYER_PRIVATE_KEY=${pK}\nSPECTATOR_PRIVATE_KEY=${sK}\n`
);
writeFileSync(join(__dirname, "../frontend/.env"),
  `VITE_PACKAGE_ID=${PACKAGE_ID}\nVITE_ORACLE_CAP_ID=${ORACLE_CAP_ID}\nVITE_RPC_URL=${RPC_URL}\nVITE_WS_URL=ws://localhost:3001\n`
);
writeFileSync(join(__dirname, "../oracle-relay/.env"),
  `PACKAGE_ID=${PACKAGE_ID}\nORACLE_PRIVATE_KEY=${oK}\nORACLE_CAP_ID=${ORACLE_CAP_ID}\nRPC_URL=${RPC_URL}\nWS_PORT=3001\n`
);
writeFileSync(join(__dirname, "../e2e/.env"),
  `PACKAGE_ID=${PACKAGE_ID}\nTEST_PLAYER_KEY=${pK}\nTEST_SPECTATOR_KEY=${sK}\nTEST_ORACLE_KEY=${oK}\nRPC_URL=${RPC_URL}\n`
);

console.log("\n.env files updated!");
console.log("\n=== Deploy Complete ===");
