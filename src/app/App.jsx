import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import AdalinePage from '../features/adaline/pages/AdalinePage.jsx';
import HomePage from '../pages/HomePage.jsx';
import AboutPage from '../pages/AboutPage.jsx';
import ContactPage from '../pages/ContactPage.jsx';
import ModelPage from '../features/perceptron/pages/ModelPage.jsx';
import ResultsPage from '../features/perceptron/pages/ResultsPage.jsx';
import TheoryPage from '../features/perceptron/pages/TheoryPage.jsx';
import useRevealAnimations from '../hooks/useRevealAnimations.js';

export default function App() {
  useRevealAnimations();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/adaline" element={<AdalinePage />} />
        <Route path="/perceptron/teoria" element={<TheoryPage />} />
        <Route path="/perceptron/modelo" element={<ModelPage />} />
        <Route path="/perceptron/resultados" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
