import {
  CIFAR10_CLASSES,
  PIXEL_CNN_ARCHITECTURE,
  PIXEL_IMAGE_SPEC,
} from '../data/cifar10Schema.js';
import {
  normalizePixelsToFloat32,
  validateNormalizedFloat32,
  validateRgbUint8,
} from './pixelOps.js';

function abortIf(condition, message = 'Operação Pixel cancelada.') {
  if (condition) {
    const error = new Error(message);
    error.name = 'AbortError';
    throw error;
  }
}

/**
 * Valida o vetor de 10 probabilidades retornado pela CNN e identifica a classe vencedora e o Top 3.
 */
export function validatePixelProbabilities(values) {
  if (!Array.isArray(values) && !(values instanceof Float32Array) && !(values instanceof Float64Array)) {
    throw new Error('As probabilidades retornadas pelo modelo devem ser uma lista numérica.');
  }
  const arr = Array.from(values, Number);
  if (arr.length !== CIFAR10_CLASSES.length) {
    throw new Error(`Esperadas ${CIFAR10_CLASSES.length} probabilidades, recebidas ${arr.length}.`);
  }
  let sum = 0;
  let winnerIndex = 0;
  let maxProb = -Infinity;

  for (let i = 0; i < arr.length; i += 1) {
    const p = arr[i];
    if (!Number.isFinite(p) || p < -1e-6 || p > 1 + 1e-6) {
      throw new Error(`Probabilidade inválida na classe ${i}: ${p}`);
    }
    sum += p;
    if (p > maxProb) {
      maxProb = p;
      winnerIndex = i;
    }
  }
  if (Math.abs(sum - 1) > 1e-3) {
    throw new Error(`A soma das probabilidades (${sum}) diverge de 1.`);
  }

  const ranked = CIFAR10_CLASSES.map((cls, index) => ({
    index,
    id: cls.id,
    en: cls.en,
    pt: cls.pt,
    probability: Math.min(1, Math.max(0, arr[index])),
  }));

  const top3 = [...ranked].sort((a, b) => b.probability - a.probability || a.index - b.index).slice(0, 3);

  return {
    probabilities: ranked.map((r) => r.probability),
    rankedProbabilities: ranked,
    top3,
    winnerIndex,
    winnerClass: CIFAR10_CLASSES[winnerIndex],
    confidence: ranked[winnerIndex].probability,
  };
}

/**
 * Valida que o modelo carregado respeita a arquitetura, contagem de parâmetros e ordem de classes do manifesto.
 */
export function validatePixelModelContract(model, manifest) {
  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    manifest.kind !== 'official' ||
    manifest.smoke !== false ||
    manifest.evaluation?.status !== 'completed' ||
    typeof manifest.modelId !== 'string' ||
    !manifest.modelId
  ) {
    throw new Error('Manifesto do modelo Pixel inválido, incompleto ou proveniente de smoke test.');
  }

  const expectedOrder = CIFAR10_CLASSES.map((c) => ({ index: c.index, en: c.en, pt: c.pt }));
  if (JSON.stringify(manifest.classOrder) !== JSON.stringify(expectedOrder)) {
    throw new Error('A ordem das classes no manifesto diverge do padrão canônico CIFAR-10 (0 a 9).');
  }

  if (
    JSON.stringify(model?.inputs?.map((i) => i.shape)) !== '[[null,32,32,3]]' ||
    JSON.stringify(model?.outputs?.map((o) => o.shape)) !== '[[null,10]]'
  ) {
    throw new Error('As dimensões de entrada [null,32,32,3] ou saída [null,10] do modelo são incompatíveis.');
  }

  if (
    model.countParams() !== PIXEL_CNN_ARCHITECTURE.totalParameters ||
    manifest.parameterCount !== PIXEL_CNN_ARCHITECTURE.totalParameters
  ) {
    throw new Error(
      `Contagem de parâmetros incompatível: esperado ${PIXEL_CNN_ARCHITECTURE.totalParameters}, obtido ${model.countParams()}.`,
    );
  }

  const expectedLayers = PIXEL_CNN_ARCHITECTURE.layers.filter((l) => l.className !== 'InputLayer');
  const actualLayers = model.layers.filter((l) => l.getClassName() !== 'InputLayer');
  if (actualLayers.length !== expectedLayers.length) {
    throw new Error(`Número de camadas incompatível: esperado ${expectedLayers.length}, obtido ${actualLayers.length}.`);
  }

  for (let i = 0; i < expectedLayers.length; i += 1) {
    const exp = expectedLayers[i];
    const act = actualLayers[i];
    if (act.getClassName() !== exp.className || act.countParams() !== exp.parameters) {
      throw new Error(
        `Camada ${i + 1} (${act.name}) incompatível: esperado ${exp.className} (${exp.parameters} params), obtido ${act.getClassName()} (${act.countParams()} params).`,
      );
    }
  }
}

/**
 * Executa a propagação direta camada por camada usando os pesos reais do modelo carregado.
 * Não recebe rótulo nem altera pesos. Descarta todos os tensores intermediários via tf.tidy().
 */
export function tracePixelCnn(tf, model, normalizedFloat32, { includeSpatialMaps = true } = {}) {
  const checkedInput = validateNormalizedFloat32(normalizedFloat32);

  return tf.tidy(() => {
    const x = tf.tensor4d(checkedInput, [1, PIXEL_IMAGE_SPEC.height, PIXEL_IMAGE_SPEC.width, PIXEL_IMAGE_SPEC.channels]);
    const convLayers = model.layers.filter((l) => l.getClassName() === 'Conv2D');
    const denseLayers = model.layers.filter((l) => l.getClassName() === 'Dense');

    const [w1, b1] = convLayers[0].getWeights();
    const z1 = tf.add(tf.conv2d(x, w1, [1, 1], 'same'), b1);
    const a1 = tf.relu(z1);
    const p1 = tf.maxPool(a1, [2, 2], [2, 2], 'valid');

    const [w2, b2] = convLayers[1].getWeights();
    const z2 = tf.add(tf.conv2d(p1, w2, [1, 1], 'same'), b2);
    const a2 = tf.relu(z2);
    const p2 = tf.maxPool(a2, [2, 2], [2, 2], 'valid');

    const [w3, b3] = convLayers[2].getWeights();
    const z3 = tf.add(tf.conv2d(p2, w3, [1, 1], 'same'), b3);
    const a3 = tf.relu(z3);

    const gap = tf.mean(a3, [1, 2]);

    const [wd1, bd1] = denseLayers[0].getWeights();
    const zd1 = tf.add(tf.matMul(gap, wd1), bd1);
    const ad1 = tf.relu(zd1);

    const [wd2, bd2] = denseLayers[1].getWeights();
    const logitsTensor = tf.add(tf.matMul(ad1, wd2), bd2);
    const probsTensor = tf.softmax(logitsTensor);

    const logits = Array.from(logitsTensor.dataSync());
    const probabilities = Array.from(probsTensor.dataSync());

    if (!includeSpatialMaps) {
      return {
        logits,
        probabilities,
      };
    }

    return {
      logits,
      probabilities,
      conv1Kernel: w1.arraySync(),
      conv1Bias: Array.from(b1.dataSync()),
      layers: {
        conv2d_1: {
          preRelu: z1.squeeze([0]).arraySync(),
          postRelu: a1.squeeze([0]).arraySync(),
        },
        max_pooling2d_1: {
          output: p1.squeeze([0]).arraySync(),
        },
        conv2d_2: {
          preRelu: z2.squeeze([0]).arraySync(),
          postRelu: a2.squeeze([0]).arraySync(),
        },
        max_pooling2d_2: {
          output: p2.squeeze([0]).arraySync(),
        },
        conv2d_3: {
          preRelu: z3.squeeze([0]).arraySync(),
          postRelu: a3.squeeze([0]).arraySync(),
        },
        global_average_pooling2d_1: {
          output: Array.from(gap.squeeze([0]).dataSync()),
        },
        dense_1: {
          preRelu: Array.from(zd1.squeeze([0]).dataSync()),
          postRelu: Array.from(ad1.squeeze([0]).dataSync()),
        },
        dense_2: {
          logits,
          probabilities,
        },
      },
    };
  });
}

/**
 * Cria o serviço preditor proprietário do modelo TensorFlow.js.
 * Recebe exclusivamente pixels uint8 [0..255] ou float32 [0..1] (32×32×3), nunca o rótulo.
 */
export function createPixelPredictor(tf, model, manifest) {
  validatePixelModelContract(model, manifest);
  const metadata = structuredClone(manifest);
  let closed = false;
  let activeCount = 0;
  let disposed = false;

  function releaseIfIdle() {
    if (closed && activeCount === 0 && !disposed) {
      disposed = true;
      model.dispose();
    }
  }

  return {
    get metadata() {
      return structuredClone(metadata);
    },
    get isDisposed() {
      return disposed;
    },
    dispose() {
      closed = true;
      releaseIfIdle();
    },
    async predict(pixelsInput, { signal, includeActivations = false } = {}) {
      abortIf(closed || signal?.aborted);

      // Extrai apenas os pixels numéricos; ignora qualquer outra propriedade se um objeto for passado
      const rawBuffer = pixelsInput?.pixels ? pixelsInput.pixels : pixelsInput;
      const uint8Pixels = validateRgbUint8(rawBuffer);
      const normalized = normalizePixelsToFloat32(uint8Pixels);

      activeCount += 1;
      let directTensor = null;
      try {
        const started = performance.now();
        directTensor = tf.tidy(() => model.predict(tf.tensor4d(normalized, [1, 32, 32, 3])));
        const directProbs = Array.from(await directTensor.data());
        abortIf(closed || signal?.aborted);

        const validated = validatePixelProbabilities(directProbs);
        const trace = tracePixelCnn(tf, model, normalized, { includeSpatialMaps: includeActivations });

        const maxDiff = Math.max(
          ...validated.probabilities.map((p, idx) => Math.abs(p - trace.probabilities[idx])),
        );
        if (maxDiff > 1e-5) {
          throw new Error(`Divergência numérica entre inferência direta e trace: ${maxDiff}`);
        }

        const finished = performance.now();
        return {
          modelId: metadata.modelId,
          modelKind: metadata.kind,
          classOrder: structuredClone(metadata.classOrder),
          probabilities: validated.probabilities,
          rankedProbabilities: validated.rankedProbabilities,
          top3: validated.top3,
          winnerIndex: validated.winnerIndex,
          winnerClass: validated.winnerClass,
          confidence: validated.confidence,
          logits: trace.logits,
          inferenceMs: finished - started,
          ...(includeActivations
            ? {
                activations: {
                  normalizedInput: Array.from(normalized),
                  conv1Kernel: trace.conv1Kernel,
                  conv1Bias: trace.conv1Bias,
                  layers: trace.layers,
                },
              }
            : {}),
        };
      } finally {
        if (directTensor) tf.dispose(directTensor);
        activeCount -= 1;
        releaseIfIdle();
      }
    },
  };
}
