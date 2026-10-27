import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import usePixelGame from '../hooks/usePixelGame.js';
import usePixelLab from '../hooks/usePixelLab.js';
import PixelChrome from '../components/PixelChrome.jsx';
import PixelLabConvSection from '../components/PixelLabConvSection.jsx';
import PixelLabDataSection from '../components/PixelLabDataSection.jsx';
import PixelLabNetworkSection from '../components/PixelLabNetworkSection.jsx';
import PixelLabResultsSection from '../components/PixelLabResultsSection.jsx';
import PixelLabRobustnessSection from '../components/PixelLabRobustnessSection.jsx';

const sections = [
  {
    id: 'data',
    label: 'Entrada',
    subtitle: 'Imagem e previsão',
    question: 'O que entra e o que sai da rede?',
    description:
      'Uma foto vira números. A CNN transforma esses números em probabilidades para dez classes.',
    script:
      'Esta é uma imagem real da validação. Cada pixel tem três valores: vermelho, verde e azul. Dividimos os valores por 255 e a rede devolve dez probabilidades. O maior valor define o palpite; confiança alta não garante acerto.',
  },
  {
    id: 'network',
    label: 'Camadas',
    subtitle: 'Por dentro da CNN',
    question: 'Como a imagem percorre a CNN?',
    description:
      'Os filtros aprendidos produzem mapas. ReLU e pooling transformam esses mapas até a classificação.',
    script:
      'A rede tem três convoluções, dois max poolings e 61.130 parâmetros. Os filtros foram aprendidos no treino. A ReLU zera valores negativos; o pooling reduz a dimensão. Os mapas mostram respostas numéricas e não explicam, sozinhos, a causa da decisão.',
  },
  {
    id: 'conv',
    label: 'Cálculo',
    subtitle: 'Convolução na prática',
    question: 'Como um filtro produz um único valor?',
    description:
      'Escolha uma posição e acompanhe: recortar, multiplicar, somar o bias e aplicar ReLU.',
    script:
      'Seleciono uma posição da imagem e um filtro real. São nove produtos em cada um dos três canais: 27 ao todo. Somo os produtos e o bias, depois aplico ReLU. O valor calculado é comparado à ativação extraída da rede.',
  },
  {
    id: 'results',
    label: 'Avaliação',
    subtitle: 'Treino e resultados',
    question: 'Como sabemos quanto a CNN acerta?',
    description:
      'O desempenho vem de um conjunto de teste separado. Aqui estão as curvas e as métricas registradas.',
    script:
      'São 45 mil imagens para treino e 5 mil para validação. A validação escolhe o checkpoint. As 10 mil imagens do teste oficial medem o desempenho final. A matriz de confusão mostra as classes que a rede mais confunde; o placar do jogo não substitui essa avaliação.',
  },
  {
    id: 'robustness',
    label: 'Alterações',
    subtitle: 'Sensibilidade aos pixels',
    question: 'O que muda quando alteramos a imagem?',
    description:
      'Mude brilho, contraste e ruído. Compare o experimento individual com o protocolo agregado.',
    script:
      'Os pesos estão congelados. Ao mudar os pixels, a previsão pode mudar, inclusive para pior. Esta imagem é uma demonstração; a tabela agregada usa todas as 5 mil imagens de validação em condições previamente definidas.',
  },
];

export default function PixelLabPage() {
  const game = usePixelGame();
  const lab = usePixelLab({ initialContext: game?.labContext });
  const [params, setParams] = useSearchParams();
  const index = Math.max(
    0,
    sections.findIndex((s) => s.id === params.get('etapa')),
  );
  const section = sections[index];
  const presenting = params.get('apresentacao') === '1';
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [selectedCoord, setSelectedCoord] = useState({ row: 15, col: 15 });
  const headingRef = useRef(null);
  function navigate(id) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('etapa', id);
        return next;
      },
      { replace: true },
    );
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  function togglePresentation() {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (presenting) next.delete('apresentacao');
        else next.set('apresentacao', '1');
        return next;
      },
      { replace: true },
    );
  }
  const ready =
    lab.status === 'ready' && lab.currentSample && lab.processedImages;
  return (
    <PixelChrome mode="lab">
      <main id="pixel-main-content" tabIndex={-1} className="pixel-main">
        <header className="pixel-lab-header">
          <div>
            <p className="pixel-eyebrow">
              CNN & CIFAR-10 · Explore para entender
            </p>
            <h1>
              PixelLab<span style={{ color: 'var(--teal)' }}>.</span>
            </h1>
            <p>
              Da imagem à previsão, uma etapa por vez. Explore o mesmo modelo
              que faz os palpites do jogo.
            </p>
          </div>
          <div className="pixel-hero__actions">
            <button
              type="button"
              className={`pixel-btn ${presenting ? 'is-primary' : 'is-outline'}`}
              aria-pressed={presenting}
              onClick={togglePresentation}
            >
              <BookOpen size={17} />
              {presenting ? 'Fechar roteiro' : 'Modo apresentação'}
            </button>
            {game.state.round && (
              <Link to="/pixel/jogo" className="pixel-inline-link">
                <ArrowLeft size={16} /> Voltar à rodada
              </Link>
            )}
          </div>
        </header>
        <nav className="pixel-lab-tabs" aria-label="Etapas do PixelLab">
          {sections.map((item, i) => (
            <button
              type="button"
              className={`pixel-tab-btn${i === index ? ' is-active' : ''}`}
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={i === index ? 'step' : undefined}
              aria-controls="pixel-lab-section"
            >
              <span>0{i + 1}</span>
              <div>
                <strong>{item.label}</strong>
                <small>{item.subtitle}</small>
              </div>
            </button>
          ))}
        </nav>
        {ready && (
          <div className="pixel-lab-context">
            <div>
              <strong>
                {lab.replayContext
                  ? `Imagem da rodada ${lab.replayContext.roundNumber}`
                  : 'Amostra de validação'}
              </strong>
              <span>
                {lab.replayContext
                  ? 'Comparando o original com os pixels exatos do último teste.'
                  : 'Demonstração · modelo congelado'}
              </span>
            </div>
            <label>
              Imagem em estudo
              <select
                aria-label="Imagem em estudo"
                value={lab.currentSample.id}
                onChange={(e) => {
                  lab.selectSample(e.target.value);
                  game.clearLabContext();
                }}
              >
                {lab.bundle.samples.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.classNamePt} · {s.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {presenting && (
          <aside
            className="pixel-presentation"
            aria-label="Roteiro de apresentação"
          >
            <div>
              <strong>O que explicar · Passo {index + 1} de 5</strong>
              <p>{section.script}</p>
            </div>
          </aside>
        )}
        <div className="pixel-lab-question">
          <span aria-hidden="true">0{index + 1}</span>
          <div>
            <h2 ref={headingRef} tabIndex={-1}>
              {section.question}
            </h2>
            <p>{section.description}</p>
          </div>
        </div>
        {!ready ? (
          <section
            className="pixel-panel pixel-load-card"
            aria-busy={lab.status !== 'error'}
          >
            {lab.status !== 'error' && (
              <LoaderCircle className="pixel-spinner" size={25} />
            )}
            <h2>
              {lab.status === 'error'
                ? 'Não foi possível abrir o laboratório.'
                : 'Preparando o modelo e as imagens…'}
            </h2>
            <p role={lab.status === 'error' ? 'alert' : 'status'}>
              {lab.error ||
                'Carregando os pesos reais da CNN para sua investigação.'}
            </p>
            {lab.status === 'error' && (
              <button
                type="button"
                className="pixel-btn is-primary"
                onClick={lab.retryLoad}
              >
                <RefreshCw size={16} /> Tentar novamente
              </button>
            )}
          </section>
        ) : (
          <>
            {lab.inspection.status === 'error' && (
              <div className="pixel-error-banner" role="alert">
                <span>{lab.inspection.error}</span>
                <button
                  type="button"
                  className="pixel-btn is-small is-outline"
                  onClick={lab.retryInspection}
                >
                  Repetir análise
                </button>
              </div>
            )}
            <div
              id="pixel-lab-section"
              aria-busy={lab.inspection.status === 'loading'}
            >
              {section.id === 'data' && (
                <PixelLabDataSection
                  bundle={lab.bundle}
                  currentSample={lab.currentSample}
                  processedImages={lab.processedImages}
                  inspection={lab.inspection}
                  replayContext={lab.replayContext}
                />
              )}
              {section.id === 'network' && (
                <PixelLabNetworkSection
                  inspection={lab.inspection}
                  onOpenFilterInConv={(filter) => {
                    setSelectedFilter(filter);
                    navigate('conv');
                  }}
                />
              )}
              {section.id === 'conv' && (
                <PixelLabConvSection
                  currentSample={lab.currentSample}
                  processedImages={lab.processedImages}
                  inspection={lab.inspection}
                  selectedFilter={selectedFilter}
                  onSelectFilter={setSelectedFilter}
                  selectedCoord={selectedCoord}
                  onSelectCoord={setSelectedCoord}
                />
              )}
              {section.id === 'results' && (
                <PixelLabResultsSection bundle={lab.bundle} />
              )}
              {section.id === 'robustness' && (
                <PixelLabRobustnessSection
                  bundle={lab.bundle}
                  currentSample={lab.currentSample}
                  onSelectSample={lab.selectSample}
                  perturbation={lab.perturbation}
                  onUpdatePerturbation={lab.updatePerturbation}
                  onResetPerturbation={lab.resetPerturbation}
                  processedImages={lab.processedImages}
                  inspection={lab.inspection}
                  replayContext={lab.replayContext}
                />
              )}
            </div>
          </>
        )}
        <nav
          className="pixel-lab-pagination"
          aria-label="Navegação entre etapas"
        >
          <button
            type="button"
            className="pixel-btn is-outline"
            disabled={index === 0}
            onClick={() => navigate(sections[index - 1].id)}
          >
            <ArrowLeft size={16} /> Etapa anterior
          </button>
          {index < 4 ? (
            <button
              type="button"
              className="pixel-btn is-primary"
              onClick={() => navigate(sections[index + 1].id)}
            >
              Próximo: {sections[index + 1].label.toLowerCase()}{' '}
              <ArrowRight size={16} />
            </button>
          ) : (
            <Link to="/pixel/jogo" className="pixel-btn is-primary">
              Experimentar no jogo <ArrowRight size={16} />
            </Link>
          )}
        </nav>
      </main>
    </PixelChrome>
  );
}
