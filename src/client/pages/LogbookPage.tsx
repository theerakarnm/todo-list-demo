import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { AppPage } from "../components/AppPage";
import { GroupHeading } from "../components/GroupHeading";
import { PageHeader } from "../components/PageHeader";
import { logbookQuery } from "../data/logbook-query";
import { completedTasks } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { TaskList } from "../tasks/TaskList";

/** Completed (Logbook): newest completion first, 50 a page. Unticking a task puts it back. */
export default function LogbookPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project") ?? undefined;
  const store = useSyncStore();
  const logbook = useInfiniteQuery(logbookQuery(projectId));

  const fromServer = logbook.data?.pages.flatMap((page) => page.tasks) ?? [];
  const tasks = store && logbook.data ? completedTasks(store, fromServer, projectId) : [];
  const project = projectId ? store?.projects[projectId] : undefined;

  return (
    <AppPage>
      <PageHeader
        eyebrow={t("pages.completed.eyebrow")}
        title={t("pages.completed.title")}
        subtitle={t("pages.completed.subtitle")}
      />
      {projectId && (
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {project && <span className="mono">{t("pages.completed.inProject", { name: project.name })}</span>}
          <Link to="/app/logbook" className="mono text-[11px]">
            {t("pages.completed.showAll")}
          </Link>
        </div>
      )}
      {logbook.data && (
        <>
          <GroupHeading label={t("pages.completed.group", { count: tasks.length })} />
          {tasks.length === 0 && <p className="muted mt-4">{t("pages.completed.empty")}</p>}
          <TaskList tasks={tasks} dateStyle="full" showProject={!projectId} />
        </>
      )}
      {logbook.hasNextPage && (
        <button
          type="button"
          className="btn btn-outline mt-6"
          disabled={logbook.isFetchingNextPage}
          onClick={() => void logbook.fetchNextPage()}
        >
          {t("pages.completed.loadMore")}
        </button>
      )}
    </AppPage>
  );
}
