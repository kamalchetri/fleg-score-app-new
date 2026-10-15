# NSPG26 — online registration plan (live by 3 Oct)

**Event:** Nagaland State & Para Games 2026 (NSPG), Nagaland Olympic Association (NOA).
2–14 Nov 2026, Chümoukedima & Dimapur. 17 district contingents. **Registration 3–15 Oct.**
**Free** (government games — no payment). Athletes **self-register**; officials/organisers also register;
district CDMs upload official squad lists that we reconcile against athlete registrations **later**.

## Channel reality
App isn't in the stores yet → mass registration in 3 days must be on the **web** (public URL).
Because `reg_forms` is shared, registrations also appear in the app automatically. Web can retire later.

## CRITICAL PATH (Cursor, web `Fleg-score`)
1. **Public registration page** `/events/[slug]` (or `/register/[slug]`): loads a `reg_form` + its
   categories, renders custom fields, submits via the existing **free** `POST /api/forms/[slug]/submit`
   (which already blocks paid forms — fine, NSPG is free). Success = confirmation with a reference id.
   *This page does not exist yet and gates the whole launch.*
2. **NSPG26 landing** `/nspg26`: lists all disciplines as cards → each links to its registration page.
   Show the 3–15 Oct window and the "no name changes after registration" rule.
3. Later (within the window): **CDM contingent upload** (district official uploads their squad list) +
   a matching view. Not needed for day 1.

## Data model (me — DB, all free `reg_forms`, one per discipline)
Each discipline = one `reg_form` (`is_paid=false`, `status='open'`, `visibility='public'`, owner = NOA).
- **Categories** (`reg_form_categories`) = the weight/gender/age/event classes (see per-discipline below).
- **Custom fields** (`reg_forms.fields`): full name, date of birth, gender, **district (dropdown of 17)**,
  phone, email, **registrant type** (Athlete / Coach / Official / Manager), photo (file), Govt ID (file),
  club/unit (optional). Declaration agreement.
- **17 districts** (dropdown): Kohima, Dimapur, Mokokchung, Tuensang, Mon, Zunheboto, Wokha, Phek,
  Kiphire, Longleng, Peren, Chümoukedima, Niuland, Tseminyü, Shamator, Noklak, Meluri.

### Categories extracted from the manuals (ready to build)
- **Boxing** — Men (8): 46–49 Lt-Fly, ≤52 Fly, 56 Bantam, 60 Light, 64 Lt-Welter, 69 Welter, 75 Middle, 81 Lt-Heavy. Women (6): 48 Lt-Fly, 51 Fly, 54 Bantam, 57 Feather, 60 Light, 65 Lt-Welter.
- **Taekwondo** — Boys (8): U35, U40, U45, U50, U55, U60, U65, Over 65. Girls (6): U35, U39, U43, U47, U52, Over 52. (Single-elimination.)
- **Pencak Silat** — Tanding (14+ and 17+, Male/Female, weight bands U39kg→Above 110kg) + Artistic: Tunggal, Creative Solo, Ganda, Regu (14+ and 17+, M/F).
- **Basketball** — Senior Men, Senior Women (inter-district, team event; pools by entries).
- **Athletics** — 33 events (15 men + 15 women + 4×400m mixed relay + 10km cross-country). *Full event list to be pulled from the manual table at build.*

### Data still NEEDED before those forms are complete
- **Wushu** manual is a **scanned image** — needs OCR to read its categories (I'll do it at build).
- **No manuals uploaded** for the 5 added disciplines — **Lawn Tennis (M), Sepaktakraw (M/W), Table Tennis (M/W), Volleyball (M/W), Wrestling (M/W)** — I have only gender, not weight classes / events. Need their categories.
- **Medal events** "will be notified separately" per the notification — so some category lists may still change.
- **Athletics** full 33-event list (extract from manual).

## Reconciliation (phase 2, "match later")
New table `nspg_contingent_members` (district, discipline, athlete name, dob, gender, category, source='cdm-upload').
CDM officials upload their list; an admin view matches these against `reg_submissions` (by name+dob+district)
to flag registered vs missing vs unofficial entries.

## Division of labour
- **Me:** create the discipline `reg_forms` + categories + district field (DB), the contingent table, Wushu OCR.
- **Cursor:** the public registration page, the NSPG26 landing, later the CDM upload + matching view.
- **You:** categories for the 5 manual-less disciplines; confirm medal-event lists.

## Timeline
- **Day 1 (now):** approve plan → I build discipline forms for the 6 disciplines I have data for; Cursor starts the public registration page.
- **Day 2:** registration page live on staging; remaining disciplines added as categories arrive.
- **By 3 Oct:** page live, all disciplines with confirmed categories open.
