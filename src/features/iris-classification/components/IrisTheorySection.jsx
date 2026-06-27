import { BrainCircuit, Database, Flower2, Grid3X3, Layers3, Scale, Sigma, Target } from 'lucide-react';

const theoryBlocks = [
  {
    icon: Target,
    title: 'Classificação multiclasse',
    text: 'A MLP recebe quatro atributos numéricos e aprende a associar cada amostra a uma de três espécies. A camada de saída possui três neurônios, um para cada classe possível.',
  },
  {
    icon: Database,
    title: 'Iris Dataset',
    text: 'O Iris Dataset é uma base clássica com 150 amostras, 3 classes balanceadas e 4 atributos morfológicos medidos em centímetros.',
  },
  {
    icon: Scale,
    title: 'Normalização',
    text: 'Como os atributos possuem escalas diferentes, a normalização min-max aproxima os valores da faixa 0 a 1 e torna o treinamento mais estável.',
  },
  {
    icon: Layers3,
    title: 'MLP para dados tabulares',
    text: 'A rede usa camadas densas: 4 entradas, duas camadas ocultas com ReLU e uma saída softmax com três probabilidades.',
  },
  {
    icon: Sigma,
    title: 'Softmax',
    text: 'A função softmax transforma os valores finais da rede em uma distribuição de probabilidades. A maior probabilidade define a espécie prevista.',
  },
  {
    icon: Grid3X3,
    title: 'Matriz de confusão',
    text: 'As linhas representam as classes reais, as colunas as classes previstas e a diagonal principal concentra os acertos do classificador.',
  },
  {
    icon: Flower2,
    title: 'Setosa e sobreposição',
    text: 'Iris-setosa costuma ser mais separável por suas pétalas menores. Versicolor e Virginica apresentam regiões mais próximas no espaço dos atributos.',
  },
  {
    icon: BrainCircuit,
    title: 'Continuidade com a trilha MLP',
    text: 'Depois da aproximação funcional e do reconhecimento manuscrito, o Trabalho 09 aplica a mesma ideia de camadas densas a dados tabulares.',
  },
];

export default function IrisTheorySection() {
  return (
    <section className="wide-panel iris-theory-section reveal-up">
      <div className="section-heading">
        <p className="eyebrow">Fundamentação teórica</p>
        <h2>Da tabela de medidas à decisão probabilística.</h2>
        <p>
          Neste laboratório, a MLP trabalha com dados tabulares: cada linha é uma flor e cada coluna descreve uma medida.
          O objetivo é ajustar pesos para transformar esses atributos em probabilidades por espécie.
        </p>
      </div>

      <div className="iris-theory-grid">
        {theoryBlocks.map((block) => {
          const Icon = block.icon;
          return (
            <article className="theory-feature-card" key={block.title}>
              <Icon size={28} />
              <h3>{block.title}</h3>
              <p>{block.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
