import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { HDKey } from "@scure/bip32";

const MNEMONIC = process.argv[2] || "awful world layer also pluck castle ignore keep observe arrive jacket robust";

const seed = sha512(Buffer.from(MNEMONIC));
const hdKey = HDKey.fromMasterSeed(seed);

const paths = [
  "m/44'/784'/0'/0'/0'",
  "m/44'/784'/0'/0/0'",
  "m/44'/784'/0'/0/0",
];

console.log("Trying derivation paths:\n");

for (const path of paths) {
  try {
    const childKey = hdKey.derive(path);
    if (childKey.privateKey) {
      const keypair = Ed25519Keypair.fromSecretKey(childKey.privateKey);
      console.log(`${path}: ${keypair.getPublicKey().toSuiAddress()}`);
    }
  } catch (e: any) {
    console.log(`${path}: ERROR - ${e.message}`);
  }
}

console.log("\n---");
console.log("Your address: 0x66d8c3a913cef5a6d52750aafb24862abcafd415f656b68ae76d7b5e126cccbd");
