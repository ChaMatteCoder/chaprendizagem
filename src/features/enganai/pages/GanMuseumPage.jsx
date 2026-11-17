import { useEffect, useState } from "react";
import { ArrowRight, History, Pause, Play } from "lucide-react";
import { evolutionStages } from "../data/content.js";
import { useAtelier } from "../hooks/AtelierContext.js";
import {
  AwaitingModel,
  DemoNote,
  PageIntro,
  PixelPreview,
} from "../components/GanUI.jsx";

export default function GanMuseumPage() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const { reducedMotion } = useAtelier();
  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    const timer = window.setInterval(
      () => setStage((previous) => (previous + 1) % evolutionStages.length),
      1800,
    );
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion]);
  const selected = evolutionStages[stage];
  return (
    <>
      <PageIntro
        eyebrow="MUSEU DA EVOLUÇÃO"
        title="Do ruído às primeiras formas."
      >
        Uma viagem conceitual pelo aprendizado. Observe o que muda e o que
        precisa ser avaliado.
      </PageIntro>
      <DemoNote>
        Sequência ilustrativa feita com desenhos procedurais. As etapas abaixo
        não são épocas nem checkpoints de uma GAN.
      </DemoNote>
      <section className="gan-panel gan-museum">
        <div className="gan-panel-top">
          <span className="gan-tag">
            <History size={15} />
            ESTUDO VISUAL
          </span>
          <button
            className="gan-button is-secondary is-small"
            onClick={() => setPlaying(!playing)}
            aria-pressed={playing}
            disabled={reducedMotion}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
            {playing ? "Pausar sequência" : "Reproduzir sequência"}
          </button>
        </div>
        {reducedMotion && (
          <p className="gan-caption">
            Animação desativada pela sua preferência de movimento reduzido.
            Selecione as etapas abaixo.
          </p>
        )}
        <div className="gan-evolution-comparison">
          <div>
            <span className="gan-card-eyebrow">PONTO DE PARTIDA</span>
            <PixelPreview seed={42} structure={0} />
            <small>Ruído procedural · semente 42</small>
          </div>
          <ArrowRight
            size={25}
            className="gan-evolution-arrow"
            aria-hidden="true"
          />
          <div>
            <span className="gan-card-eyebrow">ETAPA SELECIONADA</span>
            <PixelPreview seed={42} structure={selected.amount} />
            <small>{selected.short} · mesma semente 42</small>
          </div>
          <div className="gan-evolution-copy" aria-live="polite">
            <span className="gan-eyebrow">ETAPA CONCEITUAL 0{stage + 1}</span>
            <h2>{selected.title}</h2>
            <p>{selected.detail}</p>
          </div>
        </div>
        <div className="gan-timeline">
          {evolutionStages.map((item, index) => (
            <button
              key={item.short}
              aria-pressed={stage === index}
              className={stage === index ? "is-active" : ""}
              onClick={() => {
                setPlaying(false);
                setStage(index);
              }}
            >
              <span className="gan-timeline-dot">{index + 1}</span>
              <strong>{item.short}</strong>
            </button>
          ))}
        </div>
      </section>
      <section className="gan-section">
        <div className="gan-section-heading">
          <div>
            <p className="gan-eyebrow">COMPARE COM CUIDADO</p>
            <h2>A mesma entrada ajuda a contar a história.</h2>
          </div>
        </div>
        <div className="gan-specimen-grid">
          {[17, 42, 68, 123, 256, 512].map((seed, index) => (
            <div className="gan-specimen" key={seed}>
              <PixelPreview
                seed={seed}
                structure={selected.amount}
                kind={index % 3}
              />
              <span>Semente {seed}</span>
            </div>
          ))}
        </div>
        <p className="gan-caption">
          Ilustrações procedurais. Em um experimento real, comparar G(z) com o
          mesmo z e diferentes checkpoints ajuda a observar a evolução.
        </p>
      </section>
      <AwaitingModel title="Os primeiros checkpoints ainda vão chegar.">
        Aqui ficarão as épocas registradas, as configurações e as amostras
        produzidas pelo modelo real.
      </AwaitingModel>
    </>
  );
}
