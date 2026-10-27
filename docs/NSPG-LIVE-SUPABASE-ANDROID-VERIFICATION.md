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

## Android workflow without OTA (27 October 2026)

OTA is intentionally **disabled** for the FLEG app now. The app bundles its
JavaScript and assets at APK build time and never checks EAS Update for new code.
The `AutoUpdatePrompt` is no longer mounted. The `expo-updates` dependency remains
in the lockfile for now but is disabled in app configuration; keeping the lockfile
stable avoids unrelated dependency changes. The original production package and
all Supabase data are unchanged.

### Continuous validation

Every push to `main` runs `.github/workflows/nspg-preview-ota.yml` (now named
"FLEG NSPG Android verification (no OTA)") to check `npm ci`, TypeScript,
tests, Expo Doctor, and the live read-only Supabase public programme RPC.
The automatic EAS Update publishing job has been removed.

### Make an APK without Expo cloud build quota

From GitHub Actions, manually run "FLEG standalone Android preview APK (no OTA)"
on `main` (`.github/workflows/ota-bootstrap-once.yml`). It runs the same
verification, generates `android/` using Expo prebuild, then attempts Gradle
`:app:assembleRelease` on a GitHub-hosted Android runner. On success, download the
`fleg-score-preview-no-ota-apk` artifact from that workflow run.

This is a **test APK**, signed with the default Android debug credentials unless
the native template/runner is separately configured with release signing. The
standalone preview uses its own Android package `in.fleg.score.preview`, so it
can be installed beside `in.fleg.score` without uninstalling or overwriting
the original app. Authentication callbacks/deep links need separate acceptance
testing in the preview package; do not treat this APK as a production Play Store
release. This build uses the committed public Supabase anon configuration, not
private credentials, and never sets `EXPO_PUBLIC_REVIEW_BUILD=1`.

**Important:** This bypasses the *EAS cloud build quota*, not Android build
requirements or GitHub Actions runner limits. No claim of a successful APK,
device test, or actual GitHub artifact is made until the workflow finishes.
GitHub commit pushes will not automatically update already-installed Android
code. A rebuilt/reinstalled APK is required for app code and native changes.
Supabase programme metadata continues to load live on screen load or refresh,
and does not require rebuilding an APK.

GitHub Actions: https://github.com/kamalchetri/fleg-score-app-new/actions
