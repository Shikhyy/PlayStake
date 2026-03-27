import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
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

async function fundAddress(address: string): Promise<void> {
  try {
    const resp = await fetch(`${FAUCET_URL}/v1/gas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ FixedAmountRequest: { recipient: address } }),
    });
    const json = await resp.json();
    if (resp.ok && !json.error) {
      console.log(`  \u2705 Funded ${address.slice(0, 10)}... — ${json.task ?? "queued"}`);
    } else {
      console.log(`  \u26a0\ufe0f  Faucet for ${address.slice(0, 10)}...: ${JSON.stringify(json).slice(0, 120)}`);
    }
  } catch (e) {
    console.log(`  \u26a0\ufe0f  Faucet error for ${address.slice(0, 10)}...: ${e}`);
  }
}

async function signAndExecute(
  client: SuiClient,
  txBytes: string,
  signer: Ed25519Keypair
): Promise<any> {
  const intentMessage = await client.call("sui_getTransactionBlock", [
    { didTransactionBlock: txBytes },
  ]).catch(() => null);

  const pubkey = signer.getPublicKey();
  const msgBytes = Buffer.from(txBytes, "base64");

  const signature = signer.sign(msgBytes);

  const sigBytes = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(signature),
    Buffer.from(pubkey.toBytes()),
  ]);

  return client.call("sui_executeTransactionBlock", [
    txBytes,
    [Buffer.from(sigBytes).toString("base64")],
    { showObjectChanges: true, showEffects: true },
    "WaitForEffectsCert",
  ]);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("\n=== PlayStake Deploy Script ===\n");

  const oracleKey = process.env.ORACLE_PRIVATE_KEY;
  const playerKey = process.env.PLAYER_PRIVATE_KEY;
  const spectKey = process.env.SPECTATOR_PRIVATE_KEY;

  const oracle = oracleKey
    ? Ed25519Keypair.fromSecretKey(Buffer.from(oracleKey, "hex"))
    : Ed25519Keypair.generate();
  const player = playerKey
    ? Ed25519Keypair.fromSecretKey(Buffer.from(playerKey, "hex"))
    : Ed25519Keypair.generate();
  const spectator = spectKey
    ? Ed25519Keypair.fromSecretKey(Buffer.from(spectKey, "hex"))
    : Ed25519Keypair.generate();

  const oracleAddr = oracle.getPublicKey().toSuiAddress();
  const playerAddr = player.getPublicKey().toSuiAddress();
  const spectatorAddr = spectator.getPublicKey().toSuiAddress();

  console.log("Addresses:");
  console.log(`  Oracle:     ${oracleAddr}`);
  console.log(`  Player:     ${playerAddr}`);
  console.log(`  Spectator:  ${spectatorAddr}`);

  console.log("\nFunding from faucet...");
  await Promise.all([
    fundAddress(oracleAddr),
    fundAddress(playerAddr),
    fundAddress(spectatorAddr),
  ]);

  await sleep(6000);

  console.log("\nBalances:");
  for (const addr of [oracleAddr, playerAddr, spectatorAddr]) {
    const bal = await client.getBalance({ owner: addr });
    const sui = Number(bal.totalBalance) / 1e9;
    console.log(`  ${addr.slice(0, 10)}...: ${sui.toFixed(4)} SUI`);
  }

  const buildDir = join(__dirname, "../contracts/build/playstake/bytecode_modules");
  const moduleNames = ["market", "oracle", "settle", "player"];
  const modules = moduleNames.map(name =>
    readFileSync(join(buildDir, `${name}.mv`))
  );
  const deps = ["0x1", "0x2", "0xFEE"];

  console.log("\nBuilding publish transaction...");

  const txBytes = await client.call("unsafe_publish", [{
    sender: oracleAddr,
    compiled_modules: modules.map(m => Buffer.from(m).toString("base64")),
    dependencies: deps,
    gas_budget: "50000000",
  }]);

  console.log("Signing and executing...");

  const pubkey = oracle.getPublicKey();
  const msgBytes = Buffer.from(txBytes as string, "base64");
  const signature = oracle.sign(msgBytes);

  const sigBytes = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(signature),
    Buffer.from(pubkey.toBytes()),
  ]);

  const result = await client.call("sui_executeTransactionBlock", [
    (txBytes as string),
    [Buffer.from(sigBytes).toString("base64")],
    { showObjectChanges: true, showEffects: true },
    "WaitForEffectsCert",
  ]);

  const pkgChange = result.objectChanges?.find(
    (o: any) => o.type === "published"
  );
  const PACKAGE_ID = pkgChange?.packageId;

  if (!PACKAGE_ID) {
    console.error("\n\u274c Deployment failed — no PACKAGE_ID");
    console.error(JSON.stringify(result, null, 2).slice(0, 800));
    process.exit(1);
  }

  console.log(`\n\u2705 Deployment successful!`);
  console.log(`   PACKAGE_ID: ${PACKAGE_ID}`);
  console.log(`   Digest:     ${result.digest}`);

  await sleep(2000);
  const capObjs = await client.getOwnedObjects({
    owner: oracleAddr,
    filter: { StructType: `${PACKAGE_ID}::oracle::OracleCap` },
  });
  const ORACLE_CAP_ID = capObjs.data[0]?.data?.objectId ?? "";
  console.log(`   ORACLE_CAP_ID: ${ORACLE_CAP_ID || "(empty — check init)"}`);

  const oracleSecret = Buffer.from(oracle.export().secretKey).toString("hex");
  const playerSecret = Buffer.from(player.export().secretKey).toString("hex");
  const spectSecret = Buffer.from(spectator.export().secretKey).toString("hex");

  writeFileSync(join(__dirname, "../.env"),
    `PACKAGE_ID=${PACKAGE_ID}\nORACLE_CAP_ID=${ORACLE_CAP_ID}\n` +
    `ORACLE_PRIVATE_KEY=${oracleSecret}\nPLAYER_PRIVATE_KEY=${playerSecret}\n` +
    `SPECTATOR_PRIVATE_KEY=${spectSecret}\n`
  );
  writeFileSync(join(__dirname, "../frontend/.env"),
    `VITE_PACKAGE_ID=${PACKAGE_ID}\nVITE_RPC_URL=${RPC_URL}\nVITE_WS_URL=ws://localhost:3001\n`
  );
  writeFileSync(join(__dirname, "../oracle-relay/.env"),
    `PACKAGE_ID=${PACKAGE_ID}\nORACLE_PRIVATE_KEY=${oracleSecret}\n` +
    `ORACLE_CAP_ID=${ORACLE_CAP_ID}\nRPC_URL=${RPC_URL}\nWS_PORT=3001\n`
  );
  writeFileSync(join(__dirname, "../e2e/.env"),
    `PACKAGE_ID=${PACKAGE_ID}\nTEST_PLAYER_KEY=${playerSecret}\n` +
    `TEST_SPECTATOR_KEY=${spectSecret}\nTEST_ORACLE_KEY=${oracleSecret}\nRPC_URL=${RPC_URL}\n`
  );

  console.log("\n.env files updated: .env, frontend/.env, oracle-relay/.env, e2e/.env");
  console.log("\n=== Deploy Complete ===");
  console.log("\nNext steps:");
  console.log("  1. cd frontend && npm run dev");
  console.log("  2. cd oracle-relay && npm start");
  console.log("  3. npx tsx e2e/full_flow_test.ts");
}

main().catch(e => {
  console.error("\n\u274c Error:", e.message ?? e);
  process.exit(1);
});
