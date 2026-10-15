# NSPG26 — public registration (web `Fleg-score`), live by 3 Oct

Free, self-serve athlete registration for the Nagaland State & Para Games 2026. Runs on the **web**
(public URL). Backed by the `reg_forms` system (already in the DB). No payment.

## Data already in place (do not recreate)
- Discipline forms exist as `reg_forms` (status `draft` — flip to `open` at launch):
  `nspg26-boxing` (14 categories), `nspg26-taekwondo` (14), `nspg26-basketball` (2). More disciplines land the same way.
- Each form: `is_paid=false`, `has_categories=true`, `multi_category=true`, `require_agreement=true`,
  `code_prefix` set (BOX/TKD/BKB), `fields` jsonb = registrant_type, district (17-option dropdown), age, aadhaar.
- **Short registration ID** is auto-assigned on submit → `reg_submissions.reg_code` (e.g. `BOX-1001`).
- Categories are in `reg_form_categories` (name, sort_order). Multi-select — one athlete can pick several events.

## Auth & dashboard (login REQUIRED — Google)
Registration requires sign-in with **Google** (already configured in Supabase; free). Flow:
- Visiting `/events/[slug]` while signed out → prompt "Sign in with Google to register" (Supabase Google OAuth,
  web redirect). After sign-in, return to the form.
- On submit, the submission is linked to the user: `reg_submissions.user_id` (column + own-read RLS already added).
  Since the submit route uses the service-role admin client (where `auth.uid()` is null), the route must read the
  caller's user id from the Supabase JWT (Authorization header) and set `user_id` on the row after `reg_form_submit`.
- **"My Registrations" dashboard** `src/app/my-registrations/page.tsx`: the signed-in user reads their own
  `reg_submissions` (RLS now allows `user_id = auth.uid()`) + their categories. Show per registration: discipline,
  reg_code, selected events, district, status, a **Download slip** button, and a placeholder "ID card — available soon".
- Prevent duplicate: if the user already has a submission for this form, show it instead of a blank form (offer to view in dashboard).

## Build

### 1. Public registration page  `src/app/events/[slug]/page.tsx`
Load the form + its categories (public read is allowed on `reg_forms`/`reg_form_categories`). Render:
- **Full name** (→ submission `full_name`), **Phone** (→ `phone`).
- The `fields` jsonb in order: **Registering as** (dropdown), **District** (dropdown, 17), **Age** (number),
  **Aadhaar number** (text).  ← see Aadhaar note below.
- **Categories / events**: multi-select checkboxes from `reg_form_categories` (label = name). At least one required.
- **Consent**: required checkbox showing `agreement_label`.
- Header: discipline title, "Nagaland State & Para Games 2026", registration window (3–15 Oct),
  and the rule "No change of name after registration."

### 2. Submit (free path)
`POST /api/forms/[slug]/submit` already exists and handles **free** forms. Pass `full_name`, `phone`,
`email` (optional), the field answers as `answers`, and the selected `category_ids`.
- **The submit route must return `reg_code`** — add it to the response (it uses the admin client, so it can
  read the row back after `reg_form_submit`). The page needs it for the success screen.

### 3. Success screen (this is the moment that matters)
On success show, prominently and clearly:
- ✅ **"Thank you for registering!"**
- **"Your Registration ID: `BOX-1001`"** — large, copyable. Note: *"Keep this ID. It will be printed on your
  event ID card."* (ID cards come later — design team is on it. Do not generate the ID card here.)
- A **"Download confirmation slip"** button → screen 4.
- A line: registrations also appear in the FLEG Score app.

### 4. Downloadable confirmation slip  `src/app/api/nspg/receipt/[reg_code]/route.ts`
Generate a simple branded slip (reuse the RMLCF satori/image approach already in the repo) as PNG or PDF:
- FLEG / NOA header, "NSPG 2026 Registration Confirmation".
- **Registration ID** (big), athlete name, discipline, selected categories, district, age, date.
- **Do NOT print the Aadhaar number on the slip.**

### 5. NSPG26 landing  `src/app/nspg26/page.tsx`
Lists all open NSPG disciplines (query `reg_forms where slug like 'nspg26-%' and status='open'`) as cards →
each links to `/events/[slug]`. Show the window + a short "how it works".

## Aadhaar — handle as sensitive PII
- Store the Aadhaar number only inside `reg_submissions.answers` (that table is RLS-locked to service role — good).
- **Never** show it on the public slip, the success screen, or any public view. Mask it in admin lists
  (e.g. `XXXX XXXX 1234`). Do not log it.

## Done when
- A person can open `/events/nspg26-boxing`, fill the form, pick one or more categories, consent, submit,
  and see their `reg_code` + download a slip. Free, no payment. `tsc`/build clean.
- Flipping a form `draft`→`open` makes it appear on `/nspg26` and in the app feed automatically.

## Still pending (from Kamal / me) before all disciplines open
- Categories for **Athletics** (33 events), **Pencak Silat** (full weight bands), **Wushu** (OCR the scanned manual),
  and the 5 disciplines with no manual (**Lawn Tennis, Sepaktakraw, Table Tennis, Volleyball, Wrestling**).
