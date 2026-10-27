# Mobile localization verification

The reported language was Arabic. The shared Android/iOS interface now uses a local translation catalogue, with live language subscriptions for screens, navigation labels and reusable controls. Login labels, validation and the security challenge follow the selected language. Switching languages does not remount the form or translate entered email/password values.

The Arabic static-interface audit scanned 273 files and reported zero remaining phrases in its defined scope. The catalogue guard checked 6,112 UI calls representing 3,873 distinct phrases for English/Arabic coverage, interpolation integrity and protection of internal enum values, API paths and navigation routes. This is static coverage, not proof of linguistic quality or a visual inspection of every screen.

Passing checks:
- `node scripts/verify-login-language.cjs`
- `node scripts/verify-interface-localization.cjs --arabic`
- `npm run test:language` (eight language selections, direction round trips, storage failures)
- `npm run test:typography`
- `npm run test:tour` (87 steps, 21 administrative roles, 32 role-navigation checks)
- Notification badges, account assistant, support centre and public case regression scripts.

Android and iOS JavaScript/Hermes export passed: 1,424 modules per platform, approximately 8.4 MB per bundle, output `.codex-tmp/language-verified`. Metro emitted a dependency export warning for `react-native-webrtc/event-target-shim` and successfully used its file-resolution fallback.

The stricter all-language command `npm run test:localization` remains incomplete: it reports missing Hausa catalogue entries (first reported: “Exit impersonation”). Hausa, Yoruba and Igbo catalogue completion was interrupted by the translation provider's rate limit. Existing translations remain available and missing entries use the existing English fallback. Do not describe all eight catalogues as complete.

Many new translations were machine-assisted and should receive fluent-speaker review before release. Customer names, passwords, user-written messages, documents and arbitrary server-provided content are not automatically translated. The security provider supports Arabic but does not support every language offered by the app.

No server deployment or installed APK update was performed. A new native release must be built and installed; JavaScript bundle compilation alone does not produce a signed APK or IPA. Physical-device visual verification is still needed.
