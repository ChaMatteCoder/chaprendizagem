import { AlertTriangle, Check, Cpu, LoaderCircle, RotateCcw, ScanSearch } from "lucide-react";
import { useEffect, useRef } from "react";
import { BENCH_STEPS } from "../hooks/useBenchInference.js";

const STEP_LABELS = {
  runtime: "Ligar o motor de inferência",
  manifest: "Conferir manifesto e vetores fixos",
  weights: "Verificar a assinatura dos pesos",
  parity: "Reproduzir as saídas de referência",
};

const SUPERSCRIPT = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

function formatScientific(value) {
  if (value === 0) return "0";
  let exponent = Math.floor(Math.log10(Math.abs(value)));
  let rounded = Math.round((value / 10 ** exponent) * 10) / 10;
  if (Math.abs(rounded) >= 10) {
    exponent += 1;
    rounded /= 10;
  }
  const mantissa = rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const power = `10${String(exponent).replace(/./g, (c) => SUPERSCRIPT[c])}`;
  return mantissa === "1" ? power : `${mantissa} × ${power}`;
}

const formatMs = (value) => `${Math.max(1, Math.round(value)).toLocaleString("pt-BR")} ms`;
const formatScore = (value) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PixelCanvas({ pixels, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const context = ref.current?.getContext("2d");
    if (!context) return;
    const image = context.createImageData(28, 28);
    pixels.forEach((value, index) => {
      image.data.set([value, value, value, 255], index * 4);
    });
    context.putImageData(image, 0, 0);
  }, [pixels]);
  return <canvas ref={ref} className="gan-bench-canvas" width="28" height="28" role="img" aria-label={label} />;
}

function Steps({ current }) {
  const position = BENCH_STEPS.indexOf(current);
  return (
    <ol className="gan-bench-steps">
      {BENCH_STEPS.map((step, index) => {
        const status = index < position ? "done" : index === position ? "current" : "pending";
        return (
          <li key={step} data-status={status}>
            <span className="gan-bench-step-icon" aria-hidden="true">
              {status === "done" ? <Check size={15} /> : status === "current" ? <LoaderCircle size={15} /> : <span />}
            </span>
            {STEP_LABELS[step]}
            <span className="gan-sr-only">{status === "done" ? " — concluído" : status === "current" ? " — em andamento" : " — aguardando"}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Ready({ prepared, sampled, totalMs }) {
  const { verification } = prepared;
  const { parity, tolerance } = verification;
  const generatorError = Math.max(parity.generatorBatch.maxAbsError, parity.generatorSingle.maxAbsError);
  const logitError = Math.max(parity.discriminatorSynthetic.maxAbsError, parity.discriminatorReal.maxAbsError);
  const logitCount = parity.discriminatorSynthetic.count + parity.discriminatorReal.count;
  return (
    <>
      <div className="gan-bench-samples">
        {sampled.samples.map((sample) => {
          const reading = sample.discriminator;
          const origin = reading.status === "ready" ? (reading.predictedOrigin === "real" ? "real" : "sintética") : null;
          return (
            <figure key={sample.latentIndex} data-latent-index={sample.latentIndex}>
              <PixelCanvas
                pixels={sample.pixels}
                label={`Criação da Fifi gerada agora no seu navegador a partir do vetor fixo ${sample.latentIndex + 1}, época ${prepared.epoch}`}
              />
              <figcaption>
                <span>z fixo nº {sample.latentIndex + 1}</span>
                {origin ? (
                  <span>
                    Lupa: <strong>{origin}</strong> <span className="gan-bench-score">({formatScore(reading.score)})</span>
                  </span>
                ) : (
                  <span>Lupa sem leitura</span>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <dl className="gan-bench-facts">
        <div>
          <dt>Fifi · Gerador</dt>
          <dd>
            {parity.generatorBatch.count} vetores reproduzidos; erro máximo {formatScientific(generatorError)} (limite {formatScientific(tolerance.generatorAbs)})
          </dd>
        </div>
        <div>
          <dt>Lupa · Discriminador</dt>
          <dd>
            {logitCount} leituras conferidas; erro máximo {formatScientific(logitError)}, {parity.discriminatorSynthetic.predictionChanges + parity.discriminatorReal.predictionChanges} decisões alteradas
          </dd>
        </div>
        <div>
          <dt>Execução</dt>
          <dd>
            {prepared.runId} · época {prepared.epoch} · ONNX Runtime Web {prepared.runtime.version ?? prepared.runtime.declared} (WASM) · pronta em {formatMs(totalMs)}
          </dd>
        </div>
      </dl>
      <p className="gan-bench-caveat">
        A pontuação da Lupa é a sigmoide não calibrada deste Discriminador: acima de 0,50 ela diria “real”. Isso não é um detector geral de imagens de IA.
      </p>
    </>
  );
}

// `bench` comes from useBenchInference in the arena, shared with the mission session.
export default function InferenceBench({ mission, bench }) {
  const errorHeading = useRef(null);
  const { phase } = bench;

  useEffect(() => {
    if (phase === "error" || phase === "unavailable") errorHeading.current?.focus();
  }, [phase, bench.attempt]);

  return (
    <section
      className="gan-bench"
      aria-labelledby="gan-bench-title"
      aria-busy={phase === "loading"}
      data-inference-phase={phase}
      data-error-code={bench.error?.code}
      data-checkpoint-id={bench.prepared?.checkpointId}
      data-ready-ms={bench.totalMs === undefined ? undefined : Math.round(bench.totalMs)}
      data-cached={bench.prepared ? String(bench.prepared.cached) : undefined}
    >
      <span className="gan-evidence-corner" aria-hidden="true" />
      <div className="gan-bench-header">
        <span className="gan-bench-badge" aria-hidden="true">
          {phase === "error" || phase === "unavailable" ? <AlertTriangle size={20} /> : phase === "ready" ? <ScanSearch size={20} /> : <Cpu size={20} />}
        </span>
        <div>
          <p className="gan-bench-eyebrow">BANCADA DE CALIBRAÇÃO · ÉPOCA {mission.checkpointEpoch}</p>
          <h2 id="gan-bench-title" ref={errorHeading} tabIndex={-1}>
            {phase === "ready" && "Instrumentos conferidos."}
            {phase === "loading" && "Preparando os instrumentos…"}
            {phase === "error" && "A bancada não abriu."}
            {phase === "unavailable" && "Bancada indisponível neste navegador."}
          </h2>
        </div>
      </div>

      <div className="gan-bench-body" aria-live="polite">
        {phase === "loading" && (
          <>
            <Steps current={bench.step} />
            <p className="gan-bench-hint">Os pesos só são baixados aqui, na bancada. Nenhuma imagem aparece antes da verificação.</p>
          </>
        )}
        {phase === "ready" && <Ready prepared={bench.prepared} sampled={bench.sampled} totalMs={bench.totalMs} />}
        {(phase === "error" || phase === "unavailable") && (
          <div className="gan-bench-failure" role="alert">
            <p>{bench.error.message}</p>
            <p className="gan-bench-hint">
              {phase === "error"
                ? "Nenhuma imagem ou palpite foi inventado para ocupar o lugar. O caso escolhido continua selecionado."
                : "As redes precisam de Web Workers e WebAssembly. O restante do ateliê continua disponível."}
            </p>
            {phase === "error" && (
              <button type="button" className="gan-button is-primary is-small" onClick={bench.retry}>
                <RotateCcw size={16} />
                Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
