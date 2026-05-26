import { ArrowRight, CheckCircle2, GitBranch, Sigma } from 'lucide-react';
import { Link } from 'react-router-dom';
import TheoryBlock from '../../../components/TheoryBlock.jsx';
import MatrixGrid from '../components/MatrixGrid.jsx';
import VectorDisplay from '../components/VectorDisplay.jsx';
import { digitMatrices, expectedOutput } from '../data/digits.js';

export default function TheoryPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Base teórica</p>
          <h1>Base teórica do Perceptron.</h1>
          <p>
            O Perceptron é um classificador linear simples. Ele combina entradas, pesos e bias para decidir se um
            padrão pertence ou não a uma classe.
          </p>
        </div>
        <div className="formula-panel">
          <h2>Modelo do neurônio</h2>
          <div className="formula-flow">
            <span>x₁...x₂₀</span>
            <ArrowRight size={22} />
            <strong>Σ(xᵢ · wᵢ) + b</strong>
            <ArrowRight size={22} />
            <span>f(u)</span>
          </div>
          <p>Se u ≥ 0, a saída é 1. Caso contrário, a saída é -1.</p>
        </div>
      </section>

      <div className="theory-layout">
        <TheoryBlock title="Entradas, pesos, bias e saída">
          <p>
            Cada posição da matriz representa um pixel. O valor 1 indica célula ativa e -1 indica célula apagada. O
            peso define a importância de cada entrada, enquanto o bias desloca a fronteira de decisão.
          </p>
        </TheoryBlock>
        <TheoryBlock title="Soma ponderada">
          <p>
            O modelo calcula uma soma ponderada das 20 entradas. Esse valor resume o quanto o padrão observado se
            aproxima da classe que o perceptron está tentando reconhecer.
          </p>
        </TheoryBlock>
        <TheoryBlock title="Função de ativação degrau">
          <p>
            Depois da soma, uma função degrau transforma o resultado em uma saída binária: 1 quando o padrão é aceito
            pela classe e -1 quando é rejeitado.
          </p>
        </TheoryBlock>
      </div>

      <section className="wide-panel">
        <div className="section-heading">
          <p className="eyebrow">Representação</p>
          <h2>Da matriz ao vetor de 20 posições.</h2>
        </div>
        <div className="representation">
          <div>
            <h3>Matriz 5 x 4 do dígito 7</h3>
            <MatrixGrid matrix={digitMatrices[7]} />
          </div>
          <ArrowRight className="representation__arrow" size={30} />
          <div>
            <h3>Vetor achatado</h3>
            <VectorDisplay matrix={digitMatrices[7]} />
          </div>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <p className="eyebrow">Estratégia um contra todos</p>
          <h2>Dez perceptrons para reconhecer os dígitos de 0 a 9.</h2>
          <p>
            Cada perceptron responde a uma classe. Para o dígito correto, a saída esperada é 1; para as demais classes,
            a saída esperada é -1.
          </p>
        </div>
        <div className="digit-strategy">
          {expectedOutput(7).map((value, digit) => (
            <div className={value === 1 ? 'is-target' : ''} key={digit}>
              <strong>{digit}</strong>
              <Sigma size={26} />
              <span>Saída {value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="steps-grid">
        {[
          ['Inicialização dos pesos', 'Pesos e bias começam com pequenos valores e são ajustados durante o treino.'],
          ['Cálculo da saída', 'A soma ponderada passa pela função degrau para gerar 1 ou -1.'],
          ['Comparação com o esperado', 'O erro indica se a resposta do perceptron precisa ser corrigida.'],
          ['Atualização', 'Pesos e bias são ajustados para reduzir erros em próximas amostras.'],
        ].map(([title, description], index) => (
          <article className="learning-card" key={title}>
            <span>{index + 1}</span>
            <CheckCircle2 size={26} />
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="cta-band">
        <GitBranch size={32} />
        <div>
          <h2>Pronto para ver na prática?</h2>
          <p>Interaja com a matriz e observe as ativações dos 10 perceptrons.</p>
        </div>
        <Link className="button button--primary" to="/perceptron/modelo">
          Ver modelo funcional <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
