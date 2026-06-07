import {hint as hodokuHint, type Hint as HodokuHint} from "hodoku-ts";
import {Cell, CellCoordinates} from "src/lib/engine/types";

export interface NextHint {
  technique: string;
  /** English technique name from hodoku. */
  name: string;
  /** Cell to focus on for "Show me where". */
  target: CellCoordinates;
  /** Value to place when the step fills a cell; null for elimination-only steps. */
  value: number | null;
  /** Candidates the step removes (for elimination steps). */
  eliminations: {coordinates: CellCoordinates; value: number}[];
}

function indexToCoordinates(index: number): CellCoordinates {
  return {x: index % 9, y: Math.floor(index / 9)};
}

function currentBoardString(cells: Cell[]): string {
  const grid = new Array<string>(81).fill(".");
  for (const cell of cells) {
    if (cell.number !== 0) {
      grid[cell.y * 9 + cell.x] = String(cell.number);
    }
  }
  return grid.join("");
}

function toNextHint(h: HodokuHint): NextHint {
  const placement = h.placements[0];
  const eliminations = h.eliminations.map((e) => ({
    coordinates: indexToCoordinates(e.index),
    value: e.value,
  }));
  const target = placement ? indexToCoordinates(placement.index) : eliminations[0]?.coordinates;
  return {
    technique: h.technique,
    name: h.name,
    target,
    value: placement ? placement.value : null,
    eliminations,
  };
}

/** Computes the next logical move for the current board, or null if none is found. */
export function getNextHint(cells: Cell[]): NextHint | null {
  try {
    const h = hodokuHint(currentBoardString(cells));
    return h ? toNextHint(h) : null;
  } catch {
    return null;
  }
}
