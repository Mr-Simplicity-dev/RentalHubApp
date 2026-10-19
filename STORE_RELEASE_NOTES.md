# RentalHub Mobile Store Release Notes

## Distribution vs hosting

- The mobile apps are distributed through Google Play Store and Apple App Store.
- Your backend API still needs to be hosted separately on a server with HTTPS.
- Release builds now default to `https://rentalhub.com.ng/api`.
- Local development still defaults to `http://10.0.2.2:5000/api` on Android and `http://localhost:5000/api` on iOS.

## Android release signing

1. Copy `android/key.properties.example` to `android/key.properties`.
2. Replace the placeholder values with your real Play Store upload keystore values.
3. Place the keystore file in the `android/app` folder or update `RELEASE_STORE_FILE` with the correct path.

## iOS build reminder

- `pod install` must be run on macOS.
- Run it from the `ios` folder before building the app in Xcode.

## Remaining store setup

- Configure Apple signing in Xcode with your team and certificates.
- Confirm that `https://rentalhub.com.ng/api` is the live production API endpoint, or replace the default production mobile API URL in `src/services/api.js`.

## Version 1.0.1

- Replaced placeholder Android launcher artwork with the Amana RentalHub NG brand icon.
- Added the complete opaque iOS App Icon asset catalog, including the App Store marketing icon.
- Synchronized Android and iOS release versions and corrected duplicate Android app-link declarations.

## Version 1.0.34 (build 45 / iOS 13)

- Payment History receipt now uses the shared platform receipt (ARH receipt number, document
  type, humanized status and payment method, Africa/Lagos date, itemised totals).
- Rent payments show the full rent detail block (property, tenant, landlord, rental period and
  the landlord-side platform fee note).
- Added the computer-generated receipt notice.
- Accepts the new `ARH_LOC_` location-access and `ARH_TRANSPORT_` reference formats while keeping
  the legacy `LOC_` and `TRANSPORT_` formats working.

