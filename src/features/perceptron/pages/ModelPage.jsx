import { ArrowRight, CheckCircle2, FlaskConical, RotateCcw, Shuffle, Sigma } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MatrixGrid from '../components/MatrixGrid.jsx';
import PerceptronOutputList from '../components/PerceptronOutputList.jsx';
import VectorDisplay from '../components/VectorDisplay.jsx';
import { digitMatrices, emptyMatrix } from '../data/digits.js';
import { cloneMatrix, simulatePrediction } from '../lib/perceptronSimulator.js';

function randomMatrix() {
  return Array.from({ length: 5 }, () => Array.from({ length: 4 }, () => (Math.random() > 0.5 ? 1 : -1)));
}

export default function ModelPage() {
  const [matrix, setMatrix] = useState(() => cloneMatrix(digitMatrices[7]));
  const [loadedDigit, setLoadedDigit] = useState(7);
  const result = useMemo(() => simulatePrediction(matrix), [matrix]);

  function toggleCell(rowIndex, columnIndex) {
    setMatrix((current) =>
      current.map((row, r) => row.map((value, c) => (r === rowIndex && c === columnIndex ? value * -1 : value))),
    );
    setLoadedDigit(null);
  }

  function loadDigit(digit) {
    setMatrix(cloneMatrix(digitMatrices[digit]));
    setLoadedDigit(digit);
  }

  return (
    <div className="page">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Modelo funcional</p>
          <h1>Teste o Perceptron na prática.</h1>
          <p>
            Altere a matriz de entrada, carregue exemplos de dígitos e acompanhe a previsão simulada dos 10
            perceptrons.
          </p>
        </div>
        <div className="result-panel">
          <span>Predição</span>
          <strong>{result.predictedDigit}</strong>
          <small>Confiança aproximada: {(result.confidence * 100).toFixed(0)}%</small>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-column">
          <section className="tool-panel">
            <div className="panel-heading">
              <h2>Matriz de entrada (5 x 4)</h2>
              <span>{loadedDigit !== null ? `Exemplo carregado: ${loadedDigit}` : 'Entrada personalizada'}</span>
            </div>
            <MatrixGrid matrix={matrix} onToggle={toggleCell} label="Matriz de entrada editável" />
            <div className="control-row">
              <button className="button button--ghost" type="button" onClick={() => setMatrix(emptyMatrix())}>
                <RotateCcw size={17} /> Limpar
              </button>
              <button className="button button--ghost" type="button" onClick={() => setMatrix(randomMatrix())}>
                <Shuffle size={17} /> Aleatório
              </button>
            </div>
          </section>

          <section className="tool-panel">
            <div className="panel-heading">
              <h2>Carregar exemplos</h2>
              <span>Dígitos 0 a 9</span>
            </div>
            <div className="digit-picker">
              {Object.keys(digitMatrices).map((digit) => (
                <button
                  className={Number(digit) === loadedDigit ? 'is-selected' : ''}
                  key={digit}
                  onClick={() => loadDigit(Number(digit))}
                  type="button"
                >
                  {digit}
                </button>
              ))}
            </div>
          </section>

          <section className="tool-panel">
            <div className="panel-heading">
              <h2>Vetor de entrada</h2>
              <span>20 posições com valores 1 e -1</span>
            </div>
            <VectorDisplay matrix={matrix} />
          </section>
        </div>

        <div className="workspace-column">
          <section className="tool-panel output-panel">
            <div className="panel-heading">
              <h2>Ativação dos perceptrons</h2>
              <span>Simulação preparada para integração real</span>
            </div>
            <PerceptronOutputList outputs={result.outputs} predictedDigit={result.predictedDigit} />
          </section>

          <section className="tool-panel">
            <div className="panel-heading">
              <h2>Controles do modelo</h2>
              <span>Parâmetros da próxima integração</span>
            </div>
            <div className="settings-grid">
              <label>
                Taxa de aprendizagem
                <input type="number" value="0.10" readOnly />
              </label>
              <label>
                Épocas máximas
                <input type="number" value="100" readOnly />
              </label>
            </div>
            <div className="status-line">
              <CheckCircle2 size={18} />
              Arquitetura pronta para conectar ao Perceptron real em Python.
            </div>
          </section>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <p className="eyebrow">Fluxo de execução</p>
          <h2>Como a entrada vira decisão.</h2>
        </div>
        <div className="flow-grid">
          {[
            ['1. Entrada binária', 'A matriz 5x4 é achatada em um vetor de 20 valores.'],
            ['2. Soma ponderada', 'Cada perceptron calcula a combinação entre entradas, pesos e bias.'],
            ['3. Ativação degrau', 'A soma é convertida para 1 ou -1.'],
            ['4. Classe prevista', 'O dígito escolhido é o que apresenta a melhor ativação.'],
          ].map(([title, text], index) => (
            <article key={title}>
              {index === 1 ? <Sigma size={30} /> : <FlaskConical size={30} />}
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="code-panel">
        <div>
          <h2>Visão do algoritmo</h2>
          <pre>{`para cada época:
  para cada amostra (x, d):
    para cada perceptron k:
      y = f(soma(w[k] * x) + b[k])
      erro = d[k] - y
      w[k] = w[k] + taxa * erro * x
      b[k] = b[k] + taxa * erro`}</pre>
        </div>
        <div className="note-box">
          <h3>Notas</h3>
          <p>Na versão atual, a previsão da interface usa uma simulação por similaridade para permitir a exploração visual.</p>
          <p>
            O ponto de integração está isolado em <code>src/features/perceptron/lib/perceptronSimulator.js</code>.
          </p>
        </div>
      </section>

      <section className="cta-band">
        <Sigma size={32} />
        <div>
          <h2>Veja o comportamento do treinamento</h2>
          <p>Acompanhe a curva de erro, métricas e exemplos de teste.</p>
        </div>
        <Link className="button button--primary" to="/perceptron/resultados">
          Abrir resultados <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
