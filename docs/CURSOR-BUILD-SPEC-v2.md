# FLEG Score — Cursor build spec (v2)

Build target: `fleg-score-app` (Expo SDK 57, expo-router, React Native, TypeScript).
Design reference: the Stitch exports in `docs/stitch/*` (events discovery, event detail/checkout,
form builder wizard, earnings/payouts, picks). Follow them; reuse the existing kit.

## Ground rules
- **Reuse** `components/kit.tsx` (Txt, Screen, Card, StatusPill, SportPill, Crest, FixtureCard,
  PrimaryButton, TournamentCard, BottomNav) and `lib/theme.ts` tokens. Do NOT introduce a new palette or font.
- **Do not touch** the scoring engine (`lib/scoring/*`), the referee pad logic (`app/match/[id].tsx`
  event handlers), or `lib/queries.ts` scoring functions. Add new query modules instead.
- All new Supabase reads/writes go through typed helpers in `lib/` (see each screen). Run
  `npx tsc --noEmit --ignoreDeprecations 6.0` and it must pass.
- Money is stored as **integer INR rupees**. Fee is basis points from `app_settings.platform_fee_bps` (500 = 5%).

## DB objects already created (use these — do not recreate)
- View `public_events(source, id, title, sport, description, banner_url, city, state, status,
  visibility, is_paid, fee, prize_pool, starts_at, ends_at, registration_closes_at, organizer_id, slug, created_at)`
  — `source` is `'tournament'` or `'form'`. Anon-readable, already RLS-filtered to public/non-draft.
- RPC `tournament_fill(uuid[]) -> (tournament_id, registered, capacity)`
- RPC `form_fill(uuid[]) -> (form_id, registered, capacity)`
- RPC `reg_form_submit(p_form_id, p_full_name, p_phone, p_email, p_answers jsonb, p_category_ids uuid[], p_agreed, p_custom_amount)` — creates a registration (server-side, SECURITY DEFINER). Returns the submission.
- RPC `match_pick_tally(uuid[]) -> (match_id, a_count, b_count, total)`
- Table `match_picks(match_id, user_id, side 'a'|'b', is_correct, xp_awarded, graded_at)` — one row per user per match; insert/update your own only.
- RPC `my_xp() -> integer`
- RPC `organizer_earnings() -> (source, event_id, title, registrations, gross, fee, net, status)` (own events only)
- Table `payouts(reference, organizer_id, amount, status, cycle, scheduled_at, paid_at, utr_reference, ...)` — read-only for the organiser (owner). `payouts_owner_read` policy.
- Tables for the builder: `reg_forms`, `reg_form_categories`, `reg_submissions`, `reg_submission_categories` (organiser owns their `reg_forms` via `reg_forms_owner_all`).
- Storage bucket `form-uploads` (private) for file-type custom fields.
- Table `app_settings(platform_fee_bps, xp_multiplier, payout_cycle_note)` — public read.
- `tournaments.prize_pool integer` (nullable).

## Navigation (change the shell)
Bottom tabs become **Home · Events · My Games · Profile** (replace the old Discover/Scores).
- Update `components/kit.tsx` `NavTab`/`NAV`/`NAV_PATH` to: `home` (`/home`, icon `home-variant`),
  `events` (`/events`, icon `calendar-star`), `games` (`/games`, icon `whistle`), `profile` (`/profile`, icon `account`).
- Register `app/events.tsx` in `app/_layout.tsx` (`headerShown:false`). Live scores stay reachable from Home + Events cards.
- `app/discover.tsx` → repurpose/rename into `app/events.tsx` (see screen 1).

---

## Screen 1 — Events (`app/events.tsx`)  [Stitch: events_discovery]
- Header "Events", search field, filter segmented control `All · Tournaments · Register · Live` (with counts).
- **Date week-strip**: horizontal `MON 14 … SAT 19`, active day filled lime, month label (e.g. "October 2025") lime.
  Filters `starts_at`/`registration_closes_at` to the selected day (client-side over the loaded feed).
- Sport chips (reuse `SportPill`), derived from feed.
- Cards from `public_events`, two renderers keyed by `source`:
  - `form` → **registration card**: `banner_url`, category tag, price pill (`fee`==null? `FREE` : `₹{fee}`),
    organiser attribution, title, date, capacity bar from `form_fill` (`registered/capacity`, "N spots left"),
    "Register" CTA → `/event/[id]`.
  - `tournament` → **tournament card**: crest, `TOURNAMENT · {sport}` + live/upcoming pill, title, city + `prize_pool`
    ("₹1.2L Prize Pool" if set), inline live mini-score if a live match exists, "View" → `/tournament/[id]`.
- Bottom "Submit Event" CTA → `/organize/new` (screen 3).
- New data module `lib/events-feed.ts`: `fetchEvents()` (select from `public_events`), plus batch
  `form_fill`/`tournament_fill` for visible ids. Client-side day + sport + search + segment filtering.

## Screen 2 — Event detail → register → pay (`app/event/[id].tsx`)  [Stitch: event_detail_register_checkout]
Only for `source='form'` events (tournaments keep their hub).
- Load the `reg_forms` row + its `reg_form_categories` + `form_fill` for spots. Header banner, status
  ("REGISTRATION OPEN · CLOSES …"), organiser, date/venue, Overview & guidelines (`rules`, `important_notes`).
- **Choose category**: radio list of categories (name, price, "N spots left", description). Respect
  `has_categories`/`multi_category` (single vs multi select). If `allow_custom_amount`, show a custom-amount input.
- **Participant details**: render the form's custom fields from `reg_forms.fields` (jsonb array of
  `{key,label,type,required,options?}`; types: short_text, long_text, number, dropdown, phone, email, date, file).
  File type uploads to `form-uploads` bucket, stores the returned path in the answer.
- Agreement checkbox using `agreement_label` when `require_agreement`.
- **Payment summary**: line items, platform fee (from `app_settings`, may be shown "Waived" if you choose to
  absorb it — display only), total. Free events (`is_paid=false`) skip payment.
- **Submit flow**:
  1. Call `reg_form_submit(...)` → returns submission with `amount`.
  2. If paid: `POST https://www.fleg.in/api/payments/razorpay/create-order` `{submission_id}` → order.
     Open Razorpay checkout (use `react-native-razorpay`, add dependency), then
     `POST /api/payments/razorpay/verify` with the checkout result. **Never** verify the signature client-side.
  3. On success → **Registration Pass** screen (reuse the existing pass design) with reference id / QR.
- States: capacity full, registration closed, payment pending, payment failed (retry).
- New module `lib/registration.ts` (form load, submit, payment calls).

## Screen 3 — Organiser form builder (`app/organize/new.tsx`)  [Stitch: organiser_form_builder_wizard]
5-step wizard (progress header, Save Draft). Writes to `reg_forms` (+ categories) via Supabase (owner RLS).
1. **Details** → `title, sport, description, banner_url` (upload to `form-uploads` or a banner bucket), `venue_name, city, state, registration_closes_at, visibility`.
2. **Categories & pricing** → rows in `reg_form_categories` (`name, description, price, capacity, sort_order`); toggles for `is_paid`, `has_categories`, `multi_category`.
3. **Custom fields** → edit `reg_forms.fields` jsonb (add/reorder/type: short_text/number/dropdown/date/file/phone/email; required flag). Include the "field input format" picker.
4. **Payment & payout** → currency (INR), platform fee shown, read-only payout summary from `organizer_profiles.payout_details` with "edit payout details" → onboarding.
5. **Terms** → `rules, terms, require_agreement, agreement_label, important_notes`.
6. **Review & publish** → preview as participant, then set `status='published'` (or keep draft).
- New module `lib/form-builder.ts`.

## Screen 4 — Organiser earnings / payouts (inside Profile area)  [Stitch: organiser_earnings_payouts]
- Route `app/organize/earnings.tsx`, reached from Profile / My Games.
- Stat tiles: Gross intake, Platform fee, **Net balance** — sum `organizer_earnings()`.
- Month selector (client filter), "MANUAL v1.0" badge, `payout_cycle_note` from settings.
- **Revenue by event**: rows from `organizer_earnings()` (title, registrations, gross, fee, net, status pill).
- **Disbursement account**: from `organizer_profiles.payout_details` (masked), "edit details".
- **Recent disbursements**: rows from `payouts` (reference, amount, status pill, scheduled/paid dates, UTR).
- New module `lib/earnings.ts`.

## Screen 5 — Picks (`app/match/[id]/pick.tsx` or a modal on live/match)  [Stitch: picks_match_prediction_modal]
- Entry: on live/upcoming match cards show avatar stack + "{total} placed a pick" + PICK button (from `match_pick_tally`).
- Pick sheet: two teams (crest+name) as big choices. On tap → upsert into `match_picks` (`side`), one per user
  per match; allow change until match starts (`status='scheduled'` or `'live'` before kickoff — enforce client-side + rely on RLS).
- Show % split + counts from `match_pick_tally`, highlight the user's pick, total "verified picks".
- Post-result (match `completed`): read `match_picks` own row → show correct ✓ / wrong ✗ and `xp_awarded` (+XP).
  Grading is automatic server-side (trigger). Show `my_xp()` somewhere on Profile.
- XP multiplier / "Double XP" is driven by `app_settings.xp_multiplier` (leave at 1 unless a promo).
- New module `lib/picks.ts`.

## Dependencies to add
- `react-native-razorpay` (checkout). `expo-image-picker` + `expo-document-picker` (file-type fields / banner upload).

## Definition of done
- `tsc` clean; scoring engine tests still pass (`npm run test:engine`).
- Each screen renders loading/empty/error states.
- No secrets in the app; all payment verification via fleg.in API.
