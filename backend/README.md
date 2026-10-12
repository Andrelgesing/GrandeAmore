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
Elo and K=16; it never accepts client-provided scores. Both updates and the vote
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
