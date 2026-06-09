import * as React from "react";
import {useTranslation} from "react-i18next";
import hotkeys from "hotkeys-js";

import Button from "src/components/Button";
import {parseSudoku} from "src/lib/engine/utility";
import {SimpleSudoku} from "src/lib/engine/types";

type DifficultyKey = "easy" | "medium" | "hard" | "unfair" | "extreme";

interface ExtraCollection {
  file: string;
  name: string;
  description?: string;
  total?: number;
  difficulties?: Record<DifficultyKey, number>;
}

const DIFFICULTY_ORDER: DifficultyKey[] = ["easy", "medium", "hard", "unfair", "extreme"];

const DIFFICULTY_COLOR: Record<DifficultyKey, string> = {
  easy: "bg-green-600",
  medium: "bg-teal-600",
  hard: "bg-yellow-600",
  unfair: "bg-orange-600",
  extreme: "bg-red-600",
};

// Extra collections use both "." and "0" for empty cells; normalize to the "0" form parseSudoku expects.
const normalizeLine = (line: string) => line.replace(/[\s.]/g, (c) => (c === "." ? "0" : ""));

const CHUNK_SIZE = 1000;
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const DifficultyBreakdown: React.FC<{
  total: number;
  difficulties: Record<DifficultyKey, number>;
}> = ({total, difficulties}) => {
  const {t} = useTranslation();
  const segments = DIFFICULTY_ORDER.map((key) => ({key, count: difficulties[key] ?? 0})).filter((s) => s.count > 0);
  if (segments.length === 0) {
    return null;
  }
  return (
    <span className="mt-2 block">
      <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        {segments.map(({key, count}) => (
          <span
            key={key}
            className={DIFFICULTY_COLOR[key]}
            style={{width: `${(count / total) * 100}%`}}
            title={`${t(`difficulty_${key}`)}: ${count.toLocaleString()}`}
          />
        ))}
      </span>
      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {segments.map(({key, count}) => (
          <span key={key} className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${DIFFICULTY_COLOR[key]}`} />
            <span className="capitalize">{t(`difficulty_${key}`)}</span>
            <span className="tabular-nums text-gray-400 dark:text-gray-500">{count.toLocaleString()}</span>
          </span>
        ))}
      </span>
    </span>
  );
};

const ImportCollectionModal: React.FC<{
  onImport: (name: string, sudokus: SimpleSudoku[]) => void | Promise<void>;
  onClose: () => void;
  existingNames: string[];
}> = ({onImport, onClose, existingNames}) => {
  const {t} = useTranslation();
  const [collections, setCollections] = React.useState<ExtraCollection[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<{name: string; done: number; total: number} | null>(null);
  const isImporting = progress !== null;
  const importedNames = React.useMemo(() => new Set(existingNames), [existingNames]);

  React.useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}sudokus/extra/index.json`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: ExtraCollection[]) => setCollections(data))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  React.useEffect(() => {
    const previousScope = hotkeys.getScope();
    hotkeys("escape", "ImportCollectionModal", () => {
      if (!isImporting) {
        onClose();
      }
      return false;
    });
    hotkeys.setScope("ImportCollectionModal");
    return () => {
      hotkeys.deleteScope("ImportCollectionModal");
      hotkeys.setScope(previousScope);
    };
  }, [onClose, isImporting]);

  const handleSelect = async (collection: ExtraCollection) => {
    if (isImporting) {
      return;
    }
    setError(null);
    try {
      // Fetched on demand so these (large) sets are not bundled into the JS.
      const res = await fetch(`${import.meta.env.BASE_URL}sudokus/extra/${collection.file}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");

      setProgress({name: collection.name, done: 0, total: lines.length});

      const sudokus: SimpleSudoku[] = [];
      for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        for (const raw of lines.slice(i, i + CHUNK_SIZE)) {
          try {
            sudokus.push(parseSudoku(normalizeLine(raw)));
          } catch {
            // Skip malformed lines silently; the rest of the set still imports.
          }
        }
        setProgress({name: collection.name, done: Math.min(i + CHUNK_SIZE, lines.length), total: lines.length});
        await nextFrame();
      }

      await onImport(collection.name, sudokus);
      setProgress(null);
      onClose();
    } catch (e) {
      setProgress(null);
      setError(e instanceof Error ? e.message : String(e));
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
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 text-black shadow-xl dark:bg-gray-800 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("import_collection_title")}</h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="text-2xl leading-none text-gray-500 hover:text-black dark:hover:text-white"
          >
            ×
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{t("import_collection_description")}</p>

        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-800 dark:bg-red-900/50 dark:text-red-200">
            {t("import_collection_error", {error})}
          </div>
        )}

        {collections === null && !error && (
          <div className="text-sm text-gray-600 dark:text-gray-300">{t("import_collection_loading")}</div>
        )}

        {collections !== null && (
          <ul className="flex flex-col gap-2">
            {collections.map((collection) => {
              const imported = importedNames.has(collection.name);
              return (
                <li key={collection.file}>
                  <button
                    onClick={() => handleSelect(collection)}
                    disabled={isImporting || imported}
                    className="flex w-full items-start justify-between gap-3 rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-left pointer hover:border-teal-500 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-gray-300 disabled:hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-teal-500 dark:hover:bg-gray-700 dark:disabled:hover:border-gray-600 dark:disabled:hover:bg-gray-900"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{collection.name}</span>
                        {collection.total !== undefined && (
                          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                            {t("import_collection_puzzles", {count: collection.total})}
                          </span>
                        )}
                      </span>
                      {collection.description && (
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                          {collection.description}
                        </span>
                      )}
                      {collection.total !== undefined && collection.total > 0 && collection.difficulties && (
                        <DifficultyBreakdown total={collection.total} difficulties={collection.difficulties} />
                      )}
                    </span>
                    {imported && (
                      <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        {t("import_collection_imported")}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {progress && (
          <div className="mt-4">
            <div className="mb-1 text-sm text-gray-600 dark:text-gray-300">
              {t("import_collection_progress", {name: progress.name, done: progress.done, total: progress.total})}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{width: `${progress.total === 0 ? 0 : (progress.done / progress.total) * 100}%`}}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} disabled={isImporting}>
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportCollectionModal;
