# TrackFlow - Full-Stack Issue Tracking Application

TrackFlow is a React + Supabase issue tracking app for the assignment. It supports authentication, workspaces, team roles, task sections, Kanban view, List view, comments, in-app notifications, due-date alerts, drag-and-drop status updates, and shareable task links.

## Live App

```txt
https://full-stack-issue-tracking-applicati-two.vercel.app/
```

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

Environment values:

```env
VITE_SUPABASE_URL=https://xyheljrroqjncohiwahk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_kW3btZQUijbdkS6_368ZRw_9bVXJFDp
```

Run the app:

```bash
npm run dev
```

## Supabase Setup

1. Open Supabase SQL Editor.
2. Run all SQL files inside `supabase/migrations` in timestamp order.
3. Enable Email provider.
4. Enable Google provider.
5. Add Google Client ID and Client Secret.
6. Add local and production redirect URLs.

## Database Migrations

Run these files in order:

```txt
supabase/migrations/20260706170012_initial_schema.sql
supabase/migrations/20260706173000_team_invites.sql
supabase/migrations/20260706174500_rbac_hardening.sql
supabase/migrations/20260706180000_explicit_task_sharing.sql
supabase/migrations/20260706181500_notification_read_status.sql
supabase/migrations/20260706183000_task_label_rbac.sql
supabase/migrations/20260707103000_public_share_details.sql
supabase/migrations/20260707114500_team_invite_preview.sql
```

## Auth URLs

Supabase Site URL:

```txt
https://full-stack-issue-tracking-applicati-two.vercel.app
```

Supabase Redirect URLs:

```txt
http://localhost:5173/**
http://localhost:5174/**
https://full-stack-issue-tracking-applicati-two.vercel.app/**
```

Google OAuth callback URL:

```txt
https://xyheljrroqjncohiwahk.supabase.co/auth/v1/callback
```

## Role Rules

- Admin: full control over workspace tasks and members.
- Project Manager: can update status and comment on Admin-created tasks, but cannot edit their main content.
- Member: can work with visible or assigned tasks.
- Only Admins can create new tasks.

## Important Files

```txt
src/lib/supabase.js              Supabase client
src/context/AuthContext.jsx      Login session and profile handling
src/pages/AuthPage.jsx           Email/password and Google login UI
src/pages/DashboardPage.jsx      Workspace creation and list
src/pages/WorkspacePage.jsx      Kanban, list, team, sections, labels
src/components/TaskForm.jsx      Task create/edit form
src/components/TaskDetail.jsx    Task details, comments, share link
src/services/workspaceService.js Supabase database calls
supabase/schema.sql              Tables, functions, RLS policies
```

## Deployment

Vercel project URL:

```txt
https://full-stack-issue-tracking-applicati-two.vercel.app/
```

Environment variables required in Vercel:

```txt
VITE_SUPABASE_URL=https://xyheljrroqjncohiwahk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_kW3btZQUijbdkS6_368ZRw_9bVXJFDp
```

## Email Notifications

The app creates in-app notification records when a task is assigned or commented on. It also includes Supabase Edge Functions for task notifications and workspace invite emails:

```txt
supabase/functions/send-notification-email/index.ts
supabase/functions/send-invite-email/index.ts
```

If the Edge Functions or email provider are not configured, the app still saves the in-app notification and generates invite links without blocking the user.
