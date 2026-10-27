# Turning on sign-in

The planner works without sign-in. The **Log in / Sign up** button and the sign-in step before **See Results** appear on their own once the deployment has working credentials. There is no switch to flip. Until then, the results are open to everyone and `/auth/*` redirects to the planner.

Logging in and signing up are the same step: the first Google sign-in or email link creates the account. Two methods are supported. Set up either or both.

| Method | What it needs |
|---|---|
| Continue with Google | `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Email a sign-in link | `NEXTAUTH_SECRET`, `EMAIL_SERVER_*`, `EMAIL_FROM`, and Supabase |

Supabase is also what lets signed-in users save and load profiles, so set it up with either method.

## 1. The secret (always)

Run `openssl rand -base64 32` and set the output as `NEXTAUTH_SECRET`. On Vercel, also set `NEXTAUTH_URL` to the production address, `https://net-worth-tracker-sandy.vercel.app`.

## 2. Supabase (needed for the email link and saved profiles)

1. Create a project at supabase.com.
2. Open **SQL Editor**, paste all of `supabase/migration.sql`, and run it.
3. Open **Project Settings → API → Exposed schemas** and add `next_auth`.
4. From **Project Settings → API**, copy three values:
   - the Project URL, into `NEXT_PUBLIC_SUPABASE_URL`;
   - the `anon` key, into `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
   - the `service_role` key, into `SUPABASE_SERVICE_ROLE_KEY`.

The `service_role` key is a secret. It goes in `.env.local` and in Vercel's environment variables only, never in the code.

## 3. Google

1. In the Google Cloud console, open **APIs & Services → Credentials → Create credentials → OAuth client ID**, and choose **Web application**.
2. Add both authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://net-worth-tracker-sandy.vercel.app/api/auth/callback/google`
3. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. Put the OAuth consent screen into production, or add testers to it. Otherwise only listed test users can sign in.

## 4. Email link (Resend, or any SMTP service)

1. Create a Resend account and verify the domain you will send from.
2. Create an API key.
3. Set the email variables:

   | Variable | Value |
   |---|---|
   | `EMAIL_SERVER_HOST` | `smtp.resend.com` |
   | `EMAIL_SERVER_PORT` | `465` |
   | `EMAIL_SERVER_USER` | `resend` |
   | `EMAIL_SERVER_PASSWORD` | the API key |
   | `EMAIL_FROM` | an address on the verified domain, e.g. `plans@yourdomain.com` |

The email link needs Supabase from step 2, which keeps its one-time tokens.

## 5. Turn it on

- **Locally:** put the values in `.env.local` and restart `npm run dev`.
- **On Vercel:** add them under **Project → Settings → Environment Variables**, then redeploy. The values are read when the app is built, so a new value only takes effect after a redeploy.

## How the flow works

- Users go through the whole planner signed out, up to the Strategy Hub.
- **See Results** while signed out saves the plan and where the user was going in this browser, then opens Log in / Sign up. The same happens if they click Review in the stepper.
- After signing in, they land on their results with everything they entered. **Back to planner** returns them to the step they left.
- The plan in progress is also kept in this browser while signed in, so a reload doesn't lose it. Signing out clears it.
- An email link must be opened in the same browser, because that is where the answers are kept until the user is signed in.

## Previewing without credentials

In development only, `NEXT_PUBLIC_DEMO_AUTH=true` in `.env.local` turns on a demo login. It accepts any email, signs in instantly and creates no real account. It is compiled out of production builds.
