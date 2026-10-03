import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import SonarMathPanel from './SonarMathPanel.jsx';

export default function MissionContextPanel({ context }) {
  return <div className="sonarlab-stack"><article className="sonarlab-panel"><h2><ShieldCheck /> O mesmo eco, a mesma decisão</h2>
    <p>Encontro {context.index + 1} · <strong>{context.sample.id}</strong> · Modelo oficial congelado <strong>{context.model.architecture.join(' → ')}</strong>. Este é o trace da previsão realizada na missão, sem novo treinamento ou troca de pesos.</p>
    <p>{context.revealed ? 'O resultado já foi revelado: a perda e o gradiente deste exemplo estão disponíveis.' : 'O resultado continua oculto. A perda só ficará disponível depois de revelar o resultado na missão.'}</p>
    <Link to="/sonar/missao" className="sonarlab-button is-yellow"><ArrowLeft /> Voltar à missão</Link></article>
    <SonarMathPanel key={`${context.sample.id}-${context.revealed}`} result={context.prediction} sample={context.sample} allowReveal={false} labelRevealed={context.revealed} inspection={{ status: 'ready' }} />
  </div>;
}
