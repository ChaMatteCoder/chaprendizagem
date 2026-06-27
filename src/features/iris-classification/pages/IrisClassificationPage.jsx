import { BrainCircuit, Flower2, Layers3, Table2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import IrisConfusionMatrix from '../components/IrisConfusionMatrix.jsx';
import IrisDatasetOverview from '../components/IrisDatasetOverview.jsx';
import IrisDecisionCharts from '../components/IrisDecisionCharts.jsx';
import IrisFeatureControls from '../components/IrisFeatureControls.jsx';
import IrisHeroSection from '../components/IrisHeroSection.jsx';
import IrisMetricsCards from '../components/IrisMetricsCards.jsx';
import IrisPredictionPanel from '../components/IrisPredictionPanel.jsx';
import IrisSampleTable from '../components/IrisSampleTable.jsx';
import IrisTheorySection from '../components/IrisTheorySection.jsx';
import IrisTrainingControls from '../components/IrisTrainingControls.jsx';
import { defaultIrisSample, irisClasses, irisDataset } from '../data/irisDataset.js';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import { calculateFeatureStats, normalizeIrisSample } from '../lib/normalizeIrisData.js';
import { predictIrisClass } from '../lib/predictIrisClass.js';
import { countByClass, trainIrisModel } from '../lib/trainIrisModel.js';

const objectiveCards = [
  {
    icon: Table2,
    title: 'Dados tabulares',
    text: 'Cada flor é representada por quatro medidas numéricas: comprimento e largura de sépalas e pétalas.',
  },
  {
    icon: Flower2,
    title: 'Três espécies',
    text: 'A rede aprende padrões para Iris-setosa, Iris-versicolor e Iris-virginica.',
  },
  {
    icon: BrainCircuit,
    title: 'MLP multiclasse',
    text: 'Camadas densas transformam quatro entradas em probabilidades para três classes.',
  },
  {
    icon: Layers3,
    title: 'Análise do treino',
    text: 'Loss, accuracy, métricas por classe e matriz de confusão explicam o desempenho.',
  },
];

const initialConfig = {
  epochs: 90,
  hiddenUnits1: 8,
  hiddenUnits2: 6,
  learningRate: 0.03,
  testRatio: 0.2,
};

export default function IrisClassificationPage() {
  const [config, setConfig] = useState(initialConfig);
  const [sample, setSample] = useState(defaultIrisSample);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [isPredictionUpdating, setIsPredictionUpdating] = useState(false);
  const [isLabOpen, setIsLabOpen] = useState(false);
  const [status, setStatus] = useState({ kind: 'idle', message: 'Modelo ainda não treinado.' });
  const modelRef = useRef(null);
  const debouncedSample = useDebouncedValue(sample, 180);

  const fallbackStats = useMemo(() => calculateFeatureStats(irisDataset), []);
  const splitDistribution = useMemo(() => {
    if (!result?.split) return null;
    return {
      train: countByClass(result.split.train),
      test: countByClass(result.split.test),
    };
  }, [result]);

  useEffect(() => {
    return () => {
      modelRef.current?.dispose();
      modelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) {
      setPrediction(null);
      setIsPredictionUpdating(false);
      return;
    }

    const stats = result?.stats ?? fallbackStats;
    const normalizedInput = normalizeIrisSample(debouncedSample, stats);
    setPrediction(predictIrisClass(model, normalizedInput, irisClasses));
    setIsPredictionUpdating(false);
  }, [debouncedSample, fallbackStats, result]);

  const updateConfig = useCallback((key, value) => {
    setConfig((current) => ({ ...current, [key]: value }));
  }, []);

  const updateSample = useCallback((key, value) => {
    const nextValue = Number.isFinite(value) ? Number(value.toFixed(1)) : defaultIrisSample[key];
    if (modelRef.current) {
      setIsPredictionUpdating(true);
    }
    setSample((current) => ({ ...current, [key]: nextValue }));
  }, []);

  const openLab = useCallback(() => {
    setIsLabOpen(true);
    window.setTimeout(() => {
      document.getElementById('iris-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

  const handleTrain = useCallback(async () => {
    setIsLabOpen(true);
    setIsTraining(true);
    setHistory([]);
    setIsPredictionUpdating(false);
    setStatus({ kind: 'loading', message: 'Treinando MLP com a base Iris...' });

    try {
      const trained = await trainIrisModel(irisDataset, {
        ...config,
        onEpochEnd: (_, items) => setHistory(items),
      });

      modelRef.current?.dispose();
      modelRef.current = trained.model;
      setResult(trained);
      setHistory(trained.history);
      setStatus({
        kind: 'success',
        message: 'Modelo treinado com sucesso. Ajuste os atributos para testar uma nova amostra.',
      });
    } catch (error) {
      console.error(error);
      setStatus({
        kind: 'error',
        message: 'Não foi possível treinar o modelo. Verifique os parâmetros e tente novamente.',
      });
    } finally {
      setIsTraining(false);
    }
  }, [config]);

  return (
    <div className="page iris-page">
      <IrisHeroSection isOpen={isLabOpen} onOpenLab={openLab} />

      {isLabOpen ? (
        <div className="iris-lab-content" id="iris-content">
          <section className="wide-panel reveal-up">
            <div className="section-heading">
              <p className="eyebrow">Objetivo do laboratório</p>
              <h2>Classificar flores Iris com uma MLP treinada no navegador.</h2>
              <p>
                O objetivo deste laboratório é demonstrar como uma MLP pode resolver um problema de classificação
                multiclasse usando dados tabulares. A partir de quatro medidas da flor — comprimento e largura da sépala,
                comprimento e largura da pétala — a rede aprende a estimar a espécie mais provável entre Iris-setosa,
                Iris-versicolor e Iris-virginica.
              </p>
              <p>
                No Trabalho 07, a MLP foi usada para aproximação funcional. No Trabalho 08, para reconhecimento
                manuscrito. Agora, no Trabalho 09, a mesma ideia de camadas densas é aplicada a um conjunto tabular
                clássico de classificação.
              </p>
            </div>
            <div className="theory-highlight-grid functional-objective-grid">
              {objectiveCards.map((item) => {
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

          <section className="wide-panel iris-flow-section reveal-up">
            <div className="section-heading">
              <p className="eyebrow">Fluxo do laboratório</p>
              <h2>Da base clássica à predição de uma nova flor.</h2>
            </div>
            <div className="iris-flow-grid">
              {[
                'Conheça a base',
                'Visualize as classes',
                'Treine a MLP',
                'Acompanhe loss e accuracy',
                'Teste uma nova flor',
                'Analise a matriz',
              ].map((item, index) => (
                <article key={item}>
                  <span>{index + 1}</span>
                  <strong>{item}</strong>
                </article>
              ))}
            </div>
          </section>

          <IrisDatasetOverview />

          <section className="iris-lab-grid reveal-up" id="iris-lab">
            <IrisTrainingControls
              config={config}
              disabled={irisDataset.length === 0}
              hasResult={Boolean(result)}
              isTraining={isTraining}
              onChange={updateConfig}
              onTrain={handleTrain}
              status={status}
            />
            <IrisFeatureControls disabled={isTraining} onChange={updateSample} sample={sample} />
            <IrisPredictionPanel
              isTraining={isTraining}
              isUpdating={isPredictionUpdating}
              prediction={prediction}
              status={status}
            />
          </section>

          {splitDistribution ? (
            <section className="wide-panel iris-split-section reveal-up">
              <div className="section-heading">
                <p className="eyebrow">Divisão treino/teste</p>
                <h2>Amostras usadas na validação.</h2>
                <p>O embaralhamento é determinístico e preserva as três classes nos conjuntos de treino e teste.</p>
              </div>
              <div className="iris-split-grid">
                <article>
                  <h3>Treino</h3>
                  {splitDistribution.train.map((item) => <span key={item.label}>{item.label}: {item.count}</span>)}
                </article>
                <article>
                  <h3>Teste</h3>
                  {splitDistribution.test.map((item) => <span key={item.label}>{item.label}: {item.count}</span>)}
                </article>
              </div>
            </section>
          ) : null}

          <IrisMetricsCards result={result} />
          <IrisDecisionCharts dataset={irisDataset} history={history} />
          <IrisConfusionMatrix matrix={result?.confusionMatrix} />
          <IrisSampleTable dataset={irisDataset} />
          <IrisTheorySection />
        </div>
      ) : null}
    </div>
  );
}
