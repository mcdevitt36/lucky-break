#!/usr/bin/env python3
import io
import re
import unicodedata
from pathlib import Path

import pandas as pd
import requests

PARQUET_URL = "https://raw.githubusercontent.com/llimllib/nba_data/main/data/playerstats.parquet"
DATA_PATH = Path("lib/data.ts")

def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())

def col(df, *names):
    for name in names:
        if name in df.columns:
            return name
    raise KeyError(f"Missing expected column. Tried: {names}\nAvailable: {list(df.columns)}")

def main():
    src = DATA_PATH.read_text()
    row_re = re.compile(
        r'\{id:"([^"]+)",name:"([^"]+)",team:"([^"]+)",position:"([^"]+)",'
        r'(?:seasonGames:([0-9.]+),)?ppg:([0-9.]+),apg:([0-9.]+),rpg:([0-9.]+),threesMade:([0-9.]+),'
        r'fgPct:([0-9.]+),threePct:([0-9.]+),careerPoints:([0-9.]+),'
        r'careerAssists:([0-9.]+),careerRebounds:([0-9.]+),seasonsPlayed:([0-9.]+),'
        r'allStars:([0-9.]+),allNBA:([0-9.]+),championships:([0-9.]+),'
        r'mvps:([0-9.]+),draftPick:([0-9.]+),draftYear:([0-9.]+)\}'
    )
    old = []
    for m in row_re.finditer(src):
        old.append({
            "id": m[1], "name": m[2], "team": m[3], "position": m[4],
            "allStars": int(float(m[16])), "allNBA": int(float(m[17])),
            "championships": int(float(m[18])), "mvps": int(float(m[19])),
            "draftPick": int(float(m[20])), "draftYear": int(float(m[21])),
        })
    if not old:
        raise RuntimeError("Could not parse existing player data")

    r = requests.get(PARQUET_URL, timeout=60)
    r.raise_for_status()
    df = pd.read_parquet(io.BytesIO(r.content))

    name_c = col(df, "player_name")
    year_c = col(df, "year")
    gp_c = col(df, "gp")
    team_c = col(df, "team_abbreviation")
    pts_c = col(df, "pts")
    reb_c = col(df, "reb")
    ast_c = col(df, "ast")
    fg3m_c = col(df, "fg3m")
    fgp_c = col(df, "fg_pct")
    fg3p_c = col(df, "fg3_pct")
    ppg_c = col(df, "pts_pergame")
    rpg_c = col(df, "reb_pergame")
    apg_c = col(df, "ast_pergame")

    df["_norm"] = df[name_c].map(norm)
    out = []

    for p in old:
        key = norm(p["name"])
        hist = df[df["_norm"] == key].copy()
        hist = hist[pd.to_numeric(hist[gp_c], errors="coerce").fillna(0) > 0]
        cur = hist[pd.to_numeric(hist[year_c], errors="coerce") == 2026]

        career_points = int(round(pd.to_numeric(hist[pts_c], errors="coerce").fillna(0).sum()))
        career_rebounds = int(round(pd.to_numeric(hist[reb_c], errors="coerce").fillna(0).sum()))
        career_assists = int(round(pd.to_numeric(hist[ast_c], errors="coerce").fillna(0).sum()))
        seasons = int(hist[year_c].nunique())

        if len(cur):
            s = cur.iloc[0]
            team = str(s[team_c])
            gp = int(float(s[gp_c]))
            ppg = round(float(s[ppg_c]), 1)
            rpg = round(float(s[rpg_c]), 1)
            apg = round(float(s[apg_c]), 1)
            threes = int(round(float(s[fg3m_c])))
            fg = round(float(s[fgp_c]) * 100 if float(s[fgp_c]) <= 1 else float(s[fgp_c]), 1)
            three = round(float(s[fg3p_c]) * 100 if float(s[fg3p_c]) <= 1 else float(s[fg3p_c]), 1)
        else:
            team = p["team"]
            gp = 0
            ppg = apg = rpg = 0.0
            threes = 0
            fg = three = 0.0

        out.append(
            f'  {{id:"{p["id"]}",name:"{p["name"]}",team:"{team}",position:"{p["position"]}",'
            f'seasonGames:{gp},ppg:{ppg:.1f},apg:{apg:.1f},rpg:{rpg:.1f},threesMade:{threes},'
            f'fgPct:{fg:.1f},threePct:{three:.1f},careerPoints:{career_points},'
            f'careerAssists:{career_assists},careerRebounds:{career_rebounds},seasonsPlayed:{seasons},'
            f'allStars:{p["allStars"]},allNBA:{p["allNBA"]},championships:{p["championships"]},'
            f'mvps:{p["mvps"]},draftPick:{p["draftPick"]},draftYear:{p["draftYear"]}}}'
        )

    header = '''import { Player } from "./types";

// Season stats: finalized 2025–26 NBA regular season.
// Career counting stats: regular-season totals through the end of 2025–26.
// Players with seasonGames: 0 did not record a 2025–26 regular-season appearance and
// are excluded from 2025–26 stat questions while remaining eligible for career questions.
export const players: Player[] = [
'''
    DATA_PATH.write_text(header + ",\n".join(out) + "\n];\n")
    print(f"Updated {len(out)} players from {PARQUET_URL}")

if __name__ == "__main__":
    main()
