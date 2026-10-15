# NSPG 2026 tournament provisioning plan

Read-only inspection of Supabase project **Fleg-web** (`zcubdqfzdbwtfcdsntoa`) on 11 October 2026. No schema, policy, function, registration row, or tournament row was changed. A later read-only dry run is in section 11. The tables in this document through section 10 stay the 11 October snapshot.

Officials forms (`sport = officials`) are out of scope. This plan covers the 14 competition sports only.

Counts below are a snapshot. Registration on every competition form closes at `2026-10-15 18:29:00+00`. Re-run the verification queries at import time.

Identity-document fields exist on the forms (`aadhaar`, `aadhaar_image`). This plan names those keys and does not copy their values onto entrants or into this document.

## 1. Proposed draft tournaments

Create **one private draft tournament per sport**. Do not publish, open registration, or generate fixtures in the first pass.

Shared proposal:

| Field | Value |
| --- | --- |
| Status | `draft` |
| Visibility | `private` |
| City | `Chümoukedima` (copied from the registration form) |
| State | `Nagaland` |
| Venue | null on every form; leave null |
| `starts_at` / `ends_at` | not stored on `reg_forms`; leave null until organizers set competition dates |
| `organizer_id` | unresolved; must be an approved `organizer_profiles` row. Do not guess a user |
| `sport_config` | see section 9. Unconfirmed rules stay `TBD` |
| Categories | one `tournament_categories` row per `reg_form_categories` row, same name, sort order preserved |

`football`, `basketball`, and `badminton` already pass `tournaments_sport_check`. The other 11 cannot be inserted until that constraint is replaced (section 7). Even the three allowed sports stay drafts until the entrant-linkage rules in section 6 are approved.

| Proposed slug | `tournaments.sport` | Name | Source form | Categories |
| --- | --- | --- | --- | ---: |
| `nspg26-archery` | `archery` | NSPG26 — Archery | `nspg26-archery` | 17 |
| `nspg26-athletics` | `athletics` | NSPG26 — Athletics | `nspg26-athletics` | 33 |
| `nspg26-badminton` | `badminton` | NSPG26 — Badminton | `nspg26-badminton` | 7 |
| `nspg26-basketball` | `basketball` | NSPG26 — Basketball | `nspg26-basketball` | 2 |
| `nspg26-boxing` | `boxing` | NSPG26 — Boxing | `nspg26-boxing` | 14 |
| `nspg26-football` | `football` | NSPG26 — Football | `nspg26-football` | 1 |
| `nspg26-lawn-tennis` | `lawn_tennis` | NSPG26 — Lawn Tennis | `nspg26-lawn-tennis` | 4 |
| `nspg26-pencak-silat` | `pencak_silat` | NSPG26 — Pencak Silat | `nspg26-pencak-silat` | 32 |
| `nspg26-sepaktakraw` | `sepaktakraw` | NSPG26 — Sepaktakraw | `nspg26-sepaktakraw` | 6 |
| `nspg26-table-tennis` | `table_tennis` | NSPG26 — Table Tennis | `nspg26-table-tennis` | 7 |
| `nspg26-taekwondo` | `taekwondo` | NSPG26 — Taekwondo | `nspg26-taekwondo` | 14 |
| `nspg26-volleyball` | `volleyball` | NSPG26 — Volleyball | `nspg26-volleyball` | 2 |
| `nspg26-wrestling` | `wrestling` | NSPG26 — Wrestling | `nspg26-wrestling` | 18 |
| `nspg26-wushu` | `wushu` | NSPG26 — Wushu | `nspg26-wushu` | 17 |

Tournament slug uses the form slug. `tournaments.sport` uses the stored sport slug (`lawn_tennis`, not `lawn-tennis`). No current tournament slug starts with `nspg26-`. Confirm uniqueness again before insert. Do not attach these rows to `noa-football-demo-2026`.

`tournament_categories.format` only allows `knockout`, `league`, and `groups_knockout`. `entrant_type` only allows `team`, `singles`, and `doubles`. Categories marked `heat/final`, `ranked results`, `unknown`, or an unsupported multi-participant type **cannot be inserted** until those two checks are expanded or the category is deliberately left out of the first insert. That expansion is a separate approval from the sport check.

## 2. Category map

Every proposed tournament category uses the registration category name unchanged. Nothing is merged.

Entrant-type vocabulary:

- `singles` — one person, and a two-entrant match could represent the contest later
- `unsupported: unlinked pair` — the category name expects a pair, and the form has no partner field
- `unsupported: district roster` — the category name expects a team, and each submission is one person with only `district` as a grouping key
- `unsupported: ranked individual` — one person, but the contest is a heat, field event, or ranking, not a two-entrant match
- `unsupported: artistic ensemble` — Pencak Silat ganda or regu

Formats are structural proposals from the category name. No rules text on the form confirms them. `unknown` means the name does not choose among knockout, league, and groups/knockout.

### Archery — `nspg26-archery`

| Sort | Category id | Name | Entrant type | Format |
| ---: | --- | --- | --- | --- |
| 1 | `1288aeae-75ea-40a3-b5cb-a03ed12e95ff` | Men Indian Round - Individual | unsupported: ranked individual | ranked results |
| 2 | `bfcb4bd5-968b-451b-8c38-3793dbe52154` | Men Indian Round - Individual Olympic Round | singles | knockout |
| 3 | `65f9c29e-af5d-4f0d-be4b-1798bf8cf2c4` | Men Indian Round - Team Olympic Round | unsupported: district roster | unknown |
| 4 | `2179ac7e-7066-4589-9aba-8bcaca21f050` | Women Indian Round - Individual | unsupported: ranked individual | ranked results |
| 5 | `3939d8a8-d511-454d-ba0f-64926b083c32` | Women Indian Round - Individual Olympic Round | singles | knockout |
| 6 | `be52de7d-dd4a-4ecf-b995-0df45fd095d5` | Women Indian Round - Team Olympic Round | unsupported: district roster | unknown |
| 7 | `b592e807-5a85-443f-af4e-42e1c4da70aa` | Indian Round - Mixed Team | unsupported: district roster | unknown |
| 8 | `62d2057f-e6ab-4be4-9bdc-f111bcecafee` | Men Recurve - Individual | unsupported: ranked individual | ranked results |
| 9 | `37a92c70-8bf9-4e8a-b6b7-b8ef42703e9c` | Men Recurve - Individual Olympic Round | singles | knockout |
| 10 | `6cc917b4-97fa-4b22-b42c-9de24d0b790e` | Women Recurve - Individual | unsupported: ranked individual | ranked results |
| 11 | `3aaf6c33-a06f-4774-9615-0ddcfc011e94` | Women Recurve - Individual Olympic Round | singles | knockout |
| 12 | `2a6bc929-d49f-4fb7-9870-f8838525ccec` | Recurve - Mixed Team | unsupported: district roster | unknown |
| 13 | `9d160c8b-4a7e-4fd4-9476-fb7e5df82752` | Men Compound - Individual | unsupported: ranked individual | ranked results |
| 14 | `f6014f38-f798-42d4-872a-5517a0037afc` | Men Compound - Individual Olympic Round | singles | knockout |
| 15 | `232abbcd-f4db-4223-8b74-0adbc09d319e` | Women Compound - Individual | unsupported: ranked individual | ranked results |
| 16 | `2936e646-974f-4ef8-b4d7-0ba3e6c83c7b` | Women Compound - Individual Olympic Round | singles | knockout |
| 17 | `298a72d4-394f-47cd-9419-42d3a7fc218d` | Compound - Mixed Team | unsupported: district roster | unknown |

Individual Olympic Round is the only archery shape that can become a two-entrant match, and only after a qualification cut is defined. The qualification categories themselves are rankings.

### Athletics — `nspg26-athletics`

Track events, including relays, are `heat/final`. Field events and cross country are `ranked results`. Relays are `unsupported: district roster`. Every other athletics category is `unsupported: ranked individual`.

| Sort | Category id | Name | Entrant type | Format |
| ---: | --- | --- | --- | --- |
| 1 | `93fed4b9-0ace-4e64-b4c1-5af181e54986` | Men 100m | unsupported: ranked individual | heat/final |
| 2 | `7dd63a21-a804-447b-a753-7454261137ed` | Men 200m | unsupported: ranked individual | heat/final |
| 3 | `aa8d593a-ba78-4940-bd87-23ce4d035f06` | Men 400m | unsupported: ranked individual | heat/final |
| 4 | `8f60ab62-bf94-4089-a52a-4a7d30251c18` | Men 800m | unsupported: ranked individual | heat/final |
| 5 | `fada091e-9bff-4642-a936-c38cd05cbb11` | Men 1500m | unsupported: ranked individual | heat/final |
| 6 | `31ec3a7e-d8bf-4a2e-975a-0cad4f7996bc` | Men 5000m | unsupported: ranked individual | heat/final |
| 7 | `6c202ffc-5bed-4ce9-9ff0-ad72d8103b7c` | Men 10000m | unsupported: ranked individual | heat/final |
| 8 | `518411ad-e659-4991-892e-b396ed441adb` | Men Long Jump | unsupported: ranked individual | ranked results |
| 9 | `8dc7fb6a-a38d-4988-95ee-1ea554e3087e` | Men Triple Jump | unsupported: ranked individual | ranked results |
| 10 | `843e023f-b88d-4f2a-8314-76dbba70a98b` | Men High Jump | unsupported: ranked individual | ranked results |
| 11 | `550b13c1-1eb0-4eb8-bcbf-e54ba629290a` | Men Shot Put (7.26kg) | unsupported: ranked individual | ranked results |
| 12 | `76ab74f0-c02d-4740-90ab-c744c3768f50` | Men Discus (2kg) | unsupported: ranked individual | ranked results |
| 13 | `5c510bcc-8e83-4a5e-829e-baccc2e06800` | Men Javelin (800g) | unsupported: ranked individual | ranked results |
| 14 | `ae8d4f0b-89dc-4236-b163-a3613154203e` | Men 4x100m Relay | unsupported: district roster | heat/final |
| 15 | `84af8d15-629c-4fb7-9bec-15accf6d7f69` | Men 4x400m Relay | unsupported: district roster | heat/final |
| 16 | `47c3ea72-0738-41c7-a055-67a190f82434` | Women 100m | unsupported: ranked individual | heat/final |
| 17 | `5127f76a-d124-4822-9649-6cd26d24baa4` | Women 200m | unsupported: ranked individual | heat/final |
| 18 | `69ed5761-f3db-42dd-8db2-f26ab0d48768` | Women 400m | unsupported: ranked individual | heat/final |
| 19 | `5b39bf83-9b32-4e9b-a234-f50d7f04a4fc` | Women 800m | unsupported: ranked individual | heat/final |
| 20 | `57f8ab47-3579-4cd0-9389-7281c2e98f01` | Women 1500m | unsupported: ranked individual | heat/final |
| 21 | `5ca477fe-9354-446c-a9c3-5d9494729a7b` | Women 5000m | unsupported: ranked individual | heat/final |
| 22 | `0f12595f-e8e5-4cbd-a954-59ba861873ae` | Women 10000m | unsupported: ranked individual | heat/final |
| 23 | `1eeaef3f-6203-4b8f-8139-de06ae30ce88` | Women Long Jump | unsupported: ranked individual | ranked results |
| 24 | `49eadc35-f1e3-4dff-a159-5b0ec17b9694` | Women Triple Jump | unsupported: ranked individual | ranked results |
| 25 | `253f0609-876a-487e-aac5-262c17018ea4` | Women High Jump | unsupported: ranked individual | ranked results |
| 26 | `fccebf55-6159-4a5a-b408-abe4a1a327f5` | Women Shot Put (4kg) | unsupported: ranked individual | ranked results |
| 27 | `e9d9c02a-797f-413e-93d8-b49cf2e87323` | Women Discus (1kg) | unsupported: ranked individual | ranked results |
| 28 | `7ef4e3b0-a91b-43c8-9cef-ce2fb42844ef` | Women Javelin (600g) | unsupported: ranked individual | ranked results |
| 29 | `333a9c69-cbaa-4486-a930-98abe21fc040` | Women 4x100m Relay | unsupported: district roster | heat/final |
| 30 | `673d0668-5052-4574-852b-639041c74c33` | Women 4x400m Relay | unsupported: district roster | heat/final |
| 31 | `473ca3ac-ef13-42e6-af68-49964a02ea0c` | 4x400m Mixed Relay | unsupported: district roster | heat/final |
| 32 | `3d5c7bee-7938-4291-9500-4ce51863640d` | Cross Country 10km — Men | unsupported: ranked individual | ranked results |
| 33 | `4fdbc9d7-1d2a-4c36-bd5b-ae35c047351b` | Cross Country 10km — Women | unsupported: ranked individual | ranked results |

### Badminton — `nspg26-badminton`

| Sort | Category id | Name | Entrant type | Format |
| ---: | --- | --- | --- | --- |
| 1 | `c73d666b-4d2c-4204-9fcf-530c3809ad3f` | Men's Singles | singles | knockout |
| 2 | `e9013949-eec0-4590-84c7-775714fe1b6c` | Men's Doubles | unsupported: unlinked pair | unknown |
| 3 | `7b4b57b4-b3dd-4141-892a-44f13a036f50` | Men's Team | unsupported: district roster | unknown |
| 4 | `3bc2c746-35d5-468b-a4e4-41a23f127f65` | Women's Singles | singles | knockout |
| 5 | `f3a8a51f-584f-4ff2-82d6-02d4a7b2a478` | Women's Doubles | unsupported: unlinked pair | unknown |
| 6 | `661c77cf-63d0-4c17-bda7-0a8b50970d41` | Women's Team | unsupported: district roster | unknown |
| 7 | `2a930691-6cd6-46ed-9122-33ee0e77bf37` | Mixed Doubles | unsupported: unlinked pair | unknown |

### Basketball — `nspg26-basketball`

| Sort | Category id | Name | Entrant type | Format |
| ---: | --- | --- | --- | --- |
| 1 | `1ea93af7-cc01-402b-8755-e4753d98695d` | Senior Men | unsupported: district roster | unknown |
| 2 | `4b710521-4ca9-4206-a892-bd34fae9dc22` | Senior Women | unsupported: district roster | unknown |

### Boxing — `nspg26-boxing`

Every boxing category is `singles` and `knockout` (proposed; bout length is `TBD` in section 9).

| Sort | Category id | Name |
| ---: | --- | --- |
| 1 | `20003de9-c298-4f7a-bcb3-09dffe61ec68` | Men 46–49kg (Light Fly) |
| 2 | `96032152-dc5e-4278-bb3e-65f0f85c9afc` | Men up to 52kg (Fly) |
| 3 | `898b22bd-d73f-498a-9531-fd2e259f8b70` | Men 56kg (Bantam) |
| 4 | `f37b0b70-f36d-4ad0-9722-01a4064c0009` | Men 60kg (Light) |
| 5 | `6c557c99-75fe-4ebc-97f0-d046114f6917` | Men 64kg (Light Welter) |
| 6 | `8b97ad8e-b488-4c2a-af93-ce5af03402a6` | Men 69kg (Welter) |
| 7 | `ac36cb72-9b35-46a5-b37a-d3ba6fe598a9` | Men 75kg (Middle) |
| 8 | `ee7f1ca9-bc90-49a2-badf-bcaaf04ae935` | Men 81kg (Light Heavy) |
| 9 | `55094d4a-43cd-4969-be9c-342ed806ed10` | Women 48kg (Light Fly) |
| 10 | `2ed68e88-8e63-45cc-8bad-c757c2b73851` | Women 51kg (Fly) |
| 11 | `d8481bbc-63cc-4a0a-89c9-530becff66c3` | Women 54kg (Bantam) |
| 12 | `32410590-64e0-440e-91ac-53d6023a7480` | Women 57kg (Feather) |
| 13 | `85248ace-337a-4dd9-a64c-904d889cd94b` | Women 60kg (Light) |
| 14 | `8f5a3e3a-c72f-4b0c-aa3b-e7ce17505bec` | Women 65kg (Light Welter) |

### Football — `nspg26-football`

| Sort | Category id | Name | Entrant type | Format |
| ---: | --- | --- | --- | --- |
| 1 | `9a58c042-7b22-4ce0-a9c3-726bc5083d7b` | Men | unsupported: district roster | unknown |

`per_district_limit` is 20 on this form only. That cap is per person-registration, not a stored team size.

### Lawn tennis — `nspg26-lawn-tennis`

| Sort | Category id | Name | Entrant type | Format |
| ---: | --- | --- | --- | --- |
| 1 | `aed44957-5c00-450d-81b4-41b4efb552f6` | Men's Singles | singles | knockout |
| 2 | `ff764eb6-4178-45c0-9d25-fbaffadabbfc` | Men's Doubles | unsupported: unlinked pair | unknown |
| 3 | `4e2707a4-a906-44a6-8f67-286d14db2e74` | Men's Team Event | unsupported: district roster | unknown |
| 4 | `cc87a245-9fad-451b-a38a-8be9c8ddac9b` | Mixed Doubles | unsupported: unlinked pair | unknown |

### Pencak Silat — `nspg26-pencak-silat`

Tanding categories are `singles` / `knockout`. Artistic tunggal and solo creative are `unsupported: ranked individual` / `ranked results`. Ganda is `unsupported: artistic ensemble` (pair). Regu is `unsupported: artistic ensemble` (group). Ensemble format is `unknown`.

| Sort | Category id | Name | Entrant type | Format |
| ---: | --- | --- | --- | --- |
| 1 | `dd684766-dc5c-4321-a092-a3840ccb6ed1` | Men Tanding - Under 45kg | singles | knockout |
| 2 | `db2e6a97-4401-4483-8e72-510c22369366` | Men Tanding - Class A (45-50kg) | singles | knockout |
| 3 | `feb3d421-2b72-490e-9764-806bb1552da1` | Men Tanding - Class B (50-55kg) | singles | knockout |
| 4 | `a57b2f5b-32ed-4063-981b-6f6e793bf345` | Men Tanding - Class C (55-60kg) | singles | knockout |
| 5 | `9235fbdb-7167-4662-8902-c586a62d260d` | Men Tanding - Class D (60-65kg) | singles | knockout |
| 6 | `2e29aae3-7fe4-41b1-88d5-3da672bfa249` | Men Tanding - Class E (65-70kg) | singles | knockout |
| 7 | `c324315d-bed0-4c25-922a-a1b1632a42d3` | Men Tanding - Class F (70-75kg) | singles | knockout |
| 8 | `e6a97706-501a-4568-a004-d12edb657ea1` | Men Tanding - Class G (75-80kg) | singles | knockout |
| 9 | `672931f9-13d4-422d-85f0-ba63203a0280` | Men Tanding - Class H (80-85kg) | singles | knockout |
| 10 | `5e6fba84-94e2-4624-8412-56a524eab2c0` | Men Tanding - Class I (85-90kg) | singles | knockout |
| 11 | `5685aa51-ea1e-4026-87b9-2389159de77a` | Men Tanding - Class J (90-95kg) | singles | knockout |
| 12 | `9c9067c7-c8c5-48a3-aaf0-4dbcb3896f5f` | Men Tanding - Open 1 (95-110kg) | singles | knockout |
| 13 | `b6f5fa05-1ed9-473f-bcb1-91ce357cf06a` | Men Tanding - Open 2 (Above 110kg) | singles | knockout |
| 14 | `fc64aff5-71c8-4b57-8710-ae0c98fdc1cc` | Women Tanding - Under 45kg | singles | knockout |
| 15 | `cd16c1f0-0c53-404d-9087-fe9edcb4255f` | Women Tanding - Class A (45-50kg) | singles | knockout |
| 16 | `07438ded-af53-4387-bc8c-1d4a6b735d1f` | Women Tanding - Class B (50-55kg) | singles | knockout |
| 17 | `7280fed4-d6c8-4fc6-bad9-ec9302c23bc6` | Women Tanding - Class C (55-60kg) | singles | knockout |
| 18 | `5dac8532-c24a-4ae6-b18a-52b1ad30b2fb` | Women Tanding - Class D (60-65kg) | singles | knockout |
| 19 | `cf663579-239a-41bc-b114-8f895ad3be1d` | Women Tanding - Class E (65-70kg) | singles | knockout |
| 20 | `46d3eeb6-9b5f-41e0-bc37-9e18957d2ef9` | Women Tanding - Class F (70-75kg) | singles | knockout |
| 21 | `127830d1-52f2-42ce-8f4e-38dd36ca4b1f` | Women Tanding - Class G (75-80kg) | singles | knockout |
| 22 | `e491576e-4cec-4b2f-a8ef-7ed18914c5d5` | Women Tanding - Class H (80-85kg) | singles | knockout |
| 23 | `c6f2ade9-71e0-416d-861b-3e48616a9261` | Women Tanding - Open 1 (85-100kg) | singles | knockout |
| 24 | `cff9ebe0-090d-47e3-bb54-f10ed68e9501` | Women Tanding - Open 2 (Above 100kg) | singles | knockout |
| 25 | `74159903-49a9-453a-aace-782efb3757d2` | Men Artistic - Tunggal | unsupported: ranked individual | ranked results |
| 26 | `2285a70a-8177-4028-9d3b-1d1d1c5ef89f` | Men Artistic - Solo Creative | unsupported: ranked individual | ranked results |
| 27 | `e4e44587-a424-485b-b9c0-c7255bb0963b` | Men Artistic - Ganda | unsupported: artistic ensemble | unknown |
| 28 | `d95df092-15fc-4a6d-a6e3-462d02758fba` | Men Artistic - Regu | unsupported: artistic ensemble | unknown |
| 29 | `7d2ce957-21a9-45a0-b9b3-a9f385ee46a8` | Women Artistic - Tunggal | unsupported: ranked individual | ranked results |
| 30 | `b1415ae3-0b13-4bf5-abc3-d406993d4815` | Women Artistic - Solo Creative | unsupported: ranked individual | ranked results |
| 31 | `171c2e3a-1eaa-4ad9-a775-4b129be2f318` | Women Artistic - Ganda | unsupported: artistic ensemble | unknown |
| 32 | `64cc4b4f-10ef-4746-a4a4-cbdac6652ecf` | Women Artistic - Regu | unsupported: artistic ensemble | unknown |

### Sepaktakraw — `nspg26-sepaktakraw`

All six categories are `unsupported: district roster` and `unknown`. Regu, double, and quad are different squad sizes. The form does not record which size a person is filling beyond the category tick.

| Sort | Category id | Name |
| ---: | --- | --- |
| 1 | `58ad4981-b85b-4cf9-9c9c-7df7c298078e` | Men - Regu |
| 2 | `38c7c93a-3582-4331-8edd-cc4ab1e9e454` | Men - Double |
| 3 | `14d9b1d3-a992-45d2-a4ec-6b464aa24569` | Men - Quad |
| 4 | `ba9c48d7-6916-43f6-a63e-ab839a68d1b9` | Women - Regu |
| 5 | `62d39f67-18da-4abd-a6c3-2322c2ccb681` | Women - Double |
| 6 | `2f9f38e9-4d9b-4728-9f9a-ddcba09f9571` | Women - Quad |

### Table tennis — `nspg26-table-tennis`

| Sort | Category id | Name | Entrant type | Format |
| ---: | --- | --- | --- | --- |
| 1 | `fa42c003-a9be-4a8b-9828-d8423e313304` | Men's Singles | singles | knockout |
| 2 | `70730450-4fc9-469e-ad91-d714ffd02ca9` | Men's Doubles | unsupported: unlinked pair | unknown |
| 3 | `a0b4c0ba-16f1-4c2e-927d-fc302229c567` | Men's Team | unsupported: district roster | unknown |
| 4 | `6a9eddb2-1b51-4131-8036-7d12c0a467dd` | Women's Singles | singles | knockout |
| 5 | `5dacc1c5-ca50-4a26-823e-a1e081e00d27` | Women's Doubles | unsupported: unlinked pair | unknown |
| 6 | `e3d7a375-1dd9-4b65-ab43-21465f5a0654` | Women's Team | unsupported: district roster | unknown |
| 7 | `fdefb25f-7506-4d68-9169-fed71b909b64` | Mixed Doubles | unsupported: unlinked pair | unknown |

### Taekwondo — `nspg26-taekwondo`

Every category is `singles` / `knockout` (proposed).

| Sort | Category id | Name |
| ---: | --- | --- |
| 1 | `250526d4-6d08-4348-acaf-b35a01e3fbca` | Boys U35kg |
| 2 | `f3290ef4-5224-40fc-822f-6c8eb2e9fa82` | Boys U40kg |
| 3 | `10aa254b-7b3c-4634-9e5f-edf99e34fb27` | Boys U45kg |
| 4 | `3cee06fd-1124-489b-b978-b4b507438880` | Boys U50kg |
| 5 | `bc580783-ca3c-49d1-8058-93377eb5ec7c` | Boys U55kg |
| 6 | `6766357a-89d8-4f62-9827-9e349c798c19` | Boys U60kg |
| 7 | `176dcbdd-899f-4234-921e-9d7535827cdb` | Boys U65kg |
| 8 | `5841c53a-be62-4906-a0a6-aed452666f2f` | Boys Over 65kg |
| 9 | `7eadb6e3-c07f-4104-9c6a-3dbe29556ad4` | Girls U35kg |
| 10 | `428638bc-92c1-496d-be83-2eb1daee2f27` | Girls U39kg |
| 11 | `45fd9858-8d70-43b5-aa32-04d03ef36539` | Girls U43kg |
| 12 | `fec15b9b-9f03-4240-9dbe-1a1f3d548b33` | Girls U47kg |
| 13 | `041f4873-5447-4503-8273-78042945e520` | Girls U52kg |
| 14 | `7ebb3ca9-68fe-4876-88d5-b89daeeddb53` | Girls Over 52kg |

### Volleyball — `nspg26-volleyball`

| Sort | Category id | Name | Entrant type | Format |
| ---: | --- | --- | --- | --- |
| 1 | `f7a6764e-0059-4064-b1ef-8833569b63fa` | Men | unsupported: district roster | unknown |
| 2 | `aa648689-c669-497f-8372-7aac47f5cd8a` | Women | unsupported: district roster | unknown |

### Wrestling — `nspg26-wrestling`

Every category is `singles` / `knockout` (proposed).

| Sort | Category id | Name |
| ---: | --- | --- |
| 1 | `702d7001-2baf-460d-ab5d-aef0637a34af` | Freestyle Men - 57kg |
| 2 | `971027f0-96a6-4ce4-b6a6-881b62139534` | Freestyle Men - 65kg |
| 3 | `f7d0367f-f553-4cae-b100-ea374530c116` | Freestyle Men - 74kg |
| 4 | `c4c5015e-6f92-4c4e-ba6f-cc0bfab49c24` | Freestyle Men - 86kg |
| 5 | `8cefde45-c4f2-403e-bd8a-a9302eae55b9` | Freestyle Men - 97kg |
| 6 | `98b9458b-614f-4d86-bb6f-5774958743ac` | Freestyle Men - 125kg |
| 7 | `08857253-4efa-4bf8-940c-881e839b9f95` | Greco-Roman Men - 55kg |
| 8 | `5b2953ed-ec3e-48c1-a3c0-9472a9c039c7` | Greco-Roman Men - 60kg |
| 9 | `a5f659b2-3869-41ef-9356-c548a44bc544` | Greco-Roman Men - 67kg |
| 10 | `dd3564df-cfa3-401f-a6ac-ae7af3558b13` | Greco-Roman Men - 77kg |
| 11 | `78a860de-5122-41c7-a055-bee7eef830d1` | Greco-Roman Men - 87kg |
| 12 | `82c654da-7db5-4a25-b69d-7f21bcc53031` | Greco-Roman Men - 97kg |
| 13 | `ebc0a9af-6eb1-4a6a-9c49-32ad837cb726` | Women Wrestling - 50kg |
| 14 | `550a4610-d4f2-4f21-bb1e-f05bae17aeef` | Women Wrestling - 53kg |
| 15 | `0085b1ee-05d6-48d5-bae9-9fe57d795845` | Women Wrestling - 57kg |
| 16 | `a12e25ae-ef5a-49ad-b509-4ea6ca09d9a5` | Women Wrestling - 62kg |
| 17 | `255e725e-cf6b-4a1c-93ac-2ea7c7b4f9d9` | Women Wrestling - 65kg |
| 18 | `0cfbfc4a-f0a4-4ec0-a68b-8d34611f2d94` | Women Wrestling - 68kg |

### Wushu — `nspg26-wushu`

Every category is Sanda, `singles` / `knockout` (proposed). There is no taolu category on this form.

| Sort | Category id | Name |
| ---: | --- | --- |
| 1 | `2f4583c9-58ef-4c4a-b0a7-40be10adf8ef` | Sanda Men 48kg |
| 2 | `35edbded-4054-4855-998b-d7cd4af90c21` | Sanda Men 52kg |
| 3 | `f56ec542-7724-41be-ac52-cf2a0e98cb9c` | Sanda Men 56kg |
| 4 | `60391d61-72ff-4d17-8bc1-8ffea4ca7048` | Sanda Men 60kg |
| 5 | `3941d7ab-049c-4c4a-815c-de4df6c71f94` | Sanda Men 65kg |
| 6 | `15e79057-f571-4986-8885-ae963ccf2b66` | Sanda Men 70kg |
| 7 | `504d1994-2503-4f0b-a50c-40d3c017a3a8` | Sanda Men 75kg |
| 8 | `c835407a-75de-4a55-91d3-71b964d339bc` | Sanda Men 80kg |
| 9 | `265d1f48-2418-4e71-8fc8-171be5ddb692` | Sanda Men 85kg |
| 10 | `8d673710-4342-4f2e-bca4-08f737802075` | Sanda Women 45kg |
| 11 | `28cead2d-13ba-4cd3-a8d8-8bdbd75c35fc` | Sanda Women 48kg |
| 12 | `5e911e87-b31f-433a-865d-231c4e254d8f` | Sanda Women 52kg |
| 13 | `e08d9709-fe8e-4c7d-877c-b96226c1223b` | Sanda Women 56kg |
| 14 | `e04e75a9-dcf6-48f5-8b30-73c85c6d13e5` | Sanda Women 60kg |
| 15 | `037ef510-7d58-471d-89d9-9087f56918be` | Sanda Women 65kg |
| 16 | `b8e2bc4b-c312-4635-be0b-ecf36110623f` | Sanda Women 70kg |
| 17 | `091f4ac9-16ed-44c5-8cee-0210f33f2499` | Sanda Women 75kg |

## 3. Form fields and answer keys

`reg_forms.fields` is a JSON array of `{ key, type, label, required, options? }`. Confirmed submissions store `answers` as an object whose keys match those field keys. No confirmed submission on these 14 forms has an extra answer key. Keys were counted. Values were not read.

`district` is a required select on every competition form. Options are Kohima, Dimapur, Mokokchung, Tuensang, Mon, Zunheboto, Wokha, Phek, Kiphire, Longleng, Peren, Chümoukedima, Niuland, Tseminyü, Shamator, Noklak, and Meluri.

Shared required fields, in order, on every competition form except the two extras below:

| Key | Type | Label |
| --- | --- | --- |
| `gender` | select | Gender (`Male`, `Female`) |
| `district` | select | District |
| `dob` | date | Date of birth |
| `age` | number | Age |
| `aadhaar` | short_text | Aadhaar number |
| `aadhaar_image` | file | Aadhaar card image (address proof) |
| `photo` | file | Passport photo |
| `accommodation` | yesno | Do you need accommodation? |

Extras, both required:

| Form | Key | Type | Label |
| --- | --- | --- | --- |
| `nspg26-athletics` | `father_name` | short_text | Father's name |
| `nspg26-athletics` | `afi_uid` | short_text | AFI UID Number |
| `nspg26-badminton` | `bai_id` | short_text | BAI / NBA ID Number |

There is no `team_name`, `partner`, `roster`, `players`, `club`, or `seed` field. `reg_submissions.full_name` is the person. `on_behalf` exists on the submission row and was not used as a roster.

`entrants.city` only allows `kohima` or `dimapur`. Do not copy `answers.district` into that column.

## 4. How a confirmed submission becomes entrants

A confirmed row is one person. `multi_category` is true on every competition form, so one person can hold many `reg_submission_categories` rows. Each category link is a separate entry intent.

Import grain for a **singles** category: one link becomes one `entrants` row in the matching tournament category.

- `display_name` comes from `reg_submissions.full_name` at import time, then lives on the entrant. Later edits to the registration row are not written back, and the import does not write the registration row.
- `status` stays `pending` until an owner or co-organizer approves it. Public reads only show `approved`.
- `players` is a one-element list with that display name. Do not copy Aadhaar, date of birth, photo storage paths, or accommodation into `players` or `entrant_contacts` in the first import.
- One person in two singles categories becomes two entrants. That is correct for two events and incorrect for two weight classes. See the conflicts below.

Import grain for an **unsupported** category: do not create an entrant. Record the link as blocked in the dry run.

Multi-category snapshot (confirmed submissions):

| Form | 1 category | 2 | 3 | 4 | 6 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Archery | 5 | 14 | 4 | 19 | 0 |
| Athletics | 6 | 11 | 5 | 4 | 0 |
| Badminton | 3 | 4 | 5 | 0 | 0 |
| Basketball | 74 | 0 | 0 | 0 | 0 |
| Boxing | 34 | 1 | 0 | 0 | 0 |
| Football | 21 | 0 | 0 | 0 | 0 |
| Lawn tennis | 0 | 1 | 8 | 1 | 0 |
| Pencak Silat | 0 | 1 | 0 | 0 | 0 |
| Sepaktakraw | 2 | 6 | 29 | 0 | 2 |
| Table tennis | 0 | 1 | 8 | 0 | 0 |
| Taekwondo | 29 | 0 | 0 | 0 | 0 |
| Volleyball | 0 | 1 | 0 | 0 | 0 |
| Wrestling | 1 | 0 | 0 | 0 | 0 |
| Wushu | 52 | 7 | 0 | 0 | 0 |

People who tick singles plus doubles plus team are one person in three categories, not three teams. Lawn tennis and table tennis have nobody in exactly one category: every confirmed person also ticked a pair or team category. The singles link is still importable. The doubles or team link is not.

Weight-class and shape conflicts, counted without identifying anyone:

- Boxing: 1 confirmed submission linked to 2 weight classes (2 links blocked)
- Wushu: 7 confirmed submissions linked to 2 Sanda weight classes (14 links blocked)
- Volleyball: 1 confirmed submission linked to both Men and Women (both links are team rosters, not a weight conflict)
- Pencak Silat: 1 confirmed submission linked to Men Tanding Class A and Men Artistic Regu. The tanding link stays importable. The regu link does not, and it does not cancel the tanding link.

Only the weight-class links on those boxing and wushu submissions wait for an organizer to pick one class. A doubles, team, or artistic tick on the same submission does not cancel a valid singles or single-weight link.

## 4.1 Link-level importability audit

Read-only classification of every confirmed category link on 11 October 2026. Each of the 606 links is in exactly one class. No names, contact details, identity documents, or answer values were read.

Rules applied:

1. Badminton, lawn tennis, and table tennis singles stay `auto_importable_singles` even when that submission also ticked doubles or team.
2. Categories whose names contain "Doubles" stay `unlinked_pair`. Sepaktakraw "Double" is a squad type, so it is `district_roster`, not a pair.
3. Team, relay, sepaktakraw, football, basketball, and volleyball links stay `district_roster`.
4. Boxing, taekwondo, wrestling, Wushu Sanda, and Pencak Tanding are `auto_importable_singles` only when that submission has one weight-class link in that discipline.
5. An artistic, doubles, or team tick does not change the class of a valid singles or single-weight link.
6. Two or more weight classes in one discipline make every one of those weight-class links `multi_weight_conflict`.
7. Individual archery categories whose names contain "Olympic Round" are `pending_qualification`. Team Olympic Round is `district_roster`.
8. Athletics except relays, archery categories that are not Olympic Round and not team, and Pencak Silat tunggal or solo creative are `ranked_result`. Ganda and regu are `artistic_ensemble`.

| Class | Links | What it means |
| --- | ---: | --- |
| `auto_importable_singles` | 144 | Create one pending singles entrant per link now |
| `pending_qualification` | 23 | Valid individual entry; no bracket place until qualification is confirmed |
| `ranked_result` | 85 | Valid individual entry; result list, not a two-entrant match |
| `unlinked_pair` | 30 | Doubles or mixed doubles with no partner collected |
| `district_roster` | 307 | Team or squad tick with no team entity collected |
| `artistic_ensemble` | 1 | Pencak Silat regu; not a singles performance and not a pair record |
| `multi_weight_conflict` | 16 | Two weight classes in one discipline; hold for review |
| `other_unresolved` | 0 | No link failed the rules above |
| **Total** | **606** | |

The three operational groups:

| Group | Classes | Links |
| --- | --- | ---: |
| Immediately importable singles entrants | `auto_importable_singles` | 144 |
| Valid registrations that need a result or qualification before bracket entry | `pending_qualification`, `ranked_result` | 108 |
| Links that need a team, a pair, or a conflict decision | `district_roster`, `unlinked_pair`, `artistic_ensemble`, `multi_weight_conflict` | 354 |
| **Total** |  | **606** |

`auto_importable_singles` is 144 links and 144 distinct submissions, so the first import would create 144 entrants, not 144 people counted twice. That replaces the earlier 116 figure. The extra 28 links are 27 racket singles (badminton 8, lawn tennis 10, table tennis 9) whose submissions also ticked doubles or team, plus 1 Pencak Tanding link that shares its submission with an artistic regu. Those companion links stay in `unlinked_pair`, `district_roster`, or `artistic_ensemble`.

`multi_weight_conflict` is 16 links on 8 submissions (boxing 1 submission / 2 links, wushu 7 submissions / 14 links). `pending_qualification` is 23 links on 23 submissions. `ranked_result` is 85 links on 68 submissions, because one athlete can enter several events. Distinct submissions overlap across classes, so those submission counts must not be added.

Per sport:

| Sport | Auto singles | Pending qualification | Ranked result | Unlinked pair | District roster | Artistic ensemble | Multi-weight | Other | Links |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Archery | 0 | 23 | 42 | 0 | 56 | 0 | 0 | 0 | 121 |
| Athletics | 0 | 0 | 43 | 0 | 16 | 0 | 0 | 0 | 59 |
| Badminton | 8 | 0 | 0 | 8 | 10 | 0 | 0 | 0 | 26 |
| Basketball | 0 | 0 | 0 | 0 | 74 | 0 | 0 | 0 | 74 |
| Boxing | 34 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 36 |
| Football | 0 | 0 | 0 | 0 | 21 | 0 | 0 | 0 | 21 |
| Lawn tennis | 10 | 0 | 0 | 13 | 7 | 0 | 0 | 0 | 30 |
| Pencak Silat | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 2 |
| Sepaktakraw | 0 | 0 | 0 | 0 | 113 | 0 | 0 | 0 | 113 |
| Table tennis | 9 | 0 | 0 | 9 | 8 | 0 | 0 | 0 | 26 |
| Taekwondo | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |
| Volleyball | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 2 |
| Wrestling | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| Wushu | 52 | 0 | 0 | 0 | 0 | 0 | 14 | 0 | 66 |
| **Total** | **144** | **23** | **85** | **30** | **307** | **1** | **16** | **0** | **606** |

No confirmed tunggal or solo-creative link exists in this snapshot, so individual artistic performance does not add to `ranked_result` yet. The only artistic link is Men Artistic Regu. Archery team links, including Team Olympic Round, are in the 56 roster links, not in the 23 qualification links. Athletics relays are the 16 roster links; the other 43 athletics links are ranked results.

## 5. Categories that do not fit a two-entrant match

`matches` has `entrant_a` and `entrant_b` only. These categories cannot be drawn as matches with the current model.

**Athletics heats and field events.** All 33 categories. A race or a field event has many athletes and a ranked result. Relays also lack a squad: Men 4x100 has 6 people across 2 districts (largest district 4); Men 4x400 has 4 people in 1 district; Women 4x100 has 3 people across 2 districts (largest 2, short of 4); 4x400 mixed has 3 people in 1 district.

**Archery qualification and ranking.** The six categories whose names do not say Olympic Round are ranking rounds. Team Olympic Round and mixed team are squads: Men Indian team has 17 people across 4 districts (largest 5); Women Indian team has 16 across 5 (largest 4); Indian mixed team has 19 across 3 (largest 8). Recurve mixed and compound mixed each have 2 people in 2 districts, so a district group is not a pair.

**Pencak Silat artistic events.** Tunggal and solo creative are judged performances. Ganda is a pair and regu is a group. The only confirmed artistic link is one person on Men Artistic Regu, which cannot be a regu.

**Team categories whose registration is ambiguous.** Aggregates only:

| Category | Confirmed people | Districts | Largest district |
| --- | ---: | ---: | ---: |
| Football Men | 21 | 2 | 20 |
| Basketball Senior Men | 44 | 5 | 12 |
| Basketball Senior Women | 30 | 4 | 12 |
| Volleyball Men | 1 | 1 | 1 |
| Volleyball Women | 1 | 1 | 1 |
| Badminton Men's Doubles | 6 | 3 | 2 |
| Badminton Men's Team | 6 | 2 | 4 |
| Badminton Women's Doubles | 2 | 1 | 2 |
| Badminton Women's Team | 4 | 1 | 4 |
| Lawn tennis Men's Doubles | 10 | 4 | 3 |
| Lawn tennis Men's Team | 7 | 3 | 3 |
| Lawn tennis Mixed Doubles | 3 | 2 | 2 |
| Table tennis Men's Doubles | 9 | 3 | 5 |
| Table tennis Men's Team | 8 | 3 | 5 |
| Sepaktakraw Men Regu | 26 | 4 | 11 |
| Sepaktakraw Men Double | 20 | 4 | 6 |
| Sepaktakraw Men Quad | 28 | 4 | 12 |
| Sepaktakraw Women Regu / Double / Quad | 13 each | 4 each | 6 each |

Football's largest district is 20, equal to `per_district_limit`. That is a full district entry list, not 21 separate teams. Doubles categories are not even counts of pairs: table tennis men's doubles has a district of 5, and lawn tennis men's doubles has a district of 3. Sepaktakraw women have the same 13 people on regu, double, and quad, which means the same people ticked every squad type. Two sepaktakraw submissions ticked all 6 categories.

Badminton mixed doubles, table tennis women's events, and table tennis mixed doubles have zero confirmed links. They still cannot be paired later without a partner field.

## 6. Idempotent registration-to-entrant linkage

Do not add a column to `reg_submissions` or `reg_submission_categories`. Do not update those rows. Linkage is a new table that points at them.

Proposed table, development branch only: `nspg_import_links`.

| Column | Role |
| --- | --- |
| `id` | uuid primary key |
| `submission_id` | FK to `reg_submissions.id` |
| `reg_category_id` | FK to `reg_form_categories.id` |
| `tournament_id` | FK to `tournaments.id` |
| `tournament_category_id` | FK to `tournament_categories.id` |
| `entrant_id` | FK to `entrants.id`, null while the row is only a plan |
| `grain` | `person_category` or `district_team` |
| `import_class` | one of the eight classes in section 4.1 |
| `block_reason` | null only for `auto_importable_singles`; otherwise the same class name |
| `created_at` | timestamp |

Uniqueness: `(submission_id, reg_category_id)`. A second import hits that unique key and inserts nothing. Withdrawn submissions are not selected, so they never get a link. A later confirmation is a new insert, not an update of a registration row.

`entrant_id` stays null for blocked rows. For a future district team, many link rows may share one `entrant_id`. That shared id is not created until organizers name the team and its members. The unique key still stops the same person-category from being attached twice.

Dry run is a read. It inserts nothing. It classifies every confirmed category link with the same rules as section 4.1 and checks that the eight counts still add up to the confirmed-link total. Only `auto_importable_singles` is eligible for an entrant. `pending_qualification` and `ranked_result` stay valid registrations and do not become bracket entrants until a result or a qualification decision exists. Pair, roster, ensemble, and multi-weight links stay unresolved.

Only after that report is accepted does a later job insert entrants for `auto_importable_singles`, then set `entrant_id`. The job uses `INSERT ... ON CONFLICT (submission_id, reg_category_id) DO NOTHING`. It does not `UPDATE` or `DELETE` registration tables.

Entrant insert, when it is eventually allowed, goes through the service role or an owner session because public insert requires `entrants.status = pending` and tournament status `registration_open`. These NSPG tournaments stay `draft`, so the public registration policy will not accept the import. The import must be an explicit staff or service write, still without touching registration rows.

## 7. Sport constraint expansion

Current check `tournaments_sport_check`:

`futsal`, `football`, `pickleball`, `basketball`, `badminton`, `darts`.

Eleven NSPG sports are absent: `archery`, `athletics`, `boxing`, `lawn_tennis`, `pencak_silat`, `sepaktakraw`, `table_tennis`, `taekwondo`, `volleyball`, `wrestling`, `wushu`.

Replacing this check is an exception to the additive-only rule. Postgres cannot append a value to an existing `CHECK` list in place. The change drops the constraint and adds a new one. That requires separate approval. Do not apply it to production from this document.

Also blocked, and also a non-additive check replacement if organizers want those values stored:

- `tournament_categories_format_check` has no `heat/final` or ranked-results value
- `tournament_categories_entrant_type_check` has no value for an unlinked pair, a district roster, or an artistic ensemble

Until those are approved, the first branch can only store categories whose entrant type is `singles`, `doubles`, or `team` and whose format is `knockout`, `league`, or `groups_knockout`. This plan does not recommend inserting the unsupported categories under a fake `team` or `singles` type.

### Development-branch proposal only

Not for production. Not applied here.

```sql
-- DEVELOPMENT BRANCH ONLY. Do not run against Fleg-web production.
-- Replacing tournaments_sport_check is a non-additive exception and needs approval.

ALTER TABLE public.tournaments DROP CONSTRAINT tournaments_sport_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_sport_check
  CHECK (sport = ANY (ARRAY[
    'futsal', 'football', 'pickleball', 'basketball', 'badminton', 'darts',
    'archery', 'athletics', 'boxing', 'lawn_tennis', 'pencak_silat',
    'sepaktakraw', 'table_tennis', 'taekwondo', 'volleyball', 'wrestling', 'wushu'
  ]::text[]));

CREATE TABLE public.nspg_import_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.reg_submissions(id),
  reg_category_id uuid NOT NULL REFERENCES public.reg_form_categories(id),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id),
  tournament_category_id uuid NOT NULL REFERENCES public.tournament_categories(id),
  entrant_id uuid REFERENCES public.entrants(id),
  grain text NOT NULL CHECK (grain = ANY (ARRAY['person_category', 'district_team']::text[])),
  import_class text NOT NULL CHECK (import_class = ANY (ARRAY[
    'auto_importable_singles', 'pending_qualification', 'unlinked_pair',
    'district_roster', 'ranked_result', 'artistic_ensemble',
    'multi_weight_conflict', 'other_unresolved'
  ]::text[])),
  block_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, reg_category_id)
);

ALTER TABLE public.nspg_import_links ENABLE ROW LEVEL SECURITY;
-- Policies are a follow-up. Default deny until an owner-only policy is reviewed.
```

## 8. Enums, validators, presets, and generated types

These must change in the same release as the sport check. Otherwise a legal database sport still cannot be created, or an unknown sport falls through to football or futsal controls.

### Web (`Fleg-score`)

| Location | What it allows today |
| --- | --- |
| `src/lib/sports/presets.ts` `SportId` | `futsal`, `pickleball`, `basketball`, `badminton`, `darts`. `getSportPreset` maps `football` to the futsal preset and returns null for every other NSPG slug |
| `src/lib/sports/sports-config.ts` `TournamentSport` | adds `football` to that set. `normalizeSportId` sends every other string, including `archery`, to `football_futsal` |
| `src/lib/tournaments/schema.ts` | `z.enum` of the five preset ids, twice. `TIMED_SPORTS` is `futsal` and `basketball` |
| `src/lib/onboarding/schema.ts` | profile sports enum is only `futsal` and `pickleball`. `LAUNCH_SPORTS` uses `tennis`, not `lawn_tennis`, and lists `volleyball` as disabled |
| `src/modules/competition/types.ts` `CompetitionSport` | `football`, `futsal`, `pickleball` |
| `src/modules/competition/constants.ts` `COMPETITION_SPORTS` | the same three |
| `src/lib/scoring/index.ts` | any sport other than pickleball, badminton, basketball, or darts uses the futsal engine |
| `src/lib/database.types.ts` | `tournaments.sport` is `string`. Regenerate after the check change so the file matches the branch; the generated type will still be `string` unless a Postgres enum is introduced |

`src/lib/event-config.ts` has a separate marketing `sportId` (`futsal`, `football`, `pickleball`, `running`, `darts`). That is not `tournaments.sport`. Do not treat it as the constraint list.

### Mobile (`fleg-score-app`)

| Location | What it allows today |
| --- | --- |
| `lib/sports/presets.ts` `SportId` | same five as the web presets. `football` maps to futsal. Other NSPG slugs return null, so `createTournament` throws "Unknown sport." |
| `lib/queries.ts` `CreateTournamentInput.sport` | `SportId` |
| `app/tournament/new.tsx` | wizard bound to `SportId` |
| `app/signup.tsx` and `app/onboarding.tsx` `SPORTS` | `football`, `pickleball`, `basketball`, `badminton`, `darts` |
| `lib/home-feed.ts` `SPORT_META` | those five plus `football`. Unknown sports already fall back to a trophy label |
| `lib/scoring/index.ts` | same futsal default as the web engine |
| `lib/scoring/format.ts` | non-badminton racket sports use the pickleball format fallback |
| `lib/sports/nspg.ts` | the 14 slugs exist. Only football, basketball, and badminton resolve to a live engine. `resolveMatchEngine` returns null for the others and does not use futsal |
| `lib/database.types.ts` | `tournaments.sport` is `string`. Same regeneration note as the web file |

`app/match/[id].tsx` already shows "Structured result entry not available yet" when `resolveMatchEngine` is null. That screen does not need a new sport id to avoid futsal controls. It still cannot create the draft tournaments.

`lib/form-builder.ts` writes `reg_forms.sport`, which has no check constraint. It is not part of `tournaments_sport_check`.

## 9. Proposed `sport_config` defaults

No NSPG sport has a stored config. Values below are the shape to store on the draft. Anything not confirmed by a stored rule is the string `TBD`, not a copied futsal or badminton preset.

Football may later use the futsal/football engine, basketball the basketball engine, and badminton the badminton engine. That does not justify copying period length, best-of, or table points from other tournaments.

```json
{
  "archery": { "ends": "TBD", "arrows_per_end": "TBD", "ranking": "TBD", "olympic_round": "TBD" },
  "athletics": { "timing": "TBD", "wind": "TBD", "heats": "TBD", "field_attempts": "TBD" },
  "badminton": { "best_of": "TBD", "points_to": "TBD", "win_by": "TBD", "cap": "TBD", "scoring": "TBD", "team_tie": "TBD" },
  "basketball": { "periods": "TBD", "period_minutes": "TBD", "overtime_minutes": "TBD", "clock": "TBD" },
  "boxing": { "rounds": "TBD", "round_length": "TBD", "bout_format": "TBD" },
  "football": { "periods": "TBD", "period_minutes": "TBD", "cards": "TBD", "tiebreak": "TBD", "table_points": "TBD" },
  "lawn_tennis": { "best_of": "TBD", "sets": "TBD", "tiebreak": "TBD", "scoring": "TBD" },
  "pencak_silat": { "tanding_rounds": "TBD", "artistic_judging": "TBD" },
  "sepaktakraw": { "sets": "TBD", "points_to": "TBD", "regu_size": "TBD", "double_size": "TBD", "quad_size": "TBD" },
  "table_tennis": { "best_of": "TBD", "points_to": "TBD", "win_by": "TBD", "team_tie": "TBD" },
  "taekwondo": { "rounds": "TBD", "round_length": "TBD", "point_values": "TBD" },
  "volleyball": { "sets": "TBD", "points_to": "TBD", "deciding_set": "TBD" },
  "wrestling": { "periods": "TBD", "period_length": "TBD", "style_split": "TBD" },
  "wushu": { "sanda_rounds": "TBD", "round_length": "TBD" }
}
```

`football.points.goal` is not set here. The engine assumes a goal is worth 1 only after a config is confirmed.

## 10. Decisions, order, checks, rollback, counts

### Unresolved decisions required from NSPG organizers

1. Who owns the 14 draft tournaments (`organizer_id` of an approved organizer profile).
2. Competition dates and venues. Forms have city and state only.
3. Whether a district is the team, or whether some other squad list will be supplied outside the form.
4. Pairing rule for every doubles and mixed category. The form cannot pair people.
5. Squad size and whether one person may sit on regu, double, and quad at once. Sepaktakraw women currently tick all three.
6. What to do with one person in two weight classes (1 boxing submission, 7 wushu submissions).
7. What to do with the one volleyball submission ticked as both Men and Women.
8. Whether Pencak Silat artistic events are scored in this app at all.
9. Whether athletics and archery qualification are results lists rather than matches.
10. Bracket shape for singles combat and racket singles: knockout is only a proposal.
11. Football, basketball, and badminton match rules (periods, points, best-of, ties). All are `TBD`.
12. Whether registration stays open on the forms after a tournament import. The import must not close or edit the forms.
13. Approval to replace `tournaments_sport_check`, and separately to replace the category format and entrant-type checks if unsupported shapes are stored.
14. Whether identity documents are ever copied onto entrants. This plan says no.

### Safe migration order

1. Approve the sport-check replacement as a named exception to additive-only changes.
2. Apply that replacement on a development branch only. Do not seed entrants.
3. Update the web and mobile enums in section 8, and stop `normalizeSportId` / `computeMatchState` from treating unknown sports as football or futsal, before any NSPG draft is opened in those apps.
4. Insert the 14 private drafts and only the category rows whose entrant type and format already pass the existing category checks. Leave every unsupported category out.
5. Run the dry-run queries. Share counts. Insert nothing.
6. After organizer answers, add `nspg_import_links` and insert link rows for `auto_importable_singles` only, with `entrant_id` still null, using `ON CONFLICT DO NOTHING`. Do not insert `pending_qualification` or `ranked_result` as bracket entrants.
7. Insert `entrants` for those links and set `entrant_id`. Leave status `pending`.
8. Do not generate stages or matches until format decisions exist.
9. Roster and artistic categories stay unimported.

### Verification queries

Read-only. They do not write.

```sql
-- No NSPG tournament yet.
SELECT slug, sport, status FROM tournaments
WHERE slug ILIKE 'nspg26-%' OR sport IN (
  'archery','athletics','boxing','lawn_tennis','pencak_silat','sepaktakraw',
  'table_tennis','taekwondo','volleyball','wrestling','wushu'
);

-- Confirmed people vs category links. Expect links >= people.
SELECT f.slug,
       count(DISTINCT s.id) FILTER (WHERE s.status = 'confirmed') AS confirmed_people,
       count(sc.category_id) FILTER (WHERE s.status = 'confirmed') AS confirmed_links
FROM reg_forms f
LEFT JOIN reg_submissions s ON s.form_id = f.id
LEFT JOIN reg_submission_categories sc ON sc.submission_id = s.id
WHERE f.slug ILIKE 'nspg26-%' AND f.sport <> 'officials'
GROUP BY f.slug
ORDER BY f.slug;

-- Dry run: classify every confirmed category link. Inserts nothing.
-- Expect the eight counts to sum to the confirmed-link total (606 on 11 Oct 2026).
WITH links AS (
  SELECT s.id AS submission_id, f.sport, c.name AS category_name
  FROM reg_submissions s
  JOIN reg_forms f ON f.id = s.form_id
  JOIN reg_submission_categories sc ON sc.submission_id = s.id
  JOIN reg_form_categories c ON c.id = sc.category_id
  WHERE s.status = 'confirmed'
    AND f.slug ILIKE 'nspg26-%'
    AND f.sport <> 'officials'
), weights AS (
  SELECT submission_id, sport, count(*)::int AS weight_n
  FROM links
  WHERE sport IN ('boxing','taekwondo','wrestling','wushu')
     OR (sport = 'pencak_silat' AND category_name ILIKE '%Tanding%')
  GROUP BY submission_id, sport
), classified AS (
  SELECT
    CASE
      WHEN (l.sport IN ('boxing','taekwondo','wrestling','wushu')
            OR (l.sport = 'pencak_silat' AND l.category_name ILIKE '%Tanding%'))
           AND COALESCE(w.weight_n, 0) > 1 THEN 'multi_weight_conflict'
      WHEN (l.sport IN ('boxing','taekwondo','wrestling','wushu')
            OR (l.sport = 'pencak_silat' AND l.category_name ILIKE '%Tanding%'))
           AND COALESCE(w.weight_n, 0) = 1 THEN 'auto_importable_singles'
      WHEN l.sport IN ('badminton','lawn_tennis','table_tennis')
           AND l.category_name ILIKE '%Singles%' THEN 'auto_importable_singles'
      WHEN l.sport IN ('badminton','lawn_tennis','table_tennis')
           AND l.category_name ILIKE '%Doubles%' THEN 'unlinked_pair'
      WHEN l.sport = 'archery' AND l.category_name ILIKE '%Team%' THEN 'district_roster'
      WHEN l.sport = 'archery' AND l.category_name ILIKE '%Olympic Round%' THEN 'pending_qualification'
      WHEN l.sport = 'archery' THEN 'ranked_result'
      WHEN l.sport = 'athletics' AND l.category_name ILIKE '%Relay%' THEN 'district_roster'
      WHEN l.sport = 'athletics' THEN 'ranked_result'
      WHEN l.sport = 'pencak_silat'
           AND (l.category_name ILIKE '%Tunggal%' OR l.category_name ILIKE '%Solo Creative%')
           THEN 'ranked_result'
      WHEN l.sport = 'pencak_silat'
           AND (l.category_name ILIKE '%Ganda%' OR l.category_name ILIKE '%Regu%')
           THEN 'artistic_ensemble'
      WHEN l.sport IN ('football','basketball','volleyball','sepaktakraw') THEN 'district_roster'
      WHEN l.category_name ILIKE '%Team%' THEN 'district_roster'
      ELSE 'other_unresolved'
    END AS import_class
  FROM links l
  LEFT JOIN weights w
    ON w.submission_id = l.submission_id AND w.sport = l.sport
)
SELECT import_class, count(*) AS links
FROM classified
GROUP BY import_class
ORDER BY import_class;

-- Duplicate protection once the link table exists on a branch.
-- SELECT submission_id, reg_category_id, count(*)
-- FROM nspg_import_links
-- GROUP BY 1, 2
-- HAVING count(*) > 1;
```

After a branch insert, also confirm `reg_submissions.updated_at` did not move for NSPG rows, and that `nspg_import_links` contains no second row for the same submission and category.

### Rollback

On the development branch:

1. Delete imported `entrants` whose ids are stored on `nspg_import_links`, then drop `nspg_import_links`. Registration rows stay as they are.
2. Delete the NSPG draft tournaments (categories and any accidental matches cascade with the tournament if foreign keys are `ON DELETE CASCADE`; confirm the live FK action before relying on it). Do not delete `reg_forms` or submissions.
3. Restore the old sport check only after every row using a new sport value is gone. Putting the old check back while those rows exist will fail, which is the desired stop.

```sql
-- DEVELOPMENT BRANCH ROLLBACK of the check. Run only after new-sport rows are gone.
ALTER TABLE public.tournaments DROP CONSTRAINT tournaments_sport_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_sport_check
  CHECK (sport = ANY (ARRAY[
    'futsal','football','pickleball','basketball','badminton','darts'
  ]::text[]));
```

Do not roll back by editing registration status, payment status, or category links.

### Expected row counts

Snapshot on 11 October 2026, before any import. Registration is still open, so the confirmed numbers will change.

| Item | Count |
| --- | ---: |
| Draft tournaments to create | 14 |
| Registration categories / proposed tournament categories | 174 |
| Stages and matches in this plan | 0 |
| Confirmed competition submissions | 359 |
| Withdrawn competition submissions | 6 |
| Confirmed category links | 606 |
| Immediately importable singles entrants (`auto_importable_singles`) | 144 |
| Valid links waiting on qualification (`pending_qualification`) | 23 |
| Valid links that are ranked results, not matches (`ranked_result`) | 85 |
| Links needing a team, pair, ensemble, or weight decision | 354 |
| `other_unresolved` | 0 |

Per sport, confirmed people and confirmed category links:

| Sport | People | Links |
| --- | ---: | ---: |
| Archery | 42 | 121 |
| Athletics | 26 | 59 |
| Badminton | 12 | 26 |
| Basketball | 74 | 74 |
| Boxing | 35 | 36 |
| Football | 21 | 21 |
| Lawn tennis | 10 | 30 |
| Pencak Silat | 1 | 2 |
| Sepaktakraw | 39 | 113 |
| Table tennis | 9 | 26 |
| Taekwondo | 29 | 29 |
| Volleyball | 1 | 2 |
| Wrestling | 1 | 1 |
| Wushu | 59 | 66 |
| **Total** | **359** | **606** |

Withdrawn rows: archery 1, athletics 1, boxing 1, football 1, sepaktakraw 1, wushu 1. They are not imported.

The 144 figure is the only automatic entrant count this plan will defend. It is one entrant per `auto_importable_singles` link. The next 108 links are real entries that need a qualification outcome or a ranked result before any bracket. The remaining 354 links need a roster, a partner, an ensemble, or a weight-class decision. Creating 606 entrants would treat every team tick as a separate one-person team. Do not do that.

## 11. Dry run on 12 October 2026

Inspected at `2026-10-12T09:46:40.398367+00:00` with SELECT only. Nothing was inserted, updated, deleted, or deployed on `zcubdqfzdbwtfcdsntoa`. `nspg_import_links` is still absent. No tournament slug starts with `nspg26-`. The 16 existing tournaments and 263 existing entrants were read and not modified.

Registration was still open, and the totals moved during the day. An earlier read on 12 October saw 445 confirmed competition submissions and 788 confirmed links. The export below is the later one. Re-export immediately before any future import. Do not treat either number as a fixed quota.

The classifier read a local snapshot of forms, categories, submission status, category links, tournaments, and entrant identifiers. The snapshot and the import manifest are in gitignored `.nspg-dry-run/`. They are not copied here. The manifest holds the idempotency pairs and no contact fields, answers, or documents.

| Item | 11 Oct | 12 Oct 09:46 UTC | Change |
| --- | ---: | ---: | ---: |
| Confirmed competition submissions | 359 | 446 | +87 |
| Confirmed competition links | 606 | 791 | +185 |
| Withdrawn competition submissions | 6 | 6 | 0 |
| Competition forms | 14 | 14 | 0 |
| Competition categories | 174 | 174 | 0 |
| Officials forms with an `nspg26-` slug | — | 8 | — |
| Officials links excluded | — | 92 | — |
| NSPG tournaments | 0 | 0 | 0 |
| Existing entrant rows | — | 263 | do not touch |

The 92 excluded officials links are 89 confirmed plus 3 withdrawn. Withdrawn competition submissions are still archery, athletics, boxing, football, sepaktakraw, and wushu, one each. Those six submissions have 13 category links. The dry run surfaces all 13 as `withdrawn` review rows. It does not delete them.

Every confirmed competition link was classified once. Class total 791. Unknown categories: none. Duplicate pairs: none. Cross-form links: none. Proposed slug collisions: none. Dry-run checks passed. Production apply remains blocked.

| Class | 12 Oct | 11 Oct | Change |
| --- | ---: | ---: | ---: |
| Auto-importable singles | 158 | 144 | +14 |
| Archery qualification pending | 46 | 23 | +23 |
| Ranked-result event | 120 | 85 | +35 |
| District/team/squad roster required | 409 | 307 | +102 |
| Unlinked doubles/mixed doubles | 39 | 30 | +9 |
| Artistic ensemble | 1 | 1 | 0 |
| Multi-weight conflict | 18 | 16 | +2 |
| Other unresolved | 0 | 0 | 0 |
| **Total** | **791** | **606** | **+185** |

| Sport | People | Change | Links | Change | Auto | Qualification | Ranked | Roster | Pair | Artistic | Multi-weight |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Archery | 65 | +23 | 202 | +81 | 0 | 46 | 65 | 91 | 0 | 0 | 0 |
| Athletics | 32 | +6 | 75 | +16 | 0 | 0 | 55 | 20 | 0 | 0 | 0 |
| Badminton | 29 | +17 | 58 | +32 | 15 | 0 | 0 | 27 | 16 | 0 | 0 |
| Basketball | 85 | +11 | 85 | +11 | 0 | 0 | 0 | 85 | 0 | 0 | 0 |
| Boxing | 35 | 0 | 36 | 0 | 34 | 0 | 0 | 0 | 0 | 0 | 2 |
| Football | 21 | 0 | 21 | 0 | 0 | 0 | 0 | 21 | 0 | 0 | 0 |
| Lawn tennis | 10 | 0 | 30 | 0 | 10 | 0 | 0 | 7 | 13 | 0 | 0 |
| Pencak Silat | 1 | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| Sepaktakraw | 50 | +11 | 136 | +23 | 0 | 0 | 0 | 136 | 0 | 0 | 0 |
| Table tennis | 10 | +1 | 29 | +3 | 10 | 0 | 0 | 9 | 10 | 0 | 0 |
| Taekwondo | 32 | +3 | 32 | +3 | 32 | 0 | 0 | 0 | 0 | 0 | 0 |
| Volleyball | 12 | +11 | 13 | +11 | 0 | 0 | 0 | 13 | 0 | 0 | 0 |
| Wrestling | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Wushu | 63 | +4 | 71 | +5 | 55 | 0 | 0 | 0 | 0 | 0 | 16 |

Category counts are in `docs/nspg-provisioning/DRY-RUN-REPORT.md`. One hundred sixteen category names have at least one confirmed link. A category can appear in two classes when one submission is the only entry and another submission selected a second weight. That is expected. It is not an unknown category.

Rules that still hold on this export:

- Racket singles stay auto-importable when the same submission also selected doubles or a team. Badminton has 15 singles beside 16 doubles and 27 team links. Lawn tennis has 10 singles beside 13 doubles and 7 team links. Table tennis has 10 singles beside 10 doubles and 9 team links.
- Pencak Tanding Class A is auto-importable. Men Artistic Regu stays an artistic ensemble.
- Every Sepaktakraw “Double” link is `district_roster`. Men Double 21, Women Double 13, and neither is an individual pair.
- Nine submissions selected more than one weight class: one boxing submission (2 links) and eight wushu submissions (16 links). All 18 links are blocked.
- Officials forms are excluded. Only confirmed competition submissions are classified.

### Idempotency contract

The key is `(submission_id, reg_category_id)`.

- A category link can create at most one entrant. The link row is inserted with `ON CONFLICT (submission_id, reg_category_id) DO NOTHING`, and the entrant insert runs only when that insert returns a new link id.
- Re-running must not add a second tournament, category, entrant, or link. Tournaments are reused by the proposed `nspg26-` slug. Categories are reused by tournament and name.
- `reg_forms`, `reg_form_categories`, `reg_submissions`, and `reg_submission_categories` stay immutable. Payments, workshops, and public events stay immutable.
- A withdrawn submission, a status that is no longer `confirmed`, or a category link that disappears after a previous import is written to `nspg_import_review`. Those rows are not deleted and their entrants are not removed automatically.

Only `auto_importable_singles` may become an entrant, and the entrant label is the placeholder `Pending import`. Registration names are not copied. The local function refuses to run unless `nspg.local_import` is `on`. It is `SECURITY INVOKER`. Production does not have this function.

The candidate manifest supersedes the earlier whole-apply refusal. Blocked and withdrawn rows stay in the snapshot report and are not imported. Apply writes only the approved auto-importable manifest. A blocked or withdrawn row inside that manifest aborts the transaction.

### Local package, not applied

`docs/nspg-provisioning/` holds the unapplied package:

- `export-snapshot.sql` is the SELECT used for the snapshot. It omits names, phones, emails, answers, registration codes, and document fields.
- `migration.sql` replaces `tournaments_sport_check` while keeping `futsal`, `football`, `pickleball`, `basketball`, `badminton`, and `darts`, and adds the 11 NSPG sports. It creates `nspg_import_links` with the unique key and foreign keys, plus `nspg_import_review`. Row level security is enabled with no permissive policy.
- `importer.sql` inserts private draft tournaments and placeholder entrants for auto-importable singles only.
- `rollback.sql` removes imported entrants and `nspg26-` drafts, then restores the six-sport check. It does not touch registration.
- `verify.sql` checks for duplicate links, shared entrants, non-auto entrants, and drafts that are not private.
- `fixture.sql`, `tests.sql`, and `harness.ps1` run only against a disposable local PostgreSQL 18 cluster on `127.0.0.1:55433`.

The harness passed on that cluster: static rejection of registration, payment, workshop, public-event, and existing-entrant writes; halfway failure rolled back with no NSPG rows left; first run inserted 3 tournaments, 3 categories, 3 links, and 3 entrants; the identical rerun inserted nothing; a partial previous import filled the one missing link; a duplicate category link was rejected; withdrawn, unknown, multi-weight, Sepaktakraw Double, and officials rows created no entrants; singles beside doubles and Tanding beside Regu imported only the eligible link; the existing futsal tournament and entrant were unchanged; the importer role could not update `reg_submissions`; a sport outside the expanded check was rejected. Verification queries returned zero failures.

`npx tsc --noEmit` passed. `tests/nspg-provision.test.ts` passed, 19 tests. `safeToApplyProduction` is fixed to `false` in the classifier.

### Decisions still unresolved

All 14 decisions in section 10 remain open. The dry run changes the counts inside three of them:

- Sepaktakraw women are no longer the same count on every squad. Women Double is 13, Women Quad is 16, and Women Regu is 16.
- Multi-weight submissions are now one boxing submission and eight wushu submissions.
- Volleyball is 12 confirmed people and 13 links, so one submission is still ticked as both Men and Women.

### Production risks that still require approval

Do not apply this package because:

1. Replacing `tournaments_sport_check` drops and recreates a production constraint. The replacement keeps the six current sports, and it is still a production DDL change.
2. `organizer_id` is unknown. The local fixture uses a synthetic profile. Production must not guess a user.
3. Competition dates and venues are unset. `entrants.city` only allows `kohima`, `dimapur`, or null, so a draft must not copy Chümoukedima into that column.
4. `tournament_categories.format` and `entrant_type` still reject ranked, roster, and artistic shapes. Those 409 roster links, 39 unlinked pairs, 1 artistic link, 46 qualification links, and 120 ranked links must not be forced in as singles.
5. The 18 multi-weight links must not become entrants until an organizer picks one weight class.
6. Registration closes at `2026-10-15 18:29:00+00`. The confirmed totals changed between two reads on 12 October. An import of a stale snapshot would miss or mis-classify new rows.
7. Withdrawn and later-changed submissions must be reviewed. The importer must not delete registration rows or existing entrants to make the snapshot match.
8. `nspg_import_links` would be default-deny until a separate policy approval. The local harness policy exists only for its disposable role.
9. The 16 current tournaments and 263 current entrants, plus payments, workshops, public events, and every registration row, are out of scope for writes.
10. Entrant rows must not receive names, phone numbers, email addresses, answers, or identity documents from registration.

## 12. Safety audit on 12 October 2026

The package was audited and tightened. It was not applied to production. `docs/nspg-provisioning/SAFETY-REVIEW.md` is the approval checklist.

Apply is no longer the default. The function writes only when the mode is exactly `apply` and the project reference, snapshot hash, snapshot time, organizer, acknowledgement, schedule choice, and expected counts all match. Registration must be closed (`2026-10-15 18:29:00+00`). Unknown categories, duplicates, cross-form links, withdrawn submissions, slug collisions, and every non-auto class abort the transaction. A rerun may reuse only rows recorded in `nspg_import_objects`. The sport-check change preserves the six live sports, adds the 11 NSPG slugs, and splits the strong lock from the table scan. Rollback restores the old check only when no new-sport row would be invalidated.

There is still no remote apply command. The production project reference is refused.
