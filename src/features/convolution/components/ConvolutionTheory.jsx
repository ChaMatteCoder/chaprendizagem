import { BookOpen, Grid3X3, Layers, ScanLine } from 'lucide-react';

const cards = [
  { icon: Grid3X3, title: '1. Escolha uma vizinhança', text: 'Uma janela 3 × 3 ou 5 × 5 reúne os pixels próximos. O kernel define o peso de cada um na resposta.' },
  { icon: ScanLine, title: '2. Multiplique e some', text: 'Na convolução, o kernel gira 180°. Multiplicamos cada peso pelo pixel correspondente e somamos os produtos.' },
  { icon: Layers, title: '3. Repita nos canais', text: 'Na imagem colorida, R, G e B recebem o mesmo filtro separadamente. Em cinza, filtramos uma única intensidade.' },
];

export default function ConvolutionTheory() {
  return (
    <section className="conv-section" aria-labelledby="conv-theory-title">
      <div className="section-heading"><p className="eyebrow">Da teoria ao pixel</p><h2 id="conv-theory-title">Uma regra local que muda o todo.</h2><p>Os pesos decidem o efeito: médias suavizam, diferenças revelam bordas e o centro reforçado aumenta a nitidez.</p></div>
      <div className="conv-theory-grid">{cards.map(({ icon: Icon, title, text }) => <article key={title}><Icon aria-hidden="true" size={24} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      <details className="conv-math">
        <summary><BookOpen size={18} /> Fórmula, bordas e leitura da resposta</summary>
        <div>
          <p className="conv-equation">S(x, y, c) = Σᵢ Σⱼ K(i, j) · I(x + r − j, y + r − i, c)</p>
          <p><strong>I</strong> é a imagem de entrada, <strong>K</strong> o kernel, <strong>r</strong> seu raio (1 ou 2) e <strong>c</strong> o canal. As coordenadas começam em zero. O sinal de menos nos índices corresponde ao giro de 180° do kernel; sem esse giro, a operação seria correlação cruzada. Kernels simétricos dão o mesmo resultado nas duas operações.</p>
          <p>Depois calculamos <strong>S ÷ divisor</strong>, aplicamos o módulo se selecionado e somamos o deslocamento. Para exibir em 8 bits, limitamos a 0–255 e arredondamos. A inspeção mostra a resposta numérica antes dessa limitação.</p>
          <p>Em <strong>refletir</strong>, a borda é espelhada incluindo o pixel extremo. Em <strong>repetir</strong>, usamos o pixel extremo; em <strong>zeros</strong>, os vizinhos externos valem zero. A saída mantém as dimensões da entrada, com passo de um pixel.</p>
          <p>O cinza usa <strong>0,2126 R + 0,7152 G + 0,0722 B</strong>, arredondado em 8 bits, sobre os valores sRGB, sem linearização. O processamento usa a imagem original a cada execução; os filtros não se acumulam.</p>
          <p>Referências: <a href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.ndimage.convolve.html" target="_blank" rel="noreferrer">SciPy · definição e bordas</a> e <a href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.convolve2d.html" target="_blank" rel="noreferrer">convolução bidimensional</a>.</p>
        </div>
      </details>
    </section>
  );
}
