import { Boxes, ChartSpline, Database, Sparkles, Target } from 'lucide-react';

const clusterColors = ['#33a99d', '#8066bd', '#d89b18', '#c65f45'];

const heroPoints = [
  { x: 112, y: 242, cluster: 0 }, { x: 139, y: 224, cluster: 0 },
  { x: 150, y: 258, cluster: 0 }, { x: 94, y: 268, cluster: 0 },
  { x: 414, y: 87, cluster: 1 }, { x: 452, y: 72, cluster: 1 },
  { x: 474, y: 107, cluster: 1 }, { x: 432, y: 123, cluster: 1 },
  { x: 112, y: 82, cluster: 2 }, { x: 84, y: 108, cluster: 2 },
  { x: 146, y: 118, cluster: 2 }, { x: 126, y: 142, cluster: 2 },
  { x: 410, y: 236, cluster: 3 }, { x: 448, y: 220, cluster: 3 },
  { x: 478, y: 252, cluster: 3 }, { x: 432, y: 270, cluster: 3 },
];

const seededCentroids = [
  { x: 126, y: 248, cluster: 0, order: 2 },
  { x: 448, y: 99, cluster: 1, order: 4 },
  { x: 116, y: 112, cluster: 2, order: 1 },
  { x: 444, y: 246, cluster: 3, order: 3 },
];

const chips = [
  { icon: Boxes, label: 'K-Means clássico' },
  { icon: Sparkles, label: 'K-Means++' },
  { icon: ChartSpline, label: 'EQT × iteração' },
  { icon: Database, label: 'MiniBatchKMeans' },
  { icon: Target, label: 'Inicialização inteligente' },
];

export default function KMeansPlusPlusHero({ isOpen, onOpenLab }) {
  return (
    <section className="kmeans-plus-hero reveal-up">
      <div className="kmeans-plus-hero__copy">
        <p className="eyebrow">Trabalho 11 · Família K-Means</p>
        <h1>K-Means++: escolhendo melhores centroides iniciais</h1>
        <p>
          Trabalho 11 — comparação entre K-Means clássico, K-Means++ e MiniBatchKMeans.
          Observe como uma semeadura mais cuidadosa pode mudar o caminho até a convergência.
        </p>

        <div className="kmeans-plus-hero__chips" aria-label="Tópicos deste laboratório">
          {chips.map(({ icon: Icon, label }) => (
            <span key={label}><Icon aria-hidden="true" size={15} /> {label}</span>
          ))}
        </div>

        <button className="button button--primary" onClick={onOpenLab} type="button">
          {isOpen ? 'Ir para o laboratório' : 'Abrir laboratório'} <Sparkles aria-hidden="true" size={17} />
        </button>
      </div>

      <div
        className="kmeans-plus-hero__visual"
        aria-label="Esquema da inicialização K-Means++: primeiro centroide sorteado e próximos favorecidos pela distância quadrática"
        role="img"
      >
        <svg aria-hidden="true" viewBox="0 0 560 330">
          <defs>
            <linearGradient id="kmeansPlusHeroSurface" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#f8fbf9" />
              <stop offset="1" stopColor="#e9f3ef" />
            </linearGradient>
            <pattern height="28" id="kmeansPlusHeroGrid" patternUnits="userSpaceOnUse" width="28">
              <path d="M28 0H0V28" fill="none" stroke="rgba(0,87,91,.055)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect fill="url(#kmeansPlusHeroSurface)" height="330" rx="28" width="560" />
          <rect fill="url(#kmeansPlusHeroGrid)" height="330" opacity=".9" rx="28" width="560" />
          <text fill="#00575b" fontSize="11" fontWeight="800" letterSpacing="1" x="30" y="34">1º CENTRO: SORTEIO COM SEED</text>
          <text fill="#626b67" fontSize="11" fontWeight="700" textAnchor="end" x="530" y="34">PRÓXIMOS: P(x) ∝ D(x)²</text>

          {seededCentroids.map((centroid) => (
            <ellipse
              cx={centroid.x}
              cy={centroid.y}
              fill={clusterColors[centroid.cluster]}
              key={`cloud-${centroid.cluster}`}
              opacity=".07"
              rx="64"
              ry="48"
            />
          ))}

          <g className="kmeans-plus-hero__distance-lines">
            {seededCentroids.slice(1).map((centroid) => (
              <line
                key={centroid.order}
                stroke="#00575b"
                strokeDasharray="4 7"
                strokeOpacity=".19"
                x1="116"
                x2={centroid.x}
                y1="112"
                y2={centroid.y}
              />
            ))}
          </g>

          {heroPoints.map((point, index) => (
            <circle
              cx={point.x}
              cy={point.y}
              fill={clusterColors[point.cluster]}
              key={`point-${index}`}
              opacity=".72"
              r="5"
              stroke="#ffffff"
              strokeWidth="1.4"
            />
          ))}

          <g className="kmeans-plus-hero__centroids">
            {seededCentroids.map((centroid) => (
              <g key={`centroid-${centroid.cluster}`} transform={`translate(${centroid.x} ${centroid.y})`}>
                <circle fill="#ffffff" r="13" stroke={clusterColors[centroid.cluster]} strokeWidth="3" />
                <path d="M-5 0H5M0-5V5" fill="none" stroke="#08353a" strokeLinecap="round" strokeWidth="2.4" />
                <circle cx="15" cy="-15" fill="#08353a" r="8" />
                <text fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle" x="15" y="-12">{centroid.order}</text>
              </g>
            ))}
          </g>

          <g transform="translate(280 300)">
            <rect fill="rgba(0,87,91,.07)" height="24" rx="12" width="248" x="-124" y="-15" />
            <text fill="#00575b" fontSize="10" fontWeight="800" textAnchor="middle">SEMEADURA CONCLUÍDA → CICLO DE LLOYD</text>
          </g>
        </svg>

        <div className="kmeans-plus-hero__readout">
          <span>A diferença acontece antes da iteração 1</span>
          <strong>sortear → ponderar por D² → iniciar Lloyd</strong>
        </div>
      </div>
    </section>
  );
}
