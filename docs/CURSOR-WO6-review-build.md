# Cursor Work Order — WO-6: Review build (association rules/scoring review APK)

**Repo:** `fleg-score-app`  ·  **Issued by:** Claude  ·  **Date:** 14 Oct 2026
**Goal:** Produce an installable Android APK the NSPG association can use to review **every sport's scoring and rules** and send feedback — with **zero dependency on the production database** and zero risk to live registration. The scoring lab + ranked lab already run all sports on in-memory sample data; this exposes them (and the standard rules presets) in a clearly-marked review build.

## Guardrails
- Production Supabase stays **read-only** for you; no migrations/writes; no service-role key.
- The review surfaces must be **in-memory only** — they must not read or write any live tournament, registration, score, or audit data. No DB calls from the review screens.
- Keep normal app behaviour unchanged when the review flag is off.
- `npx tsc --noEmit` clean, all `tests/` green before reporting.

## Tasks

### 1. Review-build flag
Add `EXPO_PUBLIC_REVIEW_BUILD` (string "true"/"false", default false). A helper `isReviewBuild()` mirroring `isGuardedScoringEnabled()`. Default committed value false; do not set it in `eas.json` production profile (we'll pass it for the review build only).

### 2. Expose the labs in the review build
Today `/scoring-lab` and `/ranked-results-lab` render "Not available" in production. When `isReviewBuild()` is true, make them accessible in the built app (keep them hidden when it's false, exactly as now).
- Add a simple **Review** entry point (a visible menu item or a card on Home/Discover) shown only when `isReviewBuild()`, linking to: Scoring Lab, Ranked Results Lab, and (task 3) the Rules sheet.
- Put a persistent banner on these screens: **"Review build · sample data · not live results."**

### 3. "Rules in review" sheet
A read-only screen listing each sport/category and the **standard rules preset** currently applied (from `lib/sports/rules-presets.ts`), each marked `tcReview: pending`, in plain language (e.g. "Badminton — best of 3 games, 21 points, win by 2, cap 30"). This is what reviewers check their rules against. Include lawn tennis (full third set), volleyball, sepaktakraw, table tennis, archery recurve/compound, combat methods, basketball periods, athletics modes. One line per rule; no editing.

### 4. Scoring lab coverage for all sports
Confirm the scoring lab can open a pad for every supported sport/archetype so reviewers can exercise each one: team (football/basketball/volleyball/sepaktakraw), racket (badminton/table tennis/lawn tennis), combat bout (boxing/taekwondo/wushu/wrestling/pencak silat), archery H2H (recurve + compound), and the ranked lab for athletics + archery ranking. If any supported sport is missing a lab fixture, add a minimal in-memory fixture so it can be demoed. Fail-closed stays intact (unsupported/unconfigured shows "Rules not configured").

### 5. (Optional, only if quick) Demo tournament flow
If low-effort, add one in-memory demo tournament per archetype so reviewers can also see create→fixtures→standings→live end-to-end without the DB. If it is not quick, skip it — the labs are the priority; note it as deferred.

## Acceptance
- With `EXPO_PUBLIC_REVIEW_BUILD=true`, the built app shows the Review entry point, and reviewers can open and operate the scoring pad for every listed sport plus the ranked board, all on sample data, with the review banner visible.
- With the flag off (normal build), nothing changes: labs stay hidden, no review entry point.
- No review screen issues any Supabase read/write (assert in tests/mocks).
- `npx tsc --noEmit` clean; all suites green; add a test that `isReviewBuild()` gates the lab routes.

## After you finish (build the APK)
Report back; then the APK is built with, e.g.:
`eas build -p android --profile preview` with `EXPO_PUBLIC_REVIEW_BUILD=true` (or a dedicated `review` profile in `eas.json` that sets that env). Confirm the profile/command you want to use and whether an EAS `review` profile should be added. Do not build with the flag on for any store/production profile.

## When done
Report files changed, test counts before/after, which sports have lab coverage, and the exact EAS command/profile to produce the review APK.
