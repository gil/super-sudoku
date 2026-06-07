import * as React from "react";
import {useTranslation} from "react-i18next";

import {SolveStep} from "src/lib/game/analyze";

const DIFFICULTY_TRANSLATION_KEY: Record<string, string> = {
  easy: "difficulty_easy",
  medium: "difficulty_medium",
  hard: "difficulty_hard",
  unfair: "difficulty_expert",
  extreme: "difficulty_evil",
};

const DIFFICULTY_BADGE_CLASS: Record<string, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  hard: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  unfair: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  extreme: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const cellLabel = (cell: {row: number; col: number}) => `R${cell.row + 1}C${cell.col + 1}`;

const StepRow: React.FC<{step: SolveStep; index: number}> = ({step, index}) => {
  const {t} = useTranslation();
  const difficultyKey = DIFFICULTY_TRANSLATION_KEY[step.difficulty];
  const difficultyLabel = difficultyKey ? t(difficultyKey) : step.difficulty;
  const badgeClass = DIFFICULTY_BADGE_CLASS[step.difficulty] ?? "bg-gray-200 text-gray-700";

  return (
    <li className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">{index + 1}.</span>
          <span className="font-medium">{step.name}</span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeClass}`}>
          {difficultyLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{step.explanation}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {step.placements.map((p, i) => (
          <span
            key={`p-${i}`}
            className="rounded bg-teal-100 px-1.5 py-0.5 font-medium text-teal-800 dark:bg-teal-900 dark:text-teal-200"
          >
            {cellLabel(p)} = {p.value}
          </span>
        ))}
        {step.eliminations.map((e, i) => (
          <span
            key={`e-${i}`}
            className="rounded bg-rose-100 px-1.5 py-0.5 font-medium text-rose-800 dark:bg-rose-900 dark:text-rose-200"
          >
            {cellLabel(e)} ≠ {e.value}
          </span>
        ))}
      </div>
    </li>
  );
};

const SolvePathPanel: React.FC<{
  steps: SolveStep[] | null;
  solving: boolean;
  onClose: () => void;
}> = ({steps, solving, onClose}) => {
  const {t} = useTranslation();

  return (
    <div className="text-black dark:text-white">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">{t("analyze_tab_steps")}</h2>
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="text-2xl leading-none text-gray-300 hover:text-white"
        >
          ×
        </button>
      </div>
      {solving || steps === null ? (
        <p className="text-gray-300">{t("analyze_solving")}</p>
      ) : steps.length === 0 ? (
        <p className="text-gray-300">{t("analyze_no_steps")}</p>
      ) : (
        <ol className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
          {steps.map((step, i) => (
            <StepRow key={i} step={step} index={i} />
          ))}
        </ol>
      )}
    </div>
  );
};

export default SolvePathPanel;
