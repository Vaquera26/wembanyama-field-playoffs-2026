// Defensive vector field — ∇Δρ shows how Wemby displaces opponent shots spatially

const COURT_W = 500
const COURT_H = 470
const BIN     = 36

const COLS = Math.ceil(COURT_W / BIN)
const ROWS = Math.ceil(COURT_H / BIN)

const toSVG = (x, y) => ({ sx: x + 250, sy: COURT_H - (y + 47.5) })

// ── DATA PIPELINE ─────────────────────────────────────────────────────────────

function merge(seriesData, keys, side) {
  const out = { x: [], y: [] }
  keys.forEach(k => {
    const s = seriesData[k]?.shots?.[side]
    if (!s) return
    out.x.push(...s.x)
    out.y.push(...s.y)
  })
  return out
}

function density(shots) {
  const grid = new Float64Array(COLS * ROWS)
  let n = 0
  shots.x.forEach((x, i) => {
    const { sx, sy } = toSVG(x, shots.y[i])
    if (sx < 0 || sx > COURT_W || sy < 0 || sy > COURT_H) return
    const c = Math.min(Math.floor(sx / BIN), COLS - 1)
    const r = Math.min(Math.floor(sy / BIN), ROWS - 1)
    grid[r * COLS + c]++
    n++
  })
  const total = Math.max(n, 1)
  return { data: Array.from(grid).map(v => v / total), n }
}

function buildArrows(seriesData, keys) {
  const on  = density(merge(seriesData, keys, 'on'))
  const off = density(merge(seriesData, keys, 'off'))
  const nOn  = on.n
  const nOff = off.n

  const delta = on.data.map((v, i) => v - off.data[i])

  const arrows = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c
      const volume = on.data[idx] * nOn + off.data[idx] * nOff
      if (volume < 3) continue

      const d = (dr, dc) => {
        const rr = r + dr, cc = c + dc
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return delta[idx]
        return delta[rr * COLS + cc]
      }

      const gx = (d(0, 1) - d(0, -1)) / 2
      const gy = (d(1, 0) - d(-1, 0)) / 2
      const mag = Math.sqrt(gx * gx + gy * gy)
      if (mag < 1e-7) continue

      arrows.push({
        cx: (c + 0.5) * BIN,
        cy: (r + 0.5) * BIN,
        gx, gy, mag,
        delta: delta[idx],
      })
    }
  }
  return arrows
}

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
        fill="rgba(29,78,216,0.03)" stroke={color} strokeWidth={lw}
      />
      <line x1={c3L.sx} y1={c3L.sy} x2={c3L.sx} y2={c3L.sy - c3H} stroke={color} strokeWidth={lw} />
      <line x1={c3R.sx} y1={c3R.sy} x2={c3R.sx} y2={c3R.sy - c3H} stroke={color} strokeWidth={lw} />
      <path d={arc} fill="none" stroke={color} strokeWidth={lw} />
      <line x1={basket.sx - 30} y1={basket.sy + 8} x2={basket.sx + 30} y2={basket.sy + 8} stroke={color} strokeWidth={lw + 1} />
      <circle cx={basket.sx} cy={basket.sy} r={7.5} fill="none" stroke={color} strokeWidth={lw + 0.5} />
    </g>
  )
}

// ── ARROW ─────────────────────────────────────────────────────────────────────

function Arrow({ cx, cy, gx, gy, mag, maxMag, delta }) {
  const len = BIN * 0.46 * Math.pow(mag / maxMag, 0.5)
  if (len < 2) return null

  const nx = gx / mag
  const ny = gy / mag
  const ex = cx + nx * len
  const ey = cy + ny * len

  const d = delta
  let r, g, b
  if      (d <= -0.009) { r = 29;  g = 78;  b = 216 }
  else if (d <= -0.003) { r = 96;  g = 165; b = 250 }
  else if (d <=  0.003) { r = 140; g = 140; b = 158 }
  else if (d <=  0.009) { r = 248; g = 113; b = 113 }
  else                  { r = 185; g = 28;  b = 28  }

  const opacity = (0.35 + Math.pow(mag / maxMag, 0.45) * 0.6).toFixed(2)
  const color   = `rgba(${r},${g},${b},${opacity})`

  const headLen = Math.min(len * 0.4, 8)
  const angle   = Math.atan2(ny, nx)
  const hx1 = ex - headLen * Math.cos(angle - Math.PI / 5.5)
  const hy1 = ey - headLen * Math.sin(angle - Math.PI / 5.5)
  const hx2 = ex - headLen * Math.cos(angle + Math.PI / 5.5)
  const hy2 = ey - headLen * Math.sin(angle + Math.PI / 5.5)

  return (
    <g>
      <line
        x1={cx.toFixed(1)} y1={cy.toFixed(1)}
        x2={ex.toFixed(1)} y2={ey.toFixed(1)}
        stroke={color} strokeWidth={1.6} strokeLinecap="round"
      />
      <polygon
        points={`${ex.toFixed(1)},${ey.toFixed(1)} ${hx1.toFixed(1)},${hy1.toFixed(1)} ${hx2.toFixed(1)},${hy2.toFixed(1)}`}
        fill={color}
      />
    </g>
  )
}

// ── TRANSLATIONS ──────────────────────────────────────────────────────────────

const VF_T = {
  en: {
    suppressed: 'Shots suppressed by Wemby',
    neutral:    'Neutral zone',
    redirected: 'Shots redirected here',
    note:       'Arrow direction = gradient of shot displacement (∇Δρ)',
    caption:    n => `Figure 1: Defensive vector field ∇Δρ — each arrow represents one ${n}×${n}-unit court zone. Direction shows where shot pressure flows when Wembanyama enters the game. Magnitude scales with displacement strength.`,
  },
  es: {
    suppressed: 'Tiros suprimidos por Wemby',
    neutral:    'Zona neutral',
    redirected: 'Tiros redirigidos aquí',
    note:       'Dirección de flecha = gradiente del desplazamiento de tiros (∇Δρ)',
    caption:    n => `Figura 1: Campo vectorial defensivo ∇Δρ — cada flecha representa una zona de ${n}×${n} unidades de cancha. La dirección muestra hacia dónde fluye la presión de tiro cuando Wembanyama entra al partido.`,
  },
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

export default function VectorField({ seriesData, activeSeries, lang = 'en' }) {
  const vt     = VF_T[lang] ?? VF_T.en
  const keys   = activeSeries?.length ? activeSeries : Object.keys(seriesData)
  const arrows = buildArrows(seriesData, keys)
  const maxMag = Math.max(...arrows.map(a => a.mag), 0.001)

  return (
    <div className="vector-field-wrap">
      <svg
        viewBox={`0 0 ${COURT_W} ${COURT_H}`}
        className="vector-field-svg"
      >
        <Court />
        {arrows.map((a, i) => <Arrow key={i} {...a} maxMag={maxMag} />)}
      </svg>

      <div className="vector-legend">
        {[
          { color: '#1d4ed8', label: vt.suppressed },
          { color: '#a0a0b0', label: vt.neutral    },
          { color: '#dc2626', label: vt.redirected },
        ].map(({ color, label }) => (
          <div key={label} className="vector-legend-item">
            <div className="vector-legend-swatch" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
        <span className="vector-legend-sep">·</span>
        <span className="vector-legend-note">{vt.note}</span>
      </div>

      <p className="figure-caption">{vt.caption(BIN)}</p>
    </div>
  )
}
