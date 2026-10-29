# Mobile localization verification

## Current status — 29 October 2026 (supersedes historical notes below)

Android release 1.0.49 (versionCode 60) is built, signed and live at `/api/downloads/app`. It includes the customer localization fixes and the shared admin notification bell. Artifact SHA-256: `36c19999735871464e2901ba53c54602157b0dc321124817bdb58379da44130c`. iOS remains 1.0.3 build 13. Physical-device visual checks remain pending. Release provenance is recorded in `../../docs/assisted-registration-deployment.md`.

Hausa, Yoruba and Igbo catalogue completion now passes for the non-admin mobile interface. Translations are bundled in the app; no translation account or runtime translation service is required. English remains the safe fallback for future unknown text.

The expanded inventory covers 182 reachable source files and 2,447 static phrases across public, tenant, landlord, agent, lawyer and marketing-agent navigation. All 2,447 have Hausa, Yoruba and Igbo entries, with zero missing in each language. See `mobile-nigerian-language-gaps.json`. The strict checker verifies 3,547 literal UI calls representing 2,433 distinct phrases plus the additional identifier/error messages, including all eight supported locales and interpolation integrity. Another 330 checks cover the separate customer, Careers, cases and consent catalogues.

Direct and machine-assisted translation batches cover property discovery, payments, registration, verification, appeals, refunds, rent assistance, disputes, help, policies and professional-account screens. Banking consent and retained English service/property labels received direct corrections. Equivalent-phrase reuse is restricted to customer keys. Another 170 conditional/fallback labels across 47 customer files were connected to the translation runtime; a new regression checks these expressions. The expanded static screen audit reports zero remaining strings in its defined scope.

Admin and Super Admin interfaces now use English. `LanguageContext` forces English for admin accounts and disables their language selector, while retaining the saved customer preference. Admin translation wrappers and admin tour translations were removed. Shared customer translations remain available.

The registration action no longer silently depends on the optional location-pricing completeness flag. Accepting terms enables the action after settings load. Clicking still validates required fields, password, identity details, location restrictions and the security challenge before opening payment selection. Server pricing and payment requirements are unchanged.

Current passing checks: strict customer localization; registration regression; language round trips and English-only admins; Arabic/Hausa/Yoruba/Igbo Login; tours (87 steps, 21 admin roles, 32 navigation roles); typography (204 files, Android/iOS/web); support centre; public cases; notification badges; account assistant. `git diff --check` passes. No coverage assertion has been bypassed.

Final Android/iOS export passed into `.codex-tmp/customer-localization-complete`: 1,425 modules and an 8.5 MB Hermes bundle per platform. Metro reported the existing WebRTC `event-target-shim` export warning and successfully used file-based resolution. No signed APK/IPA or deployment has been produced by this work. Static coverage is not a fluent-speaker review or a visual inspection of every screen. Physical-device checks and fluent-speaker review remain recommended. Names, entered details, user-written messages and arbitrary server content are deliberately not automatically translated. No complete web translation claim is made.

## Historical results

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

## Follow-up on 27 October 2026

Added 303 direct translations across 101 authentication and registration phrases in Hausa, Yoruba and Igbo. The Login regression now exercises those three languages as well as Arabic, checking visible copy, validation and preserved email/password entries. Login and notification checks pass. The latest explicit-call inventory contains 3,650 phrases: each Nigerian language has 617 translated and 3,033 missing. See `mobile-nigerian-language-gaps.json` for the exact outstanding keys. This inventory excludes unwrapped literals and does not prove whole-app coverage.

The original translation endpoint returned HTTP 429 on retry; the alternative Microsoft public translator request returned HTTP 401. No rate limit or access control was bypassed. Bulk completion remains blocked on translation availability, and the strict all-language test is intentionally still failing.

Also resolved 19 reviewed merge-conflict sections in the Super Admin screen by retaining their localized equivalents, preserving surrounding dashboard changes; removed the duplicate dashboard-banner bell and a duplicate default export in `translations.js`. The top-right notification bell regression passes.

The separate web Careers change centers the portal and form headings, opens the form only after Apply, and retains Back, entered details and the opportunity dropdown. All 120 web tests and the Vite production build pass. No live deployment was performed.

Many new translations were machine-assisted and should receive fluent-speaker review before release. Customer names, passwords, user-written messages, documents and arbitrary server-provided content are not automatically translated. The security provider supports Arabic but does not support every language offered by the app.

No server deployment or installed APK update was performed. A new native release must be built and installed; JavaScript bundle compilation alone does not produce a signed APK or IPA. Physical-device visual verification is still needed.
