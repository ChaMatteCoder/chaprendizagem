import {
  IMAGE_PIXELS,
  InferenceContractError,
  compareDiscriminator,
  compareGenerator,
  discriminatorReading,
  latentTensor,
  normalizePixels,
  validateArenaPool,
  quantizeImages,
  validateExport,
  validateLatentSet,
  validateManifest,
  verifyBytes,
} from "./contract.js";

const decoder = new TextDecoder();
const now = () => globalThis.performance?.now?.() ?? Date.now();

function parseJson(bytes, label) {
  try {
    return JSON.parse(decoder.decode(bytes));
  } catch {
    throw new InferenceContractError(`${label} não é um JSON válido.`, "integrity");
  }
}

// Runs the exported G/D with any onnxruntime build (web/wasm in the worker, node in tests).
// `fetchBytes(path)` resolves paths relative to the research run directory;
// `fetchData(path)` resolves paths relative to /data/enganai (mission pool).
export function createGanEngine({ ort, fetchBytes, fetchData, sessionOptions = {} }) {
  let bundle = null;
  let arena = null;
  const sessions = new Map();

  async function loadBundle() {
    if (bundle) return bundle;
    const record = parseJson(await fetchBytes("onnx-export.json"), "Registro de exportação");
    const manifest = validateManifest(parseJson(await verifyBytes(await fetchBytes(record.manifest?.path), record.manifest), "Manifesto"));
    validateExport(record, manifest);
    const latents = validateLatentSet(parseJson(await verifyBytes(await fetchBytes(record.fixedLatents.path), record.fixedLatents), "Vetores fixos"), manifest);
    const real = await verifyBytes(await fetchBytes(record.realReference.asset.path), record.realReference.asset);
    bundle = { record, manifest, latents, real };
    return bundle;
  }

  function findCheckpoint({ checkpointId, epoch }) {
    const item = bundle.record.checkpoints.find((entry) => (checkpointId ? entry.checkpointId === checkpointId : entry.epoch === epoch));
    if (!item) throw new InferenceContractError("Checkpoint não registrado nesta exportação.", "unavailable");
    return item;
  }

  async function createSession(asset, network) {
    const bytes = await verifyBytes(await fetchBytes(asset.path), asset);
    const session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all", ...sessionOptions });
    const contract = bundle.manifest[network];
    if (session.inputNames.join() !== contract.input.name || session.outputNames.join() !== contract.output.name) {
      await session.release?.();
      throw new InferenceContractError(`A rede ${network} exportada não segue o contrato.`, "contract");
    }
    return session;
  }

  async function loadCheckpoint(selector, onProgress = () => {}) {
    await loadBundle();
    const item = findCheckpoint(selector);
    if (sessions.has(item.checkpointId)) return { item, ...sessions.get(item.checkpointId), cached: true };
    onProgress("weights");
    const started = now();
    const generator = await createSession(item.generator.asset, "generator");
    let discriminator;
    try {
      discriminator = await createSession(item.discriminator.asset, "discriminator");
    } catch (error) {
      await generator.release?.();
      throw error;
    }
    const loaded = { generator, discriminator, loadMs: now() - started };
    sessions.set(item.checkpointId, loaded);
    return { item, ...loaded, cached: false };
  }

  async function runGenerator(session, values, count) {
    const { manifest } = bundle;
    const input = new ort.Tensor("float32", values, [count, manifest.latent.dimension, 1, 1]);
    const output = (await session.run({ [manifest.generator.input.name]: input }))[manifest.generator.output.name];
    if (output.dims.join() !== [count, 1, 28, 28].join()) throw new InferenceContractError("G devolveu um formato inesperado.", "contract");
    return output.data;
  }

  async function runDiscriminator(session, images, count) {
    const { manifest } = bundle;
    const input = new ort.Tensor("float32", images, [count, 1, 28, 28]);
    const output = (await session.run({ [manifest.discriminator.input.name]: input }))[manifest.discriminator.output.name];
    if (output.dims.join() !== [count, 1].join()) throw new InferenceContractError("D devolveu um formato inesperado.", "contract");
    return output.data;
  }

  // Reproduces the PyTorch reference: fixed z -> G, reference images -> D, real development images -> D.
  async function verifyCheckpoint(selector) {
    const { item, generator, discriminator } = await loadCheckpoint(selector);
    const { record, latents, real } = bundle;
    const { tolerance } = record;
    const reference = new Float32Array((await verifyBytes(await fetchBytes(item.reference.generatorOutput.path), item.reference.generatorOutput)).slice().buffer);
    const vectors = item.reference.fixedLatentIndices.map((index) => latents.vectors[index]);
    const dimension = bundle.manifest.latent.dimension;
    const started = now();
    const generated = await runGenerator(generator, latentTensor(vectors, dimension), vectors.length);
    const generatorMs = now() - started;
    const single = await runGenerator(generator, latentTensor(vectors.slice(0, 1), dimension), 1);
    const realCount = record.realReference.recordIds.length;
    const startedD = now();
    const synthetic = await runDiscriminator(discriminator, reference, vectors.length);
    const discriminatorMs = now() - startedD;
    const realLogits = await runDiscriminator(discriminator, normalizePixels(real), realCount);
    const parity = {
      generatorBatch: compareGenerator(reference, generated, tolerance),
      generatorSingle: compareGenerator(reference.subarray(0, IMAGE_PIXELS), single, tolerance),
      discriminatorSynthetic: compareDiscriminator(item.reference.discriminatorSyntheticLogits, synthetic, tolerance),
      discriminatorReal: compareDiscriminator(item.reference.discriminatorRealLogits, realLogits, tolerance),
    };
    const passed = Object.values(parity).every((result) => result.passed);
    return { checkpointId: item.checkpointId, epoch: item.epoch, passed, parity, tolerance, timings: { generatorMs, discriminatorMs, batch: vectors.length } };
  }

  async function generate(selector, vectors) {
    const { item, generator } = await loadCheckpoint(selector);
    const values = await runGenerator(generator, latentTensor(vectors, bundle.manifest.latent.dimension), vectors.length);
    return { checkpointId: item.checkpointId, values: Float32Array.from(values), pixels: quantizeImages(values) };
  }

  async function discriminate(selector, images) {
    const { item, discriminator } = await loadCheckpoint(selector);
    if (!(images instanceof Float32Array) || images.length === 0 || images.length % IMAGE_PIXELS !== 0)
      throw new InferenceContractError("Imagens devem ser float32 em N × 1 × 28 × 28.", "input");
    // Same bound as model.image_bytes: Tanh may exceed ±1 by float32 rounding.
    for (const value of images) if (!(value >= -1.000001 && value <= 1.000001)) throw new InferenceContractError("Pixel fora do intervalo [-1, 1].", "input");
    const logits = await runDiscriminator(discriminator, images, images.length / IMAGE_PIXELS);
    return { checkpointId: item.checkpointId, logits: Float32Array.from(logits), readings: Array.from(logits, (logit) => discriminatorReading(logit, bundle.manifest.runId, item.checkpointId)) };
  }

  // G(z) for registered fixed vectors, followed by D on exactly those outputs.
  async function sampleFixed(selector, indices) {
    await loadBundle();
    if (!indices.every((index) => Number.isInteger(index) && index >= 0 && index < bundle.latents.vectors.length))
      throw new InferenceContractError("Índice de vetor fixo inexistente.", "input");
    const generated = await generate(selector, indices.map((index) => bundle.latents.vectors[index]));
    const { readings } = await discriminate(selector, generated.values);
    return {
      checkpointId: generated.checkpointId,
      runId: bundle.manifest.runId,
      latentSetId: bundle.latents.id,
      samples: indices.map((index, position) => ({
        latentIndex: index,
        pixels: generated.pixels.slice(position * IMAGE_PIXELS, (position + 1) * IMAGE_PIXELS),
        discriminator: readings[position],
      })),
    };
  }

  async function loadArenaPool() {
    if (arena) return arena;
    const { manifest } = await loadBundle();
    if (!fetchData) throw new InferenceContractError("O conjunto da arena não está disponível.", "unavailable");
    const pool = validateArenaPool(parseJson(await fetchData("arena/arena-pool.json"), "Conjunto da arena"));
    if (pool.datasetId !== bundle.manifest.datasetId) throw new InferenceContractError("O conjunto da arena é de outro dataset.", "contract");
    const real = await verifyBytes(await fetchData(`arena/${pool.real.asset.path}`), pool.real.asset);
    const latents = validateLatentSet(parseJson(await verifyBytes(await fetchData(`arena/${pool.latents.asset.path}`), pool.latents.asset), "Vetores da arena"), manifest, pool.latents.latentSetId);
    if (latents.vectors.length !== pool.latents.count) throw new InferenceContractError("Quantidade de vetores da arena diferente do registro.", "integrity");
    arena = { pool, real, latents };
    return arena;
  }

  // Builds mission rounds: arena photos and live G(z) for recorded z, then D on the
  // exact uint8 pixels the player will see (both origins go through the same path).
  async function buildRounds(selector, plan) {
    const { pool, real, latents } = await loadArenaPool();
    const { item, generator, discriminator } = await loadCheckpoint(selector);
    const { manifest } = bundle;
    if (!Array.isArray(plan) || plan.length === 0) throw new InferenceContractError("Plano de rodadas vazio.", "input");
    const synthetic = plan.filter((round) => round.origin === "synthetic");
    for (const round of plan) {
      const limit = round.origin === "real" ? pool.real.recordIds.length : round.origin === "synthetic" ? latents.vectors.length : 0;
      if (!Number.isInteger(round.index) || round.index < 0 || round.index >= limit) throw new InferenceContractError("Rodada fora do conjunto da arena.", "input");
    }
    let generated = new Uint8Array(0);
    if (synthetic.length) {
      const values = await runGenerator(generator, latentTensor(synthetic.map((round) => latents.vectors[round.index]), manifest.latent.dimension), synthetic.length);
      generated = quantizeImages(values);
    }
    let cursor = 0;
    const pixels = plan.map((round) => {
      if (round.origin === "real") return real.slice(round.index * IMAGE_PIXELS, (round.index + 1) * IMAGE_PIXELS);
      const start = cursor++ * IMAGE_PIXELS;
      return generated.slice(start, start + IMAGE_PIXELS);
    });
    let readings;
    try {
      const batch = new Uint8Array(plan.length * IMAGE_PIXELS);
      pixels.forEach((image, index) => batch.set(image, index * IMAGE_PIXELS));
      const logits = await runDiscriminator(discriminator, normalizePixels(batch), plan.length);
      readings = Array.from(logits, (logit) => discriminatorReading(logit, manifest.runId, item.checkpointId));
    } catch {
      // A failed guess never blocks the round or changes the answer key.
      readings = plan.map(() => ({ status: "error", reason: "A Lupa não conseguiu analisar esta imagem." }));
    }
    return {
      checkpointId: item.checkpointId,
      runId: manifest.runId,
      poolId: pool.id,
      rounds: plan.map((round, index) => ({
        pixels: pixels[index],
        discriminator: readings[index],
        provenance:
          round.origin === "real"
            ? { origin: "real", datasetId: pool.datasetId, partition: "arena", recordId: pool.real.recordIds[round.index] }
            : {
                origin: "synthetic",
                runId: manifest.runId,
                checkpointId: item.checkpointId,
                generatorSha256: item.generator.sourceWeightsSha256,
                latent: {
                  dimension: latents.dimension,
                  distribution: latents.distribution,
                  rngId: latents.rngId,
                  seed: pool.latents.seed,
                  values: latents.vectors[round.index],
                },
              },
      })),
    };
  }

  async function dispose() {
    for (const { generator, discriminator } of sessions.values()) {
      await generator.release?.();
      await discriminator.release?.();
    }
    sessions.clear();
    bundle = null;
    arena = null;
  }

  return {
    loadBundle,
    loadCheckpoint,
    verifyCheckpoint,
    generate,
    discriminate,
    sampleFixed,
    loadArenaPool,
    buildRounds,
    dispose,
    get bundle() {
      return bundle;
    },
  };
}
