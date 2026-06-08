import * as React from "react";

import {getSudokusPaginated, SudokuRaw, useSudokuCollections} from "src/lib/game/sudokus";
import {DIFFICULTY, SimpleSudoku} from "src/lib/engine/types";
import {generatePuzzle} from "src/lib/game/analyze";
import SudokuPreview from "../../components/sudoku/SudokuPreview";
import {formatDuration} from "src/utils/format";
import {useEffect, useState} from "react";
import Button from "src/components/Button";
import {stringifySudoku} from "src/lib/engine/utility";
import {useElementWidth} from "src/utils/hooks";
import {useNavigate} from "@tanstack/react-router";
import {localStoragePlayedSudokuRepository, StoredPlayedSudokuState} from "src/lib/database/playedSudokus";
import {Collection, translateCollectionName} from "src/lib/database/collections";
import NewSudoku from "./NewSudoku";
import ImportSudokuModal from "src/components/ImportSudokuModal";
import {useTranslation} from "react-i18next";
import {SudokuRating, useSudokuRatings} from "src/utils/useSudokuRatings";

const DIFFICULTY_BADGE_COLOR: Record<string, string> = {
  easy: "bg-green-700",
  medium: "bg-teal-700",
  hard: "bg-yellow-700",
  unfair: "bg-orange-700",
  extreme: "bg-red-700",
  incomplete: "bg-gray-700",
};

const TabItem = ({active, children, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {active: boolean}) => (
  <button
    className={`px-1 xs:px-2 sm:px-4 text-xs sm:text-sm md:text-base py-2 pointer capitalize rounded-sm border-none hover:bg-gray-500 ${
      active ? "bg-white text-black dark:bg-gray-600 dark:text-white" : "bg-transparent text-white dark:text-gray-300"
    }`}
    {...props}
  >
    {children}
  </button>
);

// Nice page selector. Will show previous / next buttons, then the current page, the first and last page and the surrounding
// pages of the current. Will use ... to show the missing pages.
const PageSelector = ({
  page,
  pageCount,
  setPage,
}: {
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
}) => {
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const current = page + 1; // Convert to 1-based for display

    // Always show first page
    pages.push(1);

    if (current > 4) {
      pages.push("...");
    }

    // Show pages around current
    const start = Math.max(2, current - 1);
    const end = Math.min(pageCount - 1, current + 1);

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== pageCount) {
        pages.push(i);
      }
    }

    if (current < pageCount - 3) {
      pages.push("...");
    }

    // Always show last page
    if (pageCount > 1) {
      pages.push(pageCount);
    }

    return pages;
  };

  return (
    <div className="flex justify-center items-center space-x-2 py-4">
      <Button onClick={() => setPage(page - 1)} disabled={page === 0}>
        {"‹"}
      </Button>

      {getVisiblePages().map((pageNum, index) => (
        <React.Fragment key={index}>
          {pageNum === "..." ? (
            <span className="px-2 text-gray-500">...</span>
          ) : (
            <Button
              onClick={() => setPage((pageNum as number) - 1)}
              className={pageNum === page + 1 ? "bg-teal-600 dark:bg-teal-600 text-white" : ""}
            >
              {pageNum}
            </Button>
          )}
        </React.Fragment>
      ))}

      <Button onClick={() => setPage(page + 1)} disabled={page === pageCount - 1}>
        {"›"}
      </Button>
    </div>
  );
};

const SudokuToSelect = ({
  sudoku,
  index,
  sudokuCollectionName,
  storedSudoku,
  rating,
  onRemove,
}: {
  sudoku: SudokuRaw;
  storedSudoku: StoredPlayedSudokuState | undefined;
  index: number;
  sudokuCollectionName: string;
  rating: SudokuRating | undefined;
  onRemove?: () => void;
}) => {
  const localSudoku = storedSudoku;
  const unfinished = localSudoku && !localSudoku.game.won;
  const finished = localSudoku && localSudoku.game.won;
  const navigate = useNavigate();
  const {t} = useTranslation();

  const choose = () => {
    if (finished) {
      const areYouSure = confirm(
        "Are you sure? This will restart the sudoku and reset the timer. It will continue to say that you solved it.",
      );
      if (!areYouSure) {
        return;
      }
    }
    navigate({
      to: "/",
      search: {
        sudokuIndex: index + 1,
        sudoku: stringifySudoku(sudoku.sudoku),
        sudokuCollectionName: sudokuCollectionName,
      },
    });
  };

  const sudokuContainerRef = React.useRef(null);
  const size = useElementWidth(sudokuContainerRef);

  return (
    <div className="group/card relative" ref={sudokuContainerRef}>
      {onRemove && (
        <button
          aria-label={t("remove_sudoku")}
          title={t("remove_sudoku")}
          className="absolute left-2 top-2 z-30 flex h-7 w-7 items-center justify-center rounded-sm border-none bg-gray-900/80 text-white pointer opacity-0 transition-opacity group-hover/card:opacity-100 hover:bg-red-700"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(t("confirm_remove_sudoku"))) {
              onRemove();
            }
          }}
        >
          ✕
        </button>
      )}
      {rating && (
        <div
          className={`pointer-events-none absolute right-2 top-2 z-10 rounded-sm px-2 py-1 text-xs text-white md:text-sm ${
            DIFFICULTY_BADGE_COLOR[rating.difficulty] ?? "bg-gray-700"
          }`}
        >
          <span className="capitalize">{rating.difficulty}</span> · {rating.score}
        </div>
      )}
      {unfinished || finished ? (
        <div className="pointer-events-none absolute left-2 rounded-sm bottom-2 z-10 max-w-min bg-gray-900 px-2 py-1 text-xs text-white md:text-base">
          <div>
            <div className="whitespace-nowrap">{`
              ${unfinished ? t("play_time") : t("last_time")}
              ${formatDuration(localSudoku.game.secondsPlayed)}
            `}</div>
            {localSudoku.game.previousTimes.length > 0 && (
              <div className="whitespace-nowrap">{`Best time: ${formatDuration(
                Math.min(...localSudoku.game.previousTimes),
              )}`}</div>
            )}
            {localSudoku.game.timesSolved > 0 && (
              <div>{`Solved ${localSudoku.game.timesSolved} ${localSudoku.game.timesSolved === 1 ? "time" : "times"}`}</div>
            )}
            {unfinished && <div>{t("continue")}</div>}
            {finished && <div>{`Restart?`}</div>}
          </div>
        </div>
      ) : null}
      {size === undefined && (
        <div className="inline-block relative w-full">
          <div style={{marginTop: "100%"}} />
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="w-full h-full bg-gray-300 dark:bg-gray-900 rounded-sm" />
          </div>
        </div>
      )}
      {size !== undefined && (
        <SudokuPreview
          size={size}
          onClick={choose}
          id={index + 1}
          sudoku={finished ? sudoku.solution : sudoku.sudoku}
          darken
        />
      )}
    </div>
  );
};

const GameIndex = ({
  pageSudokus,
  pageStart,
  sudokuCollectionName,
  ratings,
  onRemoveSudoku,
}: {
  pageSudokus: SudokuRaw[];
  pageStart: number;
  sudokuCollectionName: string;
  ratings: Record<string, SudokuRating>;
  onRemoveSudoku?: (index: number) => void;
}) => {
  const {t} = useTranslation();

  if (pageSudokus.length === 0) {
    return <div className="text-center text-white">{t("no_sudokus_in_collection")}</div>;
  }

  return (
    <div>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {pageSudokus.map((sudoku, index) => {
          const globalIndex = pageStart + index;
          const sudokuKey = stringifySudoku(sudoku.sudoku);
          const storedSudoku = localStoragePlayedSudokuRepository.getSudokuState(sudokuKey);

          return (
            <SudokuToSelect
              key={globalIndex}
              sudoku={sudoku}
              index={globalIndex}
              sudokuCollectionName={sudokuCollectionName}
              storedSudoku={storedSudoku}
              rating={ratings[sudokuKey]}
              onRemove={onRemoveSudoku ? () => onRemoveSudoku(globalIndex) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};

const usePaginatedSudokus = (collection: Collection, page: number, pageSize: number) => {
  return React.useMemo(
    () => getSudokusPaginated(collection, page, pageSize),
    [collection, page, pageSize],
  );
};

const GameSelect: React.FC = () => {
  const {
    activeCollection,
    setActiveCollectionId,
    collections,
    addCollection,
    isBaseCollection,
    addSudokuToCollection,
    addSudokusToCollection,
    removeSudokuFromCollection,
    removeCollection,
  } = useSudokuCollections();
  const [page, setPage] = useState(0);
  const {t} = useTranslation();

  const pageSize = 12;
  const {sudokus: pageSudokus, totalPages: pageCount} = usePaginatedSudokus(activeCollection, page, pageSize);
  const pageStart = page * pageSize;

  const {ratings, requestRatings} = useSudokuRatings();

  useEffect(() => {
    requestRatings(
      pageSudokus.map((sudoku) => {
        const key = stringifySudoku(sudoku.sudoku);
        return {key, board: key.replace(/0/g, ".")};
      }),
    );
  }, [pageSudokus, requestRatings]);

  const setActiveCollectionAndResetPage = (collection: string) => {
    setActiveCollectionId(collection);
    setShowNewSudokuComponent(false);
    setPage(0);
  };

  const saveSudoku = async (sudoku: SimpleSudoku) => {
    await addSudokuToCollection(activeCollection.id, sudoku);
    // TODO: add a toast notification
    setShowNewSudokuComponent(false);
  };

  const [generateDifficulty, setGenerateDifficulty] = useState<DIFFICULTY>(DIFFICULTY.EASY);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSudokuLocal = () => {
    setIsGenerating(true);
    // Defer so the disabled/loading state paints before the synchronous generator blocks the thread.
    setTimeout(async () => {
      try {
        const sudoku = generatePuzzle(generateDifficulty);
        await addSudokuToCollection(activeCollection.id, sudoku);
        setShowNewSudokuComponent(false);
      } catch (e) {
        alert(t("generate_sudoku_failed", {error: e instanceof Error ? e.message : String(e)}));
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  };

  const [showImportModal, setShowImportModal] = useState(false);

  const importSudokus = async (sudokus: SimpleSudoku[]) => {
    await addSudokusToCollection(activeCollection.id, sudokus);
    setShowNewSudokuComponent(false);
  };

  const [showNewSudokuComponent, setShowNewSudokuComponent] = useState(false);
  const removeCollectionLocal = () => {
    if (isBaseCollectionLocal) {
      alert(t("cannot_delete_base_collection"));
      return;
    }
    const areYouSure = confirm(
      t("confirm_delete_collection", {collection: translateCollectionName(activeCollection.name)}),
    );
    if (!areYouSure) {
      return;
    }
    removeCollection(activeCollection.id);
    setActiveCollectionId(collections[0].id);
    setPage(0);
  };

  const removeSudokuLocal = async (index: number) => {
    await removeSudokuFromCollection(activeCollection.id, index);
    // Removing the last sudoku on the final page would leave us on an empty page.
    if (index === pageStart && pageSudokus.length === 1 && page > 0) {
      setPage((p) => p - 1);
    }
  };

  const isBaseCollectionLocal = isBaseCollection(activeCollection.id);

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center  mb-8">
        <div className="flex flex-wrap gap-2">
          {collections.map((collection) => (
            <TabItem
              key={collection.id}
              active={activeCollection.id === collection.id}
              onClick={() => setActiveCollectionAndResetPage(collection.id)}
            >
              {translateCollectionName(collection.name)}
            </TabItem>
          ))}
          <TabItem
            active={false}
            onClick={() => {
              const newCollectionName = prompt(t("enter_new_collection_name"));
              if (newCollectionName) {
                const newCollection = addCollection(newCollectionName);
                setActiveCollectionId(newCollection.id);
                setPage(0);
              }
            }}
          >
            {t("add_new_collection")}
          </TabItem>
        </div>
      </div>
      {!isBaseCollectionLocal && (
        <div className="flex justify-between items-center gap-2 mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            {!showNewSudokuComponent ? (
              <Button
                className="bg-teal-600 dark:bg-teal-600 text-white"
                onClick={() => setShowNewSudokuComponent(true)}
              >
                {t("add_sudoku")}
              </Button>
            ) : (
              <Button onClick={() => setShowNewSudokuComponent(false)}>{t("close_new_sudoku_creator")}</Button>
            )}
            <Button onClick={() => setShowImportModal(true)}>{t("import_sudoku")}</Button>
            <Button onClick={generateSudokuLocal} disabled={isGenerating}>
              {isGenerating ? t("generate_sudoku_loading") : t("generate_sudoku")}
            </Button>
            <select
              className="rounded-sm border border-gray-700 bg-gray-900 text-white px-2 py-2 text-xs sm:text-sm"
              value={generateDifficulty}
              onChange={(e) => setGenerateDifficulty(e.target.value as DIFFICULTY)}
            >
              {Object.values(DIFFICULTY).map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {t(`difficulty_${difficulty}`)}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={removeCollectionLocal}>{t("delete_collection")}</Button>
        </div>
      )}
      {!isBaseCollectionLocal && showNewSudokuComponent && (
        <div className="mb-4 p-4 bg-gray-900 rounded-sm border border-gray-700 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="text-white text-lg sm:text-2xl font-bold">{t("create_new_sudoku")}</div>
            <Button onClick={() => setShowNewSudokuComponent(false)}>{t("close")}</Button>
          </div>
          <p className="text-white">{t("add_your_own_sudoku", {collection: activeCollection.name})}</p>
          <NewSudoku saveSudoku={saveSudoku} />
        </div>
      )}
      <GameIndex
        pageSudokus={pageSudokus}
        pageStart={pageStart}
        sudokuCollectionName={activeCollection.name}
        ratings={ratings}
        onRemoveSudoku={isBaseCollectionLocal ? undefined : removeSudokuLocal}
      />
      {pageCount > 1 && <PageSelector page={page} pageCount={pageCount} setPage={setPage} />}
      {showImportModal && (
        <ImportSudokuModal onImport={importSudokus} onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
};

export default GameSelect;
