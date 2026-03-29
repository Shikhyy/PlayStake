import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import { execSync } from "child_process";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const ORACLE_KEY = process.env.TEST_ORACLE_KEY ?? "";
const RPC_URL = process.env.RPC_URL ?? "https://rpc-testnet.onelabs.cc:443";

if (!ORACLE_KEY) {
  console.error("Missing TEST_ORACLE_KEY in .env");
  process.exit(1);
}

const client = new SuiClient({ url: RPC_URL });
const oracleSigner = Ed25519Keypair.fromSecretKey(Buffer.from(ORACLE_KEY, "hex"));
const oracleAddress = oracleSigner.getPublicKey().toSuiAddress();

async function deploy() {
  console.log(`Deploying with Oracle Address: ${oracleAddress}`);
  
  // Build Move contract
  console.log("Compiling Move contracts...");
  const contractsPath = path.resolve(__dirname, "../contracts");
  
  // We use standard sui cli which provides dump-bytecode-as-base64
  let buildOutput: Buffer;
  try {
    buildOutput = execSync(`sui move build --dump-bytecode-as-base64 --path ${contractsPath}`, { encoding: "utf-8" }) as any;
  } catch (err: any) {
    console.error("Failed to build contracts:");
    console.error(err.stdout ? err.stdout.toString() : err.message);
    process.exit(1);
  }

  const outputStr = buildOutput.toString();
  let buildJson;
  try {
    buildJson = JSON.parse(outputStr);
  } catch (err) {
    console.error("Failed to parse build output as JSON:", outputStr);
    process.exit(1);
  }

  const { modules, dependencies } = buildJson;
  if (!modules || modules.length === 0) {
    console.error("No modules compiled");
    process.exit(1);
  }

  console.log(`Publishing ${modules.length} modules...`);

  const tx = new Transaction();
  tx.setGasBudget(100000000); // 0.1 SUI
  
  const upgradeCap = tx.publish({
    modules,
    dependencies,
  });
  
  // Transfer upgrade cap to deployer
  tx.transferObjects([upgradeCap], tx.pure.address(oracleAddress));

  tx.setSenderIfNotSet(oracleAddress);
  const txBytes = await tx.build({ client });
  const { bytes: txB64, signature: sigB64 } = await oracleSigner.signTransaction(txBytes);
  
  const result: any = await client.call("sui_executeTransactionBlock", [
    txB64,
    [sigB64],
    { showEffects: true, showObjectChanges: true },
    "WaitForEffectsCert",
  ]);

  if (result.effects?.status?.status !== "success") {
    console.error("Publish failed:", result.effects?.status?.error);
    process.exit(1);
  }

  let packageId = "";
  let oracleCapId = "";

  for (const change of result.objectChanges || []) {
    if (change.type === "published") {
      packageId = change.packageId;
    } else if (change.type === "created" && change.objectType.includes("::oracle::OracleCap")) {
      oracleCapId = change.objectId;
    }
  }

  console.log("\n=================================");
  console.log("DEPLOYMENT SUCCESSFUL");
  console.log("=================================");
  console.log(`PACKAGE_ID=${packageId}`);
  console.log(`ORACLE_CAP_ID=${oracleCapId}`);
  console.log("=================================\n");
  
  // Optionally, we could auto-update the env files here, but let's just log them so the agent can do it safely.
}

deploy().catch((e) => {
  console.error("Deployment crashed:", e);
});
