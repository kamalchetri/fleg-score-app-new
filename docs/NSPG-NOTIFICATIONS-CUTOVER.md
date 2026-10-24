# NSPG notifications cutover contract

The mobile app now has an opt-in device permission flow. It configures the Android notification channel and obtains an Expo push token in memory, but it does **not** write that token to Supabase. This keeps the current production project unchanged while the association notification policy is reviewed.

## Backend work still required

Create a dedicated `public.push_devices` table and an authenticated RPC or Edge Function for registration. The minimum fields are:

- `id`, `user_id`, `device_id`, `push_token`, `platform`, `enabled`, `last_seen_at`, `created_at`, `updated_at`
- a unique key for `(user_id, device_id)`
- no token reads for anonymous users
- RLS enabled, with a user-only insert/update/delete policy; service-role delivery remains server-side

The mobile app must call a narrow `register_push_device` RPC after the user opts in and a matching `disable_push_device` action when they opt out. Tokens must never be sent to the client from another user, logged in analytics, or embedded in a notification payload.

## NSPG notification categories

The future sender can publish schedule changes, match-start reminders, live-result updates, medal/qualification announcements, venue notices, and targeted kiosk or accreditation alerts. Delivery must be scoped by the user's preferences and role; volunteers should not receive athlete-private information.

## Safety and store readiness

- Permission is requested only after an explicit tap in Profile; there is no startup prompt.
- A signed-in session is required before a token is registered.
- FCM/APNs credentials and service-role keys stay in EAS/server secrets, never in the APK.
- Add notification preference controls and a clear opt-out before enabling remote sends.
- Keep a server-side audit trail for announcement authors, recipients, and delivery failures.
- Test Android 13+ notification permission, iOS permission denial, token rotation, logout, account deletion, and deep links before production enablement.

No Supabase migration, RPC, policy, or data write is part of this document.
