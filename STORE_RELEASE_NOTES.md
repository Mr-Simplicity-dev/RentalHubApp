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

## Remaining store blockers to address

- Add the final iOS App Icon image set files to `ios/RentalHubMobile/Images.xcassets/AppIcon.appiconset`.
- Configure Apple signing in Xcode with your team and certificates.
- Confirm that `https://rentalhub.com.ng/api` is the live production API endpoint, or replace the default production mobile API URL in `src/services/api.js`.
