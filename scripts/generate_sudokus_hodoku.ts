import * as fs from "fs";
import {program} from "commander";
import {generate, rate, type Difficulty} from "hodoku-ts";
import {parseSudoku, stringifySudoku} from "../src/lib/engine/utility";
import {SimpleSudoku} from "../src/lib/engine/types";
import {createSeededRandom} from "../src/lib/engine/seededRandom";

program
  .version("0.0.1")
  .requiredOption("-n, --number <n>", "Number of sudokus to generate", (n) => parseInt(n, 10))
  .requiredOption(
    "-d, --difficulty <type>",
    "Difficulty [easy], [medium], [hard], [expert], [evil]",
    /^(easy|medium|hard|expert|evil)$/i,
  )
  .option("-t, --max-tries <n>", "Max generation attempts per puzzle", (n) => parseInt(n, 10), 200)
  .parse(process.argv);

const mapping: Record<string, Difficulty> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
  expert: "unfair",
  evil: "extreme",
};

const options = program.opts();
const difficulty: string = options.difficulty;
const hodokuDifficulty = mapping[difficulty];
const maxTries: number = options.maxTries;

function writeSudoku(sudoku: SimpleSudoku, score: number) {
  const printedSudoku = stringifySudoku(sudoku);
  console.log(`Write sudoku with score ${score}\n`, printedSudoku);
  fs.appendFileSync(`sudokus_${difficulty}.txt`, printedSudoku + "\n");
}

const number: number = options.number;
console.log(`Generate ${number} sudoku puzzles with difficulty "${difficulty}" (HoDoKu)`);

const randomFn = createSeededRandom(Math.random() * +new Date());
let i = 0;
while (i < number) {
  console.log("Generate sudoku " + (i + 1));
  const result = generate({difficulty: hodokuDifficulty, rng: randomFn, maxTries});
  if (!result) {
    console.log(`Could not generate a "${difficulty}" sudoku in ${maxTries} tries. Retrying.`);
    continue;
  }
  const board = result.givens.replace(/\./g, "0");
  const {score, difficulty: ratedDifficulty} = rate(board);
  console.log(`Generated sudoku rated "${ratedDifficulty}" with score ${score} and ${result.clues} clues.`);
  writeSudoku(parseSudoku(board), score);
  i++;
}
