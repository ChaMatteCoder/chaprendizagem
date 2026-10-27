import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  FlaskConical,
  Gamepad2,
  HelpCircle,
  LoaderCircle,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Trophy,
  Waves,
} from 'lucide-react';
import { PIXEL_TOOL_LIMITS } from '../data/cifar10Schema.js';
import usePixelGame from '../hooks/usePixelGame.js';
import { formatPixelNumber } from '../lib/cnnMath.js';
import PixelCanvas from '../components/PixelCanvas.jsx';
import PixelChrome from '../components/PixelChrome.jsx';
import PixelPrediction from '../components/PixelPrediction.jsx';

const tools = [
  {
    id: 'brightness',
    title: 'Brilho',
    icon: Sun,
    hint: 'A foto está escura? Aumente a luz.',
    left: 'Mais escuro',
    right: 'Mais claro',
    value: (v) => `${v > 0 ? '+' : ''}${v}`,
  },
  {
    id: 'contrast',
    title: 'Contraste',
    icon: SlidersHorizontal,
    hint: 'A foto está apagada? Separe os tons.',
    left: 'Menos contraste',
    right: 'Mais contraste',
    value: (v) => `${formatPixelNumber(v, 2)}×`,
  },
  {
    id: 'smoothing',
    title: 'Suavização',
    icon: Waves,
    hint: 'Há granulação? Suavize com cuidado.',
    left: 'Sem suavizar',
    right: 'Mais suave',
    value: (v) => `${formatPixelNumber(v * 100, 0)}%`,
  },
];
const interferenceHints = {
  'underexposed-noisy':
    'A imagem chegou escura e com granulação. Experimente iluminar um pouco.',
  'overexposed-glare':
    'A imagem recebeu luz demais. Experimente diminuir o brilho.',
  'low-contrast-haze':
    'Os tons estão parecidos. Experimente aumentar o contraste.',
  'sensor-static':
    'A imagem está granulada. Um pouco de suavização pode ajudar.',
  'harsh-shadow-static':
    'As sombras estão fortes. Experimente reduzir o contraste.',
};

function GameIntro({ game }) {
  return (
    <main id="pixel-main-content" tabIndex={-1} className="pixel-main">
      <section className="pixel-game-intro pixel-panel">
        <div className="pixel-intro-icon">
          <Gamepad2 size={32} />
        </div>
        <p className="pixel-eyebrow">Pixel em Pânico!</p>
        <h1>
          Uma foto. Três testes.
          <br />
          <em>Você consegue ajudar a IA?</em>
        </h1>
        <p>
          Uma imagem com interferência chega à sua bancada. Ajuste os pixels
          para tentar fazer a CNN reconhecer o objeto certo.
        </p>
        <ol className="pixel-intro-rules">
          <li>
            <span>1</span>
            <div>
              <strong>Observe e ajuste</strong>
              <small>
                Brilho, contraste e suavização mudam a prévia livremente.
              </small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Teste seu ajuste na rede</strong>
              <small>
                Cada imagem permite até 3 testes. Só o botão consome um teste.
              </small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Revele a resposta</strong>
              <small>
                O último palpite testado vale. Se estiver certo, você ganha 100
                pontos.
              </small>
            </div>
          </li>
        </ol>
        <button
          type="button"
          className="pixel-btn is-primary"
          disabled={!game.initialized}
          onClick={() => game.start()}
        >
          {game.initialized ? (
            <>
              Começar partida <ArrowRight size={18} />
            </>
          ) : (
            'Preparando…'
          )}
        </button>
        <p className="pixel-caption">
          5 rodadas · Sem cronômetro · A IA também pode errar.
        </p>
      </section>
    </main>
  );
}

function FinalScoreboard({ game, headingRef }) {
  const { state } = game;
  const outcomeLabels = {
    keptCorrect: 'Acertou antes e depois',
    fixedError: 'Erro virou acerto',
    brokeCorrect: 'Acerto virou erro',
    keptError: 'Errou antes e depois',
  };
  return (
    <main id="pixel-main-content" tabIndex={-1} className="pixel-main">
      <section className="pixel-panel pixel-scoreboard">
        <div className="pixel-intro-icon">
          <Trophy size={34} />
        </div>
        <p className="pixel-eyebrow">Partida concluída</p>
        <h1 ref={headingRef} tabIndex={-1}>
          Cada ajuste conta.
        </h1>
        <div className="pixel-final-score">
          {state.score}
          <span> / {state.maxScore} pontos</span>
        </div>
        <p>
          A CNN acertou {state.score / 100} das 5 imagens no palpite final. Veja
          o que seus ajustes mudaram.
        </p>
        <div className="pixel-outcomes-grid">
          {Object.entries(outcomeLabels).map(([key, label]) => (
            <div key={key} className={`pixel-outcome-box is-${key}`}>
              <strong>{state.outcomes[key]}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="pixel-round-history">
          {state.history.map((item, idx) => (
            <article key={item.sampleId}>
              <PixelCanvas
                pixels={item.originalPixels}
                size="sm"
                label={`Rodada ${item.roundNumber}: ${item.revealed.trueClass.pt}`}
              />
              <div>
                <strong>{item.revealed.trueClass.pt}</strong>
                <span>
                  {item.initialPrediction.winnerClass.pt} →{' '}
                  {item.finalPrediction.winnerClass.pt}
                </span>
                <small>{item.revealed.outcomeLabel}</small>
              </div>
              <strong className="pixel-history-points">
                +{item.revealed.pointsEarned}
              </strong>
              <Link
                to="/pixel/lab"
                className="pixel-inline-link"
                onClick={() => game.openLabContext(idx)}
                aria-label={`Explorar rodada ${item.roundNumber} no PixelLab`}
              >
                <FlaskConical size={17} /> Explorar
              </Link>
            </article>
          ))}
        </div>
        <div className="pixel-hero__actions">
          <button
            type="button"
            className="pixel-btn is-primary"
            onClick={() => game.start({ restart: true })}
          >
            <RotateCcw size={17} /> Jogar novamente
          </button>
          <Link to="/pixel/lab?apresentacao=1" className="pixel-btn is-outline">
            Entender a CNN <ArrowRight size={17} />
          </Link>
        </div>
        <p className="pixel-caption">
          Este é o placar da partida. A acurácia científica é calculada
          separadamente nas 10.000 imagens do teste oficial.
        </p>
      </section>
    </main>
  );
}

function RoundReveal({ game, headingRef, showGrid }) {
  const { state } = game;
  const { round } = state;
  const result = round.revealed;
  const explanations = {
    keptCorrect:
      'A rede já reconhecia a imagem recebida e continuou acertando no palpite final.',
    fixedError:
      'A rede errava na imagem recebida. Com seus ajustes, o palpite final ficou certo.',
    brokeCorrect:
      'A rede acertava a imagem recebida. Os ajustes mudaram o palpite para uma classe errada.',
    keptError:
      'A rede errou nos dois casos. Esses ajustes não foram suficientes para corrigir a previsão.',
  };
  return (
    <section
      className="pixel-panel pixel-reveal"
      aria-labelledby="pixel-round-title"
    >
      <div className="pixel-reveal-heading">
        <div>
          <p className="pixel-eyebrow">
            Resposta revelada · Rodada {round.roundNumber}
          </p>
          <h1 id="pixel-round-title" ref={headingRef} tabIndex={-1}>
            Era {result.trueClass.pt.toLowerCase()}!
          </h1>
          <p>{explanations[result.outcomeKind]}</p>
        </div>
        <div
          className={`pixel-points-badge${result.finalCorrect ? ' is-correct' : ''}`}
        >
          <Trophy size={24} />
          <strong>+{result.pointsEarned}</strong>
          <span>pontos</span>
        </div>
      </div>
      <div className="pixel-reveal-grid">
        <div>
          <PixelCanvas
            pixels={round.corruptedPixels}
            showGrid={showGrid}
            label="Imagem recebida"
          />
          <PixelPrediction
            prediction={round.initialPrediction}
            title="Antes dos ajustes"
            trueIndex={result.trueLabelIndex}
            compact
          />
        </div>
        <div>
          <PixelCanvas
            pixels={round.testedPixels}
            showGrid={showGrid}
            label="Última imagem testada"
          />
          <PixelPrediction
            prediction={round.currentPrediction}
            title="Palpite final"
            trueIndex={result.trueLabelIndex}
            compact
          />
        </div>
        <div className="pixel-original-revealed">
          <PixelCanvas
            pixels={result.originalPixels}
            showGrid={showGrid}
            label="Fotografia original"
          />
          <div>
            <CheckCircle2 size={19} />
            <strong>{result.trueClass.pt}</strong>
            <span>Resposta do CIFAR-10</span>
          </div>
        </div>
      </div>
      <div className="pixel-reveal-actions">
        <Link
          to="/pixel/lab"
          onClick={() => game.openLabContext()}
          className="pixel-btn is-outline"
        >
          <FlaskConical size={17} /> Por que a rede respondeu assim?
        </Link>
        <button
          type="button"
          className="pixel-btn is-primary"
          onClick={() => game.nextRound()}
        >
          {round.roundNumber === state.totalRounds
            ? 'Ver placar final'
            : 'Próxima imagem'}
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

export default function PixelGamePage() {
  const game = usePixelGame();
  const { state, pause } = game;
  const [showGrid, setShowGrid] = useState(false);
  const headingRef = useRef(null);
  const focusView = ['querying', 'query-error'].includes(state.status)
    ? 'playing'
    : state.status;
  useEffect(() => () => pause(), [pause]);
  useEffect(() => {
    if (
      ['playing', 'revealed', 'finished', 'blocked', 'round-error'].includes(
        focusView,
      )
    )
      headingRef.current?.focus();
  }, [focusView, state.roundIndex]);

  if (state.status === 'idle')
    return (
      <PixelChrome mode="game">
        <GameIntro game={game} />
      </PixelChrome>
    );
  if (state.status === 'finished')
    return (
      <PixelChrome mode="game">
        <FinalScoreboard game={game} headingRef={headingRef} />
      </PixelChrome>
    );
  const { round } = state;
  if (
    !round?.initialPrediction ||
    ['blocked', 'loading', 'round-error'].includes(state.status)
  ) {
    const failed = ['blocked', 'round-error'].includes(state.status);
    return (
      <PixelChrome mode="game">
        <main id="pixel-main-content" tabIndex={-1} className="pixel-main">
          <section className="pixel-panel pixel-load-card" aria-busy={!failed}>
            {!failed && <LoaderCircle size={30} className="pixel-spinner" />}
            <h1 ref={headingRef} tabIndex={-1}>
              {failed
                ? 'Não conseguimos preparar a imagem.'
                : 'Preparando sua bancada…'}
            </h1>
            <p role={failed ? 'alert' : 'status'}>
              {state.error ||
                'Carregando a CNN e calculando o primeiro palpite. Só um instante.'}
            </p>
            {failed && (
              <button
                type="button"
                className="pixel-btn is-primary"
                onClick={() =>
                  state.status === 'round-error'
                    ? game.retryRound()
                    : game.start({ restart: true })
                }
              >
                <RotateCcw size={17} /> Tentar novamente
              </button>
            )}
            <Link to="/pixel" className="pixel-inline-link">
              <ArrowLeft size={16} /> Voltar à visão geral
            </Link>
          </section>
        </main>
      </PixelChrome>
    );
  }
  const revealed = state.status === 'revealed';
  const querying = state.status === 'querying';
  const locked = querying || round.mustConclude;
  return (
    <PixelChrome mode="game">
      <main
        id="pixel-main-content"
        tabIndex={-1}
        className="pixel-main pixel-game-main"
      >
        <header className="pixel-game-hud">
          <div>
            <p className="pixel-eyebrow">Pixel em Pânico!</p>
            <strong>
              Rodada {round.roundNumber}
              <span> de {state.totalRounds}</span>
            </strong>
          </div>
          <ol className="pixel-round-dots" aria-label="Progresso da partida">
            {Array.from({ length: 5 }, (_, index) => (
              <li
                key={index}
                className={
                  index < state.roundIndex
                    ? 'is-done'
                    : index === state.roundIndex
                      ? 'is-current'
                      : ''
                }
                aria-current={index === state.roundIndex ? 'step' : undefined}
              >
                <span className="pixel-sr-only">Rodada </span>
                {index < state.roundIndex ? (
                  <Check
                    size={15}
                    aria-label={`Rodada ${index + 1} concluída`}
                  />
                ) : (
                  index + 1
                )}
              </li>
            ))}
          </ol>
          <div className="pixel-score">
            <Trophy size={18} />
            <strong>{state.score}</strong>
            <span>pts</span>
          </div>
        </header>
        {revealed ? (
          <RoundReveal
            game={game}
            headingRef={headingRef}
            showGrid={showGrid}
          />
        ) : (
          <>
            <div className="pixel-round-heading">
              <div>
                <h1 id="pixel-round-title" ref={headingRef} tabIndex={-1}>
                  Ajuste a foto. Teste o palpite.
                </h1>
                <p>{interferenceHints[round.interference.id]}</p>
              </div>
              <details className="pixel-help">
                <summary>
                  <HelpCircle size={17} /> Como jogar
                </summary>
                <p>
                  Altere os controles e clique em{' '}
                  <strong>Testar ajustes</strong>. Você tem até 3 testes. Ao
                  revelar, vale o último palpite testado. A resposta original
                  fica oculta até lá.
                </p>
              </details>
            </div>
            <div className="pixel-game-layout">
              <section
                className="pixel-panel pixel-workbench"
                aria-label="Comparação de imagens"
              >
                <div className="pixel-panel__header">
                  <span className="pixel-eyebrow">
                    Sua bancada · 32 × 32 pixels
                  </span>
                  <label className="pixel-checkbox">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                    />{' '}
                    Mostrar grade
                  </label>
                </div>
                <div className="pixel-game-image-pair">
                  <div className="pixel-image-column">
                    <div className="pixel-image-label">
                      <span>01</span>
                      <strong>Como chegou</strong>
                    </div>
                    <PixelCanvas
                      pixels={round.corruptedPixels}
                      showGrid={showGrid}
                      label="Imagem recebida com interferência"
                    />
                    <PixelPrediction
                      prediction={round.initialPrediction}
                      title="Palpite inicial"
                      compact
                    />
                  </div>
                  <div className="pixel-image-column is-adjusted">
                    <div className="pixel-image-label">
                      <span>02</span>
                      <strong>Seu ajuste</strong>
                      <small>
                        {round.hasUncheckedChanges ? 'Prévia' : 'Testada'}
                      </small>
                    </div>
                    <PixelCanvas
                      pixels={round.previewPixels}
                      showGrid={showGrid}
                      label={
                        round.hasUncheckedChanges
                          ? 'Prévia ainda não testada'
                          : 'Imagem confirmada na rede'
                      }
                    />
                    <PixelPrediction
                      prediction={round.currentPrediction}
                      title={
                        round.hasUncheckedChanges
                          ? 'Último palpite · prévia não testada'
                          : round.queriesUsed
                            ? `Palpite após teste ${round.queriesUsed}`
                            : 'Mesmo palpite inicial'
                      }
                      compact
                    />
                  </div>
                </div>
                <div
                  className={`pixel-preview-status${round.hasUncheckedChanges ? ' is-pending' : ''}`}
                  role="status"
                >
                  {querying ? (
                    <>
                      <LoaderCircle size={16} className="pixel-spinner" /> A
                      rede está analisando seu ajuste…
                    </>
                  ) : round.hasUncheckedChanges ? (
                    <>
                      <Eye size={16} /> A prévia mudou. Teste para atualizar o
                      palpite da rede.
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />{' '}
                      {round.queriesUsed
                        ? 'Palpite atualizado com os pixels que você testou.'
                        : 'Mova um controle para experimentar um ajuste.'}
                    </>
                  )}
                </div>
                <details className="pixel-details is-subtle">
                  <summary>Ver os palpites desta rodada</summary>
                  <ol className="pixel-query-history">
                    <li>
                      <span>Inicial</span>
                      <strong>{round.initialPrediction.winnerClass.pt}</strong>
                      <small>
                        {formatPixelNumber(
                          round.initialPrediction.confidence * 100,
                          1,
                        )}
                        %
                      </small>
                    </li>
                    {round.queryHistory.map((item) => (
                      <li key={item.queryNumber}>
                        <span>Teste {item.queryNumber}</span>
                        <strong>{item.prediction.winnerClass.pt}</strong>
                        <small>
                          {formatPixelNumber(
                            item.prediction.confidence * 100,
                            1,
                          )}
                          %
                        </small>
                      </li>
                    ))}
                  </ol>
                  <PixelPrediction
                    prediction={round.currentPrediction}
                    title="Última previsão confirmada"
                  />
                </details>
              </section>
              <section
                className="pixel-panel pixel-controls-panel"
                aria-labelledby="pixel-tools-title"
              >
                <div className="pixel-panel__header">
                  <h2 id="pixel-tools-title">Experimente um ajuste</h2>
                  <button
                    type="button"
                    className="pixel-icon-btn"
                    aria-label="Redefinir ajustes para a imagem recebida"
                    disabled={locked}
                    onClick={game.resetTools}
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>
                <div className="pixel-sliders-stack">
                  {tools.map(
                    ({ id, title, icon: Icon, hint, left, right, value }) => (
                      <label className="pixel-slider-field" key={id}>
                        <div>
                          <strong>
                            <Icon size={16} />
                            {title}
                          </strong>
                          <output>{value(round.tools[id])}</output>
                        </div>
                        <small>{hint}</small>
                        <input
                          type="range"
                          aria-label={title}
                          min={PIXEL_TOOL_LIMITS[id].min}
                          max={PIXEL_TOOL_LIMITS[id].max}
                          step={PIXEL_TOOL_LIMITS[id].step}
                          value={round.tools[id]}
                          disabled={locked}
                          onChange={(e) =>
                            game.updateTools({ [id]: Number(e.target.value) })
                          }
                        />
                        <div className="pixel-slider-extremes">
                          <span>{left}</span>
                          <span>{right}</span>
                        </div>
                      </label>
                    ),
                  )}
                </div>
                <div className="pixel-test-budget">
                  <span>Testes disponíveis</span>
                  <div
                    aria-label={`${round.queriesRemaining} de 3 testes restantes`}
                  >
                    {Array.from({ length: 3 }, (_, index) => (
                      <span
                        className={index < round.queriesUsed ? 'is-used' : ''}
                        key={index}
                      >
                        {index < round.queriesUsed ? (
                          <Check size={14} />
                        ) : (
                          index + 1
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                {state.status === 'query-error' && (
                  <p className="pixel-error-banner" role="alert">
                    {state.error} Seu teste não foi consumido. Tente novamente.
                  </p>
                )}
                {round.mustConclude && (
                  <p className="pixel-limit-notice" role="status">
                    Você usou os 3 testes. Agora revele a resposta para
                    comparar.
                  </p>
                )}
                <div className="pixel-bench-actions">
                  <button
                    type="button"
                    className="pixel-btn is-primary is-full"
                    disabled={
                      locked ||
                      (!round.hasUncheckedChanges &&
                        state.status !== 'query-error')
                    }
                    onClick={game.testAdjustments}
                  >
                    {querying ? (
                      <>
                        <LoaderCircle size={17} className="pixel-spinner" />{' '}
                        Analisando…
                      </>
                    ) : (
                      <>
                        <Cpu size={17} /> Testar ajustes{' '}
                        <span className="pixel-button-count">
                          {round.queriesRemaining}/3
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="pixel-btn is-outline is-full"
                    disabled={querying}
                    onClick={game.concludeRound}
                  >
                    <Eye size={17} />
                    {round.hasUncheckedChanges
                      ? 'Revelar último palpite testado'
                      : 'Revelar resposta'}
                  </button>
                </div>
                <p className="pixel-caption">
                  {round.hasUncheckedChanges
                    ? 'A prévia ainda não testada não entra no placar.'
                    : 'Revele quando quiser. O palpite final certo vale 100 pontos.'}
                </p>
              </section>
            </div>
            <p className="pixel-game-note">
              A confiança é o valor atribuído pela rede ao palpite. Ela pode
              estar confiante e errada.
            </p>
          </>
        )}
      </main>
    </PixelChrome>
  );
}
