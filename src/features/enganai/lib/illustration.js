// Visual aids only. These functions neither load a dataset nor run a GAN.
export function seededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function latentVector(seed, size = 8) {
  const random = seededRandom(seed);
  return Array.from({ length: size }, () => random() * 2 - 1);
}

export function interpolateVectors(a, b, amount) {
  return a.map((value, index) => (1 - amount) * value + amount * b[index]);
}

export function illustrationPixels(seed = 42, structure = 1, kind = 0) {
  const random = seededRandom(seed);
  return Array.from({ length: 28 * 28 }, (_, index) => {
    const x = index % 28;
    const y = Math.floor(index / 28);
    let inside;
    if (kind % 3 === 0) {
      inside =
        (x >= 8 && x <= 19 && y >= 8 && y <= 23) ||
        (y >= 6 &&
          y <= 12 &&
          x >= 3 &&
          x <= 24 &&
          !(x >= 11 && x <= 16 && y < 9));
    } else if (kind % 3 === 1) {
      inside =
        (x >= 6 && x <= 21 && y >= 12 && y <= 23) ||
        (y >= 6 && y < 12 && ((x >= 9 && x <= 11) || (x >= 16 && x <= 18))) ||
        (y >= 5 && y <= 7 && x >= 10 && x <= 17);
    } else {
      inside =
        (x >= 9 && x <= 18 && y >= 5 && y <= 20) ||
        (x >= 8 && x <= 24 && y >= 19 && y <= 23);
    }
    const noise = random();
    const shape = inside ? 0.65 + noise * 0.3 : noise * 0.07;
    return Math.round(
      255 * (shape * structure + noise * (1 - structure) * 0.74),
    );
  });
}
