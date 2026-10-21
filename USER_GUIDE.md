# OurHome (Expense Manager) — Comprehensive User Guide

Welcome to **OurHome** (Expense Manager), your private, mobile-first household operating system designed for shared apartment living, split expenses, accurate debt settlements, cat-care coordination, and shared groceries/supplies.

This guide walks you through every feature of the application, from initial setup to day-to-day household management.

---

## Table of Contents

1. [Quick Overview & Key Highlights](#1-quick-overview--key-highlights)
2. [Installation & PWA Setup](#2-installation--pwa-setup)
3. [Account & Household Setup](#3-account--household-setup)
   - [Sign Up & Login](#sign-up--login)
   - [Creating a New Household](#creating-a-new-household)
   - [Joining with an Invite Code](#joining-with-an-invite-code)
   - [Managing Your Profile & UPI ID](#managing-your-profile--upi-id)
4. [Dashboard (Home)](#4-dashboard-home)
5. [Expense Tracking & Bill Splitting](#5-expense-tracking--bill-splitting)
   - [Adding an Expense](#adding-an-expense)
   - [Admin Grocery Policy](#admin-grocery-policy)
   - [Split Calculation Methods](#split-calculation-methods)
   - [Receipt Uploads & Attachments](#receipt-uploads--attachments)
   - [Filtering, Viewing & Editing Expenses](#filtering-viewing--editing-expenses)
6. [Debt Settlement & UPI Payments](#6-debt-settlement--upi-payments)
   - [Viewing Net Balances](#viewing-net-balances)
   - [Debt Simplification (Fewer Transfers)](#debt-simplification-fewer-transfers)
   - [Paying via UPI (GPay, PhonePe, Paytm)](#paying-via-upi-gpay-phonepe-paytm)
   - [Recording a Settlement Payment](#recording-a-settlement-payment)
   - [Payment History & Time Period Filters](#payment-history--time-period-filters)
7. [Cat Care & Pet Management](#7-cat-care--pet-management)
   - [Scheduled Meal Slots (Morning, Afternoon, Evening)](#scheduled-meal-slots-morning-afternoon-evening)
   - [One-Tap Feeding & Duplicate Prevention](#one-tap-feeding--duplicate-prevention)
   - [Recording Extra Feedings / Treats](#recording-extra-feedings--treats)
   - [Feeding Date Navigator & History](#feeding-date-navigator--history)
   - [Managing Multiple Pets](#managing-multiple-pets)
8. [Supplies & Grocery Board](#8-supplies--grocery-board)
   - [Quick Add & Smart Input Parsing](#quick-add--smart-input-parsing)
   - [Automatic Categorization](#automatic-categorization)
   - [Supermarket Shopping Mode](#supermarket-shopping-mode)
   - [Marking Purchased & Converting to Expense](#marking-purchased--converting-to-expense)
9. [Household Administration & Settings](#9-household-administration--settings)
   - [Inviting New Roommates](#inviting-new-roommates)
   - [Customizing Meal Slots](#customizing-meal-slots)
   - [Push Notifications & Device Management](#push-notifications--device-management)
   - [Leaving a Household](#leaving-a-household)
10. [Troubleshooting & FAQs](#10-troubleshooting--faqs)

---

## 1. Quick Overview & Key Highlights

- **Mobile-First & App-Like**: Designed for seamless one-handed mobile use with bottom-bar navigation and fast tactile interactions.
- **Paise-Safe Financial Calculations**: Handles exact split amounts in integer paise (₹0.01) to eliminate rounding loss or phantom cents.
- **Built-In UPI Settlement Flow**: Automatically generates UPI deep links and QR codes directly tied to roommates' VPA IDs (`username@bank`).
- **Real-Time Synchronisation**: Feedings, new expenses, and supply updates reflect instantly across all roommates' devices using Supabase Realtime channels.
- **Race-Condition-Proof Feeding**: Database-level unique constraints ensure a cat is never accidentally fed twice for the same scheduled meal.
- **Admin Grocery Controls**: Keeps household pantry spending structured and prevents duplicate bulk order entries.

---

## 2. Installation & PWA Setup

OurHome is a Progressive Web App (PWA) that installs directly onto your phone without requiring an app store download.

### On iPhone / iPad (iOS Safari)
1. Open Safari and navigate to your OurHome URL.
2. Tap the **Share** button (the square with an arrow pointing upward) in Safari’s navigation bar.
3. Scroll down and select **Add to Home Screen**.
4. Confirm the name and tap **Add**.
5. Launch OurHome from your iPhone Home Screen. *(Note: Running from the Home Screen unlocks full standalone mode and push notification support).*

### On Android (Chrome / Brave / Edge)
1. Open the app URL in Google Chrome.
2. An **Install App** or **Add OurHome to Home screen** banner will appear automatically at the bottom.
3. Tap **Install**, or tap the three-dot menu (**⋮**) in the top right and select **Install app** / **Add to Home screen**.
4. The app icon will now appear on your app launcher.

### On Desktop (Chrome / Edge / Safari)
- Click the **Install OurHome** icon in the browser address bar (top right) to install as a standalone desktop window.

---

## 3. Account & Household Setup

### Sign Up & Login
- Navigate to `/login` or `/signup`.
- Enter your email address and choose a password (minimum 6 characters).
- Enter your display name (e.g., `Alex` or `Sarah`).
- Once authenticated, you will be taken to your dashboard or the onboarding flow if you don't belong to a home yet.

### Creating a New Household
If you are the first roommate setting up the apartment:
1. Tap **Create a new household** on the onboarding page.
2. Enter your household name (e.g., `Apartment 402` or `Greenwood Villa`).
3. Select your local timezone (e.g., `Asia/Kolkata`).
4. Tap **Create Household**.
5. You are assigned the **Admin** role, and the system automatically provisions default meal slots (`Morning`, `Afternoon`, `Evening`) and expense categories.

### Joining with an Invite Code
If a roommate already created the household:
1. Ask your household admin for the **7-Day Invite Code**.
2. Tap **Join with an invite code** on the onboarding screen.
3. Paste or enter the 8-character invite code.
4. Tap **Join Household**. You are instantly connected to your roommates with full access to shared balances, cat care, and supplies.

### Managing Your Profile & UPI ID
1. Tap the **Profile** tab in the bottom bar (or top-right avatar).
2. View your display name, email, and household role.
3. In the **UPI Payment ID** section, tap **Add / Edit UPI ID**.
4. Enter your UPI Virtual Payment Address (VPA) such as `yourname@okhdfcbank`, `9876543210@paytm`, or `name@oksbi`.
5. Tap **Save UPI ID**. Once saved, whenever other roommates owe you money, they can pay you in one click without asking for your QR code or account details.

---

## 4. Dashboard (Home)

The Home tab (`/home`) gives you an instant bird’s-eye summary of household activities:

- **Monthly Spend Metric**: Shows total apartment spending for the current calendar month.
- **Personal Share Breakdown**: Compares your actual share of expenses against the total amount you personally paid out-of-pocket this month.
- **Cat Feeding Widget**: Displays today's meal schedule with a quick status badge (`Done` or `Pending`). You can log a meal with a single tap directly from the dashboard!
- **Quick Action Buttons**:
  - `+ Add Expense` — Instantly record a shared bill or receipt.
  - `🐾 Record Feeding` — Jump to pet care or log an extra treat.
  - `⚖️ Settle Up` — Check who owes whom and clear debts.
- **Recent Activity Feed**: Shows live timestamps for newly recorded expenses, meal logs, and completed settlements.

---

## 5. Expense Tracking & Bill Splitting

### Adding an Expense
1. Tap the **+ Add expense** button in the navigation or on the Expenses page.
2. Fill in the expense details:
   - **Title**: A clear description (e.g., `WiFi Bill - October`, `Supermarket Vegetables`, `Water Tanker`).
   - **Amount**: Enter the amount in Rupees (e.g., `1450.50`).
   - **Category**: Select the relevant category (e.g., *Electricity*, *Rent*, *Maid*, *Food*, *Transport*, *Cat Vet*, etc.).
   - **Paid By**: Choose which roommate paid the bill (defaults to yourself).
   - **Date**: Select the expense date (defaults to today).
   - **Notes**: Optional additional context or breakdown.
   - **Receipt**: Optionally attach a bill image or PDF (see below).
3. Select your desired [Split Calculation Method](#split-calculation-methods).
4. Tap **Save Expense**.

### Admin Grocery Policy
> [!IMPORTANT]
> **Grocery Expense Policy**: To keep apartment grocery purchases coordinated and prevent duplicate entries, only users with the **Household Admin** role can create expenses under the **Groceries** category. If non-admin roommates purchase items, they can mark them on the [Supplies Board](#8-supplies--grocery-board), and the admin can log or confirm the final bill.

### Split Calculation Methods

OurHome supports 3 split methods, with guaranteed mathematical precision down to the paise:

#### 1. Equal Split (Default)
- Splits the total cost equally among all selected roommates.
- If the division has a remainder of paise (e.g., ₹100 split 3 ways is 33.3333...), the algorithm distributes the odd paise fairly so the sum of individual shares exactly matches the total bill.
- You can uncheck any roommate who did not participate (e.g., someone was away traveling).

#### 2. Exact Amounts
- Allows entering custom rupee amounts for each person.
- Great when one roommate ordered an extra dish or purchased personal items on the same bill.
- The interface automatically validates that the sum of individual amounts matches the total expense before allowing submission.

#### 3. Percentage Split
- Allows defining custom percentage shares for each member (e.g., 60% / 40% for uneven bedroom sizes).
- Validates that total percentages equal exactly 100%.

### Receipt Uploads & Attachments
- When adding or editing an expense, tap **Attach Receipt**.
- Supported file types: **JPG, PNG, WebP, and PDF** (up to 10 MB).
- Receipts are stored securely in household-scoped cloud storage.
- When viewing an expense, tap the receipt thumbnail or link to open a private signed viewer URL.

### Filtering, Viewing & Editing Expenses
- **Monthly Navigation**: Use the month arrows in `/expenses` to inspect historical months.
- **Date Range Filters**: Filter by specific dates or timeframes.
- **Expense Details View**: Tap any expense to inspect the full breakdown of who paid, who owes what, and attached receipts.
- **Editing & Deleting**: Tap the edit pencil icon to modify amounts, participants, or split ratios. Admins and expense creators can remove incorrect entries.

---

## 6. Debt Settlement & UPI Payments

OurHome eliminates complex, confusing multi-way debt webs with automated debt simplification.

### Viewing Net Balances
On the **Settle** (`/settlement`) page:
- **Net Balance Cards**: Shows each member's overall standing:
  - 🟢 **Green (Positive)**: The household owes you money.
  - 🔴 **Red (Negative)**: You owe money to the household.
  - ⚪ **Zero**: All squared away!

### Debt Simplification (Fewer Transfers)
Rather than having every roommate pay every other roommate for each individual receipt, OurHome runs a debt-simplification graph algorithm:
- It collapses indirect debts into the minimum number of direct transactions.
- *Example*: If Alice owes Bob ₹500, and Bob owes Charlie ₹500, OurHome simplifies the transfer to **Alice pays Charlie ₹500 directly**.

### Paying via UPI (GPay, PhonePe, Paytm)
1. Navigate to `/settlement`.
2. Under **Suggested Transfers**, locate the payment you need to make.
3. If the recipient has configured their UPI ID, you will see a **Pay via UPI** button and their UPI address:
   - **On Mobile**: Tapping **Pay via UPI** launches your phone's default UPI apps (Google Pay, PhonePe, Paytm, BHIM, CRED) pre-filled with the exact amount and recipient VPA.
   - **On Desktop**: Tap the **Copy UPI ID** icon or scan the generated QR code with your phone's payment app.

### Recording a Settlement Payment
Once money has been transferred:
1. Tap **Record Payment** next to the transfer (or select **Log a Payment**).
2. The form pre-fills the payer, receiver, and exact amount.
3. Choose the payment method (`UPI`, `Cash`, `Bank Transfer`).
4. Tap **Save Payment**.
5. The balances immediately recalculate and update for everyone in real time.

### Payment History & Time Period Filters
- Switch between **Current Month** and **All Time** to view ongoing or historical settlements.
- Expand **Recent Settlement History** to inspect past payment confirmations, timestamps, and notes.

---

## 7. Cat Care & Pet Management

Never wonder *"Did someone already feed the cat?"* again.

### Scheduled Meal Slots
- Households come with standard meal slots: **Morning**, **Afternoon**, and **Evening**.
- Each slot clearly displays:
  - Expected feeding window.
  - Current status: **Pending** (empty bowl) or **Fed** (green checkmark).
  - Who fed the pet and the exact time it was fed (e.g., *Fed by Alex at 8:15 AM*).

### One-Tap Feeding & Duplicate Prevention
- To log a meal, simply tap the **Feed** button on the corresponding slot.
- **Race Condition Guard**: If two roommates tap the button at the exact same moment from different rooms, the database's atomic constraint guarantees that the first tap succeeds and the second tap displays:
  > *"Cat has already been fed for this meal slot!"*
- This prevents double feedings and overfeeding.

### Recording Extra Feedings / Treats
- Tap **+ Record Extra Feeding / Treat**.
- Choose the pet (if multiple), enter optional notes (e.g., *Tuna treat*, *Wet food snack*, *Hairball paste*), and confirm.
- Extra feedings are logged with exact timestamps and appear in the daily log without altering the scheduled meal status.

### Feeding Date Navigator & History
- Use the **Date Navigator** (`< Yesterday | Today | Tomorrow >`) at the top of the Cat page to review feeding logs from previous days.
- View the **Recent Feeding Activity** log showing the last 10 feeding events across all pets.

### Managing Multiple Pets
- Tap **Manage Pets** to view registered household pets.
- Add new pets by providing their name and species.
- When multiple pets are present, meal slots and feeding records are tracked individually per pet.

---

## 8. Supplies & Grocery Board

The **Supplies Board** (`/supplies`) is a shared real-time shopping list and pantry organizer.

### Quick Add & Smart Input Parsing
- Use the **Quick Add** bar at the top of the page.
- Type an item name along with its quantity in plain natural text:
  - Typing `Eggs 1 dozen` automatically separates item: `Eggs` and quantity: `1 dozen`.
  - Typing `Milk 2L` sets item: `Milk` and quantity: `2L`.
  - Typing `Olive oil 500ml` sets item: `Olive oil` and quantity: `500ml`.
- Hit **Enter** or tap **+ Add** to save instantly.

### Automatic Categorization
Items are automatically tagged with an appropriate category and icon:
- 🥛 **Dairy**: Milk, cheese, butter, yogurt, paneer, cream.
- 🍎 **Produce**: Tomatoes, onions, bananas, apples, spinach, potatoes.
- 🌾 **Pantry**: Rice, pasta, flour, oil, salt, spices, oats, bread.
- 🧹 **Cleaning & Household**: Detergent, dish soap, sponges, garbage bags, toilet paper.
- 🧴 **Personal Care**: Shampoo, soap, toothpaste, body wash.
- 🐾 **Pet Supplies**: Cat food, treats, litter box supplies.

*(You can also open the detailed modal to set custom categories or add detailed notes).*

### Supermarket Shopping Mode
- When you arrive at the grocery store, tap the **Shopping Mode** toggle.
- This switches the interface into a distraction-free, large-target checklist layout:
  - Items are grouped clearly by aisle / category.
  - Tapping an item instantly marks it as purchased with tactile visual feedback.
  - Purchased items move down to the completed section so you can focus only on what remains.

### Marking Purchased & Converting to Expense
- Any roommate can check off items as they buy them.
- The item records who bought it and when.
- Once shopping is finished, tap **Convert to Expense** to automatically pre-fill an expense entry with the purchased item details!

---

## 9. Household Administration & Settings

Access settings via **Profile → Household Settings** or directly at `/settings`.

### Inviting New Roommates
1. Go to **Settings**.
2. Tap **Generate Invite Code**.
3. A secure, 8-character cryptographic invite code is generated (valid for 7 days).
4. Tap **Copy Code** or share the invite link directly via WhatsApp, iMessage, or Slack.
5. Once your roommate logs in and enters this code, they are joined immediately.

### Customizing Meal Slots
Household Admins can customize pet schedules:
- Rename existing meal slots.
- Add new slots (e.g., *Late Night Snack*, *Medicine Schedule*).
- Reorder slots or toggle reminder preferences.

### Push Notifications & Device Management
1. Open **Profile → Notifications & Push Devices**.
2. Tap **Enable Push Notifications**.
3. Grant notification permissions when prompted by your browser or operating system.
4. Customize your notification preferences:
   - Alert when a pet is fed.
   - Alert when a new expense is logged.
   - Alert when someone settles a balance.
   - Alert when an urgent supply item is added.

### Leaving a Household
- If you move out, navigate to the bottom of the Settings page and select **Leave Household**.
- *Note: Ensure all your outstanding balances are settled to zero before leaving.*

---

## 10. Troubleshooting & FAQs

### Q: Why do I see "Only household admins can upload grocery expenses"?
**A**: By household design, general grocery receipts must be entered or approved by an Admin to keep shared pantry budgets in sync. If you are not an admin, add the grocery items to the **Supplies Board** (`/supplies`), and have the household admin log the collective bill under expenses.

### Q: What happens if two people tap "Mark Fed" at the same time?
**A**: OurHome uses atomic PostgreSQL database transactions with a unique constraint (`cat_feedings_scheduled_unique`). The first submission will succeed, and the second will immediately display a notification stating that the meal was already recorded, ensuring no duplicate meals occur.

### Q: Why am I not receiving push notifications on my iPhone?
**A**: On iOS, Apple requires PWAs to be added to your Home Screen before Web Push notifications can be activated:
1. Open the app in Safari.
2. Tap **Share → Add to Home Screen**.
3. Open the app **from your Home Screen icon** (not Safari).
4. Go to **Profile → Notifications** and tap **Enable Push Notifications**.

### Q: Can I use the app while offline?
**A**: Yes! The app shell and cached data are available offline via the service worker. If you lose internet connectivity, an amber banner will appear: *"You’re offline. Reconnect before saving household changes."* Once your connection restores, you can save expenses, meal logs, or supply changes.

### Q: How do I change my display name or password?
**A**: 
- To change your password, visit the login page and click **Forgot password?** to receive a secure password reset link.
- To change your display name or UPI ID, visit the **Profile** tab.

---

*Need help or want to request a feature? Reach out to your household admin or open an issue on the project repository.*
