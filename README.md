# The Wembanyama Field

**Live:** https://vaquera26.github.io/wemby-field-2026/

Spatial analytics study of Victor Wembanyama's defensive impact during the San Antonio Spurs' 2025–26 NBA Playoff run. Rather than reducing his effect to a single number, this project maps the full spatial deformation of opponent shot distributions when Wembanyama is on versus off the court.

---

## Key Findings

| Condition | Opponent FG% | Attempts |
|---|---|---|
| Wemby on court | **39.8%** | 900 |
| Wemby on bench | **43.3%** | 471 |
| **Field Effect** | **+3.5 pp** | — |

The aggregate number understates the effect. The more revealing signal is spatial:

- **−7.6 pp fewer restricted area attempts** when Wemby is on court (26.4% → 34.0% of shot diet)
- **+5.9 pp more mid-range attempts** — opponents pushed out of the paint
- **Corner 3 FG% drops from 36.7% → 29.7%** even on shots he isn't directly contesting

The data suggests Wembanyama's impact is primarily a **shot selection effect**: he doesn't just contest shots at the rim — he prevents opponents from getting there in the first place.

---

## Stack

- React 19 + Vite
- Tailwind CSS v4
- Recharts
- NBA Stats API (PlayByPlayV3, ShotChartDetail)
- Custom SVG court rendering

---

## Methodology

Shot data retrieved from the NBA Stats API for all 15 Spurs playoff games (2025–26). Wembanyama's on/off status is determined by tracking substitution events in the play-by-play log. The vector field is computed via finite differences on a 36-unit bin grid — each arrow represents ∇Δρ, the spatial gradient of the shot density difference between on/off conditions.

Full methodology available in the app's Methodology section.

---

## Run locally

```bash
git clone https://github.com/Vaquera26/wemby-field-2026.git
cd wemby-field-2026/wemby-field
npm install
npm run dev
```

---

## Author

**Juan Vaquera** — [GitHub](https://github.com/vaquera26) · [LinkedIn](https://www.linkedin.com/in/juan-vaquera-ln)
