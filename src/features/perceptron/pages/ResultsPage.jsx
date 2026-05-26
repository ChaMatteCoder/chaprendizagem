import { ArrowLeft, BookOpen, ChartNoAxesCombined, CheckCircle2, CircleDot, Layers3, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import MetricCard from '../../../components/MetricCard.jsx';
import ErrorChart from '../components/ErrorChart.jsx';
import MatrixGrid from '../components/MatrixGrid.jsx';
import { errorCurve, learnedWeights, testSamples, trainingMetrics } from '../data/mockResults.js';

export default function ResultsPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Treinamento e resultados</p>
          <h1>Curva de aprendizado do Perceptron.</h1>
          <p>
            Painel inicial para documentar o treino, interpretar erros e registrar os próximos experimentos do projeto.
          </p>
          <Link className="button button--ghost" to="/perceptron/modelo">
            <ArrowLeft size={18} /> Voltar ao modelo
          </Link>
        </div>
        <div className="metrics-grid">
          <MetricCard icon={CircleDot} label="Épocas" value={trainingMetrics.epochs} />
          <MetricCard icon={ChartNoAxesCombined} label="Erro final" value={trainingMetrics.finalError} />
          <MetricCard icon={Layers3} label="Amostras" value={trainingMetrics.samples} />
          <MetricCard icon={Target} label="Taxa de acerto" value={`${trainingMetrics.accuracy}%`} />
        </div>
      </section>

      <section className="results-grid">
        <article className="tool-panel">
          <div className="panel-heading">
            <h2>Gráfico de erro por época</h2>
            <span>Dados mockados iniciais</span>
          </div>
          <ErrorChart data={errorCurve} />
        </article>
        <article className="tool-panel">
          <div className="panel-heading">
            <h2>Pesos aprendidos</h2>
            <span>Exemplo visual de um perceptron</span>
          </div>
          <div className="weights-grid">
            {learnedWeights.flat().map((weight, index) => (
              <span key={`${weight}-${index}`} style={{ '--weight': `${Math.abs(weight) / 1.2}` }}>
                {weight.toFixed(1)}
              </span>
            ))}
          </div>
          <p className="helper-text">Matriz 5x4 de pesos conectada a um neurônio de saída.</p>
        </article>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Testes com dígitos</p>
          <h2>Exemplos de classificação.</h2>
        </div>
        <div className="tests-grid">
          {testSamples.map((sample) => (
            <article className="test-card" key={sample.label}>
              <MatrixGrid matrix={sample.matrix} compact />
              <div>
                <span>Previsto</span>
                <strong>{sample.predicted}</strong>
                <small>
                  <CheckCircle2 size={16} /> Correto
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Leitura dos resultados</p>
          <h2>O que observar nesta primeira versão.</h2>
        </div>
        <div className="steps-grid">
          <article className="study-step">
            <ChartNoAxesCombined size={34} />
            <div>
              <h3>Convergência</h3>
              <p>A redução do erro indica que os ajustes dos pesos estão levando a rede a respostas mais estáveis.</p>
            </div>
          </article>
          <article className="study-step">
            <Target size={34} />
            <div>
              <h3>Sensibilidade a ruído</h3>
              <p>Pequenas alterações nos pixels podem mudar a classe prevista, especialmente em padrões parecidos.</p>
            </div>
          </article>
          <article className="study-step">
            <BookOpen size={34} />
            <div>
              <h3>Limitação linear</h3>
              <p>O Perceptron separa classes linearmente, por isso alguns problemas exigem arquiteturas mais ricas.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <p className="eyebrow">Próximos passos</p>
          <h2>Expansões planejadas.</h2>
        </div>
        <div className="next-grid">
          <article>
            <strong>Reconhecimento de letras</strong>
            <p>Aplicar a mesma estrutura em padrões de letras maiúsculas.</p>
          </article>
          <article>
            <strong>Variações com ruído</strong>
            <p>Avaliar robustez com pixels alterados em exemplos de teste.</p>
          </article>
          <article>
            <strong>Comparação entre modelos</strong>
            <p>Registrar diferenças entre Perceptron, regressão logística e redes simples.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
