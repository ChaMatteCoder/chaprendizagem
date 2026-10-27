import { RefreshCw } from 'lucide-react';
import {
  PIXEL_INTERFERENCE_PRESETS,
  PIXEL_TOOL_LIMITS,
} from '../data/cifar10Schema.js';
import { formatPixelNumber } from '../lib/cnnMath.js';
import PixelCanvas from './PixelCanvas.jsx';
import PixelPrediction from './PixelPrediction.jsx';

const controls = [
  {
    id: 'brightness',
    label: 'Brilho',
    description: 'Adiciona ou retira luz dos três canais.',
    format: (v) => `${v > 0 ? '+' : ''}${v}`,
  },
  {
    id: 'contrast',
    label: 'Contraste',
    description: 'Afasta ou aproxima os tons do cinza médio.',
    format: (v) => `${formatPixelNumber(v, 2)}×`,
  },
  {
    id: 'noiseStd',
    label: 'Ruído',
    description: 'Adiciona granulação com uma semente fixa.',
    format: (v) => `±${v}`,
  },
  {
    id: 'smoothing',
    label: 'Suavização',
    description: 'Mistura cada pixel com a média de seus vizinhos.',
    format: (v) => `${formatPixelNumber(v * 100, 0)}%`,
  },
];

export default function PixelLabRobustnessSection({
  bundle,
  currentSample,
  perturbation,
  onUpdatePerturbation,
  onResetPerturbation,
  processedImages,
  inspection,
  replayContext,
}) {
  const { robustness } = bundle;
  const clean = inspection.cleanResult;
  const transformed = inspection.transformedResult;
  return (
    <div className="pixel-stack">
      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <h2>Mesma rede. Outros pixels.</h2>
          <button
            type="button"
            className="pixel-btn is-small is-outline"
            onClick={onResetPerturbation}
          >
            <RefreshCw size={15} />
            {replayContext
              ? 'Explorar a partir do original'
              : 'Restaurar original'}
          </button>
        </div>
        <p>
          {replayContext
            ? 'Esta comparação reproduz os pixels exatos do último teste do jogo. Restaure o original para começar uma nova exploração com os controles abaixo.'
            : 'Mova um controle e observe como o palpite muda. A rede é a mesma: seus pesos não são atualizados.'}
        </p>
        <div className="pixel-workbench-grid">
          <div className="pixel-sliders-panel">
            <fieldset
              disabled={Boolean(replayContext)}
              className="pixel-perturbation-fields"
            >
              <legend className="pixel-sr-only">Alterações da imagem</legend>
              {controls.map(({ id, label, description, format }) => (
                <label className="pixel-slider-field" key={id}>
                  <div>
                    <strong>{label}</strong>
                    <output>
                      {replayContext ? '—' : format(perturbation[id])}
                    </output>
                  </div>
                  <input
                    type="range"
                    aria-label={`Alterar ${label.toLowerCase()}`}
                    min={PIXEL_TOOL_LIMITS[id].min}
                    max={PIXEL_TOOL_LIMITS[id].max}
                    step={PIXEL_TOOL_LIMITS[id].step}
                    value={perturbation[id]}
                    onChange={(e) =>
                      onUpdatePerturbation({ [id]: Number(e.target.value) })
                    }
                  />
                  <small>{description}</small>
                </label>
              ))}
            </fieldset>
            <details className="pixel-details">
              <summary>Experimentar interferências do jogo</summary>
              <div className="pixel-preset-pills">
                {PIXEL_INTERFERENCE_PRESETS.map((preset, index) => (
                  <button
                    type="button"
                    key={preset.id}
                    className="pixel-btn is-small is-outline"
                    onClick={() =>
                      onUpdatePerturbation({
                        contrast: preset.contrast,
                        brightness: preset.brightness,
                        noiseStd: preset.noiseStd,
                        seed: 2026 + index * 101,
                        smoothing: 0,
                      })
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </details>
          </div>
          <div>
            <div className="pixel-pair-canvases">
              <div>
                <PixelCanvas
                  pixels={processedImages.originalPixels}
                  label="Original"
                  caption={`Resposta: ${currentSample.classNamePt}`}
                />
                <PixelPrediction
                  prediction={clean}
                  title="Sem alterações"
                  compact
                />
              </div>
              <div>
                <PixelCanvas
                  pixels={processedImages.transformedPixels}
                  label={
                    replayContext
                      ? 'Último teste da rodada'
                      : 'Com suas alterações'
                  }
                  caption="Os pixels exibidos entram na CNN"
                />
                <PixelPrediction
                  prediction={transformed}
                  title="Depois das alterações"
                  compact
                />
              </div>
            </div>
            {inspection.status === 'loading' && (
              <p className="pixel-caption" role="status">
                Atualizando previsões…
              </p>
            )}
            <p className="pixel-caption">
              {processedImages.diffStats.changedPixels} de 1.024 pixels mudaram.
              Uma nova previsão não garante melhora no reconhecimento.
            </p>
          </div>
        </div>
        <details className="pixel-details" style={{ marginTop: 24 }}>
          <summary>Ver fórmulas e ordem das transformações</summary>
          <div>
            <p className="pixel-caption">
              Na bancada, a ordem é contraste → brilho → ruído → clipping e
              arredondamento → suavização. O ruído é uniforme com seed fixa{' '}
              {perturbation.seed}; mover um controle preserva a mesma realização
              do ruído.
            </p>
            <p className="pixel-caption">
              <code>v = 127,5 + α(x − 127,5) + β + σ·n(seed)</code>, com n entre
              −1 e 1. Limitamos os canais a [0, 255] antes da suavização.
            </p>
            <p className="pixel-caption">
              Suavização: <code>y = (1 − λ)x + λ·média3×3(x)</code>, com
              repetição do pixel da borda. O jogo aplica suas ferramentas à
              imagem recebida na ordem suavização → contraste → brilho. A tabela
              abaixo compara condições previamente definidas, registradas junto
              ao checkpoint.
            </p>
          </div>
        </details>
      </article>
      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <div>
            <p className="pixel-eyebrow">Do exemplo ao conjunto completo</p>
            <h2>Uma foto não mede robustez.</h2>
          </div>
          <span className="pixel-tag">
            {robustness.sampleCount.toLocaleString('pt-BR')} imagens da
            validação
          </span>
        </div>
        <p>
          Esta tabela registra o desempenho nas mesmas imagens sob cada
          condição. A diferença em pontos percentuais compara a acurácia com as
          imagens originais.
        </p>
        <div
          className="pixel-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Resultados de robustez no conjunto de validação"
        >
          <table className="pixel-table">
            <caption>
              Condições predefinidas · Seed base {robustness.seedBase} · Modelo
              congelado
            </caption>
            <thead>
              <tr>
                <th>Condição</th>
                <th>Acurácia</th>
                <th>Diferença</th>
                <th>Macro-F1</th>
                <th>Cross-entropy</th>
              </tr>
            </thead>
            <tbody>
              {robustness.conditions.map((condition) => (
                <tr
                  key={condition.id}
                  className={
                    condition.kind === 'baseline' ? 'is-highlighted' : ''
                  }
                >
                  <th scope="row">{condition.label}</th>
                  <td>
                    <strong>
                      {formatPixelNumber(condition.accuracy * 100, 2)}%
                    </strong>
                  </td>
                  <td>
                    {condition.kind === 'baseline'
                      ? 'Referência'
                      : `${condition.accuracyDeltaVsClean >= 0 ? '+' : ''}${formatPixelNumber(condition.accuracyDeltaVsClean * 100, 2)} p.p.`}
                  </td>
                  <td>{formatPixelNumber(condition.macroF1 * 100, 2)}%</td>
                  <td>{formatPixelNumber(condition.crossEntropy, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="pixel-details">
          <summary>
            Consultar parâmetros e mudanças de acerto por condição
          </summary>
          <div>
            <p className="pixel-caption">{robustness.note}</p>
            <div
              className="pixel-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Parâmetros e transições de robustez"
            >
              <table className="pixel-table">
                <caption>
                  α = contraste · β = brilho · σ = amplitude do ruído uniforme
                </caption>
                <thead>
                  <tr>
                    <th>Condição</th>
                    <th>α / β / σ</th>
                    <th>Manteve acerto</th>
                    <th>Acerto → erro</th>
                    <th>Erro → acerto</th>
                    <th>Manteve erro</th>
                  </tr>
                </thead>
                <tbody>
                  {robustness.conditions.map((condition) => (
                    <tr key={condition.id}>
                      <th scope="row">{condition.label}</th>
                      <td>
                        {condition.params.contrast} /{' '}
                        {condition.params.brightness} /{' '}
                        {condition.params.noiseStd}
                      </td>
                      {[
                        'keptCorrect',
                        'degradedToError',
                        'recoveredToCorrect',
                        'keptError',
                      ].map((key) => (
                        <td key={key}>
                          {condition.transitionsVsClean[key].toLocaleString(
                            'pt-BR',
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </article>
    </div>
  );
}
