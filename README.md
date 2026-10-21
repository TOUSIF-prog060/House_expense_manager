# OurHome (Expense Manager) — Current Features

A private, mobile-first household application designed for shared apartment living. It brings shared expense tracking, instant UPI debt settlements, race-condition-proof pet care, and a collaborative grocery/supplies board into a single synchronized space.

> 📖 For detailed usage workflows, see the [User Guide](USER_GUIDE.md).

---

## 1. Shared Expenses & Bill Splitting

- **Paise-Safe Financial Engine**: All calculations are computed in integer paise (₹0.01 precision) to eliminate floating-point rounding errors and phantom cents.
- **Flexible Split Methods**:
  - **Equal Split**: Evenly divided among participants with automated remainder distribution.
  - **Exact Amounts**: Custom rupee amounts allocated per member.
  - **Percentage Split**: Precise percentage allocations totaling 100%.
- **Participant Exclusion**: Checkbox toggles to exclude specific members from any bill.
- **Admin Grocery Policy**: When the expense category is **Groceries**, creation is restricted to household admins to prevent duplicate or uncoordinated bulk pantry orders.
- **Receipt Attachments**: Upload and view JPG, PNG, WEBP, or PDF receipts (up to 10 MB) backed by private storage with secure signed URLs.
- **Edit & Delete**: Full edit and deletion controls with automatic recalculation of member shares.
- **Date & Member Filtering**: Filter expenses by member, month, or custom date intervals.

---

## 2. Debt Settlement & Instant UPI Payments

- **Live Net Balances**: Real-time balance calculations showing who owes whom across all roommates.
- **Debt Simplification**: Graph-based algorithm resolves cyclic multi-party debts into the minimum number of direct transfers.
- **One-Tap UPI Deep Linking**:
  - Roommates register their UPI ID (`username@bank`) on their profile.
  - Tapping **Pay via UPI** launches native payment apps (Google Pay, PhonePe, Paytm, BHIM) on mobile with prefilled recipient and amount via `upi://pay`.
  - Fallback button to copy the recipient's UPI VPA directly to clipboard.
- **Settlement Recording**: Log payments made via UPI, cash, or bank transfer with optional notes.
- **Payment History**: Immutable audit log of past settlements with time-period filters.

---

## 3. Pet Care & Feeding Coordination

- **Multi-Pet Management**: Register and manage multiple cats or pets within the household.
- **Scheduled Meal Slots**: Customizable meal times (defaulting to *Morning*, *Afternoon*, and *Evening*) tailored to your household's routine.
- **Race-Condition-Proof Feeding**:
  - Enforced by a database-level unique constraint (`cat_feedings_scheduled_unique`).
  - If two roommates tap "Feed" concurrently, the second write is rejected with an HTTP 409 `CAT_ALREADY_FED` warning, displaying who recorded the meal and at what time.
- **Extra Meals & Treats**: Log treats, medicine, or unscheduled feedings with custom notes.
- **Feeding Date Navigator**: History calendar to browse past days' feeding logs and verify meal completions.

---

## 4. Supplies & Grocery Board

- **Smart Natural-Language Input**: Automatically parses input into item name and quantity (e.g., typing `"Milk 2L"` or `"Eggs 12 pcs"`).
- **Automatic Categorization**: Keyword-based classification into 8 categories:
  - *Groceries*, *Vegetables & Fruits*, *Dairy & Eggs*, *Cleaning Supplies*, *Personal Care*, *Household Essentials*, *Cat & Pets*, and *Other*.
- **Supermarket Shopping Mode**: High-contrast, tactile checklist interface designed for one-handed mobile use while walking store aisles.
- **Convert to Expense**: Convert any purchased supply item directly into a shared household expense with one tap, prefilling details and category.
- **Status & Search Filters**: Filter by category, toggle between pending and purchased items, and search supplies in real time.

---

## 5. Household Administration & Access Control

- **Role-Based Permissions**: Admin and Member roles with administrative control over settings and grocery purchases.
- **Secure Household Invites**: Cryptographic SHA-256 invite codes with automatic expiration dates to safely onboard roommates.
- **Timezone & Currency Settings**: Configurable per household (e.g., `Asia/Kolkata`, `INR`).
- **Profile & UPI Management**: Edit display name, avatar, and saved UPI ID.
- **Session Security**: Server-side cookie sessions powered by `@supabase/ssr` with Row-Level Security (RLS) guaranteeing strict household data isolation.

---

## 6. Mobile Experience & Real-Time Sync

- **Installable PWA**: Installable directly from Safari (iOS Add to Home Screen) and Chrome/Brave (Android) as a standalone full-screen app.
- **Real-Time Synchronisation**: Feedings, new expenses, and supply updates reflect instantly across all roommates' phones without page refreshes via Supabase Realtime.
- **Offline Indicator**: Visual alert banner warning when offline before attempting financial or feeding writes.
