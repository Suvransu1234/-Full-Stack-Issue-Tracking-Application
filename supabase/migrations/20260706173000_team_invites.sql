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

alter table team_invites enable row level security;

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
