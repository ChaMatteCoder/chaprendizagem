import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import ModelPage from './pages/ModelPage.jsx';
import ResultsPage from './pages/ResultsPage.jsx';
import TheoryPage from './pages/TheoryPage.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/perceptron/teoria" element={<TheoryPage />} />
        <Route path="/perceptron/modelo" element={<ModelPage />} />
        <Route path="/perceptron/resultados" element={<ResultsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
