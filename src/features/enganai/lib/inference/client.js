export class InferenceError extends Error {
  constructor(message, code = "error") {
    super(message);
    this.name = "InferenceError";
    this.code = code;
  }
}

// Talks to the inference worker. Each request has its own id, so a late reply
// for a cancelled or timed-out request is never applied to a newer context.
export function createInferenceClient({ createWorker, timeoutMs = 60000 }) {
  let worker = null;
  let serial = 0;
  const pending = new Map();

  function settle(id) {
    const task = pending.get(id);
    if (!task) return null;
    pending.delete(id);
    clearTimeout(task.timer);
    task.signal?.removeEventListener("abort", task.onAbort);
    return task;
  }

  function reset(error) {
    const current = worker;
    worker = null;
    current?.terminate();
    for (const id of [...pending.keys()]) settle(id).reject(error);
  }

  function ensureWorker() {
    if (worker) return worker;
    const created = createWorker();
    created.onmessage = ({ data }) => {
      if (created !== worker || !data || !pending.has(data.id)) return;
      if ("progress" in data) {
        pending.get(data.id).onProgress?.(data.progress);
        return;
      }
      const task = settle(data.id);
      if (data.ok) task.resolve(data.result);
      else task.reject(new InferenceError(data.error?.message || "A inferência falhou.", data.error?.code || "error"));
    };
    created.onerror = (event) => {
      event?.preventDefault?.();
      if (created === worker) reset(new InferenceError("O trabalhador de inferência foi interrompido.", "worker"));
    };
    created.onmessageerror = () => {
      if (created === worker) reset(new InferenceError("Mensagem inválida do trabalhador de inferência.", "worker"));
    };
    worker = created;
    return worker;
  }

  function request(type, payload = {}, options = {}) {
    const { signal, onProgress, transfer = [] } = options;
    if (signal?.aborted) return Promise.reject(new InferenceError("Pedido cancelado.", "aborted"));
    let target;
    try {
      target = ensureWorker();
    } catch {
      return Promise.reject(new InferenceError("Este navegador não iniciou o trabalhador de inferência.", "unavailable"));
    }
    const id = ++serial;
    return new Promise((resolve, reject) => {
      const onAbort = () => settle(id)?.reject(new InferenceError("Pedido cancelado.", "aborted"));
      const timer = setTimeout(() => {
        // A stuck worker cannot be trusted with later requests; restart it.
        settle(id)?.reject(new InferenceError("A bancada demorou demais para responder.", "timeout"));
        if (worker === target) reset(new InferenceError("O trabalhador de inferência foi reiniciado.", "timeout"));
      }, options.timeoutMs ?? timeoutMs);
      pending.set(id, { resolve, reject, timer, signal, onAbort, onProgress });
      signal?.addEventListener("abort", onAbort, { once: true });
      target.postMessage({ id, type, payload }, transfer);
    });
  }

  return {
    request,
    terminate: () => reset(new InferenceError("Trabalhador encerrado.", "aborted")),
    get pendingCount() {
      return pending.size;
    },
  };
}
