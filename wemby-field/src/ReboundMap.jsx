// Wembanyama rebound heat map — playoff positioning
// Coordinates are from the preceding missed shot (shot origin → rebound zone proxy)

import { useState } from 'react'

const COURT_W = 500
const COURT_H = 470
const BIN     = 28

const toSVG = (x, y) => ({ sx: x + 250, sy: COURT_H - (y + 47.5) })

// ── COURT (minimal) ───────────────────────────────────────────────────────────

function Court() {
  const color = '#c4c0ba'
  const lw    = 1.2

  const basket  = toSVG(0, 0)
  const paintTL = toSVG(-80, 142.5)
  const paintH  = toSVG(80, -47.5).sy - toSVG(80, 142.5).sy
  const c3L     = toSVG(-220, -47.5)
  const c3R     = toSVG(220, -47.5)
  const c3H     = toSVG(220, -47.5).sy - toSVG(220, 92.5).sy

  const r3 = 237.5
  const cx3 = COURT_W / 2
  const cy3 = toSVG(0, 0).sy
  const pts = []
  for (let deg = 22.3; deg <= 157.7; deg += 3) {
    const rad = (deg * Math.PI) / 180
    pts.push({ x: cx3 + r3 * Math.cos(rad), y: cy3 - r3 * Math.sin(rad) })
  }
  const arc = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  return (
    <g>
      <rect width={COURT_W} height={COURT_H} fill="#f8f7f4" />
      <rect width={COURT_W} height={COURT_H} fill="none" stroke={color} strokeWidth={lw} />
      <rect
        x={paintTL.sx} y={paintTL.sy} width={160} height={paintH}
        fill="rgba(67,56,202,0.04)" stroke={color} strokeWidth={lw}
      />
      <line x1={c3L.sx} y1={c3L.sy} x2={c3L.sx} y2={c3L.sy - c3H} stroke={color} strokeWidth={lw} />
      <line x1={c3R.sx} y1={c3R.sy} x2={c3R.sx} y2={c3R.sy - c3H} stroke={color} strokeWidth={lw} />
      <path d={arc} fill="none" stroke={color} strokeWidth={lw} />
      <line x1={basket.sx - 30} y1={basket.sy + 8} x2={basket.sx + 30} y2={basket.sy + 8} stroke={color} strokeWidth={lw + 1} />
      <circle cx={basket.sx} cy={basket.sy} r={7.5} fill="none" stroke={color} strokeWidth={lw + 0.5} />
    </g>
  )
}

// ── HEAT MAP ──────────────────────────────────────────────────────────────────

function HeatLayer({ rebounds, filter }) {
  const COLS = Math.ceil(COURT_W / BIN)
  const ROWS = Math.ceil(COURT_H / BIN)
  const grid = new Map()

  rebounds.x.forEach((x, i) => {
    if (filter !== 'all' && rebounds.type[i] !== filter) return
    const { sx, sy } = toSVG(x, rebounds.y[i])
    if (sx < 0 || sx > COURT_W || sy < 0 || sy > COURT_H) return
    const bc = Math.min(Math.floor(sx / BIN), COLS - 1)
    const br = Math.min(Math.floor(sy / BIN), ROWS - 1)
    const key = `${bc},${br}`
    if (!grid.has(key)) grid.set(key, { bc, br, count: 0 })
    grid.get(key).count++
  })

  const cells   = [...grid.values()].filter(c => c.count >= 1)
  const maxCount = Math.max(...cells.map(c => c.count), 1)

  return (
    <g>
      {cells.map(({ bc, br, count }) => {
        const t = Math.pow(count / maxCount, 0.55)
        // Cool indigo at low density → warm purple/violet at high density
        const r = Math.round(67  + (139 - 67)  * t)
        const g = Math.round(56  + (92  - 56)  * t)
        const b = Math.round(202 + (246 - 202) * (1 - t))
        const a = (0.12 + t * 0.75).toFixed(2)
        return (
          <rect
            key={`${bc},${br}`}
            x={bc * BIN + 1} y={br * BIN + 1}
            width={BIN - 2} height={BIN - 2}
            fill={`rgba(${r},${g},${b},${a})`}
            rx={3}
          />
        )
      })}
    </g>
  )
}

// ── TRANSLATIONS ──────────────────────────────────────────────────────────────

const RM_T = {
  en: {
    total:     'Total Rebounds',
    defensive: 'Defensive',
    offensive: 'Offensive',
    all:       'All',
    zones:     ['Paint', 'Mid-Range', 'Above 3'],
    caption:   n => `Figure 3: Wembanyama rebound positioning — 2025–26 NBA Playoffs (${n} rebounds). Intensity indicates rebound density. Coordinates represent the origin of the preceding missed field goal attempt (shot-origin proxy). Indigo = high rebound concentration.`,
    empty:     'Run python wemby_field.py --rebounds to generate rebound data',
  },
  es: {
    total:     'Total Rebotes',
    defensive: 'Defensivos',
    offensive: 'Ofensivos',
    all:       'Todos',
    zones:     ['Pintura', 'Tiro Medio', 'Sobre 3'],
    caption:   n => `Figura 3: Posicionamiento de rebotes de Wembanyama — Playoffs NBA 2025–26 (${n} rebotes). La intensidad indica la densidad de rebotes. Las coordenadas representan el origen del tiro fallado anterior. Índigo = alta concentración de rebotes.`,
    empty:     'Ejecuta python wemby_field.py --rebounds para generar datos de rebote',
  },
}

// ── ZONE LABELS ───────────────────────────────────────────────────────────────

function ZoneAnnotations({ rebounds, filter, zoneLabels }) {
  const zones = [
    { label: zoneLabels[0], x: [150, 350], y: [270, 470], svgX: 250, svgY: 400 },
    { label: zoneLabels[1], x: [80,  420], y: [100, 270], svgX: 250, svgY: 200 },
    { label: zoneLabels[2], x: [0,   500], y: [0,   100], svgX: 250, svgY: 55  },
  ]

  return (
    <g>
      {zones.map(z => {
        const count = rebounds.x.filter((x, i) => {
          if (filter !== 'all' && rebounds.type[i] !== filter) return false
          const { sx, sy } = toSVG(x, rebounds.y[i])
          return sx >= z.x[0] && sx <= z.x[1] && sy >= z.y[0] && sy <= z.y[1]
        }).length
        if (count === 0) return null
        const total = filter === 'all'
          ? rebounds.x.length
          : rebounds.x.filter((_, i) => rebounds.type[i] === filter).length
        const pct = total > 0 ? Math.round(count / total * 100) : 0
        return (
          <g key={z.label}>
            <text
              x={z.svgX} y={z.svgY}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={9}
              fontWeight={700}
              fill="rgba(67,56,202,0.7)"
              letterSpacing={1}
            >
              {pct}%
            </text>
            <text
              x={z.svgX} y={z.svgY + 12}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={7}
              fill="rgba(67,56,202,0.45)"
              letterSpacing={0.5}
            >
              {z.label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

export default function ReboundMap({ reboundData, lang = 'en' }) {
  const [filter, setFilter] = useState('all')
  const rt = RM_T[lang] ?? RM_T.en

  if (!reboundData || !reboundData.x?.length) {
    return (
      <div className="rebound-map-empty">
        <p><code>{rt.empty}</code></p>
      </div>
    )
  }

  const defCount = reboundData.type.filter(t => t === 'def').length
  const offCount = reboundData.type.filter(t => t === 'off').length
  const total    = reboundData.x.length

  return (
    <div className="rebound-map-wrap">
      <div className="rebound-map-header">
        <div className="rebound-map-stats">
          <div className="reb-stat">
            <span className="reb-stat-val">{total}</span>
            <span className="reb-stat-label">{rt.total}</span>
          </div>
          <div className="reb-stat">
            <span className="reb-stat-val">{defCount}</span>
            <span className="reb-stat-label">{rt.defensive}</span>
          </div>
          <div className="reb-stat">
            <span className="reb-stat-val">{offCount}</span>
            <span className="reb-stat-label">{rt.offensive}</span>
          </div>
        </div>
        <div className="toggle-group">
          {[['all', rt.all], ['def', rt.defensive], ['off', rt.offensive]].map(([v, l]) => (
            <button
              key={v}
              className={`toggle-btn${filter === v ? ' active' : ''}`}
              onClick={() => setFilter(v)}
            >{l}</button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${COURT_W} ${COURT_H}`}
        className="rebound-map-svg"
      >
        <Court />
        <HeatLayer rebounds={reboundData} filter={filter} />
        <ZoneAnnotations rebounds={reboundData} filter={filter} zoneLabels={rt.zones} />
      </svg>

      <p className="figure-caption" style={{ marginTop: 10 }}>
        {rt.caption(total)}
      </p>
    </div>
  )
}
