import * as React from "react";
import {Cell, CellCoordinates} from "src/lib/engine/types";
import {getNextHint, NextHint} from "src/lib/game/hint";

export type HintStage = "idle" | "explain" | "located";

export interface HintFlow {
  stage: HintStage;
  hint: NextHint | null;
  open: () => void;
  showWhere: () => void;
  reveal: () => void;
  close: () => void;
  /** Drives the whole flow with a single trigger (used by the keyboard shortcut). */
  advance: () => void;
}

export function useHint(
  sudoku: Cell[],
  selectCell: (cellCoordinates: CellCoordinates) => void,
  setNumber: (cellCoordinates: CellCoordinates, number: number) => void,
  setNotes: (cellCoordinates: CellCoordinates, notes: number[]) => void,
): HintFlow {
  const [stage, setStage] = React.useState<HintStage>("idle");
  const [hint, setHint] = React.useState<NextHint | null>(null);

  const close = () => {
    setStage("idle");
    setHint(null);
  };

  const open = () => {
    setHint(getNextHint(sudoku));
    setStage("explain");
  };

  const showWhere = () => {
    if (hint?.target) {
      selectCell(hint.target);
    }
    setStage("located");
  };

  const reveal = () => {
    if (!hint) {
      close();
      return;
    }
    if (hint.value !== null) {
      setNumber(hint.target, hint.value);
    } else {
      for (const elimination of hint.eliminations) {
        const cell = sudoku.find(
          (c) => c.x === elimination.coordinates.x && c.y === elimination.coordinates.y,
        );
        if (cell) {
          setNotes(
            elimination.coordinates,
            cell.notes.filter((n) => n !== elimination.value),
          );
        }
      }
    }
    close();
  };

  const advance = () => {
    if (stage === "idle") {
      open();
    } else if (stage === "explain") {
      showWhere();
    } else {
      reveal();
    }
  };

  return {stage, hint, open, showWhere, reveal, close, advance};
}
