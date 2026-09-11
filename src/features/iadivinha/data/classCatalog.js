import catalog from './classCatalog.json' with { type: 'json' };
export const CLASS_CATALOG = Object.freeze(catalog.map(item => Object.freeze(item)));

export const classById = id => CLASS_CATALOG.find(item => item.id === id);
export const isSpecial = item => classById(item?.id)?.type === 'special';
export const topProbabilities = probabilities => [...probabilities].sort((a, b) => b.probability - a.probability).slice(0, 3);
