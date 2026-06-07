import * as React from "react";
import {useTranslation} from "react-i18next";
import Button from "../Button";
import {HintFlow} from "./useHint";

const HintControl: React.FC<{flow: HintFlow}> = ({flow}) => {
  const {t, i18n} = useTranslation();
  const {stage, hint, open, showWhere, reveal, close} = flow;

  const descriptionKey = hint ? `hint_tech_${hint.technique}` : "";
  const description =
    hint && i18n.exists(descriptionKey) ? t(descriptionKey) : t("hint_generic", {name: hint?.name ?? ""});

  React.useEffect(() => {
    if (stage === "idle") {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== "Enter") {
        return;
      }
      // Capture phase + stopImmediatePropagation so the global hotkeys (e.g. Escape pauses the game) don't also fire.
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Escape") {
        close();
      } else if (!hint) {
        close();
      } else if (stage === "explain") {
        showWhere();
      } else {
        reveal();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [stage, hint, close, showWhere, reveal]);

  return (
    <div className="relative">
      <Button className="w-full" onClick={stage === "idle" ? open : close} active={stage !== "idle"}>
        {t("hint_btn")}
      </Button>
      {stage !== "idle" && (
        <div className="absolute bottom-full right-0 z-40 mb-2 w-64 rounded-md bg-white p-4 text-left text-black shadow-lg dark:bg-gray-700 dark:text-white">
          <button
            onClick={close}
            aria-label={t("close")}
            className="absolute right-2 top-2 text-lg leading-none text-gray-500 hover:text-black dark:hover:text-white"
          >
            {"×"}
          </button>
          {hint === null ? (
            <p className="pr-4 text-sm">{t("hint_none")}</p>
          ) : (
            <div className="grid gap-3">
              <div>
                <div className="pr-4 text-sm font-bold">{t("hint_technique", {name: hint.name})}</div>
                <p className="mt-1 text-sm">{description}</p>
              </div>
              {stage === "explain" ? (
                <Button className="bg-teal-600 text-white dark:bg-teal-600" onClick={showWhere}>
                  {t("hint_show_where")}
                </Button>
              ) : (
                <Button className="bg-teal-600 text-white dark:bg-teal-600" onClick={reveal}>
                  {hint.value !== null ? t("hint_reveal_number") : t("hint_remove_candidates")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HintControl;
