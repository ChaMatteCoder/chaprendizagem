import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Eye,
  FlaskConical,
  Gamepad2,
  ScanLine,
  SlidersHorizontal,
} from 'lucide-react';
import { CIFAR10_CLASSES } from '../data/cifar10Schema.js';
import PixelChrome from '../components/PixelChrome.jsx';

const steps = [
  {
    icon: Eye,
    title: 'Observe a imagem',
    text: 'Uma foto chega com interferência. Veja o que a rede acha que está nela.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Ajuste e teste',
    text: 'Mude a iluminação e a nitidez. Você pode consultar a rede até três vezes.',
  },
  {
    icon: ScanLine,
    title: 'Revele e compare',
    text: 'Descubra a resposta. A previsão final certa vale 100 pontos.',
  },
];

export default function PixelMenuPage() {
  return (
    <PixelChrome>
      <main id="pixel-main-content" tabIndex={-1} className="pixel-main">
        <section className="pixel-hero" aria-labelledby="pixel-hero-title">
          <div className="pixel-hero__copy">
            <p className="pixel-eyebrow">
              Aprenda experimentando · Redes convolucionais
            </p>
            <h1 id="pixel-hero-title">
              Pixel em Pânico!
              <br />
              <em>
                Pequenos pixels.
                <br />
                Grandes palpites.
              </em>
            </h1>
            <p className="pixel-lead">
              Será que uma imagem mais clara ajuda a IA a acertar? Ajuste fotos,
              desafie uma rede neural de verdade e descubra como ela chega a uma
              previsão.
            </p>
            <div className="pixel-hero__actions">
              <Link to="/pixel/jogo" className="pixel-btn is-primary">
                <Gamepad2 size={18} /> Vamos jogar <ArrowRight size={17} />
              </Link>
              <Link to="/pixel/lab" className="pixel-btn is-outline">
                <FlaskConical size={18} /> Explorar a CNN
              </Link>
            </div>
            <p className="pixel-hero__footnote">
              5 imagens por partida <span>·</span> 3 testes por imagem{' '}
              <span>·</span> Até 500 pontos
            </p>
          </div>
          <div className="pixel-hero-art">
            <div className="pixel-art-top">
              <span>
                <span className="pixel-live-dot" /> VISÃO COMPUTACIONAL
              </span>
              <Cpu size={18} />
            </div>
            <div className="pixel-art-heading">
              O que você vê?
              <br />
              <span>E o que a rede vê?</span>
            </div>
            <div className="pixel-art-mosaic">
              {[0, 5, 8, 6, 1, 3].map((index) => (
                <div key={index}>
                  <img
                    src={`/images/pixel/sample-${index}.png`}
                    alt={`Exemplo real de ${CIFAR10_CLASSES[index].pt.toLowerCase()} do CIFAR-10`}
                  />
                  <span>{CIFAR10_CLASSES[index].pt}</span>
                </div>
              ))}
            </div>
            <div className="pixel-art-bottom">
              <strong>32 × 32</strong>
              <span>
                pixels por foto.
                <br />
                10 possibilidades para a rede.
              </span>
              <span className="pixel-art-arrow" aria-hidden="true">
                ↗
              </span>
            </div>
            <p>Imagens reais do pacote de demonstração CIFAR-10.</p>
          </div>
        </section>
        <section
          className="pixel-how"
          aria-labelledby="pixel-how-title"
          id="como-funciona"
        >
          <div className="pixel-section-heading">
            <div>
              <p className="pixel-eyebrow">Sua missão em três passos</p>
              <h2 id="pixel-how-title">Ajude a rede a enxergar melhor.</h2>
            </div>
            <p>
              Você ajusta a imagem.
              <br />A CNN faz a classificação.
            </p>
          </div>
          <div className="pixel-steps-grid">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <article className="pixel-step-card" key={title}>
                <div>
                  <span className="pixel-step-num">0{index + 1}</span>
                  <Icon size={23} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <p className="pixel-caption">
            Nem todo ajuste ajuda, e nem toda imagem tem solução com essas
            ferramentas. O resultado faz parte do experimento.
          </p>
        </section>
        <section className="pixel-lab-invite">
          <div className="pixel-invite-icon">
            <FlaskConical size={30} />
          </div>
          <div>
            <p className="pixel-eyebrow">Do jogo à explicação</p>
            <h2>Por que a previsão mudou?</h2>
            <p>
              No PixelLab, siga a imagem pelas camadas, confira uma convolução e
              conheça os resultados reais do treinamento.
            </p>
          </div>
          <Link to="/pixel/lab" className="pixel-btn is-outline">
            Abrir PixelLab <ArrowRight size={17} />
          </Link>
        </section>
        <details className="pixel-details pixel-menu-guide">
          <summary>
            <BookOpen size={17} /> Vou apresentar este módulo. Por onde começo?
          </summary>
          <div>
            <p>
              <strong>1. Demonstre:</strong> jogue uma rodada, altere o brilho,
              teste e revele a resposta. Compare o palpite inicial com o final.
            </p>
            <p>
              <strong>2. Explique:</strong> abra a imagem da rodada no PixelLab.
              Siga os cinco passos: entrada, camadas, cálculo, avaliação e
              sensibilidade.
            </p>
            <p>
              <strong>3. Conclua:</strong> uma mudança no palpite mostra
              sensibilidade aos pixels. A acurácia do modelo vem do teste
              oficial, e o placar representa apenas a partida.
            </p>
            <Link to="/pixel/lab?apresentacao=1" className="pixel-inline-link">
              Abrir roteiro guiado <ArrowRight size={16} />
            </Link>
          </div>
        </details>
      </main>
    </PixelChrome>
  );
}
