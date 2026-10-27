import { DEFAULT_RESTORATION_TOOLS, PIXEL_IMAGE_SPEC, PIXEL_TOOL_LIMITS } from '../data/cifar10Schema.js';

const { width: WIDTH, height: HEIGHT, channels: CHANNELS, totalValues: TOTAL_VALUES } = PIXEL_IMAGE_SPEC;

/**
 * Gerador pseudoaleatório determinístico de 32 bits (Mulberry32).
 * Idêntico entre JavaScript e Python para garantir reprodutibilidade exata de partições e ruído.
 */
export function mulberry32(seed) {
  if (!Number.isInteger(seed)) {
    throw new Error('A seed do gerador pseudoaleatório deve ser um número inteiro.');
  }
  let state = seed >>> 0;
  return function nextFloat() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Valida que um buffer de imagem corresponde a 32×32×3 canais RGB inteiros em [0, 255].
 */
export function validateRgbUint8(pixels) {
  if (
    !(pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray || Array.isArray(pixels)) ||
    pixels.length !== TOTAL_VALUES
  ) {
    throw new Error(`A imagem deve conter exatamente ${TOTAL_VALUES} valores RGB (32×32×3).`);
  }
  for (let i = 0; i < TOTAL_VALUES; i += 1) {
    const value = pixels[i];
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error(`Valor de pixel inválido na posição ${i}: esperado inteiro em [0, 255].`);
    }
  }
  return Uint8Array.from(pixels);
}

/**
 * Converte buffer uint8 [0, 255] para Float32Array [0, 1] em layout NHWC (32×32×3).
 */
export function normalizePixelsToFloat32(uint8Pixels) {
  const checked = validateRgbUint8(uint8Pixels);
  const output = new Float32Array(TOTAL_VALUES);
  for (let i = 0; i < TOTAL_VALUES; i += 1) {
    output[i] = Math.fround(checked[i] / 255);
  }
  return output;
}

/**
 * Valida um buffer Float32Array [32×32×3] normalizado em [0, 1].
 */
export function validateNormalizedFloat32(floatPixels) {
  if (!(floatPixels instanceof Float32Array || Array.isArray(floatPixels)) || floatPixels.length !== TOTAL_VALUES) {
    throw new Error(`O tensor de entrada deve ter ${TOTAL_VALUES} números finitos (32×32×3).`);
  }
  for (let i = 0; i < TOTAL_VALUES; i += 1) {
    const v = floatPixels[i];
    if (!Number.isFinite(v) || v < -1e-6 || v > 1 + 1e-6) {
      throw new Error(`Valor normalizado inválido na posição ${i}: esperado número finito em [0, 1].`);
    }
  }
  return Float32Array.from(floatPixels);
}

/**
 * Codifica e decodifica pixels uint8 em Base64 sem perda (sem compressão JPEG).
 */
export function encodePixelsBase64(uint8Pixels) {
  const checked = validateRgbUint8(uint8Pixels);
  if (typeof globalThis.Buffer !== 'undefined') {
    return globalThis.Buffer.from(checked.buffer, checked.byteOffset, checked.byteLength).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < checked.length; i += 1) {
    binary += String.fromCharCode(checked[i]);
  }
  return globalThis.btoa(binary);
}

export function decodePixelsBase64(base64String) {
  if (typeof base64String !== 'string' || base64String.length === 0) {
    throw new Error('String base64 de pixels inválida.');
  }
  let bytes;
  if (typeof globalThis.Buffer !== 'undefined') {
    bytes = new Uint8Array(globalThis.Buffer.from(base64String, 'base64'));
  } else {
    const binary = globalThis.atob(base64String);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
  }
  return validateRgbUint8(bytes);
}

/**
 * Arredondamento canônico half-up em [0, 255], idêntico em Python e JavaScript:
 * floor(clamp(v, 0, 255) + 0.5).
 */
export function clampAndRoundUint8(value) {
  if (!Number.isFinite(value)) {
    throw new Error('Valor numérico não finito durante quantização de pixel.');
  }
  const clamped = Math.min(255, Math.max(0, value));
  return Math.min(255, Math.floor(clamped + 0.5));
}

/**
 * Gera vetor de ruído uniforme simétrico em [-1, +1) com seed fixa.
 */
export function generateNoiseRealization(seed, length = TOTAL_VALUES) {
  const rng = mulberry32(seed);
  const noise = new Float64Array(length);
  for (let i = 0; i < length; i += 1) {
    noise[i] = 2 * rng() - 1;
  }
  return noise;
}

export function validateInterferenceOptions(options) {
  const contrast = options?.contrast ?? 1.0;
  const brightness = options?.brightness ?? 0;
  const noiseStd = options?.noiseStd ?? 0;
  const seed = options?.seed ?? 1;
  if (!Number.isFinite(contrast) || contrast < 0.2 || contrast > 3.0) {
    throw new Error('O contraste da interferência deve estar entre 0,2 e 3,0.');
  }
  if (!Number.isFinite(brightness) || brightness < -120 || brightness > 120) {
    throw new Error('O brilho da interferência deve estar entre -120 e 120.');
  }
  if (!Number.isFinite(noiseStd) || noiseStd < 0 || noiseStd > 100) {
    throw new Error('A intensidade do ruído deve estar entre 0 e 100.');
  }
  if (!Number.isInteger(seed)) {
    throw new Error('A seed do ruído deve ser um inteiro.');
  }
  return { contrast, brightness, noiseStd, seed };
}

/**
 * Aplica interferência reproduzível sobre uma imagem 32×32×3 sem alterar a original.
 * Ordem fixa:
 * 1) Contraste em torno de 127,5: v1 = 127.5 + contrast * (v0 - 127.5)
 * 2) Brilho aditivo: v2 = v1 + brightness
 * 3) Ruído aditivo determinístico: v3 = v2 + noiseStd * n(seed)
 * 4) Clipping em [0, 255] e arredondamento inteiro canônico.
 */
export function applyInterference(originalUint8, options = {}) {
  const source = validateRgbUint8(originalUint8);
  const { contrast, brightness, noiseStd, seed } = validateInterferenceOptions(options);
  const noise = noiseStd > 0 ? generateNoiseRealization(seed, TOTAL_VALUES) : null;
  const output = new Uint8Array(TOTAL_VALUES);
  let clippedCount = 0;

  for (let i = 0; i < TOTAL_VALUES; i += 1) {
    const v1 = 127.5 + contrast * (source[i] - 127.5);
    const v2 = v1 + brightness;
    const v3 = noise ? v2 + noiseStd * noise[i] : v2;
    if (v3 < 0 || v3 > 255) clippedCount += 1;
    output[i] = clampAndRoundUint8(v3);
  }

  return {
    pixels: output,
    params: { contrast, brightness, noiseStd, seed },
    clippedCount,
  };
}

export function validateRestorationTools(tools = DEFAULT_RESTORATION_TOOLS) {
  const smoothing = tools?.smoothing ?? DEFAULT_RESTORATION_TOOLS.smoothing;
  const contrast = tools?.contrast ?? DEFAULT_RESTORATION_TOOLS.contrast;
  const brightness = tools?.brightness ?? DEFAULT_RESTORATION_TOOLS.brightness;

  const { smoothing: sLim, contrast: cLim, brightness: bLim } = PIXEL_TOOL_LIMITS;
  if (!Number.isFinite(smoothing) || smoothing < sLim.min - 1e-9 || smoothing > sLim.max + 1e-9) {
    throw new Error(`A suavização deve estar entre ${sLim.min} e ${sLim.max}.`);
  }
  if (!Number.isFinite(contrast) || contrast < cLim.min - 1e-9 || contrast > cLim.max + 1e-9) {
    throw new Error(`O contraste deve estar entre ${cLim.min} e ${cLim.max}.`);
  }
  if (!Number.isFinite(brightness) || brightness < bLim.min - 1e-9 || brightness > bLim.max + 1e-9) {
    throw new Error(`O brilho deve estar entre ${bLim.min} e ${bLim.max}.`);
  }
  return {
    smoothing: Math.min(sLim.max, Math.max(sLim.min, smoothing)),
    contrast: Math.min(cLim.max, Math.max(cLim.min, contrast)),
    brightness: Math.min(bLim.max, Math.max(bLim.min, brightness)),
  };
}

/**
 * Calcula a média 3×3 por canal com tratamento de borda por repetição (replicate / clamp).
 */
export function computeBoxSmooth3x3(sourceUint8) {
  const source = validateRgbUint8(sourceUint8);
  const meanBuffer = new Float64Array(TOTAL_VALUES);

  for (let y = 0; y < HEIGHT; y += 1) {
    const y0 = Math.max(0, y - 1);
    const y1 = y;
    const y2 = Math.min(HEIGHT - 1, y + 1);
    for (let x = 0; x < WIDTH; x += 1) {
      const x0 = Math.max(0, x - 1);
      const x1 = x;
      const x2 = Math.min(WIDTH - 1, x + 1);
      const rows = [y0, y1, y2];
      const cols = [x0, x1, x2];
      const baseIndex = (y * WIDTH + x) * CHANNELS;

      for (let c = 0; c < CHANNELS; c += 1) {
        let sum = 0;
        for (let ry = 0; ry < 3; ry += 1) {
          const rowOffset = rows[ry] * WIDTH;
          for (let rx = 0; rx < 3; rx += 1) {
            sum += source[(rowOffset + cols[rx]) * CHANNELS + c];
          }
        }
        meanBuffer[baseIndex + c] = sum / 9;
      }
    }
  }
  return meanBuffer;
}

/**
 * Aplica as ferramentas de restauração a partir da imagem corrompida (sem acumular estado).
 * Ordem fixa e documentada:
 * 1) Suavização 3×3 (borda replicate): u1 = (1 - smoothing) * I_corr + smoothing * Mean3x3(I_corr)
 * 2) Contraste em torno de 127,5: u2 = 127.5 + contrast * (u1 - 127.5)
 * 3) Brilho aditivo: u3 = u2 + brightness
 * 4) Clipping [0, 255] e arredondamento inteiro canônico.
 */
export function applyRestorationTools(corruptedUint8, tools = DEFAULT_RESTORATION_TOOLS) {
  const source = validateRgbUint8(corruptedUint8);
  const { smoothing, contrast, brightness } = validateRestorationTools(tools);
  const mean3x3 = smoothing > 0 ? computeBoxSmooth3x3(source) : null;
  const output = new Uint8Array(TOTAL_VALUES);
  let clippedCount = 0;

  for (let i = 0; i < TOTAL_VALUES; i += 1) {
    const raw = source[i];
    const u1 = mean3x3 ? (1 - smoothing) * raw + smoothing * mean3x3[i] : raw;
    const u2 = 127.5 + contrast * (u1 - 127.5);
    const u3 = u2 + brightness;
    if (u3 < 0 || u3 > 255) clippedCount += 1;
    output[i] = clampAndRoundUint8(u3);
  }

  return {
    pixels: output,
    tools: { smoothing, contrast, brightness },
    clippedCount,
  };
}

/**
 * Extrai ou converte os pixels 32×32×3 para RGBA (32×32×4) para exibição nítida em Canvas 2D.
 * mode pode ser 'rgb', 'r', 'g', 'b' ou 'r-gray', 'g-gray', 'b-gray'.
 */
export function toRgbaImageDataArray(uint8Pixels, mode = 'rgb') {
  const source = validateRgbUint8(uint8Pixels);
  const rgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let p = 0; p < WIDTH * HEIGHT; p += 1) {
    const r = source[p * 3];
    const g = source[p * 3 + 1];
    const b = source[p * 3 + 2];
    const out = p * 4;
    if (mode === 'rgb') {
      rgba[out] = r;
      rgba[out + 1] = g;
      rgba[out + 2] = b;
    } else if (mode === 'r') {
      rgba[out] = r;
      rgba[out + 1] = 0;
      rgba[out + 2] = 0;
    } else if (mode === 'g') {
      rgba[out] = 0;
      rgba[out + 1] = g;
      rgba[out + 2] = 0;
    } else if (mode === 'b') {
      rgba[out] = 0;
      rgba[out + 1] = 0;
      rgba[out + 2] = b;
    } else if (mode === 'r-gray') {
      rgba[out] = r;
      rgba[out + 1] = r;
      rgba[out + 2] = r;
    } else if (mode === 'g-gray') {
      rgba[out] = g;
      rgba[out + 1] = g;
      rgba[out + 2] = g;
    } else if (mode === 'b-gray') {
      rgba[out] = b;
      rgba[out + 1] = b;
      rgba[out + 2] = b;
    } else {
      throw new Error(`Modo de visualização de canal inválido: ${mode}`);
    }
    rgba[out + 3] = 255;
  }
  return rgba;
}

/**
 * Estatísticas descritivas de diferença entre duas imagens 32×32×3.
 */
export function computePixelDiffStats(referenceUint8, targetUint8) {
  const ref = validateRgbUint8(referenceUint8);
  const tar = validateRgbUint8(targetUint8);
  let sumAbsDiff = 0;
  let maxAbsDiff = 0;
  let changedChannels = 0;
  let changedPixels = 0;

  for (let p = 0; p < WIDTH * HEIGHT; p += 1) {
    let pixelModified = false;
    for (let c = 0; c < CHANNELS; c += 1) {
      const idx = p * CHANNELS + c;
      const diff = Math.abs(tar[idx] - ref[idx]);
      if (diff > 0) {
        changedChannels += 1;
        pixelModified = true;
      }
      sumAbsDiff += diff;
      if (diff > maxAbsDiff) maxAbsDiff = diff;
    }
    if (pixelModified) changedPixels += 1;
  }

  return {
    meanAbsDiff: sumAbsDiff / TOTAL_VALUES,
    maxAbsDiff,
    changedChannels,
    changedPixels,
    totalPixels: WIDTH * HEIGHT,
    totalChannels: TOTAL_VALUES,
  };
}

/**
 * Divisão estratificada determinística de índices por classe usando Mulberry32 + Fisher-Yates.
 * Garante disjunção estrita entre treino e validação.
 */
export function createStratifiedSplit(labels, { valPerClass = 500, numClasses = 10, seed = 42 } = {}) {
  if (!Array.isArray(labels) && !(labels instanceof Int32Array) && !(labels instanceof Uint8Array)) {
    throw new Error('A lista de rótulos deve ser um array ou TypedArray.');
  }
  const byClass = Array.from({ length: numClasses }, () => []);
  for (let idx = 0; idx < labels.length; idx += 1) {
    const label = labels[idx];
    if (!Number.isInteger(label) || label < 0 || label >= numClasses) {
      throw new Error(`Rótulo inválido na posição ${idx}: ${label}`);
    }
    byClass[label].push(idx);
  }

  const trainIndices = [];
  const valIndices = [];
  const classCounts = [];

  for (let c = 0; c < numClasses; c += 1) {
    const indices = [...byClass[c]].sort((a, b) => a - b);
    if (indices.length <= valPerClass) {
      throw new Error(`Classe ${c} possui ${indices.length} amostras, insuficiente para reservar ${valPerClass} de validação.`);
    }
    const rng = mulberry32(seed + c);
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    const classVal = indices.slice(0, valPerClass).sort((a, b) => a - b);
    const classTrain = indices.slice(valPerClass).sort((a, b) => a - b);
    valIndices.push(...classVal);
    trainIndices.push(...classTrain);
    classCounts.push({
      classIndex: c,
      total: indices.length,
      train: classTrain.length,
      validation: classVal.length,
    });
  }

  return {
    seed,
    valPerClass,
    trainIndices,
    valIndices,
    classCounts,
  };
}
