# Scoring lab visual QA

Development-only route `/scoring-lab`. In-memory fixtures only. No Supabase match or score-event calls. Captured on a temporary API 36 emulator (`scoring_lab_api36`), then that emulator was removed.

## Viewports tested

- Phone portrait: 1080×2400 at 420 dpi (about 411×914 dp), gesture navigation.
- Tablet-like portrait: `wm size 1200x1920` and `wm density 240` (about 800×1280 dp). Overrides were reset to 1080×2400 at 420 dpi before the emulator was stopped.

## Screens inspected

- Football / futsal, including a local goal and undo
- Basketball, including quarter points, foul, and timeout after scroll
- Badminton and pickleball point pads
- Darts visit pads (180, 140, 100, 60, 26, 0) after scroll
- Combat form, combat with points (12–9), combat with method only (Stoppage)
- Table tennis game summary (`1–0`, completed `11-0`, current `2–2`)
- Table tennis with no rules (“Rules not configured”)
- Artistic pencak and athletics (“Structured result entry not available yet”)
- Long names on the football scoreboard and on the combat form
- Scheduled (“Start match”), live, and completed (“Match completed”)
- Busy (controls dimmed) and connection error (“Not recorded. Nothing was sent.”)
- Combat note field with the emulator input panel open, then the form scrolled so the note, Review, and Undo sit above the gesture bar

## Problems found

- Long names were cut off on the scoreboard (`Dimapur Western Sporting Ass…`) at three lines.
- The last controls sat on the gesture bar. Undo could collapse to a few pixels at the bottom of the scroll.
- The fixture switcher lived inside the scoring scroll, so changing a fixture jumped the chip row and hid the selected name. Darts and combat controls were pushed below the first screen.
- The period clock only moved when something else re-rendered.
- On this emulator, tapping the note field opened Gboard’s stylus handwriting panel instead of a text keyboard, and that panel covered the lower form.

## Fixes applied

- Scoreboard names wrap up to four lines, with equal columns so the score stays between them. Point-pad sublabels wrap up to three lines.
- The match screen and the lab keep 24dp of bottom padding, and the scoring scroll has 96dp of trailing space so the last control can clear the gesture bar.
- Lab tools sit above the shared scoring view. The selected fixture chip scrolls into view, and the horizontal scroller shows its indicator. The scoring view is the same `MatchScoringView` used by match control.
- The lab clock ticks once a second.

## Remaining device-only risks

- Expo Go does not apply `softwareKeyboardLayoutMode` until a native build. A physical phone with the normal text keyboard still needs a pass for note-field scroll while the keyboard is open.
- The 24dp bottom cushion is fixed. A taller gesture inset or a 3-button navigation bar can still crowd the last control.
- This route has no bottom tab bar. Match control does not either.
- The next fixture chip can still be clipped at the edge of the horizontal scroller until it is scrolled. The selected chip is brought fully on screen.
- The table-tennis numbers in the lab fixture are only there so a valid rules object can render. They are not deployed NSPG rules.

## Lawn tennis singles

Captured on `Medium_Phone_API_36.1` (`emulator-5554`, API 36) with Expo Go. The lab stayed on in-memory fixtures. Display overrides were reset to 1080×2400 at 420 dpi, then Metro and the emulator were stopped. The AVD was left in place.

### Viewports

- Phone portrait: 1080×2400 at 420 dpi, gesture navigation.
- Tablet-like portrait: `wm size 1200x1920` and `wm density 240`. Overrides were reset afterward.

### Screens inspected

- Tennis: `30 – 15`, sets 0–0, games 0–0, point pads, Undo (`phone-tennis.png`, `tablet-tennis.png`)
- Advantage: `Ad – 40` (`phone-tennis-advantage.png`)
- Tiebreak: `3 – 1` at games 6–6, labeled `Tiebreak 3–1 · Games 6–6` (`phone-tennis-tiebreak.png`)
- Deciding set: sets 1–1, completed `6–0, 0–6`, tiebreak `4–0` at games 6–6, “Deciding set” (`phone-tennis-deciding.png`, `tablet-tennis-deciding.png`)
- Completed match: sets `2 – 0`, completed `6–0, 6–0`, winner Uma, no point pads, Undo and Confirm result (`phone-tennis-done.png`)
- Invalid rules: names only, “Rules not configured”, no pads (`phone-tennis-rules.png`)
- Long names: `Kohima United Football Club Academy` and `Dimapur Western Sporting Association` at `15 – 0`, full names on the scoreboard and point pads (`phone-tennis-names.png`, `tablet-tennis-names.png`)

On the phone, the deciding-set summary is the tallest tennis screen. Undo sits fully above the gesture bar there, and on the long-name screen. The tablet viewport leaves the same controls with more room below.

### Problems found

- Resizing to the tablet viewport reloaded Expo Go onto the splash, then the developer menu. Continue dismissed the first sheet. The deep link opened the full tools sheet once; it was closed before the tennis shots.
- A chip-row swipe can land on a neighboring fixture. Coordinates were taken from the screenshot before each tennis tap.

### Fixes applied

- No layout change in this pass. The existing 24dp screen padding and 96dp scroll padding already keep Undo and Confirm result clear of the gesture bar on these fixtures.

### Remaining device-only risks

- Expo Go still ignores `softwareKeyboardLayoutMode` until a native build. Lawn tennis has no note field, so the keyboard path was not exercised.
- The 24dp bottom cushion is fixed. A taller gesture inset or 3-button navigation can still crowd the last control.
- This route has no bottom tab bar.
- The lab rules object is a fixture only. It is not an NSPG tennis preset, and scoring stays off until a match has a complete valid rules object.
- A resize or cold start can open the Expo developer menu and cover the lab.
