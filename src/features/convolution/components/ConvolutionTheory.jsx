import { memo } from 'react';
import { Grid3X3, Layers, ScanLine } from 'lucide-react';
import { kernelPresets } from '../data/kernels.js';

const cards = [
  { icon: Grid3X3, title: '1. Definir a entrada', text: 'Escolha uma imagem e um kernel 3 × 3 ou 5 × 5. O tamanho da janela determina a vizinhança usada em cada resposta.' },
  { icon: ScanLine, title: '2. Calcular a resposta', text: 'Gire o kernel em 180°, multiplique os pesos pelos pixels e some os produtos. Divida, aplique o módulo opcional e adicione o deslocamento.' },
  { icon: Layers, title: '3. Construir a saída', text: 'Desloque a janela um pixel por vez. Repita em R, G e B separadamente e na entrada em cinza; limite e arredonde as respostas para exibição.' },
];

function Formula({ children, label }) {
  return <div className="conv-equation" role="math" aria-label={label}>{children}</div>;
}

function ConvolutionTheory() {
  return <>
    <nav className="conv-section-nav" aria-label="Seções de convolução">
      <a href="#conv-theory-title">Fundamentos</a><a href="#conv-filters-title">Filtros</a><a href="#conv-networks-title">Redes e geração</a><a href="#conv-laboratory">Laboratório</a>
    </nav>
    <section className="conv-section" aria-labelledby="conv-theory-title">
      <div className="section-heading"><p className="eyebrow">Fundamentos e processo</p><h2 id="conv-theory-title">Convolução espacial em imagens</h2><p>A convolução combina uma vizinhança de pixels com uma matriz de pesos, chamada kernel. Aplicar os mesmos pesos em todas as posições permite detectar padrões locais em diferentes regiões da imagem.</p></div>
      <div className="conv-theory-grid">{cards.map(({ icon: Icon, title, text }) => <article key={title}><Icon aria-hidden="true" size={24} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      <article className="conv-theory-panel">
        <h3>Definição da operação</h3>
        <Formula label="Soma sobre i e j de zero a k menos um dos pesos K vezes a entrada na posição deslocada">S(x, y, c) = ∑ᵢ₌₀ᵏ⁻¹ ∑ⱼ₌₀ᵏ⁻¹ K(i, j) · I(x + r − j, y + r − i, c)</Formula>
        <p><strong>I</strong> é a entrada; <strong>K</strong>, o kernel de lado <strong>k</strong>; <strong>r = (k − 1)/2</strong>, o raio; <strong>x</strong>, a coluna; <strong>y</strong>, a linha; e <strong>c</strong>, o canal. Os índices começam em zero. O sinal negativo nos deslocamentos equivale a girar o kernel em 180°.</p>
        <h3>Conversão da resposta em pixel</h3>
        <Formula label="Resposta ajustada igual à soma dividida pelo divisor, com módulo opcional e deslocamento; saída arredondada e limitada entre zero e 255">A = S/d + b ou A = |S/d| + b (módulo ativo)<br />O = round(min(255, max(0, A)))</Formula>
        <p><strong>d ≠ 0</strong> é o divisor e <strong>b</strong>, o deslocamento. No filtro de média, d = 9 normaliza a soma dos nove pesos. Valores negativos ou acima de 255 são limitados para formar o PNG; a inspeção preserva a resposta anterior à limitação. O módulo realça a magnitude de respostas direcionais, mas remove seu sinal.</p>
        <div className="conv-worked-example"><p className="eyebrow">Exemplo numérico · filtro de média</p><h3>Da vizinhança ao novo pixel</h3><Formula label="Exemplo de média de nove pixels">I = [10, 20, 30; 40, 50, 60; 70, 80, 90]<br />K = [1, 1, 1; 1, 1, 1; 1, 1, 1], d = 9, b = 0<br />S = 450 → A = 450/9 = 50 → O = 50</Formula><p>Este exemplo usa uma região interna em um único canal. O kernel é simétrico, portanto seu giro não altera os pesos. No laboratório, a inspeção mostra essa mesma sequência com os valores da imagem selecionada.</p></div>
        <h3>Canais, bordas e dimensões</h3>
        <Formula label="Conversão aproximada de RGB para cinza">Icinza = round(0,2126 R + 0,7152 G + 0,0722 B)</Formula>
        <p>O cinza é calculado sobre valores sRGB de 8 bits, sem linearização: é uma aproximação de intensidade, não uma medida física de luminância. Em RGB, o laboratório aplica o kernel a cada canal sem misturá-los.</p>
        <p><strong>Refletir:</strong> espelha a entrada incluindo o pixel extremo. <strong>Repetir:</strong> estende o pixel extremo. <strong>Zeros:</strong> atribui zero às posições externas e pode escurecer as bordas em filtros de média. O passo é 1 e a extensão tem raio r; a saída mantém largura e altura da entrada.</p>
        <p>Uma execução sempre parte da imagem original. Alterar parâmetros exige aplicar novamente; os filtros não se acumulam. Uploads são processados no navegador, com redução proporcional para até 640 px no maior lado.</p>
      </article>
    </section>
    <section className="conv-section" aria-labelledby="conv-filters-title">
      <div className="section-heading"><p className="eyebrow">Pesos e efeitos</p><h2 id="conv-filters-title">Filtros disponíveis</h2><p>Compare os pesos e os parâmetros de cada filtro antes de executar. Todos podem ser editados no laboratório.</p></div>
      <div className="conv-filter-catalog">{kernelPresets.map(filter => <article className="conv-filter-card" key={filter.id}><h3>{filter.name}</h3><div className="conv-matrix-grid is-weights" style={{ '--kernel-size': 3 }} aria-label={`Kernel de ${filter.name}`}>{filter.kernel.flat().map((weight, index) => <span key={index}>{weight}</span>)}</div><p>{filter.description}</p><small>Divisor {filter.divisor} · deslocamento {filter.bias} · módulo {filter.absolute ? 'ativo' : 'inativo'}</small></article>)}</div>
      <p className="conv-note">Sobel X e Y mostram respostas separadas; este laboratório não combina os dois como √(Gₓ² + Gᵧ²). Bordas detectadas e pixels alterados descrevem o efeito do filtro, sem medir desempenho de um modelo.</p>
    </section>
    <section className="conv-section" aria-labelledby="conv-networks-title">
      <div className="section-heading"><p className="eyebrow">Aprendizagem Profunda de Modelos Generativos</p><h2 id="conv-networks-title">Da filtragem às redes convolucionais</h2><p>Este módulo demonstra filtros definidos manualmente. Em uma CNN, os kernels são parâmetros aprendidos por retropropagação a partir de uma função de perda.</p></div>
      <article className="conv-theory-panel">
        <h3>Mapas de características e pesos compartilhados</h3>
        <Formula label="Ativação de um mapa de saída em uma CNN por correlação cruzada">Zₒ(y, x) = bₒ + ∑꜀ ∑ᵢ₌₀ᵏ⁻¹ ∑ⱼ₌₀ᵏ⁻¹ Wₒ,꜀(i, j) · X꜀(y·s + i·δ − p, x·s + j·δ − p)<br />Hₒ(y, x) = φ(Zₒ(y, x))</Formula>
        <p><strong>o</strong> identifica o mapa de saída; <strong>c</strong>, o canal de entrada; <strong>W</strong>, os pesos aprendidos; <strong>bₒ</strong>, o viés; e <strong>φ</strong>, uma ativação, como ReLU. <strong>s</strong> é o passo (stride), <strong>p</strong>, o padding, e <strong>δ</strong>, a dilatação. Uma camada usual soma contribuições de todos os canais para cada mapa de saída.</p>
        <p>Bibliotecas de aprendizagem profunda normalmente chamam de convolução a <strong>correlação cruzada</strong>, que usa os pesos sem girá-los. O laboratório implementa a convolução matemática com giro. Kernels simétricos produzem a mesma resposta nas duas convenções.</p>
        <Formula label="Dimensão de saída de uma camada convolucional">Nsaída = ⌊(Nentrada + 2p − δ(k − 1) − 1)/s⌋ + 1</Formula>
        <p>A fórmula vale separadamente para altura e largura, com padding simétrico. Aqui, s = 1, δ = 1 e p = r, logo Nsaída = Nentrada. Uma camada com C canais de entrada e F filtros possui F(k²C + 1) parâmetros, incluindo um viés por filtro. Por exemplo, k = 3, C = 3 e F = 16 resultam em 448 parâmetros compartilhados entre as posições.</p>
        <h3>Papel em modelos generativos</h3>
        <p>Em autoencoders convolucionais, o encoder extrai características e o decoder reconstrói a imagem. Em VAEs, essa estrutura pode parametrizar a distribuição latente e a reconstrução. Em GANs convolucionais, o gerador produz imagens e o discriminador aprende a distinguir amostras reais e geradas. U-Nets usadas em muitos modelos de difusão combinam características em várias resoluções para estimar ruído ou outras parametrizações do processo de geração.</p>
        <p>Decoders podem ampliar a resolução por interpolação seguida de convolução ou por convolução transposta. A transposta não é a inversa matemática de uma convolução. Este laboratório permite estudar a operação local que compõe essas arquiteturas; ele não treina uma rede nem gera novas amostras.</p>
        <p className="conv-references">Referências: <a href="https://docs.scipy.org/doc/scipy/reference/generated/scipy.ndimage.convolve.html" target="_blank" rel="noreferrer">SciPy · convolução e bordas</a>; <a href="https://docs.pytorch.org/docs/stable/generated/torch.nn.Conv2d.html" target="_blank" rel="noreferrer">PyTorch · Conv2d e dimensões</a>; <a href="https://www.deeplearningbook.org/contents/convnets.html" target="_blank" rel="noreferrer">Goodfellow, Bengio e Courville · Deep Learning, capítulo 9</a>.</p>
      </article>
    </section>
  </>;
}

export default memo(ConvolutionTheory);
