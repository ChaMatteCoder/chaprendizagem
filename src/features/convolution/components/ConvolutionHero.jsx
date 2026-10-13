import { ArrowRight, Grid3X3, Image, ScanLine } from 'lucide-react';

const pixels = [22, 36, 51, 69, 85, 28, 57, 107, 164, 180, 34, 78, 150, 205, 220, 43, 86, 183, 238, 230, 52, 112, 208, 244, 219];

export default function ConvolutionHero({ onOpenLab }) {
  return (
    <section className="conv-hero">
      <div className="conv-hero__copy">
        <p className="eyebrow">Aprendizagem Profunda de Modelos Generativos</p>
        <h1>Convolução 2D.<br /><em>Filtros e mapas de características.</em></h1>
        <p>Entenda a operação que extrai padrões locais em redes convolucionais. Aplique kernels em RGB e escala de cinza, compare os resultados e verifique o cálculo de cada pixel.</p>
        <div className="conv-chips" aria-label="Tópicos do módulo">
          <span><Grid3X3 size={15} /> Kernels editáveis</span>
          <span><Image size={15} /> RGB + cinza</span>
          <span><ScanLine size={15} /> Contas por pixel</span>
        </div>
        <button className="button button--primary" onClick={onOpenLab} type="button" aria-controls="convolution-content">
          Ir para o laboratório <ArrowRight size={18} />
        </button>
      </div>
      <div className="conv-hero__visual" role="img" aria-label="Uma janela percorre os pixels de uma imagem; o kernel pondera a vizinhança e produz um novo pixel.">
        <div className="conv-hero__topline"><span>CONVOLUÇÃO 2D</span><span>01 / VIZINHANÇA</span></div>
        <div className="conv-hero__diagram" aria-hidden="true">
          <div className="conv-hero__image">
            <img src="/images/convolution/atelier.svg" alt="" />
            <div className="conv-hero__window"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
          <span className="conv-hero__operator">∗</span>
          <div className="conv-hero__kernel">{[0, -1, 0, -1, 5, -1, 0, -1, 0].map((value, index) => <span key={index}>{value}</span>)}</div>
          <span className="conv-hero__operator">→</span>
          <div className="conv-hero__pixels">{pixels.map((value, index) => <i key={index} style={{ background: `rgb(${value}, ${value}, ${value})` }} />)}</div>
        </div>
        <div className="conv-hero__labels" aria-hidden="true"><span>Imagem original</span><span>Kernel de nitidez</span><span>Nova resposta</span></div>
        <div className="conv-hero__readout"><small>O que acontece em cada posição</small><strong>multiplicar → somar → transformar</strong><span>Diagrama conceitual · a resposta numérica é calculada no laboratório.</span></div>
      </div>
    </section>
  );
}
