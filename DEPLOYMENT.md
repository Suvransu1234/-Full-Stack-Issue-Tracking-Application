# Deployment Guide

## Vercel

Use these settings when importing the project into Vercel:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Add these environment variables in Vercel:

```txt
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

The included `vercel.json` rewrites all routes to `index.html` so React Router pages work after refresh:

```txt
/dashboard
/workspace/:workspaceId
/invite/:token
/share/:token
```

## Supabase Auth URLs

After Vercel gives you a production URL, add it in Supabase:

```txt
Authentication -> URL Configuration
```

Site URL:

```txt
https://your-vercel-app.vercel.app
```

Redirect URLs:

```txt
http://localhost:5175/**
https://your-vercel-app.vercel.app/**
```

## Google OAuth

In Google Cloud Console, add:

Authorized JavaScript origins:

```txt
http://localhost:5175
https://your-vercel-app.vercel.app
```

Authorized redirect URI:

```txt
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

Then paste the Google Client ID and Client Secret into:

```txt
Supabase -> Authentication -> Sign In / Providers -> Google
```

## Supabase Database

Run migrations in Supabase SQL Editor in this order:

```txt
supabase/migrations/20260706170012_initial_schema.sql
supabase/migrations/20260706173000_team_invites.sql
supabase/migrations/20260706174500_rbac_hardening.sql
supabase/migrations/20260706180000_explicit_task_sharing.sql
supabase/migrations/20260706181500_notification_read_status.sql
supabase/migrations/20260706183000_task_label_rbac.sql
```

## Email Notifications

Deploy the Edge Function:

```bash
supabase functions deploy send-notification-email
```

Set function secrets:

```txt
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
EMAIL_FROM
SITE_URL=https://your-vercel-app.vercel.app
```

If the email function is not configured, in-app notifications still work.
