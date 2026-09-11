export function hasDrawingInk(image) {
  if (!image?.data?.length) return false;
  for (let i = 0; i < image.data.length; i += 4) {
    // Composite over white: transparent pixels are not strokes.
    const darkness = (255 - (image.data[i] + image.data[i + 1] + image.data[i + 2]) / 3) * image.data[i + 3] / 255;
    if (darkness > 24) return true;
  }
  return false;
}

export function getRemainingSeconds(deadline, now) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
