export const kernelPresets = [
  { id: 'sharpen', name: 'Nitidez', description: 'Realça detalhes e transições de intensidade.', kernel: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], divisor: 1, bias: 0, absolute: false },
  { id: 'mean', name: 'Média', description: 'Cada pixel recebe a média dos nove vizinhos: a imagem fica mais suave.', kernel: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], divisor: 9, bias: 0, absolute: false },
  { id: 'gaussian', name: 'Gaussiano', description: 'Suaviza com maior peso para os pixels próximos do centro.', kernel: [[1, 2, 1], [2, 4, 2], [1, 2, 1]], divisor: 16, bias: 0, absolute: false },
  { id: 'sobel-x', name: 'Sobel X', description: 'Detecta variações horizontais de intensidade, destacando bordas verticais.', kernel: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], divisor: 1, bias: 0, absolute: true },
  { id: 'sobel-y', name: 'Sobel Y', description: 'Detecta variações verticais de intensidade, destacando bordas horizontais.', kernel: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], divisor: 1, bias: 0, absolute: true },
  { id: 'laplacian', name: 'Laplaciano', description: 'Destaca mudanças de intensidade em todas as direções.', kernel: [[0, -1, 0], [-1, 4, -1], [0, -1, 0]], divisor: 1, bias: 0, absolute: true },
  { id: 'emboss', name: 'Relevo', description: 'Um kernel direcional e um deslocamento de 128 criam a impressão de relevo.', kernel: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]], divisor: 1, bias: 128, absolute: false },
  { id: 'identity', name: 'Identidade', description: 'Preserva os pixels. Use como referência para conferir a operação.', kernel: [[0, 0, 0], [0, 1, 0], [0, 0, 0]], divisor: 1, bias: 0, absolute: false },
];

export function optionsFromPreset(preset = kernelPresets[0]) {
  return { kernel: preset.kernel.map(row => [...row]), divisor: preset.divisor, bias: preset.bias, absolute: preset.absolute, border: 'reflect' };
}

export const sampleImages = [
  { id: 'atelier', name: 'Ateliê de cores', url: '/images/convolution/atelier.svg', description: 'Objetos, linhas e cores para comparar detalhes.' },
  { id: 'patterns', name: 'Formas e contrastes', url: '/images/convolution/patterns.svg', description: 'Bordas, gradientes e texturas para investigar filtros.' },
];
