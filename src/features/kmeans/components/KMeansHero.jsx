import { Boxes, ChartSpline, Crosshair, Sparkles } from 'lucide-react';

const centers = [
  [108, 205],
  [330, 90],
  [124, 88],
  [338, 203],
];

const heroPoints = [
  { x: 72, y: 218, cluster: 0 },
  { x: 96, y: 190, cluster: 0 },
  { x: 126, y: 226, cluster: 0 },
  { x: 111, y: 174, cluster: 0 },
  { x: 300, y: 76, cluster: 1 },
  { x: 335, y: 96, cluster: 1 },
  { x: 355, y: 60, cluster: 1 },
  { x: 320, y: 128, cluster: 1 },
  { x: 95, y: 74, cluster: 2 },
  { x: 132, y: 96, cluster: 2 },
  { x: 154, y: 62, cluster: 2 },
  { x: 118, y: 122, cluster: 2 },
  { x: 304, y: 206, cluster: 3 },
  { x: 342, y: 224, cluster: 3 },
  { x: 368, y: 188, cluster: 3 },
  { x: 326, y: 172, cluster: 3 },
];

const colors = ['#24d3c0', '#a989ff', '#ffbe4f', '#ff896a'];

export default function KMeansHero({ isOpen, onOpenLab }) {
  return (
    <section className="kmeans-hero">
      <div className="kmeans-hero__copy">
        <p className="eyebrow">Laboratório não supervisionado</p>
        <h1>Agrupamento visual com K‑Means</h1>
        <p>
          Ajuste parâmetros, inicie o algoritmo e acompanhe os centroides procurando grupos naturais em observações sem rótulos.
        </p>
        <div className="kmeans-hero__chips" aria-label="Tópicos deste módulo">
          <span><Sparkles size={15} /> Aprendizagem não supervisionada</span>
          <span><Boxes size={15} /> K = 4</span>
          <span><ChartSpline size={15} /> EQT × iteração</span>
          <span><Crosshair size={15} /> Centroides</span>
        </div>
        <button className="button button--primary" onClick={onOpenLab} type="button">
          {isOpen ? 'Voltar ao laboratório' : 'Abrir laboratório'} <Sparkles size={17} />
        </button>
      </div>

      <div className="kmeans-hero__visual" aria-label="Animação de quatro grupos de pontos convergindo para seus centroides">
        <svg role="img" viewBox="0 0 440 290">
          <title>Animação conceitual de pontos, clusters e centroides do K-Means</title>
          <defs>
            <radialGradient id="kmeansGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#b8eee6" stopOpacity=".34" />
              <stop offset="1" stopColor="#071f25" stopOpacity="0" />
            </radialGradient>
            <filter id="kmeansSoftGlow" colorInterpolationFilters="sRGB" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feColorMatrix in="blur" result="glow" type="matrix" values="0 0 0 0 0.34 0 0 0 0 0.93 0 0 0 0 0.86 0 0 0 .42 0" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle className="kmeans-hero__core-glow" cx="220" cy="145" fill="url(#kmeansGlow)" r="188" />
          <path className="kmeans-hero__contour kmeans-hero__contour--one" d="M58 202C90 74 188 37 309 65C393 84 407 187 351 232C274 294 111 279 58 202Z" />
          <path className="kmeans-hero__contour kmeans-hero__contour--two" d="M79 92C157 22 306 34 366 116C421 191 322 268 210 255C91 242 14 151 79 92Z" />
          <g className="kmeans-hero__links">
            {heroPoints.map(({ x, y, cluster }, index) => {
              const [cx, cy] = centers[cluster];
              return (
                <line
                  key={index}
                  style={{ '--delay': `${index * 0.11}s` }}
                  x1={x}
                  x2={cx}
                  y1={y}
                  y2={cy}
                />
              );
            })}
          </g>
          {heroPoints.map(({ x, y, cluster }, index) => (
            <g className="kmeans-hero__point-node" key={index} style={{ '--delay': `${index * 0.16}s` }} transform={`translate(${x} ${y})`}>
              <circle className="kmeans-hero__point-halo" fill={colors[cluster]} r="8.4" />
              <circle className="kmeans-hero__point" fill={colors[cluster]} r="5.8" />
            </g>
          ))}
          {centers.map(([x, y], index) => (
            <g className="kmeans-hero__centroid" filter="url(#kmeansSoftGlow)" key={index} transform={`translate(${x} ${y})`}>
              <circle className="kmeans-hero__centroid-ring" fill="none" stroke={colors[index]} r="21" />
              <circle className="kmeans-hero__centroid-body" fill={colors[index]} r="14" />
              <path d="M-6 0H6M0-6V6" />
            </g>
          ))}
        </svg>
        <div className="kmeans-hero__readout"><span>O laboratório faz</span><strong>descobrir grupos + reduzir o EQT</strong></div>
      </div>
    </section>
  );
}
