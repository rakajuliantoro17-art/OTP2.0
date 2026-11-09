import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "src");
const outputDir = join(root, "dist");
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(absolute);
  }
  return files.sort();
}

const sourceFiles = await walk(sourceDir);
if (sourceFiles.length === 0) throw new Error("SEPHIA build refused: src contains no JavaScript modules.");

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  const imports = source.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g);
  for (const match of imports) {
    const target = resolve(dirname(file), match[1]);
    const rel = relative(sourceDir, target);
    if (rel.startsWith(".." + sep) || rel === "..") {
      throw new Error("SEPHIA build refused: import escapes src boundary: " + match[1]);
    }
    try { await readFile(target); }
    catch { throw new Error("SEPHIA build refused: unresolved local import " + match[1] + " in " + relative(sourceDir, file)); }
  }
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });

const files = [];
for (const file of sourceFiles) {
  const content = await readFile(file);
  files.push({
    path: relative(sourceDir, file).split(sep).join("/"),
    bytes: content.byteLength,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}
const manifest = {
  name: "SEPHIA",
  version: packageJson.version,
  format: "browser-esm",
  entrypoint: "host/mount-panitia-sephia.js",
  source: "src/",
  output: "dist/",
  buildId: process.env.GITHUB_SHA || "local",
  files,
};
await writeFile(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log("SEPHIA build complete:", files.length, "modules;", files.reduce((n, f) => n + f.bytes, 0), "source bytes.");
console.log("Output:", outputDir);
