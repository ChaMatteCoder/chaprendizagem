import { useState } from "react";
import { FlaskConical, Lightbulb, Zap } from "lucide-react";
import { chaosScenarios } from "../data/content.js";
import {
  Character,
  DemoNote,
  PageIntro,
  PixelPreview,
} from "../components/GanUI.jsx";

export default function GanChaosPage() {
  const [scenarioId, setScenarioId] = useState("collapse");
  const [intensity, setIntensity] = useState(30);
  const selected = chaosScenarios.find(({ id }) => id === scenarioId);
  const path = Array.from(
    { length: 21 },
    (_, index) =>
      `${index ? "L" : "M"}${index * 20},${70 + Math.sin(index * 1.8) * (intensity / 100) * 55}`,
  ).join(" ");
  return (
    <>
      <PageIntro
        eyebrow="CÂMARA DO CAOS"
        title="E se a disputa sair do controle?"
      >
        Nem todo treino é estável. Explore três problemas que podem aparecer em
        uma GAN.
      </PageIntro>
      <DemoNote>
        Modelos visuais de conceitos. Os controles não alteram redes neurais nem
        representam resultados de execuções.
      </DemoNote>
      <div className="gan-chaos-layout">
        <div className="gan-chaos-options">
          {chaosScenarios.map(({ id, title, subtitle, icon: Icon }) => (
            <button
              className={scenarioId === id ? "is-active" : ""}
              key={id}
              onClick={() => {
                setScenarioId(id);
                setIntensity(30);
              }}
              aria-pressed={scenarioId === id}
            >
              <span className="gan-icon-tile">
                <Icon size={22} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{subtitle}</small>
              </span>
            </button>
          ))}
          <div className="gan-chaos-tip">
            <FlaskConical size={22} />
            <p>
              Uma hipótese é o começo.
              <br />
              <strong>Um experimento real é o próximo passo.</strong>
            </p>
          </div>
        </div>
        <section className="gan-panel gan-chaos-experiment">
          <span className="gan-tag">
            <Zap size={14} />
            {selected.subtitle}
          </span>
          <h2>{selected.title}</h2>
          <p>{selected.text}</p>
          <div className="gan-chaos-visual">
            {scenarioId === "collapse" ? (
              <div className="gan-chaos-samples">
                {Array.from({ length: 8 }, (_, index) => (
                  <PixelPreview
                    key={index}
                    seed={intensity > 65 ? 42 : index * 17}
                    structure={0.85}
                    kind={
                      index < Math.round((intensity / 100) * 8) ? 0 : index % 3
                    }
                  />
                ))}
              </div>
            ) : scenarioId === "balance" ? (
              <div className="gan-balance">
                <Character
                  name="fifi"
                  style={{
                    opacity: 1 - intensity / 160,
                    transform: `scale(${1 - intensity / 500})`,
                  }}
                />
                <div>
                  <span>G</span>
                  <div className="gan-balance-track">
                    <span style={{ width: `${50 - intensity * 0.4}%` }} />
                  </div>
                  <span>D</span>
                </div>
                <Character
                  name="lupa"
                  style={{ transform: `scale(${1 + intensity / 500})` }}
                />
              </div>
            ) : (
              <div className="gan-oscillation">
                <svg
                  viewBox="0 0 400 140"
                  role="img"
                  aria-label="Trajetória oscilante ilustrativa, sem medições de treinamento"
                >
                  <path d="M0 70 H400" className="gan-oscillation-axis" />
                  <path d={path} />
                </svg>
                <span>TRAJETÓRIA ILUSTRATIVA · SEM MEDIÇÕES</span>
              </div>
            )}
          </div>
          <div className="gan-interpolation-control">
            <div>
              <label htmlFor="gan-chaos-intensity">{selected.control}</label>
            </div>
            <input
              id="gan-chaos-intensity"
              type="range"
              min="0"
              max="100"
              value={intensity}
              onChange={(event) => setIntensity(Number(event.target.value))}
            />
            <div>
              <span>{selected.low}</span>
              <span>{selected.high}</span>
            </div>
          </div>
          <div className="gan-chaos-lesson" aria-live="polite">
            <Lightbulb size={23} />
            <div>
              <h3>O que essa ideia ensina?</h3>
              <p>{selected.lesson}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
