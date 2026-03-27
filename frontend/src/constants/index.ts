export const NETWORK = "testnet" as const;

export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID as string;

export const ORACLE_CAP_ID = import.meta.env.VITE_ORACLE_CAP_ID as string || "";

export const MODULES = {
  market: `${PACKAGE_ID}::market`,
  oracle: `${PACKAGE_ID}::oracle`,
  settle: `${PACKAGE_ID}::settle`,
  player: `${PACKAGE_ID}::player`,
} as const;

export const USDO_TYPE = "0x2::sui::SUI";

export const TREASURY_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000FEE";

export const ORACLE_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000C00";

export const WS_URL = "ws://localhost:3001";
export const RPC_URL = import.meta.env.VITE_RPC_URL || "https://rpc-testnet.onelabs.cc:443";

export const STAT = {
  DAMAGE:    0,
  KILLS:     1,
  PLACEMENT: 2,
  GOLD:      3,
} as const;

export const OP = {
  GTE: 0,
  LTE: 1,
  EQ:  2,
} as const;

export type StatKey     = keyof typeof STAT;
export type OperatorKey = keyof typeof OP;

export const USDO_DECIMALS = 9;
export const toUsdo  = (raw: bigint) => Number(raw) / 10 ** USDO_DECIMALS;
export const fromUsdo = (human: number) => BigInt(Math.round(human * 10 ** USDO_DECIMALS));

export const KNOWN_MARKET_IDS: string[] = [];
