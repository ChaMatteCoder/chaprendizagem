import { Link } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Volume2, VolumeX } from 'lucide-react';
import { SonarSubmarine } from './SonarArtwork.jsx';
import useSonarMission from '../hooks/useSonarMission.js';

export function SonarSoundButton() {
  const { sound } = useSonarMission();
  const label = sound.enabled ? 'Silenciar som' : sound.muted ? 'Ativar som' : 'Reproduzir música';
  return <div className="sonar-sound"><button type="button" data-sonar-sound-toggle aria-pressed={sound.enabled} aria-label={label} title={`${label}${sound.title ? ` · ${sound.title}` : ''}`} onClick={sound.toggle}>
    {sound.enabled ? <Volume2 /> : <VolumeX />}</button>{(sound.error || sound.blocked) && <span role="status">{sound.error || 'Toque para ouvir a música.'}</span>}</div>;
}

export default function SonarGameChrome({ mission = false, children }) {
  const game = useSonarMission();
  return <div className="sonar-game">
    <a href="#sonar-content" className="sonarlab-skip">Pular para o conteúdo</a>
    <header className="sonar-header"><Link to="/sonar" className="sonar-brand" onClick={game.leave}><SonarSubmarine /><span><b>Ch</b>Aprendizagem</span></Link>
      <nav aria-label="Navegação Sonar"><Link to={mission ? '/sonar' : '/sonar/missao'} onClick={mission ? game.leave : undefined} className="is-active">{mission ? <><ArrowLeft size={18} /> Menu</> : 'Missão'}</Link>
        <Link to="/sonar/lab" onClick={() => game.openContext()}><FlaskConical size={19} /> SonarLab</Link>
        {!mission && <a href="#sonar-about">Sobre</a>}</nav><SonarSoundButton />
    </header>
    {children}
  </div>;
}
