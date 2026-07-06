# Assignment Checklist

Use this file while explaining the project to a reviewer or team leader.

## Requirement Mapping

| Requirement | Where it is implemented |
| --- | --- |
| React frontend | `src/` Vite React app |
| Supabase backend/database | `src/lib/supabase.js`, `supabase/schema.sql`, `supabase/migrations/` |
| Email/password auth | `src/pages/AuthPage.jsx`, `src/context/AuthContext.jsx` |
| Google OAuth | `signInWithGoogle` in `src/context/AuthContext.jsx` |
| Workspace/team management | `src/pages/DashboardPage.jsx`, Team view in `src/pages/WorkspacePage.jsx` |
| Invite team members | `team_invites` table, `/invite/:token`, `src/pages/InvitePage.jsx` |
| Custom sections/categories | Settings view and quick section creation in task form |
| Kanban board view | `view === 'board'` in `src/pages/WorkspacePage.jsx` |
| List view | `view === 'list'` in `src/pages/WorkspacePage.jsx` |
| Labels, priorities, due dates | `src/components/TaskForm.jsx`, `tasks`, `labels`, `task_labels` tables |
| Comments | `src/components/TaskDetail.jsx`, `comments` table |
| In-app notifications | `notifications` table and notification popover |
| Email notifications | `supabase/functions/send-notification-email/index.ts` |
| Due-date alert | `isOverdue` in `src/lib/constants.js`, workspace warning and popover |
| Shareable task link | `/share/:token`, `src/pages/SharePage.jsx`, `enableTaskSharing` |
| RBAC visibility | `tasks role visibility` RLS policy and `canViewTask` |
| Admin full control | RLS policies and `canEditTaskMain` / `canDeleteTask` |
| PM restricted on Admin tasks | `enforce_task_update_permissions`, task label RBAC, disabled task fields |
| Responsive UI | CSS media queries in `src/index.css` |
| Vercel deployment readiness | `vercel.json`, `DEPLOYMENT.md` |

## Demo Flow

1. Login or sign up with email/password.
2. Create a workspace from the dashboard.
3. Open the workspace using the `Open workspace` button.
4. Create an issue with title, priority, section, labels, assignee, due date, and visibility.
5. Switch between `Issues` and `List`.
6. Add a comment and mention a teammate with `@email` or `@name`.
7. Generate a share link from the task drawer.
8. Go to `Team`, generate an invite link, or add an existing signed-up user.
9. Go to `Settings`, create a section and label.
10. Test RBAC using another account with Project Manager role.

## External Setup Still Required

These cannot be completed only from code:

- Run every SQL file in `supabase/migrations/` in timestamp order.
- Enable Supabase Email provider.
- Enable Supabase Google provider with a real Google OAuth Client ID and Secret.
- Deploy the Supabase Edge Function and add Resend/email secrets if email sending must work.
- Deploy the app on Vercel and add Vercel URL to Supabase redirect URLs.
