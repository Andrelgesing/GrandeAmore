# Tournament Elo routine v1

Approved 25 October 2026. This routine replaces fixed placement bonuses for new
round-robin tournaments. Existing 11 and 18 October records remain unchanged.
Implementation: `calculateTournamentElo` and `tournamentEloDelta` in `worker.js`.

## Inputs and expected points

Freeze the actual participating lineups and every participant's Elo before kickoff.
Keep the ratings revision and dated input with the tournament record. A team's
strength is the arithmetic mean of its participants' Elo. Each team plays every
other team once; points are 3 for a win, 1 for a draw, 0 for a loss.

For each opponent, using team average R and opponent average O:

- E = 1 / (1 + 10^((O - R) / 200)). Divisor 200 is the starting setting.
- Draw probability D = E * (1 - E): 25% for equal teams, lower for unequal teams.
- Win probability W = E - D/2; loss probability L = 1 - E - D/2.
- Expected match points = 3W + D = 3E - D/2.

Sum expected match points over all opponents. Difference = actual tournament
points minus expected tournament points. Do not round before choosing a band.
The draw model is an initial assumption, to revisit using historical draw rates.
This version's thresholds are intended for four teams / three matches each;
review them before applying to longer tournaments or repeated round robins.

## Per-player adjustment

Use the absolute difference to choose the magnitude, then apply its sign:

| Absolute difference | Magnitude |
| --- | ---: |
| Less than 0.5 | 0 |
| 0.5 to less than 1 | 10 |
| 1 to less than 3 | 20 |
| 3 or more | 40 |

The champion receives at least +10, even if below expectation. Every player on a
team receives that team's adjustment. No additional placement, goal, assist or
MVP bonus is included. Gains and losses need not sum to zero. Duel scoring and
newcomer calibration remain independent and unchanged.

## Application and audit

Prepare and review a dated frozen input for each future tournament, calculate its
adjustments, then add an explicit one-time application under a new dated key.
Do not reuse the 25 October key or overwrite its input to apply another event.
Apply deltas to current live Elo, preserving all intervening duel changes. In one
storage transaction, save full before/after ratings, revisions, frozen input,
settings, exact expected points, per-team differences, and per-player deltas.
A dated marker prevents restart/redeploy from applying the event twice.
Preserve calibration counters, permanent Legendary honors and unrelated records.
No public write endpoint is provided for applying tournaments.

The latest adjustments appear beside Stats Elo: positive green with a plus sign,
negative red, and explicit zero grey. Nonparticipants receive no event annotation.

## 25 October 2026

Frozen ratings revision: 1608. Final lineups are stored in `tournament25Input`.

| Team / Captain | Average Elo | Expected points | Actual | Difference | Elo per player |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 / Inca | 1073.571429 | 5.021636 | 7 | +1.978364 | +20 |
| 4 / Loay | 1047.571429 | 4.129281 | 6 | +1.870719 | +20 |
| 3 / AlexG | 1047.571429 | 4.129281 | 4 | -0.129281 | 0 |
| 2 / Andre | 1021.714286 | 3.262771 | 0 | -3.262771 | -40 |

Flag: `APPLY_TOURNAMENT_20261025=true`.
Audit endpoint: `GET /tournament-placement?date=2026-10-25`.
Stored key: `tournament:2026-10-25:placement`.

## 8 November 2026

Frozen ratings revision: 1856, after the Ali / Teodor switch (Ali in Team 2,
Teodor in Team 3). Divisor 200, unchanged v1 draw model and thresholds.

| Team | Expected points | Actual points | Elo per player | Season MP added |
| --- | ---: | ---: | ---: | ---: |
| 2 | 4.956930 | 9 | +40 | 3 |
| 4 | 3.317012 | 6 | +20 | 3 |
| 3 | 3.874942 | 3 | -10 | 3 |
| 1 | 4.392191 | 0 | -40 | 3 |

All seven participants per team receive the team's season points and Elo delta.
Bench player Iacob receives neither points, MP, nor Elo from this event. Goals and
assists await supplied scorer records; existing season contributions stay intact.
Apply with APPLY_TOURNAMENT_20261108=true. Dated audit:
GET /tournament-placement?date=2026-11-08. Storage key:
tournament:2026-11-08:placement. Do not apply this tournament twice.

## 9 November lineup correction for 8 November

Correct teams: Teodor in Team 1, Alexandros in Team 2, Ali in Team 3. Reuse
frozen ratings revision 1856 and divisor 200. Final awards per player are
Team 1 -40, Team 2 +40, Team 3 -20, Team 4 +20. Expected points are
4.053045, 4.834251, 4.332266 and 3.314167 respectively.

Apply only the difference between the original and corrected awards to current
live Elo. Nine corrections: Teodor -30, Alexandros +80, Ali -60, and Saad,
Laurenz, Alexander (displayed Alexandre), Giorgios, Jack and Levi -10 each.
The original placement audit is preserved. A separate immutable record at
tournament:2026-11-08:lineup-correction:v1 holds before/after live ratings and
correctionAdjustments. Its adjustments field contains FINAL tournament awards
(-40/+40/-20/+20), used by Stats parentheses, dated placement reads and archives.
Flag APPLY_NOVEMBER8_LINEUP_CORRECTION=true applies this only once.
