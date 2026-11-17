import { useState } from "react";
import {
  ArrowRight,
  Braces,
  BrainCircuit,
  Check,
  Circle,
  Layers3,
  Lightbulb,
  Radio,
  Shuffle,
} from "lucide-react";
import { labNetworks } from "../data/content.js";
import { useAtelier } from "../hooks/AtelierContext.js";
import {
  AwaitingModel,
  Character,
  DemoNote,
  PageIntro,
} from "../components/GanUI.jsx";

const icons = [Shuffle, Layers3, BrainCircuit, Radio];

export default function GanLabPage() {
  const [network, setNetwork] = useState("gerador");
  const { preferences, updatePreferences } = useAtelier();
  const technical = preferences.explanation === "technical";
  const [step, setStep] = useState(0);
  const selected = labNetworks[network];
  return (
    <>
      <PageIntro
        eyebrow="GANLAB / POR DENTRO DAS REDES"
        title="A ciência por trás do truque."
      >
        Siga o caminho dos dados e descubra como uma rede aprende com a outra.
      </PageIntro>
      <div className="gan-lab-toolbar">
        <div className="gan-segmented" aria-label="Rede ou processo">
          {[
            ["gerador", "Gerador"],
            ["discriminador", "Discriminador"],
            ["treinamento", "Treinamento"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={network === id}
              onClick={() => {
                setNetwork(id);
                setStep(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className={`gan-mode-switch ${technical ? "is-active" : ""}`}
          onClick={() =>
            updatePreferences({
              explanation: technical ? "intuitive" : "technical",
            })
          }
          aria-pressed={technical}
        >
          {technical ? <Braces size={16} /> : <Lightbulb size={16} />}
          {technical ? "Modo técnico" : "Modo intuitivo"}
          <span className="gan-switch-track">
            <span />
          </span>
        </button>
      </div>
      <section className={`gan-panel gan-network gan-tone-${selected.tone}`}>
        <div className="gan-network-heading">
          <div>
            <span className="gan-tag">
              {network === "treinamento"
                ? "CICLO ADVERSARIAL"
                : "PROPOSTA DE ARQUITETURA"}
            </span>
            <h2>{selected.title}</h2>
            <p>{technical ? selected.technical : selected.intuitive}</p>
          </div>
          <Character name={selected.character} />
        </div>
        <div className="gan-network-flow" aria-label="Etapas do fluxo">
          {selected.steps.map((item, index) => {
            const Icon = icons[index];
            return (
              <div className="gan-flow-item" key={item.label}>
                <button
                  aria-pressed={step === index}
                  onClick={() => setStep(index)}
                  className={step === index ? "is-active" : ""}
                >
                  <span className="gan-flow-index">0{index + 1}</span>
                  <Icon size={30} strokeWidth={1.4} />
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </button>
                {index < 3 && (
                  <ArrowRight
                    size={20}
                    className="gan-flow-arrow"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="gan-step-detail" aria-live="polite">
          <span>0{step + 1}</span>
          <div>
            <h3>{selected.steps[step].label}</h3>
            <p>{selected.steps[step].explanation}</p>
          </div>
        </div>
        <div className="gan-formula">
          <Braces size={19} />
          <code>{selected.formula}</code>
          <span>FLUXO CONCEITUAL</span>
        </div>
      </section>
      <div className="gan-two-columns gan-lab-bottom">
        <article className="gan-panel gan-explanation">
          <span className="gan-icon-tile">
            <Lightbulb size={21} />
          </span>
          <h3>Aprender não é decorar uma regra.</h3>
          <p>
            O Discriminador aprende padrões dos exemplos disponíveis. O Gerador
            aprende a produzir imagens usando esse feedback. Nenhum dos dois
            nasce sabendo a resposta.
          </p>
        </article>
        <article className="gan-panel gan-explanation">
          <h3>O que observar no treinamento?</h3>
          <ul className="gan-check-list">
            <li>
              <Check size={16} />
              Qualidade e variedade das amostras
            </li>
            <li>
              <Check size={16} />
              Perdas das duas redes, em conjunto
            </li>
            <li>
              <Check size={16} />
              Comparações com o mesmo vetor latente
            </li>
            <li>
              <Circle size={13} />
              Resultados reais ainda não disponíveis
            </li>
          </ul>
        </article>
      </div>
      <AwaitingModel title="Monitor de treinamento em preparação.">
        Perdas, pesos e configurações serão exibidos a partir dos registros
        reais do experimento, sem curvas simuladas.
      </AwaitingModel>
      <DemoNote compact>
        O diagrama explica a arquitetura proposta. Nenhuma camada está sendo
        executada nesta tela.
      </DemoNote>
    </>
  );
}
