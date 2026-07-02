import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from '../components/Layout.jsx';
import AdalinePage from '../features/adaline/pages/AdalinePage.jsx';
import AdalineRegressionPage from '../features/adaline/pages/AdalineRegressionPage.jsx';
import FunctionalApproximationPage from '../features/functional-approximation/pages/FunctionalApproximationPage.jsx';
import HomePage from '../pages/HomePage.jsx';
import AboutPage from '../pages/AboutPage.jsx';
import ContactPage from '../pages/ContactPage.jsx';
import ModelPage from '../features/perceptron/pages/ModelPage.jsx';
import ResultsPage from '../features/perceptron/pages/ResultsPage.jsx';
import TheoryPage from '../features/perceptron/pages/TheoryPage.jsx';
import useRevealAnimations from '../hooks/useRevealAnimations.js';

const IrisClassificationPage = lazy(() => import('../features/iris-classification/pages/IrisClassificationPage.jsx'));
const MlpHubPage = lazy(() => import('../features/mlp/pages/MlpHubPage.jsx'));
const HandwritingRecognitionPage = lazy(() =>
  import('../features/handwriting-recognition/pages/HandwritingRecognitionPage.jsx'),
);

export default function App() {
  useRevealAnimations();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/adaline" element={<AdalinePage />} />
        <Route path="/adaline/regressao" element={<AdalineRegressionPage />} />
        <Route path="/aproximacao-funcional" element={<FunctionalApproximationPage />} />
        <Route
          path="/mlp"
          element={
            <Suspense fallback={<div className="page wide-panel">Carregando módulo MLP...</div>}>
              <MlpHubPage />
            </Suspense>
          }
        />
        <Route path="/mlp/aproximacao-funcional" element={<FunctionalApproximationPage />} />
        <Route
          path="/mlp/reconhecimento-manuscrito"
          element={
            <Suspense fallback={<div className="page wide-panel">Carregando reconhecimento manuscrito...</div>}>
              <HandwritingRecognitionPage />
            </Suspense>
          }
        />
        <Route
          path="/mlp/classificacao-iris"
          element={
            <Suspense fallback={<div className="page wide-panel">Carregando classificação Iris...</div>}>
              <IrisClassificationPage />
            </Suspense>
          }
        />
        <Route path="/perceptron/teoria" element={<TheoryPage />} />
        <Route path="/perceptron/modelo" element={<ModelPage />} />
        <Route path="/perceptron/resultados" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
