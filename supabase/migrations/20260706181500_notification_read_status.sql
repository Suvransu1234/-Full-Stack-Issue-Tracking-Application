drop policy if exists "notifications own update" on notifications;
create policy "notifications own update" on notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
