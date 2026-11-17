import { ArrowRight, Camera, Check, Maximize2, Minimize2, Paintbrush, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Character } from "./GanUI.jsx";
import { lupaTally, ROUND_COUNT } from "../lib/mission/session.js";

const ORIGIN_LABEL = { real: "Real", synthetic: "Sintética" };
const ORIGIN_DETAIL = { real: "foto do acervo Fashion-MNIST", synthetic: "criação da Fifi" };
const score = (value) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const short = (hash) => `${hash.slice(0, 12)}…`;

function Evidence({ src, label, roundIndex }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className={`gan-evidence-frame ${zoomed ? "is-zoomed" : ""}`}>
      <span className="gan-evidence-corner" aria-hidden="true" />
      <span className="gan-evidence-tag">EVIDÊNCIA {roundIndex + 1}</span>
      <img src={src} alt={label} width="28" height="28" draggable="false" />
      <button type="button" className="gan-text-button gan-zoom-button" aria-pressed={zoomed} onClick={() => setZoomed((value) => !value)}>
        {zoomed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        {zoomed ? "Reduzir" : "Ampliar"}
      </button>
    </div>
  );
}

function LupaReading({ reading, correctOrigin }) {
  if (reading.status !== "ready") return <p className="gan-reveal-lupa">A Lupa não conseguiu analisar esta imagem. Sua resposta e seus pontos não mudam.</p>;
  const right = reading.predictedOrigin === correctOrigin;
  return (
    <p className="gan-reveal-lupa">
      A Lupa disse <strong>{ORIGIN_LABEL[reading.predictedOrigin].toLowerCase()}</strong> (pontuação {score(reading.score)}) e {right ? "também acertou" : "errou desta vez"}.{" "}
      <span>A pontuação dela é uma sigmoide não calibrada; acima de 0,50 ela diz “real”.</span>
    </p>
  );
}

function Provenance({ provenance, image }) {
  return (
    <details className="gan-provenance">
      <summary>Ver procedência registrada</summary>
      {provenance.origin === "real" ? (
        <dl>
          <dt>Dataset</dt>
          <dd>Fashion-MNIST, partição arena (fora do treino)</dd>
          <dt>Registro</dt>
          <dd>{provenance.recordId}</dd>
        </dl>
      ) : (
        <dl>
          <dt>Execução</dt>
          <dd>{provenance.runId}</dd>
          <dt>Checkpoint</dt>
          <dd>{provenance.checkpointId}</dd>
          <dt>Pesos de G (SHA-256)</dt>
          <dd>{short(provenance.generatorSha256)}</dd>
          <dt>Vetor z</dt>
          <dd>
            {provenance.latent.dimension} valores ({provenance.latent.rngId}, semente {provenance.latent.seed}):{" "}
            {provenance.latent.values.slice(0, 4).map((value) => value.toFixed(3)).join("; ")}…
          </dd>
        </dl>
      )}
      <p>Imagem exibida: PNG 28 × 28, SHA-256 {short(image.asset.sha256)}.</p>
    </details>
  );
}

export function RevealPanel({ reveal, sample, headingRef, children }) {
  const { correct, playerChoice, correctOrigin } = reveal;
  return (
    <div className="gan-reveal" data-correct={correct}>
      <h2 ref={headingRef} tabIndex={-1}>
        {correct ? <Check size={26} aria-hidden="true" /> : <X size={26} aria-hidden="true" />}
        {correct ? "Você acertou!" : "Não foi desta vez."}
      </h2>
      <dl className="gan-reveal-facts">
        <div>
          <dt>Sua escolha</dt>
          <dd>{ORIGIN_LABEL[playerChoice]}</dd>
        </div>
        <div>
          <dt>Origem registrada</dt>
          <dd>
            {ORIGIN_LABEL[correctOrigin]} · {ORIGIN_DETAIL[correctOrigin]}
          </dd>
        </div>
        <div>
          <dt>Pontos</dt>
          <dd>+{reveal.points}</dd>
        </div>
      </dl>
      <p className="gan-reveal-explanation">
        {correctOrigin === "real"
          ? "Esta fotografia vem do acervo Fashion-MNIST, de uma parte reservada para a arena que nunca entrou no treino."
          : "A Fifi desenhou esta imagem agora, no seu navegador, a partir de um vetor z registrado e dos pesos deste caso."}
      </p>
      <LupaReading reading={reveal.discriminator} correctOrigin={correctOrigin} />
      <Provenance provenance={reveal.provenance} image={sample.image} />
      {children}
    </div>
  );
}

export function MissionRound({ mission, run, onExit }) {
  const { session, question, images, state } = run;
  const index = session.currentRoundIndex;
  const revealed = session.phase === "revealed";
  const reveal = revealed ? session.answers[index] : null;
  const sample = state.rounds[index].sample;
  const roundHeading = useRef(null);
  const revealHeading = useRef(null);

  // Focus follows the task: the round title when it starts, the result after answering.
  useEffect(() => {
    (revealed ? revealHeading : roundHeading).current?.focus({ preventScroll: false });
  }, [revealed, index]);

  const fifiPose = !reveal ? "neutral" : reveal.correctOrigin === "synthetic" ? (reveal.correct ? "mistake" : "celebrating") : "thinking";
  const lupaPose = !reveal ? "thinking" : reveal.correct ? "celebrating" : "mistake";
  const isLast = index === ROUND_COUNT - 1;

  return (
    <section className="gan-round-stage" aria-labelledby="gan-round-title" data-phase={session.phase} data-round={index + 1}>
      <header className="gan-round-header">
        <div>
          <p className="gan-eyebrow">{mission.title.toUpperCase()}</p>
          <h1 id="gan-round-title" ref={roundHeading} tabIndex={-1}>
            Rodada {index + 1} de {ROUND_COUNT}
          </h1>
        </div>
        <ol className="gan-round-track" aria-label="Progresso da missão">
          {Array.from({ length: ROUND_COUNT }, (_, round) => {
            const answer = session.answers[round];
            const status = answer ? (answer.correct ? "correct" : "wrong") : round === index ? "current" : "pending";
            return (
              <li key={round} data-status={status}>
                <span className="gan-sr-only">
                  Rodada {round + 1}: {status === "correct" ? "acerto" : status === "wrong" ? "erro" : status === "current" ? "atual" : "a seguir"}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="gan-round-score" aria-live="polite">
          <strong>{session.score}</strong> pontos
        </p>
        <button type="button" className="gan-text-button" onClick={onExit}>
          Sair da missão
        </button>
      </header>

      <div className="gan-round-layout">
        <div className="gan-round-fifi" aria-hidden="true">
          <Character name="fifi" pose={fifiPose} />
        </div>
        <Evidence src={images[sample.id]} roundIndex={index} label={`Evidência ${index + 1}: imagem em tons de cinza de 28 por 28 pixels, de origem ainda não revelada`} />
        <div className="gan-round-panel">
          {question && (
            <div className="gan-question">
              <span className="gan-ink-eyebrow">DE ONDE VEIO ESTA IMAGEM?</span>
              <p>Foto real do acervo ou criação da Fifi? Sem cronômetro.</p>
              <div className="gan-origin-choices">
                <button type="button" className="gan-origin-choice" onClick={() => run.answer("real")}>
                  <Camera size={22} aria-hidden="true" />
                  <span>
                    <strong>Real</strong>
                    <small>Foto do acervo</small>
                  </span>
                </button>
                <button type="button" className="gan-origin-choice" onClick={() => run.answer("synthetic")}>
                  <Paintbrush size={22} aria-hidden="true" />
                  <span>
                    <strong>Sintética</strong>
                    <small>Criação da Fifi</small>
                  </span>
                </button>
              </div>
            </div>
          )}
          {reveal && (
            <RevealPanel reveal={reveal} sample={sample} headingRef={revealHeading}>
              <button type="button" className="gan-button is-primary" onClick={run.next}>
                {isLast ? "Ver relatório" : "Próxima rodada"}
                <ArrowRight size={18} />
              </button>
            </RevealPanel>
          )}
        </div>
        <div className="gan-round-lupa" aria-hidden="true">
          <Character name="lupa" pose={lupaPose} />
        </div>
      </div>
    </section>
  );
}

const SAVE_MESSAGES = {
  saved: "Progresso salvo neste navegador.",
  duplicate: "Esta missão já estava registrada; nada foi contado duas vezes.",
  locked: "O caso anterior não está concluído neste navegador, então o resultado não foi registrado.",
  incompatible: "Há um progresso salvo em outro formato. Ele foi preservado e esta missão não foi gravada.",
  unavailable: "O armazenamento local não está disponível; o resultado vale só para esta visita.",
  invalid: "A sessão não passou na conferência e não foi registrada.",
};

export function MissionSummary({ mission, run, nextMission }) {
  const { session, state, images, saved } = run;
  const heading = useRef(null);
  const [selected, setSelected] = useState(null);
  const correct = session.answers.filter((answer) => answer.correct).length;
  const lupa = lupaTally(session.answers);
  const unlocked = saved?.newlyUnlocked?.length ? nextMission : null;

  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="gan-summary-stage" aria-labelledby="gan-summary-title" data-session-id={session.id} data-score={session.score} data-save-status={saved?.status}>
      <div className="gan-summary-report">
        <span className="gan-evidence-corner" aria-hidden="true" />
        <p className="gan-ink-eyebrow">RELATÓRIO · {mission.title.toUpperCase()}</p>
        <h1 id="gan-summary-title" ref={heading} tabIndex={-1}>
          {session.score} de {ROUND_COUNT * 100} pontos
        </h1>
        <p className="gan-summary-lead">
          Você identificou a origem de {correct} de {ROUND_COUNT} imagens.
          {lupa.analysed > 0 && ` A Lupa acertou ${lupa.correct} de ${lupa.analysed}; o palpite dela não entra na sua pontuação.`}
        </p>
        <p className="gan-summary-save" role="status">
          {saved ? SAVE_MESSAGES[saved.status] : ""}
          {unlocked && <strong> Caso liberado: {unlocked.title}.</strong>}
        </p>

        <h2 className="gan-summary-subtitle">Revise as evidências</h2>
        <ul className="gan-summary-rounds">
          {session.answers.map((answer, index) => (
            <li key={answer.sampleId}>
              <button type="button" aria-pressed={selected === index} onClick={() => setSelected(selected === index ? null : index)} data-correct={answer.correct}>
                <img src={images[answer.sampleId]} alt="" width="28" height="28" />
                <span>
                  <strong>Rodada {index + 1}</strong>
                  <small>
                    {answer.correct ? "Acerto" : "Erro"} · era {ORIGIN_LABEL[answer.correctOrigin].toLowerCase()}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {selected !== null && (
          <div className="gan-summary-review">
            <img src={images[session.answers[selected].sampleId]} alt={`Evidência ${selected + 1}, revisada`} width="28" height="28" />
            <RevealPanel reveal={session.answers[selected]} sample={state.rounds[selected].sample} />
          </div>
        )}

        <div className="gan-summary-actions">
          <button type="button" className="gan-button is-primary" onClick={run.restart}>
            <RotateCcw size={18} />
            Jogar de novo
          </button>
          {unlocked ? (
            <Link className="gan-button is-secondary" to={`/enganai/arena?missao=${unlocked.id}`}>
              Próximo caso
              <ArrowRight size={18} />
            </Link>
          ) : null}
          <Link className="gan-paper-link" to="/enganai/missoes">
            Voltar ao mural
          </Link>
        </div>
      </div>
      <div className="gan-summary-characters" aria-hidden="true">
        <Character name="fifi" pose={correct >= 3 ? "mistake" : "celebrating"} />
        <Character name="lupa" pose={correct >= 3 ? "celebrating" : "thinking"} />
      </div>
    </section>
  );
}

export function ExitDialog({ open, onStay, onLeave }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);
  return (
    <dialog ref={ref} className="gan-dialog gan-exit-dialog" aria-labelledby="gan-exit-title" onCancel={onStay} onClose={onStay}>
      <h2 id="gan-exit-title">Sair da missão?</h2>
      <p>As respostas desta missão ainda não estão salvas. Se sair agora, a investigação recomeça do zero na próxima vez.</p>
      <div className="gan-exit-actions">
        <button type="button" className="gan-button is-primary" onClick={onStay} autoFocus>
          Continuar investigando
        </button>
        <button type="button" className="gan-button is-secondary" onClick={onLeave}>
          Sair para o mural
        </button>
      </div>
    </dialog>
  );
}
