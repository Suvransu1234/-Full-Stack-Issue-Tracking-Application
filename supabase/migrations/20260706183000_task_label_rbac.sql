drop policy if exists "task labels manage" on task_labels;
create policy "task labels manage" on task_labels
for all to authenticated
using (
  exists (
    select 1 from tasks
    where tasks.id = task_labels.task_id
      and (
        get_workspace_role(tasks.workspace_id) = 'admin'
        or tasks.created_by = auth.uid()
        or (
          get_workspace_role(tasks.workspace_id) = 'project_manager'
          and tasks.created_by_role <> 'admin'
        )
      )
  )
)
with check (
  exists (
    select 1 from tasks
    where tasks.id = task_labels.task_id
      and (
        get_workspace_role(tasks.workspace_id) = 'admin'
        or tasks.created_by = auth.uid()
        or (
          get_workspace_role(tasks.workspace_id) = 'project_manager'
          and tasks.created_by_role <> 'admin'
        )
      )
  )
);
