# Daymark

A calm, responsive day-to-day task and to-do tracker. Daymark works immediately as a local demo, and can sync tasks for each account with Supabase email authentication and a PostgreSQL database.

## Run locally

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase credentials, the app opens in demo mode and saves tasks in this browser.

## Connect Supabase and Google sign-in

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). This creates the `public.tasks` table and enables row-level security. Each row has a `user_id` linked to `auth.users`; its policies restrict reads, inserts, updates, and deletes to the signed-in owner. The app supplies the user's ID when adding a task, while the database policies enforce ownership.
3. In **Project Settings → API**, copy the Project URL and publishable key (or legacy anon key). Copy `.env.example` to `.env.local` and set them as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then restart the dev server. These are public client values; never expose a service-role key in the browser or in a `NEXT_PUBLIC_` variable.
4. In Supabase **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the allowed redirect URLs.
5. In **Authentication → Providers → Google**, enable Google and note the callback URL shown by Supabase. It looks like `https://<project-ref>.supabase.co/auth/v1/callback`.
6. In the [Google Cloud Console](https://console.cloud.google.com/), create/select a project, configure the OAuth consent screen, and create an OAuth Client ID of type **Web application**. Add your app origins (for local development, `http://localhost:3000`) under **Authorized JavaScript origins**. Add the exact Supabase callback URL from step 5 under **Authorized redirect URIs**. Copy the Google client ID and secret into Supabase's Google provider settings and save.
7. Restart the app and choose **Continue with Google**. Supabase creates a user in `auth.users` on the first successful login. Every account receives its own private task list automatically; users cannot see another account's tasks.

While the Google OAuth consent screen is in **Testing**, only the test users listed in Google Cloud can sign in. Add the people who need access there, or publish/configure the consent screen for your intended audience.

### Sharing tasks between people

The current app is a personal task tracker: authentication lets many people use the same deployment, while row-level security keeps each person's tasks private. It does **not** share tasks across accounts. Shared workspaces would need workspace and membership tables, invitation flows, and corresponding RLS policies.

## Reminders

Each task can have a due date and time. Click the bell and allow browser notifications to receive a reminder while Daymark is open in that browser. Browser notifications require permission and are subject to browser and operating-system notification settings.

## Deploy to Vercel

1. Push this project to a Git provider and import it in Vercel (or run `npx vercel`).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project’s **Settings → Environment Variables** for the environments you use.
3. In Google Cloud, add your production domain under **Authorized JavaScript origins**. Keep the Supabase callback URL (from the Google provider settings) as the **Authorized redirect URI**.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to your production domain and add `https://YOUR-DOMAIN/auth/callback` to the allowed redirect URLs. Keep `http://localhost:3000/auth/callback` for development.
5. Deploy. Vercel detects the Next.js app and builds it with `npm run build`.

## Checks

```bash
npm run lint
npm run build
```
