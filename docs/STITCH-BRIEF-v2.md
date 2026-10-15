# FLEG Score — Stitch design brief (v2)

Screens to generate in Stitch for the next build phase. Keep the **existing
"Electric Dark Score" design system** already used on the Home/Discover screen —
same tokens, fonts, spacing, rounding. Do **not** invent a new palette.

## Design system (reuse exactly)
- **Font:** Plus Jakarta Sans (400/500/600/700/800).
- **Canvas** `#0D0E12`, surfaces `#16181F` / `#1F222A` / `#2A2D37`.
- **Primary (lime)** `#CEF202`, text-on-lime `#0B0C10`. **Live green** `#10E862`. **Alert red** `#FF334B`.
- Text: primary `#E3E2E7`, secondary `#8E929E`, muted `#545763`. Hairline `rgba(255,255,255,0.07)`.
- Heavy rounding (cards ~20px, pills fully round), tonal layering, pill badges, Material Symbols icons.
- Mobile shell: fixed top header, bottom tab bar (Home · Live Scores · Tournaments · Profile).
- Reference already designed: Home/Discover, Live Score Center, Live Match Broadcast, Standings/Bracket, Registration Pass, Referee Pad. Match their tone.

---

## 1. Events Discovery
The app now unifies **scored tournaments AND registration events** (workshops, runs,
clinics — paid or free). One browse surface.

- Top: title "Events", search field, and a **segmented filter**: `All · Tournaments · Register · Live`.
- **Date filter week-strip** (reuse the Home "Upcoming Fixtures" scrubber): a horizontal
  `MON 14 · TUE 15 · WED 16 …` row with the active day filled lime, month label (e.g. "October 2025") in lime at the right.
- Sport chips row (Futsal, Pickleball, Basketball, Football, Darts …) — active = lime.
- **Event cards** (two visual types, same card frame):
  - *Tournament card*: crest, name, sport, city, live/upcoming/finished status pill, "View" affordance.
  - *Registration event card*: banner thumbnail, name, date, **price pill** (`₹500` or `FREE`), "Register" CTA, a capacity/"spots left" hint.
- Empty state per filter.

## 2. Event Detail → Register → Checkout (registration events)
The flow a participant takes to sign up + pay. (Scored tournaments keep their existing hub;
this is for `reg_forms` events.)

- **Detail:** banner, title, organiser attribution, date/venue/city, description, rules,
  important notes, and a **categories list** — each category = name, price, "spots left".
- **Register step:** the form's **custom fields** (text/number/select/etc. — driven by data),
  category selection (single or multi), optional "custom amount" (donation-style) when the event allows it,
  and an agreement checkbox with the organiser's agreement label.
- **Review + pay:** line-item summary (categories × price = total), then a **Razorpay checkout** step.
  Show a clear "Secure payment via Razorpay" trust line.
- **Success = Registration Pass** (reuse the existing pass design) with a QR / reference id.
- States: capacity full, registration closed, free-event (skip payment), payment-pending, payment-failed retry.

## 3. Create Registration Form — organiser builder (in-app, multi-step)
Organisers create a paid/free event with structured collection. Multi-step wizard, one section per screen with a progress indicator:

1. **Details:** title, sport, description, banner upload, venue, city/state, registration-closes date, visibility (public/unlisted).
2. **Categories & pricing:** add/reorder categories (name, description, price, capacity). Toggle "single vs multi-category". Toggle paid vs free.
3. **Custom fields:** builder to add fields participants fill (label, type: short text / long text / number / dropdown / phone / email, required?). Reorderable.
4. **Payment & payout:** confirm currency (INR), platform fee shown, and **payout method** (bank/UPI) pulled from the organiser profile — read-only summary with "edit payout details".
5. **Terms:** rules, terms text, "require agreement" toggle + agreement label, important notes.
6. **Review & publish:** full preview of the event as participants will see it, then Publish (or Save draft).

Design should feel confident and simple — this is the "you can collect payments" moment the platform is selling.

## 4. Organiser Earnings / Payouts dashboard (manual-disbursement v1)
Organisers see money collected and what they're owed. (Automated split is a later phase — design for the manual model now.)

- Header: total **Collected**, **Platform fee**, **Net owed to you** (three stat tiles, lime accent on "Net owed").
- Per-event breakdown list: event name, # registrations, gross collected, fee, net.
- A "Payouts" section: list of payout records with status pills (`Pending` / `Paid`) and date — v1 these are set manually by the platform.
- A subtle note: "Payouts are processed by FLEG. Automated instant split is coming soon."

## 5. Picks — lightweight "who wins" poll
A community prediction shown on live/upcoming match cards and expandable.

- On a match card: avatar stack + "+Nk placed a pick" + lime **PICK** button (as in the Home mock's second live card).
- **Pick sheet/modal:** the two teams as big tappable choices (crest + name). After picking, show the **% split bar** (Team A xx% / Team B yy%) and total count, and the user's choice highlighted. Allow changing the pick until kickoff.
- Post-result: show whether the user's pick was correct (✓/✗), no score/leaderboard yet.

---

### Notes for whoever builds from these (Cursor)
- Events feed reads the new `public_events` DB view (source = `tournament` | `form`).
- Registration submit calls the `reg_form_submit` RPC; payment uses fleg.in `/api/payments/razorpay/create-order` + `/verify` (never verify client-side).
- Picks read counts via the `match_pick_tally(match_ids)` RPC; writes go to `match_picks` (one per user per match).
- Earnings/payouts read from `reg_submissions` (amount, payment_status) grouped by form; payout method from `organizer_profiles.payout_details`.
