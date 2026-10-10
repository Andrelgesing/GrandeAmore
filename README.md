# Grande Amore

A simple football team website. Layout and styling are in `index.html`; the player roster and card interactions are in `players.js`.

## Players

Open the Players tab to see all 29 players. Ratings are calculated from Elo;
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

Fight uses K=32. Anonymous votes update shared Elo; Players and the top 10/20
standings refresh after voting and every 30 seconds while the page is visible.
Local file previews cannot vote against the live API; use the GitHub Pages site.
See backend/README.md for deployment and configuration details.
