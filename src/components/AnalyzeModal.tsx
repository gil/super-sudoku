import * as React from "react";
import {useTranslation} from "react-i18next";
import hotkeys from "hotkeys-js";

import Button from "src/components/Button";
import {SudokuAnalysis} from "src/lib/game/analyze";

const DIFFICULTY_TRANSLATION_KEY: Record<string, string> = {
  easy: "difficulty_easy",
  medium: "difficulty_medium",
  hard: "difficulty_hard",
  unfair: "difficulty_expert",
  extreme: "difficulty_evil",
};

const AnalyzeModal: React.FC<{
  analysis: SudokuAnalysis;
  onClose: () => void;
}> = ({analysis, onClose}) => {
  const {t} = useTranslation();

  const difficultyKey = DIFFICULTY_TRANSLATION_KEY[analysis.difficulty];
  const difficultyLabel = difficultyKey ? t(difficultyKey) : analysis.difficulty;

  React.useEffect(() => {
    const previousScope = hotkeys.getScope();
    hotkeys("escape", "AnalyzeModal", () => {
      onClose();
      return false;
    });
    hotkeys.setScope("AnalyzeModal");
    return () => {
      hotkeys.deleteScope("AnalyzeModal");
      hotkeys.setScope(previousScope);
    };
  }, [onClose]);

  const solutionLabel =
    analysis.solutionCount === 0
      ? t("analyze_solutions_invalid")
      : analysis.solutionCount === 1
        ? t("analyze_solutions_unique")
        : t("analyze_solutions_multiple");

  const maxScore = Math.max(...analysis.techniques.map((tech) => tech.totalScore), 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 text-black shadow-xl dark:bg-gray-800 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("analyze_title")}</h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="text-2xl leading-none text-gray-500 hover:text-black dark:hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-md bg-gray-100 p-3 dark:bg-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
              {t("analyze_difficulty")}
            </div>
            <div className="mt-1 text-lg font-semibold capitalize">{difficultyLabel}</div>
          </div>
          <div className="rounded-md bg-gray-100 p-3 dark:bg-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
              {t("analyze_score")}
            </div>
            <div className="mt-1 text-lg font-semibold">{analysis.score}</div>
          </div>
          <div className="rounded-md bg-gray-100 p-3 dark:bg-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
              {t("analyze_solutions")}
            </div>
            <div className="mt-1 text-lg font-semibold">{solutionLabel}</div>
          </div>
        </div>

        <h3 className="mb-2 text-lg font-bold">{t("analyze_techniques")}</h3>
        {analysis.techniques.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-300">{t("analyze_no_techniques")}</p>
        ) : (
          <ul className="grid gap-2">
            {analysis.techniques.map((tech) => (
              <li key={tech.technique} className="grid gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{tech.name}</span>
                  <span className="text-gray-500 dark:text-gray-300">
                    {t("analyze_technique_stats", {count: tech.count, score: tech.totalScore})}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{width: `${(tech.totalScore / maxScore) * 100}%`}}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <Button className="bg-teal-600 text-white dark:bg-teal-600" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeModal;
