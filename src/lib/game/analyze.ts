import {rate, countSolutions, summarize, solve, type Difficulty} from "hodoku-ts";
import {Cell} from "src/lib/engine/types";

export interface TechniqueUsage {
  technique: string;
  name: string;
  count: number;
  totalScore: number;
}

export interface SolveCellRef {
  row: number;
  col: number;
  value: number;
}

export interface SolveStep {
  technique: string;
  name: string;
  difficulty: Difficulty;
  score: number;
  explanation: string;
  placements: SolveCellRef[];
  eliminations: SolveCellRef[];
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

/** Full step-by-step solve path. Expensive — compute on demand. */
export function solveSteps(cells: Cell[]): SolveStep[] {
  const board = initialBoardString(cells);
  return solve(board).steps.map((step) => ({
    technique: step.technique,
    name: step.name,
    difficulty: step.difficulty,
    score: step.score,
    explanation: step.explanation,
    placements: step.placements.map((p) => ({row: p.row, col: p.col, value: p.value})),
    eliminations: step.eliminations.map((e) => ({row: e.row, col: e.col, value: e.value})),
  }));
}
