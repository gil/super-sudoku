import {describe, expect, it} from "vitest";
import {getNextHint} from "./hint";
import {parseSudoku, simpleSudokuToCells} from "src/lib/engine/utility";

const BOARD = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79".replace(
  /\./g,
  "0",
);

describe("getNextHint", () => {
  it("returns a placement hint with mapped coordinates and value", () => {
    const cells = simpleSudokuToCells(parseSudoku(BOARD));
    const hint = getNextHint(cells);

    expect(hint).not.toBeNull();
    expect(hint!.target).toEqual({x: 4, y: 4});
    expect(hint!.value).toBe(5);
    expect(hint!.eliminations).toEqual([]);
  });

  it("returns null for a fully solved board", () => {
    const solved = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
    const cells = simpleSudokuToCells(parseSudoku(solved));
    expect(getNextHint(cells)).toBeNull();
  });
});
