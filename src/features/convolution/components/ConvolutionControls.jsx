import { ImagePlus, Play, RotateCcw } from 'lucide-react';
import { kernelPresets, optionsFromPreset, sampleImages } from '../data/kernels.js';

export default function ConvolutionControls({ lab }) {
  const { image, options, presetId, status, updateOptions, selectImage, apply } = lab;
  const loading = status === 'loading';
  const processing = status === 'processing';
  const preset = kernelPresets.find(item => item.id === presetId);
  function update(name, value) { updateOptions({ ...options, [name]: value }); }
  function resize(size) {
    const kernel = Array.from({ length: size }, () => Array(size).fill(0));
    kernel[Math.floor(size / 2)][Math.floor(size / 2)] = 1;
    updateOptions({ ...options, kernel, divisor: 1, bias: 0, absolute: false });
  }
  return (
    <div className="conv-setup">
      <section className="conv-panel conv-source" aria-labelledby="conv-source-title">
        <p className="eyebrow">01 · A entrada</p><h3 id="conv-source-title">Comece por uma imagem.</h3>
        <div className="conv-samples">{sampleImages.map(sample => <button key={sample.id} type="button" disabled={loading} className={image?.name === sample.name ? 'is-selected' : ''} onClick={() => selectImage(sample)} aria-pressed={image?.name === sample.name}><img src={sample.url} alt="" /><strong>{sample.name}</strong></button>)}</div>
        <label className={`conv-upload ${loading ? 'is-disabled' : ''}`}>
          <ImagePlus size={22} aria-hidden="true" /><strong>Enviar minha imagem</strong><span>PNG, JPEG ou WebP · até 20 MB</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={loading} aria-label="Enviar imagem para convolução" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) selectImage(file, true); }} />
        </label>
        <p className="conv-note">Tudo acontece no seu navegador. Imagens grandes são reduzidas proporcionalmente para até 640 px no maior lado. Transparências recebem fundo branco.</p>
        {image && <div className="conv-image-info"><strong>{image.name}</strong><span>{image.width} × {image.height} px{image.originalWidth !== image.width || image.originalHeight !== image.height ? ` · original: ${image.originalWidth} × ${image.originalHeight}` : ''}</span></div>}
      </section>
      <section className="conv-panel conv-filter" aria-labelledby="conv-filter-title">
        <p className="eyebrow">02 · A transformação</p><h3 id="conv-filter-title">Dê um papel aos pesos.</h3>
        <fieldset disabled={loading}>
          <legend className="conv-sr-only">Configuração do filtro</legend>
          <div className="conv-presets" role="group" aria-label="Filtros prontos">{kernelPresets.map(item => <button className={presetId === item.id ? 'is-selected' : ''} key={item.id} onClick={() => updateOptions({ ...optionsFromPreset(item), border: options.border }, item.id)} type="button" aria-pressed={presetId === item.id}>{item.name}</button>)}</div>
          <p className="conv-filter-description">{preset?.description ?? 'Kernel personalizado. Altere os pesos e observe a transformação produzida.'}</p>
          <div className="conv-kernel-layout">
            <div>
              <div className="conv-kernel-heading"><strong>Kernel informado</strong><label>Tamanho<select value={options.kernel.length} onChange={event => resize(Number(event.target.value))}><option value="3">3 × 3</option><option value="5">5 × 5</option></select></label></div>
              <div className="conv-kernel-editor" style={{ '--kernel-size': options.kernel.length }}>
                {options.kernel.map((row, y) => row.map((value, x) => <input key={`${y}-${x}`} aria-label={`Kernel linha ${y + 1}, coluna ${x + 1}`} type="number" min="-100" max="100" step="any" value={Number.isNaN(value) ? '' : value} onChange={event => { const kernel = options.kernel.map(values => [...values]); kernel[y][x] = event.target.value === '' ? NaN : Number(event.target.value); update('kernel', kernel); }} />))}
              </div>
              <p className="conv-note">O kernel gira 180° antes de percorrer a imagem.</p>
            </div>
            <div className="conv-fields">
              <label>Divisor<input type="number" step="any" value={Number.isNaN(options.divisor) ? '' : options.divisor} onChange={event => update('divisor', event.target.value === '' ? NaN : Number(event.target.value))} /></label>
              <label>Deslocamento<input type="number" min="-255" max="255" step="any" value={Number.isNaN(options.bias) ? '' : options.bias} onChange={event => update('bias', event.target.value === '' ? NaN : Number(event.target.value))} /></label>
              <label>Nas bordas<select value={options.border} onChange={event => update('border', event.target.value)}><option value="reflect">Refletir</option><option value="replicate">Repetir pixel</option><option value="zero">Preencher com zeros</option></select></label>
              <label className="conv-checkbox"><input type="checkbox" checked={options.absolute} onChange={event => update('absolute', event.target.checked)} /><span>Usar módulo da resposta<small>Útil para visualizar bordas.</small></span></label>
            </div>
          </div>
          <div className="conv-actions"><button className="button button--primary" type="button" disabled={!image || processing} onClick={apply}><Play size={16} />{processing ? 'Processando…' : 'Aplicar convolução'}</button><button className="conv-reset" type="button" onClick={() => updateOptions(optionsFromPreset(), 'sharpen')}><RotateCcw size={15} /> Restaurar filtro</button></div>
        </fieldset>
      </section>
    </div>
  );
}
