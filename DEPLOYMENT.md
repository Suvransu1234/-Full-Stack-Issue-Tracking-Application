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
VITE_SUPABASE_URL=https://xyheljrroqjncohiwahk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_kW3btZQUijbdkS6_368ZRw_9bVXJFDp
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
https://full-stack-issue-tracking-applicati-two.vercel.app
```

Redirect URLs:

```txt
http://localhost:5173/**
http://localhost:5174/**
https://full-stack-issue-tracking-applicati-two.vercel.app/**
```

## Google OAuth

In Google Cloud Console, add:

Authorized JavaScript origins:

```txt
http://localhost:5173
http://localhost:5174
https://full-stack-issue-tracking-applicati-two.vercel.app
```

Authorized redirect URI:

```txt
https://xyheljrroqjncohiwahk.supabase.co/auth/v1/callback
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
supabase/migrations/20260707103000_public_share_details.sql
supabase/migrations/20260707114500_team_invite_preview.sql
```

## Email Notifications

Deploy the Edge Functions:

```bash
supabase functions deploy send-notification-email
supabase functions deploy send-invite-email
```

Set function secrets:

```txt
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
EMAIL_FROM
SITE_URL=https://full-stack-issue-tracking-applicati-two.vercel.app
```

If the email functions are not configured, invite links and in-app notifications still work, but external emails are skipped.
