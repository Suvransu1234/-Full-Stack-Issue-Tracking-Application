create or replace function public.create_task_notification(
  target_user_id uuid,
  task_id_input uuid,
  notification_type text,
  notification_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  task_workspace_id uuid;
  new_notification_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select workspace_id
  into task_workspace_id
  from tasks
  where id = task_id_input;

  if task_workspace_id is null then
    raise exception 'Task not found';
  end if;

  if not exists (
    select 1
    from workspace_members
    where workspace_id = task_workspace_id
      and user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
    from workspace_members
    where workspace_id = task_workspace_id
      and user_id = target_user_id
  ) then
    raise exception 'Target user is not in this workspace';
  end if;

  insert into notifications (user_id, task_id, type, message)
  values (target_user_id, task_id_input, notification_type, notification_message)
  returning id into new_notification_id;

  return new_notification_id;
end;
$$;

grant execute on function public.create_task_notification(uuid, uuid, text, text) to authenticated;
