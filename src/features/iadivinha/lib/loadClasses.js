import { CLASS_CATALOG } from '../data/classCatalog.js';

export function validateClasses(classes) {
  const coreCount = CLASS_CATALOG.filter(item => item.type === 'core').length;
  if (!Array.isArray(classes) || ![coreCount, CLASS_CATALOG.length].includes(classes.length) ||
    classes.some((item, index) => item.index !== index || item.id !== CLASS_CATALOG[index].id || item.label !== CLASS_CATALOG[index].label)) {
    throw new Error('O manifesto não corresponde ao catálogo de desafios.');
  }
  return classes;
}

export async function loadClasses(signal) {
  const response = await fetch('/models/iadivinha/classes.json', { signal });
  if (!response.ok) throw new Error('Não foi possível carregar os desafios. Recarregue a página para tentar novamente.');
  return validateClasses(await response.json());
}
