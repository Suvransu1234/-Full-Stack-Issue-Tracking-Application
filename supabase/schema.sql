create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'project_manager', 'member')),
  created_at timestamptz default now(),
  unique (workspace_id, user_id)
);

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'project_manager', 'member')),
  token text not null unique default gen_random_uuid()::text,
  accepted boolean default false,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  order_index integer default 0,
  created_at timestamptz default now()
);

create table if not exists labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#2563eb',
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  section_id uuid references sections(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('backlog', 'todo', 'in_progress', 'review', 'done')),
  priority text not null default 'P3'
    check (priority in ('P1', 'P2', 'P3')),
  due_date date,
  created_by uuid references profiles(id) on delete set null,
  created_by_role text not null default 'member'
    check (created_by_role in ('admin', 'project_manager', 'member')),
  assigned_to uuid references profiles(id) on delete set null,
  visibility_role text check (visibility_role in ('admin', 'project_manager', 'member')),
  share_token text unique default gen_random_uuid()::text,
  share_enabled boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists task_labels (
  task_id uuid references tasks(id) on delete cascade,
  label_id uuid references labels(id) on delete cascade,
  primary key (task_id, label_id)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  type text not null,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.get_workspace_role(workspace_id_input uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from workspace_members
  where workspace_id = workspace_id_input
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.create_workspace_with_owner(workspace_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into workspaces (name, created_by)
  values (workspace_name, auth.uid())
  returning id into new_workspace_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'admin');

  insert into sections (workspace_id, name, order_index)
  values
    (new_workspace_id, 'Frontend', 1),
    (new_workspace_id, 'Backend', 2),
    (new_workspace_id, 'Design', 3);

  insert into labels (workspace_id, name, color)
  values
    (new_workspace_id, 'Bug', '#dc2626'),
    (new_workspace_id, 'User Story', '#2563eb'),
    (new_workspace_id, 'Feature', '#059669');

  return new_workspace_id;
end;
$$;

create or replace function public.add_workspace_member_by_email(
  workspace_id_input uuid,
  member_email text,
  member_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  requester_role text;
  new_member_id uuid;
begin
  requester_role := get_workspace_role(workspace_id_input);

  if requester_role <> 'admin' then
    raise exception 'Only admins can add workspace members';
  end if;

  if member_role not in ('admin', 'project_manager', 'member') then
    raise exception 'Invalid role';
  end if;

  select id into target_user_id
  from profiles
  where lower(email) = lower(member_email)
  limit 1;

  if target_user_id is null then
    raise exception 'User must sign up before being added';
  end if;

  insert into workspace_members (workspace_id, user_id, role)
  values (workspace_id_input, target_user_id, member_role)
  on conflict (workspace_id, user_id) do update set role = excluded.role
  returning id into new_member_id;

  return new_member_id;
end;
$$;

create or replace function public.accept_team_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row team_invites;
  current_email text;
  new_member_id uuid;
begin
  select * into invite_row
  from team_invites
  where token = invite_token
    and accepted = false
    and expires_at > now()
  limit 1;

  if invite_row.id is null then
    raise exception 'Invite is invalid or expired';
  end if;

  select email into current_email
  from profiles
  where id = auth.uid()
  limit 1;

  if lower(current_email) <> lower(invite_row.email) then
    raise exception 'This invite belongs to a different email address';
  end if;

  insert into workspace_members (workspace_id, user_id, role)
  values (invite_row.workspace_id, auth.uid(), invite_row.role)
  on conflict (workspace_id, user_id) do update set role = excluded.role
  returning id into new_member_id;

  update team_invites
  set accepted = true
  where id = invite_row.id;

  return invite_row.workspace_id;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on tasks;
create trigger tasks_touch_updated_at
before update on tasks
for each row execute procedure public.touch_updated_at();

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

drop trigger if exists tasks_enforce_permissions on tasks;
create trigger tasks_enforce_permissions
before update on tasks
for each row execute procedure public.enforce_task_update_permissions();

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table team_invites enable row level security;
alter table sections enable row level security;
alter table labels enable row level security;
alter table tasks enable row level security;
alter table task_labels enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;

drop policy if exists "profiles read authenticated" on profiles;
create policy "profiles read authenticated" on profiles
for select to authenticated using (true);

drop policy if exists "profiles insert own" on profiles;
create policy "profiles insert own" on profiles
for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles update own" on profiles;
create policy "profiles update own" on profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "workspaces visible to members" on workspaces;
create policy "workspaces visible to members" on workspaces
for select to authenticated
using (
  exists (
    select 1 from workspace_members
    where workspace_members.workspace_id = workspaces.id
      and workspace_members.user_id = auth.uid()
  )
);

drop policy if exists "workspace members visible to members" on workspace_members;
create policy "workspace members visible to members" on workspace_members
for select to authenticated using (get_workspace_role(workspace_id) is not null);

drop policy if exists "team invites admin read" on team_invites;
create policy "team invites admin read" on team_invites
for select to authenticated
using (get_workspace_role(workspace_id) = 'admin');

drop policy if exists "team invites recipient read" on team_invites;
create policy "team invites recipient read" on team_invites
for select to authenticated
using (
  accepted = false
  and expires_at > now()
  and lower(email) = lower((select email from profiles where id = auth.uid()))
);

drop policy if exists "team invites admin insert" on team_invites;
create policy "team invites admin insert" on team_invites
for insert to authenticated
with check (
  get_workspace_role(workspace_id) = 'admin'
  and created_by = auth.uid()
);

drop policy if exists "team invites admin update" on team_invites;
create policy "team invites admin update" on team_invites
for update to authenticated
using (get_workspace_role(workspace_id) = 'admin')
with check (get_workspace_role(workspace_id) = 'admin');

drop policy if exists "sections visible to members" on sections;
create policy "sections visible to members" on sections
for select to authenticated using (get_workspace_role(workspace_id) is not null);

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

drop policy if exists "sections admin manage" on sections;
create policy "sections admin manage" on sections
for all to authenticated
using (get_workspace_role(workspace_id) = 'admin')
with check (get_workspace_role(workspace_id) = 'admin');

drop policy if exists "labels visible to members" on labels;
create policy "labels visible to members" on labels
for select to authenticated using (get_workspace_role(workspace_id) is not null);

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

drop policy if exists "labels admin manage" on labels;
create policy "labels admin manage" on labels
for all to authenticated
using (get_workspace_role(workspace_id) = 'admin')
with check (get_workspace_role(workspace_id) = 'admin');

drop policy if exists "tasks role visibility" on tasks;
create policy "tasks role visibility" on tasks
for select to authenticated
using (
  get_workspace_role(workspace_id) = 'admin'
  or assigned_to = auth.uid()
  or visibility_role is null
  or visibility_role = get_workspace_role(workspace_id)
);

drop policy if exists "tasks public share read" on tasks;
create policy "tasks public share read" on tasks
for select to anon using (share_enabled = true and share_token is not null);

drop policy if exists "tasks members insert" on tasks;
create policy "tasks members insert" on tasks
for insert to authenticated
with check (get_workspace_role(workspace_id) is not null and created_by = auth.uid());

drop policy if exists "tasks update allowed" on tasks;
create policy "tasks update allowed" on tasks
for update to authenticated
using (get_workspace_role(workspace_id) in ('admin', 'project_manager', 'member'))
with check (get_workspace_role(workspace_id) in ('admin', 'project_manager', 'member'));

drop policy if exists "tasks delete admin" on tasks;
create policy "tasks delete admin" on tasks
for delete to authenticated using (get_workspace_role(workspace_id) = 'admin');

drop policy if exists "task labels visible" on task_labels;
create policy "task labels visible" on task_labels
for select to authenticated
using (exists (select 1 from tasks where tasks.id = task_labels.task_id));

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

drop policy if exists "comments visible on visible tasks" on comments;
create policy "comments visible on visible tasks" on comments
for select to authenticated
using (exists (select 1 from tasks where tasks.id = comments.task_id));

drop policy if exists "comments insert on workspace tasks" on comments;
create policy "comments insert on workspace tasks" on comments
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from tasks
    where tasks.id = comments.task_id
      and get_workspace_role(tasks.workspace_id) is not null
  )
);

drop policy if exists "notifications own select" on notifications;
create policy "notifications own select" on notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications own update" on notifications;
create policy "notifications own update" on notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "notifications insert by members" on notifications;
create policy "notifications insert by members" on notifications
for insert to authenticated
with check (
  exists (
    select 1 from tasks
    where tasks.id = notifications.task_id
      and get_workspace_role(tasks.workspace_id) is not null
  )
);
