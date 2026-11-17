import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleCheck,
  RotateCcw,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { quiz } from "../data/content.js";
import { AwaitingModel, Character, PageIntro } from "../components/GanUI.jsx";

export default function GanWarmupPage() {
  const [round, setRound] = useState(0);
  const [choice, setChoice] = useState(null);
  const [answers, setAnswers] = useState([]);
  const complete = round === quiz.length;
  const question = quiz[round];
  const score = answers.filter(Boolean).length;
  const nextRef = useRef(null);
  const questionRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (choice !== null) nextRef.current?.focus({ preventScroll: true });
    else if (complete) resultRef.current?.focus({ preventScroll: true });
    else if (round > 0) questionRef.current?.focus({ preventScroll: true });
  }, [choice, complete, round]);

  function select(name) {
    if (choice !== null) return;
    setChoice(name);
    setAnswers((previous) => [...previous, name === question.answer]);
  }

  function next() {
    setChoice(null);
    setRound((previous) => previous + 1);
  }
  function restart() {
    setRound(0);
    setChoice(null);
    setAnswers([]);
  }

  return (
    <>
      <PageIntro
        eyebrow="AQUECIMENTO / AS PRIMEIRAS PISTAS"
        title="Conheça suas adversárias."
      >
        Antes de investigar imagens, aqueça sua intuição. Quem faz o quê nessa
        disputa?
      </PageIntro>
      <section className="gan-arena gan-panel" aria-label="Quiz de aquecimento">
        <div className="gan-arena-top">
          <span className="gan-tag">
            <Swords size={15} />
            AQUECIMENTO
          </span>
          <span>
            {complete
              ? "Aquecimento concluído"
              : `Pergunta ${round + 1} de ${quiz.length}`}
          </span>
        </div>
        <div
          className="gan-quiz-progress"
          aria-label={`${complete ? quiz.length : round} perguntas concluídas de ${quiz.length}`}
        >
          {quiz.map((_, index) => (
            <span
              key={index}
              className={
                index < round || (index === round && choice) ? "is-done" : ""
              }
            />
          ))}
        </div>
        {complete ? (
          <div className="gan-quiz-result">
            <span className="gan-trophy">
              <Trophy size={37} />
            </span>
            <p className="gan-eyebrow">PRIMEIRAS PISTAS DESVENDADAS</p>
            <h2 tabIndex={-1} ref={resultRef}>
              {score === quiz.length
                ? "Você já conhece as rivais!"
                : "Cada descoberta conta."}
            </h2>
            <p>
              Você acertou{" "}
              <strong>
                {score} de {quiz.length}
              </strong>{" "}
              perguntas conceituais. Agora, que tal descobrir o que acontece
              dentro das redes?
            </p>
            <div className="gan-hero-actions">
              <Link className="gan-button is-primary" to="/enganai/missoes">
                Voltar ao mural <ArrowRight size={17} />
              </Link>
              <button className="gan-button is-secondary" onClick={restart}>
                <RotateCcw size={16} />
                Tentar de novo
              </button>
            </div>
            <small>
              Este placar é do quiz. Ele não mede o desempenho de uma GAN.
            </small>
          </div>
        ) : (
          <>
            <div className="gan-quiz-question">
              <span className="gan-eyebrow">SIGA A PISTA</span>
              <h2 tabIndex={-1} ref={questionRef}>
                {question.question}
              </h2>
              <p>{question.hint}</p>
            </div>
            <div className="gan-quiz-choices">
              {["fifi", "lupa"].map((name) => (
                <button
                  key={name}
                  className={`gan-quiz-character gan-tone-${name === "fifi" ? "coral" : "cyan"} ${choice === name ? "is-selected" : ""} ${choice !== null && name === question.answer ? "is-correct" : ""}`}
                  onClick={() => select(name)}
                  disabled={choice !== null}
                  aria-label={`Responder ${name === "fifi" ? "Fifi, o Gerador" : "Lupa, o Discriminador"}`}
                >
                  <Character
                    name={name}
                    pose={
                      choice === null
                        ? "neutral"
                        : name === question.answer
                          ? "celebrating"
                          : "mistake"
                    }
                  />
                  <span>
                    <strong>{name === "fifi" ? "Fifi" : "Lupa"}</strong>
                    <small>
                      {name === "fifi" ? "O Gerador" : "O Discriminador"}
                    </small>
                  </span>
                  <span className="gan-choice-mark">
                    {choice !== null && name === question.answer ? (
                      <Check size={18} />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="gan-quiz-feedback" aria-live="polite">
              {choice ? (
                <>
                  <div className="gan-feedback-text">
                    <CircleCheck size={21} />
                    <p>
                      <strong>
                        {choice === question.answer
                          ? "Boa investigação!"
                          : "Uma nova pista para você."}
                      </strong>
                      {question.explanation}
                    </p>
                  </div>
                  <button
                    className="gan-button is-primary"
                    onClick={next}
                    ref={nextRef}
                  >
                    {round === quiz.length - 1
                      ? "Ver meu resultado"
                      : "Próxima pergunta"}
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <span>
                  <Sparkles size={16} />
                  Escolha uma personagem para revelar a explicação.
                </span>
              )}
            </div>
          </>
        )}
      </section>
      <AwaitingModel title="Em breve, você vai investigar os pixels.">
        O desafio real × sintética será conectado a imagens do dataset e
        amostras da GAN com origem registrada.
      </AwaitingModel>
    </>
  );
}
