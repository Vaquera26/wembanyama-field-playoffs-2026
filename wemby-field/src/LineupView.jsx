// Análisis de quintetos defensivos — diseñado para ser legible sin jerga

const NBA_AVG_FG = 0.47

const SERIES_META = {
  'R1 · POR':  { teamId: 1610612757, label: 'R1 · POR', color: '#777777' },
  'R2 · MIN':  { teamId: 1610612750, label: 'R2 · MIN', color: '#1d66cc' },
  'ECF · OKC': { teamId: 1610612760, label: 'CF · OKC', color: '#dc2626' },
}

const teamLogo = (teamId) =>
  `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`

function ScoreBar({ pct }) {
  const width = Math.min((pct / 0.70) * 100, 100)
  const good  = pct < NBA_AVG_FG
  const color = good
    ? `rgba(52, 211, 153, ${0.5 + (NBA_AVG_FG - pct) * 4})`
    : `rgba(248, 113, 113, ${0.5 + (pct - NBA_AVG_FG) * 4})`

  return (
    <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, height: '100%',
        width: `${width}%`, background: color, borderRadius: 3,
        boxShadow: `0 0 8px ${color}`,
      }} />
      {/* marca del promedio NBA */}
      <div style={{
        position: 'absolute',
        left: `${(NBA_AVG_FG / 0.70) * 100}%`,
        top: -3, bottom: -3, width: 1,
        background: 'rgba(255,255,255,0.25)',
      }} />
    </div>
  )
}

function UnitCard({ lineup, rank }) {
  const pct     = lineup.fg_pct
  const made    = Math.round(pct * 100)         // de cada 100 tiros, anotaron X
  const good    = pct < NBA_AVG_FG
  const diff    = Math.round((pct - NBA_AVG_FG) * 100)
  const accentColor = lineup.has_wemby ? '#1d4ed8' : '#aaaaaa'

  return (
    <div style={{
      border: `1px solid ${lineup.has_wemby ? 'rgba(29,78,216,0.15)' : 'rgba(0,0,0,0.08)'}`,
      borderTop: `2px solid ${accentColor}`,
      borderRadius: 8,
      padding: '16px',
      background: lineup.has_wemby
        ? 'linear-gradient(135deg, #ffffff 0%, rgba(29,78,216,0.03) 100%)'
        : '#f9f9fb',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: lineup.has_wemby
        ? '0 2px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(29,78,216,0.12), 0 0 24px rgba(29,78,216,0.1)'
        : '0 2px 10px rgba(0,0,0,0.05)',
    }}>

      {/* Línea 1: badge Wemby + número grande */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {lineup.has_wemby
            ? <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.16em', textTransform: 'uppercase' }}>WITH WEMBY</span>
            : <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 800, color: '#aaaaaa', letterSpacing: '0.16em', textTransform: 'uppercase' }}>WITHOUT WEMBY</span>
          }
          {/* Frase en lenguaje simple */}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, margin: 0 }}>
            {good
              ? `Rivals scored on ${made} of every 100 shots`
              : `Rivals scored on ${made} of every 100 shots`
            }
          </p>
        </div>

        {/* El número principal */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: good ? '#34d399' : '#f87171',
            lineHeight: 1,
            textShadow: good
              ? '0 0 8px rgba(52,211,153,0.8), 0 0 24px rgba(52,211,153,0.4)'
              : '0 0 8px rgba(248,113,113,0.8), 0 0 24px rgba(248,113,113,0.4)',
          }}>
            {made}<span style={{ fontSize: 16 }}>/100</span>
          </div>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            color: good ? '#34d399' : '#f87171',
            opacity: 0.7,
            marginTop: 2,
          }}>
            {diff > 0 ? `+${diff} vs NBA avg` : `${diff} vs NBA avg`}
          </div>
        </div>
      </div>

      {/* Barra visual */}
      <ScoreBar pct={pct} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'ui-monospace, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', marginTop: -6 }}>
        <span>0</span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>NBA avg</span>
        <span>70</span>
      </div>

      {/* Jugadores en cancha */}
      <div>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Players on court
        </p>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {lineup.players.map(name => (
            <span key={name} style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 10,
              fontWeight: 700,
              color: name === 'Wembanyama' ? '#1d4ed8' : '#38384a',
              background: name === 'Wembanyama' ? 'rgba(29,78,216,0.07)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${name === 'Wembanyama' ? 'rgba(29,78,216,0.2)' : 'rgba(0,0,0,0.08)'}`,
              padding: '3px 8px',
              borderRadius: 4,
              textShadow: 'none',
            }}>
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Logos de rivales + sample size */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>vs</span>
          {(lineup.series ?? []).map(sk => {
            const meta = SERIES_META[sk]
            if (!meta) return null
            return (
              <div key={sk} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <img
                  src={teamLogo(meta.teamId)}
                  alt={sk}
                  style={{ width: 20, height: 20, objectFit: 'contain', opacity: 0.65, filter: 'brightness(1.3)' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, color: meta.color, fontWeight: 700, opacity: 0.7 }}>
                  {meta.label}
                </span>
              </div>
            )
          })}
        </div>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
          {lineup.fga} shots faced
        </span>
      </div>
    </div>
  )
}

export default function LineupView({ lineupData }) {
  if (!lineupData) {
    return (
      <div style={{ padding: '48px 5vw', textAlign: 'center' }}>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Run <code style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: 4 }}>python wemby_field.py --lineups</code> to generate lineup data
        </p>
      </div>
    )
  }

  const { items, summary } = lineupData
  const wembyUnits    = items.filter(l => l.has_wemby)
  const noWembyUnits  = items.filter(l => !l.has_wemby)
  const wembyMade     = Math.round(summary.wemby_fg_pct * 100)
  const noWembyMade   = Math.round(summary.no_wemby_fg_pct * 100)
  const effectMade    = Math.round(summary.adjusted_effect * 100)

  return (
    <div style={{ padding: '24px 5vw' }}>

      {/* Explicación en lenguaje simple */}
      <div style={{ marginBottom: 24, padding: '16px 20px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, background: '#f7f7f9' }}>
        <p style={{ fontSize: 12, color: '#7a7a8a', lineHeight: 1.7, margin: 0 }}>
          Each card shows a specific group of 5 Spurs players that defended together, and how often the rival scored against them.
          <span style={{ color: '#34d399' }}> Green = rival scored less than NBA average.</span>
          <span style={{ color: '#f87171' }}> Red = rival scored more.</span>
          {' '}The bar reference line is the NBA average (47 out of 100 shots scored).
        </p>
      </div>

      {/* Resumen con lenguaje simple */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 1,
        marginBottom: 28,
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '18px 24px', background: 'rgba(29,78,216,0.04)' }}>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 800, letterSpacing: '0.16em', color: '#7a7a8a', textTransform: 'uppercase', marginBottom: 8 }}>
            When Wemby is on court
          </p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#aaaaaa', marginBottom: 4 }}>Rivals scored</p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', color: '#1d4ed8', lineHeight: 1 }}>
            {wembyMade}<span style={{ fontSize: 18, opacity: 0.5 }}>/100</span>
          </p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: '#aaaaaa', marginTop: 6 }}>
            shots · {summary.wemby_fga} total attempts
          </p>
        </div>

        <div style={{ padding: '18px 24px', background: '#f9f9fb', borderLeft: '1px solid rgba(0,0,0,0.08)', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 800, letterSpacing: '0.16em', color: '#7a7a8a', textTransform: 'uppercase', marginBottom: 8 }}>
            When Wemby is on the bench
          </p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#aaaaaa', marginBottom: 4 }}>Rivals scored</p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', color: '#888888', lineHeight: 1 }}>
            {noWembyMade}<span style={{ fontSize: 18, opacity: 0.5 }}>/100</span>
          </p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: '#aaaaaa', marginTop: 6 }}>
            shots · {summary.no_wemby_fga} total attempts
          </p>
        </div>

        <div style={{ padding: '18px 24px', background: 'rgba(220,38,38,0.03)' }}>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 8, fontWeight: 800, letterSpacing: '0.16em', color: '#7a7a8a', textTransform: 'uppercase', marginBottom: 8 }}>
            The difference
          </p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#aaaaaa', marginBottom: 4 }}>Rivals score</p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', color: '#dc2626', lineHeight: 1 }}>
            +{effectMade}<span style={{ fontSize: 18, opacity: 0.5 }}> more</span>
          </p>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: '#aaaaaa', marginTop: 6 }}>
            shots per 100 without him · controlled by lineup
          </p>
        </div>
      </div>

      {/* Sección: Con Wemby */}
      <h2 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 12 }}>
        With Wemby on court — {wembyUnits.length} groups
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10, marginBottom: 28 }}>
        {wembyUnits.map((l, i) => (
          <UnitCard key={l.player_ids.join('-')} lineup={l} rank={i + 1} />
        ))}
      </div>

      {/* Sección: Sin Wemby */}
      <h2 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#aaaaaa', textTransform: 'uppercase', marginBottom: 12 }}>
        Without Wemby — {noWembyUnits.length} groups
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
        {noWembyUnits.map((l, i) => (
          <UnitCard key={l.player_ids.join('-')} lineup={l} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}
