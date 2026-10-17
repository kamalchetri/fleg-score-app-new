# NSPG sport → scoring engine / pad map (single source of truth)

Every NSPG discipline resolves to one of two scoring surfaces. Check new code against this.
`MatchScoringView` renders the tap pad by `match.tournament.sport`; ranked/measured use the
`ranked-results` recorder, not tap scoring.

| # | Sport (slug)        | Engine / pad          | Surface            | Notes |
|---|---------------------|-----------------------|--------------------|-------|
| 1 | football            | futsal/football       | tap pad            | team goals, clock; groups→knockout |
| 2 | basketball          | basketball            | tap pad            | points (1/2/3), fouls |
| 3 | volleyball          | volleyball            | tap pad            | sets, deuce, cap, deciding set |
| 4 | sepaktakraw         | sepaktakraw           | tap pad            | regu; sets like volleyball |
| 5 | badminton           | badminton             | tap pad            | rally-point sets; singles + doubles(paired) |
| 6 | table_tennis        | table_tennis          | tap pad            | best-of sets |
| 7 | lawn_tennis         | lawn_tennis           | tap pad            | games/sets, deuce, tiebreak, deciding |
| 8 | boxing              | combat                | tap pad            | rounds; win by points/method/stoppage; per weight class |
| 9 | taekwondo           | combat                | tap pad            | per weight class |
| 10| wrestling           | combat                | tap pad            | per weight class |
| 11| wushu — sanda       | combat                | tap pad            | per weight class |
| 11| wushu — taolu       | ranked-results        | ranked recorder    | judged routine scores → ranking |
| 12| pencak_silat — tanding | combat             | tap pad            | per weight class |
| 12| pencak_silat — seni (tunggal/regu) | ranked-results | ranked recorder | judged artistic → ranking |
| 13| athletics           | ranked-results        | ranked recorder    | heats→finals, marks/times → ranking; relays = district teams |
| 14| archery             | ranked-results        | ranked recorder    | ranking round → elimination; team = district |

## Rules
- **Never default to football.** The organiser score route picks the pad from the match's tournament sport (`app/organiser/[tournamentId]/score/[matchId].tsx`). Fixed in commit 693b147.
- Combat sports share ONE engine (`combat`) but run **per weight class** — the weight is the tournament category, set when the organiser builds fixtures.
- Ranked/measured sports do **not** tap-score; the organiser records results/placements through the ranked-results flow (`lib/ranked-results`, guarded by `append_ranked_action_guarded`).
- Head-to-head pads write through `append_score_event_guarded`; both wired to the live RPC at cutover (seed today).
- A sport with no live controls shows the saved snapshot (MatchScoringView fallback) — that's expected only for unconfigured categories, not for any sport above.
