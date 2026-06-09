import {spawn} from "node:child_process";
import * as fs from "fs";
import * as path from "path";
import {fileURLToPath} from "node:url";

const dir = "public/sudokus/extra";
const indexPath = path.join(dir, "index.json");
const countScript = fileURLToPath(new URL("./count_difficulties.ts", import.meta.url));

interface Entry {
  file: string;
  name: string;
  description: string;
  total?: number;
  difficulties?: Record<string, number>;
}

interface CountResult {
  total: number;
  difficulties: Record<string, number>;
}

/** Spawns count_difficulties.ts for one file and parses its JSON stdout. */
function countFile(file: string): Promise<CountResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["exec", "vite-node", countScript, file], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`count_difficulties exited with code ${code}`));
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(new Error(`Failed to parse output: ${out}\n${e}`));
      }
    });
  });
}

const entries: Entry[] = JSON.parse(fs.readFileSync(indexPath, "utf8"));

async function main() {
  for (const entry of entries) {
    if (entry.difficulties) {
      console.error(`Skip "${entry.name}" (already counted)`);
      continue;
    }
    console.error(`Counting "${entry.name}" (${entry.file})...`);
    const {total, difficulties} = await countFile(path.join(dir, entry.file));
    entry.total = total;
    entry.difficulties = difficulties;
    console.error(`  ${total} puzzles ->`, difficulties);
    fs.writeFileSync(indexPath, JSON.stringify(entries, null, 2) + "\n");
  }
  console.error("Done.");
}

main();
