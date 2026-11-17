import { useState } from "react";
import { BookmarkPlus, Dna, Shuffle, Trash2 } from "lucide-react";
import { AwaitingModel, DemoNote, PageIntro } from "../components/GanUI.jsx";
import { interpolateVectors, latentVector } from "../lib/illustration.js";

function readSavedSeeds() {
  try {
    const seeds = JSON.parse(localStorage.getItem("enganai-seeds") ?? "[]");
    return Array.isArray(seeds)
      ? seeds
          .filter(
            (seed) => Number.isInteger(seed) && seed >= 0 && seed <= 4294967295,
          )
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

export default function GanMutationsPage() {
  const [seedA, setSeedA] = useState(42);
  const [seedB, setSeedB] = useState(137);
  const [inputA, setInputA] = useState("42");
  const [inputB, setInputB] = useState("137");
  const [amount, setAmount] = useState(0);
  const [savedSeeds, setSavedSeeds] = useState(readSavedSeeds);
  const [message, setMessage] = useState("");
  const a = latentVector(seedA);
  const b = latentVector(seedB);
  const vector = interpolateVectors(a, b, amount / 100);

  function updateSeeds(event) {
    event.preventDefault();
    setSeedA(Number(inputA));
    setSeedB(Number(inputB));
    setMessage("Sementes aplicadas. Os vetores foram recalculados.");
  }
  function randomize() {
    const seeds = crypto.getRandomValues(new Uint32Array(2));
    setSeedA(seeds[0]);
    setSeedB(seeds[1]);
    setInputA(String(seeds[0]));
    setInputB(String(seeds[1]));
    setMessage("Novas sementes sorteadas.");
  }
  function persist(seeds) {
    setSavedSeeds(seeds);
    try {
      localStorage.setItem("enganai-seeds", JSON.stringify(seeds));
      return true;
    } catch {
      return false;
    }
  }
  function saveSeed() {
    if (savedSeeds.includes(seedA)) {
      setMessage("Essa semente já está na sua coleção.");
      return;
    }
    const persisted = persist([seedA, ...savedSeeds].slice(0, 8));
    setMessage(
      persisted
        ? "Semente A guardada neste navegador."
        : "Semente guardada nesta visita. Seu navegador não permitiu o armazenamento local.",
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="LABORATÓRIO DE MUTAÇÕES"
        title="Uma semente. Muitas possibilidades."
      >
        Explore números que podem virar o ponto de partida de uma criação.
      </PageIntro>
      <DemoNote>
        Este experimento interpola vetores numéricos, sem gerar imagens. A
        inferência G(z) será conectada ao modelo real.
      </DemoNote>
      <section className="gan-panel gan-mutations">
        <div className="gan-panel-top">
          <span className="gan-tag">
            <Dna size={15} />
            EXPLORADOR DE VETORES
          </span>
          <span className="gan-caption">8 dimensões ilustrativas</span>
        </div>
        <form className="gan-seed-form" onSubmit={updateSeeds}>
          <label>
            Semente A
            <input
              aria-label="Semente A"
              type="number"
              min="0"
              max="4294967295"
              step="1"
              required
              value={inputA}
              onChange={(event) => setInputA(event.target.value)}
            />
          </label>
          <span className="gan-seed-separator">→</span>
          <label>
            Semente B
            <input
              aria-label="Semente B"
              type="number"
              min="0"
              max="4294967295"
              step="1"
              required
              value={inputB}
              onChange={(event) => setInputB(event.target.value)}
            />
          </label>
          <button className="gan-button is-primary" type="submit">
            Aplicar sementes
          </button>
          <button
            className="gan-button is-secondary"
            type="button"
            onClick={randomize}
          >
            <Shuffle size={16} />
            Sortear
          </button>
        </form>
        <div className="gan-vector-display" aria-label="Vetor interpolado">
          {vector.map((value, index) => (
            <div className="gan-vector-dimension" key={index}>
              <span>
                z<sub>{index + 1}</sub>
              </span>
              <div className="gan-vector-track">
                <span
                  style={{
                    height: `${Math.abs(value) * 47}%`,
                    bottom:
                      value >= 0 ? "50%" : `${50 - Math.abs(value) * 47}%`,
                  }}
                  className={value < 0 ? "is-negative" : ""}
                />
              </div>
              <output>{value.toFixed(3)}</output>
            </div>
          ))}
        </div>
        <div className="gan-interpolation-control">
          <div>
            <label htmlFor="gan-interpolation">Caminhe entre os vetores</label>
            <output htmlFor="gan-interpolation">
              t = {(amount / 100).toFixed(2)}
            </output>
          </div>
          <input
            id="gan-interpolation"
            type="range"
            min="0"
            max="100"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            aria-valuetext={`${amount}% do caminho entre o vetor A e o vetor B`}
          />
          <div>
            <span>Vetor A · semente {seedA}</span>
            <span>Vetor B · semente {seedB}</span>
          </div>
        </div>
        <div className="gan-formula">
          <code>z(t) = (1 − t) · zA + t · zB</code>
          <span>INTERPOLAÇÃO LINEAR</span>
        </div>
        <p className="gan-caption">
          Os valores deste exemplo são pseudoaleatórios entre −1 e 1. Com uma
          GAN, o vetor interpolado entra em G(z); misturar pixels de duas
          imagens é outro processo.
        </p>
        <button className="gan-button is-secondary" onClick={saveSeed}>
          <BookmarkPlus size={16} />
          Guardar semente A
        </button>
        <p className="gan-live-message" role="status">
          {message}
        </p>
      </section>
      <section className="gan-section">
        <div className="gan-section-heading">
          <div>
            <p className="gan-eyebrow">SUA COLEÇÃO</p>
            <h2>Sementes para revisitar.</h2>
          </div>
          <p>Até 8 sementes salvas neste navegador.</p>
        </div>
        {savedSeeds.length ? (
          <div className="gan-saved-seeds">
            {savedSeeds.map((seed) => (
              <div key={seed}>
                <button
                  onClick={() => {
                    setSeedA(seed);
                    setInputA(String(seed));
                    setAmount(0);
                    setMessage(`Semente ${seed} restaurada no vetor A.`);
                  }}
                >
                  <span className="gan-seed-icon">
                    <Dna size={20} />
                  </span>
                  <span>
                    <small>SEMENTE A</small>
                    <strong>{seed}</strong>
                  </span>
                </button>
                <button
                  className="gan-icon-button"
                  aria-label={`Remover semente ${seed}`}
                  onClick={() => {
                    persist(savedSeeds.filter((item) => item !== seed));
                    setMessage(`Semente ${seed} removida da coleção.`);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="gan-empty-collection">
            <BookmarkPlus size={23} />
            <p>
              Gostou de um ponto de partida?
              <br />
              <span>Guarde a semente A e volte a ela quando quiser.</span>
            </p>
          </div>
        )}
      </section>
      <AwaitingModel title="Em breve, os números ganham forma.">
        A galeria de imagens e a geração por semente serão conectadas ao Gerador
        treinado.
      </AwaitingModel>
    </>
  );
}
