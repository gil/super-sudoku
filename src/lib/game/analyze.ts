import {rate, countSolutions, summarize, type Difficulty} from "hodoku-ts";
import {Cell} from "src/lib/engine/types";

export interface TechniqueUsage {
  technique: string;
  name: string;
  count: number;
  totalScore: number;
}

export interface SudokuAnalysis {
  score: number;
  difficulty: Difficulty;
  solved: boolean;
  /** 0 = invalid, 1 = unique, >= 2 = multiple solutions. */
  solutionCount: number;
  techniques: TechniqueUsage[];
}

/** Builds the 81-char board string from the puzzle's given clues. */
function initialBoardString(cells: Cell[]): string {
  const grid = new Array<string>(81).fill(".");
  for (const cell of cells) {
    if (cell.initial && cell.number !== 0) {
      grid[cell.y * 9 + cell.x] = String(cell.number);
    }
  }
  return grid.join("");
}

/** Combines rate, countSolutions and summarize into a single analysis of the puzzle. */
export function analyzeSudoku(cells: Cell[]): SudokuAnalysis {
  const board = initialBoardString(cells);
  const {score, difficulty, solved} = rate(board);
  const solutionCount = countSolutions(board);
  const techniques = summarize(board);
  return {score, difficulty, solved, solutionCount, techniques};
}
