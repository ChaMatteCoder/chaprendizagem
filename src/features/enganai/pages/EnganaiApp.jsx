import { Navigate, Route, Routes } from "react-router-dom";
import GanShell from "../components/GanShell.jsx";
import GanHomePage from "./GanHomePage.jsx";
import GanArenaPage from "./GanArenaPage.jsx";
import GanWarmupPage from "./GanWarmupPage.jsx";
import GanMissionsPage from "./GanMissionsPage.jsx";
import GanLabPage from "./GanLabPage.jsx";
import GanMuseumPage from "./GanMuseumPage.jsx";
import GanMutationsPage from "./GanMutationsPage.jsx";
import GanChaosPage from "./GanChaosPage.jsx";
import "../styles/enganai.css";

export default function EnganaiApp() {
  return (
    <Routes>
      <Route element={<GanShell />}>
        <Route index element={<GanHomePage />} />
        <Route path="missoes" element={<GanMissionsPage />} />
        <Route path="arena" element={<GanArenaPage />} />
        <Route path="aquecimento" element={<GanWarmupPage />} />
        <Route path="lab" element={<GanLabPage />} />
        <Route path="museu" element={<GanMuseumPage />} />
        <Route path="mutacoes" element={<GanMutationsPage />} />
        <Route path="caos" element={<GanChaosPage />} />
        <Route path="*" element={<Navigate to="/enganai" replace />} />
      </Route>
    </Routes>
  );
}
