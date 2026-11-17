import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleHelp,
  Compass,
  Dna,
  FlaskConical,
  History,
  Map,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { destinations } from "../data/atelier.js";
import { glossary } from "../data/content.js";
import { AtelierContext } from "../hooks/AtelierContext.js";
import useAtelierSettings from "../hooks/useAtelierSettings.js";

const icons = {
  map: Map,
  quiz: Sparkles,
  lab: FlaskConical,
  museum: History,
  mutations: Dna,
  chaos: Zap,
};
const pageNames = {
  missoes: "Mural de missões",
  arena: "A Guerra dos Pixels",
  aquecimento: "Aquecimento",
  lab: "GANLab",
  museu: "Museu da Evolução",
  mutacoes: "Ateliê de Mutações",
  caos: "Câmara do Caos",
};

function keepDialogFocus(event) {
  if (event.key !== "Tab") return;
  const items = Array.from(
    event.currentTarget.querySelectorAll("a[href], button, input, [tabindex]"),
  ).filter((item) => !item.disabled && item.tabIndex >= 0 && item.getClientRects().length);
  const first = items[0];
  const last = items.at(-1);
  if (!first) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export default function GanShell() {
  const { pathname } = useLocation();
  const settings = useAtelierSettings();
  const [dialog, setDialog] = useState(null);
  const [guideTab, setGuideTab] = useState("guia");
  const dialogRef = useRef(null);
  const dialogOpen = dialog !== null;
  const route = pathname.replace(/\/$/, "").split("/")[2] ?? "";
  const home = route === "";
  const scene = home ? "atelier" : route === "missoes" ? "mural" : "bancada";
  const pageName = pageNames[route] ?? "Ateliê";

  useEffect(() => {
    const oldTitle = document.title;
    document.title = `${pageName} · enGAN.AI · ChAprendizagem`;
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector(".gan-main h1")?.focus({ preventScroll: true });
    return () => {
      document.title = oldTitle;
    };
  }, [pathname, pageName]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!dialogOpen) {
      if (node.open) node.close();
      return undefined;
    }
    node.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (node.open) node.close();
    };
  }, [dialogOpen]);

  const closeDialog = () => setDialog(null);
  const soundLabel = settings.soundOn
    ? "Desligar som ambiente"
    : settings.preferences.soundEnabled
      ? "Retomar som ambiente"
      : "Ativar som ambiente";

  return (
    <AtelierContext.Provider value={settings}>
      <div
        className={`gan-app gan-scene-${scene} ${home ? "gan-is-home" : ""} ${route === "missoes" ? "gan-is-board" : ""}`}
        data-reduced-motion={settings.reducedMotion ? "true" : "false"}
      >
        <a className="gan-skip" href="#gan-content">
          Pular para o conteúdo
        </a>
        <div className="gan-scene-backdrop" aria-hidden="true" />
        <header className="gan-hud">
          <Link
            className="gan-hud-back"
            to={home ? "/" : "/enganai"}
            aria-label={home ? "Voltar ao ChAprendizagem" : "Voltar ao ateliê"}
          >
            <ArrowLeft size={22} />
            <span>{home ? "ChAprendizagem" : "Voltar ao ateliê"}</span>
          </Link>
          {!home && (
            <Link
              className="gan-wordmark gan-wordmark-small"
              to="/enganai"
              aria-label="enGAN.AI, voltar ao início"
            >
              enGAN<span>.AI</span>
            </Link>
          )}
          <div className="gan-hud-controls">
            <button
              className="gan-icon-button"
              aria-label="Explorar ambientes"
              title="Explorar ambientes"
              onClick={() => setDialog("ambientes")}
            >
              <Compass size={22} />
            </button>
            <button
              className="gan-icon-button"
              aria-label={soundLabel}
              title={soundLabel}
              aria-pressed={settings.soundOn}
              disabled={settings.soundPending}
              onClick={settings.toggleSound}
            >
              {settings.soundOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
            <button
              className="gan-icon-button"
              aria-label="Abrir preferências e ajuda"
              title="Preferências e ajuda"
              onClick={() => setDialog("preferencias")}
            >
              <Settings2 size={22} />
            </button>
          </div>
        </header>
        <main
          id="gan-content"
          className={`gan-main ${home || route === "missoes" || route === "arena" ? "gan-main-scene" : "gan-main-instrument"}`}
          key={pathname}
        >
          <Outlet />
        </main>
        {!home && (
          <footer className="gan-footer">
            <span>Engana aí. Aprende aqui.</span>
            <button
              onClick={() => {
                setGuideTab("guia");
                setDialog("guia");
              }}
            >
              <CircleHelp size={16} />
              Guia do explorador
            </button>
          </footer>
        )}
        <div className="gan-sr-only" role="status">
          {settings.notice}
        </div>
        <dialog
          ref={dialogRef}
          className="gan-dialog"
          aria-labelledby="gan-dialog-title"
          onCancel={closeDialog}
          onClose={closeDialog}
          onKeyDown={keepDialogFocus}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              closeDialog();
          }}
        >
          <div className="gan-dialog-heading">
            <span className="gan-eyebrow">
              ATELIÊ DE INVESTIGAÇÃO DOS PIXELS
            </span>
            <button
              className="gan-icon-button"
              aria-label="Fechar janela"
              onClick={closeDialog}
            >
              <X size={21} />
            </button>
          </div>
          <h2 id="gan-dialog-title">
            {dialog === "ambientes"
              ? "Aonde a curiosidade leva?"
              : dialog === "preferencias"
                ? "Do seu jeito."
                : "Toda descoberta começa aqui."}
          </h2>
          {dialog === "ambientes" && (
            <nav className="gan-travel-grid" aria-label="Ambientes do ateliê">
              {destinations.map((destination) => {
                const Icon = icons[destination.icon];
                return (
                  <Link
                    to={destination.to}
                    key={destination.to}
                    onClick={closeDialog}
                  >
                    <Icon size={23} />
                    <span>
                      <strong>{destination.title}</strong>
                      <small>{destination.description}</small>
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                );
              })}
            </nav>
          )}
          {dialog === "preferencias" && (
            <div className="gan-settings-content">
              <p>Um ambiente tranquilo para explorar no seu ritmo.</p>
              <div className="gan-setting-row">
                <span>
                  <strong>Som do ateliê</strong>
                  <small>
                    Ambiente suave, sem pistas sonoras obrigatórias.
                  </small>
                </span>
                <button
                  className="gan-setting-toggle"
                  aria-pressed={settings.soundOn}
                  disabled={settings.soundPending}
                  onClick={settings.toggleSound}
                >
                  {settings.soundOn ? "Ligado" : "Desligado"}
                  <span />
                </button>
              </div>
              <div className="gan-setting-row">
                <span>
                  <strong>Reduzir movimento</strong>
                  <small>
                    {settings.reducedMotion &&
                    settings.preferences.motion === "system"
                      ? "Sua preferência do sistema já está sendo respeitada."
                      : "Uma experiência sem flutuações ou transições."}
                  </small>
                </span>
                <button
                  className="gan-setting-toggle"
                  aria-pressed={settings.preferences.motion === "reduced"}
                  onClick={() =>
                    settings.updatePreferences({
                      motion:
                        settings.preferences.motion === "reduced"
                          ? "system"
                          : "reduced",
                    })
                  }
                >
                  {settings.preferences.motion === "reduced"
                    ? "Ativado"
                    : "Sistema"}
                  <span />
                </button>
              </div>
              <fieldset className="gan-setting-fieldset">
                <legend>Como você prefere as explicações?</legend>
                <div className="gan-segmented">
                  {[
                    ["intuitive", "Intuitivas"],
                    ["technical", "Técnicas"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={settings.preferences.explanation === value}
                      onClick={() =>
                        settings.updatePreferences({ explanation: value })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="gan-settings-help">
                <BookOpen size={21} />
                <span>
                  Uma palavra nova?
                  <br />
                  <button
                    onClick={() => {
                      setGuideTab("glossario");
                      setDialog("guia");
                      dialogRef.current?.querySelector("button")?.focus();
                    }}
                  >
                    Abrir o glossário <ArrowRight size={14} />
                  </button>
                </span>
              </div>
              {settings.persistence !== "ready" && (
                <p className="gan-settings-notice">
                  {settings.persistence === "incompatible"
                    ? "Há preferências salvas em outro formato. Elas foram preservadas; os ajustes valem para esta visita."
                    : "O navegador não permitiu salvar as preferências. Os ajustes valem para esta visita."}
                </p>
              )}
              <button
                className="gan-text-button"
                onClick={settings.resetPreferences}
              >
                Redefinir preferências
              </button>
            </div>
          )}
          {dialog === "guia" && (
            <>
              <div className="gan-segmented" aria-label="Conteúdo do guia">
                {[
                  ["guia", "Primeiros passos"],
                  ["glossario", "Glossário"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={guideTab === id}
                    onClick={() => setGuideTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {guideTab === "guia" ? (
                <div className="gan-guide-content">
                  <p>
                    <strong>1. Conheça as rivais.</strong> Fifi representa a
                    rede que cria. Lupa representa a rede que aprende a
                    distinguir imagens reais e sintéticas.
                  </p>
                  <p>
                    <strong>2. Explore sem pressa.</strong> O aquecimento está
                    disponível agora. No GANLab, acompanhe os conceitos que dão
                    vida à disputa.
                  </p>
                  <p>
                    <strong>3. Siga as evidências.</strong> O modelo real ainda
                    será conectado. As experiências conceituais estão
                    identificadas, e os casos do mural aguardam as imagens do
                    experimento.
                  </p>
                  <Link
                    className="gan-button is-primary"
                    to="/enganai/aquecimento"
                    onClick={closeDialog}
                  >
                    Fazer aquecimento <ArrowRight size={17} />
                  </Link>
                </div>
              ) : (
                <dl className="gan-glossary">
                  {glossary.map(([term, definition]) => (
                    <div key={term}>
                      <dt>{term}</dt>
                      <dd>{definition}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
        </dialog>
      </div>
    </AtelierContext.Provider>
  );
}
