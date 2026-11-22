# Weekly matchday

Use these phrases in a chat opened on this workspace. Write dates as `YYYY-MM-DD`, or say “this Sunday” in Vienna time. Use the approved information already saved for that date and ask for any missing fixture facts that block the requested output.

| Chat command | What to reuse | Weekly inputs |
| --- | --- | --- |
| `GA teams <date>` | Existing green pitch on Matches and the 22 November print style for the combined board and individual PNGs | Confirmed lineups and roles, captain per team, photos, Elo snapshot and optional meet-up and kickoff |
| `GA MVP poll <date>` | The 15 November gold trophy banner, Google sign-in, team-grouped ballot, confirmation and results | Approved lineups for that date and when to publish or close |
| `GA results <date>` | Previous match or tournament section with the original pitch cards, team points or scores, and a Champions label when applicable | Actual participants, scores or points and champion |
| `GA MVP winner <date> <player>` | Green-and-gold MVP winner banner in that fixture's archive and the existing crown marker where the winner is featured | Confirmed winner and their roster photo |
| `GA stats <date>` | Existing Top Scorer, Assists and Season tables | Confirmed goals and assists, and fixture totals for Season |
| `GA Elo preview <date>` | Existing Elo calculation, dated audit and Stats adjustment display | Frozen pre-kickoff ratings revision, actual participants and final scores or points |

Examples include `GA teams this Sunday, meet-up 17:00, kickoff 17:30`, `GA MVP poll this Sunday` and `GA MVP winner 2026-11-15 Fabian`. Add “publish” for an authorized site update or “close” to close a published poll. `GA Elo preview` prepares the calculation for review. An Elo application requires an explicit request.

## Teams and archive

Keep the approved lineup snapshot in `assets/teams/<date>/lineups.json`. The [15 November fixture](assets/teams/2026-11-15/lineups.json) has the existing format. Set the ISO `date`, the frozen `revision`, and the `teams` in team-number order. Each team has a `captain` (omit it when none was chosen) and `members`. Each member carries `name`, assigned `role`, normal `position`, frozen `elo`, and optional `legendary` and `photo` fields. The historical nested `player` format also works. Use a saved photo path relative to the fixture or the website root for an override. The renderer otherwise uses the roster photo and falls back to an initial. An optional `type` of `Match` changes the title from the default `Tournament`. Set `subtitle` for the usual `Meet-up 17:00 · Kickoff 17:30` line, or the board will use the available Elo revision.

From the website repository, with Python and Pillow installed:

```sh
python3 scripts/render-team-figures.py assets/teams/2026-11-15/lineups.json ../output/teams-2026-11-15-preview
```

Use the combined board for sharing and the individually numbered PNGs in `assets/teams/<date>/` for the website. Keep the current Matches renderer for interactive player cards. Reuse the original PNGs when archiving an already published lineup to retain the appearance and frozen ratings from that date.

For a results preview, add `--results assets/teams/<date>/results.json`. The [15 November results](assets/teams/2026-11-15/results.json) show the existing format. Give each team a single standing with `points`, `goalsFor` when recording a score, and `champions` where confirmed. Add `"mvp": {"player": "fabian", "label": "Fabian"}` to the dated results when a winner is confirmed. The resulting `archive.html` is a section for the Matches view in `index.html`. It uses the existing captions and the winner style in `match-archive.css`. If the archive is already present, update the existing section for that date.

## MVP ballot

Set the date in `online/mvp.json`. The account Worker build reads the same dated `lineups.json` as the team figures and generates the ballot groups and server-side eligible names in the same order. Both published sites read this configuration from the account Worker. Keep the poll ID derived from the fixture date so every week has its own votes. The shared template is `templates/weekly-mvp.html`, styled by `weekly-mvp.css`. The current config carries forward the 15 November poll ID and keeps its Home banner hidden. Set `showOnHome` when publishing a poll, and set `closed` to display final results and close voting. Confirm the account site's build with `python3 online/build.py` before publishing. Google sign-in, the confirmation dialog and the one-vote-per-account rule are part of this block every week.

## Stats, Season and Elo

Add the fixture's confirmed goals and assists once in `goals.js`. Reference those same arrays, the approved teams and the standings in `season.js`. Use the number of matches actually played. Keep incomplete scorer reports partial until the missing goals or assists are confirmed.

Use the [existing Elo procedure](backend/tournament-elo.md) for the applicable match format. Preserve the pre-match snapshot and the dated before-and-after audit. The round-robin routine was approved for four teams playing three matches each. Use the existing single-match calculation for a comparable two-team fixture. Where the format or scoring rule differs, resolve the calculation before applying the update. Reuse the dated one-time write and standard Elo gain/loss display.
