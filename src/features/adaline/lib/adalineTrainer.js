export function parseDataset(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const dataLines = lines[0]?.toLowerCase().includes('s1') ? lines.slice(1) : lines;

  const headers = lines[0]?.toLowerCase().includes('s1') ? lines[0].split(/[;,]\s*/).map((item) => item.trim()) : [];
  const inputHeaders = headers.filter((header) => /^s[1-4]$/.test(header));

  return dataLines.map((line, index) => {
    const values = line.split(/[;,]\s*/).map(Number);
    const dimensions = inputHeaders.length || values.length - 1;
    const inputs = values.slice(0, dimensions);
    const t = values[dimensions];

    if (dimensions < 2 || dimensions > 4 || ![...inputs, t].every(Number.isFinite) || ![-1, 1].includes(t)) {
      throw new Error(`Linha ${index + 2}: use de s1,s2 até s4, com t igual a -1 ou 1.`);
    }

    return inputs.reduce(
      (sample, value, inputIndex) => ({
        ...sample,
        [`s${inputIndex + 1}`]: value,
      }),
      { t },
    );
  });
}

export function getInputKeys(dataset) {
  const keys = new Set();

  for (const sample of dataset) {
    Object.keys(sample)
      .filter((key) => /^s[1-4]$/.test(key))
      .forEach((key) => keys.add(key));
  }

  return [...keys].sort();
}

export function trainAdaline(dataset, { learningRate = 0.01, epochs = 60, tolerance = 0.000001 } = {}) {
  let bias = 0;
  const inputKeys = getInputKeys(dataset);
  let weights = Array.from({ length: inputKeys.length }, () => 0);
  const errorHistory = [];

  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    let totalSquaredError = 0;

    for (const sample of dataset) {
      const output = bias + weights.reduce((sum, weight, index) => sum + weight * sample[inputKeys[index]], 0);
      const error = sample.t - output;

      bias += learningRate * error;
      weights = weights.map((weight, index) => weight + learningRate * error * sample[inputKeys[index]]);
      totalSquaredError += error ** 2;
    }

    errorHistory.push({
      epoch,
      error: Number(totalSquaredError.toFixed(6)),
    });

    if (totalSquaredError <= tolerance) {
      break;
    }
  }

  const predictions = dataset.map((sample, index) => {
    const output = bias + weights.reduce((sum, weight, weightIndex) => sum + weight * sample[inputKeys[weightIndex]], 0);
    const predicted = output >= 0 ? 1 : -1;

    return {
      ...sample,
      index: index + 1,
      output: Number(output.toFixed(4)),
      predicted,
      correct: predicted === sample.t,
    };
  });

  const hits = predictions.filter((sample) => sample.correct).length;

  return {
    bias: Number(bias.toFixed(6)),
    weights: weights.map((weight) => Number(weight.toFixed(6))),
    inputKeys,
    errorHistory,
    predictions,
    accuracy: Number(((hits / dataset.length) * 100).toFixed(1)),
  };
}

export function buildDecisionBoundary(dataset, weights, bias) {
  const s1Values = dataset.map((item) => item.s1);
  const extraKeys = getInputKeys(dataset).slice(2);
  const extraAverages = extraKeys.map((key) => dataset.reduce((sum, item) => sum + (Number(item[key]) || 0), 0) / dataset.length);
  const minS1 = Math.min(...s1Values) - 0.2;
  const maxS1 = Math.max(...s1Values) + 0.2;

  if (Math.abs(weights[1]) < 0.000001) {
    return [];
  }

  return [minS1, maxS1].map((s1) => ({
    s1: Number(s1.toFixed(3)),
    boundary: Number(
      (
        -(
          bias +
          weights[0] * s1 +
          extraAverages.reduce((sum, average, index) => sum + (weights[index + 2] || 0) * average, 0)
        ) / weights[1]
      ).toFixed(3),
    ),
  }));
}

export function downloadSvgAsPng(svgElement, filename) {
  const serializer = new XMLSerializer();
  const svgText = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svgElement.clientWidth * 2;
    canvas.height = svgElement.clientHeight * 2;

    const context = canvas.getContext('2d');
    context.fillStyle = '#fbfaf6';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  image.src = url;
}
