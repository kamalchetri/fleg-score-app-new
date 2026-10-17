# NSPG provisioning — blocked classes & decisions needed before cutover

The importer is **fail-closed**: only `auto_importable_singles` rows import automatically. Everything else is deliberately blocked until a rule is confirmed, so no wrong bracket is created from raw registrations. Below is what each sport needs. Counts are confirmed athletes (as of 16 Oct; re-run at cutover after 24 Oct).

## Classes the importer assigns
`auto_importable_singles` (imports) · `district_roster` · `unlinked_pair` · `ranked_result` · `multi_weight_conflict` · `artistic_ensemble` · `other_unresolved`.

## Per-sport picture & decision

| Sport | Athletes | Class(es) | Decision NOA/TC must give |
|---|---:|---|---|
| Football | 258 | district_roster | Each district = 1 team; confirm the squad per district. Format groups→knockout. |
| Basketball | 322 | district_roster | Same (1 team/district, squad list). |
| Volleyball | 322 | district_roster | Same. |
| Sepaktakraw | 125 | district_roster (+ regu teams) | Teams per district; confirm regu composition. |
| Athletics | 366 | ranked_result (track/field) + district_roster (relays) | Not head-to-head brackets — heats→finals + recorded results. Relays = district teams. Confirm which events are final-only vs heats. |
| Archery | 85 | ranked_result (individual) + district_roster (team) | Ranking round → elimination for individual; team = district. |
| Boxing | 78 | ranked_result by weight | One knockout per **weight class**; confirm weight categories. |
| Taekwondo | 175 | ranked_result by weight | Same (per weight). |
| Wrestling | 58 | ranked_result by weight | Same (per weight). |
| Wushu | 106 | ranked_result (sanda/weight) + artistic (taolu, judged) | Weight brackets + judged taolu scoring + judges. |
| Pencak Silat | 161 | ranked_result (tanding/weight) + artistic_ensemble (tunggal/regu) | Weight brackets + judged artistic + judges. |
| Badminton | 144 | singles=auto · doubles=unlinked_pair | Singles import automatically; **doubles need partner pairing**. |
| Table Tennis | 107 | singles=auto · doubles=unlinked_pair | Same. |
| Lawn Tennis | 19 | singles=auto · doubles=unlinked_pair | Same. |

## The five decisions to collect (this unblocks everything)
1. **Team sports (football/basketball/volleyball/sepaktakraw + relays + archery team):** confirm "one team per district per category" and approve the squad lists. We already have athletes grouped by district, so teams auto-form on approval.
2. **Combat sports (boxing/taekwondo/wrestling + silat tanding + wushu sanda):** confirm the official **weight classes**; one bracket per weight. Resolve anyone who registered in more than one weight (`multi_weight_conflict`) — pick one.
3. **Measured/ranked (athletics track & field, archery individual):** confirm these run as **heats → finals / ranking**, not head-to-head brackets — they use the ranked-results path (already built & verified).
4. **Doubles (badminton/TT/lawn-tennis):** the forms have no partner link, so **associations must supply the pairings** (who partners whom). Singles import automatically.
5. **Judged/artistic (pencak silat tunggal/regu, wushu taolu):** confirm judged scoring + who the judges are.

## Numbers to re-pull at cutover (read-only; I'll run on 24 Oct)
- `multi_weight_conflict` count per combat sport (athletes in >1 weight).
- Doubles registrations per racket sport (pairs to be linked).
- Final confirmed athlete counts per category after late/manual adds close.

## What auto-imports with zero decisions
Singles categories in badminton, table tennis, lawn tennis. Everything else waits on the five decisions above.
