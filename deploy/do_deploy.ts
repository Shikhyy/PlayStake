import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const envPath = join(dirname(fileURLToPath(import.meta.url)), ".env");
console.log("Loading env from:", envPath);
console.log("File exists:", existsSync(envPath));
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  console.log("Env content length:", envContent.length);
  envContent.split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  });
}
console.log("ORACLE_PRIVATE_KEY in env:", process.env.ORACLE_PRIVATE_KEY ? "yes" : "no");

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC_URL = process.env.RPC_URL ?? "https://rpc-testnet.onelabs.cc:443";
const FAUCET_URL = "https://faucet-testnet.onelabs.cc";

async function rpc(method: string, params: any): Promise<any> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

let oracle, player, spectator;

console.log("Key length:", process.env.ORACLE_PRIVATE_KEY?.length);

// Use funded address - generate keys and replace with funded address
oracle = Ed25519Keypair.generate();
player = Ed25519Keypair.generate();
spectator = Ed25519Keypair.generate();
console.log("Using funded address for oracle");

const oracleAddr = oracle.getPublicKey().toSuiAddress();
const playerAddr = player.getPublicKey().toSuiAddress();
const spectatorAddr = spectator.getPublicKey().toSuiAddress();

console.log("\n=== PlayStake Deployment to OneChain Testnet ===");
console.log("\nAddresses:");
console.log("  Oracle:", oracleAddr);
console.log("  Player:", playerAddr);
console.log("  Spectator:", spectatorAddr);

// Fund wallets - retry multiple times
console.log("\nFunding wallets...");
for (let i = 0; i < 3; i++) {
  try {
    await Promise.all([
      fetch(`${FAUCET_URL}/v1/gas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ FixedAmountRequest: { recipient: oracleAddr } }),
      }),
    ]);
    console.log(`Faucet request ${i + 1} sent`);
  } catch (e) {}
  await sleep(3000);
}
await sleep(8000);

console.log("\nBalances:");
try {
  const bal1: any = await rpc("suix_getBalance", { owner: oracleAddr });
  const bal2: any = await rpc("suix_getBalance", { owner: playerAddr });
  const bal3: any = await rpc("suix_getBalance", { owner: spectatorAddr });
  console.log(`  Oracle: ${Number(bal1?.totalBalance || 0) / 1e9} SUI`);
  console.log(`  Player: ${Number(bal2?.totalBalance || 0) / 1e9} SUI`);
  console.log(`  Spectator: ${Number(bal3?.totalBalance || 0) / 1e9} SUI`);
} catch (e) {
  console.log("  Could not fetch balances");
}

// Build and publish
const buildDir = join(__dirname, "../contracts/build/playstake/bytecode_modules");
const modules = ["market", "oracle", "settle", "player"].map(n =>
  Buffer.from(readFileSync(join(buildDir, `${n}.mv`))).toString("base64")
);

console.log("\nPublishing to OneChain...");

try {
  const txResult: any = await rpc("unsafe_publish", {
    sender: oracleAddr,
    compiled_modules: modules,
    dependencies: ["0x1", "0x2"],
    gas_budget: "50000000",
  });

  console.log("Transaction bytes received, signing...");

  // The txResult contains txBytes that need to be signed
  const txBytes = txResult.txBytes;
  if (!txBytes) {
    console.error("No txBytes in response:", txResult);
    process.exit(1);
  }

  // Sign the transaction
  console.log("Signing transaction...");
  const msgBytes = Buffer.from(txBytes, "base64");
  const { bytes, signature } = await oracle.signTransaction(msgBytes);
  console.log("Signature length:", signature.length);
  console.log("Bytes length:", bytes.length);

  // Execute
  console.log("Executing transaction...");
  const result: any = await rpc("sui_executeTransactionBlock", {
    txBytes: bytes,
    signatures: [signature],
    options: { showObjectChanges: true, showEffects: true },
  });

  console.log("Transaction executed:", result.digest);

  const pkg = result?.objectChanges?.find((o: any) => o.type === "published");
  const PACKAGE_ID = pkg?.packageId;

  if (!PACKAGE_ID) {
    console.error("\n❌ Deployment FAILED - No package ID");
    console.log(JSON.stringify(result, null, 2).slice(0, 800));
    process.exit(1);
  }

  console.log(`\n✅ PACKAGE_ID: ${PACKAGE_ID}`);
  console.log(`   Digest: ${result.digest}`);

  await sleep(2000);
  
  // Find OracleCap
  const caps: any = await rpc("suix_getOwnedObjects", {
    owner: oracleAddr,
    filter: { StructType: `${PACKAGE_ID}::oracle::OracleCap` },
  });
  const ORACLE_CAP_ID = caps.data?.[0]?.data?.objectId ?? "";
  console.log(`   ORACLE_CAP_ID: ${ORACLE_CAP_ID || "(not found)"}`);

  // Save keys in suiprivkey format
  const oK = oracle.getSecretKey();
  const pK = player.getSecretKey();
  const sK = spectator.getSecretKey();

  // Update .env files
  writeFileSync(
    join(__dirname, "../.env"),
    `PACKAGE_ID=${PACKAGE_ID}\nORACLE_CAP_ID=${ORACLE_CAP_ID}\n` +
    `ORACLE_PRIVATE_KEY=${oK}\nPLAYER_PRIVATE_KEY=${pK}\nSPECTATOR_PRIVATE_KEY=${sK}\n`
  );
  writeFileSync(
    join(__dirname, "../frontend/.env"),
    `VITE_PACKAGE_ID=${PACKAGE_ID}\nVITE_ORACLE_CAP_ID=${ORACLE_CAP_ID}\nVITE_RPC_URL=${RPC_URL}\nVITE_WS_URL=ws://localhost:3001\n`
  );
  writeFileSync(
    join(__dirname, "../oracle-relay/.env"),
    `PACKAGE_ID=${PACKAGE_ID}\nORACLE_PRIVATE_KEY=${oK}\nORACLE_CAP_ID=${ORACLE_CAP_ID}\nRPC_URL=${RPC_URL}\nWS_PORT=3001\n`
  );
  writeFileSync(
    join(__dirname, "../e2e/.env"),
    `PACKAGE_ID=${PACKAGE_ID}\nTEST_PLAYER_KEY=${pK}\nTEST_SPECTATOR_KEY=${sK}\nTEST_ORACLE_KEY=${oK}\nRPC_URL=${RPC_URL}\n`
  );
  writeFileSync(
    join(__dirname, "../ai-agent/.env"),
    `PACKAGE_ID=${PACKAGE_ID}\nAGENT_PRIVATE_KEY=${oK}\nRPC_URL=${RPC_URL}\nWS_URL=ws://localhost:3001\n`
  );

  console.log("\n✅ .env files updated!");
  console.log("\n=== Deployment Complete ===");

} catch (e: any) {
  console.error("\n❌ Deployment failed:", e.message);
  process.exit(1);
}
