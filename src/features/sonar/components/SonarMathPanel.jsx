import { useState } from 'react';
import { Calculator, Eye, Sigma } from 'lucide-react';
import { explainLabeledPrediction, explainNeuron, stableSoftmax, formatSonarNumber as number } from '../lib/math/sonarMath.js';

function Formula({ kind }) {
  const labels = { weighted: 'z igual a W vezes a mais b', relu: 'ReLU de z é o máximo entre zero e z',
    softmax: 'p k igual a exponencial de z k menos o maior logit, dividida pela soma dessas exponenciais',
    loss: 'L igual ao negativo da soma de y k vezes o logaritmo natural de p k', gradient: 'Derivada da perda em relação a z k é p k menos y k' };
  return <math display="block" aria-label={labels[kind]}>
    {kind === 'weighted' && <mrow><mi>z</mi><mo>=</mo><mi>W</mi><mi>a</mi><mo>+</mo><mi>b</mi></mrow>}
    {kind === 'relu' && <mrow><mi>ReLU</mi><mo>(</mo><mi>z</mi><mo>)</mo><mo>=</mo><mi>max</mi><mo>(</mo><mn>0</mn><mo>,</mo><mi>z</mi><mo>)</mo></mrow>}
    {kind === 'softmax' && <mrow><msub><mi>p</mi><mi>k</mi></msub><mo>=</mo><mfrac>
      <mrow><mi>exp</mi><mo>(</mo><msub><mi>z</mi><mi>k</mi></msub><mo>−</mo><mi>max</mi><mo>(</mo><mi>z</mi><mo>)</mo><mo>)</mo></mrow>
      <mrow><msub><mo>∑</mo><mi>j</mi></msub><mi>exp</mi><mo>(</mo><msub><mi>z</mi><mi>j</mi></msub><mo>−</mo><mi>max</mi><mo>(</mo><mi>z</mi><mo>)</mo><mo>)</mo></mrow>
    </mfrac></mrow>}
    {kind === 'loss' && <mrow><mi>L</mi><mo>=</mo><mo>−</mo><msub><mo>∑</mo><mi>k</mi></msub><msub><mi>y</mi><mi>k</mi></msub><mi>ln</mi><mo>(</mo><msub><mi>p</mi><mi>k</mi></msub><mo>)</mo></mrow>}
    {kind === 'gradient' && <mrow><mfrac><mrow><mo>∂</mo><mi>L</mi></mrow><mrow><mo>∂</mo><msub><mi>z</mi><mi>k</mi></msub></mrow></mfrac><mo>=</mo><msub><mi>p</mi><mi>k</mi></msub><mo>−</mo><msub><mi>y</mi><mi>k</mi></msub></mrow>}
  </math>;
}

export default function SonarMathPanel({ result, sample, onTrace, inspection, allowReveal = true, labelRevealed = false }) {
  const [layerIndex, setLayerIndex] = useState(0);
  const [neuronIndex, setNeuronIndex] = useState(0);
  const [localRevealed, setRevealed] = useState(false);
  const revealed = labelRevealed || (allowReveal && localRevealed);
  const trace = result?.trace;
  if (!trace) return <article className="sonarlab-panel sonarlab-math"><h2><Calculator /> Ver cálculo passo a passo</h2>
    <p>Inspecione as contas do modelo selecionado para {sample.id}. Os valores vêm dos pesos reais.</p>
    <button type="button" className="sonarlab-button is-yellow" onClick={onTrace} disabled={inspection.status === 'loading'}><Sigma /> {inspection.status === 'loading' ? 'Calculando…' : 'Carregar trace real'}</button>
    {inspection.error && <p role="alert" className="sonarlab-error">{inspection.error}</p>}</article>;
  const layer = trace.layers[layerIndex];
  const neuron = explainNeuron(layer, neuronIndex);
  const softmax = stableSoftmax(trace.logits);
  const labeled = revealed ? explainLabeledPrediction(trace, sample.label, { revealed: true }) : null;
  return <article className="sonarlab-panel sonarlab-math"><h2><Calculator /> Por dentro da decisão</h2>
    <p className="sonarlab-caption">{sample.id} · {result.modelKind === 'official' ? 'Oficial congelado' : 'Experimental'} · <code>{result.modelId}</code></p>
    <p>Abra cada etapa para seguir o mesmo cálculo da inferência. Os números são arredondados apenas na tela.</p>
    <details className="sonarlab-math-step" open><summary><span>1</span> Vetor de entrada</summary>
      <p><strong>a</strong> é a entrada: shape [60], valores originais de energia normalizada, sem o rótulo. Na inferência, o lote tem shape [1, 60].</p>
      <div className="sonarlab-vector">{trace.input.map((value, i) => <span key={i}><small>a<sub>{i + 1}</sub></small>{number(value, 6)}</span>)}</div>
    </details>
    <details className="sonarlab-math-step"><summary><span>2</span> Soma ponderada e ReLU</summary>
      <div className="sonarlab-field-pair"><label>Camada oculta<select value={layerIndex} onChange={event => { setLayerIndex(Number(event.target.value)); setNeuronIndex(0); }}>
        {trace.layers.slice(0, -1).map((row, i) => <option key={row.name} value={i}>Oculta {i + 1} · {row.bias.length} neurônios</option>)}</select></label>
        <label>Neurônio<select value={neuronIndex} onChange={event => setNeuronIndex(Number(event.target.value))}>{layer.bias.map((_, i) => <option value={i} key={i}>Neurônio {i + 1}</option>)}</select></label></div>
      <Formula kind="weighted" />
      <p><strong>W</strong> são os pesos, <strong>b</strong> é o bias e <strong>z</strong> é a soma antes da ativação. Nesta camada: a [{layer.input.length}], W [{layer.bias.length}, {layer.input.length}], b e z [{layer.bias.length}]. O kernel do TensorFlow.js armazena a transposta de W: [{layer.kernelShape.join(', ')}], como [entrada, saída].</p>
      <div className="sonarlab-calculation"><span>Soma dos produtos <strong>{number(neuron.sum, 8)}</strong></span><span>Bias <strong>{number(neuron.bias, 8)}</strong></span><span>z observado <strong>{number(neuron.observedZ, 8)}</strong></span></div>
      <details className="sonarlab-details"><summary>Ver todos os produtos aᵢ × wᵢ</summary><div className="sonarlab-table-scroll" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal"><table><caption>Termos do neurônio {neuronIndex + 1}, camada {layerIndex + 1}</caption>
        <thead><tr><th>i</th><th>aᵢ</th><th>wᵢ</th><th>aᵢ × wᵢ</th></tr></thead><tbody>{neuron.terms.map(term => <tr key={term.index}><th scope="row">{term.index}</th><td>{number(term.input, 8)}</td><td>{number(term.weight, 8)}</td><td>{number(term.product, 8)}</td></tr>)}</tbody>
      </table></div><p>Acúmulo em JavaScript: {number(neuron.computedZ, 8)}. O kernel float32 registrou {number(neuron.observedZ, 8)}; a ordem de acumulação pode gerar pequenas diferenças numéricas.</p></details>
      <Formula kind="relu" /><p>ReLU preserva valores positivos e transforma negativos em zero. Ativação real deste neurônio: <strong>{number(neuron.output, 8)}</strong>.</p>
      <p className="sonarlab-note">Essa ativação é um cálculo observado. Ela não prova que o neurônio “detecta metal” nem explica causalmente o objeto.</p>
    </details>
    <details className="sonarlab-math-step"><summary><span>3</span> Logits e Softmax estável</summary>
      <p>A camada final gera dois logits z, shape [2], na ordem <strong>Rocha (R), Metal (M)</strong>.</p>
      <div className="sonarlab-calculation"><span>z Rocha <strong>{number(trace.logits[0], 8)}</strong></span><span>z Metal <strong>{number(trace.logits[1], 8)}</strong></span></div>
      <Formula kind="softmax" />
      <p>Subtrair o maior logit preserva as probabilidades e evita exponenciais grandes. k indica a classe; j percorre as duas saídas.</p>
      <div className="sonarlab-table-scroll" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal"><table><caption>Conversão dos logits em probabilidades</caption><thead><tr><th>Classe</th><th>exp(zₖ − max(z))</th><th>p observado</th></tr></thead>
        <tbody>{['Rocha', 'Metal'].map((name, i) => <tr key={name}><th scope="row">{name}</th><td>{number(softmax.exponentials[i], 8)}</td><td>{number(trace.probabilities[i], 8)}</td></tr>)}</tbody></table></div>
      <p>Maior logit: {number(softmax.maximum, 8)}. Soma das exponenciais: {number(softmax.denominator, 8)}. Trace e inferência conferidos com tolerância 10⁻⁵.</p>
    </details>
    <details className="sonarlab-math-step"><summary><span>4</span> Argmax: escolher a maior probabilidade</summary>
      <p><strong>argmax(p) = {result.predictedIndex} → {result.predictedLabel === 'R' ? 'Rocha' : 'Metal'}</strong>. A distribuição é [{trace.probabilities.map(value => number(value, 8)).join('; ')}]. Em empate, escolhe o índice 0 (Rocha).</p>
      <p>Probabilidade Softmax não é garantia de acerto e não foi calibrada neste experimento.</p>
    </details>
    <details className="sonarlab-math-step"><summary><span>5</span> Rótulo, cross-entropy e gradiente</summary>
      {!revealed ? <><p>A perda depende do rótulo verdadeiro. Revele-o para acrescentar esse cálculo; a inferência já ocorreu sem receber a resposta.</p>
        {allowReveal ? <button type="button" className="sonarlab-button is-outline" onClick={() => setRevealed(true)}><Eye size={18} /> Revelar rótulo e calcular perda</button> : <p className="sonarlab-note">Disponível após “Revelar resultado” no encontro da missão.</p>}</> : <>
        <p>Rótulo: <strong>{sample.label === 'R' ? 'Rocha' : 'Metal'}</strong>. y é o vetor one-hot na ordem R/M: [{labeled.oneHot.join(', ')}].</p>
        <Formula kind="loss" /><p>A perda do exemplo é <strong>{number(labeled.crossEntropy, 8)}</strong>. Ela penaliza a baixa probabilidade atribuída à classe verdadeira. Minimizar cross-entropy equivale a maximizar a verossimilhança dos rótulos corretos.</p>
        <p className="sonarlab-caption">Aqui usamos log-sum-exp dos logits, sem clipping, para evitar ln(0) por underflow. A loss oficial média usa o clipping da biblioteca, conforme o protocolo. Nenhum valor exibido arredondado entra no cálculo.</p>
        <Formula kind="gradient" /><p>Para este exemplo, ∂L/∂z = [{labeled.gradientLogits.map(value => number(value, 8)).join('; ')}]. Shape [2], sem média de mini-batch.</p>
        <p>A retropropagação aplica a regra da cadeia da perda até os pesos anteriores. O treinamento usa Adam, com momentos e correções próprias; esses valores do trace não executam uma atualização de pesos.</p>
      </>}
    </details>
  </article>;
}
