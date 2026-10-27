import { useMemo } from 'react';
import { Calculator, Grid3X3, Layers, Sigma } from 'lucide-react';
import {
  explainConv1Step,
  explainCrossEntropy,
  explainGlobalAveragePoolChannel,
  explainMaxPool1Window,
  formatPixelNumber,
  stableSoftmax,
} from '../lib/cnnMath.js';
import PixelCanvas from './PixelCanvas.jsx';

export default function PixelLabConvSection({
  currentSample,
  processedImages,
  inspection,
  selectedFilter,
  onSelectFilter,
  selectedCoord,
  onSelectCoord,
}) {
  const activeResult = inspection.transformedResult || inspection.cleanResult;
  const activations = activeResult?.activations;

  const convStep = useMemo(() => {
    if (!activations) return null;
    return explainConv1Step(
      activations.normalizedInput,
      activations.conv1Kernel,
      activations.conv1Bias,
      {
        row: selectedCoord.row,
        col: selectedCoord.col,
        filterIndex: selectedFilter,
      },
      activations.layers.conv2d_1.preRelu,
      activations.layers.conv2d_1.postRelu,
    );
  }, [activations, selectedCoord.row, selectedCoord.col, selectedFilter]);

  const poolStep = useMemo(() => {
    if (!activations) return null;
    const poolRow = Math.floor(selectedCoord.row / 2);
    const poolCol = Math.floor(selectedCoord.col / 2);
    return explainMaxPool1Window(
      activations.layers.conv2d_1.postRelu,
      {
        poolRow,
        poolCol,
        filterIndex: selectedFilter,
      },
      activations.layers.max_pooling2d_1.output,
    );
  }, [activations, selectedCoord.row, selectedCoord.col, selectedFilter]);

  const gapStep = useMemo(() => {
    if (!activations) return null;
    return explainGlobalAveragePoolChannel(
      activations.layers.conv2d_3.postRelu,
      selectedFilter % 64,
      activations.layers.global_average_pooling2d_1.output,
    );
  }, [activations, selectedFilter]);

  const softmaxStep = useMemo(() => {
    if (!activeResult) return null;
    return stableSoftmax(activeResult.logits);
  }, [activeResult]);

  const ceStep = useMemo(() => {
    if (!activeResult || !currentSample) return null;
    return explainCrossEntropy(
      activeResult.logits,
      activeResult.probabilities,
      currentSample.label,
    );
  }, [activeResult, currentSample]);

  if (!activations || !convStep || !poolStep) {
    return (
      <article className="pixel-panel">
        <p role="status">
          Carregando tensores e pesos reais para inspeção passo a passo…
        </p>
      </article>
    );
  }

  return (
    <div className="pixel-stack">
      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <div>
            <span className="pixel-eyebrow">
              Uma posição, um filtro, 27 produtos
            </span>
            <h2>
              <Calculator size={22} /> Recorte → multiplicação → soma → ReLU
            </h2>
          </div>
          <span className="pixel-tag is-cyan">
            Posição (i={selectedCoord.row}, j={selectedCoord.col}) · Filtro k=
            {selectedFilter}
          </span>
        </div>

        <p className="pixel-caption">
          Clique na foto para mover a janela 3 × 3. Cada posição usa pesos dos
          três canais; a soma e a ReLU abaixo são comparadas ao valor real da
          rede.
        </p>
        <details className="pixel-details">
          <summary>Ver a fórmula e como a borda é tratada</summary>
          <div>
            <div className="pixel-formula-box">
              <div>
                <strong>
                  Equação da 1ª camada convolucional (padding=&quot;same&quot;,
                  passo 1)
                </strong>
                <math
                  display="block"
                  aria-label="z de i, j, k igual a b de k mais a soma tripla em u, v e c de W de u, v, c, k vezes x de i mais u, j mais v, c"
                >
                  <mrow>
                    <mi>z</mi>
                    <mo>[</mo>
                    <mi>i</mi>
                    <mo>,</mo>
                    <mi>j</mi>
                    <mo>,</mo>
                    <mi>k</mi>
                    <mo>]</mo>
                    <mo>=</mo>
                    <mi>b</mi>
                    <mo>[</mo>
                    <mi>k</mi>
                    <mo>]</mo>
                    <mo>+</mo>
                    <munderover>
                      <mo>∑</mo>
                      <mrow>
                        <mi>u</mi>
                        <mo>=</mo>
                        <mn>0</mn>
                      </mrow>
                      <mn>2</mn>
                    </munderover>
                    <munderover>
                      <mo>∑</mo>
                      <mrow>
                        <mi>v</mi>
                        <mo>=</mo>
                        <mn>0</mn>
                      </mrow>
                      <mn>2</mn>
                    </munderover>
                    <munderover>
                      <mo>∑</mo>
                      <mrow>
                        <mi>c</mi>
                        <mo>=</mo>
                        <mn>0</mn>
                      </mrow>
                      <mn>2</mn>
                    </munderover>
                    <mi>W</mi>
                    <mo>[</mo>
                    <mi>u</mi>
                    <mo>,</mo>
                    <mi>v</mi>
                    <mo>,</mo>
                    <mi>c</mi>
                    <mo>,</mo>
                    <mi>k</mi>
                    <mo>]</mo>
                    <mo>×</mo>
                    <msub>
                      <mi>x</mi>
                      <mtext>pad</mtext>
                    </msub>
                    <mo>[</mo>
                    <mi>i</mi>
                    <mo>+</mo>
                    <mi>u</mi>
                    <mo>,</mo>
                    <mi>j</mi>
                    <mo>+</mo>
                    <mi>v</mi>
                    <mo>,</mo>
                    <mi>c</mi>
                    <mo>]</mo>
                  </mrow>
                </math>
              </div>
              <p className="pixel-caption">
                Com <code>padding=&quot;same&quot;</code> e janela{' '}
                <code>3×3</code>, a imagem <code>x</code> recebe 1 pixel de
                borda com zeros:{' '}
                <code>x_pad[i+u, j+v, c] = x[i+u-1, j+v-1, c]</code> quando{' '}
                <code>0 ≤ i+u-1 &lt; 32</code> e <code>0 ≤ j+v-1 &lt; 32</code>,
                e <code>0</code> fora da borda. Em redes neurais, a camada{' '}
                <code>Conv2D</code> calcula <strong>correlação cruzada</strong>{' '}
                (sem girar o kernel em 180°), chamada de convolução por
                convenção na literatura de CNNs. Os 3 canais RGB são
                multiplicados por pesos distintos e somados antes de adicionar
                um único bias escalar <code>b[k]</code>.
              </p>
            </div>
          </div>
        </details>
        <div className="pixel-conv-controls-grid">
          <PixelCanvas
            pixels={processedImages.transformedPixels}
            mode="rgb"
            showGrid
            selectedCoord={selectedCoord}
            highlightWindow3x3
            onSelectCoord={onSelectCoord}
            size="md"
            label="Clique ou use as setas para escolher (i, j)"
            caption={`Centro selecionado: linha i=${selectedCoord.row}, coluna j=${selectedCoord.col}`}
          />

          <div className="pixel-conv-form">
            <div className="pixel-selector-bar">
              <label>
                Filtro da 1ª camada (k ∈ [0..31])
                <select
                  value={selectedFilter}
                  onChange={(e) => onSelectFilter(Number(e.target.value))}
                >
                  {Array.from({ length: 32 }, (_, k) => (
                    <option key={k} value={k}>
                      Filtro k = {k} (bias b[{k}] ={' '}
                      {formatPixelNumber(activations.conv1Bias[k], 4)})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Linha espacial i (0 a 31)
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={selectedCoord.row}
                  onChange={(e) =>
                    onSelectCoord({
                      row: Math.min(
                        31,
                        Math.max(0, Number(e.target.value) || 0),
                      ),
                      col: selectedCoord.col,
                    })
                  }
                />
              </label>

              <label>
                Coluna espacial j (0 a 31)
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={selectedCoord.col}
                  onChange={(e) =>
                    onSelectCoord({
                      row: selectedCoord.row,
                      col: Math.min(
                        31,
                        Math.max(0, Number(e.target.value) || 0),
                      ),
                    })
                  }
                />
              </label>
            </div>

            <div className="pixel-conv-summary-cards">
              <div>
                <small>Soma dos 27 produtos (R + G + B)</small>
                <strong>{formatPixelNumber(convStep.sumProducts, 6)}</strong>
              </div>
              <div>
                <small>Bias b[{selectedFilter}]</small>
                <strong>{formatPixelNumber(convStep.bias, 6)}</strong>
              </div>
              <div>
                <small>
                  Pré-ativação z[{selectedCoord.row}, {selectedCoord.col},{' '}
                  {selectedFilter}]
                </small>
                <strong>{formatPixelNumber(convStep.computedZ, 6)}</strong>
                <span>
                  Modelo (TF.js): {formatPixelNumber(convStep.observedZ, 6)}
                </span>
              </div>
              <div className="is-highlight">
                <small>Pós-ReLU max(0, z)</small>
                <strong>
                  {formatPixelNumber(convStep.computedPostRelu, 6)}
                </strong>
                <span>
                  Modelo (TF.js):{' '}
                  {formatPixelNumber(convStep.observedPostRelu, 6)} (|Δ| ={' '}
                  {formatPixelNumber(convStep.absDiffPostRelu, 7)})
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pixel-channels-breakdown">
          {convStep.channels.map((ch) => (
            <details
              key={ch.channelName}
              className={`pixel-channel-math-card is-channel-${ch.channelName.toLowerCase()}`}
              aria-label={`Cálculo do canal ${ch.channelName}`}
            >
              <summary>
                <strong>
                  Canal {ch.channelName} (c = {ch.channelIndex})
                </strong>
                <span>
                  Soma do canal {ch.channelName}:{' '}
                  <strong>{formatPixelNumber(ch.channelSum, 6)}</strong>
                </span>
              </summary>

              <div className="pixel-3x3-triplet">
                <div>
                  <h4>
                    Patch 3×3 normalizado x[i+u-1, j+v-1, {ch.channelIndex}]
                  </h4>
                  <table className="pixel-matrix-3x3">
                    <tbody>
                      {ch.patch.map((row, u) => (
                        <tr key={u}>
                          {row.map((cell) => (
                            <td
                              key={cell.v}
                              className={cell.isPadded ? 'is-padded' : ''}
                            >
                              <strong>
                                {formatPixelNumber(cell.xNormalized, 3)}
                              </strong>
                              <small>
                                {cell.isPadded
                                  ? 'pad (0)'
                                  : `u8:${cell.xUint8}`}
                              </small>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4>
                    Pesos reais W[u, v, {ch.channelIndex}, {selectedFilter}]
                  </h4>
                  <table className="pixel-matrix-3x3">
                    <tbody>
                      {ch.weights.map((row, u) => (
                        <tr key={u}>
                          {row.map((wVal, v) => (
                            <td key={v}>
                              <strong>{formatPixelNumber(wVal, 4)}</strong>
                              <small>
                                W[{u},{v}]
                              </small>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4>Produtos W × x</h4>
                  <table className="pixel-matrix-3x3">
                    <tbody>
                      {ch.products.map((row, u) => (
                        <tr key={u}>
                          {row.map((pVal, v) => (
                            <td key={v}>
                              <strong>{formatPixelNumber(pVal, 4)}</strong>
                              <small>
                                termo ({u},{v})
                              </small>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          ))}
        </div>
      </article>

      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <div>
            <span className="pixel-eyebrow">Redução espacial e decisão</span>
            <h2>
              <Grid3X3 size={22} /> Da ativação à decisão da rede
            </h2>
          </div>
          <span className="pixel-tag">
            Valores reais da amostra {currentSample.id}
          </span>
        </div>

        <div className="pixel-two-col-math">
          <section className="pixel-subpanel">
            <h3>1. Exemplo real de MaxPooling 2×2 (passo 2)</h3>
            <math
              display="block"
              aria-label="m de p i, p j, k igual ao máximo em r e s em 0, 1 de a de 2 p i mais r, 2 p j mais s, k"
            >
              <mrow>
                <mi>m</mi>
                <mo>[</mo>
                <msub>
                  <mi>p</mi>
                  <mi>i</mi>
                </msub>
                <mo>,</mo>
                <msub>
                  <mi>p</mi>
                  <mi>j</mi>
                </msub>
                <mo>,</mo>
                <mi>k</mi>
                <mo>]</mo>
                <mo>=</mo>
                <munder>
                  <mi>max</mi>
                  <mrow>
                    <mi>r</mi>
                    <mo>,</mo>
                    <mi>s</mi>
                    <mo>∈</mo>
                    <mo>{'{'}</mo>
                    <mn>0</mn>
                    <mo>,</mo>
                    <mn>1</mn>
                    <mo>{'}'}</mo>
                  </mrow>
                </munder>
                <mi>a</mi>
                <mo>[</mo>
                <mn>2</mn>
                <msub>
                  <mi>p</mi>
                  <mi>i</mi>
                </msub>
                <mo>+</mo>
                <mi>r</mi>
                <mo>,</mo>
                <mn>2</mn>
                <msub>
                  <mi>p</mi>
                  <mi>j</mi>
                </msub>
                <mo>+</mo>
                <mi>s</mi>
                <mo>,</mo>
                <mi>k</mi>
                <mo>]</mo>
              </mrow>
            </math>
            <p className="pixel-caption">
              A posição selecionada{' '}
              <code>
                (i={selectedCoord.row}, j={selectedCoord.col})
              </code>{' '}
              pertence à janela de pooling{' '}
              <code>
                (p_i={poolStep.poolRow}, p_j={poolStep.poolCol})
              </code>
              , que cobre as linhas{' '}
              <code>
                {poolStep.startRow}..{poolStep.startRow + 1}
              </code>{' '}
              e colunas{' '}
              <code>
                {poolStep.startCol}..{poolStep.startCol + 1}
              </code>{' '}
              no filtro <code>k={selectedFilter}</code>:
            </p>
            <div className="pixel-pool-grid">
              {poolStep.cells.map((cell) => {
                const isWinner =
                  poolStep.winner?.row === cell.row &&
                  poolStep.winner?.col === cell.col;
                return (
                  <div
                    key={`${cell.row}-${cell.col}`}
                    className={`pixel-pool-cell${isWinner ? ' is-winner' : ''}`}
                  >
                    <small>
                      a[{cell.row}, {cell.col}, {selectedFilter}]
                    </small>
                    <strong>{formatPixelNumber(cell.value, 6)}</strong>
                    {isWinner && (
                      <span className="pixel-mini-badge">
                        Máximo selecionado
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="pixel-caption">
              Saída calculada:{' '}
              <code>{formatPixelNumber(poolStep.computedMax, 6)}</code> · Saída
              observada na camada <code>max_pooling2d_1</code>:{' '}
              <code>{formatPixelNumber(poolStep.observedMax, 6)}</code> (|Δ| ={' '}
              <code>{formatPixelNumber(poolStep.absDiff, 7)}</code>).
            </p>
          </section>

          <section className="pixel-subpanel">
            <h3>2. Global Average Pooling (GAP 8×8 → 64)</h3>
            <math
              display="block"
              aria-label="g de c igual a 1 sobre 64 vezes a soma em i e j de a 3 de i, j, c"
            >
              <mrow>
                <mi>g</mi>
                <mo>[</mo>
                <mi>c</mi>
                <mo>]</mo>
                <mo>=</mo>
                <mfrac>
                  <mn>1</mn>
                  <mrow>
                    <mn>8</mn>
                    <mo>×</mo>
                    <mn>8</mn>
                  </mrow>
                </mfrac>
                <munderover>
                  <mo>∑</mo>
                  <mrow>
                    <mi>i</mi>
                    <mo>=</mo>
                    <mn>0</mn>
                  </mrow>
                  <mn>7</mn>
                </munderover>
                <munderover>
                  <mo>∑</mo>
                  <mrow>
                    <mi>j</mi>
                    <mo>=</mo>
                    <mn>0</mn>
                  </mrow>
                  <mn>7</mn>
                </munderover>
                <msup>
                  <mi>a</mi>
                  <mrow>
                    <mo>(</mo>
                    <mn>3</mn>
                    <mo>)</mo>
                  </mrow>
                </msup>
                <mo>[</mo>
                <mi>i</mi>
                <mo>,</mo>
                <mi>j</mi>
                <mo>,</mo>
                <mi>c</mi>
                <mo>]</mo>
              </mrow>
            </math>
            <p className="pixel-caption">
              Após a 3ª convolução (<code>8×8×64</code>), cada um dos 64 mapas é
              resumido pela média de suas 64 posições espaciais, reduzindo
              parâmetros e evitando um <code>Flatten</code> pesado de{' '}
              <code>4.096</code> entradas.
            </p>
            {gapStep && (
              <div className="pixel-conv-summary-cards">
                <div>
                  <small>Soma 8×8 no canal c={gapStep.channelIndex}</small>
                  <strong>{formatPixelNumber(gapStep.sum, 5)}</strong>
                </div>
                <div>
                  <small>Média calculada (soma / 64)</small>
                  <strong>{formatPixelNumber(gapStep.computedMean, 6)}</strong>
                </div>
                <div>
                  <small>Saída GAP no modelo</small>
                  <strong>{formatPixelNumber(gapStep.observedMean, 6)}</strong>
                </div>
              </div>
            )}
          </section>
        </div>

        {softmaxStep && ceStep && (
          <div className="pixel-two-col-math">
            <section className="pixel-subpanel">
              <h3>
                <Sigma size={18} /> 3. Softmax numericamente estável
              </h3>
              <math
                display="block"
                aria-label="p k igual a exp de z k menos m dividido pela soma em j de exp de z j menos m"
              >
                <mrow>
                  <msub>
                    <mi>p</mi>
                    <mi>k</mi>
                  </msub>
                  <mo>=</mo>
                  <mfrac>
                    <mrow>
                      <mi>exp</mi>
                      <mo>(</mo>
                      <msub>
                        <mi>s</mi>
                        <mi>k</mi>
                      </msub>
                      <mo>−</mo>
                      <mi>m</mi>
                      <mo>)</mo>
                    </mrow>
                    <mrow>
                      <munderover>
                        <mo>∑</mo>
                        <mrow>
                          <mi>j</mi>
                          <mo>=</mo>
                          <mn>0</mn>
                        </mrow>
                        <mn>9</mn>
                      </munderover>
                      <mi>exp</mi>
                      <mo>(</mo>
                      <msub>
                        <mi>s</mi>
                        <mi>j</mi>
                      </msub>
                      <mo>−</mo>
                      <mi>m</mi>
                      <mo>)</mo>
                    </mrow>
                  </mfrac>
                  <mtext>, onde </mtext>
                  <mi>m</mi>
                  <mo>=</mo>
                  <munder>
                    <mi>max</mi>
                    <mi>j</mi>
                  </munder>
                  <msub>
                    <mi>s</mi>
                    <mi>j</mi>
                  </msub>
                </mrow>
              </math>
              <p className="pixel-caption">
                Nesta amostra: maior logit{' '}
                <code>m = {formatPixelNumber(softmaxStep.maximum, 5)}</code>,
                soma das exponenciais deslocadas{' '}
                <code>
                  Σ exp(s_j - m) ={' '}
                  {formatPixelNumber(softmaxStep.denominator, 5)}
                </code>
                , produzindo{' '}
                <code>
                  p[{activeResult.winnerIndex}] ={' '}
                  {formatPixelNumber(activeResult.confidence * 100, 2)}%
                </code>{' '}
                para <strong>{activeResult.winnerClass.pt}</strong>.
              </p>
            </section>

            <section className="pixel-subpanel">
              <h3>
                <Layers size={18} /> 4. Cross-Entropy, Retropropagação e
                Otimizador Adam
              </h3>
              <math
                display="block"
                aria-label="L igual a menos a soma em k de y k vezes ln de p k, igual a menos ln de p y"
              >
                <mrow>
                  <mi>L</mi>
                  <mo>=</mo>
                  <mo>−</mo>
                  <munderover>
                    <mo>∑</mo>
                    <mrow>
                      <mi>k</mi>
                      <mo>=</mo>
                      <mn>0</mn>
                    </mrow>
                    <mn>9</mn>
                  </munderover>
                  <msub>
                    <mi>y</mi>
                    <mi>k</mi>
                  </msub>
                  <mi>ln</mi>
                  <mo>(</mo>
                  <msub>
                    <mi>p</mi>
                    <mi>k</mi>
                  </msub>
                  <mo>)</mo>
                  <mo>=</mo>
                  <mo>−</mo>
                  <mi>ln</mi>
                  <mo>(</mo>
                  <msub>
                    <mi>p</mi>
                    <mtext>verdadeira</mtext>
                  </msub>
                  <mo>)</mo>
                  <mtext>, </mtext>
                  <mfrac>
                    <mrow>
                      <mo>∂</mo>
                      <mi>L</mi>
                    </mrow>
                    <mrow>
                      <mo>∂</mo>
                      <msub>
                        <mi>s</mi>
                        <mi>k</mi>
                      </msub>
                    </mrow>
                  </mfrac>
                  <mo>=</mo>
                  <msub>
                    <mi>p</mi>
                    <mi>k</mi>
                  </msub>
                  <mo>−</mo>
                  <msub>
                    <mi>y</mi>
                    <mi>k</mi>
                  </msub>
                </mrow>
              </math>
              <p className="pixel-caption">
                Para o rótulo verdadeiro{' '}
                <code>
                  y = {ceStep.trueClassIndex} ({ceStep.trueClass.pt})
                </code>
                , a probabilidade atribuída foi{' '}
                <code>
                  p_y = {formatPixelNumber(ceStep.trueProbability * 100, 2)}%
                </code>
                , resultando em perda{' '}
                <code>
                  L = {formatPixelNumber(ceStep.exactCrossEntropy, 5)}
                </code>
                . No treinamento offline, a retropropagação usa a regra da
                cadeia a partir de <code>∂L/∂s_k = p_k - y_k</code> para obter
                os gradientes de cada filtro e camada densa, e o otimizador{' '}
                <strong>Adam</strong> atualiza os 61.130 parâmetros usando
                médias móveis de 1ª e 2ª ordem. Durante o uso no navegador, os
                pesos permanecem congelados.
              </p>
            </section>
          </div>
        )}
      </article>
    </div>
  );
}
