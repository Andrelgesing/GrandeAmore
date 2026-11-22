"""Render the Grande Amore pitch cards from an approved lineup snapshot."""

import argparse
import json
import math
import re
from datetime import date
from functools import lru_cache
from html import escape
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


SITE = Path(__file__).resolve().parents[1]
BACKGROUND = "#f3f4f0"
DARK_GREEN = "#183b30"
MUTED = "#65736b"
TEAM_COLORS = ("#f5d478", "#a3d7ff", "#f5aaa7", "#d0b6ff")
ROLE_ROWS = {"ST": 18, "CM": 205, "CB": 392, "GK": 579}
BOARD_WIDTH = 1380
CARD_WIDTH = 650
SINGLE_WIDTH, SINGLE_HEIGHT = 680, 995
LEGEND = "C = captain · * Covering role"


@lru_cache
def font(size, bold=False):
    arial = "Arial Bold.ttf" if bold else "Arial.ttf"
    fallback = "LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf"
    for path in (str(Path("/System/Library/Fonts/Supplemental") / arial), arial, fallback):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    raise OSError("Install Arial or Liberation Sans to render the team figures.")


def raw_stars(elo):
    return max(1, min(5, (elo - 400) / 200))


def draw_stars(draw, center, top, rating):
    for index in range(5):
        x = center + (index - 2) * 16
        points = []
        for vertex in range(10):
            radius = 7 * (0.43 if vertex % 2 else 1)
            angle = -math.pi / 2 + vertex * math.pi / 5
            points.append((x + radius * math.cos(angle), top + 7 + radius * math.sin(angle)))
        draw.polygon(points, fill="#a7b3a4")
        if rating >= index + 1:
            draw.polygon(points, fill="#ffe097")
        elif rating >= index + 0.5:
            left = int(x - 8)
            mask = Image.new("1", (8, 15))
            ImageDraw.Draw(mask).polygon([(px - left, py - top) for px, py in points], fill=1)
            draw.bitmap((left, top), mask, fill="#ffe097")


def player_photo(photo, lineup_path):
    if photo:
        for path in (lineup_path.parent / photo, SITE / photo):
            if path.is_file():
                with Image.open(path) as source:
                    return ImageOps.fit(ImageOps.exif_transpose(source).convert("RGB"), (86, 86))
        raise ValueError(f"Photo file not found: {photo}")
    return None


def draw_player(image, player, role, captain, cx, cy, name_width, show_ratings):
    draw = ImageDraw.Draw(image)
    name = player["name"]
    raw = raw_stars(player["elo"])
    if player.get("legendary") or player.get("status") == "Legendary":
        border = "#b296dc"
    elif raw >= 3.75:
        border = "#e6c467"
    elif raw >= 2.5:
        border = "#d8dfe3"
    else:
        border = "#cd9b79"
    draw.ellipse((cx - 48, cy - 48, cx + 48, cy + 48), fill=border)
    if player["portrait"]:
        mask = Image.new("L", (86, 86))
        ImageDraw.Draw(mask).ellipse((0, 0, 85, 85), fill=255)
        image.paste(player["portrait"], (round(cx - 43), round(cy - 43)), mask)
    else:
        draw.ellipse((cx - 43, cy - 43, cx + 43, cy + 43), fill="#204c38")
        draw.text((cx, cy - 21), name.lstrip("@")[0].upper(), font=font(35, True), anchor="mt")
    if name == captain:
        draw.rounded_rectangle((cx + 35, cy + 17, cx + 74, cy + 46), radius=7,
                               fill="#ffe082", outline="#624b18", width=2)
        for x in (cx + 40, cx + 69):
            draw.line((x, cy + 21, x, cy + 42), fill="#bf9c3d", width=2)
        draw.text((cx + 55, cy + 20), "C", font=font(21, True), fill="#302812", anchor="mt")
    name_size = 20
    while name_size > 10 and draw.textlength(name, font=font(name_size, True)) > name_width:
        name_size -= 1
    draw.text((cx, cy + 55), name, font=font(name_size, True), fill="white", anchor="mt")
    if show_ratings:
        draw_stars(draw, cx, cy + 82, math.floor(raw * 2 + 0.5) / 2)
    position = player["position"]
    covering = role not in position.split("/")
    draw.text((cx, cy + 104), role + ("*" if covering else ""), font=font(15),
              fill="#dfebe2", anchor="mt")
    if covering:
        draw.text((cx, cy + 124), f"from {position}", font=font(13), fill="#dfebe2", anchor="mt")


def draw_team(image, team, index, x, y, show_ratings):
    width = CARD_WIDTH
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((x, y, x + width, y + 910), radius=16, fill="white")
    draw.rounded_rectangle((x, y, x + width, y + 8), radius=3, fill=TEAM_COLORS[index])
    draw.text((x + 22, y + 22), team["name"], font=font(26, True), fill=DARK_GREEN)
    if show_ratings:
        average = sum(player["elo"] for player in team["members"]) / len(team["members"])
        draw.text((x + 22, y + 63), f"{raw_stars(average):.2f} / 5 stars",
                  font=font(21, True), fill="#8b681e")
        draw.text((x + width - 22, y + 65), f"{average:.2f} average Elo",
                  font=font(20), fill="#53665a", anchor="rt")
    pitch_top = y + 110
    pitch_bottom = pitch_top + 780
    for strip in range(12):
        draw.rectangle((x + 10, pitch_top + strip * 65, x + width - 10, pitch_top + (strip + 1) * 65),
                       fill="#286344" if strip % 2 else "#2c6b49")
    draw.rectangle((x + 24, pitch_top + 14, x + width - 24, pitch_bottom - 14), outline="#ffffff66")
    center_x, center_y = x + width / 2, pitch_top + 390
    draw.line((x + 24, center_y, x + width - 24, center_y), fill="#87a490")
    draw.ellipse((center_x - 58, center_y - 58, center_x + 58, center_y + 58), outline="#87a490")
    draw.rectangle((x + width * .32, pitch_bottom - 104, x + width * .68, pitch_bottom - 14),
                   outline="#87a490")

    for role, offset in ROLE_ROWS.items():
        row = [player for player in team["members"] if player["role"] == role]
        spacing = width / (len(row) + 1)
        for column, player in enumerate(row, 1):
            draw_player(image, player, role, team.get("captain"), x + spacing * column,
                        pitch_top + offset + 48, spacing - 10, show_ratings)


def read_teams(data, lineup_path):
    roster = (SITE / "players.js").read_text(encoding="utf-8").split("let ratingState")[0]
    photos = dict(re.findall(r"""\[\s*['"]([^'"]+)['"]\s*,\s*['"][A-Z/]+['"]\s*,\s*\d+\s*,\s*['"](players/[^'"]+)['"]""", roster))
    teams = data["teams"]
    if not 1 <= len(teams) <= len(TEAM_COLORS):
        raise ValueError("Expected one to four teams.")
    seen = set()
    for number, team in enumerate(teams, 1):
        team.setdefault("name", f"Team {number}")
        members = []
        for entry in team["members"]:
            player = {**entry.get("player", entry), "role": entry["role"]}
            name = player["name"]
            if not name or name in seen:
                raise ValueError(f"Missing or repeated player: {name!r}")
            if player["role"] not in ROLE_ROWS:
                raise ValueError(f"Unknown role for {name}: {player['role']}")
            seen.add(name)
            photo = player.get("photo", photos.get(name))
            player["photo"] = photo
            player["portrait"] = player_photo(photo, lineup_path)
            members.append(player)
        if not members:
            raise ValueError(f"{team['name']} requires at least one player.")
        if team.get("captain") and team["captain"] not in {player["name"] for player in members}:
            raise ValueError(f"The captain is missing from {team['name']}.")
        team["members"] = members
    return teams


def archive_markup(teams, results, fixture_date, fixture_type, date_label):
    if results["date"] != fixture_date.isoformat():
        raise ValueError("The lineups and results must have the same date.")
    standings = {standing["team"]: standing for standing in results["standings"]}
    if len(standings) != len(results["standings"]) or set(standings) != set(range(1, len(teams) + 1)):
        raise ValueError("The results must include one standing per team.")

    key = fixture_date.isoformat()
    heading = escape(f"Previous {fixture_type.lower()}")
    lines = [
        f'<section class="match-archive" aria-labelledby="match-archive-{key}-title">',
        f'  <h2 id="match-archive-{key}-title">{heading}</h2>',
        f'  <time class="match-date" datetime="{key}">{fixture_date:%A} · {date_label}</time>',
    ]
    if winner := results.get("mvp"):
        player = next((p for team in teams for p in team["members"] if p["name"] == winner["player"]), None)
        if player is None:
            raise ValueError(f"MVP is missing from the lineups: {winner['player']}")
        label = escape(winner.get("label", player["name"]))
        photo = winner.get("photo", player["photo"])
        if photo and re.fullmatch(r"(?:players|assets)/[^?#]+", photo) and (SITE / photo).is_file():
            portrait = f'<img src="{escape(photo)}" alt="">'
        else:
            portrait = escape(label[0].upper())
        lines.extend([
            '  <div class="past-mvp-banner">',
            f'    <span class="past-mvp-portrait" aria-hidden="true">{portrait}</span>',
            f'    <span><small>MVP</small><strong>{label}</strong></span>',
            '  </div>',
        ])
    lines.append(f'  <div class="match-teams" id="teams-{key}">')
    for index, team in enumerate(teams, 1):
        standing = standings[index]
        name = escape(team["name"])
        caption = [name]
        if standing.get("champions"):
            caption.append("Champions")
        if "goalsFor" in standing:
            caption.append(f"{int(standing['goalsFor'])} goals")
        if standing.get("points") is not None:
            caption.append(f"{int(standing['points'])} pts")
        roster = ", ".join(escape(p["name"]) for p in team["members"])
        captain = f", captain {escape(team['captain'])}" if team.get("captain") else ""
        url = f"assets/teams/{key}/team-{index}.png"
        lines.extend([
            '    <figure class="match-team-figure">',
            f'      <figcaption class="match-result-caption">{" · ".join(caption)}</figcaption>',
            f'      <a href="{url}" aria-label="Open {name} figure"><img src="{url}" width="{SINGLE_WIDTH}" '
            f'height="{SINGLE_HEIGHT}" alt="{name}{captain}: {roster}"></a>',
            '    </figure>',
        ])
    lines.extend(['  </div>', '</section>'])
    return "\n".join(lines) + "\n"


def render(lineup, output, subtitle, results_path):
    data = json.loads(lineup.read_text(encoding="utf-8"))
    fixture_date = date.fromisoformat(data["date"])
    date_label = f"{fixture_date.day} {fixture_date:%B %Y}"
    fixture_type = data.get("type", "Tournament")
    teams = read_teams(data, lineup)
    archive = None
    if results_path:
        results = json.loads(results_path.read_text(encoding="utf-8"))
        archive = archive_markup(teams, results, fixture_date, fixture_type, date_label)
    revision = data.get("revision", data.get("rankingRevision"))
    subtitle = subtitle if subtitle is not None else data.get("subtitle")
    if subtitle is None and revision is not None:
        subtitle = f"Elo snapshot #{revision}"

    height = 1130 if len(teams) <= 2 else 2050
    board = Image.new("RGB", (BOARD_WIDTH, height), BACKGROUND)
    draw = ImageDraw.Draw(board)
    draw.text((40, 28), f"{fixture_type.upper()} · {date_label.upper()}", font=font(31, True), fill=DARK_GREEN)
    if subtitle:
        draw.text((40, 77), subtitle, font=font(20), fill=MUTED)
    draw.text((35, height - 40), LEGEND, font=font(18), fill=MUTED)
    output.mkdir(parents=True, exist_ok=True)
    for index, team in enumerate(teams):
        x, y = 30 + (index % 2) * 680, 125 + (index // 2) * 930
        draw_team(board, team, index, x, y, data.get("showRatings", True))
        single = Image.new("RGB", (SINGLE_WIDTH, SINGLE_HEIGHT), BACKGROUND)
        single.paste(board.crop((x - 15, y - 15, x + 665, y + 925)), (0, 0))
        ImageDraw.Draw(single).text((20, 950), f"{date_label} · {LEGEND}", font=font(18), fill=MUTED)
        single.save(output / f"team-{index + 1}.png")
    board.save(output / "all-teams.png")
    names = escape("; ".join(f"{team['name']}: " + ", ".join(p["name"] for p in team["members"]) for team in teams))
    title = escape(f"{fixture_type} · {date_label}")
    (output / "index.html").write_text(f"""<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title><style>body{{margin:0;background:{BACKGROUND}}}img{{display:block;width:100%;max-width:{BOARD_WIDTH}px;height:auto;margin:auto}}</style>
<img src="all-teams.png" width="{BOARD_WIDTH}" height="{height}" alt="{names}"></html>
""", encoding="utf-8")
    if archive is not None:
        (output / "archive.html").write_text(archive, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lineup", type=Path, help="Approved lineup JSON")
    parser.add_argument("output", type=Path, help="Output directory for this fixture")
    parser.add_argument("--subtitle", help="Optional subtitle for the combined board")
    parser.add_argument("--results", type=Path, help="Final results JSON for a Matches archive section")
    args = parser.parse_args()
    try:
        render(args.lineup, args.output, args.subtitle, args.results)
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(1, f"Could not render teams: {error}\n")
    print(f"Team figures saved to {args.output}")


if __name__ == "__main__":
    main()
