import { CIFAR10_CLASSES } from '../data/cifar10Schema.js';

export function formatPixelNumber(value, decimals = 4) {
  if (!Number.isFinite(value)) return '—';
  if (value !== 0 && Math.abs(value) < Math.pow(10, -decimals) && decimals >= 4) {
    return value.toExponential(2).replace('.', ',');
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Softmax numericamente estável por deslocamento do maior logit:
 * p_k = exp(z_k - max(z)) / sum_j exp(z_j - max(z)).
 */
export function stableSoftmax(logits) {
  if (!Array.isArray(logits) && !(logits instanceof Float32Array) && !(logits instanceof Float64Array)) {
    throw new Error('Os logits devem ser uma lista numérica.');
  }
  const values = Array.from(logits, Number);
  if (values.length === 0 || values.some((v) => !Number.isFinite(v))) {
    throw new Error('Os logits devem conter apenas números finitos.');
  }
  const maximum = Math.max(...values);
  const exponentials = values.map((v) => Math.exp(v - maximum));
  const denominator = exponentials.reduce((acc, v) => acc + v, 0);
  const probabilities = exponentials.map((v) => v / denominator);
  return {
    logits: values,
    maximum,
    exponentials,
    denominator,
    probabilities,
  };
}

/**
 * Explica a perda de entropia cruzada (cross-entropy) e o gradiente em relação aos logits.
 * Só deve ser chamada quando o rótulo verdadeiro for conhecido/revelado.
 */
export function explainCrossEntropy(logits, probabilities, trueClassIndex) {
  if (!Number.isInteger(trueClassIndex) || trueClassIndex < 0 || trueClassIndex >= CIFAR10_CLASSES.length) {
    throw new Error(`Índice de classe verdadeira inválido: ${trueClassIndex}`);
  }
  const sm = stableSoftmax(logits);
  const probs = probabilities ? Array.from(probabilities, Number) : sm.probabilities;
  const oneHot = CIFAR10_CLASSES.map((_, idx) => (idx === trueClassIndex ? 1 : 0));

  // Cálculo estável via log-sum-exp: -(z_y - max(z)) + ln(sum exp(z_j - max(z)))
  const exactCrossEntropy = -(sm.logits[trueClassIndex] - sm.maximum) + Math.log(sm.denominator);
  const trueProb = probs[trueClassIndex];
  const clippedProb = Math.min(1, Math.max(1e-7, trueProb));
  const clippedCrossEntropy = -Math.log(clippedProb);
  const gradientLogits = probs.map((p, idx) => p - oneHot[idx]);

  return {
    trueClassIndex,
    trueClass: CIFAR10_CLASSES[trueClassIndex],
    oneHot,
    trueProbability: trueProb,
    exactCrossEntropy,
    clippedCrossEntropy,
    gradientLogits,
  };
}

/**
 * Calcula passo a passo a correlação cruzada 2D multicanal da 1ª camada convolucional:
 * z[i,j,k] = b[k] + sum_{u=0..2} sum_{v=0..2} sum_{c=0..2} W[u,v,c,k] * x_pad[i+u, j+v, c]
 * onde x_pad possui padding 'same' de 1 pixel com zeros ao redor da imagem 32×32.
 */
export function explainConv1Step(
  normalizedInputFloat32,
  kernel3x3x3x32,
  bias32,
  { row, col, filterIndex },
  observedPreReluMap = null,
  observedPostReluMap = null,
) {
  if (!Number.isInteger(row) || row < 0 || row >= 32 || !Number.isInteger(col) || col < 0 || col >= 32) {
    throw new Error(`Coordenada espacial (i=${row}, j=${col}) fora dos limites 32×32.`);
  }
  if (!Number.isInteger(filterIndex) || filterIndex < 0 || filterIndex >= 32) {
    throw new Error(`Índice de filtro inválido: ${filterIndex} (esperado 0 a 31).`);
  }

  const channelNames = ['R', 'G', 'B'];
  const channels = channelNames.map((name, c) => {
    const patch = [];
    const weights = [];
    const products = [];
    let channelSum = 0;

    for (let u = 0; u < 3; u += 1) {
      const patchRow = [];
      const weightRow = [];
      const productRow = [];
      const srcRow = row + u - 1;

      for (let v = 0; v < 3; v += 1) {
        const srcCol = col + v - 1;
        const isPadded = srcRow < 0 || srcRow >= 32 || srcCol < 0 || srcCol >= 32;
        const xVal = isPadded ? 0 : Number(normalizedInputFloat32[(srcRow * 32 + srcCol) * 3 + c]);
        const u8Val = isPadded ? 0 : Math.round(xVal * 255);
        const wVal = Number(kernel3x3x3x32[u][v][c][filterIndex]);
        const prod = xVal * wVal;

        channelSum += prod;
        patchRow.push({
          u,
          v,
          srcRow,
          srcCol,
          isPadded,
          xNormalized: xVal,
          xUint8: u8Val,
        });
        weightRow.push(wVal);
        productRow.push(prod);
      }

      patch.push(patchRow);
      weights.push(weightRow);
      products.push(productRow);
    }

    return {
      channelIndex: c,
      channelName: name,
      patch,
      weights,
      products,
      channelSum,
    };
  });

  const sumProducts = channels.reduce((acc, ch) => acc + ch.channelSum, 0);
  const bias = Number(bias32[filterIndex]);
  const computedZ = bias + sumProducts;
  const computedPostRelu = Math.max(0, computedZ);

  const observedZ =
    observedPreReluMap && observedPreReluMap[row]?.[col] !== undefined
      ? Number(observedPreReluMap[row][col][filterIndex])
      : null;
  const observedPostRelu =
    observedPostReluMap && observedPostReluMap[row]?.[col] !== undefined
      ? Number(observedPostReluMap[row][col][filterIndex])
      : null;

  return {
    row,
    col,
    filterIndex,
    channels,
    sumProducts,
    bias,
    computedZ,
    computedPostRelu,
    observedZ,
    observedPostRelu,
    absDiffZ: observedZ !== null ? Math.abs(computedZ - observedZ) : null,
    absDiffPostRelu: observedPostRelu !== null ? Math.abs(computedPostRelu - observedPostRelu) : null,
  };
}

/**
 * Explica uma janela real 2×2 de MaxPooling2D (passo 2) sobre o mapa pós-ReLU da 1ª convolução.
 */
export function explainMaxPool1Window(
  postReluMap32x32x32,
  { poolRow, poolCol, filterIndex },
  observedPoolMap16x16x32 = null,
) {
  if (!Number.isInteger(poolRow) || poolRow < 0 || poolRow >= 16 || !Number.isInteger(poolCol) || poolCol < 0 || poolCol >= 16) {
    throw new Error(`Coordenada de pooling (${poolRow}, ${poolCol}) fora dos limites 16×16.`);
  }
  if (!Number.isInteger(filterIndex) || filterIndex < 0 || filterIndex >= 32) {
    throw new Error(`Índice de filtro inválido: ${filterIndex}.`);
  }

  const startRow = poolRow * 2;
  const startCol = poolCol * 2;
  const cells = [];
  let maxValue = -Infinity;
  let winner = null;

  for (let dr = 0; dr < 2; dr += 1) {
    for (let dc = 0; dc < 2; dc += 1) {
      const r = startRow + dr;
      const c = startCol + dc;
      const val = Number(postReluMap32x32x32[r][c][filterIndex]);
      const cell = { dr, dc, row: r, col: c, value: val };
      cells.push(cell);
      if (val > maxValue) {
        maxValue = val;
        winner = cell;
      }
    }
  }

  const observedMax =
    observedPoolMap16x16x32 && observedPoolMap16x16x32[poolRow]?.[poolCol] !== undefined
      ? Number(observedPoolMap16x16x32[poolRow][poolCol][filterIndex])
      : null;

  return {
    poolRow,
    poolCol,
    filterIndex,
    startRow,
    startCol,
    cells,
    computedMax: maxValue,
    winner,
    observedMax,
    absDiff: observedMax !== null ? Math.abs(maxValue - observedMax) : null,
  };
}

/**
 * Explica o GlobalAveragePooling2D (média espacial 8×8) para um canal específico da 3ª convolução.
 */
export function explainGlobalAveragePoolChannel(conv3PostRelu8x8x64, channelIndex, observedGap64 = null) {
  if (!Number.isInteger(channelIndex) || channelIndex < 0 || channelIndex >= 64) {
    throw new Error(`Canal inválido para GlobalAveragePooling2D: ${channelIndex}`);
  }
  let sum = 0;
  const grid = [];
  for (let r = 0; r < 8; r += 1) {
    const rowVals = [];
    for (let c = 0; c < 8; c += 1) {
      const val = Number(conv3PostRelu8x8x64[r][c][channelIndex]);
      sum += val;
      rowVals.push(val);
    }
    grid.push(rowVals);
  }
  const computedMean = sum / 64;
  const observedMean = observedGap64 ? Number(observedGap64[channelIndex]) : null;
  return {
    channelIndex,
    grid,
    sum,
    computedMean,
    observedMean,
    absDiff: observedMean !== null ? Math.abs(computedMean - observedMean) : null,
  };
}

/**
 * Extrai os pesos 3×3×3 de um filtro da 1ª camada convolucional para visualização didática.
 */
export function extractConv1Filter(kernel3x3x3x32, bias32, filterIndex) {
  if (!Number.isInteger(filterIndex) || filterIndex < 0 || filterIndex >= 32) {
    throw new Error(`Filtro inválido: ${filterIndex}`);
  }
  let minWeight = Infinity;
  let maxWeight = -Infinity;
  const byChannel = [0, 1, 2].map((c) => {
    const matrix = [];
    for (let u = 0; u < 3; u += 1) {
      const row = [];
      for (let v = 0; v < 3; v += 1) {
        const w = Number(kernel3x3x3x32[u][v][c][filterIndex]);
        if (w < minWeight) minWeight = w;
        if (w > maxWeight) maxWeight = w;
        row.push(w);
      }
      matrix.push(row);
    }
    return matrix;
  });

  const span = maxWeight - minWeight > 1e-8 ? maxWeight - minWeight : 1;
  const rgbPreview = [];
  for (let u = 0; u < 3; u += 1) {
    const row = [];
    for (let v = 0; v < 3; v += 1) {
      const r = Math.round(((byChannel[0][u][v] - minWeight) / span) * 255);
      const g = Math.round(((byChannel[1][u][v] - minWeight) / span) * 255);
      const b = Math.round(((byChannel[2][u][v] - minWeight) / span) * 255);
      row.push([r, g, b]);
    }
    rgbPreview.push(row);
  }

  return {
    filterIndex,
    bias: Number(bias32[filterIndex]),
    minWeight,
    maxWeight,
    byChannel,
    rgbPreview,
  };
}

/**
 * Extrai a fatia 2D (H × W) de um mapa de ativação [H][W][C] para um canal específico,
 * mantendo os limites numéricos explícitos (min, max, média, fração ativa).
 */
export function extractFeatureMapSlice(mapHWC, channelIndex) {
  const height = mapHWC?.length ?? 0;
  const width = mapHWC?.[0]?.length ?? 0;
  const channels = mapHWC?.[0]?.[0]?.length ?? 0;
  if (height === 0 || width === 0 || channelIndex < 0 || channelIndex >= channels) {
    throw new Error(`Fatia de mapa de ativação inválida: canal ${channelIndex} em [${height}, ${width}, ${channels}].`);
  }

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let positiveCount = 0;
  const values = [];

  for (let r = 0; r < height; r += 1) {
    const row = [];
    for (let c = 0; c < width; c += 1) {
      const v = Number(mapHWC[r][c][channelIndex]);
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      if (v > 0) positiveCount += 1;
      row.push(v);
    }
    values.push(row);
  }

  const total = height * width;
  return {
    channelIndex,
    height,
    width,
    min,
    max,
    mean: sum / total,
    activeFraction: positiveCount / total,
    values,
  };
}
