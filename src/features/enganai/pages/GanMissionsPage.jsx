import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Layers,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Character } from "../components/GanUI.jsx";
import { missions } from "../data/atelier.js";
import { readProgress } from "../lib/mission/progress.js";
import { useAtelier } from "../hooks/AtelierContext.js";

const PREVIEWS = "/models/enganai/research/cpu-no-batchnorm-v1/checkpoints";

// Registered G(z) previews from stage 03 (fixed z, same index for every case).
function RegisteredPreview({ mission, sample = 0 }) {
  const epoch = String(mission.checkpointEpoch).padStart(3, "0");
  return (
    <img
      className="gan-registered-preview"
      src={`${PREVIEWS}/epoch-${epoch}/sample-${String(sample).padStart(2, "0")}.png`}
      alt={`Criação registrada da Fifi na época ${mission.checkpointEpoch}, vetor fixo ${sample + 1}`}
      width="28"
      height="28"
      loading="lazy"
    />
  );
}

export default function GanMissionsPage() {
  const [selectedId, setSelectedId] = useState(missions[0].id);
  const detailsRef = useRef(null);
  const { reducedMotion } = useAtelier();
  const [progress] = useState(() => {
    try {
      const { record, persistence } = readProgress(window.localStorage, missions);
      return { completed: record.completedMissionIds, records: record.missions, badges: record.badges, persistence };
    } catch {
      return { completed: [], records: [], badges: [], persistence: "unavailable" };
    }
  });
  const best = (id) => progress.records.find((item) => item.missionId === id);
  const selected = missions.find((mission) => mission.id === selectedId);
  const locked =
    selected.requires && !progress.completed.includes(selected.requires);

  function selectCase(id) {
    setSelectedId(id);
    requestAnimationFrame(() => {
      detailsRef.current?.focus({ preventScroll: true });
      detailsRef.current?.scrollIntoView({
        block: "nearest",
        behavior: reducedMotion ? "instant" : "smooth",
      });
    });
  }

  return (
    <section
      className="gan-missions-stage"
      aria-labelledby="gan-missions-title"
    >
      <div className="gan-scene-heading">
        <p className="gan-eyebrow">O MURAL DA LUPA</p>
        <h1 id="gan-missions-title" tabIndex={-1}>
          Escolha sua missão.
        </h1>
        <p>Uma origem para investigar. Um novo jeito de olhar.</p>
      </div>
      <div className="gan-mission-board">
        <div className="gan-board-string" aria-hidden="true" />
        <div className="gan-mission-folders" aria-label="Casos de investigação">
          {missions.map((mission, index) => {
            const complete = progress.completed.includes(mission.id);
            const isLocked =
              mission.requires &&
              !progress.completed.includes(mission.requires);
            return (
              <button
                className={`gan-mission-folder ${selectedId === mission.id ? "is-selected" : ""}`}
                key={mission.id}
                aria-pressed={selectedId === mission.id}
                aria-controls="gan-case-details"
                onClick={() => selectCase(mission.id)}
              >
                <span className="gan-folder-tab">CASO 0{index + 1}</span>
                <span className="gan-folder-pin" aria-hidden="true" />
                <span className="gan-folder-photo">
                  <RegisteredPreview mission={mission} />
                  <span>Prévia registrada · época {mission.checkpointEpoch}</span>
                </span>
                <strong>{mission.title}</strong>
                <span
                  className={`gan-folder-status ${isLocked ? "is-locked" : ""}`}
                >
                  {complete ? (
                    <>
                      <Check size={15} />
                      Concluída · {best(mission.id).bestScore} pts
                    </>
                  ) : isLocked ? (
                    <>
                      <LockKeyhole size={14} />
                      Após o caso {index}
                    </>
                  ) : (
                    <>
                      <span />
                      Disponível
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="gan-mission-bottom">
        <article
          id="gan-case-details"
          className="gan-case-notebook"
          aria-labelledby="gan-case-title"
          tabIndex={-1}
          ref={detailsRef}
        >
          <div className="gan-notebook-photo">
            <RegisteredPreview mission={selected} sample={1} />
            <span>Criação registrada da Fifi · época {selected.checkpointEpoch}</span>
          </div>
          <div className="gan-case-description">
            <span className="gan-ink-eyebrow">SUA PRÓXIMA INVESTIGAÇÃO</span>
            <h2 id="gan-case-title">{selected.title}</h2>
            <p>{selected.description}</p>
            <div className="gan-case-facts">
              <span>
                <Clock3 size={19} />
                Sem pressa
              </span>
              <span>
                <Layers size={19} />5 rodadas
              </span>
            </div>
            {locked ? (
              <p className="gan-case-lock">
                <LockKeyhole size={16} />
                Este caso será liberado após concluir a missão anterior.
              </p>
            ) : (
              <>
                <p className="gan-case-preparing" data-best-score={best(selected.id)?.bestScore ?? ""}>
                  {best(selected.id)
                    ? `Melhor resultado: ${best(selected.id).bestCorrect} de 5 (${best(selected.id).bestScore} pontos) · ${best(selected.id).completions} ${best(selected.id).completions === 1 ? "conclusão" : "conclusões"}.`
                    : "Fotos reais do acervo e criações da Fifi, desta época do treinamento."}
                </p>
                <Link
                  className="gan-button is-primary"
                  to={`/enganai/arena?missao=${selected.id}`}
                >
                  {best(selected.id) ? "Jogar de novo" : "Começar missão"}
                  <ArrowRight size={18} />
                </Link>
              </>
            )}
            <Link className="gan-paper-link" to="/enganai/aquecimento">
              <Sparkles size={16} />
              Faça o aquecimento
            </Link>
          </div>
        </article>
        <div className="gan-board-detective">
          <Character name="lupa" />
          <p>
            “Toda descoberta
            <br />
            começa com curiosidade.”
          </p>
        </div>
      </div>
      <p className="gan-board-progress">
        {progress.persistence === "ready"
          ? `${progress.completed.length} de 3 missões concluídas neste navegador.${progress.badges.includes("all-missions") ? " Todas as missões resolvidas!" : ""}`
          : "O progresso salvo não está disponível nesta visita. Seus dados foram preservados."}{" "}
        <span>O aquecimento tem um placar separado.</span>
      </p>
    </section>
  );
}
