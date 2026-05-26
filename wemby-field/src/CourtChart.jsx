// NBA Shot Chart — cancha SVG con coordenadas reales de shots
// LOC_X: -250 a 250 (izquierda → derecha, basket al centro)
// LOC_Y: -50 a 422  (baseline → medio campo)

import { useState } from 'react'

const COURT_W = 500   // ancho total en unidades NBA
const COURT_H = 470   // de baseline a medio campo
const NBA_AVG  = 0.47

// Convierte coordenadas NBA → SVG
const toSVG = (x, y) => ({
  sx: x + 250,
  sy: COURT_H - (y + 47.5),
})

// ── CANCHA ────────────────────────────────────────────────────────────────────
function Court({ color = '#cccccc', fill = '#fafafa' }) {
  const lw = 1.5

  // Arco tres puntos
  // Radio: 237.5 unidades. Esquinas en x=±220, salen desde y≈-47.5 hasta y≈92.5
  // Ángulo donde el arco toca la línea de esquina: arcsin(220/237.5) ≈ 67.7°
  // El arco va de ~22.3° a ~157.7° (medido desde eje X positivo)
  const r3  = 237.5
  const cx3 = COURT_W / 2   // centro en SVG
  const cy3 = toSVG(0, 0).sy

  // Puntos del arco (parametric)
  const arcPoints = []
  for (let deg = 22.3; deg <= 157.7; deg += 2) {
    const rad = (deg * Math.PI) / 180
    arcPoints.push({
      x: cx3 + r3 * Math.cos(rad),
      y: cy3 - r3 * Math.sin(rad),
    })
  }
  const arcPath = arcPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  // Arco zona restringida (radio 40)
  const rRA = 40
  const raPoints = []
  for (let deg = 0; deg <= 180; deg += 3) {
    const rad = (deg * Math.PI) / 180
    raPoints.push({
      x: cx3 + rRA * Math.cos(rad),
      y: cy3 - rRA * Math.sin(rad),
    })
  }
  const raPath = raPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  // Arco tiro libre (radio 60, semicírculo superior)
  const ftCenter = toSVG(0, 142.5)
  const rFT = 60
  const ftTop = []
  const ftBot = []
  for (let deg = 0; deg <= 180; deg += 3) {
    const rad = (deg * Math.PI) / 180
    ftTop.push({ x: ftCenter.sx + rFT * Math.cos(rad), y: ftCenter.sy - rFT * Math.sin(rad) })
  }
  for (let deg = 180; deg <= 360; deg += 3) {
    const rad = (deg * Math.PI) / 180
    ftBot.push({ x: ftCenter.sx + rFT * Math.cos(rad), y: ftCenter.sy - rFT * Math.sin(rad) })
  }
  const ftTopPath = ftTop.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const ftBotPath = ftBot.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  const basket  = toSVG(0, 0)
  const paintTL = toSVG(-80, 142.5)
  const paintBL = toSVG(-80, -47.5)
  const paintW  = 160
  const paintH  = toSVG(80, -47.5).sy - toSVG(80, 142.5).sy

  const innerTL = toSVG(-60, 142.5)
  const innerW  = 120

  const c3L = toSVG(-220, -47.5)
  const c3R = toSVG(220, -47.5)
  const c3H = toSVG(220, -47.5).sy - toSVG(220, 92.5).sy

  return (
    <g>
      {/* Fondo */}
      <rect x={0} y={0} width={COURT_W} height={COURT_H} fill={fill} rx={4} />

      {/* Borde cancha */}
      <rect x={0} y={0} width={COURT_W} height={COURT_H}
        fill="none" stroke={color} strokeWidth={lw} />

      {/* Pintura exterior */}
      <rect x={paintTL.sx} y={paintTL.sy} width={paintW} height={paintH}
        fill="none" stroke={color} strokeWidth={lw} />

      {/* Pintura interior */}
      <rect x={innerTL.sx} y={innerTL.sy} width={innerW} height={paintH}
        fill="none" stroke={color} strokeWidth={lw} opacity={0.4} />

      {/* Línea esquina izquierda */}
      <line x1={c3L.sx} y1={c3L.sy} x2={c3L.sx} y2={c3L.sy - c3H}
        stroke={color} strokeWidth={lw} />

      {/* Línea esquina derecha */}
      <line x1={c3R.sx} y1={c3R.sy} x2={c3R.sx} y2={c3R.sy - c3H}
        stroke={color} strokeWidth={lw} />

      {/* Arco de tres puntos */}
      <path d={arcPath} fill="none" stroke={color} strokeWidth={lw} />

      {/* Arco zona restringida */}
      <path d={raPath} fill="none" stroke={color} strokeWidth={lw} opacity={0.5} />

      {/* Arco tiro libre superior */}
      <path d={ftTopPath} fill="none" stroke={color} strokeWidth={lw} />

      {/* Arco tiro libre inferior (punteado) */}
      <path d={ftBotPath} fill="none" stroke={color} strokeWidth={lw}
        strokeDasharray="4 3" opacity={0.5} />

      {/* Tablero */}
      <line
        x1={basket.sx - 30} y1={basket.sy + 8}
        x2={basket.sx + 30} y2={basket.sy + 8}
        stroke={color} strokeWidth={lw + 1} />

      {/* Aro */}
      <circle cx={basket.sx} cy={basket.sy} r={7.5}
        fill="none" stroke={color} strokeWidth={lw + 0.5} />
    </g>
  )
}

// ── SHOTS ─────────────────────────────────────────────────────────────────────
function Shots({ shots, color, madeColor, r = 3, opacity = 0.65 }) {
  return (
    <g>
      {shots.x.map((x, i) => {
        const { sx, sy } = toSVG(x, shots.y[i])
        // Solo mostrar media cancha ofensiva
        if (sy < 0 || sy > COURT_H) return null
        const made = shots.made[i] === 1
        return (
          <circle
            key={i}
            cx={sx} cy={sy} r={r}
            fill={made ? madeColor : 'transparent'}
            stroke={made ? madeColor : color}
            strokeWidth={made ? 0 : 1.2}
            opacity={opacity}
          />
        )
      })}
    </g>
  )
}

// ── HEAT MAP ──────────────────────────────────────────────────────────────────
function HeatMap({ shots }) {
  const BIN = 26
  const grid = new Map()

  shots.x.forEach((x, i) => {
    const { sx, sy } = toSVG(x, shots.y[i])
    if (sy < 0 || sy > COURT_H) return
    const bx = Math.floor(sx / BIN)
    const by = Math.floor(sy / BIN)
    const key = `${bx},${by}`
    if (!grid.has(key)) grid.set(key, { bx, by, made: 0, total: 0 })
    const c = grid.get(key)
    c.total++
    if (shots.made[i] === 1) c.made++
  })

  const cells = [...grid.values()].filter(c => c.total >= 3)
  const maxTotal = Math.max(...cells.map(c => c.total), 1)

  return (
    <g>
      {cells.map(({ bx, by, made, total }) => {
        const pct    = made / total
        const density = Math.pow(total / maxTotal, 0.55)
        const diff   = pct - NBA_AVG

        let r, g, b
        if      (diff <= -0.12) { r = 29;  g = 78;  b = 216 }
        else if (diff <= -0.05) { r = 96;  g = 165; b = 250 }
        else if (diff <=  0.05) { r = 160; g = 160; b = 172 }
        else if (diff <=  0.12) { r = 248; g = 113; b = 113 }
        else                    { r = 185; g = 28;  b = 28  }

        return (
          <rect
            key={`${bx},${by}`}
            x={bx * BIN + 1} y={by * BIN + 1}
            width={BIN - 2} height={BIN - 2}
            fill={`rgba(${r},${g},${b},${(density * 0.78).toFixed(2)})`}
            rx={4}
          />
        )
      })}
    </g>
  )
}

// ── PANEL ─────────────────────────────────────────────────────────────────────
function CourtPanel({ title, shots, color, madeColor, totalShots, made, viewMode, scored = 'scored', attempts = 'attempts' }) {
  const pct = totalShots > 0 ? ((made / totalShots) * 100).toFixed(1) : '—'
  return (
    <div className="court-panel">
      <div className="court-panel-header">
        <span className="court-panel-title" style={{ color }}>{title}</span>
        <span className="court-panel-stat">
          <strong>{pct}%</strong> {scored} · {totalShots} {attempts}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${COURT_W} ${COURT_H}`}
        style={{ width: '100%', display: 'block' }}
      >
        <Court color="#b0b0bc" fill="#f5f5f8" />
        {viewMode === 'heat'
          ? <HeatMap shots={shots} />
          : <Shots shots={shots} color={color} madeColor={madeColor} />
        }
      </svg>
    </div>
  )
}

// ── MERGE SHOTS ───────────────────────────────────────────────────────────────
function mergeShots(seriesData, keys) {
  const merged = { x: [], y: [], made: [] }
  keys.forEach(sk => {
    const s = seriesData[sk]?.shots
    if (!s) return
    merged.x    = merged.x.concat(s.on.x)
    merged.y    = merged.y.concat(s.on.y)
    merged.made = merged.made.concat(s.on.made)
  })
  return merged
}

function mergeShotsOff(seriesData, keys) {
  const merged = { x: [], y: [], made: [] }
  keys.forEach(sk => {
    const s = seriesData[sk]?.shots
    if (!s) return
    merged.x    = merged.x.concat(s.off.x)
    merged.y    = merged.y.concat(s.off.y)
    merged.made = merged.made.concat(s.off.made)
  })
  return merged
}

// ── TRANSLATIONS ──────────────────────────────────────────────────────────────

const CC_T = {
  en: {
    shot_dots: 'Shot Dots',
    heat_map:  'Heat Map',
    on_title:  'WEMBY ON COURT',
    off_title: 'WEMBY ON BENCH',
    scored:    'scored',
    attempts:  'attempts',
    heat_legend: [
      { color: '#1d4ed8', label: 'Great defense (rival far below avg)' },
      { color: '#60a5fa', label: 'Good defense' },
      { color: '#a0a0ac', label: 'Average' },
      { color: '#f87171', label: 'Below average' },
      { color: '#b91c1c', label: 'Poor defense (rival far above avg)' },
    ],
  },
  es: {
    shot_dots: 'Puntos de Tiro',
    heat_map:  'Mapa de Calor',
    on_title:  'WEMBY EN CANCHA',
    off_title: 'WEMBY EN BANCA',
    scored:    'anotados',
    attempts:  'intentos',
    heat_legend: [
      { color: '#1d4ed8', label: 'Gran defensa (rival muy por debajo del prom.)' },
      { color: '#60a5fa', label: 'Buena defensa' },
      { color: '#a0a0ac', label: 'Promedio' },
      { color: '#f87171', label: 'Por debajo del prom.' },
      { color: '#b91c1c', label: 'Defensa pobre (rival muy por encima del prom.)' },
    ],
  },
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
export default function CourtChart({ seriesKey, seriesData, lang = 'en' }) {
  const [viewMode, setViewMode] = useState('dots')
  const ct = CC_T[lang] ?? CC_T.en

  const ALL_KEYS = Object.keys(seriesData)
  const isAll = seriesKey === 'ALL'

  const on  = isAll ? mergeShots(seriesData, ALL_KEYS)    : seriesData[seriesKey].shots.on
  const off = isAll ? mergeShotsOff(seriesData, ALL_KEYS) : seriesData[seriesKey].shots.off

  const onMade  = on.made.reduce((a, v) => a + v, 0)
  const offMade = off.made.reduce((a, v) => a + v, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <div className="toggle-group">
          <button
            className={`toggle-btn${viewMode === 'dots' ? ' active' : ''}`}
            onClick={() => setViewMode('dots')}
          >{ct.shot_dots}</button>
          <button
            className={`toggle-btn${viewMode === 'heat' ? ' active' : ''}`}
            onClick={() => setViewMode('heat')}
          >{ct.heat_map}</button>
        </div>
      </div>

      {viewMode === 'heat' && (
        <div style={{ display: 'flex', gap: 16, padding: '0 0 8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {ct.heat_legend.map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: '#7a7a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="court-chart">
        <CourtPanel
          title={ct.on_title}
          shots={on}
          color="#1d4ed8"
          madeColor="#16a34a"
          totalShots={on.x.length}
          made={onMade}
          viewMode={viewMode}
          scored={ct.scored}
          attempts={ct.attempts}
        />
        <CourtPanel
          title={ct.off_title}
          shots={off}
          color="#999999"
          madeColor="#888888"
          totalShots={off.x.length}
          made={offMade}
          viewMode={viewMode}
          scored={ct.scored}
          attempts={ct.attempts}
        />
      </div>
    </div>
  )
}
