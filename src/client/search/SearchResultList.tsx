import { useTranslation } from "react-i18next";
import { PROJECT_COLOR_HEX } from "../../shared/constants";
import type { Project, Task } from "../data/types";
import { formatWeekdayDayMonth } from "../i18n/format-date";
import { highlightParts, snippetAround } from "./highlight";

export type SearchItem = { kind: "task"; task: Task } | { kind: "project"; project: Project };

type SearchResultListProps = {
  results: { tasks: Task[]; projects: Project[] };
  /** Tasks then projects, the order ↑/↓ moves through. */
  items: SearchItem[];
  query: string;
  activeIndex: number;
  /** Every project, for the name next to a task (its project may not match the query). */
  projects: Record<string, Project>;
  projectTaskCounts: Record<string, number>;
  onHover: (index: number) => void;
  onOpen: (item: SearchItem) => void;
};

function Highlighted({ text, query }: { text: string; query: string }) {
  return highlightParts(text, query).map((part, index) =>
    part.match ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one string never move.
      <mark key={index} className="search-mark">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

/** The two result groups of the Search mockup: "tasks - N" and "projects - N". */
export function SearchResultList({
  results,
  items,
  query,
  activeIndex,
  projects,
  projectTaskCounts,
  onHover,
  onOpen,
}: SearchResultListProps) {
  const { t } = useTranslation();

  function taskMeta(task: Task) {
    if (task.completedAt) return t("search.completed");
    const place = task.projectId ? (projects[task.projectId]?.name ?? "") : t("nav.inbox");
    return task.dueDate ? t("search.taskMeta", { place, date: formatWeekdayDayMonth(task.dueDate) }) : place;
  }

  function option(item: SearchItem, index: number) {
    const active = index === activeIndex;
    const isTask = item.kind === "task";
    const title = isTask ? item.task.title : item.project.name;
    // A task found by its notes shows the words around the match.
    const notes = isTask && !highlightParts(title, query).some((part) => part.match);
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard way is ↑/↓ and Enter in the search field.
      <div
        key={isTask ? item.task.id : item.project.id}
        id={`search-result-${index}`}
        role="option"
        aria-selected={active}
        tabIndex={-1}
        className="search-result"
        onMouseMove={() => !active && onHover(index)}
        onClick={() => onOpen(item)}
      >
        <span className="min-w-0 flex-1">
          {!isTask && <i className="swatch mr-2.5" style={{ background: PROJECT_COLOR_HEX[item.project.color] }} />}
          <Highlighted text={title} query={query} />
          {notes && (
            <span className="search-snippet">
              <Highlighted text={snippetAround(item.task.notes, query) ?? ""} query={query} />
            </span>
          )}
        </span>
        <span className="search-meta mono">
          {isTask
            ? taskMeta(item.task)
            : t("search.projectTaskCount", { count: projectTaskCounts[item.project.id] ?? 0 })}
        </span>
        {active && (
          <span className="kbd ml-3" aria-hidden="true">
            {t("search.enterKey")}
          </span>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="muted m-0 px-4 py-6 text-[15px]">{t("search.noResults", { query })}</p>;
  }

  const groups = [
    {
      id: "search-tasks",
      label: t("search.tasks", { count: results.tasks.length }),
      start: 0,
      size: results.tasks.length,
    },
    {
      id: "search-projects",
      label: t("search.projects", { count: results.projects.length }),
      start: results.tasks.length,
      size: results.projects.length,
    },
  ].filter((group) => group.size > 0);

  return (
    <div
      id="search-results"
      role="listbox"
      aria-label={t("search.results")}
      className="max-h-[min(60vh,560px)] overflow-y-auto pb-2.5"
    >
      {groups.map((group) => (
        // biome-ignore lint/a11y/useSemanticElements: a listbox groups its options with role="group", not a <fieldset>.
        <div key={group.id} role="group" aria-labelledby={group.id}>
          <div id={group.id} className="mono muted px-4 pt-3.5 pb-1.5 text-[11px]">
            {group.label}
          </div>
          {items.slice(group.start, group.start + group.size).map((item, offset) => option(item, group.start + offset))}
        </div>
      ))}
    </div>
  );
}
