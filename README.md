# OurHome

A private, mobile-first household app for shared expenses, accurate settlement, and cat-care check-ins. OurHome is built for a small apartment household, while its membership model supports additional members.

## Progress

- [x] Responsive Next.js application shell, onboarding, and navigation
- [x] Shared, unauthenticated household access
- [x] Google Sheets server client and explicit, repeatable workbook schema initializer
- [x] Sheets-backed household creation/join, expense create/edit/delete, cat feeding, payments, and activity routes
- [x] Sheets-backed dashboard, expense, cat-care, settlement, profile, and settings reads
- [x] Equal, exact, percentage, and paise-safe split calculations
- [ ] Receipt upload (Google Drive credentials and private file API still needed)
- [x] Cat meal slots, feeding history, extra feeding, and duplicate check in the API (Sheets cannot enforce a unique constraint)
- [x] Month totals, member balances, simplified settlements, and payment recording
- [x] Installable PWA shell, offline banner/cache, and install instructions
- [x] Notification preference storage; push delivery remains unconnected
- [x] Financial and Sheets schema/API setup tests
- [ ] Configure the Google service account, then run live household tests
- [ ] Add Google Drive receipts and a push sender that reads Sheets-backed subscriptions
- [ ] Verify production iOS/Android install and push behavior on real devices
- [ ] Complete accessibility, RLS, concurrency, and end-to-end security checks

## Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Lucide
- Google Sheets API as household data store
- Unauthenticated shared identity; every visitor acts as the same household member
- Web Push shell exists; delivery needs a Sheets-aware sender
- Vercel hosting (HTTPS required for production web push)

## Requirements

- Node.js 20.9 or newer and npm
- Google Cloud project with Sheets API enabled and a service account

## Install and run

```sh
npm install
cp .env.example .env.local
npm run dev
```

The app opens directly into the household UI. Household data routes use the configured Google Sheet.

## Environment variables

Copy `.env.example` to `.env.local` and fill the Google Sheets values. Never put service credentials in a `NEXT_PUBLIC_` variable or commit them.

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
```

Authentication is disabled. All visitors share one fixed identity and have the same household access, including admin actions. Anyone who can reach the app can read and change the workbook through the app. Do not deploy it on a public URL or store sensitive household data unless you add an access-control layer in front of the app. Google service-account credentials remain server-only.

### Google Sheets backend

The target workbook is **MR HEIGHTS** (`1AhliDIzXqOsaKW_81IX50tX40WaD7dlgjFwE64Z-hIY`). The server client is in `src/lib/backend/google-sheets.ts`; it uses a Google service account and never exposes its credentials to browser code. Add these values to `.env.local` (do not commit that file):

```env
GOOGLE_SHEETS_ID=1AhliDIzXqOsaKW_81IX50tX40WaD7dlgjFwE64Z-hIY
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account", ...}
```

Create a service account in a Google Cloud project, enable the Google Sheets API, create a JSON key, and share **MR HEIGHTS** with the service account's `client_email` as an editor. Keep the key private. After setting the variables, open Household settings and choose **Initialize Google Sheets** (or send `POST /api/backend/setup`) to create the app tabs and header rows. Setup is idempotent. It leaves the existing `Sheet1` untouched and fails safely if an app tab already has unexpected headers.

The initial workbook model uses one tab per entity: `profiles`, `households`, `household_members`, `household_invites`, `expense_categories`, `expenses`, `expense_shares`, `expense_attachments`, `payments`, `meal_slots`, `cat_feedings`, `push_subscriptions`, `notifications`, and `activity_events`. Money is stored as integer paise. Receipt binary files need Google Drive or another private object store; the sheet stores only Drive file IDs. Google Sheets does not provide database row-level security or transactions, so the app API must enforce household membership and concurrent writes need special care. Do not publish the workbook to “anyone with the link.”

## Receipts and notifications

Receipt upload and push delivery are not connected to the Sheets backend yet. Expense creation is available without a receipt; the app explains when a selected receipt cannot be uploaded. Notification preferences are stored in the workbook, but delivery requires a separate sender. The legacy Supabase storage and push code is not used by current app pages.

## PWA install

The app includes a manifest, standalone mode, theme colors, service worker, offline shell cache, SVG icon, and an install-help route. Android browsers may offer the native install prompt. iPhone users open OurHome in Safari, tap Share, choose **Add to Home Screen**, then launch from the Home Screen before enabling Web Push. Production install/push requires HTTPS.

## Development checks

```sh
npm run typecheck
npm run test
npm run lint
npm run build
```

Current tests cover equal rounding, exact shares, percentage splits, excluded participants, settlement calculations, sheet row mapping/schema creation, and authenticated API setup behavior. Live Google API tests still require the service-account credential and workbook permission. Sheets does not provide database transactions or row-level security; review the concurrent-write and household isolation limits before production.

## Deployment to Vercel

1. Import the repository into Vercel.
2. Set `GOOGLE_SHEETS_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` for the deployment environment. Keep the service account JSON server-only.
3. Put the app behind a private network or an access-control proxy before exposing it to other networks.
4. Deploy to an HTTPS domain, then test household setup, receipt access, feeding concurrency, realtime, and push on iOS Home Screen and Android.

## Troubleshooting

- **Sheets connection is unavailable:** check `.env.local`, restart `npm run dev`, and verify the service account can edit the workbook.
- **Profile/household not visible:** initialize the Sheets tabs and create a household from onboarding.
- **Receipt upload denied:** confirm the private `receipts` bucket and its folder policies exist and the file is below 10 MB.
- **Duplicate meal:** the first database insert wins; a duplicate `23505` response means another household member already recorded that slot.
- **No push prompt:** HTTPS is required in production; the user must explicitly enable it. On iPhone, use the installed Home Screen app.
- **Push subscription works but no message arrives:** configure/deploy the Edge Function, VAPID secrets, event queue/triggers, and recipient preferences; remove/re-register stale device subscriptions.
- **Realtime appears stale:** the Sheets-backed implementation does not currently provide realtime synchronization.

## Current scope

Receipt OCR, recurring expenses, reminders' scheduling UI, bank/UPI processing, multiple pets, and app-store releases are intentionally out of the initial implementation. Financial writes are not queued offline.
