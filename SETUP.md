# Suresh × Tanu Compatibility App

A mobile-first couple questionnaire with private submissions and a results report that unlocks only after both participants submit.

## What you need
- A free Supabase account: https://supabase.com
- A free Vercel account: https://vercel.com
- A GitHub account (recommended for easiest deployment)

## 1. Create the Supabase database
1. Create a new Supabase project.
2. Open **SQL Editor → New query**.
3. Paste and run the complete contents of `supabase/schema.sql`.

## 2. Deploy the secure API
Install the Supabase CLI, sign in, and link your project:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Set the Edge Function's server-side secret and deploy:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase functions deploy couple-api --no-verify-jwt
```

Find the service-role key in **Supabase → Project Settings → API Keys** (legacy projects may show it under API → service_role). It is a secret. Never put it in `config.js`, GitHub, or Vercel's public environment variables.

Your function URL will be:

`https://YOUR_PROJECT_REF.supabase.co/functions/v1/couple-api`

## 3. Configure the website
1. Open `config.js`.
2. Replace `PASTE_YOUR_SUPABASE_FUNCTION_URL_HERE` with the function URL above.
3. Save the file.

## 4. Publish on Vercel
1. Push the project folder to a new **private GitHub repository**.
2. In Vercel, choose **Add New → Project**, import that repository.
3. Framework preset: **Other**. Build command: leave blank. Output directory: `.`.
4. Deploy.

The app is now available at your Vercel URL. Open it, choose **Create our couple room**, complete your test, and send Tanu the generated invitation link.

## How the experience works
- Suresh creates the room; the app creates a one-time Tanu invitation.
- Tanu opens the invitation and claims the Tanu participant slot.
- Both answer the same 30 statements on their own devices.
- Answers are stored server-side. The results endpoint refuses to return answers until both participants have submitted.
- The waiting screen checks the room every five seconds and opens the report when both are done.

## Important notes
- The app does not require either participant to create an account.
- Participant access tokens are stored in each browser's local storage. Keep your own device/browser session; clearing site data will remove that local session.
- The room invitation is intended to be shared privately. Anyone who gets an unused invitation can claim Tanu's slot.
- This is a lightweight personal project, not a formally audited security product. The Edge Function uses the service-role key only server-side; the database has RLS enabled and no public table policies.
- The 30-item score measures answer similarity, not relationship quality or love.
- Free hosting/database plans have provider-specific usage limits and may pause inactive projects.

## Troubleshooting
- **“App hasn't been connected…”**: update `config.js`, commit, and redeploy.
- **CORS/network error**: confirm the function is deployed and the URL is copied exactly.
- **Invitation already claimed**: the Tanu slot is one-time. Create a fresh room and share its new link.
- **Results not appearing**: both participants must press Submit; leaving the page before submission does not count.
