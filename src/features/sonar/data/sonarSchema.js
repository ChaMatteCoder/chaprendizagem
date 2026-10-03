export const SONAR_FEATURE_COUNT = 60;
export const SONAR_CLASS_ORDER = Object.freeze(['R', 'M']);
export const SONAR_CLASSES = Object.freeze([
  Object.freeze({ index: 0, label: 'R', name: 'Rocha' }),
  Object.freeze({ index: 1, label: 'M', name: 'Metal' }),
]);
export const SONAR_FEATURE_ORDER = Object.freeze(
  Array.from({ length: SONAR_FEATURE_COUNT }, (_, index) => `Attribute${index + 1}`),
);
export const SONAR_EXPECTED_COUNTS = Object.freeze({ R: 97, M: 111 });
export const SONAR_SAMPLE_COUNT = 208;

export function sonarLabelIndex(label) {
  const index = SONAR_CLASS_ORDER.indexOf(label);
  if (index < 0) throw new Error(`Rótulo Sonar inválido: ${String(label)}. Esperado R ou M.`);
  return index;
}
