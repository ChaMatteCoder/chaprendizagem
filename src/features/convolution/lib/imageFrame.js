import { validateImage } from './convolution.js';

// React 19 percorre props enumeráveis para registrar diferenças no profiler.
// Os pixels continuam acessíveis por .data, sem virar milhões de entradas de log.
export function createImageFrame(image) {
  validateImage(image);
  if (Object.getOwnPropertyDescriptor(image, 'data')?.enumerable === false) return image;
  const { data, ...metadata } = image;
  return Object.defineProperty(metadata, 'data', { value: data });
}

// Structured clone não inclui propriedades não enumeráveis. O buffer é exposto
// somente na mensagem para o worker, que não passa pela árvore de componentes.
export function imageFrameMessage(image) {
  if (!image || Object.getOwnPropertyDescriptor(image, 'data')?.enumerable !== false) return image;
  return { ...image, data: image.data };
}
