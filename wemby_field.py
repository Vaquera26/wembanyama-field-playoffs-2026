"""
THE WEMBANYAMA FIELD
══════════════════════════════════════════════════════════════
Solo cuenta tiros rivales cuando Wemby está en cancha.
Compara distribución CON vs SIN Wemby para mostrar el campo gravitacional real.

Spurs — Playoffs 2025-26

USO:
  python wemby_field.py --fetch   → descarga y cachea datos
  python wemby_field.py           → genera visualización
  python wemby_field.py --demo    → visualización sin API

REQUIERE:
  pip install nba_api matplotlib pandas requests
"""

import re
import sys
import json
import time
import warnings
import requests
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe

warnings.filterwarnings("ignore")

# ── CONSTANTES ────────────────────────────────────────────────────────────────
SPURS_ID  = 1610612759
OKC_ID    = 1610612760
POR_ID    = 1610612757
MIN_ID    = 1610612750
WEMBY_ID  = 1641705
SEASON    = "2025-26"

ZONE_BINS   = [0, 4, 8, 14, 23.75, 100]
ZONE_LABELS = ["Paint\n0-4ft", "Short\nMid", "Mid\nRange", "Long\nMid", "Three\nPoint"]

# Paleta: rojo (cerca/peligro) → azul (lejos/libre)
GRADIENT = ["#cc0022", "#e84422", "#e08800", "#2277cc", "#0044bb"]
BG       = "#ffffff"

SERIE_COLOR = {
    "R1 · POR": "#999999",
    "R2 · MIN": "#2277cc",
    "ECF · OKC": "#cc0022",
}

KNOWN_GAMES = [
    {"game_id": "0042500151", "opp_id": POR_ID,  "serie": "R1 · POR", "game_num": 1, "result": "W"},
    {"game_id": "0042500152", "opp_id": POR_ID,  "serie": "R1 · POR", "game_num": 2, "result": "L"},
    {"game_id": "0042500153", "opp_id": POR_ID,  "serie": "R1 · POR", "game_num": 3, "result": "W"},
    {"game_id": "0042500154", "opp_id": POR_ID,  "serie": "R1 · POR", "game_num": 4, "result": "W"},
    {"game_id": "0042500155", "opp_id": POR_ID,  "serie": "R1 · POR", "game_num": 5, "result": "W"},
    {"game_id": "0042500231", "opp_id": MIN_ID,  "serie": "R2 · MIN", "game_num": 1, "result": "L"},
    {"game_id": "0042500232", "opp_id": MIN_ID,  "serie": "R2 · MIN", "game_num": 2, "result": "W"},
    {"game_id": "0042500233", "opp_id": MIN_ID,  "serie": "R2 · MIN", "game_num": 3, "result": "W"},
    {"game_id": "0042500234", "opp_id": MIN_ID,  "serie": "R2 · MIN", "game_num": 4, "result": "L"},
    {"game_id": "0042500235", "opp_id": MIN_ID,  "serie": "R2 · MIN", "game_num": 5, "result": "W"},
    {"game_id": "0042500236", "opp_id": MIN_ID,  "serie": "R2 · MIN", "game_num": 6, "result": "W"},
    {"game_id": "0042500311", "opp_id": OKC_ID,  "serie": "ECF · OKC", "game_num": 1, "result": "W"},
    {"game_id": "0042500312", "opp_id": OKC_ID,  "serie": "ECF · OKC", "game_num": 2, "result": "L"},
    {"game_id": "0042500313", "opp_id": OKC_ID,  "serie": "ECF · OKC", "game_num": 3, "result": "L"},
    {"game_id": "0042500314", "opp_id": OKC_ID,  "serie": "ECF · OKC", "game_num": 4, "result": "W"},
]

DATA_CACHE    = "wemby_shots_cache.json"
LINEUPS_CACHE = "wemby_lineups_cache.json"

NBA_HEADERS = {
    "Host": "stats.nba.com",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/145.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.nba.com/",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "Sec-Ch-Ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Fetch-Dest": "empty",
    "Connection": "keep-alive",
}


# ── TIEMPO ────────────────────────────────────────────────────────────────────

def parse_clock(clock_str: str) -> float:
    """'PT04M18.00S' → segundos restantes en el período."""
    m = re.match(r"PT(\d+)M([\d.]+)S", clock_str)
    if not m:
        return 0.0
    return int(m.group(1)) * 60 + float(m.group(2))


def to_game_seconds(period: int, seconds_remaining: float) -> float:
    """Convierte período + tiempo restante a segundos desde inicio del juego."""
    if period <= 4:
        period_start    = (period - 1) * 720
        period_duration = 720
    else:
        period_start    = 4 * 720 + (period - 5) * 300
        period_duration = 300
    return period_start + (period_duration - seconds_remaining)


def shot_game_seconds(row: pd.Series) -> float:
    remaining = row["MINUTES_REMAINING"] * 60 + row["SECONDS_REMAINING"]
    return to_game_seconds(int(row["PERIOD"]), remaining)


# ── STINTS DE WEMBY ───────────────────────────────────────────────────────────

def get_wemby_stints(game_id: str) -> list[tuple[float, float]]:
    """
    Regresa lista de (inicio_seg, fin_seg) cuando Wemby está en cancha.
    Usa play-by-play v3 y eventos de Substitution.
    Asume que Wemby empieza el juego en cancha (es titular).
    """
    r = requests.get(
        "https://stats.nba.com/stats/playbyplayv3",
        params={"GameID": game_id, "StartPeriod": 0, "EndPeriod": 10},
        headers=NBA_HEADERS,
        timeout=45,
    )
    actions = r.json()["game"]["actions"]

    subs = [a for a in actions if a["actionType"] == "Substitution"]

    # Determinar duración total del juego
    period_events = [a for a in actions if a["actionType"] == "period"]
    max_period = max((a["period"] for a in actions), default=4)
    if max_period <= 4:
        game_end = 4 * 720
    else:
        game_end = 4 * 720 + (max_period - 4) * 300

    stints: list[tuple[float, float]] = []
    wemby_on   = True   # Wemby es titular — empieza en cancha
    stint_start = 0.0

    for sub in subs:
        t = to_game_seconds(sub["period"], parse_clock(sub["clock"]))
        desc = sub.get("description", "")

        if f"FOR Wembanyama" in desc and wemby_on:
            # Wemby sale
            stints.append((stint_start, t))
            wemby_on = False

        elif "Wembanyama FOR" in desc and not wemby_on:
            # Wemby entra
            stint_start = t
            wemby_on    = True

    if wemby_on:
        stints.append((stint_start, game_end))

    return stints


def is_wemby_on(game_sec: float, stints: list[tuple[float, float]]) -> bool:
    return any(s <= game_sec <= e for s, e in stints)


# ── FETCH ─────────────────────────────────────────────────────────────────────

def fetch_shots(game_id: str, opp_id: int) -> pd.DataFrame:
    """Tiros del rival con columnas de tiempo incluidas."""
    r = requests.get(
        "https://stats.nba.com/stats/shotchartdetail",
        params={
            "AheadBehind": "", "CFID": "", "CFPARAMS": "",
            "ClutchTime": "", "Conference": "", "ContextFilter": "",
            "ContextMeasure": "FGA", "DateFrom": "", "DateTo": "",
            "Division": "", "EndPeriod": 10, "EndRange": 28800,
            "GameID": game_id, "GameSegment": "", "LastNGames": 0,
            "LeagueID": "00", "Location": "", "Month": 0,
            "OpponentTeamID": 0, "Outcome": "", "PORound": 0,
            "Period": 0, "PlayerID": 0, "PlayerPosition": "",
            "PointDiff": "", "Position": "", "RangeType": 0,
            "RookieYear": "", "Season": SEASON, "SeasonSegment": "",
            "SeasonType": "Playoffs", "StartPeriod": 1, "StartRange": 0,
            "TeamID": opp_id, "VsConference": "", "VsDivision": "",
        },
        headers=NBA_HEADERS,
        timeout=45,
    )
    data  = r.json()
    cols  = data["resultSets"][0]["headers"]
    rows  = data["resultSets"][0]["rowSet"]
    return pd.DataFrame(rows, columns=cols)


def fetch_and_cache():
    """
    Descarga tiros + stints de Wemby por juego.
    Separa tiros en ON (Wemby en cancha) y OFF (Wemby en banca).
    """
    cache = {}

    for g in KNOWN_GAMES:
        gid = g["game_id"]
        opp = g["opp_id"]
        label = f"{g['serie']} G{g['game_num']}"
        print(f"  {label} ({gid})")

        try:
            time.sleep(1.5)
            stints = get_wemby_stints(gid)
            wemby_minutes = sum(e - s for s, e in stints) / 60
            print(f"    Wemby stints: {len(stints)} — {wemby_minutes:.1f} min en cancha")

            time.sleep(1.5)
            shots = fetch_shots(gid, opp)
            shots["SHOT_DISTANCE"]  = pd.to_numeric(shots["SHOT_DISTANCE"],  errors="coerce")
            shots["SHOT_MADE_FLAG"] = pd.to_numeric(shots["SHOT_MADE_FLAG"], errors="coerce")
            shots["PERIOD"]         = pd.to_numeric(shots["PERIOD"],         errors="coerce")
            shots["game_sec"]       = shots.apply(shot_game_seconds, axis=1)
            shots["wemby_on"]       = shots["game_sec"].apply(
                lambda t: is_wemby_on(t, stints)
            )

            n_on  = shots["wemby_on"].sum()
            n_off = (~shots["wemby_on"]).sum()
            print(f"    Tiros: {len(shots)} total — {n_on} con Wemby / {n_off} sin Wemby")

            cache[gid] = {
                "meta":   g,
                "stints": stints,
                # ON — Wemby en cancha
                "on": {
                    "shot_distance": shots.loc[shots["wemby_on"],  "SHOT_DISTANCE"].tolist(),
                    "shot_made":     shots.loc[shots["wemby_on"],  "SHOT_MADE_FLAG"].tolist(),
                    "loc_x":         shots.loc[shots["wemby_on"],  "LOC_X"].tolist(),
                    "loc_y":         shots.loc[shots["wemby_on"],  "LOC_Y"].tolist(),
                },
                # OFF — Wemby en banca
                "off": {
                    "shot_distance": shots.loc[~shots["wemby_on"], "SHOT_DISTANCE"].tolist(),
                    "shot_made":     shots.loc[~shots["wemby_on"], "SHOT_MADE_FLAG"].tolist(),
                    "loc_x":         shots.loc[~shots["wemby_on"], "LOC_X"].tolist(),
                    "loc_y":         shots.loc[~shots["wemby_on"], "LOC_Y"].tolist(),
                },
            }

        except Exception as e:
            print(f"    ERROR: {e}")

    with open(DATA_CACHE, "w") as f:
        json.dump(cache, f)
    print(f"\nCache guardado: {DATA_CACHE}")


# ── ANÁLISIS DE QUINTETOS ────────────────────────────────────────────────────

def fetch_boxscore_players(game_id: str) -> pd.DataFrame:
    """BoxScoreTraditionalV2 → DataFrame con PLAYER_ID, PLAYER_NAME, TEAM_ID, START_POSITION."""
    r = requests.get(
        "https://stats.nba.com/stats/boxscoretraditionalv2",
        params={
            "GameID": game_id, "StartPeriod": 0, "EndPeriod": 14,
            "StartRange": 0, "EndRange": 0, "RangeType": 0,
        },
        headers=NBA_HEADERS,
        timeout=45,
    )
    ps = r.json()["resultSets"][0]   # índice 0 = PlayerStats
    return pd.DataFrame(ps["rowSet"], columns=ps["headers"])


def build_name_maps(df: pd.DataFrame, team_id: int):
    """
    Construye mapeo apellido_upper → player_id  y  player_id → apellido.
    Maneja sufijos como Jr., III, II, Sr.
    """
    SUFFIXES = {"JR.", "JR", "SR.", "SR", "II", "III", "IV"}
    sub = df[df["TEAM_ID"] == team_id]
    last_to_id: dict[str, int] = {}
    id_to_last: dict[int, str] = {}

    for _, row in sub.iterrows():
        pid   = int(row["PLAYER_ID"])
        parts = str(row["PLAYER_NAME"]).split()
        last  = parts[-1]
        if last.upper() in SUFFIXES and len(parts) >= 2:
            last = parts[-2]
        last_to_id[last.upper()] = pid
        id_to_last[pid]          = last
    return last_to_id, id_to_last


def parse_sub_last_names(description: str):
    """'SUB: Castle FOR Wembanyama' → ('CASTLE', 'WEMBANYAMA')"""
    m = re.match(r"SUB:\s+(\S+)\s+FOR\s+(\S+)", description, re.IGNORECASE)
    if m:
        return m.group(1).upper(), m.group(2).upper()
    return None, None


def track_game_lineups(game_id: str, spurs_id: int, opp_id: int, meta: dict) -> dict:
    """
    Para cada tiro del rival registra qué quinteto de los Spurs estaba en cancha.
    Regresa dict: frozenset(player_ids) → entrada con FGA/FGM y coordenadas.
    """
    df_players = fetch_boxscore_players(game_id)

    # Titulares de los Spurs
    spurs_starters = set(
        df_players[
            (df_players["TEAM_ID"] == spurs_id) &
            (df_players["START_POSITION"].notna()) &
            (df_players["START_POSITION"] != "")
        ]["PLAYER_ID"].astype(int).tolist()
    )

    last_to_id, id_to_last = build_name_maps(df_players, spurs_id)

    # Play-by-play
    r = requests.get(
        "https://stats.nba.com/stats/playbyplayv3",
        params={"GameID": game_id, "StartPeriod": 0, "EndPeriod": 10},
        headers=NBA_HEADERS,
        timeout=45,
    )
    actions = r.json()["game"]["actions"]

    current = set(spurs_starters)
    entries: dict = {}

    for evt in actions:
        atype   = evt.get("actionType", "")
        team_id = evt.get("teamId")

        # Actualizar quinteto al haber cambio de los Spurs
        if atype == "Substitution" and team_id == spurs_id:
            in_last, out_last = parse_sub_last_names(evt.get("description", ""))
            if in_last and out_last:
                out_id = last_to_id.get(out_last)
                in_id  = last_to_id.get(in_last)
                if out_id:
                    current.discard(out_id)
                if in_id:
                    current.add(in_id)

        # Registrar tiro del rival
        elif atype in ("Made Shot", "Missed Shot") and team_id == opp_id:
            key = frozenset(current)
            if key not in entries:
                entries[key] = {
                    "players":    sorted(id_to_last.get(p, str(p)) for p in key),
                    "player_ids": sorted(int(p) for p in key),
                    "has_wemby":  WEMBY_ID in key,
                    "fga": 0, "fgm": 0,
                    "x": [], "y": [], "made": [],
                    "game_ids": set(),
                    "series":   set(),
                }
            e = entries[key]
            e["fga"] += 1
            e["game_ids"].add(game_id)
            e["series"].add(meta["serie"])
            made = 1 if evt.get("shotResult") == "Made" else 0
            e["fgm"]  += made
            e["made"].append(made)
            x = evt.get("xLegacy")
            y = evt.get("yLegacy")
            if x is not None:
                e["x"].append(int(x))
            if y is not None:
                e["y"].append(int(y))

    return entries


def merge_lineup_entries(all_game_entries: list) -> list:
    """Agrupa entradas del mismo quinteto (mismos 5 jugadores) de múltiples juegos."""
    merged: dict = {}
    for e in all_game_entries:
        key = tuple(sorted(e["player_ids"]))
        if key not in merged:
            merged[key] = {
                "players":    e["players"],
                "player_ids": list(key),
                "has_wemby":  e["has_wemby"],
                "fga": 0, "fgm": 0,
                "x": [], "y": [], "made": [],
                "game_count": 0,
                "series":     set(),
            }
        m = merged[key]
        m["fga"]        += e["fga"]
        m["fgm"]        += e["fgm"]
        m["x"]          += e["x"]
        m["y"]          += e["y"]
        m["made"]       += e["made"]
        m["game_count"] += len(e["game_ids"])
        m["series"].update(e["series"])

    result = []
    for m in merged.values():
        if m["fga"] < 15:          # umbral mínimo de intentos
            continue
        m["fg_pct"] = round(m["fgm"] / m["fga"], 4) if m["fga"] else 0.0
        m["series"] = sorted(m["series"])
        result.append(m)

    result.sort(key=lambda x: x["fg_pct"])
    return result


def fetch_wemby_rebounds():
    """
    Collects every rebound event by Wembanyama across all playoff games.
    Uses the preceding missed-shot's coordinates as position proxy
    (rebound events in PlayByPlayV3 rarely carry their own x/y).
    Saves result to wemby_data.json under key "wemby_rebounds".
    """
    print("Collecting Wemby rebound events...\n")
    data_out = {"x": [], "y": [], "type": [], "series": [], "game_num": []}

    for g in KNOWN_GAMES:
        gid   = g["game_id"]
        label = f"{g['serie']} G{g['game_num']}"
        print(f"  {label} ({gid})")
        try:
            time.sleep(1.5)
            r = requests.get(
                "https://stats.nba.com/stats/playbyplayv3",
                params={"GameID": gid, "StartPeriod": 0, "EndPeriod": 10},
                headers=NBA_HEADERS,
                timeout=45,
            )
            actions = r.json()["game"]["actions"]

            last_miss   = None
            game_reb    = 0
            prev_off_ct = 0   # tracks Off: counter from previous Wemby rebound

            for evt in actions:
                atype = evt.get("actionType", "")

                if atype == "Missed Shot":
                    last_miss = evt
                elif atype == "Made Shot":
                    last_miss = None   # reset on made shots

                elif atype == "Rebound" and evt.get("personId") == WEMBY_ID:
                    # Try direct coordinates first, fall back to missed-shot coords
                    x = evt.get("xLegacy")
                    y = evt.get("yLegacy")
                    if (not x and not y) and last_miss:
                        x = last_miss.get("xLegacy")
                        y = last_miss.get("yLegacy")

                    if x is None or y is None:
                        continue

                    # Description format: "Wembanyama REBOUND (Off:X Def:Y)"
                    # Detect offensive rebound by checking if the Off counter incremented
                    import re as _re
                    desc = evt.get("description", "")
                    m = _re.search(r"Off:(\d+)", desc)
                    curr_off = int(m.group(1)) if m else 0
                    reb_type = "off" if curr_off > prev_off_ct else "def"
                    prev_off_ct = curr_off

                    data_out["x"].append(int(x))
                    data_out["y"].append(int(y))
                    data_out["type"].append(reb_type)
                    data_out["series"].append(g["serie"])
                    data_out["game_num"].append(g["game_num"])
                    game_reb += 1

            print(f"    {game_reb} Wemby rebounds captured")
        except Exception as e:
            print(f"    ERROR: {e}")

    total = len(data_out["x"])
    print(f"\n  Total: {total} rebounds")

    # Inject into wemby_data.json + copy to React
    try:
        with open("wemby_data.json") as f:
            wemby = json.load(f)
        wemby["wemby_rebounds"] = data_out
        with open("wemby_data.json", "w") as f:
            json.dump(wemby, f)
        import shutil
        shutil.copy("wemby_data.json", "wemby-field/src/data/wemby_data.json")
        print("  wemby_data.json updated and copied to React\n")
    except Exception as exc:
        print(f"  Error updating wemby_data.json: {exc}")


def fetch_all_lineups():
    """
    Descarga BoxScore + PBP por juego, rastrea quintetos de los Spurs,
    calcula FG% rival por quinteto y actualiza wemby_data.json.
    """
    print("Analizando quintetos por juego...\n")
    all_entries = []

    for g in KNOWN_GAMES:
        gid   = g["game_id"]
        label = f"{g['serie']} G{g['game_num']}"
        print(f"  {label} ({gid})")
        try:
            time.sleep(2.0)
            game_entries = track_game_lineups(gid, SPURS_ID, g["opp_id"], g)
            for e in game_entries.values():
                e["game_ids"] = list(e["game_ids"])
                e["series"]   = list(e["series"])
                all_entries.append(e)
            print(f"    {len(game_entries)} quintetos únicos en este juego")
        except Exception as exc:
            print(f"    ERROR: {exc}")

    lineups = merge_lineup_entries(all_entries)
    print(f"\n  Total de quintetos con ≥15 tiros: {len(lineups)}")

    # Estadística ajustada: promedio ponderado por FGA
    wemby_l    = [l for l in lineups if     l["has_wemby"] and l["fga"] >= 20]
    no_wemby_l = [l for l in lineups if not l["has_wemby"] and l["fga"] >= 20]

    def weighted_fg(lst):
        fgm = sum(l["fgm"] for l in lst)
        fga = sum(l["fga"] for l in lst)
        return round(fgm / fga, 4) if fga else 0.0

    w_pct  = weighted_fg(wemby_l)
    nw_pct = weighted_fg(no_wemby_l)

    summary = {
        "wemby_fg_pct":    w_pct,
        "no_wemby_fg_pct": nw_pct,
        "adjusted_effect": round(nw_pct - w_pct, 4),
        "wemby_fga":       sum(l["fga"] for l in wemby_l),
        "no_wemby_fga":    sum(l["fga"] for l in no_wemby_l),
    }

    print(f"\n  Ajustado por quinteto:")
    print(f"    Con Wemby:    {w_pct:.1%}  ({summary['wemby_fga']} intentos)")
    print(f"    Sin Wemby:    {nw_pct:.1%}  ({summary['no_wemby_fga']} intentos)")
    print(f"    Efecto real:  {summary['adjusted_effect']:+.1%}")

    # Guardar cache de quintetos
    with open(LINEUPS_CACHE, "w") as f:
        json.dump({"lineups": lineups, "summary": summary}, f)
    print(f"\n  Cache guardado: {LINEUPS_CACHE}")

    # Inyectar en wemby_data.json y copiar a React
    try:
        with open("wemby_data.json") as f:
            data = json.load(f)
        data["lineups"] = {"items": lineups, "summary": summary}
        with open("wemby_data.json", "w") as f:
            json.dump(data, f)
        import shutil
        shutil.copy("wemby_data.json", "wemby-field/src/data/wemby_data.json")
        print("  wemby_data.json actualizado y copiado a React")
    except Exception as exc:
        print(f"  No se pudo actualizar wemby_data.json: {exc}")


# ── PROCESAR DATOS ────────────────────────────────────────────────────────────

def dist_profile(distances: list) -> np.ndarray:
    s = pd.to_numeric(pd.Series(distances), errors="coerce").dropna()
    if s.empty:
        return np.zeros(len(ZONE_LABELS))
    zone = pd.cut(s, bins=ZONE_BINS, labels=ZONE_LABELS, right=False)
    counts = zone.value_counts()
    total  = max(counts.sum(), 1)
    return np.array([counts.get(z, 0) / total for z in ZONE_LABELS])


def fg_profile(distances: list, made: list) -> np.ndarray:
    df = pd.DataFrame({
        "dist": pd.to_numeric(pd.Series(distances), errors="coerce"),
        "made": pd.to_numeric(pd.Series(made),      errors="coerce"),
    }).dropna()
    if df.empty:
        return np.zeros(len(ZONE_LABELS))
    df["zone"] = pd.cut(df["dist"], bins=ZONE_BINS, labels=ZONE_LABELS, right=False)
    g = df.groupby("zone", observed=True).agg(m=("made","sum"), a=("made","count"))
    return np.array([
        g.loc[z, "m"] / max(g.loc[z, "a"], 1) if z in g.index else 0.0
        for z in ZONE_LABELS
    ])


def load_cached_data() -> tuple[list[dict], list[dict]]:
    """Regresa (game_rows_on, game_rows_off)."""
    with open(DATA_CACHE) as f:
        cache = json.load(f)

    on_rows, off_rows = [], []
    for gid, d in cache.items():
        base = {**d["meta"]}
        on_rows.append({
            **base,
            "dist_profile": dist_profile(d["on"]["shot_distance"]),
            "fg_profile":   fg_profile(d["on"]["shot_distance"], d["on"]["shot_made"]),
        })
        off_rows.append({
            **base,
            "dist_profile": dist_profile(d["off"]["shot_distance"]),
            "fg_profile":   fg_profile(d["off"]["shot_distance"], d["off"]["shot_made"]),
        })

    print(f"  {len(on_rows)} juegos cargados desde {DATA_CACHE}")
    return on_rows, off_rows


# ── DEMO ──────────────────────────────────────────────────────────────────────

def generate_demo_data() -> tuple[list[dict], list[dict]]:
    rng = np.random.default_rng(42)
    configs = {
        "R1 · POR": {"on_dist": [0.09,0.12,0.21,0.22,0.36], "off_dist": [0.15,0.16,0.22,0.20,0.27],
                     "on_fg":   [0.34,0.38,0.40,0.37,0.35], "off_fg":   [0.48,0.44,0.42,0.39,0.36],
                     "games": 5, "results": ["W","L","W","W","W"]},
        "R2 · MIN": {"on_dist": [0.08,0.11,0.20,0.23,0.38], "off_dist": [0.14,0.15,0.21,0.21,0.29],
                     "on_fg":   [0.31,0.36,0.38,0.37,0.36], "off_fg":   [0.46,0.43,0.41,0.38,0.37],
                     "games": 6, "results": ["L","W","W","L","W","W"]},
        "ECF · OKC": {"on_dist": [0.07,0.10,0.18,0.25,0.40], "off_dist": [0.13,0.14,0.20,0.23,0.30],
                      "on_fg":   [0.28,0.33,0.36,0.38,0.37], "off_fg":   [0.44,0.42,0.40,0.39,0.38],
                      "games": 4, "results": ["W","L","L","W"]},
    }
    on_rows, off_rows = [], []
    for serie, c in configs.items():
        for i in range(c["games"]):
            base = {"serie": serie, "game_num": i+1, "result": c["results"][i]}
            dp_on  = np.clip(np.array(c["on_dist"])  + rng.normal(0,0.02,5), 0.01, None)
            dp_off = np.clip(np.array(c["off_dist"]) + rng.normal(0,0.02,5), 0.01, None)
            on_rows.append({**base,
                "dist_profile": dp_on / dp_on.sum(),
                "fg_profile":   np.clip(np.array(c["on_fg"])  + rng.normal(0,0.025,5), 0, 0.75)})
            off_rows.append({**base,
                "dist_profile": dp_off / dp_off.sum(),
                "fg_profile":   np.clip(np.array(c["off_fg"]) + rng.normal(0,0.025,5), 0, 0.75)})
    return on_rows, off_rows


# ── VISUALIZACIÓN ─────────────────────────────────────────────────────────────

def gradient_line(ax, x, y, colors, lw=3, alpha=1.0, z=5, ls="-"):
    for i in range(len(x) - 1):
        ax.plot(x[i:i+2], y[i:i+2],
                color=colors[i], linewidth=lw, alpha=alpha,
                solid_capstyle="round", linestyle=ls, zorder=z)


def setup_axis(ax, x):
    for xi in x:
        ax.axvline(xi, color="#cccccc", alpha=0.5, linewidth=0.5)
    ax.set_xticks(x)
    ax.set_xticklabels(ZONE_LABELS, color="#555555", fontsize=9, fontfamily="monospace")
    ax.tick_params(colors="#cccccc", which="both")
    ax.spines[:].set_visible(False)
    ax.set_facecolor(BG)
    ax.set_xlim(-0.3, len(ZONE_LABELS) - 0.7)


def create_wemby_field(on_rows: list[dict], off_rows: list[dict],
                       is_demo: bool = False, output: str = "wemby_field.png"):

    x  = np.arange(len(ZONE_LABELS))
    fig, axes = plt.subplots(2, 1, figsize=(15, 11),
                             gridspec_kw={"height_ratios": [1.7, 1.0]})
    fig.patch.set_facecolor(BG)

    # ── Panel 1: distribución de intentos ────────────────────────────────────
    ax1 = axes[0]

    # Líneas fantasma por juego (Wemby ON)
    for r in on_rows:
        c = SERIE_COLOR.get(r["serie"], "#cccccc")
        ax1.plot(x, r["dist_profile"], color=c, alpha=0.15, linewidth=0.9, zorder=2)

    avg_on  = np.mean([r["dist_profile"] for r in on_rows],  axis=0)
    avg_off = np.mean([r["dist_profile"] for r in off_rows], axis=0)

    # Relleno de la brecha ON vs OFF
    ax1.fill_between(x, avg_on, avg_off,
                     where=(avg_on < avg_off),
                     alpha=0.12, color="#cc0022",
                     label="_nolegend_", zorder=3)

    # Línea OFF (punteada, gris)
    gradient_line(ax1, x, avg_off,
                  ["#aaaaaa"] * (len(x)-1), lw=2.0, alpha=0.6, z=5, ls="--")

    # Línea ON (sólida, gradiente)
    gradient_line(ax1, x, avg_on, GRADIENT, lw=4.0, z=7)

    # Punto más frío (zona más evitada cuando Wemby está)
    cold_i = int(np.argmin(avg_on))
    ax1.scatter([cold_i], [avg_on[cold_i]], s=80, color="#cc0022",
                marker="x", linewidths=2.2, zorder=10)
    ax1.annotate("ZONA PROHIBIDA",
                 xy=(cold_i, avg_on[cold_i]),
                 xytext=(cold_i + 0.45, avg_on[cold_i] + 0.025),
                 fontsize=7.5, color="#cc0022", fontfamily="monospace",
                 arrowprops=dict(arrowstyle="->", color="#cc0022", lw=0.8),
                 zorder=11)

    # Leyenda manual
    from matplotlib.lines import Line2D
    legend_items = [
        Line2D([0],[0], color="#555555", lw=3,   label="Wemby EN CANCHA"),
        Line2D([0],[0], color="#aaaaaa", lw=2, linestyle="--", label="Wemby EN BANCA"),
    ]
    for s, c in SERIE_COLOR.items():
        legend_items.append(Line2D([0],[0], color=c, lw=1.8, alpha=0.7, label=s))
    ax1.legend(handles=legend_items, loc="upper right",
               fontsize=7.5, framealpha=0, labelcolor="#333333", handlelength=1.6)

    setup_axis(ax1, x)
    ax1.set_ylabel("SHOT ATTEMPT RATE", color="#888888",
                   fontsize=8, fontfamily="monospace", labelpad=10)
    ax1.set_ylim(bottom=0)

    # ── Panel 2: FG% rival ───────────────────────────────────────────────────
    ax2 = axes[1]

    for r in on_rows:
        c = SERIE_COLOR.get(r["serie"], "#cccccc")
        ax2.plot(x, r["fg_profile"], color=c, alpha=0.13, linewidth=0.8, zorder=2)

    avg_fg_on  = np.mean([r["fg_profile"] for r in on_rows],  axis=0)
    avg_fg_off = np.mean([r["fg_profile"] for r in off_rows], axis=0)

    ax2.fill_between(x, avg_fg_on, avg_fg_off,
                     where=(avg_fg_on < avg_fg_off),
                     alpha=0.10, color="#cc0022", zorder=3)

    gradient_line(ax2, x, avg_fg_off,
                  ["#aaaaaa"] * (len(x)-1), lw=2.0, alpha=0.6, z=5, ls="--")
    gradient_line(ax2, x, avg_fg_on, GRADIENT, lw=3.0, z=7)

    ax2.axhline(0.47, color="#aaaaaa", alpha=0.5, linewidth=0.7, linestyle=":")
    ax2.text(len(x) - 0.95, 0.482, "NBA AVG",
             color="#aaaaaa", fontsize=6, fontfamily="monospace")

    setup_axis(ax2, x)
    ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v:.0%}"))
    ax2.set_ylabel("OPPONENT FG%", color="#888888",
                   fontsize=8, fontfamily="monospace", labelpad=10)
    ax2.set_ylim(0, 0.72)

    # ── Títulos ───────────────────────────────────────────────────────────────
    fig.text(0.5, 0.972, "THE WEMBANYAMA FIELD",
             ha="center", va="top", fontsize=24,
             fontfamily="monospace", color="#111111", fontweight="bold")

    subtitle = "OPPONENT SHOT GEOMETRY — WEMBY ON vs OFF COURT · SPURS PLAYOFFS 2025-26"
    if is_demo:
        subtitle += "  ·  [DEMO]"
    fig.text(0.5, 0.926, subtitle, ha="center", va="top",
             fontsize=7.5, fontfamily="monospace", color="#666666")

    n = len(on_rows)
    fig.text(0.5, 0.907, f"{'─'*22}  {n} GAMES  {'─'*22}",
             ha="center", va="top",
             fontsize=6.5, fontfamily="monospace", color="#cccccc")

    # Estadística clave: diferencia promedio de FG%
    diff = avg_fg_off.mean() - avg_fg_on.mean()
    fig.text(0.5, 0.018,
             f"FG% RIVAL: {avg_fg_on.mean():.1%} con Wemby  ·  "
             f"{avg_fg_off.mean():.1%} sin Wemby  ·  "
             f"DIFERENCIA: {diff:+.1%}",
             ha="center", va="bottom",
             fontsize=7, fontfamily="monospace", color="#555555")

    plt.tight_layout(rect=[0, 0.04, 1, 0.90])
    plt.subplots_adjust(hspace=0.38)
    plt.savefig(output, dpi=300, bbox_inches="tight",
                facecolor=BG, edgecolor="none")
    print(f"\n  Guardado: {output}")
    plt.show()


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    args        = sys.argv[1:]
    do_fetch    = "--fetch"    in args
    do_lineups  = "--lineups"  in args
    do_rebounds = "--rebounds" in args
    do_demo     = "--demo"     in args

    print("\n━━━  THE WEMBANYAMA FIELD  ━━━\n")

    if do_fetch:
        print("Modo FETCH — descargando tiros + stints del NBA API...\n")
        fetch_and_cache()
        print("\nListo. Ahora corre: python wemby_field.py --lineups")
        return

    if do_lineups:
        print("Modo LINEUPS — analizando quintetos defensivos...\n")
        fetch_all_lineups()
        print("\nListo.")
        return

    if do_rebounds:
        print("Modo REBOUNDS — recopilando rebotes de Wembanyama...\n")
        fetch_wemby_rebounds()
        print("Listo.")
        return

    if do_demo:
        print("Modo DEMO — datos sintéticos\n")
        on_rows, off_rows = generate_demo_data()
        is_demo = True
    else:
        try:
            on_rows, off_rows = load_cached_data()
            is_demo = False
        except FileNotFoundError:
            print("  No hay cache. Generando demo...\n")
            on_rows, off_rows = generate_demo_data()
            is_demo = True

    print(f"  → {len(on_rows)} juegos listos\n")
    create_wemby_field(on_rows, off_rows, is_demo=is_demo)
    print("\n━━━  LISTO  ━━━\n")


if __name__ == "__main__":
    main()
