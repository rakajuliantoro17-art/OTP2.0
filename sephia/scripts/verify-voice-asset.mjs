import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectSephiaWav } from "./wav-asset-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetPath = join(root, "assets", "sephia-announcement.wav");

let bytes;
try {
  bytes = await readFile(assetPath);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.warn("BLOCKED: sephia/assets/sephia-announcement.wav has not been supplied.");
    console.warn("No placeholder audio is generated. Production voice remains disabled.");
    process.exit(0);
  }
  throw error;
}

const metadata = inspectSephiaWav(bytes);
const sha256 = createHash("sha256").update(bytes).digest("hex");
console.log(JSON.stringify({ asset: "assets/sephia-announcement.wav", sha256, ...metadata }, null, 2));
