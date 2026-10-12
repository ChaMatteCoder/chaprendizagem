import { Download, MoveRight } from 'lucide-react';
import { downloadImage } from '../lib/imageIO.js';
import ImageCanvas from './ImageCanvas.jsx';

function ImagePair({ input, output, title, tag, selected, onSelect, filename }) {
  const stats = output?.stats;
  return <section className="conv-image-pair" aria-label={`Comparação ${title}`}>
    <div className="conv-pair-heading"><h3>{title}</h3><span>{tag}</span>{output && <button type="button" onClick={() => downloadImage(output, filename)} aria-label={`Baixar resultado ${title} em PNG`}><Download size={15} /> PNG</button>}</div>
    <div className="conv-pair-grid">
      <figure><figcaption><span>01</span> Original</figcaption><ImageCanvas image={input} label={`Imagem original ${title}`} selected={selected} onSelect={onSelect} /></figure>
      <figure><figcaption><span>02</span> Com convolução <MoveRight size={16} /></figcaption>{output ? <ImageCanvas image={output} label={`Imagem com convolução ${title}`} selected={selected} onSelect={onSelect} /> : <div className="conv-empty-image" style={{ aspectRatio: `${input.width} / ${input.height}` }}><span>∗</span><strong>Pronta para transformar.</strong><p>Escolha os pesos e aplique a convolução.</p></div>}</figure>
    </div>
    {stats && <div className="conv-result-stats"><span><strong>{(100 * stats.changed / stats.pixelCount).toFixed(1).replace('.', ',')}%</strong> dos pixels alterados</span><span><strong>{(100 * stats.clipped / stats.channelCount).toFixed(1).replace('.', ',')}%</strong> das respostas limitadas a 0–255</span></div>}
  </section>;
}

export default function ConvolutionComparison({ image, grayInput, result, view, onViewChange, selected, onSelect }) {
  return <section className="conv-section" aria-labelledby="conv-comparison-title">
    <div className="conv-comparison-heading"><div className="section-heading"><p className="eyebrow">03 · Antes e depois</p><h2 id="conv-comparison-title">O mesmo filtro. Duas leituras.</h2><p>{result ? 'Clique em qualquer imagem para inspecionar o pixel. As coordenadas também podem ser editadas abaixo.' : 'As duas entradas recebem o mesmo kernel. O resultado aparece quando você aplica a convolução.'}</p></div>
      <div className="conv-view-tabs" role="group" aria-label="Visualização das imagens">{[['both', 'As duas'], ['color', 'Colorida'], ['gray', 'Escala de cinza']].map(([value, label]) => <button type="button" key={value} aria-pressed={view === value} className={view === value ? 'is-selected' : ''} onClick={() => onViewChange(value)}>{label}</button>)}</div>
    </div>
    {(view === 'both' || view === 'color') && <ImagePair input={image} output={result?.color} title="Imagem colorida" tag="R · G · B" selected={result ? selected : null} onSelect={result ? onSelect : undefined} filename={`convolucao-${result?.presetId ?? 'filtro'}-rgb.png`} />}
    {(view === 'both' || view === 'gray') && <ImagePair input={result?.grayInput ?? grayInput} output={result?.gray} title="Escala de cinza" tag="INTENSIDADE" selected={result ? selected : null} onSelect={result ? onSelect : undefined} filename={`convolucao-${result?.presetId ?? 'filtro'}-cinza.png`} />}
    {result && <p className="conv-note">Processamento: {Math.round(result.duration)} ms · saída {image.width} × {image.height} px · os percentuais consideram a imagem inteira. Em RGB, cada canal conta como uma resposta.</p>}
  </section>;
}
