/**
 * PlayStake Oracle Relay
 * Listens to OnePlay SDK match events, posts verified results on-chain,
 * and broadcasts them to connected frontend clients via WebSocket.
 */

import { SuiClient } from "@onelabs/sui/client";
import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { Transaction } from "@onelabs/sui/transactions";
import { WebSocketServer, WebSocket } from "ws";
import * as dotenv from "dotenv";
import { createServer } from "http";

dotenv.config();

const PACKAGE_ID = process.env.PACKAGE_ID ?? "";
const ORACLE_KEY = process.env.ORACLE_PRIVATE_KEY ?? "";
const ORACLE_CAP_ID = process.env.ORACLE_CAP_ID ?? "";
const RPC_URL = process.env.RPC_URL ?? "https://rpc-testnet.onelabs.cc:443";
const WS_PORT = parseInt(process.env.WS_PORT ?? "3001", 10);
const MAX_RETRIES = 3;

if (!PACKAGE_ID || !ORACLE_KEY) {
  console.error("Missing PACKAGE_ID or ORACLE_PRIVATE_KEY in .env");
  process.exit(1);
}

const client = new SuiClient({ url: RPC_URL });
const oracle = Ed25519Keypair.fromSecretKey(Buffer.from(ORACLE_KEY, "hex"));
const oracleAddr = oracle.getPublicKey().toSuiAddress();

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

const subscribers = new Map<string, Set<WebSocket>>();
const gameClients = new Map<string, WebSocket>();

wss.on("connection", (ws, req) => {
  const url = req.url ?? "";
  
  if (url.startsWith("/match/")) {
    const matchId = url.split("/match/")[1]?.split("?")[0] ?? "";
    if (!subscribers.has(matchId)) subscribers.set(matchId, new Set());
    subscribers.get(matchId)!.add(ws);
    ws.on("close", () => {
      subscribers.get(matchId)?.delete(ws);
      if (subscribers.get(matchId)?.size === 0) subscribers.delete(matchId);
    });
    console.log(`[ws] Frontend subscribed to match ${matchId}`);
  } else if (url.startsWith("/game/")) {
    const gameId = url.split("/game/")[1]?.split("?")[0] ?? "";
    gameClients.set(gameId, ws);
    ws.on("close", () => gameClients.delete(gameId));
    console.log(`[ws] Game client registered for game ${gameId}`);
    
    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        await handleGameEvent(gameId, msg, ws);
      } catch (e) {
        console.error("[ws] Invalid message:", data.toString());
      }
    });
  }
});

async function handleGameEvent(gameId: string, msg: any, ws: WebSocket) {
  const { type, payload } = msg;
  
  switch (type) {
    case "match_completed": {
      const { matchId, playerStats, finalizedAt } = payload;
      console.log(`[oracle] Match ${matchId} completed — posting on-chain`);
      
      try {
        const result = await postResultOnChain(
          BigInt(matchId),
          BigInt(finalizedAt || Date.now() + 5000),
          playerStats,
        );
        
        const broadcastPayload = {
          type: "match_result_posted",
          payload: {
            matchId,
            resultTx: result.postResultDigest,
            statsTx: result.statsDigest,
          },
        };
        
        broadcast(matchId.toString(), broadcastPayload);
        ws.send(JSON.stringify({ type: "ack", payload: { matchId, success: true } }));
      } catch (err: any) {
        console.error(`[oracle] Failed to post result: ${err.message}`);
        ws.send(JSON.stringify({ type: "error", payload: { matchId, error: err.message } }));
      }
      break;
    }
    
    case "match_update": {
      const { matchId, data } = payload;
      broadcast(matchId.toString(), { type: "match_update", payload: data });
      break;
    }
    
    default:
      console.log(`[ws] Unknown event type: ${type}`);
  }
}

function broadcast(matchId: string, payload: object) {
  const msg = JSON.stringify(payload);
  subscribers.get(matchId)?.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg).catch(console.error);
    }
  });
}

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

async function signAndExecute(tx: Transaction): Promise<string> {
  const txBytes = await (tx as any).build({ client });
  const { bytes: txB64, signature: sigB64 } = await oracle.signTransaction(txBytes);
  const result: any = await rpcCall("sui_executeTransactionBlock", [
    txB64,
    [sigB64],
    { showEffects: true, showObjectChanges: true },
    "WaitForEffectsCert",
  ]);
  if (result.effects?.status?.status !== "success") {
    throw new Error(result.effects?.status?.error || "Transaction failed");
  }
  return result.digest;
}

async function getOracleCapId(): Promise<string> {
  if (ORACLE_CAP_ID) return ORACLE_CAP_ID;
  const objs: any = await client.getOwnedObjects({
    owner: oracleAddr,
    filter: { StructType: `${PACKAGE_ID}::oracle::OracleCap` },
  });
  if (!objs.data?.[0]) throw new Error("OracleCap not found");
  return objs.data[0].data!.objectId;
}

interface PlayerStat {
  address: string;
  damage: number;
  kills: number;
  placement: number;
  gold: number;
}

async function postResultOnChain(
  matchId: bigint,
  finalizedAt: bigint,
  playerStats: PlayerStat[],
  attempt = 0,
): Promise<{ postResultDigest: string; matchResultObjId: string; statsDigest: string }> {
  try {
    const capObj = await getOracleCapId();

    const tx1 = new Transaction();
    tx1.setSenderIfNotSet(oracleAddr);
    tx1.setGasBudget("10000000");
    tx1.moveCall({
      target: `${PACKAGE_ID}::oracle::post_result`,
      arguments: [
        tx1.object(capObj),
        tx1.pure.u64(matchId),
        tx1.pure.u64(finalizedAt),
      ],
    });
    const postResultDigest = await signAndExecute(tx1);

    const changes = [];
    try {
      const txResult: any = await rpcCall("sui_getTransactionBlock", {
        digest: postResultDigest,
        options: { showObjectChanges: true },
      });
      changes.push(...(txResult.objectChanges || []));
    } catch {}

    let matchResultObjId = "";
    for (const change of changes) {
      if (change.type === "created" && change.objectType?.includes("MatchResult")) {
        matchResultObjId = change.objectId;
        break;
      }
    }

    if (!matchResultObjId) {
      throw new Error("MatchResult object not found in transaction effects");
    }

    let statsDigest = "";
    if (playerStats.length > 0) {
      const tx2 = new Transaction();
      tx2.setSenderIfNotSet(oracleAddr);
      tx2.setGasBudget("10000000");
      for (const p of playerStats) {
        tx2.moveCall({
          target: `${PACKAGE_ID}::oracle::add_player_stats`,
          arguments: [
            tx2.object(matchResultObjId),
            tx2.pure.address(p.address),
            tx2.pure.u64(p.damage),
            tx2.pure.u64(p.kills),
            tx2.pure.u64(p.placement),
            tx2.pure.u64(p.gold),
          ],
        });
      }
      statsDigest = await signAndExecute(tx2);
    }

    console.log(`[oracle] Match ${matchId} posted — tx: ${postResultDigest}`);
    if (statsDigest) console.log(`[oracle] Stats added — tx: ${statsDigest}`);
    return { postResultDigest, matchResultObjId, statsDigest };
  } catch (err: any) {
    if (attempt >= MAX_RETRIES) throw err;
    const delay = Math.pow(2, attempt) * 1000;
    console.warn(`[oracle] Retry ${attempt + 1} in ${delay}ms — ${err.message}`);
    await sleep(delay);
    return postResultOnChain(matchId, finalizedAt, playerStats, attempt + 1);
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

httpServer.listen(WS_PORT, () => {
  console.log(`[relay] PlayStake Oracle Relay started`);
  console.log(`[relay] WebSocket server listening on port ${WS_PORT}`);
  console.log(`[relay] Endpoints:`);
  console.log(`[relay]   - /game/<gameId>   : Game clients report match results`);
  console.log(`[relay]   - /match/<matchId> : Frontends subscribe to match updates`);
});

export { broadcast, postResultOnChain };
