import { useCallback, useEffect, useState } from "react";
import { getInferenceClient, inferenceSupported, resetInferenceClient } from "../lib/inference/browserClient.js";

export const BENCH_STEPS = ["runtime", "manifest", "weights", "parity"];
const DEFAULT_INDICES = Object.freeze([0, 1, 2, 3]);

// Loads G/D for one checkpoint, verifies them against the PyTorch references and
// samples registered fixed vectors. Results from an older epoch/attempt are ignored.
export function useBenchInference(epoch, indices = DEFAULT_INDICES) {
  const [attempt, setAttempt] = useState(0);
  const key = `${epoch}:${attempt}`;
  const [result, setResult] = useState({ key: null });
  const [progress, setProgress] = useState({ key: null, step: BENCH_STEPS[0] });
  const supported = inferenceSupported();
  const indexKey = indices.join(",");

  useEffect(() => {
    if (!supported || epoch == null) return undefined;
    const controller = new AbortController();
    const client = getInferenceClient();
    const started = performance.now();
    const options = { signal: controller.signal };
    (async () => {
      const prepared = await client.request("prepare", { epoch }, { ...options, onProgress: (step) => setProgress({ key, step }) });
      const sampled = await client.request("sampleFixed", { checkpointId: prepared.checkpointId, indices: indexKey.split(",").map(Number) }, options);
      if (sampled.checkpointId !== prepared.checkpointId) throw Object.assign(new Error("A amostra veio de outro checkpoint."), { code: "contract" });
      setResult({ key, phase: "ready", prepared, sampled, totalMs: performance.now() - started });
    })().catch((error) => {
      if (error?.code === "aborted" || controller.signal.aborted) return;
      setResult({ key, phase: error?.code === "unavailable" ? "unavailable" : "error", error: { message: error?.message || "A inferência falhou.", code: error?.code || "error" } });
    });
    return () => controller.abort();
  }, [epoch, key, supported, indexKey]);

  const retry = useCallback(() => {
    resetInferenceClient();
    setAttempt((value) => value + 1);
  }, []);

  if (!supported)
    return { phase: "unavailable", error: { message: "Este navegador não oferece Web Workers e WebAssembly, necessários para executar as redes.", code: "unavailable" }, retry };
  if (result.key === key) return { ...result, retry, attempt };
  return { phase: "loading", step: progress.key === key ? progress.step : BENCH_STEPS[0], retry, attempt };
}
