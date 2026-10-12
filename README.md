# Grande Amore

A simple football team website. Layout and styling are in `index.html`; the player roster and card interactions are in `players.js`.

## Players

Open the Players tab to see all 31 players. Ratings are calculated from Elo;
Shahrom has three stars until a different rating is provided.
Update each player's Elo when match-based ratings are agreed. Card colors
automatically follow the rating: below 2.5 bronze, 2.5–below 3.75 silver, 3.75–5 gold.
The optional fourth value in each roster entry is the relative photo path.
Players with photos appear first. Shahrom plays ST and has the separate Legendary
status (the optional fifth roster value), which gives his card a purple background
without changing his three stars.
Two randomly assigned joke stats appear on the expanded card; these stay the
same while the page remains open and do not affect the player's rating.
Match history and automatic rating calculations are not implemented yet.

Positions are ordered: the first is preferred, and an optional second follows
after `/`. Single-position entries have no secondary position. Daniel and Loay
prefer CM and can also play ST. Loay starts at 1100 Elo (3.5 stars).
Hay prefers ST, can also play CM, and starts at 1000 Elo (3 stars).

## View locally

Open `index.html` in your browser.

## Publish with GitHub Pages

From this repository directory:

```sh
git add index.html players.js README.md .gitignore .nojekyll
git commit -m "Add initial football team website"
git push origin main
```

On GitHub, open Settings → Pages. Choose **Deploy from a branch**, then select
**main** and **/(root)** and click **Save**.

Once deployment finishes, visit https://Andrelgesing.github.io/GrandeAmore/.
GitHub's Pages settings show the confirmed website URL and deployment status.

For later updates, edit `index.html`, commit your changes and push to `main`.
GitHub Pages automatically publishes the updated page.

## Elo and half-star ratings

The third roster value is Elo: 600 = 1 star, 800 = 2, 1000 = 3,
1200 = 4, 1400 = 5. Display ratings round to the nearest half star and
are capped between 1 and 5. Thus 700/900/1100/1300 show 1.5/2.5/3.5/4.5.
Colors use the unrounded equivalent: silver starts at 900 Elo (2.5),
gold at 1150 Elo (3.75). Five displayed stars grant Legendary status.
Shahrom retains his separately awarded Legendary status at 1000 Elo.
Match-driven Elo updates and historical achievement storage are not yet implemented.

## Live shared ratings

Cloudflare ratings API: https://grande-amore-ratings.andrelgesing.workers.dev

Fight uses K=16. Anonymous votes update shared Elo; Players and the top 10/20
standings refresh after voting and every 30 seconds while the page is visible.
Local file previews cannot vote against the live API; use the GitHub Pages site.
See backend/README.md for deployment and configuration details.

Fight chooses a random first player and uses a 70% Elo-weighted / 30% completely
random opponent mix. Weighted opponents have weight `1 / (1 + Elo gap / 200)^2`,
so closer ratings are favored while every opponent remains possible. Consecutive
repeats of the same unordered pair are skipped. Current ratings are used; pairing
never writes Elo or changes the existing K=16 vote scoring. Shahrom remains
eligible for Fight. Check the selection behavior with `node fight.test.cjs`.

## Sunday teams

The Matches tab shows four recommended seven-player teams for 11 October 2026.
`matches.js` excludes Shahrom for this fixture, keeps AlexG and Andre in separate
goals, and assigns one ST, two CM, three CB and one GK to each pitch. Position fit
is optimized before Elo balance; each team retains at least two natural defenders
and at most one player whose preferred position is ST. Midfielders cover the
four unavoidable gaps: two goalkeepers and two defenders.
Loay and Hay are squad-only for this fixture. Preferred positions are favored over
secondary positions when assigning roles.
Players without photos show an initial; the available roster photos are connected
in `players.js`. Team averages use the seven players' displayed star ratings.
Recommendations recalculate when the existing shared ratings refresh, with a
repeatable tie-break so unchanged ratings give unchanged line-ups.

Run the allocation and rendering checks with `node matches.test.cjs`.

## Tournament MVP poll

GET /mvp returns shared totals and optionally the existing choice for a browser
voter ID. POST /mvp accepts voter and player; one vote per anonymous browser ID
is stored transactionally for the 11 October 2026 poll. Results refresh every
15 seconds. The 28 candidates are frozen; MVP votes do not alter Fight Elo.
Voting is currently open without a timer. Clearing browser data or using another
browser allows another vote; this is deliberately lightweight identification.
