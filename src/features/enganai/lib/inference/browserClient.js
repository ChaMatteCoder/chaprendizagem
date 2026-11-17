import { createInferenceClient } from "./client.js";

// One worker for the module: sessions stay loaded while the player moves between scenes.
let shared = null;

export function inferenceSupported() {
  return typeof Worker === "function" && typeof WebAssembly === "object";
}

export function getInferenceClient() {
  shared ??= createInferenceClient({
    createWorker: () => new Worker(new URL("./inference.worker.js", import.meta.url), { type: "module", name: "enganai-inference" }),
    timeoutMs: 60000,
  });
  return shared;
}

// Used by "Tentar novamente": a fresh worker discards any state from the failed attempt.
export function resetInferenceClient() {
  shared?.terminate();
  shared = null;
}
