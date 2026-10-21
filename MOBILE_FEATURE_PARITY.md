# OurHome Mobile — Feature Parity Matrix

Every feature from the original OurHome Next.js application mapped to its native React Native / Expo implementation, verified against backend contracts and database schemas.

---

## 1. Authentication & Household Access

| Web Feature | Mobile Implementation | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Email/Password Sign In** | [`mobile/src/app/(auth)/login.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(auth)/login.tsx) | Verified | Native Supabase client with SecureStore session persistence |
| **New User Registration** | [`mobile/src/app/(auth)/signup.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(auth)/signup.tsx) | Verified | Sets `display_name` via user metadata; triggers profile creation |
| **Password Recovery** | [`mobile/src/app/(auth)/forgot-password.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(auth)/forgot-password.tsx) | Verified | Sends password reset email with `ourhome://` redirect URL |
| **Session Restoration** | [`mobile/src/context/auth-context.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/context/auth-context.tsx) | Verified | Auto-restores JWT on app boot without browser cookies |
| **Household Creation** | [`mobile/src/app/(onboarding)/index.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(onboarding)/index.tsx) | Verified | Calls `create_household` RPC; creator assigned `admin` role |
| **Join Household with Code**| [`mobile/src/app/(onboarding)/index.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(onboarding)/index.tsx) | Verified | Calls `join_household` RPC with SHA-256 token validation |
| **Invite Roommate Modal** | [`mobile/src/app/modal/invite-member.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/invite-member.tsx) | Verified | Generates cryptographic invite code; native `Share.share` |
| **Leave Household** | [`mobile/src/app/settings.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/settings.tsx) | Verified | Calls `leave_household` RPC and redirects to onboarding |
| **Profile & UPI Management**| [`mobile/src/app/profile.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/profile.tsx) | Verified | Updates display name and calls `set_my_upi_id` RPC |

---

## 2. Shared Expenses & Bill Splitting

| Web Feature | Mobile Implementation | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Paise-Safe Split Engine** | [`packages/core/src/money.ts`](file:///c:/Users/tousi/Downloads/household/packages/core/src/money.ts) | Verified | 100% shared pure TypeScript math engine; 0 rounding drift |
| **Equal Split** | [`mobile/src/app/modal/new-expense.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/new-expense.tsx) | Verified | Deterministic remainder distribution to avoid lost paise |
| **Exact Amount Split** | [`mobile/src/app/modal/new-expense.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/new-expense.tsx) | Verified | Real-time share validation against total expense amount |
| **Percentage Split** | [`mobile/src/app/modal/new-expense.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/new-expense.tsx) | Verified | Validates 100% total; distributes round-off pennies safely |
| **Participant Exclusion** | [`mobile/src/app/modal/new-expense.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/new-expense.tsx) | Verified | Multi-select checkboxes to exclude non-participating members |
| **Admin Grocery Rule** | [`mobile/src/app/modal/new-expense.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/new-expense.tsx) | Verified | Enforced on mobile UI + database RPC `create_expense_with_shares` |
| **Receipt Uploads** | [`mobile/src/api/expenses.ts`](file:///c:/Users/tousi/Downloads/household/mobile/src/api/expenses.ts) | Verified | Native image library & document picker (JPG, PNG, PDF up to 10MB) |
| **Receipt Previews** | [`mobile/src/api/expenses.ts`](file:///c:/Users/tousi/Downloads/household/mobile/src/api/expenses.ts) | Verified | Secure signed URLs generated on-demand (1-hour expiry) |
| **Expense List & Filters** | [`mobile/src/app/(tabs)/expenses.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/expenses.tsx) | Verified | Month navigator, filter by All / Paid by Me |
| **Edit & Delete Expense** | [`mobile/src/app/modal/new-expense.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/new-expense.tsx) | Verified | Calls `update_expense_with_shares` and `delete_expense` RPCs |

---

## 3. Debt Settlement & Instant UPI Payments

| Web Feature | Mobile Implementation | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Net Balance Calculation** | [`mobile/src/api/settlement.ts`](file:///c:/Users/tousi/Downloads/household/mobile/src/api/settlement.ts) | Verified | `(expensesPaid - fairShare) + (paymentsSent - paymentsReceived)` |
| **Debt Simplification** | [`packages/core/src/money.ts`](file:///c:/Users/tousi/Downloads/household/packages/core/src/money.ts) | Verified | Minimizes cyclic multi-party transfers via greedy solver |
| **Native UPI Deep Linking** | [`mobile/src/app/(tabs)/settle.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/settle.tsx) | Verified | Launches `upi://pay?pa=...&pn=...&am=...&cu=INR` into GPay/PhonePe |
| **UPI Fallback Handling** | [`mobile/src/app/(tabs)/settle.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/settle.tsx) | Verified | Alerts with recipient VPA; never marks paid without manual record |
| **Record Settlement Payment**| [`mobile/src/app/modal/record-payment.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/record-payment.tsx) | Verified | Calls `record_payment` RPC (supports UPI, cash, bank transfer) |
| **Payment History Log** | [`mobile/src/app/(tabs)/settle.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/settle.tsx) | Verified | Audit trail of settled transactions with method badges and notes |

---

## 4. Multi-Pet Care & Feeding Coordination

| Web Feature | Mobile Implementation | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Multi-Pet Support** | [`mobile/src/app/(tabs)/pets.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/pets.tsx) | Verified | Horizontal pet switcher tab bar; register new pets via modal |
| **Scheduled Meal Slots** | [`mobile/src/app/(tabs)/pets.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/pets.tsx) | Verified | Morning, Afternoon, Evening slots with reminder times |
| **Double-Feed Protection** | [`mobile/src/components/FeedButton.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/components/FeedButton.tsx) | Verified | Database unique constraint `cat_feedings_scheduled_unique` (HTTP 409) |
| **Extra Treats & Medication**| [`mobile/src/app/modal/extra-feed.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/extra-feed.tsx) | Verified | Calls `record_extra_feeding` RPC with notes |
| **Feeding Calendar** | [`mobile/src/app/(tabs)/pets.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/pets.tsx) | Verified | Day-by-day historic log navigator |

---

## 5. Supplies & Grocery Board

| Web Feature | Mobile Implementation | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Smart Quantity Parser** | [`packages/core/src/categories.ts`](file:///c:/Users/tousi/Downloads/household/packages/core/src/categories.ts) | Verified | Parses `"Milk 2L"`, `"Eggs 12 pcs"`, `"Rice 5kg"` automatically |
| **8 Auto-Categorizations** | [`packages/core/src/categories.ts`](file:///c:/Users/tousi/Downloads/household/packages/core/src/categories.ts) | Verified | Rule-based keyword matching without third-party AI cost |
| **Category Chips Filter** | [`mobile/src/app/(tabs)/supplies.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/supplies.tsx) | Verified | Horizontal scroll of all 8 supply categories |
| **Purchase Toggle** | [`mobile/src/app/(tabs)/supplies.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/supplies.tsx) | Verified | Tactile checkboxes with buyer attribution |
| **Shopping Mode** | [`mobile/src/app/modal/shopping-mode.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/modal/shopping-mode.tsx) | Verified | High-contrast, one-handed checklist for in-store supermarket use |
| **Convert to Expense** | [`mobile/src/app/(tabs)/supplies.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/app/(tabs)/supplies.tsx) | Verified | One-tap prefilling into New Expense modal |

---

## 6. Mobile Experience, Offline & Realtime

| Web Feature | Mobile Implementation | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Realtime Updates** | [`mobile/src/hooks/use-realtime.ts`](file:///c:/Users/tousi/Downloads/household/mobile/src/hooks/use-realtime.ts) | Verified | Supabase postgres_changes channel updates React Query cache |
| **Offline Awareness** | [`mobile/src/components/OfflineBanner.tsx`](file:///c:/Users/tousi/Downloads/household/mobile/src/components/OfflineBanner.tsx) | Verified | Top warning banner preventing unexpected unsaved operations |
| **Push Notifications** | [`mobile/src/api/notifications.ts`](file:///c:/Users/tousi/Downloads/household/mobile/src/api/notifications.ts) | Verified | Native Expo push token registration linked to user profile |
| **Tactile Haptic Feedback** | Expo Haptics (`impactAsync`, `selectionAsync`) | Verified | Integrated on feeding, payments, shopping checks, and button taps |
