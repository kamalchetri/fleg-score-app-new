# Google Stitch prompt — FLEG SCORE app

How to use: paste **Part 1 (Master Context)** as your first Stitch prompt to establish the app + design
system, then generate screens by pasting each block in **Part 3** one at a time (Stitch designs best a few
screens per turn). Part 2 is the design system to lock in first.

---

## PART 1 — MASTER CONTEXT (paste this first)

Design a modern, broadcast-grade **mobile app for iOS and Android** called **FLEG SCORE** — a live sports
tournament platform for Northeast India (starting with Nagaland). It powers real events end to end:
registration → fixtures → **live scoring** → standings → knockout brackets → results, across multiple
sports (**futsal/football, pickleball, basketball, badminton, darts**). It is the companion app to the
web platform fleg.in. Think **Sofascore / ESPN live scores + FIFA-app polish + Stripe-level cleanliness**,
but for grassroots and semi-pro tournaments, dark-themed and built to be read on a phone at a noisy,
sunlit venue.

**Three user types, one app (role-aware):**
1. **Spectators / Players** — discover events, watch live scores update in real time, follow a team,
   check standings and brackets, register and pay to join a tournament, download a digital ID/pass.
2. **Referees / Scorekeepers** — open their assigned matches and run **live scoring** on a big,
   one-handed control pad (goals, cards, subs and a match timer for football; rally points and games for
   pickleball; etc.), with undo and an unmistakable "saved" state.
3. **Organizers** — create a tournament, approve entrants, auto-generate group + knockout fixtures,
   assign referees, and manage everything from their phone.

**Product principles to express in the design:**
- **Live is the hero.** A pulsing ● LIVE state, scores in bold tabular numerals, real-time feel. When a
  score changes it should feel alive.
- **Glanceable.** A spectator should read a score, status and who's winning in under a second.
- **Thumb-first scoring.** The referee's scoring controls are huge, reachable one-handed, with instant
  visual feedback and a clear "● Saved / Saving…" indicator (matches can't be confirmed until saved).
- **Dark, premium, sporty.** Deep near-black backgrounds with a faint starfield/galaxy texture, glassy
  elevated cards, neon-green energy, gold/silver/bronze for rankings. High contrast for outdoor daylight.
- **Multi-sport adaptive.** The same shells adapt per sport (goals vs points vs games).
- **Trust & clarity.** Clean forms, honest empty states, confident status chips, no clutter.

Brand personality: energetic, competitive, community-driven, credible. Tagline energy: **"Fitness.
Learn. Earn. Game."** Avoid generic "AI-app" gradients-on-white; this is a dark, confident sports product.

---

## PART 2 — DESIGN SYSTEM (lock this in as the theme)

**Color palette (dark-first):**
- Background: `#08080F` (near-black) with a subtle deep-space radial glow + faint stars; secondary bg
  `#0A0A14`.
- Surfaces: card `#13131F`, elevated `#1C1C2E`, hairline border `#26263A`.
- **Primary / FLEG green:** `#00D95F` (CTAs, live, winners, active states) with a soft neon glow.
- Live/urgent + cards accent: red `#FF3B30`. Warning/registration: amber `#FF9F0A`.
- Rank medals: gold `#FFCF5A`, silver `#C8D0DA`, bronze `#E0995A`.
- Optional secondary accent: teal `#2DD4BF` (use sparingly for variety).
- Text: primary `#FFFFFF`, muted `#9B9BB0`, faint `#5E5E74`.

**Typography:** Display/headings **Space Grotesk** (bold, tight tracking, uppercase for labels); body
**Inter**. All scores, timers, tables use **tabular lining numerals**. Clear type scale (e.g. 32/24/20/16
/14/12) with strong hierarchy.

**Shape & spacing:** rounded corners (cards 20–24px, chips/buttons pill or 12px), generous padding, an
8pt spacing system. Soft shadows + subtle inner glow on live elements.

**Core components to define:** primary/secondary/ghost buttons; **giant score-tap tiles** (green/red);
status chips (● LIVE pulsing red, SCHEDULED, FT/COMPLETED, REGISTRATION OPEN); segmented **tab bar**
(Live · Standings · Fixtures · Bracket · Results); **league table row** (rank medal, team crest/monogram,
P W D L GF GA Pts); **fixture/match card** (two teams, score or "vs", time, court, status); **live
scoreboard** (big center score, two team panels, timer, event ticker); **knockout bracket** (horizontal
QF→SF→Final→Champion, connector lines, winner highlighted green, loser dimmed, gold Final/Champion);
team/player **avatar monogram**; bottom navigation; empty/loading/error states; toast + "Saved" sync
indicator; confetti/celebration for a winner.

**Iconography:** clean line icons (Lucide/Phosphor style), sport glyphs for football/pickleball/etc.

**Motion cues (describe in screens):** pulsing LIVE dot, score count-up, winner confetti/fireworks on a
completed match, smooth tab transitions.

---

## PART 3 — SCREENS TO GENERATE (paste one block at a time)

**A. Onboarding & Auth**
1. Splash / brand intro — FLEG SCORE logo on the dark galaxy backdrop, tagline, "Get started".
2. Login + Sign up (email/password + Google), clean dark forms.
3. Role onboarding — choose "I'm here to Watch / Play", "Referee / Scorer", or "Organizer".

**B. Spectator / Player**
4. **Home / Discover** — a top "● LIVE NOW" carousel of live match score cards that update, then
   "Upcoming tournaments", "Following", and a sports filter chip row. Bottom nav: Home, Discover, My
   Games, Profile.
5. **Tournament page** — hero (name, host, status chip, poster), a sticky **tab bar: Live · Standings ·
   Fixtures · Bracket · Results**, and filter pills (city, day, category). Show the Standings tab (league
   table with medals) and the Fixtures tab (grouped by group/round) as separate frames.
6. **Live match scoreboard** (spectator) — full-screen: big center score, two team panels with crests,
   match timer, ● LIVE, and a live **event ticker** (⚽ goal, 🟨 card, ⇄ sub). Include a football version
   and a pickleball version (games + current-game points).
7. **Knockout bracket** — horizontal QF → SF → Final → Champion, winners in green, gold Final/Champion,
   a tappable completed match.
8. **Winner celebration modal** — confetti/fireworks, winner crest + final score + Share.
9. **Register for a tournament** — pick category, enter details, upload ID/photo, pay (₹ fee), confirmation
   with a **digital ID/pass** (QR).
10. **Team / player profile** — crest, record, recent results, upcoming fixtures.
11. **Notifications** — kickoff reminders, goals for followed teams, results.

**C. Referee / Scorekeeper**
12. **My Matches** — assigned matches list with "Match control" CTA and status.
13. **Live Scoring — Football** — the hero screen: huge two-team score, a running timer, **big +Goal
    tiles**, and secondary controls for **Yellow card, Red card, Substitution, Foul, Undo**, plus a
    "● Saved" sync chip and a "Confirm result" button that's disabled until saved. One-handed, thumb-reachable.
14. **Live Scoring — Pickleball** — big +1 tiles for each side, current game + games won, "to 11, win by
    2", side-out/serve indicator, Undo, auto-complete at game point.
15. **Confirm result** — review final score, confirm → shows the winner advancing on the bracket.

**D. Organizer**
16. **My Tournaments** dashboard — cards with status, team counts, quick actions, "Create tournament".
17. **Create tournament wizard** — sport, format (league / groups+knockout / knockout), dates, venue,
    registration & fee.
18. **Entrants / Approvals** — list of registered teams/players, approve/reject, add manually.
19. **Build groups & generate fixtures** — assign teams to groups, "Auto-split into N groups", "Generate"
    (round-robin + cross-seeded knockout).
20. **Assign staff** — invite referees/scorekeepers by email, per-match assignment.
21. **Tournament settings** — status (draft → published → live → completed), categories open/close,
    visibility.

---

## Notes for the designer/Stitch
- Design **dark mode as the primary** experience (a light theme is optional/secondary).
- Keep the **live scoreboard and the referee scoring pad** the two showcase screens — they are FLEG
  Score's signature.
- Everything should feel like one cohesive design system (shared components, spacing, type), not a set of
  unrelated screens.
- Prioritize legibility outdoors, big touch targets, and a real-time, broadcast energy.
