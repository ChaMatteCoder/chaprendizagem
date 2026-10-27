import { CIFAR10_CLASSES } from '../data/cifar10Schema.js';
import { formatPixelNumber } from '../lib/cnnMath.js';
import PixelCanvas from './PixelCanvas.jsx';
import PixelPrediction from './PixelPrediction.jsx';

export default function PixelLabDataSection({
  bundle,
  currentSample,
  processedImages,
  inspection,
  replayContext,
}) {
  const prediction = inspection.transformedResult || inspection.cleanResult;
  const top3 = new Set(prediction?.top3.map((item) => item.index));
  return (
    <div className="pixel-stack">
      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <h2>Uma foto, três canais, dez possibilidades.</h2>
          <span className="pixel-tag">
            Resposta real: {currentSample.classNamePt}
          </span>
        </div>
        <div className="pixel-data-layout">
          <div className="pixel-data-visual">
            <PixelCanvas
              pixels={processedImages.transformedPixels}
              label={
                replayContext
                  ? 'Imagem testada no jogo'
                  : processedImages.isModified
                    ? 'Imagem com alterações'
                    : 'Entrada da CNN'
              }
              caption="32 × 32 pixels · RGB · 3.072 valores"
            />
            <div className="pixel-data-channels">
              {['r', 'g', 'b'].map((mode, index) => (
                <PixelCanvas
                  key={mode}
                  pixels={processedImages.transformedPixels}
                  mode={mode}
                  size="sm"
                  label={['Vermelho · R', 'Verde · G', 'Azul · B'][index]}
                />
              ))}
            </div>
            {processedImages.isModified && (
              <details className="pixel-details is-subtle">
                <summary>Comparar com a fotografia original</summary>
                <div>
                  <PixelCanvas
                    pixels={processedImages.originalPixels}
                    label="Original sem alterações"
                    size="sm"
                  />
                </div>
              </details>
            )}
          </div>
          <div className="pixel-data-prediction">
            {prediction ? (
              <>
                <PixelPrediction
                  prediction={prediction}
                  trueIndex={currentSample.label}
                  compact
                />
                <p className="pixel-caption">
                  {prediction.winnerIndex === currentSample.label
                    ? 'O palpite corresponde à resposta desta imagem.'
                    : `O palpite não corresponde à resposta: ${currentSample.classNamePt}.`}{' '}
                  A rede recebe só os pixels; o rótulo é usado depois para
                  conferir.
                </p>
                <div
                  className="pixel-prob-bars"
                  aria-label="Probabilidades das dez classes"
                >
                  {CIFAR10_CLASSES.map((cls) => (
                    <div
                      key={cls.id}
                      className={`pixel-prob-row${top3.has(cls.index) ? ' is-top3' : ''}${prediction.winnerIndex === cls.index ? ' is-winner' : ''}${currentSample.label === cls.index ? ' is-true' : ''}`}
                    >
                      <span className="pixel-prob-row__label">{cls.pt}</span>
                      <div
                        className="pixel-prob-row__track"
                        role="progressbar"
                        aria-label={`Probabilidade de ${cls.pt}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Number(
                          (prediction.probabilities[cls.index] * 100).toFixed(
                            1,
                          ),
                        )}
                      >
                        <span
                          style={{
                            width: `${prediction.probabilities[cls.index] * 100}%`,
                          }}
                        />
                      </div>
                      <span className="pixel-prob-row__val">
                        {formatPixelNumber(
                          prediction.probabilities[cls.index] * 100,
                          1,
                        )}
                        %
                      </span>
                    </div>
                  ))}
                </div>
                <p className="pixel-caption">
                  As três maiores probabilidades estão em verde. ✓ indica a
                  classe verdadeira.
                </p>
              </>
            ) : (
              <p role="status">
                {inspection.status === 'error'
                  ? 'A previsão está indisponível. Use “Repetir análise” acima.'
                  : 'Calculando as probabilidades e extraindo as ativações…'}
              </p>
            )}
          </div>
        </div>
      </article>
      <div className="pixel-concept-cards">
        <article>
          <h3>Confiança</h3>
          <p>
            É o valor da saída Softmax para o palpite nesta imagem. A rede pode
            estar confiante e errada.
          </p>
        </article>
        <article>
          <h3>Acerto</h3>
          <p>
            É a comparação do palpite com o rótulo verdadeiro de uma imagem:
            acertou ou errou.
          </p>
        </article>
        <article>
          <h3>Acurácia</h3>
          <p>
            É a proporção de acertos em um conjunto inteiro. Veja a medição no
            teste oficial na etapa Avaliação.
          </p>
        </article>
      </div>
      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <h2>De onde vêm essas imagens?</h2>
          <span className="pixel-tag">CIFAR-10 · Alex Krizhevsky, 2009</span>
        </div>
        <p>
          São 60.000 fotos pequenas, divididas em dez classes. O jogo e o
          laboratório usam 100 exemplos da validação. O teste oficial fica
          separado da escolha do modelo.
        </p>
        <div className="pixel-split-strip">
          {[
            ['Treinamento', bundle.partitions.counts.train],
            ['Validação', bundle.partitions.counts.validation],
            ['Teste oficial', bundle.partitions.counts.officialTest],
          ].map(([label, count]) => (
            <div key={label}>
              <strong>{count.toLocaleString('pt-BR')}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <details className="pixel-details">
          <summary>Normalização, classes e origem dos dados</summary>
          <div>
            <div className="pixel-formula-box">
              <strong>De um valor de cor a um número entre 0 e 1</strong>
              <p className="pixel-caption">
                <code>x = valor do canal / 255</code>
              </p>
              <p className="pixel-caption">
                Na imagem em estudo, o primeiro pixel é RGB [
                {processedImages.transformedPixels.slice(0, 3).join(', ')}]. A
                rede recebe [
                {Array.from(
                  processedImages.transformedPixels.slice(0, 3),
                  (v) => formatPixelNumber(v / 255, 4),
                ).join('; ')}
                ].
              </p>
            </div>
            <div
              className="pixel-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Classes e partições"
            >
              <table className="pixel-table">
                <caption>
                  Ordem das classes e partições · Seed {bundle.partitions.seed}
                </caption>
                <thead>
                  <tr>
                    <th>Índice</th>
                    <th>Classe</th>
                    <th>Treino</th>
                    <th>Validação</th>
                    <th>Teste</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.partitions.perClass.map((row) => (
                    <tr key={row.classIndex}>
                      <th scope="row">{row.classIndex}</th>
                      <td>
                        {row.classNamePt} · {row.classId}
                      </td>
                      <td>{row.train}</td>
                      <td>{row.validation}</td>
                      <td>{row.officialTest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pixel-caption">
              Amostra: <code>{currentSample.id}</code> ·{' '}
              {currentSample.sourceBatch} ·{' '}
              <code>{currentSample.sourceFilename}</code>.
            </p>
            <p className="pixel-caption">
              Modelo: <code>{bundle.manifest.modelId}</code> ·{' '}
              {bundle.manifest.parameterCount.toLocaleString('pt-BR')}{' '}
              parâmetros congelados.
            </p>
            <p className="pixel-caption">
              Arquivo de origem:{' '}
              <code>{bundle.provenance.archive.filename}</code> · SHA-256:{' '}
              <code>{bundle.provenance.archive.sha256}</code>.{' '}
              {bundle.provenance.citation}
            </p>
          </div>
        </details>
      </article>
    </div>
  );
}
