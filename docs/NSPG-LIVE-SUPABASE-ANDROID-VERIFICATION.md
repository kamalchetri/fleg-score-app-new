# FLEG NSPG 2026 — live Supabase programme and Android QA

## Live programme (no hardcoded names)

The FLEG Android NSPG home and individual sports pages now read from the
read-only `public.nspg26_public_programme()` Supabase RPC using the application's
**anon** credential. The RPC composes the existing `reg_forms` district options
and `reg_form_categories`, including the separate Para Athletes group.

This programme currently has **17 official districts, 14 standard disciplines,
5 Para Athletes event categories and 179 primary event categories in total**.
The duplicate additional-Niuland Football "Men" registration category is not
a second event category. All values come from Supabase, not app constants.

The registration forms are closed and the 14 NSPG tournament records are private
drafts. The programme RPC exposes only non-personal metadata. Private entrants,
unpublished fixtures, scores, and results are NOT exported by it. The normal
app does not display synthetic match/medal/athlete data; that data is reserved
for builds explicitly created with `EXPO_PUBLIC_REVIEW_BUILD=1`.

## Verify without altering production data

In GitHub Codespaces:

```bash
git checkout main
git pull origin main
npm ci
npm run typecheck
npm test
npx expo-doctor
node scripts/verify-nspg-catalog.mjs
```

The last command calls the **real anonymous Supabase REST RPC** and checks
that all 17 districts, 14 standard sports and at least 179 event categories
are returned, including the Para group. It does not access athlete identities.
UI verification requires a physical Android device or a functioning Android
emulator; CI and unit tests alone are not Android verification.

Manual device acceptance:
1. Open NSPG 2026. Confirm 14 main sport cards and searchable 17-district section.
2. Open each sport card. Confirm all event categories, search and selection.
3. Open Para Athletes separately. Confirm its five event categories.
4. Confirm closed/private draft tournament fixtures are NOT falsely displayed
   as live or official results. Empty states are correct until publication.
5. Test small screens, scrolling, the keyboard, app startup and offline errors.
6. Record screenshots and Android logs for issues before reporting success.

## Automatic Android updates on each commit to main

The FLEG root layout mounts `components/AutoUpdatePrompt.tsx`, which uses
`expo-updates` in a real Android preview/release build. FLEG checks for an
available compatible update on launch and when returning to the foreground.
After it downloads, the app **asks** whether to restart now or later.
It never forces a restart during active match scoring or unsaved forms.

GitHub Actions runs `.github/workflows/nspg-preview-ota.yml` on each push
to `main`: `npm ci`, `npm run typecheck`, `npm test`,
`npx expo-doctor`, and a live Supabase anonymous programme check. If these
pass and the changes are JavaScript/assets-only, the workflow publishes to
EAS Update **preview/Android** only. Native dependency, app.json, eas.json,
or Android/iOS changes are skipped as incompatible with the current APK.

**One-time native setup — already completed in the repository:**

- `expo-updates ~57.0.26` is installed and locked in package-lock.json.
- `app.json` defines EAS Update URL, check-on-load and runtime 0.2.0.
- `eas.json` maps the Android APK preview profile to the preview channel.
- The one-time bootstrap workflow succeeded, including TypeScript,
  all 25 test suites and all 21 Expo Doctor checks, and committed
  dependencies as `ee6898cd67cd96aae0e3298a1017615acaf2145c`.

**Remaining account/device actions required:**

1. From the Expo account authorized for project
   `d047d73e-179b-45c1-a024-844c62d1ae8f`, create an Expo access token
   at https://expo.dev/settings/access-tokens.
2. Add that token to GitHub repository Settings → Secrets and variables →
   Actions → New repository secret named `EXPO_TOKEN`. Do not share it in
   messages or commit it into source control.
3. On GitHub → Actions, manually run
   **One-time FLEG OTA native bootstrap and preview APK** on `main`.
   With EXPO_TOKEN present it invokes:
   `eas build --platform android --profile preview --non-interactive --wait`.
   If build credentials/configuration require first-time account interaction,
   complete those in your authorized Expo account/Codespaces.
4. Install the *new* OTA-enabled APK on Android once. Earlier APKs that do
   not contain expo-updates cannot receive OTA changes.
5. Make a small **JavaScript-only** code change through Copilot,
   commit/push to `main`, and inspect Actions →
   **FLEG NSPG Android checks and preview OTA**. The publish-preview
   job must succeed.
6. Open or foreground the installed preview app while online. Wait for
   **FLEG Score update ready**; tap **Update now**, or **Later** to keep
   the current session and apply the update on a subsequent restart.

When Supabase registration-form programme metadata changes, no OTA update is
needed: the NSPG home and sports pages read it directly from Supabase on
screen load/pull-to-refresh.

**Never report OTA as tested merely because source code is committed.**
Success requires a real preview APK, successful EAS publish, and an
Android-device restart showing the committed change.

GitHub Actions: https://github.com/kamalchetri/fleg-score-app-new/actions
