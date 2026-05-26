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

const BASE = import.meta.env.BASE_URL

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

    intro_bio1: "Victor Wembanyama, born January 4, 2004, is the center of the San Antonio Spurs and the first overall pick of the 2023 NBA Draft. At 7'3\" with a 7'9\" wingspan, the assumption was always that a player built this way could protect the rim — but would be exposed on the perimeter, lack agility, and struggle to create offense. Wembanyama didn't challenge that assumption. He erased it.",
    intro_bio2: "He keeps up with point guards in space, pulls up for logo threes, passes like a forward, and handles the ball in traffic behind his back. In his first two seasons he became the only player in league history to average 26+ points, 10+ rebounds, 3+ assists, 3+ blocks, and 1+ steal in the same season. Think of it like Shohei Ohtani arriving in baseball — sometimes a player comes along who simply redefines the boundaries of what we thought was physically possible in a sport. This study maps what that looks like in the data.",
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

    s00_num: '00', s00_title: 'Wemby on Both Ends',
    s00_desc: "The defensive study is the focus of this project — but Wembanyama's impact doesn't start on defense. Per-game stats from all 15 playoff games show a player operating at an elite level offensively and defensively simultaneously.",
    s00_pts: 'PTS', s00_reb: 'REB', s00_ast: 'AST', s00_blk: 'BLK',
    s00_game: 'G', s00_win: 'W', s00_loss: 'L',
    s00_highlight_okc: 'Game 1 vs OKC — on the road, in overtime, with the series on the line: 41 pts · 24 reb · clutch 3-pointer to force OT.',
    s00_avg_label: 'Series averages',
    s00_foul: 'foul trouble',

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
    mb5_p1: 'Sample sizes are constrained by playoff series length (5–6 games per series, 15 games total). The on/off split does not control for which other four Spurs players share the court with Wembanyama — bench units defending while he rests may systematically differ in quality from starting units.',
    mb5_p2: 'Opponent shot selection and game state (e.g., late-game garbage time) are not filtered. The gradient estimate is sensitive to bin size. Larger bins smooth noise but reduce spatial resolution; smaller bins amplify variance.',

    mb6_title: 'Shot Chart — Efficiency',
    mb6_p1: 'The efficiency timeline plots opponent FG% across five court zones — Restricted Area, Paint (non-RA), Mid-Range, Above the Break 3, and Corner 3 — averaged across each playoff series. The solid line represents Wembanyama on court; the dashed line represents Wembanyama on the bench.',
    mb6_p2: 'The NBA average reference line (47%) allows direct comparison to league-wide defensive baselines. A line consistently below the NBA average indicates above-average defensive performance in that zone.',
    mb6_cap: 'Figure 2: Opponent FG% by court zone — Spurs Playoffs 2025–26',

    conclusion_label: 'Conclusion',
    conclusion_p1: (games, attempts, on, off, diff) =>
      `Across ${games} games and ${attempts} opponent field goal attempts in the 2025–26 NBA Playoffs, Victor Wembanyama's defensive presence produced a measurable shift in opponent shot selection. Rivals attempted shots at ${on}% efficiency with him on court versus ${off}% without — a difference of ${diff} percentage points. The aggregate gap is modest. The spatial pattern beneath it is more revealing.`,

    ch_title: 'The Height Question',
    ch_text:  "The shot chart shows opponents still attacking the rim with Wembanyama on the floor — the paint doesn't empty. What changes is the geometry required. Against a 9'8\" standing reach, a direct-angle finish becomes much harder. The shooter needs a higher arc, a wider approach, a more precise release. The shot happens — the margin for error shrinks. That's the signal in the data: not fewer rim attempts overall, but a 7.6 percentage point drop in restricted area attempts as a share of the shot diet. Whether that gap is explained purely by height or by something harder to measure — court awareness, positioning, timing — the data can't say. What it can say is that the pattern is consistent across all three series.",

    cg_title: 'A New G.O.A.T.?',
    cg_text:  "The GOAT conversation is for later. Jordan's bar is six rings and six Finals MVPs without losing a series. LeBron's bar is 20+ years of sustained greatness across four franchises. Wembanyama hasn't done any of that — and that's fine, because he's 22. What the data in this study already shows is something the league has never produced at this age: a player posting 26.3 pts, 10.3 reb, and 5 blocks per series against Portland, then 23 pts and 5 blocks against Minnesota, then 30 pts and 3 blocks in the Conference Finals — all while shifting opponent shot selection simultaneously. In Game 1 against OKC, on the road, in overtime, he put up 41 points and 24 rebounds. That's not a defensive specialist. That's a player threatening to be the best on both ends of the floor at the same time. No one in the modern era has done that. The health question is real. Give it time. Watch the results build.",

    kicker1: "The effect is subtle. The data shows a shift in shot selection,",
    kicker2: "not a shutdown. That distinction matters.",

    photo_break_quote: "The numbers are modest. The spatial pattern is real.",

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

    intro_bio1: "Victor Wembanyama, nacido el 4 de enero de 2004, es el pívot de los San Antonio Spurs y la primera selección global del Draft NBA 2023. Con 2.24 m de altura y 2.36 m de envergadura, el supuesto siempre fue que un jugador construido así podría proteger el aro — pero quedaría expuesto en el perímetro, le faltaría agilidad y tendría dificultades para crear ofensiva. Wembanyama no desafió ese supuesto. Lo borró.",
    intro_bio2: "Sigue a bases en espacios abiertos, anota triples desde el logo, pasa como un alero y maneja el balón en tráfico tras su espalda. En sus primeras dos temporadas se convirtió en el único jugador en la historia de la liga en promediar 26+ puntos, 10+ rebotes, 3+ asistencias, 3+ tapones y 1+ robo en la misma temporada. Piénsenlo como la llegada de Shohei Ohtani al béisbol — a veces aparece un jugador que simplemente redefine los límites de lo que creíamos físicamente posible en un deporte. Este estudio mapea cómo se ve eso en los datos.",
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

    s00_num: '00', s00_title: 'Wemby en Ambos Lados',
    s00_desc: 'El estudio defensivo es el foco de este proyecto — pero el impacto de Wembanyama no empieza en defensa. Las estadísticas por partido en los 15 juegos de playoffs muestran a un jugador operando a nivel élite en ambos extremos de la cancha simultáneamente.',
    s00_pts: 'PTS', s00_reb: 'REB', s00_ast: 'AST', s00_blk: 'BLK',
    s00_game: 'J', s00_win: 'G', s00_loss: 'P',
    s00_highlight_okc: 'Juego 1 vs OKC — de visitante, en tiempo extra, con la serie en juego: 41 pts · 24 reb · triple clave para forzar el tiempo extra.',
    s00_avg_label: 'Promedios por serie',
    s00_foul: 'faltas',

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
    mb5_p1: 'Los tamaños de muestra están limitados por la duración de las series (5–6 partidos por serie, 15 en total). La división dentro/fuera no controla qué otros cuatro jugadores de los Spurs comparten cancha con Wembanyama — los quintetos de reserva pueden diferir sistemáticamente en calidad de los titulares.',
    mb5_p2: 'La selección de tiro rival y el estado del partido no se filtran. La estimación del gradiente es sensible al tamaño del compartimento. Compartimentos más grandes suavizan el ruido pero reducen la resolución espacial; los más pequeños amplían la varianza.',

    mb6_title: 'Gráfico de Tiro — Eficiencia',
    mb6_p1: 'La línea de eficiencia muestra el % de tiro rival en cinco zonas — Área Restringida, Pintura (no RA), Tiro Medio, Triple por encima del arco y Triple de esquina — promediado por serie. La línea continua representa a Wembanyama en cancha; la discontinua, en la banca.',
    mb6_p2: 'La línea de referencia del promedio NBA (47%) permite comparación directa con los promedios defensivos de la liga. Una línea consistentemente por debajo del promedio NBA indica un rendimiento defensivo superior en esa zona.',
    mb6_cap: 'Figura 2: % de tiro rival por zona — Playoffs Spurs 2025–26',

    conclusion_label: 'Conclusión',
    conclusion_p1: (games, attempts, on, off, diff) =>
      `En ${games} partidos y ${attempts} intentos de tiro rival en los Playoffs NBA 2025–26, la presencia defensiva de Victor Wembanyama produjo un cambio medible en la selección de tiros rival. Los rivales anotaron con una eficiencia del ${on}% con él en cancha frente al ${off}% sin él — una diferencia de ${diff} puntos porcentuales. La brecha agregada es modesta. El patrón espacial que hay debajo es más revelador.`,

    ch_title: '¿Es Solo la Altura?',
    ch_text:  "El mapa de tiros muestra que los rivales siguen atacando la pintura con Wembanyama en cancha — la zona no queda vacía. Lo que cambia es la geometría requerida del intento. Contra un alcance de pie de 2.95 m, una bandeja de ángulo directo se vuelve mucho más difícil. El lanzador necesita una parábola más alta, un ángulo de entrada más amplio, una soltura más precisa. El tiro ocurre — el margen de error se reduce. Esa es la señal en los datos: no menos intentos en el aro en términos absolutos, sino una caída de 7.6 puntos porcentuales en la proporción de intentos en el área restringida. Si esa diferencia se explica puramente por la altura o por algo más difícil de medir — lectura de cancha, posicionamiento, timing — los datos no lo dicen. Lo que sí dicen es que el patrón es consistente en las tres series.",

    cg_title: '¿Un Nuevo G.O.A.T.?',
    cg_text:  "La conversación del GOAT es para después. El estándar de Jordan es seis anillos y seis MVP de Finales sin perder una serie. El de LeBron son más de 20 años de grandeza sostenida en cuatro franquicias. Wembanyama no ha hecho nada de eso todavía — y está bien, tiene 22 años. Lo que los datos de este estudio ya muestran es algo que la liga no había producido a esta edad: 26.3 pts y 5 bloqueos por serie contra Portland, 23 pts y 5 bloqueos contra Minnesota, 30 pts y 3 bloqueos en las Finales de Conferencia — todo mientras desplaza la selección de tiros rivales simultáneamente. En el Juego 1 contra OKC, de visitante, en tiempo extra, anotó 41 puntos y capturó 24 rebotes. Eso no es un especialista defensivo. Es un jugador que amenaza con ser el mejor en ambos extremos de la cancha al mismo tiempo. Nadie en la era moderna ha hecho eso. La pregunta de salud es real. Dale tiempo. Observa los resultados acumularse.",

    kicker1: "El efecto es sutil. Los datos muestran un cambio en la selección de tiros,",
    kicker2: "no un apagón defensivo. Esa distinción importa.",

    photo_break_quote: "Los números son modestos. El patrón espacial es real.",

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
    <div style={{ marginBottom: '28px' }}>
      <div className="flex items-baseline" style={{ gap: '14px', marginBottom: '10px' }}>
        <span className="font-mono font-bold tracking-[0.2em] text-[#7a7a8a] shrink-0" style={{ fontSize: '10px' }}>{num}</span>
        <h2 className="font-black tracking-[-0.02em] text-[#08080f] uppercase leading-none" style={{ fontSize: '26px' }}>{title}</h2>
      </div>
      {desc && <p className="font-serif text-[#38384a] leading-[1.7]" style={{ fontSize: '14px', maxWidth: '680px' }}>{desc}</p>}
    </div>
  )
}

// ── INTRO STRIP ───────────────────────────────────────────────────────────────

function IntroStrip({ t }) {
  return (
    <div className="border-b border-black/[0.11] overflow-hidden" style={{ position: 'relative' }}>
      {/* Left — determines container height; right margin reserves space for photo */}
      <div className="intro-content" style={{ padding: '40px 5vw' }}>
        <p
          className="font-mono font-bold tracking-[0.25em] text-[#1d4ed8] uppercase"
          style={{ fontSize: '8px', marginBottom: '14px', textShadow: '0 0 8px rgba(29,78,216,0.3)' }}
        >
          Victor Wembanyama · No. 1 · San Antonio Spurs
        </p>
        <p className="font-serif text-[#38384a] leading-[1.78] text-justify" style={{ fontSize: '14px', marginBottom: '12px' }}>{t.intro_bio1}</p>
        <p className="font-serif text-[#38384a] leading-[1.78] text-justify" style={{ fontSize: '14px', marginBottom: '14px' }}>{t.intro_bio2}</p>
        <div
          className="measurements-bar flex border border-black/[0.11] rounded-lg overflow-hidden bg-[#f0f0f3]"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 0 20px rgba(29,78,216,0.06)' }}
        >
          {t.intro_m.map((m, i) => (
            <div
              key={m.label}
              className="measurements-cell flex flex-col flex-1"
              style={{
                padding: '10px 18px',
                gap: '2px',
                borderRight: i < t.intro_m.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                minWidth: '80px',
              }}
            >
              <span className="font-mono font-black text-[#08080f]" style={{ fontSize: '13px', letterSpacing: '-0.01em' }}>{m.val}</span>
              <span className="font-mono font-bold uppercase text-[#7a7a8a]" style={{ fontSize: '7px', letterSpacing: '0.15em' }}>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Right — absolutely positioned, fills exactly the height the text occupies */}
      <div className="sidebar-photo" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '38%' }}>
        <img
          src={`${BASE}wemby2.jpg`}
          alt="Wembanyama"
          className="w-full h-full object-cover block"
          style={{ objectPosition: 'center 10%' }}
        />
      </div>
    </div>
  )
}

// ── PHOTO BREAKS ──────────────────────────────────────────────────────────────

function PhotoSplit() {
  return (
    <div className="photo-split">
      <div className="photo-split-img-wrap">
        <img src={`${BASE}wemby1.jpg`} alt="Wembanyama towering above defender" className="photo-split-img" />
      </div>
      <div className="photo-split-stat">
        <span className="photo-split-num">7'3"</span>
        <span className="photo-split-label">Tallest player<br />in Spurs history</span>
      </div>
    </div>
  )
}

function PhotoBreak({ quote }) {
  return (
    <div className="photo-break">
      <img src={`${BASE}wemby3.jpg`} alt="Wembanyama block" className="photo-break-img" />
      <div className="photo-break-overlay">
        <p className="photo-break-quote">"{quote}"</p>
      </div>
    </div>
  )
}

// ── WEMBY STATS ───────────────────────────────────────────────────────────────

const SERIES_CONFIG_STATS = {
  'R1 · POR': { label: 'Round 1',        opp: 'Portland Trail Blazers', abbr: 'POR', color: '#e03a3e', result: '4–1' },
  'R2 · MIN': { label: 'Round 2',        opp: 'Minnesota Timberwolves', abbr: 'MIN', color: '#236192', result: '4–2' },
  'ECF · OKC': { label: 'Conf. Finals',  opp: 'Oklahoma City Thunder',  abbr: 'OKC', color: '#007ac1', result: '2–2' },
};

function TeamLogo({ teamId, size = 40 }) {
  return (
    <img
      src={`https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`}
      alt=""
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

const TEAM_IDS = { POR: 1610612757, MIN: 1610612750, OKC: 1610612760 };

function WembyStats({ gameStats, t }) {
  if (!gameStats || !gameStats.length) return null;

  const seriesKeys = ['R1 · POR', 'R2 · MIN', 'ECF · OKC'];

  function avg(games, key) {
    const vals = games.map(g => g[key]).filter(v => v != null);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  const isFoulGame = g => {
    const [m] = (g.min || '0:0').split(':');
    return parseInt(m, 10) < 20;
  };

  return (
    <section className="border-b border-black/[0.07]" style={{ padding: '56px 5vw 48px' }} id="wemby-stats">
      <SectionHead num={t.s00_num} title={t.s00_title} desc={t.s00_desc} />

      {/* OKC G1 note */}
      <div style={{
        borderLeft: '3px solid #007ac1', paddingLeft: 16, marginBottom: 40,
      }}>
        <p style={{ color: '#555566', fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          {t.s00_highlight_okc}
        </p>
      </div>

      {/* Per-series cards */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 40 }}>
        {seriesKeys.map(sk => {
          const cfg = SERIES_CONFIG_STATS[sk];
          const games = gameStats.filter(g => g.serie === sk);
          const fullGames = games.filter(g => !isFoulGame(g));

          return (
            <div key={sk} style={{
              flex: '1 1 260px',
              borderTop: `3px solid ${cfg.color}`,
              borderBottom: '1px solid #e8e8ee',
              paddingTop: 16,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f0f0f4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TeamLogo teamId={TEAM_IDS[cfg.abbr]} size={28} />
                  <div>
                    <p style={{ color: '#9a9aaa', fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.12em', margin: 0 }}>{cfg.label.toUpperCase()}</p>
                    <p style={{ color: '#08080f', fontSize: 13, fontWeight: 600, margin: 0 }}>{cfg.opp}</p>
                  </div>
                </div>
                <span style={{ color: '#08080f', fontSize: 15, fontWeight: 700, fontFamily: 'monospace' }}>{cfg.result}</span>
              </div>

              {/* Averages — single row */}
              <div style={{ display: 'flex', marginBottom: 12 }}>
                {[
                  { key: 'pts', label: t.s00_pts },
                  { key: 'reb', label: t.s00_reb },
                  { key: 'ast', label: t.s00_ast },
                  { key: 'blk', label: t.s00_blk },
                ].map(({ key, label }) => (
                  <div key={key} style={{ flex: 1 }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#08080f', margin: 0, fontFamily: 'monospace' }}>
                      {avg(fullGames, key).toFixed(1)}
                    </p>
                    <p style={{ fontSize: 9, color: '#9a9aaa', margin: 0, fontFamily: 'monospace' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Per-game log */}
              <div>
                {games.map(g => (
                  <div key={g.game_id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 0', borderTop: '1px solid #f4f4f7',
                    opacity: isFoulGame(g) ? 0.4 : 1,
                  }}>
                    <span style={{
                      fontSize: 9, fontFamily: 'monospace',
                      color: g.result === 'W' ? '#16a34a' : '#dc2626',
                      width: 24, flexShrink: 0,
                    }}>{t.s00_game}{g.game_num}</span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#38384a', flex: 1 }}>
                      {g.pts}pts · {g.reb}reb · {g.ast}ast · {g.blk}blk
                    </span>
                    {isFoulGame(g) && (
                      <span style={{ fontSize: 8, color: '#9a9aaa', fontFamily: 'monospace' }}>{t.s00_foul}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── METHODOLOGY ───────────────────────────────────────────────────────────────

function Methodology({ stats, t }) {
  return (
    <section
      className="border-b border-black/[0.07] bg-[#f0f0f3]"
      style={{ padding: '56px 5vw 48px' }}
      id="methodology"
    >
      <SectionHead num={t.s05_num} title={t.s05_title} desc={t.s05_desc} />

      <div className="grid grid-cols-2" style={{ gap: '40px 56px' }}>

        <div>
          <h3
            className="font-serif font-bold text-[#08080f] border-b border-black/[0.11]"
            style={{ fontSize: '14px', marginBottom: '10px', paddingBottom: '8px' }}
          >
            <span className="font-mono font-bold tracking-[0.12em] text-[#7a7a8a]" style={{ fontSize: '10px', marginRight: '6px' }}>1.</span>
            {t.mb1_title}
          </h3>
          <p className="method-text">{t.mb1_p1}</p>
          <p className="method-text" style={{ marginTop: '10px' }}>{t.mb1_p2}</p>
        </div>

        <div>
          <h3
            className="font-serif font-bold text-[#08080f] border-b border-black/[0.11]"
            style={{ fontSize: '14px', marginBottom: '10px', paddingBottom: '8px' }}
          >
            <span className="font-mono font-bold tracking-[0.12em] text-[#7a7a8a]" style={{ fontSize: '10px', marginRight: '6px' }}>2.</span>
            {t.mb2_title}
          </h3>
          <p className="method-text">{t.mb2_p1}</p>
          <p className="method-text" style={{ marginTop: '10px' }}>{t.mb2_p2}</p>
        </div>

        <div>
          <h3
            className="font-serif font-bold text-[#08080f] border-b border-black/[0.11]"
            style={{ fontSize: '14px', marginBottom: '10px', paddingBottom: '8px' }}
          >
            <span className="font-mono font-bold tracking-[0.12em] text-[#7a7a8a]" style={{ fontSize: '10px', marginRight: '6px' }}>3.</span>
            {t.mb3_title}
          </h3>
          <p className="method-text">
            {t.mb3_p1a}ρ<sub>on</sub>(x, y){t.mb3_p1b}ρ<sub>off</sub>(x, y){t.mb3_p1c}
          </p>
          <div className="method-formula">{t.mb3_f1}</div>
          <p className="method-text">{t.mb3_p2}</p>
          <div className="method-formula">{t.mb3_f2}</div>
          <p className="method-text">{t.mb3_p3}</p>
        </div>

        <div>
          <h3
            className="font-serif font-bold text-[#08080f] border-b border-black/[0.11]"
            style={{ fontSize: '14px', marginBottom: '10px', paddingBottom: '8px' }}
          >
            <span className="font-mono font-bold tracking-[0.12em] text-[#7a7a8a]" style={{ fontSize: '10px', marginRight: '6px' }}>4.</span>
            {t.mb4_title}
          </h3>
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

        <div>
          <h3
            className="font-serif font-bold text-[#08080f] border-b border-black/[0.11]"
            style={{ fontSize: '14px', marginBottom: '10px', paddingBottom: '8px' }}
          >
            <span className="font-mono font-bold tracking-[0.12em] text-[#7a7a8a]" style={{ fontSize: '10px', marginRight: '6px' }}>5.</span>
            {t.mb5_title}
          </h3>
          <p className="method-text">{t.mb5_p1}</p>
          <p className="method-text" style={{ marginTop: '10px' }}>{t.mb5_p2}</p>
        </div>

        <div>
          <h3
            className="font-serif font-bold text-[#08080f] border-b border-black/[0.11]"
            style={{ fontSize: '14px', marginBottom: '10px', paddingBottom: '8px' }}
          >
            <span className="font-mono font-bold tracking-[0.12em] text-[#7a7a8a]" style={{ fontSize: '10px', marginRight: '6px' }}>6.</span>
            {t.mb6_title}
          </h3>
          <p className="method-text">{t.mb6_p1}</p>
          <p className="method-text" style={{ marginTop: '10px' }}>{t.mb6_p2}</p>
          <p className="method-figure-caption" style={{ marginTop: '14px' }}>{t.mb6_cap}</p>
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
    <div className="w-full">

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
      <div className="border-b border-black/[0.11] bg-[#f0f0f3]" style={{ padding: '16px 5vw' }}>
        <p className="font-mono font-bold tracking-[0.18em] text-[#7a7a8a] uppercase" style={{ fontSize: '8px', marginBottom: '12px' }}>{t.filter_label}</p>
        <div className="flex flex-wrap" style={{ gap: '10px' }}>
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
      <section className="border-b border-black/[0.07] overflow-hidden" style={{ position: 'relative' }} id="field">
        {/* Left — chart content determines container height */}
        <div className="field-content" style={{ padding: '40px 5vw 36px' }}>
          <SectionHead num={t.s01_num} title={t.s01_title} desc={t.s01_desc} />
          <div style={{ maxWidth: '420px' }}>
            <VectorField seriesData={wembyData.series} activeSeries={activeSeries} lang={lang} />
          </div>
        </div>
        {/* Right — photo fills exact height of content column */}
        <div className="sidebar-photo" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '42%' }}>
          <img
            src={`${BASE}wemby1.jpg`}
            alt="Wembanyama dunk"
            className="w-full h-full object-cover block"
            style={{ objectPosition: 'center 10%', filter: 'contrast(1.05) brightness(0.92)' }}
          />
        </div>
      </section>

      {/* ── 02 / SHOT GEOGRAPHY ──────────────────────────────────────────────── */}
      <section className="border-b border-black/[0.07]" style={{ padding: '56px 5vw 48px' }} id="shots">
        <SectionHead num={t.s02_num} title={t.s02_title} desc={t.s02_desc} />

        <div className="flex flex-wrap items-center" style={{ gap: '10px', marginBottom: '20px' }}>
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
      <section className="border-b border-black/[0.07]" style={{ padding: '56px 5vw 48px' }} id="efficiency">
        <SectionHead num={t.s03_num} title={t.s03_title} desc={t.s03_desc} />

        <div className="flex flex-wrap items-center" style={{ gap: '10px', marginBottom: '20px' }}>
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

        <div style={{ paddingTop: '20px', paddingBottom: '12px' }}>
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

        <div className="flex flex-wrap" style={{ gap: '10px', paddingTop: '20px' }}>
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

      {/* ── 00 / WEMBY STATS ─────────────────────────────────────────────────── */}
      <WembyStats gameStats={wembyData.wemby_game_stats ?? []} t={t} />

      {/* ── PHOTO BREAK ──────────────────────────────────────────────────────── */}
      <PhotoBreak quote={t.photo_break_quote} />

      {/* ── 04 / REBOUND GEOGRAPHY ───────────────────────────────────────────── */}
      <section className="border-b border-black/[0.07]" style={{ padding: '56px 5vw 48px' }} id="rebounds">
        <SectionHead num={t.s04_num} title={t.s04_title} desc={t.s04_desc} />
        <ReboundMap reboundData={wembyData.wemby_rebounds ?? null} lang={lang} />
      </section>

      {/* ── CONCLUSION ───────────────────────────────────────────────────────── */}
      <section
        className="text-center"
        style={{ padding: '72px 5vw 64px', maxWidth: '760px', margin: '0 auto' }}
        id="conclusion"
      >
        <p
          className="font-mono font-bold tracking-[0.25em] text-[#7a7a8a] uppercase"
          style={{ fontSize: '9px', marginBottom: '28px' }}
        >{t.conclusion_label}</p>

        <p className="font-serif text-[#38384a] leading-[1.8] text-left" style={{ fontSize: '16px', marginBottom: '20px' }}>
          {t.conclusion_p1(
            totalGames,
            stats.on_att + stats.off_att,
            (stats.on_pct  * 100).toFixed(1),
            (stats.off_pct * 100).toFixed(1),
            (stats.diff    * 100).toFixed(1),
          )}
        </p>

        <div className="text-left" style={{ marginBottom: '28px' }}>
          <p
            className="font-mono font-bold tracking-[0.2em] uppercase text-[#1d4ed8]"
            style={{ fontSize: '9px', marginBottom: '12px', textShadow: '0 0 8px rgba(29,78,216,0.3)' }}
          >{t.ch_title}</p>
          <p className="font-serif text-[#38384a] leading-[1.8]" style={{ fontSize: '16px' }}>{t.ch_text}</p>
        </div>

        <div className="text-left" style={{ marginBottom: '28px' }}>
          <p
            className="font-mono font-bold tracking-[0.2em] uppercase text-[#1d4ed8]"
            style={{ fontSize: '9px', marginBottom: '12px', textShadow: '0 0 8px rgba(29,78,216,0.3)' }}
          >{t.cg_title}</p>
          <p className="font-serif text-[#38384a] leading-[1.8]" style={{ fontSize: '16px' }}>{t.cg_text}</p>
        </div>

        <p className="conclusion-kicker">
          {t.kicker1}<br />{t.kicker2}
        </p>
      </section>

      {/* ── 05 / METHODOLOGY ─────────────────────────────────────────────────── */}
      <Methodology stats={stats} t={t} />

      <footer
        className="flex flex-wrap justify-center font-mono uppercase border-t border-black/[0.07]"
        style={{ gap: '24px', padding: '24px 5vw', marginTop: '32px', fontSize: '8px', letterSpacing: '0.08em', color: '#7a7a8a' }}
      >
        <span>{t.footer_data}</span>
        <span>{t.footer_on_off}</span>
        <span>{t.footer_season}</span>
        <span style={{ borderLeft: '1px solid rgba(0,0,0,0.12)', paddingLeft: '24px' }}>
          <a href="https://github.com/vaquera26" target="_blank" rel="noopener noreferrer"
             className="flex items-center"
             style={{ color: '#7a7a8a', textDecoration: 'none', gap: '5px' }}
             onMouseEnter={e => { e.currentTarget.style.color = '#08080f' }}
             onMouseLeave={e => { e.currentTarget.style.color = '#7a7a8a' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            vaquera26
          </a>
        </span>
        <span>
          <a href="https://www.linkedin.com/in/juan-vaquera-ln" target="_blank" rel="noopener noreferrer"
             className="flex items-center"
             style={{ color: '#7a7a8a', textDecoration: 'none', gap: '5px' }}
             onMouseEnter={e => { e.currentTarget.style.color = '#1d4ed8' }}
             onMouseLeave={e => { e.currentTarget.style.color = '#7a7a8a' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Juan Vaquera
          </a>
        </span>
      </footer>

    </div>
  )
}
