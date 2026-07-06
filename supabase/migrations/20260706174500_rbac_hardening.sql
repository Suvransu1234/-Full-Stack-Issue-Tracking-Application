create or replace function public.enforce_task_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_role text;
begin
  requester_role := get_workspace_role(old.workspace_id);

  if requester_role = 'admin' then
    return new;
  end if;

  if requester_role = 'project_manager' then
    if old.created_by_role = 'admin' then
      if new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.priority is distinct from old.priority
        or new.due_date is distinct from old.due_date
        or new.assigned_to is distinct from old.assigned_to
        or new.visibility_role is distinct from old.visibility_role
        or new.section_id is distinct from old.section_id then
        raise exception 'Project Managers can only change status on Admin-created tasks';
      end if;
    end if;

    return new;
  end if;

  if requester_role = 'member' then
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.priority is distinct from old.priority
      or new.due_date is distinct from old.due_date
      or new.assigned_to is distinct from old.assigned_to
      or new.visibility_role is distinct from old.visibility_role
      or new.section_id is distinct from old.section_id then
      raise exception 'Members can only change task status';
    end if;

    return new;
  end if;

  raise exception 'You do not have permission to update this task';
end;
$$;

drop policy if exists "tasks role visibility" on tasks;
create policy "tasks role visibility" on tasks
for select to authenticated
using (
  get_workspace_role(workspace_id) = 'admin'
  or assigned_to = auth.uid()
  or visibility_role is null
  or visibility_role = get_workspace_role(workspace_id)
);
