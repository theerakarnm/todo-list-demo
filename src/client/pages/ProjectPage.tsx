import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { AppPage } from "../components/AppPage";
import { GroupHeading } from "../components/GroupHeading";
import { PageHeader } from "../components/PageHeader";
import { logbookQuery } from "../data/logbook-query";
import { useDeleteProject } from "../data/project-mutations";
import { completedTasks, projectTasks } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { useCreateTask } from "../data/task-mutations";
import type { Project } from "../data/types";
import { DeleteProjectDialog } from "../projects/DeleteProjectDialog";
import { ProjectMenu } from "../projects/ProjectMenu";
import { ProjectTitle } from "../projects/ProjectTitle";
import { AddTaskRow } from "../tasks/AddTaskRow";
import { TaskList } from "../tasks/TaskList";

/** How many recent completions the project page shows; "see all" opens the rest in Completed. */
const RECENT_COMPLETED = 5;

function CompletedSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const store = useSyncStore();
  const logbook = useInfiniteQuery(logbookQuery(projectId));
  if (!store) return null;

  const fromServer = logbook.data?.pages.flatMap((page) => page.tasks) ?? [];
  const completed = completedTasks(store, fromServer, projectId);
  return (
    <>
      <GroupHeading label={t("pages.project.completed", { count: completed.length })}>
        <Link to={`/app/logbook?project=${projectId}`} className="mono text-[11px]">
          {t("pages.project.seeAll")}
        </Link>
      </GroupHeading>
      <TaskList tasks={completed.slice(0, RECENT_COMPLETED)} dateStyle="full" showProject={false} />
    </>
  );
}

function ProjectView({ project }: { project: Project }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const store = useSyncStore();
  const createTask = useCreateTask();
  const deleteProject = useDeleteProject();
  const [showCompleted, setShowCompleted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const tasks = store ? projectTasks(store, project.id) : [];

  return (
    <AppPage>
      <header className="relative flex items-end justify-between gap-5 border-b-2 border-rule pb-[22px]">
        <div className="min-w-0 flex-1">
          <div className="mono muted mb-2.5">{t("pages.project.eyebrow")}</div>
          <ProjectTitle project={project} />
        </div>
        <ProjectMenu project={project} openTaskCount={tasks.length} onDelete={() => setConfirmingDelete(true)} />
      </header>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="mono m-0 font-semibold">{t("pages.project.open", { count: tasks.length })}</h2>
        <label className="switch">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) => setShowCompleted(event.target.checked)}
          />
          <span className="switch-track" />
          <span className="mono">{t("pages.project.showCompleted")}</span>
        </label>
      </div>
      <div className="border-t-2 border-rule">
        <TaskList tasks={tasks} dateStyle="full" showProject={false} />
      </div>
      <AddTaskRow
        hint={t("task.addTaskHint.project", { name: project.name })}
        onAdd={(title) => createTask({ title, projectId: project.id, dueDate: null })}
      />
      {showCompleted && <CompletedSection projectId={project.id} />}

      {confirmingDelete && (
        <DeleteProjectDialog
          name={project.name}
          openTaskCount={tasks.length}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => {
            deleteProject(project);
            navigate("/app/today");
          }}
        />
      )}
    </AppPage>
  );
}

export default function ProjectPage() {
  const { t } = useTranslation();
  const { projectId = "" } = useParams();
  const store = useSyncStore();
  const project = store?.projects[projectId];

  if (project) return <ProjectView key={project.id} project={project} />;
  if (!store) {
    return (
      <AppPage>
        <PageHeader eyebrow={t("pages.project.eyebrow")} title={t("pages.project.title")} />
      </AppPage>
    );
  }
  return (
    <AppPage>
      <PageHeader
        eyebrow={t("pages.project.eyebrow")}
        title={t("pages.project.notFound")}
        subtitle={t("pages.project.notFoundNote")}
      />
      <Link to="/app/today" className="mt-6 inline-block">
        {t("pages.project.backToToday")}
      </Link>
    </AppPage>
  );
}
