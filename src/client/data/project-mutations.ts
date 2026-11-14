import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ProjectColor } from "../../shared/constants";
import { api } from "../api/client";
import { request } from "../api/request";
import { useToast } from "../toast/ToastProvider";
import { useOptimisticMutation } from "./optimistic";
import { projectTasks, sortedProjects, subtasksOf } from "./selectors";
import { positionAtEnd, putRows, removeRows } from "./store-updates";
import { SYNC_QUERY_KEY } from "./sync-query";
import type { SyncStore } from "./sync-store";
import type { Project, Subtask, Task } from "./types";
import { uuidv7 } from "./uuidv7";

export type ProjectChanges = Partial<Pick<Project, "name" | "color">>;

/** Creates a project at the end of the sidebar list and returns its id. */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const create = useOptimisticMutation({
    request: (project: Project) =>
      request(
        api.api.projects[":id"].$put({
          param: { id: project.id },
          json: { name: project.name, color: project.color, position: project.position },
        }),
      ),
    apply: (store, project) => putRows(store, { projects: [project] }),
    confirm: (project) => ({ projects: [project] }),
  });

  return ({ name, color }: { name: string; color: ProjectColor }) => {
    const store = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
    const project: Project = {
      id: uuidv7(),
      name: name.trim(),
      color,
      position: positionAtEnd(store ? sortedProjects(store) : []),
      createdAt: Date.now(),
      updatedAt: 0,
      deletedAt: null,
    };
    create.mutate(project);
    return project.id;
  };
}

export function useUpdateProject() {
  const update = useOptimisticMutation({
    request: ({ id, changes }: { id: string; changes: ProjectChanges }) =>
      request(api.api.projects[":id"].$patch({ param: { id }, json: changes })),
    apply: (store, { id, changes }) => {
      const project = store.projects[id];
      return project ? putRows(store, { projects: [{ ...project, ...changes }] }) : store;
    },
    confirm: (project) => ({ projects: [project] }),
  });
  return (project: Project, changes: ProjectChanges) => update.mutate({ id: project.id, changes });
}

type DeletedProject = { project: Project; tasks: Task[]; subtasks: Subtask[] };

/**
 * Deletes a project with its tasks (ARCHITECTURE §15) and offers Undo.
 * The server restores exactly the rows it deleted; the screen puts back the ones it had.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const remove = useOptimisticMutation({
    request: ({ project }: DeletedProject) => request(api.api.projects[":id"].$delete({ param: { id: project.id } })),
    apply: (store, { project, tasks, subtasks }) =>
      removeRows(store, {
        projects: [project.id],
        tasks: tasks.map((task) => task.id),
        subtasks: subtasks.map((subtask) => subtask.id),
      }),
  });
  const restore = useOptimisticMutation({
    request: ({ project }: DeletedProject) =>
      request(api.api.projects[":id"].restore.$post({ param: { id: project.id } })),
    apply: (store, { project, tasks, subtasks }) => putRows(store, { projects: [project], tasks, subtasks }),
    confirm: (project) => ({ projects: [project] }),
  });

  return (project: Project) => {
    const store = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
    const tasks = store ? projectTasks(store, project.id) : [];
    const subtasks = store ? tasks.flatMap((task) => subtasksOf(store, task.id)) : [];
    const deleted = { project, tasks, subtasks };
    remove.mutate(deleted);
    showToast({ message: t("toast.projectDeleted", { name: project.name }), onUndo: () => restore.mutate(deleted) });
  };
}
