# Show workshops in the app events feed

Workshops are now part of the unified `public_events` view with `source = 'workshop'`
(alongside `tournament` and `form`). They auto-sync from the website (shared DB), so the
app only needs to *render* them and send registration to the existing web page.

## What the feed returns for a workshop row
Same `public_events` columns as other sources:
- `source='workshop'`, `title`, `sport` (this is the workshop_type, e.g. `clinic` / `pickleball-camp`),
  `description` (short description), `banner_url` = **storage path** in the `event-posters` bucket
  (NOT a URL — resolve it), `city` = venue text, `is_paid`, `fee`, `starts_at` = event date,
  `ends_at`, `slug`, `organizer_id`.

## App changes
1. **Events feed card** (`lib/events-feed.ts` / `app/events.tsx`): add a `'workshop'` branch that
   renders like the registration-event card — poster, title, date (`starts_at`), price pill
   (`fee===0 ? 'FREE' : '₹'+fee`), venue (`city`). No capacity bar needed (workshops track capacity
   in their own sessions table). CTA = **"Register on web"**.
2. **Poster URL**: resolve `banner_url` via Supabase storage:
   `supabase.storage.from('event-posters').getPublicUrl(row.banner_url).data.publicUrl`.
   Fall back to a placeholder if `banner_url` is null.
3. **Tap / Register** → open the web page (workshops keep their bespoke web registration for now):
   `Linking.openURL('https://www.fleg.in/workshops/' + slug)`.
   Do **not** route workshops into `app/event/[id].tsx` (that's the in-app `reg_forms` flow only).
4. **Segment/sport filter**: workshops should appear under **All** and the **Register** segment.
   The `sport` value is a workshop_type, so either add a "Workshops" chip or just let them show under All.

## Done when
- The 3 published workshops appear in the events feed with posters and a "Register on web" button
  that opens the fleg.in workshop page. `tsc` clean.
- Editing/archiving a workshop on fleg.in changes what the app shows on next refresh (no app change needed).
