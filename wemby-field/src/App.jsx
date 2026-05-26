import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import wembyData from './data/wemby_data.json'
import CourtChart from './CourtChart.jsx'
import VectorField from './VectorField.jsx'
import ReboundMap from './ReboundMap.jsx'
import './App.css'

// ── CONFIG ────────────────────────────────────────────────────────────────────

const SERIES_CONFIG = {
  'R1 · POR':  { label: 'Round 1',      opp: 'POR', color: '#777777' },
  'R2 · MIN':  { label: 'Round 2',      opp: 'MIN', color: '#1d66cc' },
  'ECF · OKC': { label: 'Conf. Finals', opp: 'OKC', color: '#dc2626' },
}

const NBA_LOGO       = id => `https://cdn.nba.com/logos/nba/${id}/global/L/logo.svg`
const WEMBY_HEADSHOT = 'https://cdn.nba.com/headshots/nba/latest/1040x760/1641705.png'

// ── TRANSLATIONS ──────────────────────────────────────────────────────────────

const T = {
  en: {
    toggle_lang: 'ES',

    eyebrow:     'Spurs Playoffs 2025–26 · Spatial Analytics',
    subtitle:    "How Wemby's presence deforms opponent shot geometry",
    stat_on:     'Wemby On Court',
    stat_off:    'Wemby On Bench',
    stat_effect: 'The Field Effect',
    stat_more:   'more scoring without him',
    stat_shots:  'shots',

    filter_label: 'Filter by series — click to toggle',

    intro_bio1: "Victor Wembanyama, born January 4, 2004, is the center of the San Antonio Spurs and the first overall pick of the 2023 NBA Draft. At 7'3\" (2.24 m) with a 7'9\" (2.36 m) wingspan, he is the most imposing defensive specimen in modern NBA history — a player who can contest shots from the perimeter while commanding the interior.",
    intro_bio2: "In his first two NBA seasons he became the first player in league history to average 26+ points, 10+ rebounds, 3+ assists, 3+ blocks, and 1+ steal per game in the same season. By the 2025–26 Playoffs, he had transformed the Spurs into a legitimate title contender. This study maps one question: how does his presence reshape the geometry of what opponents dare to attempt?",
    intro_m: [
      { val: '22',              label: 'Age (2025–26)'  },
      { val: "7'3\" / 2.24 m", label: 'Height'         },
      { val: "7'9\" / 2.36 m", label: 'Wingspan'       },
      { val: "9'8\" / 2.95 m", label: 'Standing Reach' },
      { val: '#1 Overall',      label: 'NBA Draft 2023' },
    ],

    s01_num: '01', s01_title: 'The Field',
    s01_desc: 'Wembanyama creates a defensive vector field that deforms opponent shot geometry. Each arrow shows the direction and magnitude of shot displacement in that court zone when Wembanyama is on the floor. Blue = shots suppressed. Red = shots redirected.',

    s02_num: '02', s02_title: 'Shot Geography',
    s02_desc: 'Where opponents actually shoot — and how the distribution shifts with Wembanyama on court versus on the bench. Toggle between individual shot dots and a zone efficiency heat map.',
    s02_all: 'All Series',

    s03_num: '03', s03_title: 'Efficiency Timeline',
    s03_desc: 'Opponent field goal percentage across five court zones, averaged by series. Solid line = Wemby on court. Dashed = Wemby on bench. NBA average (47%) shown as reference.',
    s03_fg:    'FG% by Zone',
    s03_dist:  'Shot Distribution',
    s03_off:   'Show Wemby Off',
    s03_games: 'Show Games',
    wemby_on:  'Wemby on court',
    wemby_off: 'Wemby on bench',
    on_court:  'On Court',
    on_bench:  'On Bench',
    field_effect: 'Field Effect',
    pp_adv:    'pp advantage',
    attempts:  'attempts',
    serie_label: 'Series',
    games_label: 'games',
    tooltip_hint: 'solid = Wemby on court · dashed = Wemby on bench',

    s04_num: '04', s04_title: 'Rebound Geography',
    s04_desc: 'Where Wembanyama collects rebounds across all three playoff series. The heat map plots the shot-origin of each preceding missed attempt as a rebound zone proxy. Indigo intensity = higher rebound density.',

    s05_num: '05', s05_title: 'Methodology',
    s05_desc: "How the data was collected, how Wembanyama's on/off status is determined, and how the vector field is computed.",

    court_made:   'Made',
    court_missed: 'Missed',

    mb1_title: 'Introduction',
    mb1_p1: "The Wembanyama Field is a spatial analytics study of Victor Wembanyama's defensive impact during the San Antonio Spurs' 2025–26 NBA Playoff run. Rather than summarizing his effect through a single aggregate number, this project maps the full spatial deformation of opponent field goal attempt distributions when Wembanyama is on versus off the court.",
    mb1_p2: "The central claim is that Wembanyama does not merely alter opponent FG% — he alters opponent shot geography. The vector field makes this geometry legible.",

    mb2_title: 'Data Collection',
    mb2_p1: 'Shot data was retrieved from the NBA Stats API via the PlayByPlayV3 endpoint for all 2025–26 Playoff games involving the Spurs. Each shot event carries court coordinates (xLegacy, yLegacy) in a half-court system: basket at origin (0, 0), x ∈ [−250, 250] (left to right), y ∈ [−47.5, 422] (baseline to midcourt). Units are approximately tenths of a foot.',
    mb2_p2: "Wembanyama's on/off status is determined by tracking substitution events in the play-by-play log. Each substitution updates the active 5-man unit, tagging every subsequent shot as occurring with Wembanyama on court (ON) or on the bench (OFF).",

    mb3_title: 'The Vector Field',
    mb3_p1a: 'Let ',
    mb3_p1b: ' and ',
    mb3_p1c: ' denote the normalized shot density at position (x, y) with Wembanyama on and off court respectively. We define the density difference:',
    mb3_f1:  'Δρ(x, y) = ρon(x, y) − ρoff(x, y)',
    mb3_p2:  'Negative values indicate zones where shot frequency drops with Wembanyama on court. Positive values indicate zones where shots accumulate. The spatial gradient of this difference:',
    mb3_f2:  '∇Δρ = (∂Δρ/∂x, ∂Δρ/∂y)',
    mb3_p3:  'is estimated via finite differences on a 36-unit bin grid. Each arrow represents this gradient at a court zone — its direction shows where shot pressure flows when Wembanyama enters the game, and its magnitude reflects the strength of that displacement.',

    mb4_title: 'Efficiency Metric',
    mb4_p1: 'Field goal percentage for each on/off condition is computed as:',
    mb4_f1: 'FG%(condition) = FGM / FGA',
    mb4_p2: 'The "field effect" is defined as the difference in opponent FG% between the two conditions:',
    mb4_f2: 'Effect = FG%off − FG%on',
    mb4_p3a: 'A positive value indicates opponents score more efficiently without Wembanyama on the court. Across all series, this value is ',
    mb4_p3b: ' total attempts',

    mb5_title: 'Limitations',
    mb5_p1: 'Sample sizes are constrained by playoff series length (5–6 games per series, 13 games total). The on/off split does not control for which other four Spurs players share the court with Wembanyama — bench units defending while he rests may systematically differ in quality from starting units.',
    mb5_p2: 'Opponent shot selection and game state (e.g., late-game garbage time) are not filtered. The gradient estimate is sensitive to bin size. Larger bins smooth noise but reduce spatial resolution; smaller bins amplify variance.',

    mb6_title: 'Shot Chart — Efficiency',
    mb6_p1: 'The efficiency timeline plots opponent FG% across five court zones — Restricted Area, Paint (non-RA), Mid-Range, Above the Break 3, and Corner 3 — averaged across each playoff series. The solid line represents Wembanyama on court; the dashed line represents Wembanyama on the bench.',
    mb6_p2: 'The NBA average reference line (47%) allows direct comparison to league-wide defensive baselines. A line consistently below the NBA average indicates above-average defensive performance in that zone.',
    mb6_cap: 'Figure 2: Opponent FG% by court zone — Spurs Playoffs 2025–26',

    conclusion_label: 'Conclusion',
    conclusion_p1: (games, attempts, on, off, diff) =>
      `Across ${games} games and ${attempts} opponent field goal attempts in the 2025–26 NBA Playoffs, Victor Wembanyama's defensive presence produced a consistent and measurable deformation in opponent shot geometry. Rivals attempted shots at ${on}% efficiency with him on court versus ${off}% without — a difference of ${diff} percentage points.`,

    ch_title: 'The Height Question',
    ch_text:  "Is it simply his size? At 7'3\" with a 7'9\" wingspan and a 9'8\" standing reach, Wembanyama covers court geography that no player in NBA history has before him. But the data resists a purely anthropometric explanation. Taller players have existed — none produced a spatial deformation this consistent. What sets Wembanyama apart is that he suppresses paint attempts while simultaneously forcing opponents out to lower-percentage perimeter positions. This is not a body doing one thing well. This is a body reorganizing the entire offensive environment around its presence.",

    cg_title: 'A New G.O.A.T.?',
    cg_text:  "It is too early for the title. But the evidence accumulating is unprecedented for a player at 21 years of age. His defensive spatial deformation surpasses what was observed from prime Hakeem, prime Mutombo, even prime Wilt at comparable career stages. The vector field does not lie: when Wembanyama enters the game, the court itself changes. Whether that makes him the greatest ever remains a story still being written — but through two playoff runs, the opening chapters read like nothing the league has seen before.",

    kicker1: 'He does not merely block shots.',
    kicker2: 'He bends the field.',

    photo_break_quote: 'When Wembanyama enters the game, the court itself changes.',

    footer_data:   'Data: NBA Stats API · stats.nba.com',
    footer_on_off: 'On/off classification via PlayByPlayV3 substitution events',
    footer_season: 'Spurs Playoffs 2025–26',
  },

  es: {
    toggle_lang: 'EN',

    eyebrow:     'Spurs Playoffs 2025–26 · Analítica Espacial',
    subtitle:    'Cómo la presencia de Wemby deforma la geometría de tiros rivales',
    stat_on:     'Wemby en Cancha',
    stat_off:    'Wemby en Banca',
    stat_effect: 'El Efecto de Campo',
    stat_more:   'más efectividad sin él',
    stat_shots:  'tiros',

    filter_label: 'Filtrar por serie — clic para alternar',

    intro_bio1: 'Victor Wembanyama, nacido el 4 de enero de 2004, es el pívot de los San Antonio Spurs y la primera selección global del Draft NBA 2023. Con 2.24 m de altura y 2.36 m de envergadura, es el espécimen defensivo más imponente de la historia moderna de la NBA — un jugador capaz de contestar tiros desde el perímetro mientras domina la pintura.',
    intro_bio2: 'En sus primeras dos temporadas en la NBA se convirtió en el primer jugador en la historia de la liga en promediar 26+ puntos, 10+ rebotes, 3+ asistencias, 3+ tapones y 1+ robo por partido en la misma temporada. Para los Playoffs 2025–26 había transformado a los Spurs en un verdadero contendiente al título. Este estudio responde una pregunta: ¿cómo redefine su presencia la geometría de lo que los rivales se atreven a intentar?',
    intro_m: [
      { val: '22',        label: 'Edad (2025–26)' },
      { val: '2.24 m',    label: 'Estatura'       },
      { val: '2.36 m',    label: 'Envergadura'    },
      { val: '2.95 m',    label: 'Alcance de pie' },
      { val: '#1 Global', label: 'Draft NBA 2023' },
    ],

    s01_num: '01', s01_title: 'El Campo',
    s01_desc: 'Wembanyama genera un campo vectorial defensivo que deforma la geometría de tiros rivales. Cada flecha muestra la dirección y magnitud del desplazamiento de tiros en esa zona cuando Wembanyama está en cancha. Azul = tiros suprimidos. Rojo = tiros redirigidos.',

    s02_num: '02', s02_title: 'Geografía de Tiros',
    s02_desc: 'Dónde realmente tiran los rivales — y cómo cambia la distribución con Wembanyama en cancha versus en la banca. Alterna entre puntos individuales y un mapa de calor de eficiencia por zona.',
    s02_all: 'Todas las Series',

    s03_num: '03', s03_title: 'Línea de Eficiencia',
    s03_desc: 'Porcentaje de tiro rival en cinco zonas de la cancha, promediado por serie. Línea continua = Wemby en cancha. Discontinua = Wemby en banca. Promedio NBA (47%) como referencia.',
    s03_fg:    '% Tiro por Zona',
    s03_dist:  'Distribución de Tiros',
    s03_off:   'Mostrar Wemby Fuera',
    s03_games: 'Ver Partidos',
    wemby_on:  'Wemby en cancha',
    wemby_off: 'Wemby en banca',
    on_court:  'En Cancha',
    on_bench:  'En Banca',
    field_effect: 'Efecto Campo',
    pp_adv:    'pp de ventaja',
    attempts:  'intentos',
    serie_label: 'Serie',
    games_label: 'partidos',
    tooltip_hint: 'continua = Wemby en cancha · discontinua = Wemby en banca',

    s04_num: '04', s04_title: 'Geografía de Rebotes',
    s04_desc: 'Dónde captura rebotes Wembanyama en las tres series de playoffs. El mapa de calor usa las coordenadas del tiro fallado anterior como proxy de la zona de rebote. Mayor intensidad = mayor densidad de rebotes.',

    s05_num: '05', s05_title: 'Metodología',
    s05_desc: 'Cómo se recopilaron los datos, cómo se determina el estado en/fuera de cancha de Wembanyama, y cómo se calcula el campo vectorial.',

    court_made:   'Anotado',
    court_missed: 'Fallado',

    mb1_title: 'Introducción',
    mb1_p1: 'El Campo de Wembanyama es un estudio de analítica espacial del impacto defensivo de Victor Wembanyama durante la campaña de Playoffs 2025–26 de los San Antonio Spurs. En lugar de resumir su efecto con un solo número agregado, este proyecto mapea la deformación espacial completa de la distribución de intentos de tiro rival cuando Wembanyama está dentro y fuera de la cancha.',
    mb1_p2: 'La hipótesis central es que Wembanyama no solo altera el porcentaje de tiro rival — altera la geografía de tiro rival. El campo vectorial hace legible esta geometría.',

    mb2_title: 'Recopilación de Datos',
    mb2_p1: 'Los datos de tiro se obtuvieron de la NBA Stats API mediante el endpoint PlayByPlayV3 para todos los partidos de Playoffs 2025–26 en que participaron los Spurs. Cada evento de tiro lleva coordenadas (xLegacy, yLegacy) en un sistema de media cancha: canasta en el origen (0,0), x ∈ [−250, 250] (izquierda a derecha), y ∈ [−47.5, 422] (línea de fondo a medio campo). Las unidades son aproximadamente décimas de pie.',
    mb2_p2: 'El estado dentro/fuera de cancha de Wembanyama se determina rastreando los eventos de sustitución en el registro de jugada por jugada. Cada sustitución actualiza el quinteto activo, etiquetando cada tiro posterior como ocurrido con Wembanyama en cancha (DENTRO) o en la banca (FUERA).',

    mb3_title: 'El Campo Vectorial',
    mb3_p1a: 'Sean ',
    mb3_p1b: ' y ',
    mb3_p1c: ' las densidades normalizadas de tiro en la posición (x, y) con Wembanyama dentro y fuera de cancha respectivamente. Definimos la diferencia de densidad:',
    mb3_f1:  'Δρ(x, y) = ρdentro(x, y) − ρfuera(x, y)',
    mb3_p2:  'Los valores negativos indican zonas donde la frecuencia de tiro cae cuando Wembanyama está en cancha. Los positivos indican zonas donde los tiros se acumulan. El gradiente espacial de esta diferencia:',
    mb3_f2:  '∇Δρ = (∂Δρ/∂x, ∂Δρ/∂y)',
    mb3_p3:  'se estima mediante diferencias finitas en una cuadrícula de 36 unidades. Cada flecha representa este gradiente en una zona de la cancha — su dirección muestra hacia dónde fluye la presión de tiro cuando Wembanyama entra al partido, y su magnitud refleja la intensidad del desplazamiento.',

    mb4_title: 'Métrica de Eficiencia',
    mb4_p1: 'El porcentaje de tiro para cada condición dentro/fuera se calcula como:',
    mb4_f1: '% Tiro (condición) = TCA / ITC',
    mb4_p2: 'El "efecto de campo" se define como la diferencia en el % de tiro rival entre las dos condiciones:',
    mb4_f2: 'Efecto = % Tiro fuera − % Tiro dentro',
    mb4_p3a: 'Un valor positivo indica que los rivales anotan con mayor eficiencia sin Wembanyama en cancha. En las tres series, este valor es ',
    mb4_p3b: ' intentos en total',

    mb5_title: 'Limitaciones',
    mb5_p1: 'Los tamaños de muestra están limitados por la duración de las series (5–6 partidos por serie, 13 en total). La división dentro/fuera no controla qué otros cuatro jugadores de los Spurs comparten cancha con Wembanyama — los quintetos de reserva pueden diferir sistemáticamente en calidad de los titulares.',
    mb5_p2: 'La selección de tiro rival y el estado del partido no se filtran. La estimación del gradiente es sensible al tamaño del compartimento. Compartimentos más grandes suavizan el ruido pero reducen la resolución espacial; los más pequeños amplían la varianza.',

    mb6_title: 'Gráfico de Tiro — Eficiencia',
    mb6_p1: 'La línea de eficiencia muestra el % de tiro rival en cinco zonas — Área Restringida, Pintura (no RA), Tiro Medio, Triple por encima del arco y Triple de esquina — promediado por serie. La línea continua representa a Wembanyama en cancha; la discontinua, en la banca.',
    mb6_p2: 'La línea de referencia del promedio NBA (47%) permite comparación directa con los promedios defensivos de la liga. Una línea consistentemente por debajo del promedio NBA indica un rendimiento defensivo superior en esa zona.',
    mb6_cap: 'Figura 2: % de tiro rival por zona — Playoffs Spurs 2025–26',

    conclusion_label: 'Conclusión',
    conclusion_p1: (games, attempts, on, off, diff) =>
      `En ${games} partidos y ${attempts} intentos de tiro rival en los Playoffs NBA 2025–26, la presencia defensiva de Victor Wembanyama produjo una deformación consistente y medible en la geometría de tiro rival. Los rivales intentaron tiros con una eficiencia del ${on}% con él en cancha frente al ${off}% sin él — una diferencia de ${diff} puntos porcentuales.`,

    ch_title: '¿Es Solo la Altura?',
    ch_text:  'Con 2.24 m de altura, 2.36 m de envergadura y 2.95 m de alcance de pie, Wembanyama cubre una geografía de cancha que ningún jugador en la historia de la NBA había cubierto antes. Pero los datos resisten una explicación puramente antropométrica. Han existido jugadores más altos — ninguno produjo una deformación espacial tan consistente. Lo que distingue a Wembanyama es que suprime los intentos en la pintura mientras obliga simultáneamente a los rivales hacia posiciones perimetrales de menor porcentaje. No es un cuerpo haciendo una sola cosa bien. Es un cuerpo reorganizando todo el entorno ofensivo en torno a su presencia.',

    cg_title: '¿Un Nuevo G.O.A.T.?',
    cg_text:  'Es demasiado pronto para el título. Pero la evidencia que se acumula es sin precedentes para un jugador de 21 años. Su deformación espacial defensiva supera lo que observamos en el prime de Hakeem, el prime de Mutombo, incluso el prime de Wilt en etapas comparables de sus carreras. El campo vectorial no miente: cuando Wembanyama entra al partido, la cancha misma cambia. Si eso lo convierte en el mejor de todos los tiempos es una historia que aún se está escribiendo — pero en dos rondas de playoffs, los primeros capítulos se leen como nada que la liga haya visto antes.',

    kicker1: 'No solo tapona tiros.',
    kicker2: 'Dobla el campo.',

    photo_break_quote: 'Cuando Wembanyama entra al partido, la cancha misma cambia.',

    footer_data:   'Datos: NBA Stats API · stats.nba.com',
    footer_on_off: 'Clasificación dentro/fuera vía eventos de sustitución PlayByPlayV3',
    footer_season: 'Playoffs Spurs 2025–26',
  },
}

// ── CHART TOOLTIP ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null
  const onEntries  = payload.filter(p => p.dataKey.endsWith('_on'))
  const offEntries = payload.filter(p => p.dataKey.endsWith('_off'))
  return (
    <div className="tooltip">
      <p className="tooltip-label">{label}</p>
      {onEntries.map(e => {
        const sk  = e.dataKey.replace('_on', '')
        const cfg = SERIES_CONFIG[sk]
        const off = offEntries.find(o => o.dataKey === `${sk}_off`)
        const diff = off ? off.value - e.value : null
        return (
          <div key={e.dataKey} className="tooltip-row">
            <span className="tooltip-dot" style={{ background: cfg?.color }} />
            <span className="tooltip-serie">{cfg?.label ?? sk}</span>
            <span className="tooltip-val on">{(e.value * 100).toFixed(1)}%</span>
            {off && (
              <>
                <span className="tooltip-sep">→</span>
                <span className="tooltip-val off">{(off.value * 100).toFixed(1)}%</span>
                <span className="tooltip-diff" style={{ color: diff > 0 ? '#cc0022' : '#22aa55' }}>
                  {diff > 0 ? '+' : ''}{(diff * 100).toFixed(1)}%
                </span>
              </>
            )}
          </div>
        )
      })}
      <p className="tooltip-hint">{t.tooltip_hint}</p>
    </div>
  )
}

// ── SERIES BADGE ──────────────────────────────────────────────────────────────

function SeriesBadge({ serieKey, active, onClick }) {
  const cfg  = SERIES_CONFIG[serieKey]
  const data = wembyData.series[serieKey]
  const team = wembyData.teams[cfg.opp]
  const W    = data.games.filter(g => g.result === 'W').length
  const L    = data.games.filter(g => g.result === 'L').length

  return (
    <button
      className={`series-badge ${active ? 'active' : ''}`}
      style={{ '--badge-color': cfg.color }}
      onClick={() => onClick(serieKey)}
    >
      <img src={NBA_LOGO(team.id)} alt={team.abbr} className="team-logo"
        onError={e => { e.target.style.display = 'none' }} />
      <div className="badge-text">
        <span className="badge-round">{cfg.label}</span>
        <span className="badge-team">{team.name.split(' ').slice(-1)[0]}</span>
      </div>
      <span className="badge-record">{W}–{L}</span>
      <div className="badge-dots">
        {data.games.map(g => (
          <div
            key={g.num}
            className={`game-dot ${g.result}`}
            style={{
              background:  g.result === 'W' ? cfg.color : 'transparent',
              borderColor: cfg.color,
            }}
            title={`G${g.num} — ${g.result}`}
          >
            <span>{g.num}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────

function SectionHead({ num, title, desc }) {
  return (
    <div className="section-head">
      <div className="section-head-top">
        <span className="section-num">{num}</span>
        <h2 className="section-title">{title}</h2>
      </div>
      {desc && <p className="section-desc">{desc}</p>}
    </div>
  )
}

// ── INTRO STRIP ───────────────────────────────────────────────────────────────

function IntroStrip({ t }) {
  return (
    <div className="intro-strip">
      <div className="intro-content">
        <div className="intro-text">
          <p className="intro-eyebrow">Victor Wembanyama · No. 1 · San Antonio Spurs</p>
          <p className="intro-bio">{t.intro_bio1}</p>
          <p className="intro-bio">{t.intro_bio2}</p>
        </div>
        <img src="/wemby1.jpg" alt="Victor Wembanyama" className="intro-image" />
      </div>
      <div className="intro-measurements">
        {t.intro_m.map(m => (
          <div key={m.label} className="intro-m-item">
            <span className="intro-m-val">{m.val}</span>
            <span className="intro-m-label">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PHOTO BREAKS ──────────────────────────────────────────────────────────────

// wemby1 — split panel between intro and section 01
// [REMOVED]

// wemby3 — full-width cinematic break with quote
function PhotoBreak({ quote }) {
  return (
    <div className="photo-break">
      <img src="/wemby3.jpg" alt="Wembanyama block" className="photo-break-img" />
      <div className="photo-break-overlay">
        <p className="photo-break-quote">"{quote}"</p>
      </div>
    </div>
  )
}

// ── METHODOLOGY ───────────────────────────────────────────────────────────────

function Methodology({ stats, t }) {
  return (
    <section className="section methodology-section" id="methodology">
      <SectionHead num={t.s05_num} title={t.s05_title} desc={t.s05_desc} />

      <div className="method-body">

        <div className="method-block">
          <h3 className="method-block-title"><span className="method-num">1.</span> {t.mb1_title}</h3>
          <p className="method-text">{t.mb1_p1}</p>
          <p className="method-text" style={{ marginTop: 10 }}>{t.mb1_p2}</p>
        </div>

        <div className="method-block">
          <h3 className="method-block-title"><span className="method-num">2.</span> {t.mb2_title}</h3>
          <p className="method-text">{t.mb2_p1}</p>
          <p className="method-text" style={{ marginTop: 10 }}>{t.mb2_p2}</p>
        </div>

        <div className="method-block">
          <h3 className="method-block-title"><span className="method-num">3.</span> {t.mb3_title}</h3>
          <p className="method-text">
            {t.mb3_p1a}ρ<sub>on</sub>(x, y){t.mb3_p1b}ρ<sub>off</sub>(x, y){t.mb3_p1c}
          </p>
          <div className="method-formula">{t.mb3_f1}</div>
          <p className="method-text">{t.mb3_p2}</p>
          <div className="method-formula">{t.mb3_f2}</div>
          <p className="method-text">{t.mb3_p3}</p>
        </div>

        <div className="method-block">
          <h3 className="method-block-title"><span className="method-num">4.</span> {t.mb4_title}</h3>
          <p className="method-text">{t.mb4_p1}</p>
          <div className="method-formula">{t.mb4_f1}</div>
          <p className="method-text">{t.mb4_p2}</p>
          <div className="method-formula">{t.mb4_f2}</div>
          <p className="method-text">
            {t.mb4_p3a}
            <strong>+{(stats.diff * 100).toFixed(1)} pp</strong>{' '}
            ({stats.on_att + stats.off_att} {t.mb4_p3b}).
          </p>
        </div>

        <div className="method-block">
          <h3 className="method-block-title"><span className="method-num">5.</span> {t.mb5_title}</h3>
          <p className="method-text">{t.mb5_p1}</p>
          <p className="method-text" style={{ marginTop: 10 }}>{t.mb5_p2}</p>
        </div>

        <div className="method-block">
          <h3 className="method-block-title"><span className="method-num">6.</span> {t.mb6_title}</h3>
          <p className="method-text">{t.mb6_p1}</p>
          <p className="method-text" style={{ marginTop: 10 }}>{t.mb6_p2}</p>
          <p className="method-figure-caption" style={{ marginTop: 14 }}>{t.mb6_cap}</p>
        </div>

      </div>
    </section>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [activeSeries, setActiveSeries] = useState(Object.keys(SERIES_CONFIG))
  const [metric,       setMetric]       = useState('fg')
  const [showOff,      setShowOff]      = useState(true)
  const [showGames,    setShowGames]    = useState(false)
  const [courtSerie,   setCourtSerie]   = useState('ALL')
  const [lang,         setLang]         = useState('en')

  const t = T[lang]

  const metricKeys = metric === 'dist'
    ? ['on_dist', 'off_dist']
    : ['on_fg',   'off_fg']

  const toggleSerie = key =>
    setActiveSeries(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev
        : [...prev, key]
    )

  const stats = useMemo(() => {
    let onMade = 0, onAtt = 0, offMade = 0, offAtt = 0
    activeSeries.forEach(sk => {
      wembyData.series[sk].games.forEach(g => {
        onMade  += g.on_fg_pct  * g.on_fga
        onAtt   += g.on_fga
        offMade += g.off_fg_pct * g.off_fga
        offAtt  += g.off_fga
      })
    })
    const on  = onAtt  > 0 ? onMade  / onAtt  : 0
    const off = offAtt > 0 ? offMade / offAtt : 0
    return { on_pct: on, off_pct: off, diff: off - on, on_att: onAtt, off_att: offAtt }
  }, [activeSeries])

  const chartData = useMemo(() =>
    wembyData.zones.map((zone, zi) => {
      const pt = { zone }
      activeSeries.forEach(sk => {
        const avg = wembyData.series[sk].avg
        pt[`${sk}_on`]  = avg[metricKeys[0]][zi]
        pt[`${sk}_off`] = avg[metricKeys[1]][zi]
        if (showGames) {
          wembyData.series[sk].games.forEach(g => {
            pt[`${sk}_g${g.num}_on`]  = g[metricKeys[0]][zi]
            pt[`${sk}_g${g.num}_off`] = g[metricKeys[1]][zi]
          })
        }
      })
      return pt
    }),
    [activeSeries, metricKeys, showGames]
  )

  const totalGames = Object.values(wembyData.series).reduce((n, s) => n + s.games.length, 0)

  return (
    <div className="app">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <header className="hero">
        <button
          className="lang-toggle"
          onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
        >{t.toggle_lang}</button>
        <img src={WEMBY_HEADSHOT} alt="" className="hero-wemby" />
        <img src={NBA_LOGO(1610612759)} alt="" className="hero-bg-logo" />
        <div className="hero-content">
          <img src={NBA_LOGO(1610612759)} alt="SAS" className="spurs-logo-large"
            onError={e => { e.target.style.display = 'none' }} />
          <div className="hero-text">
            <p className="hero-eyebrow">{t.eyebrow}</p>
            <h1 className="hero-title">The Wembanyama<br /><em>Field</em></h1>
            <div className="hero-rule" />
            <p className="hero-subtitle">{t.subtitle}</p>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-label">{t.stat_on}</span>
                <span className="hero-stat-val on-color">{(stats.on_pct * 100).toFixed(1)}%</span>
                <span className="hero-stat-sub">opponent FG · {stats.on_att} {t.stat_shots}</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-label">{t.stat_off}</span>
                <span className="hero-stat-val off-color">{(stats.off_pct * 100).toFixed(1)}%</span>
                <span className="hero-stat-sub">opponent FG · {stats.off_att} {t.stat_shots}</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-label">{t.stat_effect}</span>
                <span className="hero-stat-val diff-color">+{(stats.diff * 100).toFixed(1)}%</span>
                <span className="hero-stat-sub">{t.stat_more}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── INTRO ────────────────────────────────────────────────────────────── */}
      <IntroStrip t={t} />

      {/* ── SERIES FILTER ────────────────────────────────────────────────────── */}
      <div className="series-filter">
        <p className="series-filter-label">{t.filter_label}</p>
        <div className="series-badges-row">
          {Object.keys(SERIES_CONFIG).map(sk => (
            <SeriesBadge
              key={sk}
              serieKey={sk}
              active={activeSeries.includes(sk)}
              onClick={toggleSerie}
            />
          ))}
        </div>
      </div>

      {/* ── 01 / THE FIELD ───────────────────────────────────────────────────── */}
      <section className="section" id="field">
        <SectionHead num={t.s01_num} title={t.s01_title} desc={t.s01_desc} />
        <div className="field-layout">
          <VectorField seriesData={wembyData.series} activeSeries={activeSeries} lang={lang} />
          <div className="field-photo-wrap">
            <img src="/wemby2.jpg" alt="Wembanyama dunk" className="field-photo" />
          </div>
        </div>
      </section>

      {/* ── 02 / SHOT GEOGRAPHY ──────────────────────────────────────────────── */}
      <section className="section" id="shots">
        <SectionHead num={t.s02_num} title={t.s02_title} desc={t.s02_desc} />

        <div className="section-controls">
          <div className="toggle-group">
            <button
              className={`toggle-btn${courtSerie === 'ALL' ? ' active' : ''}`}
              onClick={() => setCourtSerie('ALL')}
            >{t.s02_all}</button>
            {Object.keys(SERIES_CONFIG).map(sk => (
              <button
                key={sk}
                className={`toggle-btn${courtSerie === sk ? ' active' : ''}`}
                style={courtSerie === sk ? { background: SERIES_CONFIG[sk].color } : {}}
                onClick={() => setCourtSerie(sk)}
              >
                {SERIES_CONFIG[sk].label} · {SERIES_CONFIG[sk].opp}
              </button>
            ))}
          </div>
        </div>

        <CourtChart seriesKey={courtSerie} seriesData={wembyData.series} lang={lang} />

        <p className="court-legend">
          <span className="court-dot made" /> {t.court_made} &nbsp;
          <span className="court-dot missed" /> {t.court_missed} &nbsp;&nbsp;
          <strong style={{ color: '#60a5fa' }}>Blue</strong> = {t.wemby_on} &nbsp;·&nbsp;
          <strong style={{ color: '#888' }}>Gray</strong> = {t.wemby_off}
        </p>
      </section>

      {/* ── 03 / EFFICIENCY TIMELINE ─────────────────────────────────────────── */}
      <section className="section" id="efficiency">
        <SectionHead num={t.s03_num} title={t.s03_title} desc={t.s03_desc} />

        <div className="section-controls">
          <div className="toggle-group">
            <button
              className={`toggle-btn${metric === 'fg' ? ' active' : ''}`}
              onClick={() => setMetric('fg')}
            >{t.s03_fg}</button>
            <button
              className={`toggle-btn${metric === 'dist' ? ' active' : ''}`}
              onClick={() => setMetric('dist')}
            >{t.s03_dist}</button>
          </div>
          <div className="toggle-group">
            <button
              className={`toggle-btn${showOff ? ' active' : ''}`}
              onClick={() => setShowOff(v => !v)}
            >{t.s03_off}</button>
            <button
              className={`toggle-btn${showGames ? ' active' : ''}`}
              onClick={() => setShowGames(v => !v)}
            >{t.s03_games}</button>
          </div>
        </div>

        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ top: 16, right: 40, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="zone"
                tick={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fill: '#888' }}
                axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                tick={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<ChartTooltip t={t} />} cursor={{ stroke: 'rgba(0,0,0,0.08)', strokeWidth: 1 }} />
              {metric === 'fg' && (
                <ReferenceLine
                  y={0.47}
                  stroke="rgba(0,0,0,0.2)"
                  strokeDasharray="4 2"
                  label={{ value: 'NBA avg', position: 'insideTopRight', fontFamily: 'monospace', fontSize: 10, fill: '#999' }}
                />
              )}
              {showGames && activeSeries.flatMap(sk =>
                wembyData.series[sk].games.map(g => (
                  <Line key={`${sk}_g${g.num}_on`} dataKey={`${sk}_g${g.num}_on`}
                    stroke={SERIES_CONFIG[sk].color} strokeWidth={1} dot={false} opacity={0.2} isAnimationActive={false} />
                ))
              )}
              {showOff && activeSeries.map(sk => (
                <Line key={`${sk}_off`} dataKey={`${sk}_off`}
                  stroke={SERIES_CONFIG[sk].color} strokeWidth={2} strokeDasharray="5 4"
                  dot={false} opacity={0.45} isAnimationActive />
              ))}
              {activeSeries.map(sk => (
                <Line key={`${sk}_on`} dataKey={`${sk}_on`}
                  stroke={SERIES_CONFIG[sk].color} strokeWidth={3.5}
                  dot={{ fill: SERIES_CONFIG[sk].color, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  isAnimationActive animationDuration={400} />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <div className="chart-legend">
            <div className="legend-item"><div className="legend-line" /><span>{t.wemby_on}</span></div>
            <div className="legend-item"><div className="legend-line dashed" /><span>{t.wemby_off}</span></div>
            {activeSeries.map(sk => (
              <div key={sk} className="legend-item">
                <div className="legend-dot" style={{ background: SERIES_CONFIG[sk].color }} />
                <span>{SERIES_CONFIG[sk].label} vs {SERIES_CONFIG[sk].opp}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-row">
          {activeSeries.map(sk => {
            const s    = wembyData.series[sk]
            const cfg  = SERIES_CONFIG[sk]
            const team = wembyData.teams[cfg.opp]
            const diff = s.avg.off_fg_pct - s.avg.on_fg_pct
            return (
              <div key={sk} className="stat-card" style={{ '--card-accent': cfg.color }}>
                <div className="stat-card-header">
                  <img src={NBA_LOGO(team.id)} alt={cfg.opp} className="stat-logo"
                    onError={e => { e.target.style.display = 'none' }} />
                  <div>
                    <p className="stat-serie">{cfg.label}</p>
                    <p className="stat-opp">vs {team.name}</p>
                  </div>
                </div>
                <div className="stat-grid">
                  <div>
                    <p className="sg-label">{t.on_court}</p>
                    <p className="sg-val on-color">{(s.avg.on_fg_pct * 100).toFixed(1)}%</p>
                    <p className="sg-sub">{s.avg.on_fga} {t.attempts}</p>
                  </div>
                  <div>
                    <p className="sg-label">{t.on_bench}</p>
                    <p className="sg-val off-color">{(s.avg.off_fg_pct * 100).toFixed(1)}%</p>
                    <p className="sg-sub">{s.avg.off_fga} {t.attempts}</p>
                  </div>
                  <div>
                    <p className="sg-label">{t.field_effect}</p>
                    <p className="sg-val" style={{ color: cfg.color }}>+{(diff * 100).toFixed(1)}%</p>
                    <p className="sg-sub">{t.pp_adv}</p>
                  </div>
                  <div>
                    <p className="sg-label">{t.serie_label}</p>
                    <p className="sg-val" style={{ color: cfg.color }}>
                      {s.games.filter(g => g.result === 'W').length}–{s.games.filter(g => g.result === 'L').length}
                    </p>
                    <p className="sg-sub">{s.games.length} {t.games_label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── PHOTO BREAK ──────────────────────────────────────────────────────── */}
      <PhotoBreak quote={t.photo_break_quote} />

      {/* ── 04 / REBOUND GEOGRAPHY ───────────────────────────────────────────── */}
      <section className="section" id="rebounds">
        <SectionHead num={t.s04_num} title={t.s04_title} desc={t.s04_desc} />
        <ReboundMap reboundData={wembyData.wemby_rebounds ?? null} lang={lang} />
      </section>

      {/* ── 05 / METHODOLOGY ─────────────────────────────────────────────────── */}
      <Methodology stats={stats} t={t} />

      {/* ── CONCLUSION ───────────────────────────────────────────────────────── */}
      <section className="conclusion" id="conclusion">
        <p className="conclusion-label">{t.conclusion_label}</p>

        <p className="conclusion-text">
          {t.conclusion_p1(
            totalGames,
            stats.on_att + stats.off_att,
            (stats.on_pct  * 100).toFixed(1),
            (stats.off_pct * 100).toFixed(1),
            (stats.diff    * 100).toFixed(1),
          )}
        </p>

        <div className="conclusion-sub">
          <p className="conclusion-sub-title">{t.ch_title}</p>
          <p className="conclusion-text">{t.ch_text}</p>
        </div>

        <div className="conclusion-sub">
          <p className="conclusion-sub-title">{t.cg_title}</p>
          <p className="conclusion-text">{t.cg_text}</p>
        </div>

        <p className="conclusion-kicker">
          {t.kicker1}<br />{t.kicker2}
        </p>
      </section>

      <footer className="footer">
        <span>{t.footer_data}</span>
        <span>{t.footer_on_off}</span>
        <span>{t.footer_season}</span>
      </footer>

    </div>
  )
}

