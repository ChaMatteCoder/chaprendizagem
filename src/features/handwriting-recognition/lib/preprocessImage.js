const MAX_PROCESSING_SIDE = 768;
const FINAL_SIZE = 28;
const TARGET_INK_BOX = 22;

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function drawSourceToCanvas(source) {
  const width = source.videoWidth || source.naturalWidth || source.width;
  const height = source.videoHeight || source.naturalHeight || source.height;
  const scale = Math.min(1, MAX_PROCESSING_SIDE / Math.max(width, height));
  const canvas = createCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  return {
    canvas,
    originalHeight: height,
    originalWidth: width,
    resized: scale < 1,
  };
}

function imageDataToDataUrl(imageData, width, height) {
  const canvas = createCanvas(width, height);
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function canvasToDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}

function buildGrayImageData(originalImageData, width, height) {
  const grayData = new ImageData(width, height);
  const grayPixels = [];
  let minGray = 255;
  let maxGray = 0;
  let sumGray = 0;

  for (let index = 0; index < originalImageData.data.length; index += 4) {
    const red = originalImageData.data[index];
    const green = originalImageData.data[index + 1];
    const blue = originalImageData.data[index + 2];
    const alpha = originalImageData.data[index + 3] / 255;
    const gray = Math.round((0.299 * red + 0.587 * green + 0.114 * blue) * alpha + 255 * (1 - alpha));

    grayData.data[index] = gray;
    grayData.data[index + 1] = gray;
    grayData.data[index + 2] = gray;
    grayData.data[index + 3] = 255;
    grayPixels.push(gray);
    minGray = Math.min(minGray, gray);
    maxGray = Math.max(maxGray, gray);
    sumGray += gray;
  }

  return {
    grayData,
    grayPixels,
    stats: {
      maxGray,
      meanGray: sumGray / Math.max(1, grayPixels.length),
      minGray,
    },
  };
}

function getInkThreshold({ maxGray, minGray }) {
  const contrast = maxGray - minGray;
  return Math.round(Math.min(225, Math.max(80, minGray + contrast * 0.68)));
}

function getInkBounds(grayPixels, width, height, threshold) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let activePixels = 0;
  let centerXSum = 0;
  let centerYSum = 0;
  let weightSum = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const gray = grayPixels[y * width + x];
      if (gray < threshold) {
        const weight = Math.max(0.01, (threshold - gray) / threshold);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        activePixels += 1;
        centerXSum += x * weight;
        centerYSum += y * weight;
        weightSum += weight;
      }
    }
  }

  if (maxX < 0) return null;

  return {
    activePixels,
    centerX: centerXSum / Math.max(1, weightSum),
    centerY: centerYSum / Math.max(1, weightSum),
    height: maxY - minY + 1,
    maxX,
    maxY,
    minX,
    minY,
    width: maxX - minX + 1,
  };
}

function createBoundingBoxPreview(grayData, width, height, bounds) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.putImageData(grayData, 0, 0);

  if (bounds) {
    context.strokeStyle = '#c65f45';
    context.lineWidth = Math.max(2, Math.round(Math.max(width, height) / 180));
    context.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
  }

  return canvasToDataUrl(canvas);
}

function createCropPreview(grayData, sourceWidth, sourceHeight, crop) {
  const sourceCanvas = createCanvas(sourceWidth, sourceHeight);
  sourceCanvas.getContext('2d').putImageData(grayData, 0, 0);

  const cropCanvas = createCanvas(crop.width, crop.height);
  cropCanvas
    .getContext('2d')
    .drawImage(sourceCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return canvasToDataUrl(cropCanvas);
}

function calculateCrop(bounds, sourceWidth, sourceHeight) {
  const safetyPadding = Math.ceil(Math.max(bounds.width, bounds.height) * 0.18);
  const side = Math.max(bounds.width, bounds.height) + safetyPadding * 2;
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;
  const cropX = Math.max(0, Math.round(centerX - side / 2));
  const cropY = Math.max(0, Math.round(centerY - side / 2));
  const cropW = Math.min(sourceWidth - cropX, Math.round(side));
  const cropH = Math.min(sourceHeight - cropY, Math.round(side));

  return {
    height: Math.max(1, cropH),
    width: Math.max(1, cropW),
    x: cropX,
    y: cropY,
  };
}

function createFinalMnistCanvas(grayData, sourceWidth, sourceHeight, crop, bounds) {
  const grayCanvas = createCanvas(sourceWidth, sourceHeight);
  grayCanvas.getContext('2d').putImageData(grayData, 0, 0);

  const normalizedCanvas = createCanvas(FINAL_SIZE, FINAL_SIZE);
  const normalizedContext = normalizedCanvas.getContext('2d', { willReadFrequently: true });
  normalizedContext.fillStyle = '#ffffff';
  normalizedContext.fillRect(0, 0, FINAL_SIZE, FINAL_SIZE);

  const inkScale = TARGET_INK_BOX / Math.max(bounds.width, bounds.height, 1);
  const drawW = Math.max(1, crop.width * inkScale);
  const drawH = Math.max(1, crop.height * inkScale);
  const centerInCropX = bounds.centerX - crop.x;
  const centerInCropY = bounds.centerY - crop.y;
  const dx = FINAL_SIZE / 2 - centerInCropX * inkScale;
  const dy = FINAL_SIZE / 2 - centerInCropY * inkScale;

  normalizedContext.imageSmoothingEnabled = true;
  normalizedContext.imageSmoothingQuality = 'high';
  normalizedContext.drawImage(grayCanvas, crop.x, crop.y, crop.width, crop.height, dx, dy, drawW, drawH);

  const normalizedImageData = normalizedContext.getImageData(0, 0, FINAL_SIZE, FINAL_SIZE);
  const mnistCanvas = createCanvas(FINAL_SIZE, FINAL_SIZE);
  const mnistContext = mnistCanvas.getContext('2d', { willReadFrequently: true });
  const mnistImageData = mnistContext.createImageData(FINAL_SIZE, FINAL_SIZE);

  for (let index = 0; index < normalizedImageData.data.length; index += 4) {
    const gray = normalizedImageData.data[index];
    const intensity = Math.max(0, Math.min(255, 255 - gray));
    const cleaned = intensity < 10 ? 0 : intensity;
    mnistImageData.data[index] = cleaned;
    mnistImageData.data[index + 1] = cleaned;
    mnistImageData.data[index + 2] = cleaned;
    mnistImageData.data[index + 3] = 255;
  }

  mnistContext.putImageData(mnistImageData, 0, 0);
  return {
    imageData: mnistImageData,
    mnistCanvas,
  };
}

function buildVectorFromMnistImageData(imageData) {
  const pixels = [];
  const vector = [];
  let min = 1;
  let max = 0;
  let sum = 0;
  let activePixels = 0;

  for (let index = 0; index < imageData.data.length; index += 4) {
    const normalized = Number((imageData.data[index] / 255).toFixed(4));
    vector.push(normalized);
    pixels.push(normalized);
    min = Math.min(min, normalized);
    max = Math.max(max, normalized);
    sum += normalized;
    if (normalized > 0.12) activePixels += 1;
  }

  return {
    pixels,
    stats: {
      activePixels,
      max,
      mean: sum / Math.max(1, vector.length),
      min,
    },
    vector,
  };
}

function buildWarnings({ bounds, contrast, crop, finalStats, originalCanvas, sourceCanvas }) {
  const warnings = [];

  if (sourceCanvas.resized) {
    warnings.push(
      `A imagem original (${sourceCanvas.originalWidth}x${sourceCanvas.originalHeight}) foi reduzida para ${originalCanvas.width}x${originalCanvas.height} antes do processamento.`,
    );
  }

  if (originalCanvas.width < 80 || originalCanvas.height < 80) {
    warnings.push('A imagem tem baixa resolucao; detalhes finos podem desaparecer no 28x28.');
  }

  if (!bounds) {
    warnings.push('Nenhum traço escuro foi detectado. Desenhe ou envie um caractere com mais contraste.');
    return warnings;
  }

  const sizeRatio = Math.max(bounds.width / originalCanvas.width, bounds.height / originalCanvas.height);
  if (sizeRatio < 0.16) {
    warnings.push('Desenho muito pequeno.');
  }

  if (bounds.minX <= 2 || bounds.minY <= 2 || bounds.maxX >= originalCanvas.width - 3 || bounds.maxY >= originalCanvas.height - 3) {
    warnings.push('Desenho muito proximo da borda.');
  }

  if (crop.x === 0 || crop.y === 0 || crop.x + crop.width >= originalCanvas.width || crop.y + crop.height >= originalCanvas.height) {
    warnings.push('O recorte encostou na borda da imagem; deixe mais margem ao redor do dígito.');
  }

  if (contrast < 45) {
    warnings.push('Pouco contraste detectado.');
  }

  if (finalStats.activePixels < 24) {
    warnings.push('Poucos pixels ativos.');
  }

  return warnings;
}

export function preprocessImageSource(source) {
  const sourceCanvas = drawSourceToCanvas(source);
  const originalCanvas = sourceCanvas.canvas;
  const sourceContext = originalCanvas.getContext('2d', { willReadFrequently: true });
  const originalImageData = sourceContext.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
  const { grayData, grayPixels, stats: grayStats } = buildGrayImageData(
    originalImageData,
    originalCanvas.width,
    originalCanvas.height,
  );
  const threshold = getInkThreshold(grayStats);
  const bounds = getInkBounds(grayPixels, originalCanvas.width, originalCanvas.height, threshold);
  const fallbackCrop = { height: originalCanvas.height, width: originalCanvas.width, x: 0, y: 0 };
  const crop = bounds ? calculateCrop(bounds, originalCanvas.width, originalCanvas.height) : fallbackCrop;
  const { imageData: finalImageData, mnistCanvas } = bounds
    ? createFinalMnistCanvas(grayData, originalCanvas.width, originalCanvas.height, crop, bounds)
    : (() => {
        const canvas = createCanvas(FINAL_SIZE, FINAL_SIZE);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.fillStyle = '#000000';
        context.fillRect(0, 0, FINAL_SIZE, FINAL_SIZE);
        return { imageData: context.getImageData(0, 0, FINAL_SIZE, FINAL_SIZE), mnistCanvas: canvas };
      })();
  const { pixels, stats: finalStats, vector } = buildVectorFromMnistImageData(finalImageData);
  const warnings = buildWarnings({
    bounds,
    contrast: grayStats.maxGray - grayStats.minGray,
    crop,
    finalStats,
    originalCanvas,
    sourceCanvas,
  });

  return {
    boundingBoxDataUrl: createBoundingBoxPreview(grayData, originalCanvas.width, originalCanvas.height, bounds),
    bounds,
    crop,
    cropDataUrl: createCropPreview(grayData, originalCanvas.width, originalCanvas.height, crop),
    grayPreview: imageDataToDataUrl(grayData, originalCanvas.width, originalCanvas.height),
    mnistVector: vector,
    originalDataUrl: originalCanvas.toDataURL('image/png'),
    pixels,
    processedDataUrl: canvasToDataUrl(mnistCanvas),
    stats: finalStats,
    threshold,
    vector,
    warnings,
  };
}
