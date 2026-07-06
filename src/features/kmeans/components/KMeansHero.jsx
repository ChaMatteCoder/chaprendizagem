import { Boxes, ChartSpline, Crosshair, Sparkles } from 'lucide-react';

const heroPoints = [
  [72, 218, 0], [96, 190, 0], [126, 226, 0], [111, 174, 0],
  [300, 76, 1], [335, 96, 1], [355, 60, 1], [320, 128, 1],
  [95, 74, 2], [132, 96, 2], [154, 62, 2], [118, 122, 2],
  [304, 206, 3], [342, 224, 3], [368, 188, 3], [326, 172, 3],
];
const colors = ['#11a6a1', '#8b66d9', '#db9d1d', '#de7053'];

export default function KMeansHero({ isOpen, onOpenLab }) {
  return (
    <section className="kmeans-hero">
      <div className="kmeans-hero__copy">
        <p className="eyebrow">Trabalho 10 · laboratório não supervisionado</p>
        <h1>K-Means: agrupando observações sem rótulos</h1>
        <p>
          Trabalho 10 — visualização interativa do algoritmo clássico, centroides e curva de erro quadrático total.
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

      <div className="kmeans-hero__visual" aria-label="Quatro grupos de pontos orbitando seus centroides">
        <svg role="img" viewBox="0 0 440 290">
          <title>Representação de quatro clusters e seus centroides</title>
          <defs>
            <radialGradient id="kmeansGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#b8eee6" stopOpacity=".28" />
              <stop offset="1" stopColor="#071f25" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="220" cy="145" fill="url(#kmeansGlow)" r="185" />
          <g className="kmeans-hero__links">
            {heroPoints.map(([x, y, cluster], index) => {
              const centers = [[105, 203], [330, 91], [124, 88], [337, 201]];
              return <line key={index} x1={x} x2={centers[cluster][0]} y1={y} y2={centers[cluster][1]} />;
            })}
          </g>
          {heroPoints.map(([x, y, cluster], index) => (
            <circle className="kmeans-hero__point" cx={x} cy={y} fill={colors[cluster]} key={index} r="6" />
          ))}
          {[[105, 203], [330, 91], [124, 88], [337, 201]].map(([x, y], index) => (
            <g className="kmeans-hero__centroid" key={index} transform={`translate(${x} ${y})`}>
              <circle fill={colors[index]} r="14" />
              <path d="M-6 0H6M0-6V6" />
            </g>
          ))}
        </svg>
        <div className="kmeans-hero__readout"><span>Objetivo</span><strong>minimizar Σ ‖xᵢ − μcᵢ‖²</strong></div>
      </div>
    </section>
  );
}
