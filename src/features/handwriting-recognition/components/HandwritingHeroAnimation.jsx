const activePixels = new Set([
  19, 20, 21, 22,
  36, 37, 38, 39, 40,
  53, 54, 57, 58,
  70, 71, 74, 75,
  87, 88, 91, 92,
  104, 105, 108, 109,
  121, 122, 123, 124, 125,
  138, 139, 142, 143,
  155, 156, 159, 160,
  172, 173, 174, 175, 176,
  190, 191, 192, 193,
  208, 209, 210,
]);

const accentPixels = new Set([21, 38, 58, 88, 123, 143, 174, 191]);

const probabilityRows = [
  { label: 'A', value: '0.97', scale: 0.97, featured: true },
  { label: '8', value: '0.96', scale: 0.96, featured: true },
  { label: 'B', value: '0.02', scale: 0.28 },
  { label: '3', value: '0.02', scale: 0.25 },
];

const neuralLayers = [
  { x: 468, y: [142, 178, 214, 250, 286] },
  { x: 524, y: [156, 198, 240, 282] },
  { x: 580, y: [174, 230, 286] },
];

const backgroundParticles = [
  [72, 76, 2.2, 0],
  [202, 62, 1.7, 1.5],
  [318, 392, 1.9, 3],
  [436, 72, 2.1, 4.5],
  [642, 84, 1.8, 2],
  [706, 344, 2.3, 5],
  [112, 376, 1.8, 6],
  [544, 378, 1.6, 3.7],
];

function isActiveConnection(layerIndex, connectionIndex, fromY, toY) {
  if (layerIndex === 0) return connectionIndex % 4 === 1 && fromY >= 178;
  return connectionIndex % 3 === 0 || toY === 230;
}

export default function HandwritingHeroAnimation() {
  return (
    <svg
      aria-hidden="true"
      className="handwriting-hero-animation"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 760 460"
    >
      <defs>
        <linearGradient id="handwritingFlowPanel" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#16494b" />
          <stop offset="100%" stopColor="#101827" />
        </linearGradient>
        <linearGradient id="handwritingFlowPaper" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dcefeb" />
        </linearGradient>
        <linearGradient id="handwritingFlowGold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#d89b18" />
        </linearGradient>
        <linearGradient id="handwritingFlowSheen" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="48%" stopColor="#dcefeb" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="handwritingSoftShadow" colorInterpolationFilters="sRGB" x="-22%" y="-24%" width="150%" height="160%">
          <feDropShadow dx="0" dy="18" floodColor="#000000" floodOpacity="0.24" stdDeviation="12" />
        </filter>
      </defs>

      <g className="handwriting-hero-animation__background">
        <rect className="handwriting-hero-animation__backdrop" height="460" width="760" />
        <rect className="handwriting-hero-animation__sheen" height="460" width="220" x="-230" />
        <g className="handwriting-hero-animation__grid">
          {Array.from({ length: 14 }, (_, index) => (
            <line key={`v-${index}`} x1={34 + index * 54} x2={34 + index * 54} y1="30" y2="430" />
          ))}
          {Array.from({ length: 9 }, (_, index) => (
            <line key={`h-${index}`} x1="30" x2="730" y1={46 + index * 46} y2={46 + index * 46} />
          ))}
        </g>
        <g className="handwriting-hero-animation__scanlines">
          <rect height="1.4" rx="1" width="660" x="50" y="118" />
          <rect height="1.4" rx="1" width="590" x="82" y="302" />
        </g>
        {backgroundParticles.map(([cx, cy, r, delay]) => (
          <circle
            className="handwriting-hero-animation__particle"
            cx={cx}
            cy={cy}
            key={`${cx}-${cy}`}
            r={r}
            style={{ '--particle-delay': `${delay}s` }}
          />
        ))}
      </g>

      <g className="handwriting-hero-animation__input-cards" filter="url(#handwritingSoftShadow)">
        <g className="handwriting-hero-animation__sample handwriting-hero-animation__sample--letter">
          <rect className="handwriting-hero-animation__paper" height="118" rx="10" width="108" x="52" y="102" />
          <rect className="handwriting-hero-animation__paper-shine" height="118" rx="10" width="108" x="52" y="102" />
          <text className="handwriting-hero-animation__glyph" x="106" y="183">A</text>
        </g>
        <g className="handwriting-hero-animation__sample handwriting-hero-animation__sample--digit">
          <rect className="handwriting-hero-animation__paper handwriting-hero-animation__paper--gold" height="118" rx="10" width="108" x="116" y="224" />
          <rect className="handwriting-hero-animation__paper-shine" height="118" rx="10" width="108" x="116" y="224" />
          <text className="handwriting-hero-animation__glyph handwriting-hero-animation__glyph--digit" x="170" y="304">8</text>
        </g>
      </g>

      <g className="handwriting-hero-animation__flow handwriting-hero-animation__flow--input">
        <path d="M232 232 C250 222 260 218 276 216" />
        {[0, 1, 2].map((index) => (
          <circle key={index} r="3.8" style={{ '--flow-delay': `${index * 1.55}s` }} />
        ))}
      </g>

      <g className="handwriting-hero-animation__pixel-stage">
        <text className="handwriting-hero-animation__caption" x="352" y="124">28x28 pixels</text>
        <rect className="handwriting-hero-animation__panel handwriting-hero-animation__panel--pixel" height="190" rx="14" width="150" x="276" y="138" />
        <rect className="handwriting-hero-animation__pixel-scan" height="22" rx="10" width="126" x="288" y="156" />
        {Array.from({ length: 221 }, (_, index) => {
          const col = index % 17;
          const row = Math.floor(index / 17);
          const active = activePixels.has(index);
          const accent = accentPixels.has(index);
          return (
            <rect
              className={[
                'handwriting-hero-animation__pixel',
                active ? 'handwriting-hero-animation__pixel--active' : '',
                accent ? 'handwriting-hero-animation__pixel--accent' : '',
              ].filter(Boolean).join(' ')}
              height="6"
              key={index}
              rx="1.4"
              style={{ '--pixel-delay': `${(row * 0.08 + col * 0.025).toFixed(2)}s` }}
              width="6"
              x={294 + col * 7}
              y={164 + row * 10}
            />
          );
        })}
      </g>

      <g className="handwriting-hero-animation__flow handwriting-hero-animation__flow--network">
        <path d="M432 230 C446 222 452 218 462 210" />
        {[0, 1, 2].map((index) => (
          <circle key={index} r="3.8" style={{ '--flow-delay': `${1.1 + index * 1.55}s` }} />
        ))}
      </g>

      <g className="handwriting-hero-animation__network-stage">
        <text className="handwriting-hero-animation__caption" x="524" y="124">MLP</text>
        {neuralLayers.flatMap((layer, layerIndex) =>
          layer.y.flatMap((y) =>
            neuralLayers[layerIndex + 1]?.y.map((nextY, connectionIndex) => {
              const active = isActiveConnection(layerIndex, connectionIndex, y, nextY);
              return (
                <line
                  className={active ? 'handwriting-hero-animation__connection handwriting-hero-animation__connection--active' : 'handwriting-hero-animation__connection'}
                  key={`${layer.x}-${y}-${nextY}`}
                  style={{ '--connection-delay': `${(layerIndex * 1.2 + connectionIndex * 0.12).toFixed(2)}s` }}
                  x1={layer.x}
                  x2={neuralLayers[layerIndex + 1].x}
                  y1={y}
                  y2={nextY}
                />
              );
            }) ?? [],
          ),
        )}
        {neuralLayers.map((layer, layerIndex) => (
          <g key={layer.x}>
            {layer.y.map((y, nodeIndex) => (
              <circle
                className={
                  nodeIndex === layerIndex || y === 230
                    ? 'handwriting-hero-animation__node handwriting-hero-animation__node--active'
                    : 'handwriting-hero-animation__node'
                }
                cx={layer.x}
                cy={y}
                key={y}
                r="6.7"
                style={{ '--node-delay': `${(layerIndex * 0.75 + nodeIndex * 0.18).toFixed(2)}s` }}
              />
            ))}
          </g>
        ))}
      </g>

      <g className="handwriting-hero-animation__flow handwriting-hero-animation__flow--softmax">
        <path d="M590 230 C596 224 602 218 608 210" />
        {[0, 1].map((index) => (
          <circle key={index} r="3.8" style={{ '--flow-delay': `${2.1 + index * 1.9}s` }} />
        ))}
      </g>

      <g className="handwriting-hero-animation__softmax-stage">
        <text className="handwriting-hero-animation__caption" x="652" y="124">probabilidades</text>
        <rect className="handwriting-hero-animation__panel handwriting-hero-animation__panel--result" height="188" rx="14" width="132" x="586" y="138" />
        {probabilityRows.map((row, index) => (
          <g
            className={row.featured ? 'handwriting-hero-animation__probability handwriting-hero-animation__probability--featured' : 'handwriting-hero-animation__probability'}
            key={row.label}
            transform={`translate(602 ${164 + index * 33})`}
          >
            <text x="0" y="12">{row.label}</text>
            <rect className="handwriting-hero-animation__probability-track" height="9" rx="4.5" width="70" x="22" y="4" />
            <rect
              className="handwriting-hero-animation__probability-bar"
              height="9"
              rx="4.5"
              style={{ '--bar-scale': row.scale }}
              width="70"
              x="22"
              y="4"
            />
            <text className="handwriting-hero-animation__probability-value" x="98" y="12">{row.value}</text>
          </g>
        ))}
        <g className="handwriting-hero-animation__badge" transform="translate(602 296)">
          <rect height="24" rx="12" width="104" />
          <path d="M14 12.5 L19 17 L28 7.5" />
          <text x="36" y="16">Predição</text>
        </g>
      </g>
    </svg>
  );
}
