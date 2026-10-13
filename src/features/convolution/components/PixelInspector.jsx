import { memo, useMemo, useState } from 'react';
import { inspectPixel } from '../lib/convolution.js';

const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const number = value => formatter.format(value);

function Matrix({ title, values, size, kind }) {
  return <div className="conv-inspect-matrix"><h4>{title}</h4><div style={{ '--kernel-size': size }} className={`conv-matrix-grid is-${kind}`}>{values.map((value, index) => <span key={index} title={String(value)}>{number(value)}</span>)}</div></div>;
}

function PixelInspector({ result, selected, onSelect }) {
  const [channel, setChannel] = useState('gray');
  const source = channel === 'gray' ? result.grayInput : result.image;
  const channelIndex = { gray: 0, r: 0, g: 1, b: 2 }[channel];
  const trace = useMemo(() => inspectPixel(source, result.options, selected.x, selected.y, channelIndex), [source, result.options, selected.x, selected.y, channelIndex]);
  const size = result.options.kernel.length;
  const hasPadding = trace.terms.some(term => term.padded);
  function coordinate(axis, value) {
    const maximum = axis === 'x' ? source.width - 1 : source.height - 1;
    onSelect({ ...selected, [axis]: Math.max(0, Math.min(maximum, Math.trunc(Number(value) || 0))) });
  }
  return <section className="conv-section conv-inspector" aria-labelledby="conv-inspect-title">
    <div className="section-heading"><p className="eyebrow">04 · Por dentro da operação</p><h2 id="conv-inspect-title">Cálculo do pixel selecionado</h2><p>A janela, os pesos efetivamente aplicados e os produtos vêm desta execução. Explore um ponto da imagem ou informe suas coordenadas.</p></div>
    <div className="conv-inspect-controls">
      <div className="conv-coordinates"><label>Coluna x<input type="number" min="0" max={source.width - 1} step="1" value={selected.x} onChange={event => coordinate('x', event.target.value)} /></label><label>Linha y<input type="number" min="0" max={source.height - 1} step="1" value={selected.y} onChange={event => coordinate('y', event.target.value)} /></label></div>
      <div className="conv-channel-tabs" role="group" aria-label="Canal inspecionado">{[['gray', 'Cinza'], ['r', 'R'], ['g', 'G'], ['b', 'B']].map(([value, label]) => <button key={value} type="button" aria-pressed={channel === value} className={channel === value ? 'is-selected' : ''} onClick={() => setChannel(value)}>{label}</button>)}</div>
      <span className="conv-inspect-position">Pixel ({selected.x}, {selected.y}) · {channel === 'gray' ? 'intensidade' : `canal ${channel.toUpperCase()}`}</span>
    </div>
    <div className="conv-inspect-matrices">
      <Matrix title="Vizinhança da entrada" values={trace.terms.map(term => term.value)} size={size} kind="pixels" />
      <Matrix title="Kernel girado 180°" values={trace.terms.map(term => term.weight)} size={size} kind="weights" />
      <Matrix title="Produtos correspondentes" values={trace.terms.map(term => term.product)} size={size} kind="products" />
    </div>
    <div className="conv-inspect-answer" aria-live="polite"><div><small>Soma dos produtos</small><strong>{number(trace.sum)}</strong></div><span>÷ {number(result.options.divisor)}{result.options.absolute ? ' → módulo' : ''} → + ({number(result.options.bias)}) →</span><div><small>Resposta antes de limitar</small><strong>{number(trace.adjusted)}</strong></div><span>limitar + arredondar →</span><div className="conv-final-pixel"><small>Pixel exibido</small><strong>{trace.value}<i aria-hidden="true" style={{ background: `rgb(${trace.value},${trace.value},${trace.value})` }} /></strong></div></div>
    {hasPadding && <p className="conv-padding-note">A janela cruza a borda. Os vizinhos externos seguem a opção “{({ reflect: 'Refletir', replicate: 'Repetir pixel', zero: 'Preencher com zeros' })[result.options.border]}” desta execução.</p>}
    <details className="conv-math"><summary>Ver todos os produtos e coordenadas</summary><div className="conv-table-wrap"><table><caption>Contribuições para o pixel ({selected.x}, {selected.y}), canal {channel.toUpperCase()}</caption><thead><tr><th>Vizinho (x, y)</th><th>Entrada</th><th>Peso</th><th>Produto</th></tr></thead><tbody>{trace.terms.map((term, index) => <tr key={index}><td>({term.sourceX}, {term.sourceY}){term.padded ? ' · borda' : ''}</td><td>{term.value}</td><td>{number(term.weight)}</td><td>{number(term.product)}</td></tr>)}</tbody></table></div></details>
  </section>;
}

export default memo(PixelInspector);
