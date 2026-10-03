import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Bot, Database, FlaskConical, Play } from 'lucide-react';
import SonarGameChrome from '../components/SonarGameChrome.jsx';
import { SonarSubmarine, SonarChoiceArt } from '../components/SonarArtwork.jsx';
import useSonarMission from '../hooks/useSonarMission.js';

export default function SonarMenuPage() {
  const { leave } = useSonarMission();
  useEffect(() => { leave(); }, [leave]);
  return <SonarGameChrome><main id="sonar-content" tabIndex={-1} className="sonar-menu">
    <section className="sonar-menu-hero" aria-labelledby="sonar-title"><div className="sonar-menu-copy">
      <p className="sonar-eyebrow">Uma missão de aprendizagem profunda</p>
      <h1 id="sonar-title"><span>Sonar</span><br />ou Azar?</h1>
      <p className="sonar-lead">Um eco. Duas possibilidades.<br />Qual é o seu palpite?</p>
      <div className="sonar-actions"><Link to="/sonar/missao" className="sonar-button is-yellow"><Play fill="currentColor" /> Iniciar missão</Link>
        <Link to="/sonar/lab" className="sonar-button is-aqua"><FlaskConical /> Abrir SonarLab</Link></div>
    </div><div className="sonar-menu-art" aria-hidden="true"><SonarSubmarine /><div className="sonar-waves"><i /><i /><i /></div><div className="sonar-contact">?</div></div></section>
    <section className="sonar-how" aria-label="Como jogar"><div className="sonar-steps">
      <article><span className="sonar-step-number">1</span><div><h2>Observe o sinal</h2><div className="sonar-step-content"><Activity /><p>Analise os 60 atributos<br />do eco real do encontro.</p></div></div><ArrowRight className="sonar-step-arrow" /></article>
      <article><span className="sonar-step-number">2</span><div><h2>Faça seu palpite</h2><div className="sonar-step-content"><span className="sonar-icon-pair"><SonarChoiceArt label="R" /><SonarChoiceArt label="M" /></span><p>É rocha<br />ou metal?</p></div></div><ArrowRight className="sonar-step-arrow" /></article>
      <article><span className="sonar-step-number">3</span><div><h2>Compare com a IA</h2><div className="sonar-step-content"><Bot /><p>Veja a previsão da rede<br />e revele o resultado.</p></div></div></article>
    </div><p className="sonar-how-footer">5 encontros por missão <span>·</span> Rocha ou metal <span>·</span> Um ponto por acerto</p></section>
    <div className="sonar-data-pill"><Database size={20} /> Base UCI Sonar <span>·</span> 208 exemplos <span>·</span> 60 atributos <span>·</span> 2 classes</div>
    <details id="sonar-about" className="sonar-about"><summary>Sobre esta demonstração</summary><p>As missões sorteiam cinco amostras distintas dos 42 exemplos de teste já avaliados. A MLP oficial está congelada; nenhuma escolha filtra os erros da rede. Pode haver repetição entre missões.</p>
      <p>O placar de cinco encontros não mede a acurácia científica. Consulte os resultados oficiais no SonarLab. Probabilidades Softmax não garantem acerto.</p>
      <p>O cenário é ambientação. O ping opcional é um efeito sonoro, não uma reconstrução dos 60 atributos. Esta demonstração local permite inspecionar dados e código; não é um jogo competitivo seguro.</p>
      <Link to="/sonar/lab" className="sonar-inline-link">Conhecer os dados, a fonte UCI e o protocolo <ArrowRight size={17} /></Link><Link to="/" className="sonar-inline-link">Voltar aos projetos <ArrowRight size={17} /></Link></details>
    <p className="sonar-demonstration">Demonstração com exemplos de teste já avaliados · Modelo oficial congelado</p>
  </main></SonarGameChrome>;
}
