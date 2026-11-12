# Expense Manager

A private, mobile-first web app for people who share a home. Track shared expenses and split them fairly, see who owes whom, keep a shared supplies list, and check whether the cat has been fed.

It runs in any browser and installs to your phone's home screen like an app (PWA). There is no app store download.

📖 **Using the app?** Read the [User Guide](USER_GUIDE.md): installing on your phone and using every feature.

## Features

- **Shared expenses.** Record who paid, and split the cost equally, by exact amounts or by percentage. The math is done in whole paise, so shares always add up to the total. Receipts (JPG, PNG, WebP or PDF, up to 10 MB) can be attached.
- **Settlement.** For this month or all time, the total spent is shared equally among members and compared with what each person paid. You get each member's balance and the fewest transfers needed to settle up. Members can save a UPI ID so others know where to pay. Record payments to bring balances to zero.
- **Cat care.** Daily meal slots with one-tap "fed" logging, extra feedings, multiple pets and feeding history. If two people log the same meal at once, only the first one counts.
- **Supplies board.** A shared shopping list. Type an item with its quantity (e.g. `Milk 2L`) and the app sorts it into a category.
- **Households.** Create a household, then invite housemates with an invite code. Admins manage the household; only admins can log Groceries expenses.
- **Notifications.** Optional push notifications for new expenses, feedings and payments, on each device you enable them on.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- Supabase: Postgres with row-level security, email/password auth, storage for receipts, realtime
- Web Push (VAPID) and a service worker for install and offline support

## Getting started

### Requirements

- Node.js 20 or newer, and npm
- A [Supabase](https://supabase.com) project (the free tier is enough)

### 1. Install

```sh
git clone https://github.com/TOUSIF-prog060/House_expense_manager.git
cd House_expense_manager
npm install
```

### 2. Set up the database

Run the SQL files in `supabase/migrations/` against your Supabase project **in filename order**. Either paste each one into the Supabase SQL Editor, or link the project and push them with the Supabase CLI:

```sh
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The migrations create the tables, row-level security policies, database functions, the private `receipts` storage bucket and the realtime setup. No manual bucket or table setup is needed.

### 3. Configure environment variables

```sh
cp .env.example .env.local
```

Fill in `.env.local`. Never commit it.

| Variable | Required | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Yes | Supabase → Project Settings → API keys |
| `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) | Yes | Supabase → Project Settings → API keys. **Server-only**: needed for sign-up, payments, UPI IDs, pets and push notifications. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Recommended | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Recommended | From the same command. **Server-only.** |
| `VAPID_SUBJECT` | Optional | A contact address, e.g. `mailto:you@example.com` |

> Set your own VAPID key pair. Without one, the app falls back to a default key pair that is committed in the repository.

### 4. Configure Supabase Auth

In Supabase → Authentication:

- Make sure the **Email** provider is enabled.
- Under **URL Configuration**, set **Site URL** to your app's address (e.g. `http://localhost:3000` for development) and add `<your-app-url>/auth/callback` to **Redirect URLs**. Password-reset emails use this link.

Sign-up does not send a confirmation email: the server creates accounts as already confirmed.

### 5. Run

```sh
npm run dev
```

Open http://localhost:3000, create an account, then create your household. The dev server also listens on your local network, so you can open it from a phone on the same Wi-Fi at `http://<your-computer-ip>:3000`.

## Deployment

The app is a standard Next.js app and deploys to any Node host, for example [Vercel](https://vercel.com):

1. Import the repository.
2. Add the environment variables from step 3.
3. Deploy, then put the deployed URL into Supabase's **Site URL** and **Redirect URLs** (step 4).

Serve the app over **HTTPS**: browsers only allow installing the app and push notifications on HTTPS (or `localhost`).

## Installing on a phone

- **Android (Chrome):** open the app, then tap **Install** when prompted, or use the **⋮** menu → **Install app**.
- **iPhone (Safari):** tap **Share** → **Add to Home Screen**. Open the app from the home screen icon. Push notifications only work from there.

The app's `/install` page has the same instructions.

## Development

```sh
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test        # Vitest unit tests
npm run build       # production build
```

### Project layout

```
src/app/            pages and API routes (src/app/api)
src/components/     UI components
src/lib/            Supabase clients, money and split calculations, notifications
src/middleware.ts   session refresh and sign-in redirects
supabase/migrations database schema, policies and functions
public/             manifest, service worker, icons
tests/              unit tests
```

## Notes

- The `mobile/` folder (an Expo Android app) lives on the `android-app` branch.
- Data is only available online; the offline cache covers the app shell, and changes need a connection to save.
- `src/lib/backend/google-sheets.ts` and `/api/backend/setup` are left over from an earlier Google Sheets backend and are not used by the app.
