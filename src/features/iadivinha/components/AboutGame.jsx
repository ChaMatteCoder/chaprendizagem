import { Brain, PencilLine, Sparkles } from 'lucide-react';
import ClassDoodle from './ClassDoodle.jsx';
import { CLASS_CATALOG } from '../data/classCatalog.js';

export default function AboutGame() {
  return <div className="iad-about">
    <p>Dez segundos, uma folha em branco e um desafio: será que a IA reconhece o que você desenhou? Não precisa desenhar bonito. Aqui, todo rabisco entra na brincadeira!</p>
    <ol className="iad-about-steps" aria-label="Do rabisco ao palpite">
      <li><PencilLine aria-hidden="true" /><strong>Você desenha</strong><span>Solte o traço na folha.</span></li>
      <li><Brain aria-hidden="true" /><strong>A IA observa</strong><span>Ela procura formas que conhece.</span></li>
      <li><Sparkles aria-hidden="true" /><strong>O palpite aparece</strong><span>Será que vocês pensaram igual?</span></li>
    </ol>
    <h3>Uma turma cheia de surpresas</h3>
    <p>Gato, Pato e Sapato são os companheiros de cada partida. Em uma das seis rodadas, alguém da Turma do “ÃO” chega para surpreender você!</p>
    <ul className="iad-about-cast" aria-label="Personagens do jogo">
      {CLASS_CATALOG.map(item => <li key={item.id} style={{ '--iad-card-color': item.color }}><ClassDoodle kind={item.id} /><span>{item.label}</span></li>)}
    </ul>
    <h3>Como ela aprendeu a adivinhar?</h3>
    <p>A IA treinou com milhares de rabiscos do Quick, Draw! e aprendeu a reconhecer essas oito figuras. Ela vê apenas o seu desenho, sem receber a resposta do desafio. Às vezes acerta de primeira; às vezes se confunde. Essa é parte da graça!</p>
    <p className="iad-about-footnote">Criado no Chaprendizagem para brincar e explorar o reconhecimento de imagens. A IA roda no seu dispositivo, e seus desenhos ficam com você.</p>
  </div>;
}
