# Android incoming calls

The public Firebase Android configuration lives at
`android/app/google-services.json` for `com.rentalhubng`. Android builds use the
Google Services Gradle plugin. `npm run verify:push-config` checks the package,
project and app identifiers and rejects private service-account files; the
Android build scripts run that check before compilation.

Delivery also requires the matching Firebase project's FCM V1 credential in the
existing Expo project (`mdozaa/rentalhubmobile`, project ID
`a7a3b4d3-a3b3-418b-9d5f-c441627b264c`). A credential stored in another Expo
project does not configure this app. Keep private service-account credentials
outside Git. A successfully compiled APK alone does not prove push delivery.
Verify the generated Firebase resources in the signed APK and test delivery on
a real phone before describing the notification release as fully tested.

Android v1.0.73 / build 84 adds native incoming-call alerts. Existing staff
identity management and the shared property-protection workflow are included.

## Ordinary background notifications

The same release registers an `activity-v2` high-importance Android channel for
ordinary updates. Existing low/blocked/muted channel choices are retained.
Messages retain their separate message channel. The backend uses the new channel
only for capable Android registrations, leaving older Android and iOS delivery
compatible. Normal updates use the standard notification sound, not the looping
incoming-call sound.

`config/utils/notificationDelivery.js` is the shared backend delivery helper.
The canonical notification writer, booking/general writer, staff-identity writer
and missed-call writer publish the saved notification, without inserting another
row or marking it read. Direct messages use the same preference-aware push helper.
The existing category preferences and combined unread count remain authoritative.
Duplicate canonical events do not create another row or another push. Provider
rejections are reported as failures, not as successful phone delivery.

Phone registration retries transient failures at bounded intervals, refreshes on
token rotation, and checks again when the app returns to the foreground. It does
not reopen a refused permission prompt on those retries. Session-loading and
logout guards prevent registration under an unknown or signed-out account.
Push delivery remains subject to network, provider and OS permissions. This does
not enable Phase C spoken notifications or send SMS, WhatsApp or email tests.

## Delivery and actions

- New Android registrations append `:incoming-v1` to the existing device label.
  The backend sends these devices data-only incoming-call messages. Older apps
  and iOS retain their existing alert delivery. Ordinary messages are unchanged.
- `RentalHubMessagingService` extends the existing Expo service, including its
  token handling. Recipient-bound pushes are dropped before display if the
  account has changed or signed out. Other non-call pushes pass to Expo unchanged.
- Incoming calls are bound to the signed-in user and expire with the server
  invitation. Native code checks the authoritative server status before alerting.
- The Android call notification uses immutable private action intents, CallStyle,
  a bounded timeout and the OS repeating sound flag. It needs neither a permanent
  background microphone nor a continuously running foreground service.
- In another app, Android can show a heads-up call notification. On a locked
  screen, full-screen access depends on Android's permission settings. The app
  supplies a settings shortcut in Call sounds. Silent mode, notification channel
  settings, notification permission and Do Not Disturb remain under user control.
- Answer opens RentalHub, requires device unlock if locked, then rechecks the
  normal authenticated recipient/call status before sending the existing socket
  acceptance. No call-notification token can sign a user in or answer a call.
- Decline works without opening the dashboard. Its short-lived capability is
  signed with a key derived separately from the login key and permits only status
  checking and declining that recipient's still-ringing call. The conditional
  database update prevents repeated or late declines from rejecting an accepted
  call. Socket acceptance/rejection also claims the ringing state atomically.
- Accepted/ended/rejected/missed notifications dismiss alerts on the receiver's
  capable Android devices. Short-lived cancellation markers handle messages
  arriving out of order. OS timeouts also stop ringing if cancellation delivery
  fails. Call alerts do not add unread badges or change notification history.

## Limits and testing

Internet and permission to receive notifications are needed. Android force-stop,
manufacturer battery limits and push/network outages can prevent delivery. The
app does not change device volume or bypass Do Not Disturb. iOS lock-screen
calling is not supplied by this Android implementation; it requires a separate
CallKit/PushKit and APNs VoIP integration.

Run `node --test scripts/test-incoming-native-calls.cjs` in the mobile project,
and `node --test tests/callNotificationActions.test.js tests/callSoundService.test.js`
in the backend. These tests send no real push, SMS, email or payments. Also run
the full mobile/backend suites and Android release compilation. A real phone
test must cover: foreground, another app, locked screen, cold/background process,
Answer, Decline, timeout, caller cancellation, two receiving devices, logout,
silent/DND and blocked notification/full-screen permissions. Compilation and
mocked tests alone do not certify those physical-device behaviours.

No migration or new environment variable is needed. Deploy the paired backend
changes before releasing the APK. Keep the previous APK and server source for
rollback. Publish Android metadata only after verifying signing, version/build,
public download hash and that build 84 no longer reports itself as outdated.
