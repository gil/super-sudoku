import * as fs from "fs";
import * as os from "os";
import {fileURLToPath} from "node:url";
import {Worker} from "node:worker_threads";

const workerPath = fileURLToPath(new URL("./count_difficulties_worker.mjs", import.meta.url));

const TIMEOUT_MS = 60_000;
const POOL_SIZE = Math.max(1, os.cpus().length);

interface CountResult {
  total: number;
  difficulties: Record<string, number>;
}

/** Single worker that rates one board at a time, terminating and respawning when a puzzle hangs. */
class Rater {
  private worker = new Worker(workerPath);

  rate(board: string): Promise<string> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.worker.terminate();
        this.worker = new Worker(workerPath);
        resolve("timeout");
      }, TIMEOUT_MS);

      this.worker.once("message", (difficulty: string) => {
        clearTimeout(timer);
        resolve(difficulty);
      });
      this.worker.postMessage(board);
    });
  }

  close() {
    return this.worker.terminate();
  }
}

function readBoards(file: string): string[] {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[.0-9]{81}$/.test(l));
}

/** Rates every puzzle in a txt file using a pool of timeout-guarded workers. */
async function countDifficulties(file: string): Promise<CountResult> {
  const pool = Array.from({length: POOL_SIZE}, () => new Rater());
  const lines = readBoards(file);

  const difficulties: Record<string, number> = {easy: 0, medium: 0, hard: 0, unfair: 0, extreme: 0};
  let next = 0;
  let done = 0;

  await Promise.all(
    pool.map(async (rater) => {
      while (next < lines.length) {
        const board = lines[next++].replace(/\./g, "0");
        const difficulty = await rater.rate(board);
        difficulties[difficulty] = (difficulties[difficulty] ?? 0) + 1;
        done++;
        if (done % 100 === 0 || done === lines.length) {
          console.error(`    ${done}/${lines.length} (${Math.round((done / lines.length) * 100)}%)`);
        }
      }
    }),
  );

  await Promise.all(pool.map((r) => r.close()));
  return {total: lines.length, difficulties};
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: count_difficulties.ts <file>");
    process.exit(1);
  }
  console.error(`Rating ${file} (pool ${POOL_SIZE}, timeout ${TIMEOUT_MS}ms)`);
  const result = await countDifficulties(file);
  console.log(JSON.stringify(result));
}

main();
