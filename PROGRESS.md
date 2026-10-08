# OurHome Production Supabase Backend Status

## Production Supabase Integration Complete

1. **Authentication**:
   - Supabase Auth (`auth.users`) integrated with server-side cookie sessions via `@supabase/ssr`.
   - Middleware session verification protecting all `/home`, `/expenses`, `/cat`, `/settlement`, `/profile`, and `/settings` routes.
   - Profile trigger automatically synchronizes `auth.users` to `public.profiles`.
   - Auto-confirm signup route at `/api/auth/signup` preventing Supabase free tier email rate limits.

2. **Database & Schema**:
   - All 14 PostgreSQL tables active in project `tpwpqgdztvvdqnchzwud`.
   - Tables: `profiles`, `households`, `household_members`, `household_invites`, `expense_categories`, `expenses`, `expense_shares`, `expense_attachments`, `payments`, `meal_slots`, `cat_feedings`, `push_subscriptions`, `notifications`, `activity_events`.
   - Seed data: 16 expense categories (including dedicated pet categories).

3. **Atomic RPCs & Concurrency Hardening**:
   - `create_household`: Initializes household, sets admin role, provisions default meal slots ('Morning', 'Afternoon', 'Evening').
   - `create_household_invite` & `join_household`: Cryptographic SHA-256 invite codes with expiration.
   - `create_expense_with_shares`: Atomic creation of expense, shares, and activity event in a single transaction.
   - `update_expense_with_shares`: Atomic updates with share recalculations.
   - `delete_expense`: Atomic deletion with activity log.
   - `mark_cat_fed`: Database-level unique constraint (`cat_feedings_scheduled_unique`) enforcing `CAT_ALREADY_FED` (code `23505`) to prevent double-feeding races.
   - `record_extra_feeding`: Non-scheduled treats/extra meals with timezone awareness.
   - `record_payment`: Balance settlements with validation.
   - `leave_household`: Membership status update.

4. **Security & Row Level Security (RLS)**:
   - RLS enabled on all 14 tables with `is_household_member(household_id)` and `is_household_admin(household_id)` checks.
   - `SUPABASE_SECRET_KEY` isolated to server runtime (`src/lib/supabase/admin.ts`) with browser execution guard.

5. **Storage**:
   - Private `receipts` bucket configured (`public: false`, 10MB limit, image & PDF MIME type restrictions).
   - Household-scoped object storage policies (`household_id/expense_id/filename`).
   - Private signed URLs generated on-demand for receipt inspection.

6. **Realtime**:
   - `supabase_realtime` publication enabled for `expenses`, `expense_shares`, `cat_feedings`, `payments`, `notifications`, and `activity_events`.
   - Client-side listener (`HouseholdRealtimeListener`) updates state dynamically.
