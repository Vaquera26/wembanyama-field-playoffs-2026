import { useState } from 'react'

const COURT_W = 500
const COURT_H = 470
const BIN     = 28

const toSVG = (x, y) => ({ sx: x + 250, sy: COURT_H - (y + 47.5) })

function Court() {
  const color = '#c4c0ba'
  const lw    = 1.2

  const basket  = toSVG(0, 0)
  const paintTL = toSVG(-80, 142.5)
  const paintH  = toSVG(80, -47.5).sy - toSVG(80, 142.5).sy
  const c3L     = toSVG(-220, -47.5)
  const c3R     = toSVG(220, -47.5)
  const c3H     = toSVG(220, -47.5).sy - toSVG(220, 92.5).sy

  const r3  = 237.5
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
        fill="rgba(220,38,38,0.04)" stroke={color} strokeWidth={lw}
      />
      <line x1={c3L.sx} y1={c3L.sy} x2={c3L.sx} y2={c3L.sy - c3H} stroke={color} strokeWidth={lw} />
      <line x1={c3R.sx} y1={c3R.sy} x2={c3R.sx} y2={c3R.sy - c3H} stroke={color} strokeWidth={lw} />
      <path d={arc} fill="none" stroke={color} strokeWidth={lw} />
      <line x1={basket.sx - 30} y1={basket.sy + 8} x2={basket.sx + 30} y2={basket.sy + 8} stroke={color} strokeWidth={lw + 1} />
      <circle cx={basket.sx} cy={basket.sy} r={7.5} fill="none" stroke={color} strokeWidth={lw + 0.5} />
    </g>
  )
}

function HeatLayer({ blocks, activeSerie }) {
  const COLS = Math.ceil(COURT_W / BIN)
  const ROWS = Math.ceil(COURT_H / BIN)
  const grid = new Map()

  blocks.x.forEach((x, i) => {
    if (activeSerie !== 'all' && blocks.serie[i] !== activeSerie) return
    const { sx, sy } = toSVG(x, blocks.y[i])
    if (sx < 0 || sx > COURT_W || sy < 0 || sy > COURT_H) return
    const bc = Math.min(Math.floor(sx / BIN), COLS - 1)
    const br = Math.min(Math.floor(sy / BIN), ROWS - 1)
    const key = `${bc},${br}`
    if (!grid.has(key)) grid.set(key, { bc, br, count: 0 })
    grid.get(key).count++
  })

  const cells    = [...grid.values()].filter(c => c.count >= 1)
  const maxCount = Math.max(...cells.map(c => c.count), 1)

  return (
    <g>
      {cells.map(({ bc, br, count }) => {
        const t = Math.pow(count / maxCount, 0.55)
        const r = Math.round(220 + (255 - 220) * (1 - t))
        const g = Math.round(38  + (100 - 38)  * (1 - t))
        const b = Math.round(38  + (38)        * (1 - t))
        const a = (0.12 + t * 0.78).toFixed(2)
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

function BlockDots({ blocks, activeSerie }) {
  return (
    <g>
      {blocks.x.map((x, i) => {
        if (activeSerie !== 'all' && blocks.serie[i] !== activeSerie) return null
        const { sx, sy } = toSVG(x, blocks.y[i])
        if (sx < 0 || sx > COURT_W || sy < 0 || sy > COURT_H) return null
        return (
          <circle
            key={i}
            cx={sx} cy={sy} r={4.5}
            fill="rgba(220,38,38,0.55)"
            stroke="rgba(220,38,38,0.9)"
            strokeWidth={0.8}
          />
        )
      })}
    </g>
  )
}

const SERIES_KEYS = ['R1 · POR', 'R2 · MIN', 'ECF · OKC']
const SERIES_LABELS = { en: ['Round 1', 'Round 2', 'Conf. Finals'], es: ['Ronda 1', 'Ronda 2', 'Finales de Conf.'] }

const BM_T = {
  en: {
    total: 'Total Blocks',
    all: 'All Series',
    heat: 'Heat Map',
    dots: 'Shot Dots',
    caption: n => `${n} blocks mapped across 15 playoff games. Coordinates represent the origin of the blocked shot attempt. Red intensity = higher block concentration.`,
    empty: 'No block data available',
  },
  es: {
    total: 'Total Bloqueos',
    all: 'Todas las Series',
    heat: 'Mapa de Calor',
    dots: 'Puntos',
    caption: n => `${n} bloqueos mapeados en 15 partidos de playoffs. Las coordenadas representan el origen del intento de tiro bloqueado. Mayor intensidad roja = mayor concentración de bloqueos.`,
    empty: 'No hay datos de bloqueos disponibles',
  },
}

export default function BlockMap({ blockData, lang = 'en' }) {
  const [activeSerie, setActiveSerie] = useState('all')
  const [mode, setMode]               = useState('heat')

  const bt = BM_T[lang] || BM_T.en
  const serieLabels = SERIES_LABELS[lang] || SERIES_LABELS.en

  if (!blockData || !blockData.x || !blockData.x.length) {
    return <p style={{ color: '#9a9aaa', fontFamily: 'monospace', fontSize: 12 }}>{bt.empty}</p>
  }

  const visibleCount = activeSerie === 'all'
    ? blockData.x.length
    : blockData.x.filter((_, i) => blockData.serie[i] === activeSerie).length

  const btnBase = {
    fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 600,
    padding: '5px 14px', borderRadius: 4, cursor: 'pointer', border: '1px solid #e0e0e8',
    letterSpacing: '0.05em',
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <button
          style={{ ...btnBase, background: activeSerie === 'all' ? '#08080f' : '#fff', color: activeSerie === 'all' ? '#fff' : '#38384a' }}
          onClick={() => setActiveSerie('all')}
        >{bt.all}</button>
        {SERIES_KEYS.map((sk, idx) => (
          <button
            key={sk}
            style={{ ...btnBase, background: activeSerie === sk ? '#08080f' : '#fff', color: activeSerie === sk ? '#fff' : '#38384a' }}
            onClick={() => setActiveSerie(activeSerie === sk ? 'all' : sk)}
          >{serieLabels[idx]}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[['heat', bt.heat], ['dots', bt.dots]].map(([m, label]) => (
            <button
              key={m}
              style={{ ...btnBase, background: mode === m ? '#08080f' : '#fff', color: mode === m ? '#fff' : '#38384a' }}
              onClick={() => setMode(m)}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ flex: '0 0 auto' }}>
          <svg width={COURT_W} height={COURT_H} style={{ maxWidth: '100%', display: 'block' }}>
            <Court />
            {mode === 'heat'
              ? <HeatLayer blocks={blockData} activeSerie={activeSerie} />
              : <BlockDots blocks={blockData} activeSerie={activeSerie} />}
          </svg>
          <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#9a9aaa', marginTop: 8, maxWidth: COURT_W }}>
            {bt.caption(visibleCount)}
          </p>
        </div>

        {/* Count badge */}
        <div style={{ paddingTop: 16 }}>
          <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#9a9aaa', letterSpacing: '0.15em', margin: '0 0 4px' }}>
            {bt.total.toUpperCase()}
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: 40, fontWeight: 700, color: '#dc2626', margin: 0, lineHeight: 1 }}>
            {visibleCount}
          </p>
        </div>
      </div>
    </div>
  )
}
