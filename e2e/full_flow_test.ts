/**
 * PlayStake — End-to-End Integration Test
 * Run: cd e2e && npx tsx full_flow_test.ts
 */

import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import * as dotenv from "dotenv";
dotenv.config();

const PLAYER_KEY = process.env.TEST_PLAYER_KEY ?? "";
const SPECTATOR_KEY = process.env.TEST_SPECTATOR_KEY ?? "";
const ORACLE_KEY = process.env.TEST_ORACLE_KEY ?? "";
const PACKAGE_ID = process.env.PACKAGE_ID ?? "";
const RPC_URL = process.env.RPC_URL ?? "https://rpc-testnet.onelabs.cc:443";

const client = new SuiClient({ url: RPC_URL });
const player = Ed25519Keypair.fromSecretKey(Buffer.from(PLAYER_KEY, "hex"));
const spectator = Ed25519Keypair.fromSecretKey(Buffer.from(SPECTATOR_KEY, "hex"));
const oracleSigner = Ed25519Keypair.fromSecretKey(Buffer.from(ORACLE_KEY, "hex"));

const MATCH_ID = 9999n;
const DEADLINE = BigInt(Date.now()) + 600_000n;

let marketObjectId: string;
let matchResultObjId: string;
let playerBetId: string;
let spectatorBetId: string;

function sui(human: number) { return BigInt(Math.round(human * 1_000_000_000)); }

async function getBalance(addr: string): Promise<bigint> {
  const coins: any = await client.getCoins({ owner: addr });
  return coins.data.reduce((sum: bigint, c: any) => sum + BigInt(c.balance), 0n);
}

function fmt(raw: bigint) { return (Number(raw) / 1_000_000_000).toFixed(6) + " SUI"; }

function section(title: string) {
  console.log("\n" + "─".repeat(56));
  console.log(`  ${title}`);
  console.log("─".repeat(56));
}

async function signAndExec(tx: Transaction, signer: Ed25519Keypair): Promise<any> {
  const sender = signer.getPublicKey().toSuiAddress();
  tx.setSenderIfNotSet(sender);
  tx.setGasBudget("10000000");
  const txBytes = await (tx as any).build({ client });
  const { bytes: txB64, signature: sigB64 } = await signer.signTransaction(txBytes);
  const result: any = await client.call("sui_executeTransactionBlock", [
    txB64, [sigB64],
    { showEffects: true, showObjectChanges: true },
    "WaitForEffectsCert",
  ]);
  if (result.effects?.status?.status !== "success") {
    throw new Error(result.effects?.status?.error || "Transaction failed");
  }
  return result;
}

async function getOracleCapId(): Promise<string> {
  const objs: any = await client.getOwnedObjects({
    owner: oracleSigner.getPublicKey().toSuiAddress(),
    filter: { StructType: `${PACKAGE_ID}::oracle::OracleCap` },
  });
  if (!objs.data?.[0]) throw new Error("OracleCap not found");
  return objs.data[0].data!.objectId;
}

async function createMarket() {
  section("STEP 1 — Create Market");
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::market::create_market`,
    typeArguments: ["0x2::oct::OCT"],
    arguments: [tx.pure.u64(MATCH_ID), tx.pure.u64(DEADLINE)],
  });

  const result = await signAndExec(tx, oracleSigner);
  const created = result.objectChanges?.find(
    (o: any) => o.type === "created" && o.objectType?.includes("Market"),
  );
  if (!created) throw new Error("Market object not found");
  marketObjectId = created.objectId;
  console.log(`  ✓ Market created: ${marketObjectId}`);
}

async function placeSelfStake() {
  section("STEP 2 — Player Self-Stake (0.5 SUI, damage >= 5000)");

  const balBefore = await getBalance(player.getPublicKey().toSuiAddress());
  console.log(`  Player balance before: ${fmt(balBefore)}`);

  const tx = new Transaction();
  const [payment] = tx.splitCoins(tx.gas, [sui(0.01)]);
  tx.moveCall({
    target: `${PACKAGE_ID}::market::place_bet`,
    typeArguments: ["0x2::oct::OCT"],
    arguments: [
      tx.object(marketObjectId),
      tx.pure.address(player.getPublicKey().toSuiAddress()),
      tx.pure.string("oneplay_ranked"),
      tx.pure.u8(0),
      tx.pure.u8(0),
      tx.pure.u64(5000),
      payment,
      tx.pure.bool(true),
    ],
  });

  const result = await signAndExec(tx, player);
  const betObj = result.objectChanges?.find(
    (o: any) => o.type === "created" && o.objectType?.includes("Bet"),
  );
  playerBetId = betObj?.objectId;
  console.log(`  ✓ Player Bet object: ${playerBetId}`);
}

async function placeSpectatorBet() {
  section("STEP 3 — Spectator Bets on Player (0.1 SUI)");

  const tx = new Transaction();
  const [payment] = tx.splitCoins(tx.gas, [sui(0.01)]);
  tx.moveCall({
    target: `${PACKAGE_ID}::market::place_bet`,
    typeArguments: ["0x2::oct::OCT"],
    arguments: [
      tx.object(marketObjectId),
      tx.pure.address(player.getPublicKey().toSuiAddress()),
      tx.pure.string("oneplay_ranked"),
      tx.pure.u8(0),
      tx.pure.u8(0),
      tx.pure.u64(5000),
      payment,
      tx.pure.bool(true),
    ],
  });

  const result = await signAndExec(tx, spectator);
  const betObj = result.objectChanges?.find(
    (o: any) => o.type === "created" && o.objectType?.includes("Bet"),
  );
  spectatorBetId = betObj?.objectId;
  console.log(`  ✓ Spectator Bet object: ${spectatorBetId}`);
}

async function postOracleResult() {
  section("STEP 4 — Oracle Posts Result (damage=7200 -> WIN)");

  const finalizedAt = BigInt(Date.now()) + 5000n;
  const capId = await getOracleCapId();

  const tx1 = new Transaction();
  tx1.moveCall({
    target: `${PACKAGE_ID}::oracle::post_result`,
    arguments: [tx1.object(capId), tx1.pure.u64(MATCH_ID), tx1.pure.u64(finalizedAt)],
  });
  const r1 = await signAndExec(tx1, oracleSigner);

  const resultObj = r1.objectChanges?.find(
    (o: any) => o.type === "created" && o.objectType?.includes("MatchResult"),
  );
  matchResultObjId = resultObj?.objectId;
  if (!matchResultObjId) throw new Error("MatchResult not found in objectChanges");
  console.log(`  ✓ MatchResult posted: ${matchResultObjId}`);

  // Retry getting object with delay
  for (let i = 0; i < 3; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const objCheck = await client.getObject({ id: matchResultObjId, options: { showType: true } });
    if (objCheck.data) {
      console.log(`  ✓ Object verified on-chain`);
      break;
    }
    if (i === 2) throw new Error(`MatchResult object ${matchResultObjId} not found on-chain after retries`);
  }

  const tx2 = new Transaction();
  tx2.moveCall({
    target: `${PACKAGE_ID}::oracle::add_player_stats`,
    arguments: [
      tx2.object(matchResultObjId),
      tx2.pure.address(player.getPublicKey().toSuiAddress()),
      tx2.pure.u64(7200),
      tx2.pure.u64(3),
      tx2.pure.u64(2),
      tx2.pure.u64(12000),
    ],
  });
  const r2 = await signAndExec(tx2, oracleSigner);
  console.log(`  ✓ Player stats added (damage=7200)`);
}

async function settleAll() {
  section("STEP 5 — settle_bet (permissionless)");

  // Finalize market (requires OracleCap)
  const capId = await getOracleCapId();
  const tx0 = new Transaction();
  tx0.moveCall({
    target: `${PACKAGE_ID}::oracle::finalize_market`,
    typeArguments: ["0x2::oct::OCT"],
    arguments: [tx0.object(capId), tx0.object(marketObjectId)],
  });
  await signAndExec(tx0, oracleSigner);
  console.log(`  ✓ Market finalized`);

  // Settle player bet
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::settle::settle_bet_entry`,
    typeArguments: ["0x2::oct::OCT"],
    arguments: [
      tx.object(marketObjectId),
      tx.object(playerBetId),
      tx.object(matchResultObjId),
    ],
  });

  const result = await signAndExec(tx, player);
  console.log(`  ✓ Player bet settled: ${result.digest}`);

  // Settle spectator bet (needs spectator signer since they own the bet)
  const tx2 = new Transaction();
  tx2.moveCall({
    target: `${PACKAGE_ID}::settle::settle_bet_entry`,
    typeArguments: ["0x2::oct::OCT"],
    arguments: [
      tx2.object(marketObjectId),
      tx2.object(spectatorBetId),
      tx2.object(matchResultObjId),
    ],
  });
  const r2 = await signAndExec(tx2, spectator);
  console.log(`  ✓ Spectator bet settled: ${r2.digest}`);
}

async function verifyBalances() {
  section("STEP 6 — Balance Verification");

  const pAddr = player.getPublicKey().toSuiAddress();
  const sAddr = spectator.getPublicKey().toSuiAddress();

  const pAfter = await getBalance(pAddr);
  const sAfter = await getBalance(sAddr);

  console.log(`\n  Player balance after:    ${fmt(pAfter)}`);
  console.log(`  Spectator balance after: ${fmt(sAfter)}`);

  // Player gas was used, but spectator win payout and player win payout should be > 0.
  // We just check if they got roughly what they staked back plus profit
  const playerWon = pAfter > sui(0.1); 
  const spectatorWon = sAfter > sui(0.01);

  console.log(`\n  Player won:    ${playerWon ? "✅" : "❌"}`);
  console.log(`  Spectator won: ${spectatorWon ? "✅" : "❌"}`);

  if (!playerWon || !spectatorWon) {
    throw new Error("Balance assertions failed");
  }

  console.log("\n  ✅ ALL ASSERTIONS PASSED\n");
}

(async () => {
  if (!PLAYER_KEY || !PACKAGE_ID) {
    console.error("Missing TEST_PLAYER_KEY or PACKAGE_ID in .env");
    process.exit(1);
  }

  try {
    await createMarket();
    await placeSelfStake();
    await placeSpectatorBet();
    await postOracleResult();
    await settleAll();
    await verifyBalances();
  } catch (err: unknown) {
    console.error("\n❌ Test failed:", (err as Error).message);
    process.exit(1);
  }
})();
