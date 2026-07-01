import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  Camera,
  ChevronDown,
  ChevronUp,
  Database,
  Grid3X3,
  Images,
  Layers3,
  PenLine,
  Sigma,
  Target,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfusionMatrixHeatmap from '../components/ConfusionMatrixHeatmap.jsx';
import DrawingCanvas from '../components/DrawingCanvas.jsx';
import HandwritingHeroAnimation from '../components/HandwritingHeroAnimation.jsx';
import ImageUploadPanel from '../components/ImageUploadPanel.jsx';
import MetricsCards from '../components/MetricsCards.jsx';
import MisclassificationInsights from '../components/MisclassificationInsights.jsx';
import ModelArchitectureCard from '../components/ModelArchitectureCard.jsx';
import PipelineOverviewSection from '../components/PipelineOverviewSection.jsx';
import PredictionResultCard from '../components/PredictionResultCard.jsx';
import ProcessingPipelineShowcase from '../components/ProcessingPipelineShowcase.jsx';
import RecognitionModeTabs from '../components/RecognitionModeTabs.jsx';
import TrainingCharts from '../components/TrainingCharts.jsx';
import TrainingControls from '../components/TrainingControls.jsx';
import { getModeConfig } from '../data/classLabels.js';
import { buildConfusionMatrix } from '../lib/buildConfusionMatrix.js';
import { calculateTrainingMetrics } from '../lib/calculateMetrics.js';
import { loadPretrainedMetrics } from '../lib/loadModelMetrics.js';
import { loadPretrainedAlphanumericModel, loadPretrainedDigitsModel } from '../lib/loadPretrainedModel.js';
import { predictCharacter } from '../lib/predictCharacter.js';
import { preprocessImageSource } from '../lib/preprocessImage.js';
import { trainModel } from '../lib/trainModel.js';

const theoryCards = [
  {
    icon: Target,
    title: 'Classificação supervisionada',
    text: 'A rede aprende a associar exemplos rotulados, como imagens de dígitos, às suas respectivas classes.',
  },
  {
    icon: Grid3X3,
    title: 'Imagem como matriz',
    text: 'Cada caractere é convertido para uma imagem 28x28, em que cada pixel vira um valor numérico normalizado.',
  },
  {
    icon: Sigma,
    title: 'MLP e probabilidades',
    text: 'A rede transforma os 784 pixels de entrada em probabilidades para cada classe possível.',
  },
  {
    icon: Database,
    title: 'Análise dos erros',
    text: 'Gráficos, métricas e matriz de confusão ajudam a entender acertos, incertezas e classes confundidas.',
  },
];

export default function HandwritingRecognitionPage() {
  const [mode, setMode] = useState('digits');
  const [processed, setProcessed] = useState(null);
  const [didacticModel, setDidacticModel] = useState(null);
  const [pretrainedModel, setPretrainedModel] = useState(null);
  const [pretrainedModelStatus, setPretrainedModelStatus] = useState('idle');
  const [pretrainedMetrics, setPretrainedMetrics] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [trainingInfo, setTrainingInfo] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [inputSource, setInputSource] = useState('canvas');
  const [statusMessage, setStatusMessage] = useState('Desenhe um caractere na lousa para iniciar o experimento.');
  const [pipelinePlayback, setPipelinePlayback] = useState({
    completedSteps: [],
    currentStep: 0,
    isPlaying: false,
  });
  const [labOpen, setLabOpen] = useState(false);
  const [theoryExpanded, setTheoryExpanded] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const didacticModelRef = useRef(null);
  const pretrainedModelRef = useRef(null);
  const digitsLoadRequestRef = useRef(0);
  const processedRef = useRef(null);
  const pipelineRef = useRef(null);
  const predictionRef = useRef(null);
  const metricsRef = useRef(null);
  const labContentRef = useRef(null);
  const playbackTimersRef = useRef([]);

  const modeConfig = getModeConfig(mode);
  const activeModel = ['digits', 'all'].includes(mode) ? pretrainedModel ?? didacticModel : didacticModel;
  const activeModelType =
    ['digits', 'all'].includes(mode) && pretrainedModel
      ? pretrainedModelStatus === 'loaded-json'
        ? 'mnist-json'
        : pretrainedModelStatus === 'loaded-tfjs'
          ? 'mnist-tfjs'
          : 'alphanumeric-json'
      : didacticModel
        ? 'didactic'
        : 'none';
  const metrics = useMemo(
    () => calculateTrainingMetrics(trainingHistory, modeConfig, trainingInfo?.sampleCount ?? 0, trainingInfo?.trainTimeMs ?? 0),
    [modeConfig, trainingHistory, trainingInfo],
  );
  const confusionMatrix = useMemo(() => {
    if (['mnist-tfjs', 'mnist-json', 'alphanumeric-json'].includes(activeModelType)) {
      return pretrainedMetrics?.confusionMatrix ?? null;
    }

    return buildConfusionMatrix(didacticModel, modeConfig);
  }, [activeModelType, didacticModel, pretrainedMetrics, modeConfig]);
  const confusionSource =
    ['mnist-tfjs', 'mnist-json', 'alphanumeric-json'].includes(activeModelType)
      ? pretrainedMetrics?.confusionMatrix
        ? mode === 'all'
          ? 'alphanumeric'
          : 'mnist'
        : mode === 'all'
          ? 'alphanumeric-missing'
          : 'mnist-missing'
      : didacticModel
        ? 'didactic'
        : 'empty';

  useEffect(() => {
    return () => {
      digitsLoadRequestRef.current += 1;
      didacticModelRef.current?.dispose();
      pretrainedModelRef.current?.dispose();
      didacticModelRef.current = null;
      pretrainedModelRef.current = null;
      playbackTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    processedRef.current = processed;
  }, [processed]);

  useEffect(() => {
    if (!['digits', 'all'].includes(mode)) return;

    let cancelled = false;
    const requestId = digitsLoadRequestRef.current + 1;
    const isAllMode = mode === 'all';
    const loader = isAllMode ? loadPretrainedAlphanumericModel : loadPretrainedDigitsModel;
    digitsLoadRequestRef.current = requestId;
    setPretrainedModelStatus('loading');
    setStatusMessage(isAllMode ? 'Carregando modelo alfanumérico...' : 'Carregando modelo MNIST...');

    loader()
      .then((loadedPretrained) => {
        if (cancelled || digitsLoadRequestRef.current !== requestId) {
          loadedPretrained.model.dispose();
          return;
        }

        replacePretrainedModel(loadedPretrained.model);
        setPretrainedModelStatus(
          loadedPretrained.source === 'alphanumeric-json'
            ? 'loaded-alphanumeric-json'
            : loadedPretrained.source === 'json'
              ? 'loaded-json'
              : 'loaded-tfjs',
        );
        setStatusMessage(
          loadedPretrained.source === 'alphanumeric-json'
            ? 'Modelo alfanumérico carregado por pesos JSON.'
            : loadedPretrained.source === 'json'
              ? 'Modelo MNIST carregado por pesos JSON.'
              : 'Modelo MNIST TensorFlow.js carregado.',
        );

        if (processedRef.current?.vector?.length) {
          setPrediction(
            predictCharacter(
              loadedPretrained.model,
              processedRef.current.mnistVector ?? processedRef.current.vector,
              modeConfig.classes,
            ),
          );
        }
      })
      .catch(() => {
        if (cancelled || digitsLoadRequestRef.current !== requestId) return;
        setPretrainedModelStatus(isAllMode ? 'missing-alphanumeric' : 'missing');
        setStatusMessage(
          isAllMode
            ? 'Modelo alfanumérico ainda não encontrado. Treine e exporte os pesos seguindo o README de treinamento.'
            : 'Modelo MNIST não encontrado, usando modo didático.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [mode, modeConfig.classes]);

  useEffect(() => {
    if (!['digits', 'all'].includes(mode)) {
      setPretrainedMetrics(null);
      return;
    }

    let cancelled = false;
    loadPretrainedMetrics(mode)
      .then((metricsPayload) => {
        if (!cancelled) setPretrainedMetrics(metricsPayload);
      })
      .catch(() => {
        if (!cancelled) setPretrainedMetrics(null);
      });

    return () => {
      cancelled = true;
    };
  }, [mode]);

  function replaceDidacticModel(nextModel) {
    didacticModelRef.current?.dispose();
    didacticModelRef.current = nextModel;
    setDidacticModel(nextModel);
  }

  function replacePretrainedModel(nextModel) {
    pretrainedModelRef.current?.dispose();
    pretrainedModelRef.current = nextModel;
    setPretrainedModel(nextModel);
  }

  function handleModeChange(nextMode) {
    if (nextMode === mode) return;
    digitsLoadRequestRef.current += 1;
    setMode(nextMode);
    replaceDidacticModel(null);
    replacePretrainedModel(null);
    setPretrainedMetrics(null);
    if (!['digits', 'all'].includes(nextMode)) {
      setPretrainedModelStatus('idle');
    }
    setTrainingHistory([]);
    setTrainingInfo(null);
    setPrediction(null);
    setResultsVisible(false);
    setPipelinePlayback({ completedSteps: [], currentStep: 0, isPlaying: false });
    setStatusMessage(
      nextMode === 'digits'
        ? 'Modo Dígitos selecionado. O site tentará usar o modelo MNIST quando disponível.'
        : nextMode === 'all'
          ? 'Modo Todos selecionado. O site tentará usar o modelo alfanumérico quando disponível.'
          : 'Modo Letras selecionado. Use o treino didático local para prever.',
    );
  }

  function openLab() {
    setLabOpen(true);
    window.setTimeout(() => {
      labContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function handleInputSourceChange(nextSource) {
    if (nextSource === inputSource) return;
    setInputSource(nextSource);
    setStatusMessage(
      nextSource === 'canvas'
        ? 'Lousa selecionada. Desenhe um caractere dentro do limite seguro.'
        : 'Imagem selecionada. Envie um arquivo PNG ou JPG com um caractere isolado.',
    );
  }

  function playPipeline({
    finalMessage = 'A rede analisou o padrão dos pixels e retornou uma distribuição de probabilidade.',
  } = {}) {
    playbackTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    playbackTimersRef.current = [];
    setPipelinePlayback({ completedSteps: [], currentStep: 0, isPlaying: true });

    window.requestAnimationFrame(() => {
      pipelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const messages = [
      'Capturando os traços...',
      'Detectando a região ativa...',
      'Recortando e centralizando o caractere...',
      'Normalizando para o formato MNIST...',
      'Convertendo pixels em vetor...',
      'Consultando a MLP...',
      finalMessage,
    ];

    messages.forEach((message, index) => {
      const timerId = window.setTimeout(() => {
        setStatusMessage(message);
        setPipelinePlayback({
          completedSteps: Array.from({ length: index }, (_, step) => step),
          currentStep: index,
          isPlaying: true,
        });
      }, index * 420);
      playbackTimersRef.current.push(timerId);
    });

    const doneTimerId = window.setTimeout(() => {
      setPipelinePlayback({
        completedSteps: Array.from({ length: messages.length }, (_, step) => step),
        currentStep: messages.length - 1,
        isPlaying: false,
      });
      setResultsVisible(true);
    }, messages.length * 420 + 180);
    playbackTimersRef.current.push(doneTimerId);
  }

  function showPredictionSection() {
    if (!prediction) {
      setStatusMessage('Ainda não há predição para mostrar. Treine a MLP didática ou use um modelo pré-treinado.');
      return;
    }

    setResultsVisible(true);
    window.setTimeout(() => {
      metricsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  async function handleTrain() {
    setIsTraining(true);
    setTrainingHistory([]);
    setPrediction(null);
    setStatusMessage('Treinando MLP TensorFlow.js...');

    try {
      const result = await trainModel(modeConfig, { epochs: 18, variantsPerClass: 3 }, (_, history) => {
        setTrainingHistory(history);
      });

      replaceDidacticModel(result.model);
      setTrainingInfo({ sampleCount: result.sampleCount, trainTimeMs: result.trainTimeMs });
      setResultsVisible(true);
      setStatusMessage(
        ['digits', 'all'].includes(mode) && pretrainedModelRef.current
          ? 'Treino didático concluído. A predição continua priorizando o modelo pré-treinado do modo atual.'
          : 'Modelo didático treinado. Agora processe um desenho ou uma imagem enviada.',
      );

      if (processed?.vector?.length) {
        const predictionModel = ['digits', 'all'].includes(mode) ? pretrainedModelRef.current ?? result.model : result.model;
        const predictionVector = ['digits', 'all'].includes(mode) ? processed.mnistVector ?? processed.vector : processed.vector;
        setPrediction(predictCharacter(predictionModel, predictionVector, modeConfig.classes));
      }
    } catch (error) {
      setPrediction(null);
      setStatusMessage(
        `Não foi possível treinar a MLP agora. ${error?.message ? `Detalhe técnico: ${error.message}` : 'Tente novamente em alguns instantes.'}`,
      );
    } finally {
      setIsTraining(false);
    }
  }

  function processSource(source, sourceType) {
    const nextProcessed = preprocessImageSource(source);
    const canPredict = Boolean(activeModel);
    setProcessed({ ...nextProcessed, sourceType });
    playPipeline({
      finalMessage: canPredict
        ? 'A rede analisou o padrão dos pixels e retornou uma distribuição de probabilidade.'
        : 'Imagem processada. Treine a MLP didática no modo atual para gerar a predição.',
    });

    if (canPredict) {
      const predictionVector = ['digits', 'all'].includes(mode)
        ? nextProcessed.mnistVector ?? nextProcessed.vector
        : nextProcessed.vector;
      const nextPrediction = predictCharacter(activeModel, predictionVector, modeConfig.classes);
      setPrediction(nextPrediction);
      if (nextPrediction?.confidence < 0.65) {
        setStatusMessage('A confiança está baixa. Tente centralizar melhor o caractere ou usar traços mais grossos.');
      }
    } else {
      setPrediction(null);
      setStatusMessage(
        mode === 'digits'
          ? 'Imagem processada. Treine a MLP didática ou adicione o modelo MNIST em public/models/digits/.'
          : mode === 'all'
            ? 'Imagem processada. Treine a MLP didática ou adicione o modelo alfanumérico em public/models/alphanumeric/.'
          : 'Imagem processada. Treine a MLP didática para gerar a previsão.',
      );
    }
  }

  return (
    <div className="page handwriting-page">
      <section className="page-hero handwriting-hero reveal-up">
        <div>
          <p className="eyebrow">Trabalho 08 - Reconhecimento Manuscrito com MLP</p>
          <h1>Números e letras manuscritas em uma MLP visual</h1>
          <p>
            Um laboratório para desenhar ou enviar um caractere, acompanhar o pré-processamento em 28×28 e observar como
            uma rede neural multicamada produz probabilidades para dígitos de 0 a 9 ou letras de A a Z.
          </p>
          <div className="hero-actions">
            <button className="button button--primary" onClick={openLab} type="button">
              Abrir laboratório <BrainCircuit size={18} />
            </button>
            <Link className="button button--ghost" to="/aproximacao-funcional">
              <ArrowLeft size={18} /> Voltar ao Trabalho 07
            </Link>
          </div>
        </div>
        <div className="handwriting-hero-visual reveal-right" aria-hidden="true">
          <HandwritingHeroAnimation />
        </div>
      </section>

      {labOpen ? (
        <div className="handwriting-lab-content" ref={labContentRef}>
      <section className="wide-panel reveal-up">
        <div className="section-heading">
          <p className="eyebrow">Objetivo do laboratório</p>
          <h2>Visualizar como um caractere manuscrito se transforma em uma decisão da MLP.</h2>
          <p>
            O objetivo deste laboratório é demonstrar, de forma visual e interativa, como uma rede neural multicamada pode
            reconhecer caracteres manuscritos a partir de imagens simples. O usuário pode desenhar ou enviar um número ou
            letra, acompanhar o pré-processamento da imagem, visualizar sua conversão para uma matriz 28×28 e observar
            como essa matriz é transformada em um vetor de 784 valores numéricos.
          </p>
          <p>
            A partir desse vetor, a MLP calcula uma distribuição de probabilidades para as classes possíveis. No modo de
            dígitos, o laboratório utiliza um modelo treinado com a base MNIST para reconhecer números de 0 a 9. No modo
            de letras, o mesmo conceito é explorado com classes de A a Z, permitindo comparar a complexidade de reconhecer
            símbolos manuscritos diferentes.
          </p>
          <p>
            Mais do que mostrar apenas a resposta final, o laboratório revela o caminho completo entre a imagem desenhada
            e a decisão do modelo: captura, pré-processamento, normalização, vetorização, propagação pela rede neural,
            softmax e interpretação das probabilidades.
          </p>
        </div>
        <div className="theory-highlight-grid functional-objective-grid stagger">
          {theoryCards.map((item) => {
            const Icon = item.icon;
            return (
              <article className="theory-feature-card" key={item.title}>
                <Icon size={30} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="wide-panel theory-panel reveal-up">
        <div className="section-heading">
          <p className="eyebrow">Fundamentação teórica</p>
          <h2>Da imagem manuscrita à decisão probabilística da rede neural.</h2>
          <p>
            O reconhecimento manuscrito combina conceitos de classificação supervisionada, representação de imagens,
            pré-processamento, redes neurais densas e avaliação de modelos. Nesta seção, cada etapa é apresentada como
            parte do mesmo fluxo observado no laboratório.
          </p>
        </div>

        <div className="theory-summary">
          <p>
            A fundamentação conecta o experimento visual aos conceitos que sustentam o reconhecimento manuscrito: pixels
            normalizados, vetor de 784 entradas, MLP, softmax, avaliação por acurácia e matriz de confusão.
          </p>
          <button className="button button--primary" onClick={() => setTheoryExpanded((current) => !current)} type="button">
            {theoryExpanded ? 'Ler menos' : 'Ler mais'}
            {theoryExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {theoryExpanded ? (
          <>
        <div className="theory-reader handwriting-theory-reader">
          <article className="theory-section">
            <Target size={28} />
            <div>
              <h3>Classificação supervisionada</h3>
              <p>
                O reconhecimento de caracteres manuscritos é um problema clássico de classificação supervisionada. Nesse
                tipo de tarefa, o modelo é treinado com exemplos já rotulados: cada imagem de entrada possui uma classe
                conhecida, como o dígito 4 ou a letra A. O objetivo do treinamento é ajustar os pesos da rede neural para
                que, diante de uma nova imagem, ela consiga produzir uma previsão compatível com o padrão aprendido nos
                dados de treinamento.
              </p>
              <p>
                No modo de dígitos, as classes possíveis são 0 a 9. No modo de letras, as classes vão de A a Z. Durante a
                predição, o modelo recebe uma nova imagem processada e estima qual classe é mais provável.
              </p>
            </div>
          </article>
          <article className="theory-section">
            <Grid3X3 size={28} />
            <div>
              <h3>Imagem digital como matriz de pixels</h3>
              <p>
                Para uma rede neural, a imagem não é interpretada como um desenho no sentido humano, mas como um conjunto
                de valores numéricos. Uma imagem em tons de cinza pode ser representada por uma matriz, na qual cada
                posição armazena a intensidade de um pixel.
              </p>
              <p>
                No padrão MNIST, cada amostra possui dimensão 28×28, resultando em 784 valores. Ao achatar essa matriz em
                um vetor, cada pixel passa a ocupar uma posição da entrada da MLP. Por isso o laboratório mostra tanto a
                imagem processada quanto o vetor numérico usado pela rede.
              </p>
            </div>
          </article>
          <article className="theory-section">
            <Images size={28} />
            <div>
              <h3>Pré-processamento</h3>
              <p>
                O pré-processamento é uma etapa essencial porque o modelo foi treinado com imagens em um formato
                específico. Se o usuário desenha um caractere muito pequeno, descentralizado, com pouco contraste ou
                próximo da borda, a rede pode receber uma representação diferente daquelas vistas durante o treinamento.
              </p>
              <p>
                Por isso, o laboratório aplica etapas como detecção da região ativa, recorte, centralização,
                redimensionamento para 28×28 e normalização dos pixels. O objetivo é aproximar a entrada desenhada ou
                enviada pelo usuário do formato usado nos dados de treino.
              </p>
            </div>
          </article>
          <article className="theory-section">
            <Layers3 size={28} />
            <div>
              <h3>MLP para reconhecimento manuscrito</h3>
              <p>
                A MLP, ou Perceptron Multicamadas, é uma rede neural do tipo feedforward, na qual a informação percorre
                as camadas em uma única direção: da entrada para a saída. Neste laboratório, o vetor de 784 pixels é
                fornecido à camada de entrada.
              </p>
              <p>
                Em seguida, camadas densas intermediárias combinam esses valores por meio de pesos, bias e funções de
                ativação, buscando identificar padrões úteis para distinguir classes. A camada final possui um neurônio
                para cada classe e utiliza softmax para transformar os valores de saída em uma distribuição de
                probabilidades.
              </p>
            </div>
          </article>
          <article className="theory-section">
            <Sigma size={28} />
            <div>
              <h3>Softmax e entropia cruzada</h3>
              <p>
                Em problemas de classificação multiclasse, a saída da rede normalmente é interpretada por meio da função
                softmax. Essa função transforma os valores finais da rede em probabilidades cuja soma é igual a 1. Assim,
                o modelo não retorna apenas uma classe, mas uma distribuição de confiança entre todas as possibilidades.
              </p>
              <p>
                Durante o treinamento, a entropia cruzada mede a diferença entre a distribuição prevista e a classe
                correta, penalizando fortemente previsões confiantes na classe errada. Essa relação ajuda a entender por
                que a confiança do modelo é tão importante quanto a classe prevista.
              </p>
            </div>
          </article>
          <article className="theory-section">
            <Database size={28} />
            <div>
              <h3>MNIST e EMNIST</h3>
              <p>
                O MNIST é uma das bases mais conhecidas para reconhecimento de dígitos manuscritos. Ele contém milhares de
                imagens 28×28 em tons de cinza, separadas em conjuntos de treino e teste, e é frequentemente utilizado
                como experimento introdutório em visão computacional e aprendizagem de máquina.
              </p>
              <p>
                Para letras, uma referência relacionada é o EMNIST, uma extensão baseada em caracteres manuscritos. A
                divisão EMNIST Letters organiza letras em uma tarefa de 26 classes, o que permite explorar problemas
                semelhantes ao reconhecimento de dígitos, mas com maior ambiguidade visual entre símbolos.
              </p>
            </div>
          </article>
          <article className="theory-section">
            <BookOpen size={28} />
            <div>
              <h3>Matriz de confusão</h3>
              <p>
                A matriz de confusão é uma ferramenta importante para avaliar classificadores. Em uma matriz multiclasse,
                as linhas representam as classes reais e as colunas representam as classes previstas. Os valores na
                diagonal principal indicam acertos, enquanto valores fora da diagonal mostram quais classes foram
                confundidas.
              </p>
              <p>
                Isso é especialmente útil em reconhecimento manuscrito, pois alguns símbolos podem ser visualmente
                parecidos, como 3 e 8, 4 e 9, 0 e O. A matriz ajuda a interpretar o comportamento do modelo além da
                acurácia média.
              </p>
            </div>
          </article>
          <article className="theory-section">
            <Layers3 size={28} />
            <div>
              <h3>Limitações da MLP</h3>
              <p>
                Embora uma MLP consiga obter bons resultados em bases simples como MNIST, ela possui limitações
                importantes. Ao transformar uma imagem em vetor, a estrutura espacial entre pixels vizinhos é parcialmente
                perdida. Isso torna a MLP menos adequada para imagens naturais, que possuem variações complexas de
                textura, iluminação, fundo, escala e posição.
              </p>
              <p>
                Ainda assim, para caracteres manuscritos simples e imagens pequenas, a MLP é uma excelente ferramenta
                didática, pois permite visualizar claramente como os pixels se tornam entrada numérica e como a rede
                transforma essa entrada em probabilidades.
              </p>
            </div>
          </article>
        </div>
        <div className="handwriting-references">
          <h3>Referências</h3>
          <ol>
            <li>
              LeCun, Yann; Cortes, Corinna; Burges, Christopher.{' '}
              <a href="https://yann.lecun.com/exdb/mnist/" target="_blank" rel="noreferrer">
                The MNIST Database of Handwritten Digits
              </a>.
            </li>
            <li>
              National Institute of Standards and Technology.{' '}
              <a href="https://www.nist.gov/itl/products-and-services/emnist-dataset" target="_blank" rel="noreferrer">
                The EMNIST Dataset
              </a>.
            </li>
            <li>
              Goodfellow, Ian; Bengio, Yoshua; Courville, Aaron.{' '}
              <a href="https://www.deeplearningbook.org/contents/mlp.html" target="_blank" rel="noreferrer">
                Deep Learning - Chapter 6: Deep Feedforward Networks
              </a>.
            </li>
            <li>
              Scikit-learn Documentation.{' '}
              <a
                href="https://scikit-learn.org/stable/modules/generated/sklearn.metrics.confusion_matrix.html"
                target="_blank"
                rel="noreferrer"
              >
                Confusion Matrix
              </a>.
            </li>
            <li>
              TensorFlow/Keras Documentation.{' '}
              <a href="https://www.tensorflow.org/api_docs/python/tf/keras/datasets/mnist/load_data" target="_blank" rel="noreferrer">
                tf.keras.datasets.mnist.load_data
              </a>.
            </li>
          </ol>
        </div>
          </>
        ) : null}
      </section>

      <PipelineOverviewSection />

      <section
        className="wide-panel handwriting-lab reveal-up"
        id="input-section"
      >
        <div className="section-heading section-heading--with-actions handwriting-lab__heading">
          <div>
            <p className="eyebrow">Laboratório interativo</p>
            <h2>Escolha o modo, treine e teste um caractere.</h2>
            <p>{modeConfig.description}</p>
          </div>
          <RecognitionModeTabs mode={mode} onChange={handleModeChange} />
        </div>
        <div aria-labelledby={`recognition-tab-${mode}`} id={`recognition-panel-${mode}`} role="tabpanel">
          <div className="status-strip">
            <Camera size={18} />
            {statusMessage}
          </div>
          <div className="handwriting-workspace">
            <div className="handwriting-input-stage">
              <div aria-label="Fonte do caractere" className="handwriting-source-tabs" role="tablist">
                <button
                  aria-controls="handwriting-source-canvas"
                  aria-selected={inputSource === 'canvas'}
                  className={inputSource === 'canvas' ? 'is-active' : ''}
                  id="handwriting-source-tab-canvas"
                  onClick={() => handleInputSourceChange('canvas')}
                  role="tab"
                  type="button"
                >
                  <PenLine size={18} /> Lousa
                </button>
                <button
                  aria-controls="handwriting-source-upload"
                  aria-selected={inputSource === 'upload'}
                  className={inputSource === 'upload' ? 'is-active' : ''}
                  id="handwriting-source-tab-upload"
                  onClick={() => handleInputSourceChange('upload')}
                  role="tab"
                  type="button"
                >
                  <Images size={18} /> Imagem
                </button>
              </div>
              <div className="handwriting-input-panels">
                <div
                  aria-labelledby="handwriting-source-tab-canvas"
                  hidden={inputSource !== 'canvas'}
                  id="handwriting-source-canvas"
                  role="tabpanel"
                >
                  <DrawingCanvas
                    onProcess={(source) => processSource(source, 'canvas')}
                    warnings={processed?.sourceType === 'canvas' ? processed.warnings : []}
                  />
                </div>
                <div
                  aria-labelledby="handwriting-source-tab-upload"
                  hidden={inputSource !== 'upload'}
                  id="handwriting-source-upload"
                  role="tabpanel"
                >
                  <ImageUploadPanel
                    onImageReady={(source) => processSource(source, 'upload')}
                    warnings={processed?.sourceType === 'upload' ? processed.warnings : []}
                  />
                </div>
              </div>
            </div>
            <section className="handwriting-model-workbench" aria-labelledby="model-workbench-title">
              <div className="handwriting-model-workbench__heading">
                <div>
                  <span>Modelo do laboratório</span>
                  <h3 id="model-workbench-title">Entenda a rede e experimente o treinamento</h3>
                </div>
                <p>A arquitetura explica o caminho dos pixels; o treino didático permite observar esse aprendizado.</p>
              </div>
              <div className="handwriting-support-grid">
                <ModelArchitectureCard
                  activeModelType={activeModelType}
                  pretrainedModelStatus={pretrainedModelStatus}
                  modeConfig={modeConfig}
                />
                <TrainingControls
                  disabled={isTraining}
                  isTraining={isTraining}
                  modeConfig={modeConfig}
                  onTrain={handleTrain}
                  pretrainedModelStatus={pretrainedModelStatus}
                />
              </div>
            </section>
          </div>
        </div>
      </section>

      <div ref={pipelineRef}>
        <ProcessingPipelineShowcase
          hasPrediction={Boolean(prediction)}
          onShowPrediction={showPredictionSection}
          playback={pipelinePlayback}
          processed={processed}
        />
      </div>

      <section
        className={`wide-panel reveal-up ${resultsVisible ? 'lab-section-visible' : 'lab-section-muted'}`}
        id="metrics-section"
        ref={metricsRef}
      >
        <div className="section-heading">
          <p className="eyebrow">Resultados numéricos</p>
          <h2>Treinamento, probabilidades e métricas do modo atual.</h2>
        </div>
        <MetricsCards
          activeModelType={activeModelType}
          metrics={metrics}
          pretrainedMetrics={pretrainedMetrics}
          prediction={prediction}
          processed={processed}
        />
        <div className="handwriting-results-grid" id="prediction-section" ref={predictionRef}>
          <PredictionResultCard activeModelType={activeModelType} prediction={prediction} />
        </div>
      </section>

      <section className={resultsVisible ? 'lab-section-visible' : 'lab-section-muted'} id="charts-section">
        <TrainingCharts history={trainingHistory} />
      </section>

      <section className={resultsVisible ? 'lab-section-visible' : 'lab-section-muted'} id="confusion-section">
        <ConfusionMatrixHeatmap labels={modeConfig.classes} matrix={confusionMatrix} source={confusionSource} />
      </section>
      <MisclassificationInsights mode={mode} prediction={prediction} warnings={processed?.warnings ?? []} />
        </div>
      ) : null}
    </div>
  );
}
