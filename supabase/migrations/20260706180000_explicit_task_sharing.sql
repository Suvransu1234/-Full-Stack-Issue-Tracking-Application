alter table tasks
add column if not exists share_enabled boolean not null default false;

drop policy if exists "tasks public share read" on tasks;
create policy "tasks public share read" on tasks
for select to anon
using (share_enabled = true and share_token is not null);
