import { useTranslation } from "react-i18next";
import { AppPage } from "../components/AppPage";
import { GroupHeading } from "../components/GroupHeading";
import { PageHeader } from "../components/PageHeader";
import { inboxTasks } from "../data/selectors";
import { useSyncStore } from "../data/sync-query";
import { useCreateTask } from "../data/task-mutations";
import { AddTaskRow } from "../tasks/AddTaskRow";
import { TaskList } from "../tasks/TaskList";

/** Inbox = active tasks without a project, in manual order. */
export default function InboxPage() {
  const { t } = useTranslation();
  const store = useSyncStore();
  const createTask = useCreateTask();
  const tasks = store ? inboxTasks(store) : [];

  return (
    <AppPage>
      <PageHeader eyebrow={t("pages.inbox.eyebrow")} title={t("pages.inbox.title")} subtitle={t("pages.inbox.subtitle")} />
      <GroupHeading label={t("pages.inbox.group", { count: tasks.length })} />
      <TaskList tasks={tasks} dateStyle="full" drag="sort" />
      {store && (
        <AddTaskRow
          hint={t("task.addTaskHint.inbox")}
          onAdd={(title) => createTask({ title, projectId: null, dueDate: null })}
        />
      )}
    </AppPage>
  );
}
