import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import { BUNDLE_PATH, DATA_BASE, MODELS_BASE } from "./contract.js";
import { createGanEngine } from "./engine.js";

// The runtime is only downloaded when the bench asks for it (dynamic import).
let enginePromise = null;
let runtimeVersion = null;

const fetchBytes = (path) => download(`${MODELS_BASE}/${BUNDLE_PATH}/${path}`);
const fetchData = (path) => download(`${DATA_BASE}/${path}`);

async function download(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw Object.assign(new Error("Não foi possível baixar os arquivos do modelo."), { code: "network" });
  }
  if (!response.ok) throw Object.assign(new Error(`Arquivo do modelo indisponível (${response.status}).`), { code: "network" });
  return new Uint8Array(await response.arrayBuffer());
}

function engine() {
  enginePromise ??= (async () => {
    if (typeof WebAssembly !== "object") throw Object.assign(new Error("Este navegador não executa WebAssembly."), { code: "unavailable" });
    const ort = await import("onnxruntime-web/wasm");
    ort.env.wasm.wasmPaths = { wasm: wasmUrl };
    // Threads need cross-origin isolation, which this static site does not require.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.logLevel = "error";
    runtimeVersion = ort.env.versions?.web ?? null;
    return createGanEngine({ ort, fetchBytes, fetchData });
  })().catch((error) => {
    enginePromise = null;
    throw error;
  });
  return enginePromise;
}

const handlers = {
  async prepare({ epoch, checkpointId }, progress) {
    progress("runtime");
    const gan = await engine();
    progress("manifest");
    const { manifest, record } = await gan.loadBundle();
    const loaded = await gan.loadCheckpoint({ epoch, checkpointId }, progress);
    progress("parity");
    const verification = await gan.verifyCheckpoint({ checkpointId: loaded.item.checkpointId });
    if (!verification.passed) {
      await gan.dispose();
      throw Object.assign(new Error("A verificação numérica não reproduziu as saídas de referência."), { code: "parity", detail: verification.parity });
    }
    return {
      manifestId: manifest.id,
      runId: manifest.runId,
      checkpointId: loaded.item.checkpointId,
      epoch: loaded.item.epoch,
      activeCheckpointId: manifest.activeCheckpointId,
      runtime: { package: "onnxruntime-web", version: runtimeVersion, declared: record.browserRuntime.version, executionProvider: "wasm" },
      loadMs: loaded.loadMs,
      cached: loaded.cached,
      verification,
    };
  },
  async sampleFixed({ checkpointId, indices }) {
    return (await engine()).sampleFixed({ checkpointId }, indices);
  },
  async arenaInfo() {
    const { pool } = await (await engine()).loadArenaPool();
    return { poolId: pool.id, realCount: pool.real.recordIds.length, latentCount: pool.latents.count };
  },
  async buildRounds({ checkpointId, plan }) {
    return (await engine()).buildRounds({ checkpointId }, plan);
  },
  async generate({ checkpointId, vectors }) {
    return (await engine()).generate({ checkpointId }, vectors);
  },
  async discriminate({ checkpointId, images }) {
    return (await engine()).discriminate({ checkpointId }, images);
  },
};

self.onmessage = async ({ data }) => {
  const { id, type, payload } = data ?? {};
  const handler = handlers[type];
  if (!handler) {
    self.postMessage({ id, ok: false, error: { message: "Pedido desconhecido.", code: "input" } });
    return;
  }
  try {
    const result = await handler(payload ?? {}, (progress) => self.postMessage({ id, progress }));
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({ id, ok: false, error: { message: error?.message || "A inferência falhou.", code: error?.code || "error" } });
  }
};
