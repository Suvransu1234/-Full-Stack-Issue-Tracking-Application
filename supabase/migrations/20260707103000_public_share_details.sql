drop policy if exists "shared task labels public read" on task_labels;
create policy "shared task labels public read" on task_labels
for select to anon
using (
  exists (
    select 1
    from tasks
    where tasks.id = task_labels.task_id
      and tasks.share_enabled = true
      and tasks.share_token is not null
  )
);

drop policy if exists "shared labels public read" on labels;
create policy "shared labels public read" on labels
for select to anon
using (
  exists (
    select 1
    from task_labels
    join tasks on tasks.id = task_labels.task_id
    where task_labels.label_id = labels.id
      and tasks.share_enabled = true
      and tasks.share_token is not null
  )
);

drop policy if exists "shared sections public read" on sections;
create policy "shared sections public read" on sections
for select to anon
using (
  exists (
    select 1
    from tasks
    where tasks.section_id = sections.id
      and tasks.share_enabled = true
      and tasks.share_token is not null
  )
);
