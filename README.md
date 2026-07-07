<<<<<<< HEAD
# TrackFlow - Full-Stack Issue Tracking Application

TrackFlow is a React + Supabase issue tracking app for the assignment. It supports authentication, workspaces, team roles, task sections, Kanban view, List view, comments, in-app notifications, due-date alerts, and shareable task links.

## Tech Stack

- React with Vite
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Vercel deployment

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
cp .env.example .env.local
```

Add your Supabase values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Run the app:

```bash
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run all SQL files inside `supabase/migrations` in timestamp order.
4. Go to Authentication > Providers.
5. Enable Email provider.
6. Enable Google provider.
7. Add Google Client ID and Client Secret.
8. Go to Authentication > URL Configuration.
9. Add local and production redirect URLs.

## Database Migration

The migration files are:

```txt
supabase/migrations/20260706170012_initial_schema.sql
supabase/migrations/20260706173000_team_invites.sql
supabase/migrations/20260706174500_rbac_hardening.sql
supabase/migrations/20260706180000_explicit_task_sharing.sql
supabase/migrations/20260706181500_notification_read_status.sql
supabase/migrations/20260706183000_task_label_rbac.sql
```

Manual dashboard method:

```txt
Supabase Dashboard
SQL Editor
New query
Paste the migration SQL
Run
```

After running the migration, Table Editor should show:

```txt
profiles
workspaces
workspace_members
team_invites
sections
labels
tasks
task_labels
comments
notifications
```

Local redirect URL:

```txt
http://localhost:5173/**
```

Vercel redirect URL:

```txt
https://your-app.vercel.app/**
```

Google OAuth callback URL:

```txt
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

## Role Rules

- Admin: full control over workspace tasks and members.
- Project Manager: can update status and comment on Admin-created tasks, but cannot edit their main content.
- Member: can work with visible or assigned tasks.

## Important Files

```txt
src/lib/supabase.js              Supabase client
src/context/AuthContext.jsx      Login session and profile handling
src/pages/AuthPage.jsx           Email/password and Google login UI
src/pages/DashboardPage.jsx      Workspace creation and list
src/pages/WorkspacePage.jsx      Kanban, list, team, sections, labels
src/components/TaskForm.jsx      Task create/edit form
src/components/TaskDetail.jsx    Task drawer, comments, share link
src/services/workspaceService.js Supabase database calls
supabase/schema.sql              Tables, functions, RLS policies
```

## Deployment

See the full guide in `DEPLOYMENT.md`.

Quick steps:

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Add these environment variables in Vercel:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

4. Deploy.
5. Add the Vercel URL in Supabase Auth redirect URLs.

## Email Notifications

The app creates in-app notification records when a task is assigned or commented on. It also includes a Supabase Edge Function for email notifications:

```txt
supabase/functions/send-notification-email/index.ts
```

Deploy it with Supabase CLI:

```bash
supabase functions deploy send-notification-email
```

Configure these Supabase function secrets:

```txt
RESEND_API_KEY
EMAIL_FROM
SITE_URL
SUPABASE_SERVICE_ROLE_KEY
```

If the Edge Function or email provider is not configured, the app still saves the in-app notification and does not block task/comment actions.
=======
# -Full-Stack-Issue-Tracking-Application
>>>>>>> 6b1daffc743ee95aeed51a3f488816a6ccc19b28
