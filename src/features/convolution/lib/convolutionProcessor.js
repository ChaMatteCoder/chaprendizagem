import { imageFrameMessage } from './imageFrame.js';

export function createConvolutionProcessor(createWorker, timeoutMs = 15000) {
  let worker = null;
  let cachedImage = null;
  let pending = null;

  function releaseWorker() {
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
    worker = null;
    cachedImage = null;
  }

  function cancel({ releaseInput = false } = {}) {
    const task = pending;
    pending = null;
    if (task) {
      clearTimeout(task.timer);
      task.reject(new DOMException('Processamento cancelado.', 'AbortError'));
    }
    if (task || releaseInput) releaseWorker();
  }

  function run(image, grayInput, options) {
    cancel();
    return new Promise((resolve, reject) => {
      try {
        worker ??= createWorker();
        const task = { resolve, reject, timer: null };
        pending = task;
        function finish(error, result) {
          if (pending !== task) return;
          pending = null;
          clearTimeout(task.timer);
          // O worker ocioso não deve reter closures da execução anterior.
          worker.onmessage = null;
          worker.onerror = null;
          worker.onmessageerror = null;
          if (error) {
            releaseWorker();
            reject(error);
          } else resolve(result);
        }
        worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data);
        worker.onerror = () => finish(new Error('O processamento falhou. Tente aplicar novamente.'));
        worker.onmessageerror = () => finish(new Error('Não foi possível receber o resultado. Tente novamente.'));
        task.timer = setTimeout(() => finish(new Error('O processamento demorou demais. Tente aplicar novamente.')), timeoutMs);
        const nextImage = cachedImage === image ? undefined : image;
        worker.postMessage({ image: imageFrameMessage(nextImage), grayInput: nextImage ? imageFrameMessage(grayInput) : undefined, options });
        cachedImage = image;
      } catch (error) {
        if (pending) clearTimeout(pending.timer);
        pending = null;
        releaseWorker();
        reject(error);
      }
    });
  }

  return { run, cancel, dispose: () => cancel({ releaseInput: true }) };
}
