import * as React from "react";
import {analyze, AnalyzeData} from "sudoku-core";
import {useTranslation} from "react-i18next";
import Button from "src/components/Button";
import {Cell} from "src/lib/engine/types";
import {cellsToBoard} from "src/lib/engine/utility";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-600",
  medium: "bg-yellow-600",
  hard: "bg-orange-600",
  expert: "bg-red-600",
  master: "bg-purple-700",
};

const Stat: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
  <div className="flex flex-col gap-1 rounded-md bg-gray-100 p-3 dark:bg-gray-700">
    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">{label}</span>
    <span className="text-lg font-bold">{children}</span>
  </div>
);

const AnalyzeModal: React.FC<{data: AnalyzeData; onClose: () => void}> = ({data, onClose}) => {
  const {t} = useTranslation();

  const strategies = (data.usedStrategies ?? []).filter(
    (s): s is {title: string; freq: number} => s !== null,
  );
  const maxFreq = Math.max(1, ...strategies.map((s) => s.freq));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 text-black shadow-xl dark:bg-gray-800 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("analyze_title")}</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label={t("close")}
          >
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Stat label={t("analyze_difficulty")}>
            {data.difficulty ? (
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm capitalize text-white ${
                  DIFFICULTY_COLORS[data.difficulty] ?? "bg-gray-500"
                }`}
              >
                {data.difficulty}
              </span>
            ) : (
              "—"
            )}
          </Stat>
          <Stat label={t("analyze_score")}>{data.score ?? "—"}</Stat>
          <Stat label={t("analyze_solvable")}>{data.hasSolution ? "✅" : "❌"}</Stat>
          <Stat label={t("analyze_unique")}>{data.hasUniqueSolution ? "✅" : "❌"}</Stat>
        </div>

        {strategies.length > 0 && (
          <div>
            <h3 className="mb-2 text-lg font-bold">{t("analyze_strategies")}</h3>
            <div className="flex flex-col gap-2">
              {strategies.map((s) => (
                <div key={s.title} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{s.title}</span>
                    <span className="font-bold">{s.freq}×</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-teal-500"
                      style={{width: `${(s.freq / maxFreq) * 100}%`}}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!data.hasSolution && <p className="mt-4 text-red-500">{t("analyze_no_solution")}</p>}
      </div>
    </div>
  );
};

const SudokuAnalyze: React.FC<{sudoku: Cell[]; disabled?: boolean}> = ({sudoku, disabled}) => {
  const {t} = useTranslation();
  const [data, setData] = React.useState<AnalyzeData | null>(null);

  const runAnalysis = () => {
    const board = cellsToBoard(sudoku);
    setData(analyze(board));
  };

  return (
    <>
      <Button disabled={disabled} onClick={runAnalysis}>
        {`🔍 ${t("analyze")}`}
      </Button>
      {data && <AnalyzeModal data={data} onClose={() => setData(null)} />}
    </>
  );
};

export default SudokuAnalyze;
