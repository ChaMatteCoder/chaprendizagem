// Pure helpers shared by the worker, the Node parity test and the UI.
// They mirror training/enganai/export_onnx.py; keep both sides in sync.

export const IMAGE_SIZE = 28;
export const IMAGE_PIXELS = IMAGE_SIZE * IMAGE_SIZE;
export const DECISION_THRESHOLD = 0.5;
export const BUNDLE_PATH = "research/cpu-no-batchnorm-v1";
export const MODELS_BASE = "/models/enganai";
export const DATA_BASE = "/data/enganai";

const ID = /^[a-z0-9][a-z0-9._-]{0,95}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const PATH = /^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+$/;
const ALLOWED_OPS = new Set(["Conv", "ConvTranspose", "Flatten", "LeakyRelu", "Relu", "Reshape", "Tanh"]);
const TOLERANCE_KEYS = ["generatorAbs", "pixelMaxDifference", "pixelMismatchFraction", "logitAbs", "logitRel"];

export class InferenceContractError extends Error {
  constructor(message, code = "contract") {
    super(message);
    this.name = "InferenceContractError";
    this.code = code;
  }
}

function fail(message, code) {
  throw new InferenceContractError(message, code);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys, label) {
  if (!isObject(value)) fail(`${label}: objeto esperado.`);
  const actual = Object.keys(value).sort().join(",");
  if (actual !== [...keys].sort().join(",")) fail(`${label}: campos fora do contrato.`);
}

export function checkAsset(value, label = "asset") {
  exactKeys(value, ["path", "sha256", "bytes"], label);
  if (!PATH.test(value.path) || value.path.split("/").some((part) => part === "." || part === ".."))
    fail(`${label}: caminho inválido.`);
  if (!SHA256.test(value.sha256)) fail(`${label}: SHA-256 inválido.`);
  if (!Number.isInteger(value.bytes) || value.bytes < 1) fail(`${label}: tamanho inválido.`);
  return value;
}

function checkTensor(value, name, shape, label) {
  exactKeys(value, ["name", "dtype", "shape"], label);
  if (value.name !== name || value.dtype !== "float32" || JSON.stringify(value.shape) !== JSON.stringify(shape))
    fail(`${label}: formato de tensor diferente do contrato.`);
}

// Validates the parts of the stage-01 model-manifest that the browser depends on.
export function validateManifest(manifest) {
  exactKeys(
    manifest,
    ["schemaVersion", "kind", "dataMode", "id", "runId", "family", "runtime", "generator", "discriminator", "image", "latent", "datasetId", "splitManifest", "trainingConfig", "checkpointsPath", "historyPath", "fixedLatentSetId", "environment", "activeCheckpointId"],
    "Manifesto",
  );
  if (manifest.schemaVersion !== 1 || manifest.kind !== "model-manifest") fail("Manifesto: versão ou tipo incompatível.");
  if (manifest.dataMode !== "recorded") fail("Manifesto: exemplos (fixtures) não podem ser carregados como modelo.", "fixture");
  if (manifest.family !== "dcgan-compact" || manifest.runtime !== "onnx") fail("Manifesto: família ou runtime incompatível.");
  for (const key of ["id", "runId", "datasetId", "fixedLatentSetId", "activeCheckpointId"])
    if (!ID.test(manifest[key])) fail(`Manifesto: ${key} inválido.`);
  exactKeys(manifest.latent, ["dimension", "distribution", "rngId"], "Manifesto.latent");
  const dimension = manifest.latent.dimension;
  if (!Number.isInteger(dimension) || dimension < 1 || dimension > 4096 || manifest.latent.distribution !== "normal-0-1")
    fail("Manifesto: espaço latente inválido.");
  const image = manifest.image;
  exactKeys(image, ["width", "height", "channels", "layout", "range"], "Manifesto.image");
  if (image.width !== IMAGE_SIZE || image.height !== IMAGE_SIZE || image.channels !== 1 || image.layout !== "NCHW" || JSON.stringify(image.range) !== "[-1,1]")
    fail("Manifesto: domínio da imagem incompatível.");
  for (const network of ["generator", "discriminator"]) {
    exactKeys(manifest[network], ["asset", "input", "output"], `Manifesto.${network}`);
    checkAsset(manifest[network].asset, `Manifesto.${network}.asset`);
  }
  checkTensor(manifest.generator.input, "latent", ["N", dimension, 1, 1], "G.input");
  checkTensor(manifest.generator.output, "image", ["N", 1, IMAGE_SIZE, IMAGE_SIZE], "G.output");
  checkTensor(manifest.discriminator.input, "image", ["N", 1, IMAGE_SIZE, IMAGE_SIZE], "D.input");
  checkTensor(manifest.discriminator.output, "logit", ["N", 1], "D.output");
  checkAsset(manifest.splitManifest, "Manifesto.splitManifest");
  checkAsset(manifest.trainingConfig, "Manifesto.trainingConfig");
  return manifest;
}

// The onnx-export record lists every checkpoint, its reference outputs and declared tolerances.
export function validateExport(record, manifest) {
  if (!isObject(record) || record.schemaVersion !== 1 || record.kind !== "onnx-export") fail("Exportação: tipo incompatível.");
  if (record.dataMode !== "recorded") fail("Exportação: fixtures não podem ser carregadas.", "fixture");
  if (record.officialTestEvaluated !== false || record.arenaUsedForParity !== false) fail("Exportação: partições protegidas foram usadas.");
  checkAsset(record.manifest, "Exportação.manifest");
  checkAsset(record.fixedLatents, "Exportação.fixedLatents");
  if (manifest && (record.id !== manifest.id || record.runId !== manifest.runId || record.activeCheckpointId !== manifest.activeCheckpointId))
    fail("Exportação e manifesto não correspondem.");
  if (!isObject(record.tolerance) || TOLERANCE_KEYS.some((key) => !(Number.isFinite(record.tolerance[key]) && record.tolerance[key] >= 0)))
    fail("Exportação: tolerâncias ausentes.");
  if (record.browserRuntime?.package !== "onnxruntime-web") fail("Exportação: runtime do navegador não declarado.");
  if (!Array.isArray(record.checkpoints) || record.checkpoints.length === 0) fail("Exportação: nenhum checkpoint.");
  const seen = new Set();
  for (const item of record.checkpoints) {
    if (!ID.test(item.checkpointId) || seen.has(item.checkpointId)) fail("Exportação: checkpoint repetido ou inválido.");
    seen.add(item.checkpointId);
    if (!Number.isInteger(item.epoch) || item.epoch < 0) fail("Exportação: época inválida.");
    for (const network of ["generator", "discriminator"]) {
      checkAsset(item[network]?.asset, `${item.checkpointId}.${network}`);
      if (!SHA256.test(item[network].sourceWeightsSha256)) fail("Exportação: pesos de origem não identificados.");
      if (!item[network].operations?.every((op) => ALLOWED_OPS.has(op))) fail("Exportação: operação ONNX não verificada.");
    }
    checkAsset(item.reference?.generatorOutput, `${item.checkpointId}.reference`);
    const { fixedLatentIndices, discriminatorSyntheticLogits, discriminatorRealLogits } = item.reference;
    if (!Array.isArray(fixedLatentIndices) || fixedLatentIndices.length !== discriminatorSyntheticLogits?.length || ![...discriminatorSyntheticLogits, ...(discriminatorRealLogits ?? [])].every(Number.isFinite))
      fail("Exportação: referências incompletas.");
    if (!Object.values(item.pythonParity ?? {}).every((result) => result?.passed === true)) fail("Exportação: paridade Python reprovada.");
  }
  if (!seen.has(record.activeCheckpointId)) fail("Exportação: checkpoint ativo ausente.");
  const real = record.realReference;
  checkAsset(real?.asset, "Exportação.realReference");
  if (real.partition !== "development" || !Array.isArray(real.recordIds) || real.asset.bytes !== real.recordIds.length * IMAGE_PIXELS)
    fail("Exportação: referência real inválida.");
  if (manifest) {
    const active = record.checkpoints.find((item) => item.checkpointId === manifest.activeCheckpointId);
    if (active.generator.asset.sha256 !== manifest.generator.asset.sha256 || active.discriminator.asset.sha256 !== manifest.discriminator.asset.sha256)
      fail("Manifesto aponta para pesos diferentes do checkpoint ativo.");
  }
  return record;
}

// `expectedId` defaults to the manifest's fixed set; the arena pool passes its own set id.
export function validateLatentSet(latents, manifest, expectedId = manifest.fixedLatentSetId) {
  if (!isObject(latents) || latents.kind !== "latent-set" || latents.dataMode !== "recorded") fail("Vetores fixos incompatíveis.");
  if (latents.id !== expectedId || latents.dimension !== manifest.latent.dimension || latents.rngId !== manifest.latent.rngId || latents.distribution !== manifest.latent.distribution)
    fail("Vetores latentes não pertencem a este modelo.");
  if (!Array.isArray(latents.vectors) || !latents.vectors.every((vector) => Array.isArray(vector) && vector.length === latents.dimension && vector.every(Number.isFinite)))
    fail("Vetores fixos com valores inválidos.");
  return latents;
}

// Mission pool: real images from the held-out arena partition plus recorded z vectors.
export function validateArenaPool(pool) {
  if (!isObject(pool) || pool.schemaVersion !== 1 || pool.kind !== "arena-pool") fail("Conjunto da arena incompatível.");
  if (pool.dataMode !== "recorded") fail("Fixtures não podem compor uma missão.", "fixture");
  if (pool.partition !== "arena" || pool.officialTestUsed !== false || pool.labelsPublished !== false) fail("O conjunto da arena usa uma partição protegida.");
  checkAsset(pool.real?.asset, "Arena.real");
  checkAsset(pool.latents?.asset, "Arena.latents");
  const ids = pool.real.recordIds;
  if (!Array.isArray(ids) || ids.length < 5 || new Set(ids).size !== ids.length || !ids.every((id) => ID.test(id)) || pool.real.asset.bytes !== ids.length * IMAGE_PIXELS)
    fail("Registros reais da arena inválidos.");
  if (!ID.test(pool.datasetId) || !ID.test(pool.latents.latentSetId) || !Number.isInteger(pool.latents.count) || pool.latents.count < 3)
    fail("Vetores da arena inválidos.");
  return pool;
}

export function latentTensor(vectors, dimension) {
  if (!Array.isArray(vectors) || vectors.length === 0) fail("Nenhum vetor latente informado.", "input");
  const data = new Float32Array(vectors.length * dimension);
  vectors.forEach((vector, index) => {
    if (!(Array.isArray(vector) || ArrayBuffer.isView(vector)) || vector.length !== dimension) fail("Vetor latente com dimensão errada.", "input");
    for (let i = 0; i < dimension; i++) {
      if (!Number.isFinite(vector[i])) fail("Vetor latente com valor não finito.", "input");
      data[index * dimension + i] = vector[i];
    }
  });
  return data;
}

// torch.round rounds half to even; Math.round would round .5 up.
export function roundHalfEven(value) {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

// Same rule as model.image_bytes: (x + 1) * 127.5, round, clamp to 0-255.
// The float32 intermediate matches PyTorch's float32 arithmetic.
export function quantizeImages(values) {
  const out = new Uint8Array(values.length);
  const f = new Float32Array(1);
  for (let i = 0; i < values.length; i++) {
    f[0] = values[i] + 1;
    f[0] = f[0] * 127.5;
    out[i] = Math.min(255, Math.max(0, roundHalfEven(f[0])));
  }
  return out;
}

export function normalizePixels(bytes) {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] / 127.5 - 1;
  return out;
}

export function sigmoid(logit) {
  return logit >= 0 ? 1 / (1 + Math.exp(-logit)) : Math.exp(logit) / (1 + Math.exp(logit));
}

// Builds the stage-01 `discriminator` reading. score >= 0.5 is "real", exactly as in the contract.
export function discriminatorReading(logit, runId, checkpointId) {
  if (!Number.isFinite(logit)) return { status: "error", reason: "A Lupa devolveu um valor não finito." };
  const score = sigmoid(logit);
  return {
    status: "ready",
    runId,
    checkpointId,
    logit,
    score,
    threshold: DECISION_THRESHOLD,
    predictedOrigin: score >= DECISION_THRESHOLD ? "real" : "synthetic",
    meaning: "uncalibrated-sigmoid",
  };
}

export function compareGenerator(expected, actual, tolerance) {
  if (expected.length !== actual.length) return { passed: false, reason: "shape", count: 0 };
  let maxAbsError = 0;
  let finite = true;
  const clipped = new Float32Array(actual.length);
  for (let i = 0; i < actual.length; i++) {
    if (!Number.isFinite(actual[i])) finite = false;
    maxAbsError = Math.max(maxAbsError, Math.abs(expected[i] - actual[i]));
    clipped[i] = Math.min(1, Math.max(-1, actual[i]));
  }
  const a = quantizeImages(expected);
  const b = quantizeImages(clipped);
  let pixelMaxDifference = 0;
  let pixelMismatches = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d) pixelMismatches++;
    pixelMaxDifference = Math.max(pixelMaxDifference, d);
  }
  const passed =
    finite &&
    maxAbsError <= tolerance.generatorAbs &&
    pixelMaxDifference <= tolerance.pixelMaxDifference &&
    pixelMismatches <= tolerance.pixelMismatchFraction * a.length;
  return { passed, count: a.length / IMAGE_PIXELS, maxAbsError, pixelMaxDifference, pixelMismatches, pixelsCompared: a.length };
}

export function compareDiscriminator(expected, actual, tolerance) {
  if (expected.length !== actual.length) return { passed: false, reason: "shape", count: 0 };
  let maxAbsError = 0;
  let predictionChanges = 0;
  let passed = true;
  for (let i = 0; i < expected.length; i++) {
    const error = Math.abs(expected[i] - actual[i]);
    const limit = tolerance.logitAbs + tolerance.logitRel * Math.abs(expected[i]);
    maxAbsError = Math.max(maxAbsError, error);
    const flipped = expected[i] >= 0 !== actual[i] >= 0;
    if (flipped) predictionChanges++;
    // A changed decision is acceptable only when the reference logit is inside the tolerance band.
    if (!Number.isFinite(actual[i]) || error > limit || (flipped && Math.abs(expected[i]) > limit)) passed = false;
  }
  return { passed, count: expected.length, maxAbsError, predictionChanges };
}

// Minimal SHA-256 for contexts without crypto.subtle (plain-HTTP LAN previews).
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256Fallback(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const length = bytes.length;
  const padded = new Uint8Array(Math.ceil((length + 9) / 64) * 64);
  padded.set(bytes);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((length * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (length * 8) >>> 0);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  return [...h].map((x) => x.toString(16).padStart(8, "0")).join("");
}

export async function sha256Hex(bytes) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return sha256Fallback(bytes);
  const digest = await subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function verifyBytes(bytes, asset) {
  if (bytes.byteLength !== asset.bytes) fail(`Tamanho inesperado em ${asset.path}.`, "integrity");
  if ((await sha256Hex(bytes)) !== asset.sha256) fail(`Assinatura SHA-256 diferente em ${asset.path}.`, "integrity");
  return bytes;
}
