import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Filter,
  Layers3,
} from 'lucide-react';
import { PIXEL_CNN_ARCHITECTURE } from '../data/cifar10Schema.js';
import {
  extractConv1Filter,
  extractFeatureMapSlice,
  formatPixelNumber,
} from '../lib/cnnMath.js';

function FeatureMapCanvas({ slice }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !slice) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, min, max, values } = slice;
    const span = max - min > 1e-8 ? max - min : 1;
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let r = 0; r < height; r += 1) {
      for (let c = 0; c < width; c += 1) {
        const v = values[r][c];
        const norm = Math.min(1, Math.max(0, (v - min) / span));
        const idx = (r * width + c) * 4;
        if (v < 0) {
          // Valores negativos (antes da ReLU): tons frios azulados
          rgba[idx] = Math.round(20 + norm * 60);
          rgba[idx + 1] = Math.round(60 + norm * 110);
          rgba[idx + 2] = Math.round(130 + norm * 125);
        } else {
          // Valores >= 0: escala térmica âmbar/ciano de estação
          rgba[idx] = Math.round(16 + norm * 239);
          rgba[idx + 1] = Math.round(28 + norm * 195);
          rgba[idx + 2] = Math.round(48 + (1 - Math.abs(norm - 0.5) * 2) * 140);
        }
        rgba[idx + 3] = 255;
      }
    }

    ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  }, [slice]);

  return (
    <canvas
      ref={canvasRef}
      width={slice.width}
      height={slice.height}
      className="pixel-fmap-bitmap"
      aria-label={`Mapa de ativação do canal ${slice.channelIndex}, dimensões ${slice.height} por ${slice.width}`}
    />
  );
}

const LAYER_OPTIONS = [
  {
    id: 'conv2d_1',
    label: '1ª Convolução (conv2d_1 · 32×32×32)',
    totalChannels: 32,
    hasPreRelu: true,
    poolId: 'max_pooling2d_1',
  },
  {
    id: 'conv2d_2',
    label: '2ª Convolução (conv2d_2 · 16×16×64)',
    totalChannels: 64,
    hasPreRelu: true,
    poolId: 'max_pooling2d_2',
  },
  {
    id: 'conv2d_3',
    label: '3ª Convolução (conv2d_3 · 8×8×64)',
    totalChannels: 64,
    hasPreRelu: true,
    poolId: null,
  },
];

export default function PixelLabNetworkSection({
  inspection,
  onOpenFilterInConv,
}) {
  const [filterPage, setFilterPage] = useState(0); // 4 páginas de 8 filtros = 32
  const [selectedLayerId, setSelectedLayerId] = useState('conv2d_1');
  const [stageMode, setStageMode] = useState('postRelu'); // 'preRelu' | 'postRelu' | 'postPool'
  const [channelPage, setChannelPage] = useState(0);

  const activeResult = inspection.transformedResult || inspection.cleanResult;
  const activations = activeResult?.activations;

  const layerMeta =
    LAYER_OPTIONS.find((l) => l.id === selectedLayerId) || LAYER_OPTIONS[0];
  const channelsPerPage = 8;
  const maxChannelPages = Math.ceil(layerMeta.totalChannels / channelsPerPage);
  const safeChannelPage = Math.min(channelPage, maxChannelPages - 1);

  const effectiveStage =
    stageMode === 'postPool' && !layerMeta.poolId ? 'postRelu' : stageMode;

  let activeMap3D = null;
  if (activations) {
    if (effectiveStage === 'preRelu') {
      activeMap3D = activations.layers[selectedLayerId]?.preRelu;
    } else if (effectiveStage === 'postRelu') {
      activeMap3D = activations.layers[selectedLayerId]?.postRelu;
    } else if (effectiveStage === 'postPool' && layerMeta.poolId) {
      activeMap3D = activations.layers[layerMeta.poolId]?.output;
    }
  }

  const startFilter = filterPage * 8;
  const visibleFilters = activations
    ? Array.from({ length: 8 }, (_, i) =>
        extractConv1Filter(
          activations.conv1Kernel,
          activations.conv1Bias,
          startFilter + i,
        ),
      )
    : [];

  const startChannel = safeChannelPage * channelsPerPage;
  const visibleSlices = activeMap3D
    ? Array.from({ length: channelsPerPage }, (_, i) =>
        extractFeatureMapSlice(activeMap3D, startChannel + i),
      )
    : [];

  if (!activations) {
    return (
      <article className="pixel-panel">
        <p role="status">
          {inspection.status === 'error'
            ? 'Ativações indisponíveis. Repita a análise acima.'
            : 'Calculando os mapas de ativação desta imagem…'}
        </p>
      </article>
    );
  }

  return (
    <div className="pixel-stack">
      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <div>
            <span className="pixel-eyebrow">O caminho da imagem</span>
            <h2>
              <Cpu size={22} /> Da entrada às dez probabilidades
            </h2>
          </div>
          <span className="pixel-tag is-amber">
            {PIXEL_CNN_ARCHITECTURE.totalParameters.toLocaleString('pt-BR')}{' '}
            parâmetros
          </span>
        </div>

        <p>
          A imagem <code>[32, 32, 3]</code> atravessa três blocos convolucionais
          com ativação <code>ReLU</code>, duas reduções espaciais por{' '}
          <code>MaxPooling2D(2×2)</code>, uma camada de{' '}
          <code>GlobalAveragePooling2D</code> que resume cada um dos 64 mapas{' '}
          <code>8×8</code> em sua média espacial e duas camadas densas até a
          saída <code>Softmax</code> de 10 classes.
        </p>

        <ol className="pixel-network-flow" aria-label="Etapas da arquitetura">
          {[
            ['01 · Entrada', '32 × 32 × 3', 'Cores viram números'],
            ['02 · Conv 1 + ReLU', '32 × 32 × 32', '32 filtros aprendidos'],
            ['03 · Max pooling', '16 × 16 × 32', 'Seleciona máximos em 2 × 2'],
            ['04 · Conv 2 + ReLU', '16 × 16 × 64', '64 filtros aprendidos'],
            ['05 · Max pooling', '8 × 8 × 64', 'Reduz novamente o tamanho'],
            ['06 · Conv 3 + ReLU', '8 × 8 × 64', 'Combina respostas locais'],
            ['07 · Média global', '64 valores', 'Resume cada mapa 8 × 8'],
            ['08 · Classificação', '64 → 64 → 10', 'Densas + ReLU + Softmax'],
          ].map(([title, shape, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <code>{shape}</code>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p className="pixel-caption">
          As duas primeiras convoluções são seguidas de pooling. A terceira
          segue direto para a média global.
        </p>
        <details className="pixel-details">
          <summary>Consultar todas as camadas, dimensões e parâmetros</summary>
          <div>
            <div
              className="pixel-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Tabela de camadas e parâmetros da CNN"
            >
              <table className="pixel-table">
                <caption>
                  Contagem exata de pesos, biases e dimensões por camada no
                  modelo em execução
                </caption>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Camada</th>
                    <th>Tipo</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Kernel / Janela</th>
                    <th>Bias</th>
                    <th>Parâmetros</th>
                  </tr>
                </thead>
                <tbody>
                  {PIXEL_CNN_ARCHITECTURE.layers.map((layer, index) => (
                    <tr key={layer.name}>
                      <th scope="row">{index}</th>
                      <td>
                        <code>{layer.name}</code>
                        <small className="pixel-block-sub">{layer.role}</small>
                      </td>
                      <td>
                        <code>{layer.className}</code>
                      </td>
                      <td>
                        <code>[{layer.inputShape.join(' × ')}]</code>
                      </td>
                      <td>
                        <code>[{layer.outputShape.join(' × ')}]</code>
                      </td>
                      <td>
                        <code>
                          {layer.kernelShape
                            ? `[${layer.kernelShape.join(', ')}]`
                            : layer.poolSize
                              ? `pool [${layer.poolSize.join('×')}]`
                              : '—'}
                        </code>
                      </td>
                      <td>
                        <code>
                          {layer.biasShape
                            ? `[${layer.biasShape.join(', ')}]`
                            : '—'}
                        </code>
                      </td>
                      <td>
                        <strong>
                          {layer.parameters.toLocaleString('pt-BR')}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={7}>
                      Total de parâmetros treináveis
                    </th>
                    <td>
                      <strong>
                        {PIXEL_CNN_ARCHITECTURE.totalParameters.toLocaleString(
                          'pt-BR',
                        )}
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </details>
      </article>

      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <div>
            <span className="pixel-eyebrow">
              Mapas de características reais
            </span>
            <h2>
              <Layers3 size={22} /> Veja o que muda após cada operação
            </h2>
          </div>

          <div className="pixel-pagination">
            <button
              type="button"
              className="pixel-btn is-small is-outline"
              disabled={safeChannelPage === 0}
              onClick={() => setChannelPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={16} /> Canais anteriores
            </button>
            <span>
              Canais {startChannel}–{startChannel + channelsPerPage - 1} de{' '}
              {layerMeta.totalChannels}
            </span>
            <button
              type="button"
              className="pixel-btn is-small is-outline"
              disabled={safeChannelPage >= maxChannelPages - 1}
              onClick={() =>
                setChannelPage((p) => Math.min(maxChannelPages - 1, p + 1))
              }
            >
              Próximos canais <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="pixel-selector-bar">
          <label>
            Bloco convolucional
            <select
              value={selectedLayerId}
              onChange={(e) => {
                setSelectedLayerId(e.target.value);
                setChannelPage(0);
              }}
            >
              {LAYER_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div
            className="pixel-stage-tabs"
            role="group"
            aria-label="Estágio da operação no bloco"
          >
            <button
              type="button"
              className={`pixel-btn is-small ${effectiveStage === 'preRelu' ? 'is-primary' : 'is-outline'}`}
              aria-pressed={effectiveStage === 'preRelu'}
              onClick={() => setStageMode('preRelu')}
            >
              1. Antes da ReLU (z)
            </button>
            <button
              type="button"
              className={`pixel-btn is-small ${effectiveStage === 'postRelu' ? 'is-primary' : 'is-outline'}`}
              aria-pressed={effectiveStage === 'postRelu'}
              onClick={() => setStageMode('postRelu')}
            >
              2. Depois da ReLU (max(0, z))
            </button>
            <button
              type="button"
              className={`pixel-btn is-small ${effectiveStage === 'postPool' ? 'is-primary' : 'is-outline'}`}
              aria-pressed={effectiveStage === 'postPool'}
              disabled={!layerMeta.poolId}
              onClick={() => setStageMode('postPool')}
            >
              3. Depois do MaxPooling 2×2
            </button>
          </div>
        </div>

        <div className="pixel-warning-banner" role="note">
          <AlertTriangle size={18} />
          <div>
            <strong>Escala individual e interpretação científica:</strong> cada
            mapa abaixo é colorido usando seu próprio intervalo{' '}
            <code>[min, max]</code> explícito; portanto, as cores não permitem
            comparar magnitudes diretamente entre canais diferentes sem ler a
            escala numérica. Além disso, mapas de ativação mostram correlações
            numéricas locais e <strong>não são explicações causais</strong> —
            não afirme que um filtro isolado “detecta gatos” ou “compreende
            objetos”.
          </div>
        </div>

        <div className="pixel-fmaps-grid">
          {visibleSlices.map((slice) => (
            <div key={slice.channelIndex} className="pixel-fmap-card">
              <div className="pixel-fmap-card__head">
                <strong>Canal k = {slice.channelIndex}</strong>
                <span>
                  {slice.height}×{slice.width}
                </span>
              </div>
              <FeatureMapCanvas slice={slice} />
              <div className="pixel-fmap-stats">
                <span>
                  min: <code>{formatPixelNumber(slice.min, 3)}</code>
                </span>
                <span>
                  max: <code>{formatPixelNumber(slice.max, 3)}</code>
                </span>
                <span>
                  média: <code>{formatPixelNumber(slice.mean, 3)}</code>
                </span>
                <span>
                  ativos (&gt;0):{' '}
                  <code>
                    {formatPixelNumber(slice.activeFraction * 100, 0)}%
                  </code>
                </span>
              </div>
            </div>
          ))}
        </div>
      </article>
      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <div>
            <span className="pixel-eyebrow">Pesos aprendidos na 1ª camada</span>
            <h2>
              <Filter size={22} /> Os filtros que a rede aprendeu
            </h2>
          </div>
          <div className="pixel-pagination">
            <button
              type="button"
              className="pixel-btn is-small is-outline"
              disabled={filterPage === 0}
              onClick={() => setFilterPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <span>
              Filtros {startFilter}–{startFilter + 7} de 32
            </span>
            <button
              type="button"
              className="pixel-btn is-small is-outline"
              disabled={filterPage >= 3}
              onClick={() => setFilterPage((p) => Math.min(3, p + 1))}
            >
              Próximos <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <p className="pixel-caption">
          São exibidos 8 filtros por vez para preservar leitura e desempenho.
          Cada filtro possui <code>3 × 3 × 3 = 27</code> pesos (canais R, G e B)
          e 1 bias. O mosaico colorido normaliza individualmente o intervalo{' '}
          <code>[min, max]</code> de cada filtro para exibição; consulte os
          limites numéricos abaixo de cada cartão.
        </p>

        <div className="pixel-filters-grid">
          {visibleFilters.map((flt) => (
            <div key={flt.filterIndex} className="pixel-filter-card">
              <div className="pixel-filter-card__top">
                <strong>Filtro k = {flt.filterIndex}</strong>
                <small>b = {formatPixelNumber(flt.bias, 4)}</small>
              </div>

              <div
                className="pixel-filter-patch"
                aria-label={`Mosaico 3 por 3 do filtro ${flt.filterIndex}`}
              >
                {flt.rgbPreview.flatMap((row, u) =>
                  row.map(([r, g, b], v) => (
                    <span
                      key={`${u}-${v}`}
                      style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
                      title={`W[${u},${v},:,${flt.filterIndex}] = [${formatPixelNumber(
                        flt.byChannel[0][u][v],
                        3,
                      )}, ${formatPixelNumber(flt.byChannel[1][u][v], 3)}, ${formatPixelNumber(
                        flt.byChannel[2][u][v],
                        3,
                      )}]`}
                    />
                  )),
                )}
              </div>

              <div className="pixel-filter-scale">
                <span>min: {formatPixelNumber(flt.minWeight, 3)}</span>
                <span>max: {formatPixelNumber(flt.maxWeight, 3)}</span>
              </div>

              {onOpenFilterInConv && (
                <button
                  type="button"
                  className="pixel-btn is-small is-outline is-full"
                  onClick={() => onOpenFilterInConv(flt.filterIndex)}
                >
                  Ver cálculo deste filtro
                </button>
              )}
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
