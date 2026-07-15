import {
  BookOpen,
  Boxes,
  BrainCircuit,
  ChartNoAxesCombined,
  CircleHelp,
  Database,
  ExternalLink,
  Gauge,
  GitCompareArrows,
  Route,
  Shuffle,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  kmeansPlusInitializationSteps,
  kmeansPlusReferences,
  kmeansPlusTheoryCards,
} from '../data/kmeansPlusCopy.js';

const theoryIcons = {
  initialization: Shuffle,
  variability: GitCompareArrows,
  plusplus: Sparkles,
  distance: Route,
  eqt: ChartNoAxesCombined,
  minibatch: Database,
  scale: Gauge,
};

export default function KMeansPlusPlusTheory() {
  return (
    <div className="kmeans-plus-theory">
      <section className="kmeans-plus-theory__problem kmeans-glass-card reveal-up">
        <span className="kmeans-plus-theory__problem-icon"><CircleHelp aria-hidden="true" size={30} /></span>
        <div>
          <p className="eyebrow">1 · A pergunta central</p>
          <h2>Se o ciclo de Lloyd é o mesmo, por que o ponto de partida importa tanto?</h2>
        </div>
        <p>
          O K-Means reduz o erro a partir dos centroides que recebeu no início, mas não examina todas as partições
          possíveis. O K-Means++ prepara uma largada mais informada para diminuir o risco de começar com centros
          redundantes. Isso melhora a inicialização, sem garantir por si só o mínimo global.
        </p>
      </section>

      <section className="kmeans-section reveal-up" aria-labelledby="kmeans-plus-foundations-title">
        <div className="section-heading">
          <p className="eyebrow">2 · Fundamentos para a comparação</p>
          <h2 id="kmeans-plus-foundations-title">Da sensibilidade inicial à eficiência em grandes bases.</h2>
          <p>
            Leia os conceitos em sequência. Eles explicam o que muda entre os métodos e o que permanece igual.
          </p>
        </div>

        <div className="kmeans-plus-theory__card-grid stagger">
          {kmeansPlusTheoryCards.map((card) => {
            const Icon = theoryIcons[card.id] ?? BookOpen;
            return (
              <article className={`kmeans-plus-theory-card is-${card.id}`} key={card.id}>
                <span><Icon aria-hidden="true" size={23} /></span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="kmeans-section kmeans-plus-theory__shared-cycle reveal-up">
        <div className="section-heading">
          <p className="eyebrow">3 · O que realmente muda</p>
          <h2>Duas largadas, um mesmo refinamento.</h2>
          <p>
            A comparação é justa quando ambos os métodos usam os mesmos dados, K, tolerância, limite de iterações e
            seed. A única intervenção está na estratégia que produz os centroides iniciais.
          </p>
        </div>

        <div className="kmeans-plus-theory__comparison">
          <article>
            <span><Shuffle aria-hidden="true" size={23} /></span>
            <small>K-Means clássico</small>
            <h3>Escolha simples ou aleatória</h3>
            <p>Os centros podem nascer próximos, deixando regiões relevantes sem representação inicial.</p>
          </article>
          <div className="kmeans-plus-theory__comparison-bridge" aria-label="Os dois métodos seguem para o ciclo de Lloyd">
            <BrainCircuit aria-hidden="true" size={25} />
            <strong>Ciclo de Lloyd</strong>
            <span>atribuir → recalcular → repetir</span>
          </div>
          <article>
            <span><Sparkles aria-hidden="true" size={23} /></span>
            <small>K-Means++</small>
            <h3>Escolha ponderada por distância²</h3>
            <p>Os centros iniciais tendem a representar regiões distintas antes do refinamento começar.</p>
          </article>
        </div>
      </section>

      <section className="kmeans-section kmeans-plus-theory__steps reveal-up">
        <div className="section-heading">
          <p className="eyebrow">4 · Inicialização K-Means++</p>
          <h2>Como D² transforma distância em chance de escolha.</h2>
          <p>
            A probabilidade não seleciona obrigatoriamente o ponto mais distante. Ela favorece regiões afastadas sem
            eliminar a natureza aleatória — por isso a seed continua sendo parte do experimento.
          </p>
        </div>

        <ol className="kmeans-plus-theory__step-list">
          {kmeansPlusInitializationSteps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </li>
          ))}
        </ol>

        <div className="kmeans-plus-theory__formula-row">
          <article className="kmeans-plus-theory__formula-card">
            <span><Target aria-hidden="true" size={23} /></span>
            <small>Probabilidade de seleção</small>
            <strong>P(x) = D(x)² / Σ D(xᵢ)²</strong>
            <p>D(x) é a distância entre x e o centroide já escolhido mais próximo.</p>
          </article>
          <article className="kmeans-plus-theory__formula-card">
            <span><ChartNoAxesCombined aria-hidden="true" size={23} /></span>
            <small>Função objetivo</small>
            <strong>EQT = Σ ‖xᵢ − μcᵢ‖²</strong>
            <p>As duas curvas do laboratório registram essa soma depois de cada iteração.</p>
          </article>
        </div>
      </section>

      <section className="kmeans-section kmeans-plus-theory__scale-note reveal-up">
        <span><Database aria-hidden="true" size={28} /></span>
        <div>
          <p className="eyebrow">5 · Desafio de escala</p>
          <h2>MiniBatchKMeans troca parte da precisão por eficiência.</h2>
          <p>
            Em vez de recalcular todos os pontos em cada iteração, o método atualiza os centroides com amostras menores.
            O ganho esperado é computacional; a qualidade deve continuar sendo avaliada por EQT, estabilidade e leitura
            dos grupos.
          </p>
        </div>
        <div className="kmeans-plus-theory__scale-facts">
          <span><Boxes aria-hidden="true" size={18} /> Menos pontos por atualização</span>
          <span><Gauge aria-hidden="true" size={18} /> Menor custo por iteração</span>
          <span><GitCompareArrows aria-hidden="true" size={18} /> Comparação, não substituição</span>
        </div>
      </section>

      <section className="kmeans-section kmeans-plus-theory__references reveal-up" aria-labelledby="kmeans-plus-references-title">
        <div className="section-heading">
          <p className="eyebrow">Referências teóricas</p>
          <h2 id="kmeans-plus-references-title">Artigos clássicos e documentação para aprofundamento.</h2>
          <p>
            As fontes abaixo sustentam o histórico do algoritmo, a inicialização K-Means++ e as métricas usadas no
            laboratório.
          </p>
        </div>

        <div className="kmeans-plus-theory__reference-grid">
          {kmeansPlusReferences.map((reference) => (
            <article key={reference.id}>
              <span>{reference.kind}</span>
              <h3>{reference.title}</h3>
              <p>{reference.authors} ({reference.year}).</p>
              <a href={reference.url} rel="noreferrer" target="_blank">
                Consultar fonte <ExternalLink aria-hidden="true" size={15} />
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
