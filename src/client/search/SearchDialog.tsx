import { type KeyboardEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { sidebarCounts } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { useNow } from "../data/use-now";
import { SearchResultList, type SearchItem } from "./SearchResultList";
import { useOpenFoundTask } from "./use-open-found-task";
import { useSearchResults } from "./use-search-results";

type SearchDialogProps = { onClose: () => void };

/** Ctrl/Cmd+K: find tasks (title and notes, done or not) and projects, then jump there. */
export function SearchDialog({ onClose }: SearchDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openTask = useOpenFoundTask();
  const store = useSyncStore();
  const now = useNow();
  const [text, setText] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { query, results } = useSearchResults(text);

  const items: SearchItem[] = [
    ...(results?.tasks ?? []).map((task) => ({ kind: "task" as const, task })),
    ...(results?.projects ?? []).map((project) => ({ kind: "project" as const, project })),
  ];
  const active = Math.min(activeIndex, items.length - 1);
  const counts = store ? sidebarCounts(store, now) : undefined;

  function open(item: SearchItem | undefined) {
    if (!item || !results) return;
    if (item.kind === "task") openTask(item.task, results.subtasks);
    else navigate(`/app/projects/${item.project.id}`);
    onClose();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || items.length === 0) return;
    // ↑ and ↓ go round: past the last result is the first one again.
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step) {
      event.preventDefault();
      setActiveIndex((active + step + items.length) % items.length);
    }
    if (event.key === "Enter") open(items[active]);
  }

  return (
    <Dialog
      label={t("nav.search")}
      onClose={onClose}
      className="mx-auto mt-[12vh] w-[min(660px,calc(100vw-32px))] border-2 border-rule bg-bg p-0 text-fg backdrop:bg-overlay"
    >
      <div className="flex min-h-16 items-center gap-3 border-b-2 border-rule px-4">
        <Icon name="search" size={20} />
        <input
          autoFocus
          role="combobox"
          aria-label={t("nav.search")}
          aria-expanded={items.length > 0}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={items.length > 0 ? `search-result-${active}` : undefined}
          className="search-input"
          placeholder={t("search.placeholder")}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
        />
        <span className="kbd" aria-hidden="true">
          {t("search.escKey")}
        </span>
      </div>
      {results && (
        <SearchResultList
          results={results}
          items={items}
          query={query}
          activeIndex={active}
          projectTaskCounts={counts?.projects ?? {}}
          onHover={setActiveIndex}
          onOpen={open}
        />
      )}
      <div className="mono muted flex flex-wrap gap-5 border-t-[1.5px] border-rule px-4 py-3 text-[11px]">
        <span>{t("search.hintMove")}</span>
        <span>{t("search.hintOpen")}</span>
        <span>{t("search.hintClose")}</span>
      </div>
    </Dialog>
  );
}
