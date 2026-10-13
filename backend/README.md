# Shared Grande Amore ratings

Cloudflare Worker + one SQLite-backed Durable Object, suitable for Workers Free.
The frontend stays on GitHub Pages. No member sign-in is required.

## Activate

With Node.js installed, from this folder run:

```sh
npx wrangler login
npx wrangler deploy
```

Choose the free Workers plan in Cloudflare. The configuration creates the
Durable Object binding and storage automatically. No domain purchase is needed.

Copy the returned HTTPS `workers.dev` URL into `RATINGS_API` in `../config.js`
(without a trailing slash). Commit and push the website files to GitHub Pages.
The shared service starts with the roster's original Elo, not any browser's
local votes. No secret belongs in config.js; the Worker URL is public.

`ALLOWED_ORIGIN` in wrangler.jsonc is the GitHub Pages origin. For a localhost
preview, temporarily configure its exact origin and redeploy (then restore it).
Direct file previews have a null origin, so voting against the live service
is intentionally unavailable there. Local-only mode remains when RATINGS_API
is empty. Cross-origin restrictions are not authentication or abuse prevention.

## Behavior

GET /ratings returns all players and a monotonic revision.
On initialization, newly added roster members are merged into storage at their
starting Elo. Existing scores, Legendary honors, vote records and revision are
preserved; adding a player does not count as a vote.
POST /votes takes an id, winner name, and loser name. The server uses its current
Elo and K=16; it never accepts client-provided scores. Per-player calibration uses K=64 for duels 1–3, K=32 for 4–10 and the configured
base K (16) thereafter. Existing players remain established; missing roster entries
added after the calibration migration start with calibrationDuels=0. Each accepted
vote increments their counter, capped at 10. Asymmetric changes need not sum to zero.
Both updates and the vote
record commit together. Retrying a vote with the same ID does not count twice.
Concurrent requests are serialized by storage transactions. Vote records keep
before-scores, point changes, time and K for future audits; no admin undo UI yet.

Stars round to half increments. Reaching 1350 Elo displays five stars and grants
Legendary permanently. Shahrom's existing honor is preserved. Elo itself is not
clamped. Change ELO_K in wrangler.jsonc and redeploy to adjust future votes.

The website refreshes standings immediately after voting, every 30 seconds
while visible, and on tab navigation/focus. Older network responses cannot
replace newer revisions. A network failure never falls back to local voting
when shared mode is configured.

## Checks

Syntax and mocked storage tests were run. Real Cloudflare deployment and
multi-browser integration verification require account activation.

## Tournament MVP poll

GET /mvp returns shared totals and optionally the existing choice for a browser
voter ID. POST /mvp accepts voter and player; one vote per anonymous browser ID
is stored transactionally for the 11 October 2026 poll. Results refresh every
15 seconds. The 28 candidates are frozen; MVP votes do not alter Fight Elo.
Voting is currently open without a timer. Clearing browser data or using another
browser allows another vote; this is deliberately lightweight identification.

## Daily Elo archive

The Worker saves one immutable snapshot per day at **23:55 Europe/Vienna**.
Two UTC Cron Triggers cover summer and winter time; the handler only writes at
23:55 Vienna time. It runs even when nobody visits the website. Trigger delivery
can be delayed: `scheduledAt` is the intended time, `capturedAt` the actual time.

A separate baseline is saved once on first initialization after deployment.
Snapshots include all Elo scores, Legendary honors, revision and tournament
adjustments. Transactions and duplicate protection preserve the first snapshot
for each date. Archiving does not change Elo, revision, votes or MVP totals.
Records have no automatic expiry and remain in the existing Durable Object.
This is a history archive in the ratings storage, not an independent backup.

Public download endpoints:

- `/elo-history`: JSON baseline and up to 366 daily snapshots, oldest first.
- `/elo-history?format=csv`: same page as CSV, one player per snapshot row.
- `/elo-history?date=2026-10-13`: one date, or 404 before that snapshot exists.
- `/elo-history?date=2026-10-13&format=csv`: one date as CSV.
- `/elo-history?after=2027-10-13`: next page after a date. Follow the JSON
  `nextAfter` value until null (the final page can be empty).

The baseline appears only on the first page, separately from nightly records.
No public endpoint can trigger or overwrite an archive. Earlier daily history
is not reconstructed by this feature.

Newcomer counters persist alongside ratings and appear in JSON archives. Vote
records store both K values, both point changes and prior calibration counters.
Fight reserves a random 28% branch for newcomers under 10 duels, shared uniformly.
They also remain eligible in normal selection, so total exposure can exceed 28%.
Skips and duplicate IDs do not change counters. Local previews use the same rule
when calibration metadata is present; absent metadata defaults to established.

Newcomers in the immediately preceding matchup are excluded from both selection
branches. If fewer than two players remain, this cooldown is relaxed so a duel
can still be shown. The 28% branch runs when an eligible newcomer is available.
