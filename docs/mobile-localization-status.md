# Mobile localization verification

## Current status — 28 October 2026 (supersedes historical notes below)

Full-app Hausa, Yoruba and Igbo translation is **not complete**. Translations are bundled in the app; no translation account or runtime translation service is required. Missing text retains the existing English fallback.

The expanded inventory covers 181 reachable source files and 2,289 static phrases across public, tenant, landlord, agent, lawyer and marketing-agent navigation. Hausa has 1,120 translated phrases and 1,169 missing; Yoruba and Igbo each have 1,106 translated and 1,183 missing. See `mobile-nigerian-language-gaps.json`. These counts describe static coverage, not linguistic review or arbitrary user/server-provided content.

Direct translation batches cover additional property discovery, payments, registration, verification, appeals, refunds, rent assistance, disputes and help messages. Equivalent-phrase reuse is restricted to customer keys so it cannot restore admin-only translations. Placeholder integrity is validated before saving.

Admin and Super Admin interfaces now use English. `LanguageContext` forces English for admin accounts and disables their language selector, while retaining the saved customer preference. Admin translation wrappers and admin tour translations were removed. Shared customer translations remain available.

The registration action no longer silently depends on the optional location-pricing completeness flag. Accepting terms enables the action after settings load. Clicking still validates required fields, password, identity details, location restrictions and the security challenge before opening payment selection. Server pricing and payment requirements are unchanged.

Current passing checks: registration regression; language round trips and English-only admins; Arabic/Hausa/Yoruba/Igbo Login; tours (87 steps, 21 admin roles, 32 navigation roles); typography (204 files, Android/iOS/web). The strict full-customer localization check still fails on missing translations and has not been bypassed.

Fresh Android/iOS export passed: 1,424 modules and an 8.2 MB Hermes bundle per platform, output `.codex-tmp/customer-language-verification`. The first restricted attempt failed to write a temporary bytecode file; the permitted retry succeeded. Metro retained its existing WebRTC `event-target-shim` file-resolution warning. `git diff --check` also passed. No signed APK/IPA or deployment has been produced by this work. Physical-device and fluent-speaker checks remain outstanding. No complete web translation claim is made.

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
