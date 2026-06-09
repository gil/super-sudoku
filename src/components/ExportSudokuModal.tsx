import * as React from "react";
import {useTranslation} from "react-i18next";
import hotkeys from "hotkeys-js";

import Button from "src/components/Button";

const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "") || "sudokus";

const ExportSudokuModal: React.FC<{
  collectionName: string;
  sudokusRaw: string;
  onClose: () => void;
}> = ({collectionName, sudokusRaw, onClose}) => {
  const {t} = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const lines = React.useMemo(() => sudokusRaw.split("\n").filter((line) => line.trim() !== ""), [sudokusRaw]);
  const text = React.useMemo(() => lines.join("\n"), [lines]);

  React.useEffect(() => {
    const previousScope = hotkeys.getScope();
    hotkeys("escape", "ExportSudokuModal", () => {
      onClose();
      return false;
    });
    hotkeys.setScope("ExportSudokuModal");
    return () => {
      hotkeys.deleteScope("ExportSudokuModal");
      hotkeys.setScope(previousScope);
    };
  }, [onClose]);

  const handleDownload = () => {
    const blob = new Blob([text], {type: "text/plain"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(collectionName)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context); the user can still select and copy manually.
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
          <h2 className="text-2xl font-bold">{t("export_sudoku_title")}</h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="text-2xl leading-none text-gray-500 hover:text-black dark:hover:text-white"
          >
            ×
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{t("export_sudoku_description")}</p>

        {lines.length === 0 ? (
          <div className="rounded-md bg-gray-100 p-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            {t("export_sudoku_empty")}
          </div>
        ) : (
          <>
            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              {t("export_sudoku_count", {count: lines.length})}
            </div>
            <textarea
              readOnly
              value={text}
              rows={8}
              wrap="off"
              onFocus={(e) => e.currentTarget.select()}
              className="w-full resize-y overflow-x-auto rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-black focus:border-teal-500 focus:outline-hidden dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose}>{t("close")}</Button>
          {lines.length > 0 && (
            <>
              <Button onClick={handleCopy}>{copied ? t("export_sudoku_copied") : t("export_sudoku_copy")}</Button>
              <Button className="bg-teal-600 text-white dark:bg-teal-600" onClick={handleDownload}>
                {t("export_sudoku_download")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportSudokuModal;
