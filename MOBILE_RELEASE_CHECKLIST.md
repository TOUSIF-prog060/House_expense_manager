# OurHome — Mobile Release Checklist

A comprehensive pre-flight checklist for publishing **OurHome (Expense Manager)** to the **Google Play Store** and **Apple App Store**.

---

## 1. App Identity & Store Metadata

### General Branding
- [x] **App Name**: OurHome
- [x] **Short Description**: Shared household expenses, UPI settlements, and pet care in sync.
- [x] **Primary Category**: Finance
- [x] **Secondary Category**: Lifestyle
- [x] **Default Language**: English (en-US / en-IN)
- [x] **Bundle Identifier (iOS)**: `com.ourhome.household`
- [x] **Package Name (Android)**: `com.ourhome.household`

### Assets & Store Media
- [x] **App Icon**: 1024×1024 PNG (no transparency) in `mobile/assets/icon.png`.
- [x] **Android Adaptive Icon**: Foreground & background layers configured in `mobile/app.json`.
- [x] **Splash Screen**: Configured with `#121316` brand dark background in `mobile/app.json`.
- [ ] **Screenshots (iOS)**:
  - 6.7" Super Retina (iPhone 16 Pro Max / 15 Pro Max): 1290×2796 px (minimum 3 required).
  - 6.5" Retina (iPhone 11 Pro Max / XS Max): 1242×2688 px.
- [ ] **Screenshots (Android)**:
  - Phone screenshots (1080×1920 or 1080×2400): At least 4 screenshots showing Dashboard, Expenses, UPI Settlements, and Shopping Mode.
  - Feature Graphic: 1024×500 px banner.

---

## 2. Google Play Store Pre-Flight (Android)

- [x] **EAS Build Configuration**: Set to produce `.aab` (Android App Bundle) with release profile in `mobile/eas.json`.
- [x] **Android Permissions in `app.json`**:
  - `CAMERA`: Required for taking receipt photos.
  - `READ_EXTERNAL_STORAGE`: Required for choosing receipt PDFs and gallery images.
  - `POST_NOTIFICATIONS`: Android 13+ runtime notification prompt.
- [ ] **Data Safety Form**:
  - Financial info: Yes (Shared expense amounts and UPI VPAs; not credit card or banking credentials).
  - Personal info: Name and email for authentication.
  - Photos/Videos: Yes (User-uploaded receipt images).
  - Data encryption: All network traffic over HTTPS/TLS.
  - Account deletion: Profile includes sign-out; account deletion supported.
- [ ] **Target SDK Level**: Android 14 (API level 34) or higher (handled automatically by Expo SDK 52).
- [ ] **Google Play Console Internal Testing**:
  ```sh
  cd mobile
  eas build --platform android --profile production
  eas submit --platform android
  ```

---

## 3. Apple App Store Pre-Flight (iOS)

- [x] **EAS iOS Production Profile**: Configured for store distribution in `mobile/eas.json`.
- [x] **Privacy Permission Strings (`Info.plist` in `app.json`)**:
  - `NSCameraUsageDescription`: *"OurHome requires camera access to attach receipts to expenses."*
  - `NSPhotoLibraryUsageDescription`: *"OurHome requires photo library access to upload receipt images and documents."*
  - `ITSAppUsesNonExemptEncryption`: Set to `false` (standard HTTPS only).
- [ ] **Apple Developer Account Enrollment**: Active enrollment in Apple Developer Program.
- [ ] **App Store Connect App Creation**:
  - Match bundle ID `com.ourhome.household`.
  - Set SKU (e.g., `OURHOME-APP-001`).
- [ ] **App Privacy Details in App Store Connect**:
  - Data Used to Track You: None.
  - Data Linked to You: Contact Info (Email, Name), Financial Info (Transaction and expense shares), User Content (Receipt images).
- [ ] **Demo Account for App Store Reviewers**:
  - Provide test account credentials in App Review Information:
    - Email: `reviewer@ourhome.example`
    - Password: Provided in review notes
    - Seeded with sample household data (expenses, cat feeding slots, supplies).
- [ ] **Build & Submit to TestFlight**:
  ```sh
  cd mobile
  eas build --platform ios --profile production
  eas submit --platform ios
  ```

---

## 4. Security & Compliance Verification

- [x] **Zero Hardcoded Secrets**: Client uses only public anon keys; `SUPABASE_SECRET_KEY` is excluded from the mobile bundle.
- [x] **Row-Level Security (RLS)**: Enforced on all Supabase tables (`is_household_member` / `is_household_admin`).
- [x] **Receipt Authorization**: Private Supabase bucket with signed URLs expiring in 1 hour.
- [x] **Concurrency Safety**: Database unique constraints prevent double-feeding of household pets.
- [x] **Payment Audit Trail**: No auto-marking of debts as paid without user confirmation.

---

## 5. Post-Submission Monitoring

- [ ] Check TestFlight crash logs and memory telemetry.
- [ ] Verify push notification reception on real APNs and FCM production tokens.
- [ ] Test UPI deep linking behavior across popular apps (GPay, PhonePe, Paytm, CRED).
