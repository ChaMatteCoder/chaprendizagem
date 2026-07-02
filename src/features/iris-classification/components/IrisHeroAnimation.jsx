const featureRows = [
  { label: 'sépala C', value: '5,1', width: 0.72 },
  { label: 'sépala L', value: '3,5', width: 0.56 },
  { label: 'pétala C', value: '1,4', width: 0.24 },
  { label: 'pétala L', value: '0,2', width: 0.12 },
];

const networkLayers = [
  { x: 426, y: [145, 193, 241, 289] },
  { x: 482, y: [160, 204, 248, 292] },
  { x: 538, y: [178, 226, 274] },
];

const speciesRows = [
  { label: 'setosa', value: '93%', scale: 0.93, featured: true },
  { label: 'versicolor', value: '05%', scale: 0.31 },
  { label: 'virginica', value: '02%', scale: 0.18 },
];

const particles = [
  [54, 72, 2.2, 0], [208, 54, 1.6, 1.3], [318, 396, 1.8, 2.8], [424, 72, 2, 4.4],
  [596, 62, 1.5, 1.8], [714, 344, 2.2, 5.7], [90, 386, 1.7, 3.6], [564, 390, 1.8, 6.4],
];

function IrisFlower({ className = '', x = 0, y = 0, scale = 1 }) {
  const petals = [-72, -36, 0, 36, 72];

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={`iris-hero-animation__flower ${className}`}>
        <path className="iris-hero-animation__stem" d="M0 42 C-6 88 8 122 2 178" />
        <path className="iris-hero-animation__leaf" d="M1 118 C-34 90 -48 114 -4 140 C-2 131 0 124 1 118 Z" />
        <path className="iris-hero-animation__leaf iris-hero-animation__leaf--right" d="M3 142 C42 108 52 137 6 160 C5 153 4 147 3 142 Z" />
        {petals.map((angle, index) => (
          <ellipse
            className={`iris-hero-animation__petal iris-hero-animation__petal--${index + 1}`}
            cx="0"
            cy="-28"
            key={angle}
            rx="25"
            ry="54"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle className="iris-hero-animation__flower-core" cx="0" cy="0" r="15" />
        <circle className="iris-hero-animation__flower-core-dot" cx="0" cy="0" r="5" />
      </g>
    </g>
  );
}

export default function IrisHeroAnimation() {
  return (
    <svg aria-hidden="true" className="iris-hero-animation" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 760 460">
      <defs>
        <linearGradient id="irisHeroBackdrop" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#052f35" />
          <stop offset="48%" stopColor="#123b45" />
          <stop offset="100%" stopColor="#151928" />
        </linearGradient>
        <radialGradient id="irisHeroBloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#bbfff2" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#bbfff2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="irisHeroPetal" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f9fff9" />
          <stop offset="48%" stopColor="#c9f0e8" />
          <stop offset="100%" stopColor="#8a75c7" />
        </linearGradient>
        <linearGradient id="irisHeroPetalGold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#fff0ad" />
          <stop offset="100%" stopColor="#d89b18" />
        </linearGradient>
        <linearGradient id="irisHeroSignal" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#a8fff1" />
          <stop offset="50%" stopColor="#f6d06f" />
          <stop offset="100%" stopColor="#e8ddff" />
        </linearGradient>
        <linearGradient id="irisHeroSheen" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="irisHeroShadow" colorInterpolationFilters="sRGB" x="-30%" y="-30%" width="170%" height="180%">
          <feDropShadow dx="0" dy="18" floodColor="#000000" floodOpacity="0.28" stdDeviation="14" />
        </filter>
        <filter id="irisHeroGlow" colorInterpolationFilters="sRGB" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g className="iris-hero-animation__scene">
        <rect className="iris-hero-animation__backdrop" height="460" width="760" />
        <circle className="iris-hero-animation__bloom iris-hero-animation__bloom--left" cx="148" cy="184" r="190" />
        <circle className="iris-hero-animation__bloom iris-hero-animation__bloom--right" cx="650" cy="202" r="160" />
        <g className="iris-hero-animation__grid">
          {Array.from({ length: 14 }, (_, index) => <line key={`v-${index}`} x1={30 + index * 54} x2={30 + index * 54} y1="28" y2="430" />)}
          {Array.from({ length: 8 }, (_, index) => <line key={`h-${index}`} x1="28" x2="732" y1={52 + index * 50} y2={52 + index * 50} />)}
        </g>
        <rect className="iris-hero-animation__sheen" height="460" width="190" x="-210" />
        {particles.map(([cx, cy, radius, delay]) => (
          <circle className="iris-hero-animation__particle" cx={cx} cy={cy} key={`${cx}-${cy}`} r={radius} style={{ '--particle-delay': `${delay}s` }} />
        ))}
      </g>

      <g className="iris-hero-animation__botanical-stage" filter="url(#irisHeroShadow)">
        <text className="iris-hero-animation__caption" x="136" y="68">amostra</text>
        <ellipse className="iris-hero-animation__botanical-halo" cx="136" cy="232" rx="112" ry="166" />
        <IrisFlower className="iris-hero-animation__flower--main" x={136} y={188} scale={0.92} />
        <path className="iris-hero-animation__measure iris-hero-animation__measure--vertical" d="M54 112 H66 M60 112 V314 M54 314 H66" />
        <path className="iris-hero-animation__measure iris-hero-animation__measure--horizontal" d="M78 86 V98 M78 92 H196 M196 86 V98" />
        <text className="iris-hero-animation__measure-label" x="44" y="220" transform="rotate(-90 44 220)">comprimento</text>
        <text className="iris-hero-animation__measure-label" x="137" y="82">largura</text>
        <rect className="iris-hero-animation__scanner" height="212" rx="2" width="3" x="78" y="104" />
        <path className="iris-hero-animation__ground" d="M48 368 C96 350 168 352 226 368" />
      </g>

      <g className="iris-hero-animation__feature-stage">
        <text className="iris-hero-animation__caption" x="309" y="92">4 atributos</text>
        <rect className="iris-hero-animation__panel" height="232" rx="16" width="132" x="242" y="108" />
        {featureRows.map((row, index) => (
          <g className="iris-hero-animation__feature" key={row.label} style={{ '--feature-delay': `${index * 0.22}s` }} transform={`translate(258 ${136 + index * 47})`}>
            <text className="iris-hero-animation__feature-label" x="0" y="0">{row.label}</text>
            <text className="iris-hero-animation__feature-value" x="98" y="0">{row.value}</text>
            <rect className="iris-hero-animation__feature-track" height="6" rx="3" width="98" x="0" y="10" />
            <rect className="iris-hero-animation__feature-bar" height="6" rx="3" style={{ '--feature-scale': row.width }} width="98" x="0" y="10" />
          </g>
        ))}
        <g className="iris-hero-animation__flow iris-hero-animation__flow--features">
          <path d="M210 224 C222 216 230 210 242 206" />
          {[0, 1, 2].map((index) => <circle key={index} r="3.6" style={{ '--flow-delay': `${index * 1.35}s` }} />)}
        </g>
      </g>

      <g className="iris-hero-animation__network-stage">
        <text className="iris-hero-animation__caption" x="482" y="92">MLP</text>
        {networkLayers.flatMap((layer, layerIndex) => layer.y.flatMap((y, nodeIndex) =>
          networkLayers[layerIndex + 1]?.y.map((nextY, connectionIndex) => (
            <line className="iris-hero-animation__connection" key={`${layer.x}-${y}-${nextY}`} style={{ '--connection-delay': `${(layerIndex * 0.9 + nodeIndex * 0.15 + connectionIndex * 0.08).toFixed(2)}s` }} x1={layer.x} x2={networkLayers[layerIndex + 1].x} y1={y} y2={nextY} />
          )) ?? [],
        ))}
        {networkLayers.map((layer, layerIndex) => (
          <g key={layer.x}>{layer.y.map((y, nodeIndex) => (
            <circle className="iris-hero-animation__node" cx={layer.x} cy={y} key={y} r={layerIndex === 2 ? 7.5 : 6.5} style={{ '--node-delay': `${(layerIndex * 0.7 + nodeIndex * 0.2).toFixed(2)}s` }} />
          ))}</g>
        ))}
        <g className="iris-hero-animation__flow iris-hero-animation__flow--network">
          <path d="M374 224 C390 216 400 210 420 204" />
          {[0, 1, 2].map((index) => <circle key={index} r="3.6" style={{ '--flow-delay': `${1.1 + index * 1.45}s` }} />)}
        </g>
      </g>

      <g className="iris-hero-animation__result-stage">
        <text className="iris-hero-animation__caption" x="653" y="92">classificação</text>
        <rect className="iris-hero-animation__panel iris-hero-animation__panel--result" height="232" rx="16" width="154" x="574" y="108" />
        {speciesRows.map((row, index) => (
          <g className={`iris-hero-animation__species ${row.featured ? 'iris-hero-animation__species--featured' : ''}`} key={row.label} transform={`translate(592 ${142 + index * 48})`}>
            <circle cx="5" cy="-4" r="5" />
            <text className="iris-hero-animation__species-label" x="17" y="0">{row.label}</text>
            <text className="iris-hero-animation__species-value" x="118" y="0">{row.value}</text>
            <rect className="iris-hero-animation__species-track" height="7" rx="3.5" width="118" x="0" y="11" />
            <rect className="iris-hero-animation__species-bar" height="7" rx="3.5" style={{ '--species-scale': row.scale }} width="118" x="0" y="11" />
          </g>
        ))}
        <g className="iris-hero-animation__prediction" transform="translate(592 294)">
          <rect height="28" rx="14" width="118" />
          <path d="M12 14 L17 19 L26 9" />
          <text x="35" y="18">Iris-setosa</text>
        </g>
        <g className="iris-hero-animation__flow iris-hero-animation__flow--result">
          <path d="M546 226 C556 222 564 214 574 206" />
          {[0, 1].map((index) => <circle key={index} r="3.6" style={{ '--flow-delay': `${2.4 + index * 1.8}s` }} />)}
        </g>
      </g>

      <g className="iris-hero-animation__timeline">
        <rect height="2" rx="1" width="664" x="48" y="414" />
        <rect className="iris-hero-animation__timeline-progress" height="2" rx="1" width="664" x="48" y="414" />
        <text x="48" y="438">medir</text><text x="288" y="438">normalizar</text><text x="486" y="438">inferir</text><text x="712" y="438">classificar</text>
      </g>
    </svg>
  );
}
