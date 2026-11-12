# Expense Manager — User Guide

Expense Manager helps the people you live with keep track of shared money, the shopping list and the cat. This guide covers installing the app on your phone and using every part of it.

> Setting up your own copy of the app (Supabase, environment variables, deployment)? See the [README](README.md).

## Contents

1. [Install the app](#1-install-the-app)
2. [Create your account](#2-create-your-account)
3. [Set up or join a household](#3-set-up-or-join-a-household)
4. [Getting around](#4-getting-around)
5. [Home](#5-home)
6. [Expenses](#6-expenses)
7. [Settle up](#7-settle-up)
8. [Cat care](#8-cat-care)
9. [Supplies](#9-supplies)
10. [Notifications and activity](#10-notifications-and-activity)
11. [Profile and household settings](#11-profile-and-household-settings)
12. [Good to know](#12-good-to-know)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Install the app

Expense Manager is a web app. You can use it in any browser, but installing it puts an icon on your home screen, opens it full screen, and is required for notifications on iPhone. There's nothing to download from an app store.

Ask whoever set up your household for the app's web address.

### iPhone or iPad

1. Open the app's address in **Safari** (other browsers on iPhone can't install it).
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Open **Expense Manager** from your home screen. Use this icon from now on — notifications only work in the installed app.

### Android

1. Open the app's address in **Chrome**.
2. Tap **Install** on the banner that appears ("Install Expense Manager"), or tap the **⋮** menu → **Install app** (or **Add to Home screen**).
3. Open **Expense Manager** from your home screen or app drawer.

### Computer

In Chrome or Edge, click the install icon at the right end of the address bar. The app then opens in its own window.

You can find these steps inside the app too: **Profile → Install Expense Manager**.

---

## 2. Create your account

1. Open the app and tap **Create your home** (or **Create an account** on the sign-in page).
2. Enter **Your name**, **Email** and a **Password** of at least 8 characters.
3. Tap **Create account**. You're signed in straight away — there's no confirmation email.

Choose your name carefully: it's what housemates see on expenses and feedings, and it **can't be changed later** in the app.

**Signing in later:** enter your email and password and tap **Sign in**.

**Forgot your password?** On the sign-in page tap **Forgot your password?**, enter your email and tap **Send reset link**. Open the link in the email, enter a **New password** (8+ characters) and tap **Update password**.

---

## 3. Set up or join a household

After signing up you'll be asked to set up your household. Everything in the app — expenses, the cat, supplies — belongs to a household, and you can be in one household at a time.

### If you're the first one

1. Under **Create your household**, enter a **Household name** (e.g. "Our Apartment").
2. Tap **Create household**.

You become the household's **admin**. Three meal times — Morning, Afternoon and Evening — are created for cat care automatically. The household uses Indian rupees (₹) and India time.

### If a housemate already set it up

1. Ask the household admin for an **invite code** (see [Inviting housemates](#inviting-housemates)).
2. Under **Have an invite code?**, enter the code and tap **Join household**.

Each code works **once** and **expires after 7 days**. If you see "Invite code is invalid or expired", ask the admin for a fresh one. People who join are **members**.

### Admins and members

| | Admin | Member |
|---|---|---|
| Add expenses, feed the cat, use supplies, record payments | ✓ | ✓ |
| Add **Groceries** expenses | ✓ | — |
| Edit or delete any expense | ✓ | Only ones you added (not Groceries) |
| Rename the household, create invite codes, add meal times | ✓ | — |

---

## 4. Getting around

The main sections are **Home**, **Expenses**, **Cat**, **Settle**, **Supplies** and **Profile**. On a phone they're in the bar at the bottom of the screen; on a computer they're down the left side (with an extra **Add expense** link).

At the top you'll find the **bell** (household activity) and your **profile**. On a computer there's also a **sign-out** button.

Changes your housemates make appear on your screen automatically — no need to refresh.

If you lose your connection, a banner says "You're offline. Reconnect before saving household changes." You can still look around, but nothing can be saved until you're back online.

---

## 5. Home

Your daily summary:

- **This month** — **Shared at home** is everything the household spent this month. **Your share** is the total of your portions of those expenses, and **Your position** compares what you paid with your share ("to receive" or "you owe").
- **Cat, today** — each meal time and whether it's done (**FED** / **PENDING**). With several cats you'll see e.g. **1/2 FED**.
- **Recent expenses** — the latest four. Tap one to see its details.
- **A quick hand** — shortcuts to add an expense, check on the cat or settle up.
- **Under one roof** — who's in the household.

---

## 6. Expenses

### Add an expense

1. Tap **Add expense**.
2. Fill in:
   - **What was it for?** — e.g. "Electricity – October".
   - **Amount** — in rupees, up to two decimal places (e.g. `1450.50`).
   - **Category** — Rent, Groceries, Electricity, Water, Internet, Gas, Maid, Household, Transport, Food, Cat Vet, Cat Medicine or Other. *Groceries is for admins only.*
   - **Paid by** — who actually paid. Defaults to you.
   - **Date** — defaults to today.
3. Under **Split between**, untick anyone who shouldn't share this cost (everyone is ticked to start with).
4. Choose a **Split method**:
   - **Equal** — divided evenly. If it doesn't divide exactly, the extra paisa go to the first people in the list, so shares always add up to the total.
   - **Exact** — type each person's amount in rupees. They must add up to the total.
   - **Percent** — type each person's percentage. They must add up to 100%.

   A preview shows what each person will pay. **Save expense** stays greyed out until the split adds up.
5. Optionally attach a **Receipt** (a photo or PDF — JPG, PNG, WEBP or PDF, up to 10 MB; on a phone this can open the camera) and a **Note**.
6. Tap **Save expense**. Your housemates get a notification.

> You can only attach a receipt when you first add the expense, not afterwards.

### Browse expenses

The **Expenses** page lists the latest 100 expenses, newest first. Each row shows who paid, the category, the date, the amount and **Your share**.

To see one day only, use **Filter by date** and pick a date; tap **Clear** to go back to everything.

Tap an expense to see the full details: who paid, everyone's share, the note, who added it and — if there is one — **View uploaded receipt**.

### Edit or delete an expense

On the expense's page tap **Edit**. You'll only see this button on expenses you added, or on any expense if you're an admin. Groceries expenses can only be edited by admins.

You can change the title, amount, date, who it's split between, the split method and the note. The category, who paid and the receipt can't be changed — delete the expense and add it again if those are wrong.

- Tap **Save changes** to save.
- Tap **Delete** and confirm to remove the expense completely.

---

## 7. Settle up

The **Settle** page shows who owes whom and helps you pay each other back. Use the tabs at the top to look at **this month** or **All Time**.

> **How balances are worked out:** Settle adds up everything spent in the period and divides it **equally among all current household members**, then compares that with what each person paid (and any payments already recorded). It does **not** use the Exact or Percent splits of individual expenses — those only affect the "Your share" figures on Home and Expenses.

### Read your position

- **Your current position** — "You get back ₹…", "You owe ₹…" or "You are completely settled up! 🎉", with what you paid and your fair share.
- **Category split breakdown** — the same picture per category.
- **Housemate split breakdown** — every member's amount paid, equal share and balance ("Gets back", "Owes" or "Settled").

### Add your UPI ID

So housemates can pay you easily, add your UPI ID in the **Household UPI Directory**:

1. Tap **Add your UPI** (or **Edit UPI**).
2. Enter it, e.g. `yourname@oksbi` or `9876543210@paytm`.
3. Tap **Save UPI**. Use **Clear** to remove it.

Every member's card has **Copy UPI** and **Pay in App**, which opens your UPI app (Google Pay, PhonePe, Paytm…) with that person filled in.

### Pay someone back

**Who pays whom** lists the fewest transfers needed to even everything out. For a transfer where **you** are paying and the other person has a UPI ID:

1. Tap **Pay via UPI App** — your UPI app opens with the person, the amount and the note "Household settlement" filled in.
2. Complete the payment there.
3. Come back and record it (below).

When everything is even you'll see "Everyone is square!"

### Record a payment

Recording a payment updates everyone's balances. **The person who paid should record it, from their own account** — the app always saves the payment as coming from whoever is signed in.

1. Tap **Record as paid** on a transfer to fill in the form automatically, or fill in **Record a payment** yourself.
2. Check the **Recipient**, **Amount**, **Payment Method** (UPI, Cash, Bank transfer or Other) and **Date**. Add a **Note** if you like.
3. Tap **Record payment**. The recipient gets a notification.

Recorded payments can't be edited or deleted, so double-check the amount. Past payments are listed under **Recorded settlements in this period**.

---

## 8. Cat care

The **Cat** page shows today's meals and who fed the cat.

### Add your cats

In **Household Cats**, tap **Add a cat**, type the name and tap **Save Cat**. With named cats, each meal is tracked per cat. Remove a cat with the bin icon. Without any named cats, each meal is simply tracked once.

### Record a meal

1. Find the meal time (e.g. Morning) and tap **Mark as Fed** — or **Feed {name}** if you've added cats.
2. Confirm with **Yes, {name} is Fed**.

Your housemates get a notification, and the meal shows who fed the cat and when.

**No double feeding:** if someone else already recorded that meal, you'll see e.g. "Milo's Morning meal was already recorded by Priya at 8:15 AM." Only the first person's record counts.

Recorded meals can't be undone in the app.

### Extra food and treats

Under **Extra bites happen.**, tap **Record extra feeding** and confirm. Extra feedings are recorded for today and don't change the regular meals.

### Other days and history

- Use **Previous**, **Next**, **Today** or **Choose date** at the top to see (or fill in) another day. You can't go into the future.
- **Recent feedings** shows the last 10; tap **Full history →** for the last 30 days, grouped by date.

Admins can add more meal times in **Household settings** (see [Meal times](#meal-times)).

---

## 9. Supplies

**Supplies** is the household's shared shopping list. Anyone in the household can add, edit, tick off or remove items.

### Add an item

Type the item in the quick-add bar and tap **Add**:

- Put the quantity in the **Qty** box (e.g. `2L`, `1 kg`, `3 packs`), **or** type it after the name — `Milk 2L`, `Onions - 1kg` and `Rice (5 kg)` all work. A number needs a unit (kg, g, L, ml, pack, bottle, box, can, pcs, dozen…) to be recognised.
- The app sorts each item into a category automatically: **Groceries, Vegetables & Fruits, Dairy & Eggs, Cleaning Supplies, Personal Care, Household Essentials, Cat & Pets** or **Other**. You'll see a preview before adding. Items it doesn't recognise go into Groceries. The category can't be picked by hand.

For notes or a preferred brand, tap **Add Supply** to open the full form.

### Find items

- Tap **To Buy** or **Purchased** to filter, and the category pills to show one category.
- Use **Search supplies or notes...** to search.
- **Shopping Mode** gives the list a focused look while you're in the shop.

### While shopping

- Tap the circle on an item to mark it **purchased** — it shows "Bought by" you. Tap again to undo.
- **Convert to Expense** opens a new expense already filled in with the item. (The item stays on the board — tidy it up afterwards.)
- **Clear all purchased** removes everything that's been bought.
- Use the pencil to edit an item and the bin to remove it.

---

## 10. Notifications and activity

### Turn on notifications

On iPhone, first [install the app](#iphone-or-ipad) and open it from your home screen.

1. Go to **Profile → Notifications**.
2. Tap **Enable notifications** and allow notifications when your phone or browser asks.
3. Tap **Send test notification** to check it works.

Do this on each device you want notifications on. Tap **Disable notifications** to stop them on that device.

### Choose what you hear about

| Switch | You're notified when… |
|---|---|
| **Shared expenses** | a housemate adds an expense |
| **Cat care** | a housemate records a meal or an extra feeding |
| **Payments** | someone records a payment to you |
| **Meal reminders** | *not active yet — this switch currently does nothing* |

You're never notified about your own actions.

### Activity

The **bell** at the top opens **Activity**: the household's last 60 events — expenses added, changed or removed, feedings and payments.

---

## 11. Profile and household settings

### Profile

Shows your name, email and role (**ADMIN** or **MEMBER**), with links to **Notifications**, **Install Expense Manager** and **Household settings**, and the **Sign out** button.

### Household settings

Open **Profile → Household settings**.

- **Household name** — admins can change it and tap **Save changes**.
- **Your household members** — everyone in the household and their role.

#### Inviting housemates

*(Admins only)*

1. Tap **Create invite code**.
2. Tap the copy icon and send the code to your housemate (WhatsApp, SMS…).

The code works once and expires in 7 days. It's only shown once — if you lose it, create a new one. Make a separate code for each person.

#### Meal times

*(Admins only)* Tap **Add meal slot** and type a name (e.g. "Medicine"). Meal times can't be renamed or removed in the app.

#### Leaving a household

Tap **Leave household** and confirm. You'll need a new invite code to come back. Settle up first — and if you're the only admin, make sure someone else can still manage the household.

---

## 12. Good to know

- **Balances on Settle split everything equally** among all current members, even if an expense used Exact or Percent splits (see [Settle up](#7-settle-up)).
- **Record payments from the payer's account.** A payment is always saved as coming from the person signed in.
- **Your name can't be changed** after sign-up.
- **Receipts can only be added** when the expense is first created.
- **Groceries is admin-only.** If you're a member and bought groceries, put the items on the Supplies board or ask an admin to add the expense.
- **The "You paid" figure on Expenses** covers all the expenses listed (the latest 100), not only this month.
- **Members can't be removed** and roles can't be changed in the app.
- **Meal reminders** aren't sent yet, even when the switch is on.

---

## 13. Troubleshooting

**I'm not getting notifications on my iPhone.**
Notifications only work in the installed app. Install it from Safari (Share → Add to Home Screen), open it from the home screen icon, then enable notifications in Profile → Notifications. If it says "Permission Blocked", allow notifications for Expense Manager in your iPhone's Settings → Notifications.

**"Send test notification" says no devices were found.**
Tap **Enable notifications** on this device first.

**"Invite code is invalid or expired."**
Codes work once and last 7 days. Ask an admin for a new one, and check you typed it exactly.

**I can't pick the Groceries category.**
Only household admins can add Groceries expenses.

**There's no Edit button on an expense.**
You can only edit expenses you added (admins can edit any). Groceries expenses can only be edited by admins.

**"Exact shares must add up to the expense amount" / "Percentages must add up to 100%."**
Adjust the amounts so they match the total exactly — the preview shows the current sum.

**Recording a payment fails with "Cannot pay yourself".**
The payment is saved as coming from you, so if *you're* the one receiving the money, ask the person who paid to record it from their account.

**"Meal was already recorded by …"**
Someone else fed the cat for that meal first. Nothing else to do.

**Nothing saves and there's a yellow banner.**
You're offline. Reconnect and try again.

**I forgot my password.**
Use **Forgot your password?** on the sign-in page.
