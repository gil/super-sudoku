import * as React from "react";
import {useTranslation} from "react-i18next";
import hotkeys from "hotkeys-js";

import Button from "src/components/Button";
import {parseSudoku} from "src/lib/engine/utility";
import {SimpleSudoku} from "src/lib/engine/types";

const normalizeLine = (line: string) => line.replace(/[\s.]/g, (c) => (c === "." ? "0" : ""));

const isQuotaError = (e: unknown) =>
  e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");

const CHUNK_SIZE = 500;
const MAX_SHOWN_ERRORS = 20;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const ImportSudokuModal: React.FC<{
  onImport: (sudokus: SimpleSudoku[]) => void | Promise<void>;
  onClose: () => void;
}> = ({onImport, onClose}) => {
  const {t} = useTranslation();
  const [input, setInput] = React.useState("");
  const [lineErrors, setLineErrors] = React.useState<{line: number; error: string}[]>([]);
  const [progress, setProgress] = React.useState<{done: number; total: number} | null>(null);
  const isImporting = progress !== null;

  React.useEffect(() => {
    const previousScope = hotkeys.getScope();
    hotkeys("escape", "ImportSudokuModal", () => {
      if (!isImporting) {
        onClose();
      }
      return false;
    });
    hotkeys.setScope("ImportSudokuModal");
    return () => {
      hotkeys.deleteScope("ImportSudokuModal");
      hotkeys.setScope(previousScope);
    };
  }, [onClose, isImporting]);

  const handleImport = async () => {
    const lines = input
      .split("\n")
      .map((line, index) => ({raw: line, index}))
      .filter(({raw}) => raw.trim() !== "");

    if (lines.length === 0) {
      setLineErrors([{line: 0, error: t("import_sudoku_empty")}]);
      return;
    }

    setLineErrors([]);
    setProgress({done: 0, total: lines.length});

    const sudokus: SimpleSudoku[] = [];
    const errors: {line: number; error: string}[] = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      for (const {raw, index} of chunk) {
        try {
          sudokus.push(parseSudoku(normalizeLine(raw)));
        } catch (e) {
          errors.push({line: index + 1, error: e instanceof Error ? e.message : String(e)});
        }
      }
      setProgress({done: Math.min(i + CHUNK_SIZE, lines.length), total: lines.length});
      // Yield to the browser so the progress bar can paint between chunks.
      await nextFrame();
    }

    if (sudokus.length > 0) {
      try {
        await onImport(sudokus);
      } catch (e) {
        setProgress(null);
        setLineErrors([
          {line: 0, error: isQuotaError(e) ? t("import_sudoku_quota") : e instanceof Error ? e.message : String(e)},
        ]);
        return;
      }
    }
    setProgress(null);
    if (errors.length > 0) {
      setLineErrors(errors);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 text-black shadow-xl dark:bg-gray-800 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("import_sudoku_title")}</h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="text-2xl leading-none text-gray-500 hover:text-black dark:hover:text-white"
          >
            ×
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{t("import_sudoku_description")}</p>

        <textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("import_sudoku_placeholder")}
          rows={8}
          wrap="off"
          disabled={isImporting}
          className="w-full resize-y overflow-x-auto rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-black focus:border-teal-500 focus:outline-hidden disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />

        {progress && (
          <div className="mt-3">
            <div className="mb-1 text-sm text-gray-600 dark:text-gray-300">
              {t("import_sudoku_progress", {done: progress.done, total: progress.total})}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{width: `${progress.total === 0 ? 0 : (progress.done / progress.total) * 100}%`}}
              />
            </div>
          </div>
        )}

        {lineErrors.length > 0 && (
          <ul className="mt-3 list-inside list-disc rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/50 dark:text-red-200">
            {lineErrors.slice(0, MAX_SHOWN_ERRORS).map(({line, error}) => (
              <li key={`${line}-${error}`}>{line > 0 ? t("import_sudoku_line_error", {line, error}) : error}</li>
            ))}
            {lineErrors.length > MAX_SHOWN_ERRORS && (
              <li className="list-none font-medium">
                {t("import_sudoku_more_errors", {count: lineErrors.length - MAX_SHOWN_ERRORS})}
              </li>
            )}
          </ul>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} disabled={isImporting}>
            {t("close")}
          </Button>
          <Button
            className="bg-teal-600 text-white dark:bg-teal-600"
            onClick={handleImport}
            disabled={isImporting}
          >
            {isImporting ? t("import_sudoku_importing") : t("import_sudoku")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportSudokuModal;
