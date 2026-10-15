# NSPG 2026 Supabase contract

Read-only inspection of the connected Supabase project **Fleg-web** (`zcubdqfzdbwtfcdsntoa`, `ap-south-1`, Postgres 17) on 11 October 2026. No data, policies, functions, or schema were changed. Counts are a snapshot of that moment.

NSPG 2026 lives in `reg_forms` whose slug starts with `nspg26-`. There is no `nspg_*` table. There is no NSPG row in `tournaments`.

Secrets, service-role keys, emails, phone numbers, and payout details are omitted.

## 1. Sports and stored slugs

Competition disciplines are the `reg_forms.sport` value. The form slug is separate. Every competition form below is `status = open`, `visibility = public`, `is_paid = false`, `base_fee = 0`, `currency = INR`, `has_categories = true`, `multi_category = true`, `capacity = null`. Every category `price` is `0` and every category `capacity` is null. No category name contains “para” or “PWD”.

| Form slug | Stored `sport` | Title | Code prefix | Categories |
| --- | --- | --- | --- | --- |
| `nspg26-archery` | `archery` | NSPG26 — Archery | `ARC` | 17 |
| `nspg26-athletics` | `athletics` | NSPG26 — Athletics | `ATH` | 33 |
| `nspg26-badminton` | `badminton` | NSPG26 — Badminton | `BDM` | 7 |
| `nspg26-basketball` | `basketball` | NSPG26 — Basketball | `BKB` | 2 |
| `nspg26-boxing` | `boxing` | NSPG26 — Boxing | `BOX` | 14 |
| `nspg26-football` | `football` | NSPG26 — Football | `FBL` | 1 |
| `nspg26-lawn-tennis` | `lawn_tennis` | NSPG26 — Lawn Tennis | `LTN` | 4 |
| `nspg26-pencak-silat` | `pencak_silat` | NSPG26 — Pencak Silat | `PSL` | 32 |
| `nspg26-sepaktakraw` | `sepaktakraw` | NSPG26 — Sepaktakraw | `SPK` | 6 |
| `nspg26-table-tennis` | `table_tennis` | NSPG26 — Table Tennis | `TTN` | 7 |
| `nspg26-taekwondo` | `taekwondo` | NSPG26 — Taekwondo | `TKD` | 14 |
| `nspg26-volleyball` | `volleyball` | NSPG26 — Volleyball | `VBL` | 2 |
| `nspg26-wrestling` | `wrestling` | NSPG26 — Wrestling | `WRS` | 18 |
| `nspg26-wushu` | `wushu` | NSPG26 — Wushu | `WSU` | 17 |

`tournaments.sport` is a different vocabulary. Its check constraint allows only `futsal`, `football`, `pickleball`, `basketball`, `badminton`, and `darts`. Of the NSPG sport slugs, only `football`, `basketball`, and `badminton` could be stored on a tournament row today.

Extra form fields that are not shared:

- Athletics `eligibility`: “Only athletes with a valid Athletics Federation of India (AFI) UID number are eligible to participate.”
- Badminton `eligibility`: “A valid Badminton Association of India (BAI) ID or Nagaland Badminton Association (NBA) ID is required to participate. Players without a BAI ID may enter their NBA ID.”
- Football `per_district_limit`: `20`. Every other NSPG form has `per_district_limit` null and `eligibility` null.

Officials and staff forms share the stored sport slug `officials`. They are not competition disciplines. All are unpaid (`base_fee` 0), `multi_category = false`, and `has_categories = true`.

| Form slug | Title | Status | Visibility | Code prefix | Categories |
| --- | --- | --- | --- | --- | --- |
| `nspg26-cdm` | NSPG26 — Chef de Mission / Deputy Chef de Mission | open | unlisted | `CDM` | 2 |
| `nspg26-media` | NSPG26 — Media | open | unlisted | `MED` | 1 |
| `nspg26-noa` | NSPG26 — Organising Committee & Officials | open | unlisted | `NOA` | 3 |
| `nspg26-officials` | NSPG26 — Officials & Team Staff | archived | unlisted | `OFF` | 7 |
| `nspg26-organising-committee` | NSPG26 — Organising Committee | archived | unlisted | `OC` | 1 |
| `nspg26-support` | NSPG26 — Event Services & Partners | open | unlisted | `SUP` | 6 |
| `nspg26-team-staff` | NSPG26 — Team Staff (Coach / Manager / Physio) | open | public | `TS` | 3 |
| `nspg26-volunteers` | NSPG26 — Volunteers | open | unlisted | `VOL` | 1 |

## 2. Registration forms and category counts

`reg_forms` has no `tournament_id`. Submissions are `reg_submissions` rows. Category choices are `reg_submission_categories`. NSPG submissions in this snapshot are only `confirmed` or `withdrawn`, and every one has `payment_status = not_required`. There are no `held`, `cancelled`, `under_review`, `verified`, or `needs_attention` NSPG rows.

Across all 22 forms: **433 confirmed** and **9 withdrawn**.

| Form slug | Confirmed | Withdrawn |
| --- | ---: | ---: |
| `nspg26-archery` | 42 | 1 |
| `nspg26-athletics` | 26 | 1 |
| `nspg26-badminton` | 12 | 0 |
| `nspg26-basketball` | 74 | 0 |
| `nspg26-boxing` | 35 | 1 |
| `nspg26-cdm` | 20 | 3 |
| `nspg26-football` | 21 | 1 |
| `nspg26-lawn-tennis` | 10 | 0 |
| `nspg26-media` | 0 | 0 |
| `nspg26-noa` | 0 | 0 |
| `nspg26-officials` | 0 | 0 |
| `nspg26-organising-committee` | 0 | 0 |
| `nspg26-pencak-silat` | 1 | 0 |
| `nspg26-sepaktakraw` | 39 | 1 |
| `nspg26-support` | 0 | 0 |
| `nspg26-table-tennis` | 9 | 0 |
| `nspg26-taekwondo` | 29 | 0 |
| `nspg26-team-staff` | 57 | 0 |
| `nspg26-volleyball` | 1 | 0 |
| `nspg26-volunteers` | 0 | 0 |
| `nspg26-wrestling` | 1 | 0 |
| `nspg26-wushu` | 56 | 1 |

Category names are stored on `reg_form_categories` in `sort_order`. The archived officials form starts at sort order 2 (there is no sort order 1).

**Archery (17):** Men Indian Round - Individual; Men Indian Round - Individual Olympic Round; Men Indian Round - Team Olympic Round; Women Indian Round - Individual; Women Indian Round - Individual Olympic Round; Women Indian Round - Team Olympic Round; Indian Round - Mixed Team; Men Recurve - Individual; Men Recurve - Individual Olympic Round; Women Recurve - Individual; Women Recurve - Individual Olympic Round; Recurve - Mixed Team; Men Compound - Individual; Men Compound - Individual Olympic Round; Women Compound - Individual; Women Compound - Individual Olympic Round; Compound - Mixed Team.

**Athletics (33):** Men 100m, 200m, 400m, 800m, 1500m, 5000m, 10000m, Long Jump, Triple Jump, High Jump, Shot Put (7.26kg), Discus (2kg), Javelin (800g), 4x100m Relay, 4x400m Relay; Women 100m, 200m, 400m, 800m, 1500m, 5000m, 10000m, Long Jump, Triple Jump, High Jump, Shot Put (4kg), Discus (1kg), Javelin (600g), 4x100m Relay, 4x400m Relay; 4x400m Mixed Relay; Cross Country 10km — Men; Cross Country 10km — Women.

**Badminton (7):** Men's Singles, Men's Doubles, Men's Team, Women's Singles, Women's Doubles, Women's Team, Mixed Doubles.

**Basketball (2):** Senior Men, Senior Women.

**Boxing (14):** Men 46–49kg (Light Fly), Men up to 52kg (Fly), Men 56kg (Bantam), Men 60kg (Light), Men 64kg (Light Welter), Men 69kg (Welter), Men 75kg (Middle), Men 81kg (Light Heavy); Women 48kg (Light Fly), Women 51kg (Fly), Women 54kg (Bantam), Women 57kg (Feather), Women 60kg (Light), Women 65kg (Light Welter).

**Football (1):** Men.

**Lawn tennis (4):** Men's Singles, Men's Doubles, Men's Team Event, Mixed Doubles.

**Pencak silat (32):** Men Tanding — Under 45kg, Class A (45-50kg), B (50-55kg), C (55-60kg), D (60-65kg), E (65-70kg), F (70-75kg), G (75-80kg), H (80-85kg), I (85-90kg), J (90-95kg), Open 1 (95-110kg), Open 2 (Above 110kg); Women Tanding — Under 45kg, Class A through G (same breaks as men through 75-80kg), Class H (80-85kg), Open 1 (85-100kg), Open 2 (Above 100kg); Men Artistic — Tunggal, Solo Creative, Ganda, Regu; Women Artistic — Tunggal, Solo Creative, Ganda, Regu.

**Sepaktakraw (6):** Men - Regu, Men - Double, Men - Quad, Women - Regu, Women - Double, Women - Quad.

**Table tennis (7):** Men's Singles, Men's Doubles, Men's Team, Women's Singles, Women's Doubles, Women's Team, Mixed Doubles.

**Taekwondo (14):** Boys U35kg, U40kg, U45kg, U50kg, U55kg, U60kg, U65kg, Over 65kg; Girls U35kg, U39kg, U43kg, U47kg, U52kg, Over 52kg.

**Volleyball (2):** Men, Women.

**Wrestling (18):** Freestyle Men 57kg, 65kg, 74kg, 86kg, 97kg, 125kg; Greco-Roman Men 55kg, 60kg, 67kg, 77kg, 87kg, 97kg; Women Wrestling 50kg, 53kg, 57kg, 62kg, 65kg, 68kg.

**Wushu (17):** Sanda Men 48kg, 52kg, 56kg, 60kg, 65kg, 70kg, 75kg, 80kg, 85kg; Sanda Women 45kg, 48kg, 52kg, 56kg, 60kg, 65kg, 70kg, 75kg.

**Officials categories:** CDM — Chef de Mission (CDM), Deputy Chef de Mission (DCDM). Media — Media. NOA — Organising Committee, Official, Technical Official. Archived officials (sort 2–8) — Chef de Mission (CDM), Deputy Chef de Mission, Technical Official, Coach, Manager, Physiotherapist, Volunteer. Organising committee — Organising Committee. Support — Doctor, Nurse, Crew, Vendor, Sponsor, Partner. Team staff — Coach, Manager, Physiotherapist. Volunteers — Volunteer.

## 3. How approved registrations become tournament entrants

They do not. A confirmed NSPG registration is a `reg_submissions` row. A tournament entrant is an `entrants` row. Nothing copies one into the other.

`reg_submissions` has no `entrant_id`. `entrants` has no `submission_id`. No trigger and no function inserts into `entrants` from `reg_submissions`. `nspg_registrants(p_ids uuid[])` only resolves those ids to `id`, `email`, and `full_name` from `auth.users` and `profiles`. It does not create entrants.

Free forms, which all NSPG forms are, are confirmed at insert time. `reg_form_submit` writes:

- `status`: `held` when `reg_forms.is_paid`, otherwise `confirmed`
- `payment_status`: `pending` when paid, otherwise `not_required`
- `hold_expires_at`: `now() + 15 minutes` when paid, otherwise null

The column default on `reg_submissions.status` is `held`, and the default `payment_status` is `not_required`. Allowed submission statuses are `held`, `confirmed`, `cancelled`, `under_review`, `verified`, `needs_attention`, `withdrawn`. **`approved` is not a submission status.**

`BEFORE INSERT` on `reg_submissions`:

- `set_reg_code` sets `reg_code` to `code_prefix` (or `REG`) plus `-` plus a 4-digit `reg_code_seq` value.
- `reg_submission_district_limit` enforces `per_district_limit` by counting `answers->>'district'`, excluding `withdrawn` and `cancelled`. Only the football form sets that limit (20).

Tournament entry is a separate path. `register_entrant(...)` is `SECURITY DEFINER` and returns `uuid`. It requires the tournament `status` to be `registration_open` and the category to belong to that tournament. It rejects empty display name or contact fields, and it rejects the category when `max_entrants` is already filled by `pending`, `approved`, or `waitlisted` entrants. It then inserts an `entrants` row (`tournament_id`, `category_id`, `display_name`, `players`, `created_by = auth.uid()`) and an `entrant_contacts` row. It does not set `entrants.status`, so the column default `pending` applies.

Public insert policy `e_public_register` also requires `entrants.status = 'pending'` and the tournament to be `registration_open`. Public read policy `e_public_read` returns only `status = 'approved'` on a public tournament (`visibility` `public` or `unlisted`, and `status <> draft`).

Becoming a visible entrant is a later `UPDATE` of `entrants.status` to `approved`. Policy `e_staff_update` allows that only for `tournament_staff` roles `owner` and `co_organizer`. Allowed entrant statuses are `pending`, `approved`, `rejected`, `waitlisted`, `withdrawn`.

NSPG cannot use this path until tournament rows exist. The sport check would also reject every NSPG sport except `football`, `basketball`, and `badminton`.

## 4. Existing NSPG tournaments, categories, stages, and matches

**There are zero tournaments whose slug, name, or description matches NSPG or “Nagaland state”.**

The nearest named event is not an NSPG registration tournament. It is not linked to `nspg26-football`.

| Field | Value |
| --- | --- |
| Slug | `noa-football-demo-2026` |
| Name | Nagaland Olympics 2026 — Football (Demo) |
| Sport | `football` |
| Status | `published` |
| Visibility | `public` |
| Category | Men's Football, `format = groups_knockout`, `entrant_type = team`, sort order 0 |
| Stages | Group A (`group`, sort 0, 6 completed matches); Group B (`group`, sort 1, 6 completed matches); Knockout (`knockout`, sort 2, 3 scheduled matches) |

That is 1 category, 3 stages, and 15 matches. No NSPG sport has categories, stages, or matches of its own.

## 5. Scoring tables, columns, triggers, RPCs, and RLS

Scoring is the tournament stack: `tournaments`, `tournament_categories`, `stages`, `matches`, `entrants`, `entrant_contacts`, `score_events`, plus pick grading on `match_picks` and `app_settings`.

### Columns that matter

`score_events`: `id bigint`, `match_id`, `tournament_id`, `event_type`, `payload jsonb`, `created_by`, `created_at`. RLS is on.

`matches.status`: `scheduled`, `live`, `completed`, `walkover`, `cancelled`. `referee_id` is a nullable uuid referencing `profiles`. `format_override` is jsonb.

`entrants` extras beyond the July generated types: `photo_url`, `checked_in_at`, `checked_in_by`, `pool_label`, `contact_phone`, `payment_method`, `payment_note`, `added_by_organizer` (default false), `city`. Checks: `city` is null or `kohima` or `dimapur`; `payment_method` is null or `online` or `manual`; `payment_status` is `not_required`, `pending`, `paid`, `refunded`, or `failed` (default `not_required`).

`tournaments.prize_pool` is a nullable integer. `sport_config` is jsonb. Tournament status values used by the app contract are `draft`, `published`, `registration_open`, `registration_closed`, `live`, `completed`, `archived`. Visibility is `public`, `unlisted`, or `private`.

`stages.stage_type`: `group`, `knockout`, `league`. `tournament_categories.format`: `knockout`, `league`, `groups_knockout`. `entrant_type`: `team`, `singles`, `doubles`.

`match_picks`: `id`, `match_id`, `user_id`, `side`, `created_at`, `updated_at`, `is_correct`, `xp_awarded`, `graded_at`. RLS is on.

`app_settings` is a singleton whose primary key `id` is **boolean**, plus `platform_fee_bps integer`, `xp_multiplier integer`, `payout_cycle_note text`, `updated_at`. RLS is on. `app_settings_read` is `SELECT` for `anon` and `authenticated` with `qual = true`.

`tournament_staff`: `tournament_id`, `user_id`, `staff_role`, `created_at`.

### Triggers

| Table | Trigger | When | Function |
| --- | --- | --- | --- |
| `entrants` | `trg_entrants_updated` | BEFORE UPDATE | `set_updated_at()` |
| `matches` | `trg_matches_updated` | BEFORE UPDATE | `set_updated_at()` |
| `matches` | `grade_picks_on_complete` | AFTER UPDATE | `trg_grade_match_picks()` |
| `score_events` | `on_score_event_insert` | BEFORE INSERT | `set_score_event_tournament()` |
| `tournaments` | `trg_tournaments_updated` | BEFORE UPDATE | `set_updated_at()` |
| `tournaments` | `on_tournament_created` | AFTER INSERT | `handle_new_tournament()` |
| `tournaments` | `trg_publish_requires_approval` | BEFORE UPDATE | `enforce_publish_requires_approval()` |
| `reg_submissions` | `trg_set_reg_code` | BEFORE INSERT | `set_reg_code()` |
| `reg_submissions` | `reg_submissions_district_limit` | BEFORE INSERT | `reg_submission_district_limit()` |

`set_score_event_tournament` copies `matches.tournament_id` onto the new score event, sets `created_by` to `coalesce(auth.uid(), new.created_by)`, and raises if the match is missing.

`handle_new_tournament` inserts `tournament_staff (tournament_id, organizer_id, 'owner')` on conflict do nothing.

`enforce_publish_requires_approval` blocks leaving `draft` unless `organizer_profiles.status = 'approved'`.

`trg_grade_match_picks` calls `grade_match_picks` when a match becomes `completed` and `winner_id` is set. Exceptions are swallowed.

`grade_match_picks(p_match_id uuid)` maps `winner_id` to side `a` or `b` by comparing it with `entrant_a` / `entrant_b`, and returns without writing if neither matches. It reads `coalesce(xp_multiplier, 1)` from `app_settings where id` (the boolean primary key). It then sets `is_correct`, `xp_awarded` to `50 * multiplier` when the pick matches and `0` otherwise, and `graded_at = now()`, only where `graded_at` is still null.

### RPCs

All of these are `SECURITY DEFINER` except `reg_submission_district_limit`.

| Function | Arguments | Result |
| --- | --- | --- |
| `register_entrant` | `p_tournament_id uuid, p_category_id uuid, p_display_name text, p_players jsonb, p_contact_name text, p_contact_email text, p_contact_phone text, p_player_details jsonb, p_notes text` | `uuid` |
| `is_tournament_public` | `t_id uuid` | `boolean` |
| `is_tournament_staff` | `t_id uuid, roles text[]` | `boolean` |
| `is_admin` | none | `boolean` |
| `shares_tournament_staff` | `target uuid` | `boolean` |
| `nspg_registrants` | `p_ids uuid[]` | `TABLE(id uuid, email text, full_name text)` |
| `reg_form_submit` | `p_form_id uuid, p_full_name text, p_phone text, p_email text, p_answers jsonb, p_category_ids uuid[], p_agreed boolean, p_custom_amount integer, p_on_behalf boolean` | `TABLE(submission_id uuid, is_paid boolean, amount integer)` |
| `grade_match_picks` | `p_match_id uuid` | `void` |
| `match_pick_tally` | `p_match_ids uuid[]` | `TABLE(match_id uuid, a_count bigint, b_count bigint, total bigint)` |
| `my_xp` | none | `integer` |
| `fleg_award_xp` | `p_user uuid, p_delta integer, p_reason text, p_ref_type text, p_ref_id uuid` | `void` |

`is_tournament_staff` is true when `tournaments.organizer_id = auth.uid()` or a `tournament_staff` row exists for `auth.uid()` whose `staff_role` is in `roles`.

`is_tournament_public` is true when visibility is `public` or `unlisted` and status is not `draft`.

### RLS

`is_tournament_staff(tournament_id, ARRAY[...])` is the staff predicate below. “Public” means `anon` and `authenticated` unless noted.

| Table | Who can do what |
| --- | --- |
| `entrants` | Public `SELECT` only `status = approved` and `is_tournament_public`. Public `INSERT` only `status = pending` while the tournament is `registration_open`. Staff `SELECT` for owner, co_organizer, referee, scorekeeper. `UPDATE` and `DELETE` for owner and co_organizer only. |
| `entrant_contacts` | Public `INSERT` only while the tournament is `registration_open`. Staff `SELECT` for all four staff roles. `UPDATE` for owner and co_organizer. |
| `matches` | Public `SELECT` if the tournament is public. Staff `SELECT` and `UPDATE` for all four staff roles. `INSERT` and `DELETE` for owner and co_organizer. |
| `score_events` | Public `SELECT` if the tournament is public. Staff `SELECT`, `INSERT`, and `DELETE` for all four staff roles. |
| `stages`, `tournament_categories` | Public `SELECT` if the tournament is public. Staff `SELECT` for all four roles. `INSERT`, `UPDATE`, and `DELETE` for owner and co_organizer. |
| `tournament_staff` | `SELECT` own row, or any of the four staff roles. `INSERT` if the caller is owner or co_organizer (the policy does not forbid inserting another owner). `DELETE` if the caller is owner or co_organizer and the target `staff_role <> owner`. |
| `tournaments` | Public `SELECT` when visibility is `public` or `unlisted` and status is not `draft`. Organizer `INSERT` as self with an `organizer_profiles` row; a non-draft insert also requires that profile `status = approved`. Owner `SELECT`. Staff `SELECT` for all four roles. `UPDATE` for owner and co_organizer. `DELETE` only the organizer’s own drafts. |
| `match_picks` | Authenticated own-row `SELECT`, `UPDATE`, and `DELETE`. `INSERT` also requires the match’s tournament to be public. |
| `reg_forms` | Public `SELECT` when `status = open` and `visibility = public`. Owner or `profiles.role = admin` has `ALL`. |
| `reg_form_categories` | Public `SELECT` when the parent form is open and public. Form owner or admin has `ALL`. |
| `reg_submissions` | Authenticated `SELECT` where `user_id = auth.uid()`. Admin has `ALL`. `UPDATE` (`reg_submissions_own_update`) only when `user_id = auth.uid()` and the form slug matches `nspg26-%`, the form is `open`, and `registration_closes_at` is null or still in the future. `WITH CHECK` is `user_id = auth.uid()`. |
| `reg_submission_categories` | Authenticated `SELECT` of categories on the caller’s own submissions. Admin has `ALL`. |

`profiles.role` values `nspg_staff` and `nspg_lead` do not appear in any scoring or registration policy. They do not grant referee or scorekeeper rights.

## 6. Staff, referee, and scorekeeper roles

Two different role systems exist.

**Profile role** (`profiles.role`), check constraint: `player`, `user`, `organizer`, `referee`, `admin`, `nspg_staff`, `nspg_lead`. Snapshot counts: player 260, organizer 11, admin 2, referee 2, nspg_lead 1, nspg_staff 1. These counts are global. They are not NSPG tournament assignments.

**Tournament staff role** (`tournament_staff.staff_role`), check constraint: `owner`, `co_organizer`, `referee`, `scorekeeper`. Snapshot counts: owner 16, co_organizer 3, referee 2, scorekeeper 0. None of these rows belong to an NSPG tournament, because no NSPG tournament exists.

Assignment rules:

- Creating a tournament inserts the organizer as `owner`.
- An existing owner or co_organizer may insert further staff rows.
- An owner row cannot be deleted through `ts_manage_delete`.
- `matches.referee_id` is a separate per-match pointer to `profiles.id`. It is not the same as `tournament_staff.staff_role = referee`.
- Referee and scorekeeper may read entrants, contacts, matches, score events, stages, and categories, and may update matches and insert or delete score events.
- Referee and scorekeeper cannot approve entrants, edit categories or stages, or manage staff. Approval is owner and co_organizer only.
- Profile roles `nspg_staff` and `nspg_lead` have no RLS assignment of their own.

## 7. Exact `sport_config` values

`sport_config` is a column on `tournaments` only. **No NSPG sport has a stored `sport_config`**, because no NSPG tournament exists. There is also no basketball or badminton `sport_config` anywhere.

Values that are stored:

**Darts**

- `nagaland-dart-championship-z7dza`: `{"double_in":false,"double_out":true,"legs_to_win":3,"play_format":"legs","sets_to_win":3,"start_score":501}`
- `nagaland-darts-championship-2026`: `{"double_in":false,"double_out":true,"legs_to_win":3,"play_format":"legs","sets_to_win":1,"start_score":501}`
- `nagaland-darts-test`: `{"double_in":false,"double_out":true,"legs_to_win":2,"play_format":"legs","sets_to_win":1,"start_score":501}`

**Football**

- `noa-football-demo-2026`: `{"cards":["yellow","red"],"points":{"goal":1},"periods":2,"tiebreak":"penalties","table_points":{"win":3,"draw":1,"loss":0},"period_minutes":45}`

**Futsal**

- `amateur-weekend-league-awl-jkfyw`, `dimapur-futsal-championship-o22ii`, `dsfadfadf-c215f`, `kaki-cup-pgrmv`, and `trichy-football-tournament-kx34q` share: `{"cards":["yellow","red"],"points":{"goal":1},"periods":2,"tiebreak":"penalties","table_points":{"win":3,"draw":1,"loss":0},"period_minutes":20}`
- `cdfa-league-2026`: `{"points":{"goal":1},"periods":2,"table_points":{"win":3,"draw":1,"loss":0},"period_minutes":45}` (no `cards`, no `tiebreak`)

**Pickleball**

- `nagaland-pickleball-masters-2026`: `{"scoring":"sideout","table_points":{"win":2,"draw":0,"loss":0},"round_formats":{"semi":{"win_by":2,"best_of":3,"points_to":11},"final":{"win_by":2,"best_of":3,"points_to":11},"group":{"win_by":2,"best_of":1,"points_to":15},"quarter":{"win_by":2,"best_of":3,"points_to":11}}}`
- `rmlcf-pickleball-fundraiser-2026`, `rmlcf-pickleball-test`, `test-e2e-groups-cup-ddyp5`, and `test-e2e-groups-cup-q5f89` share: `{"win_by":2,"best_of":3,"scoring":"rally","points_to":11,"timeouts_per_game":2}`
- `test-app-tester-cup-x7k2q`: `{"win_by":2,"best_of":3,"scoring":"sideout","points_to":11,"table_points":{"win":2,"draw":0,"loss":0},"round_formats":{"semi":{"win_by":2,"best_of":3,"points_to":11},"final":{"win_by":2,"best_of":3,"points_to":11},"group":{"win_by":2,"best_of":1,"points_to":11},"quarter":{"win_by":2,"best_of":1,"points_to":15}},"timeouts_per_game":2}`

## 8. Mismatch with `lib/database.types.ts`

The file header says it was generated on 2026-07-03 and copied on 2026-07-04. The live schema has moved past that file.

The generated `Tables` block contains only: `aiko_payments`, `aiko_registration_categories`, `aiko_registration_controls`, `aiko_registrations`, `entrant_contacts`, `entrants`, `matches`, `organizer_profiles`, `profiles`, `score_events`, `stages`, `tournament_categories`, `tournament_staff`, `tournaments`.

`Views` is `[_ in never]: never`. Live public has the view `public_events`.

`Functions` contains only `aiko_insert_categories_atomic`, `aiko_release_pending_registration`, `aiko_replace_categories_atomic`, `is_admin`, `is_tournament_public`, `is_tournament_staff`, `register_entrant`, and `reload_pgrst_schema`.

### Columns on tables the file already lists

`matches` (including `format_override`) and `score_events` match the live column sets. `score_events.id` is `bigint` in Postgres and `number` in the generated file, which is the generator’s usual mapping.

Live columns missing from the generated `Row` types:

- `entrants`: `photo_url`, `checked_in_at`, `checked_in_by`, `pool_label`, `contact_phone`, `payment_method`, `payment_note`, `added_by_organizer`, `city`
- `profiles`: `username`, `avatar_url`, `bio`, `city`, `state`, `lat`, `lng`, `favorite_sports`, `skill_level`, `is_venue_owner`, `onboarded`
- `tournaments`: `prize_pool`

`profiles.role` is typed as `string`, so `nspg_staff` and `nspg_lead` still type-check, but the check constraint is not represented. The same is true of every other check constraint (`tournaments_sport_check`, entrant status, submission status).

`is_tournament_staff` SQL argument order is `t_id uuid, roles text[]`. The generated `Args` object lists `roles` then `t_id`. Calls that pass a named object still match. `register_entrant` returning `string` in the types file is the generator’s uuid mapping of the live `uuid` result.

### Tables and functions the file does not list

NSPG and scoring objects absent from the generated file include `reg_forms`, `reg_form_categories`, `reg_submissions`, `reg_submission_categories`, `public_events`, `match_picks`, `app_settings`, `payouts`, and the functions `reg_form_submit`, `nspg_registrants`, `grade_match_picks`, `match_pick_tally`, `my_xp`, `fleg_award_xp`, `form_fill`, `tournament_fill`, and `organizer_earnings`.

Other live public tables also absent from the file include `workshops` and `workshop_*`, `leagues`, `league_members`, `badges`, `user_badges`, `xp_events`, `player_progress`, `quest_templates`, `user_quests`, `coin_transactions`, `notifications`, `follows`, `waitlist_signups`, `fleg_idempotency_keys`, `fleg_username_rewrite_log`, `nprs_*`, `rmlcf_*`, and the one-off registration tables (`awareness_run_registrations`, `coffee_run_registrations`, `coffee_run2_registrations`, `darts_registrations`, `fleg_one_registrations`, `fleg_one_jj_registrations`, `run_registrations`, `st_registrations`, `st_payments`, `womens_clinic_registrations`).

## 9. Realtime

Publication `supabase_realtime` exists. `pg_publication_tables` has **zero** member tables. No public table has Supabase Realtime enabled.

## 10. What this inspection did not include

No service-role key, anon key, email, phone number, or payout detail is in this report. The inspection did not print `auth.users` rows. `nspg_registrants` can return email addresses; those values were not queried.
