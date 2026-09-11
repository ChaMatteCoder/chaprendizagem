import { CLASS_CATALOG, classById } from '../data/classCatalog.js';

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

// Draw the special class and slot independently, then choose a legal core arrangement.
export function createRareGameSequence(classes = CLASS_CATALOG, random = Math.random) {
  if (classes.length !== CLASS_CATALOG.length || new Set(classes.map(item => item.id)).size !== classes.length || classes.some(item => !classById(item.id))) throw new Error('Catálogo incompleto.');
  const core = classes.filter(item => classById(item.id).type === 'core');
  const special = classes.filter(item => classById(item.id).type === 'special');
  const pick = length => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Aleatoriedade inválida.');
    return Math.floor(value * length);
  };
  const rare = special[pick(special.length)], slot = 1 + pick(5);
  const pool = [...core, core[pick(core.length)], core[pick(core.length)]];
  const candidates = [];
  function visit(sequence, rest) {
    if (sequence.length === 6) { candidates.push(sequence); return; }
    if (sequence.length === slot) { visit([...sequence, rare], rest); return; }
    const seen = new Set();
    rest.forEach((item, index) => {
      if (seen.has(item.id) || sequence.at(-1)?.id === item.id) return;
      seen.add(item.id);
      visit([...sequence, item], rest.filter((_, at) => at !== index));
    });
  }
  visit([], pool);
  return candidates[pick(candidates.length)];
}

// Preserve compatibility with archived three-class manifests.
export function createGameSequence(classes, random = Math.random) {
  if (classes.length === CLASS_CATALOG.length) return createRareGameSequence(classes, random);
  const sequences = [];
  function visit(sequence, remaining) {
    if (sequence.length === classes.length * 2) {
      sequences.push(sequence);
      return;
    }
    classes.forEach((item, index) => {
      if (!remaining[index] || sequence.at(-1)?.id === item.id) return;
      const next = [...remaining];
      next[index] -= 1;
      visit([...sequence, item], next);
    });
  }
  if (classes.length !== 3 || new Set(classes.map((item) => item.id)).size !== 3) {
    throw new Error('A partida precisa de três classes diferentes.');
  }
  visit([], classes.map(() => 2));
  return sequences[Math.min(sequences.length - 1, Math.max(0, Math.floor(random() * sequences.length)))];
}
