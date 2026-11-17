import { ArrowLeft, ArrowRight, Clock3, Layers, LoaderCircle, LockKeyhole, RotateCcw, ScanSearch, Sparkles, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Character } from "../components/GanUI.jsx";
import InferenceBench from "../components/InferenceBench.jsx";
import { ExitDialog, MissionRound, MissionSummary } from "../components/MissionScreens.jsx";
import { missions } from "../data/atelier.js";
import { useBenchInference } from "../hooks/useBenchInference.js";
import { parseSeed, useMissionSession } from "../hooks/useMissionSession.js";
import { isUnlocked, readProgress } from "../lib/mission/progress.js";

function readProgressSafely() {
  try {
    return readProgress(window.localStorage, missions);
  } catch {
    return { record: { completedMissionIds: [] }, persistence: "unavailable" };
  }
}

function EmptyArena() {
  return (
    <section className="gan-empty-arena">
      <span className="gan-empty-emblem">
        <ScanSearch size={42} strokeWidth={1.2} />
      </span>
      <p className="gan-eyebrow">A GUERRA DOS PIXELS</p>
      <h1 tabIndex={-1}>Toda missão começa no mural.</h1>
      <p>Escolha um caso para conhecer a próxima investigação.</p>
      <Link className="gan-button is-primary" to="/enganai/missoes">
        Ir ao mural <ArrowRight size={18} />
      </Link>
    </section>
  );
}

function LockedArena({ mission }) {
  const required = missions.find((item) => item.id === mission.requires);
  return (
    <section className="gan-empty-arena" data-locked-mission={mission.id}>
      <span className="gan-empty-emblem">
        <LockKeyhole size={40} strokeWidth={1.2} />
      </span>
      <p className="gan-eyebrow">{mission.title.toUpperCase()}</p>
      <h1 tabIndex={-1}>Este caso ainda está fechado.</h1>
      <p>Conclua “{required?.title}” para liberar esta investigação.</p>
      <Link className="gan-button is-primary" to="/enganai/missoes">
        Voltar ao mural <ArrowRight size={18} />
      </Link>
    </section>
  );
}

function Briefing({ mission, bench, run }) {
  const { session } = run;
  const preparing = session.phase === "preparing";
  const failed = session.phase === "error";
  const errorRef = useRef(null);
  useEffect(() => {
    if (failed) errorRef.current?.focus();
  }, [failed]);
  const benchReady = bench.phase === "ready";

  return (
    <section className="gan-arena-stage" aria-labelledby="gan-arena-title" data-mission={mission.id} data-session-phase={session.phase}>
      <div className="gan-scene-heading">
        <p className="gan-eyebrow">{mission.title.toUpperCase()}</p>
        <h1 id="gan-arena-title" tabIndex={-1}>
          {mission.subtitle}
        </h1>
        <p>Cinco evidências. Para cada uma, diga de onde ela veio.</p>
      </div>
      <div className="gan-arena-preparation">
        <InferenceBench mission={mission} bench={bench} />
        <div className="gan-arena-note">
          <span className="gan-ink-eyebrow">INSTRUÇÕES DO CASO</span>
          <h2>Real ou criação da Fifi?</h2>
          <ul className="gan-briefing-rules">
            <li>
              <Layers size={18} aria-hidden="true" />5 imagens: fotos reais do acervo e criações da Fifi, misturadas.
            </li>
            <li>
              <Trophy size={18} aria-hidden="true" />
              100 pontos por origem certa. Uma resposta por rodada.
            </li>
            <li>
              <Clock3 size={18} aria-hidden="true" />
              Sem cronômetro. A Lupa só mostra o palpite dela depois da sua resposta.
            </li>
          </ul>
          {failed ? (
            <div className="gan-briefing-error" role="alert">
              <h3 ref={errorRef} tabIndex={-1}>
                As evidências não ficaram prontas.
              </h3>
              <p>{session.error.message} Nenhuma imagem foi inventada para ocupar o lugar.</p>
              <button type="button" className="gan-button is-primary" onClick={run.start} disabled={!benchReady}>
                <RotateCcw size={18} />
                Tentar novamente
              </button>
            </div>
          ) : (
            <button type="button" className="gan-button is-primary" onClick={run.start} disabled={!benchReady || preparing} aria-describedby="gan-start-status">
              {preparing ? <LoaderCircle size={18} className="gan-spin" /> : <ScanSearch size={18} />}
              {preparing ? "Preparando evidências…" : "Começar investigação"}
              {!preparing && <ArrowRight size={18} />}
            </button>
          )}
          <p id="gan-start-status" className="gan-briefing-status" aria-live="polite">
            {bench.phase === "loading" && "Aguardando a bancada conferir os instrumentos."}
            {bench.phase === "error" && "A bancada precisa abrir antes da missão. Use “Tentar novamente” na bancada."}
            {bench.phase === "unavailable" && "Este navegador não consegue executar a missão; o aquecimento continua disponível."}
          </p>
          <Link className="gan-paper-link" to="/enganai/aquecimento">
            <Sparkles size={17} />
            Fazer o aquecimento antes
          </Link>
          <Link className="gan-paper-link is-subtle" to="/enganai/missoes">
            <ArrowLeft size={16} />
            Voltar ao mural
          </Link>
        </div>
        <div className="gan-arena-detective">
          <Character name="lupa" />
        </div>
      </div>
    </section>
  );
}

function MissionRun({ mission, seed }) {
  const bench = useBenchInference(mission.checkpointEpoch);
  const run = useMissionSession(mission, bench, seed);
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const { phase } = run.session;
  const nextMission = missions.find((item) => item.requires === mission.id);

  if (phase === "summary") return <MissionSummary key={run.session.id} mission={mission} run={run} nextMission={nextMission} />;
  if (phase === "investigating" || phase === "revealed")
    return (
      <>
        <MissionRound mission={mission} run={run} onExit={() => setExiting(true)} />
        <ExitDialog open={exiting} onStay={() => setExiting(false)} onLeave={() => navigate("/enganai/missoes")} />
      </>
    );
  return <Briefing mission={mission} bench={bench} run={run} />;
}

export default function GanArenaPage() {
  const [params] = useSearchParams();
  const mission = missions.find((item) => item.id === params.get("missao"));
  // Read on every visit: "Próximo caso" changes only the query string, not the route.
  const progress = readProgressSafely();
  if (!mission) return <EmptyArena />;
  if (!isUnlocked(progress.record, mission)) return <LockedArena mission={mission} />;
  // `semente` reproduces a selection for debugging; normal play draws a new seed.
  return <MissionRun key={mission.id} mission={mission} seed={parseSeed(params.get("semente"))} />;
}
