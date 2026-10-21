# OurHome — Mobile Architecture & Migration Guide

This document explains the mobile architecture, shared code modules, environment setup, and release procedures for the native Android and iOS applications of **OurHome (Expense Manager)**.

---

## 1. Original vs. New Architecture

### Original Architecture (Web-Only)
- **Framework**: Next.js 15 App Router, React 19, Vanilla Tailwind CSS 4.
- **Session Layer**: `@supabase/ssr` server-side HTTP cookies.
- **Mobile Container**: PWA Service Worker shell with web push.
- **Limitations**: Dependent on browser context; no native UPI app deep-linking on iOS/Android; no hardware haptics; push delivery dependent on Safari Home Screen install.

### New Mobile Architecture (Universal Ecosystem)
```
ourhome/
├── src/                        # Existing Next.js Web Application (Preserved for Vercel)
│   ├── app/                    # Next.js routes, server components, and API handlers
│   └── lib/                    # Re-exports from @ourhome/core (Zero logic duplication)
├── packages/core/              # Platform-Agnostic Core Business Engine (Pure TypeScript)
│   ├── src/money.ts            # Integer paise math, splits, and debt simplification
│   ├── src/schemas.ts          # Zod validation schemas
│   ├── src/categories.ts       # Heuristic item categorization and quantity parsing
│   ├── src/dates.ts            # Timezone-aware date calculations
│   └── src/database.types.ts   # Canonical Supabase schema definitions
├── mobile/                     # Native Android & iOS Application (Expo SDK 52)
│   ├── app.json                # Expo config (icons, splash, permissions, bundle IDs)
│   ├── eas.json                # EAS Build and Submit profiles
│   ├── src/api/                # Native Supabase services (SecureStore auth, RPCs, Storage)
│   ├── src/context/            # AuthProvider with session restoration
│   ├── src/components/         # Reusable tactile native UI (FeedButton, Cards, Badges)
│   ├── src/hooks/              # TanStack Query & Supabase Realtime synchronization
│   └── src/app/                # Expo Router 4 file-based native navigation
│       ├── (auth)/             # Login, signup, password reset
│       ├── (onboarding)/       # Create or join household
│       ├── (tabs)/             # Bottom bar: Home, Expenses, Settle, Supplies, Pets
│       └── modal/              # Modals: New Expense, Settle, Shopping Mode, Add Pet
└── supabase/migrations/        # Reversible PostgreSQL migrations and atomic RPCs
```

---

## 2. Key Migration Highlights & Shared Modules

1. **Shared `@ourhome/core` Package**:
   - Extracted all financial calculations, Zod validation schemas, supply heuristics, timezone date helpers, and database types into `packages/core`.
   - The web app re-exports from `packages/core`, ensuring **zero logic duplication** and preserving 100% of the existing Next.js web build and test suite.
2. **Native Authentication with Secure Storage**:
   - Replaced browser cookie sessions with native JWT storage using `expo-secure-store` and `@supabase/supabase-js`.
   - Automatic token refresh and secure restoration on app launch.
3. **Paise-Safe Financial Calculations**:
   - Preserves integer arithmetic (₹1 = 100 paise) across all splits and debt simplification.
4. **Native UPI Deep Linking**:
   - Resolves member VPAs and launches installed payment applications (`upi://pay?pa=...&pn=...&am=...&cu=INR`).
   - Does not assume returning from UPI implies successful payment; prompts for manual confirmation.
5. **Database-Enforced Concurrency**:
   - Retains the PostgreSQL constraint `cat_feedings_scheduled_unique` and returns friendly `CAT_ALREADY_FED` (409) warnings showing who fed the pet and when.
6. **Supermarket Shopping Mode**:
   - Built as a full-screen, high-contrast, one-handed checklist with instant purchase toggles and 1-tap conversion to shared expenses.

---

## 3. Environment Variables

Create `.env` or `.env.local` inside the `mobile/` directory:

```env
# Supabase Configuration (Matches your web backend)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional Web Push / EAS Project
EXPO_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

*(Note: Never place service role keys or `SUPABASE_SECRET_KEY` in the mobile project).*

---

## 4. Development & Build Commands

### Web Application (Root)
```sh
# Start web dev server
npm run dev

# Run web typecheck & tests
npm run typecheck
npm run test
```

### Mobile Application
```sh
# Start Expo development server (from root)
npm run mobile

# Or directly from mobile folder:
cd mobile
npm run start

# Launch on Android emulator or connected device
npm run android

# Launch on iOS simulator (macOS required)
npm run ios

# Run TypeScript check across all mobile files
npm run typecheck
```

---

## 5. EAS Build & App Store Release Commands

The repository is configured with `mobile/eas.json` for Expo Application Services (EAS):

### Prerequisites
```sh
npm install -g eas-cli
eas login
```

### Android Builds (Google Play)
```sh
cd mobile

# 1. Build an APK for internal team testing:
eas build --platform android --profile preview

# 2. Build a production Android App Bundle (AAB):
eas build --platform android --profile production

# 3. Submit directly to Google Play Internal Testing:
eas submit --platform android
```

### iOS Builds (Apple App Store / TestFlight)
```sh
cd mobile

# 1. Build an iOS Simulator build for testing:
eas build --platform ios --profile development

# 2. Build for Apple TestFlight:
eas build --platform ios --profile production

# 3. Submit directly to TestFlight / App Store Connect:
eas submit --platform ios
```

---

## 6. Features Verification Summary

### Verified Functionality
- [x] TypeScript strict compilation on both Web and Mobile (`tsc --noEmit` exits with code 0).
- [x] All 26 unit tests in Vitest test suite pass cleanly.
- [x] Paise-safe calculations, equal/exact/percentage splits, remainder distribution.
- [x] Debt simplification graph algorithm (`simplifySettlements`).
- [x] Natural language quantity parser (`parseSupplyInput`).
- [x] 8-category heuristic auto-categorizer (`autoCategorizeSupplyItem`).
- [x] Supabase client initialization with SecureStore storage adapter.
- [x] Tab navigation and stack modal routing configured with Expo Router.
- [x] Database RLS and stored procedures preserved (`create_expense_with_shares`, `mark_cat_fed`, `record_payment`).

### Features Pending Real-Device Verification
- [ ] Real-device push notification delivery with APNs (iOS) and FCM (Android).
- [ ] Direct invocation of bank-specific UPI intent handlers on physical Indian Android/iOS handsets (GPay, PhonePe, Paytm).
- [ ] Camera hardware capture for receipt photography on physical phones.
