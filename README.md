# Fleg Score — Tournament Management & Live Scoring App

Expo (React Native) companion app to [fleg.in](https://www.fleg.in). Same Supabase backend, same
RLS rules — this app is a client, the database is the platform.

**v0.1 scope (App-WP1):** login (accounts are created on the web), my matches (referee),
my tournaments (staff), full match control for futsal + pickleball (goals/cards/periods,
rally points/games, undo, confirm result + bracket advancement), live scoreboard,
tournament summary. Organizer management in-app lands in App-WP2.

## Setup

```bash
npm install
npx expo install --fix   # aligns native package versions with the Expo SDK
cp .env.example .env     # then paste the Supabase anon key into .env
npx expo start           # press 'a' for Android, or scan QR with Expo Go
```

The anon key comes from Supabase dashboard → Fleg-web project → Settings → API.

## Tester builds (EAS)

```bash
npm install -g eas-cli
eas login
eas init                      # links the project (first time only)
eas build --profile preview --platform android   # → APK install link
eas build --profile preview --platform ios       # needs Apple Developer account
eas submit --platform ios     # upload to TestFlight (internal testing)
```

Set the anon key as an EAS env var before building:
`eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <key> --environment preview`

## Engine tests

```bash
npm run test:engine
```

## SYNC files — keep identical to the web repo

These are copied verbatim from `Fleg-score/src/lib/` (pure TS, no framework deps).
When the web engine changes, re-copy them — do NOT edit here:

- `lib/scoring/` (index, types, futsal, pickleball)
- `lib/sports/presets.ts`
- `lib/database.types.ts` (regenerate after any migration)
- `tests/scoring-engine.test.ts` (import paths adjusted to relative)

`lib/queries.ts#advanceWinner` mirrors the web's advancement algorithm — if one changes,
change both.

## Rules

- Anon key only. Never a service key in this app. RLS is the security boundary.
- No schema changes from here — the database is managed centrally.
- `C:\Users\kxtri\fleg-mobile` is a different project. Never touch it.
