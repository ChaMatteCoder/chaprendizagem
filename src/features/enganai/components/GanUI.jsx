import { ArrowUpRight, Info, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { illustrationPixels } from "../lib/illustration.js";
import { ATELIER_ASSETS } from "../data/atelier.js";

export function Character({
  name,
  pose = "neutral",
  className = "",
  style,
  loading,
  fetchPriority,
  ...props
}) {
  const label =
    name === "fifi"
      ? "Fifi, a robô artista que representa o Gerador"
      : "Lupa, a robô detetive que representa o Discriminador";
  if (pose !== "neutral")
    return (
      <span
        className={`gan-character gan-character-sheet ${className}`}
        data-pose={pose}
        role="img"
        aria-label={label}
        style={style}
        {...props}
      >
        <img
          src={`${ATELIER_ASSETS}/${name}-expressions.webp`}
          alt=""
          loading={loading}
          decoding="async"
          aria-hidden="true"
        />
      </span>
    );
  return (
    <img
      className={`gan-character ${className}`}
      src={`${ATELIER_ASSETS}/${name}.webp`}
      style={style}
      loading={loading}
      fetchPriority={fetchPriority}
      alt={
        name === "fifi"
          ? "Fifi, a robô artista que representa o Gerador"
          : "Lupa, a robô detetive que representa o Discriminador"
      }
      decoding="async"
      {...props}
    />
  );
}

export function PageIntro({ eyebrow, title, children, aside }) {
  return (
    <div className="gan-page-intro">
      <div>
        <p className="gan-eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        <p>{children}</p>
      </div>
      {aside}
    </div>
  );
}

export function DemoNote({ children, compact = false }) {
  return (
    <div className={`gan-demo-note ${compact ? "is-compact" : ""}`}>
      <Info size={17} aria-hidden="true" />
      <p>
        {children ??
          "Experiência ilustrativa. Nenhuma GAN está carregada nesta etapa; as prévias não são resultados de treinamento."}
      </p>
    </div>
  );
}

export function PixelPreview({
  seed = 42,
  structure = 1,
  kind = 0,
  label = "Desenho procedural de uma peça de roupa, usado como ilustração",
  className = "",
}) {
  const pixels = illustrationPixels(seed, structure, kind);
  return (
    <svg
      className={`gan-pixel-preview ${className}`}
      viewBox="0 0 28 28"
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width="28" height="28" fill="#101117" />
      {pixels.map((value, index) => (
        <rect
          key={index}
          x={index % 28}
          y={Math.floor(index / 28)}
          width="1"
          height="1"
          fill={`rgb(${value},${value},${value})`}
        />
      ))}
    </svg>
  );
}

export function ExperienceCard({ experience, index }) {
  const Icon = experience.icon;
  return (
    <Link
      className={`gan-experience gan-tone-${experience.tone}`}
      to={`/enganai/${experience.path}`}
    >
      <div className="gan-experience-top">
        <span className="gan-icon-tile">
          <Icon size={23} strokeWidth={1.6} />
        </span>
        <span className="gan-experience-number">0{index + 1}</span>
      </div>
      <span className="gan-card-eyebrow">{experience.tag}</span>
      <h3>{experience.short}</h3>
      <p>{experience.description}</p>
      <span className="gan-card-action">
        {experience.action}
        <ArrowUpRight size={17} />
      </span>
    </Link>
  );
}

export function AwaitingModel({
  title = "O próximo capítulo vem com o modelo.",
  children,
}) {
  return (
    <div className="gan-awaiting">
      <span className="gan-icon-tile">
        <Sparkles size={22} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>
          {children ??
            "As imagens geradas, métricas e checkpoints reais aparecerão aqui quando o experimento estiver conectado."}
        </p>
      </div>
      <span className="gan-status">
        <span />
        Em preparação
      </span>
    </div>
  );
}
