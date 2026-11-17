import { PROGRESS_KEY, readProgress } from "./mission/progress.js";

export { PROGRESS_KEY };
export const PREFERENCES_KEY = "enganai.preferences.v1";
export const DEFAULT_PREFERENCES = Object.freeze({
  schemaVersion: 1,
  kind: "preferences",
  dataMode: "recorded",
  soundEnabled: false,
  motion: "system",
  explanation: "intuitive",
});

export function isPreferences(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 6 &&
    value.schemaVersion === 1 &&
    value.kind === "preferences" &&
    value.dataMode === "recorded" &&
    typeof value.soundEnabled === "boolean" &&
    ["system", "reduced"].includes(value.motion) &&
    ["intuitive", "technical"].includes(value.explanation)
  );
}

export function readPreferences(storage) {
  let raw;
  try {
    raw = storage.getItem(PREFERENCES_KEY);
  } catch {
    return { value: { ...DEFAULT_PREFERENCES }, persistence: "unavailable" };
  }
  if (raw === null)
    return { value: { ...DEFAULT_PREFERENCES }, persistence: "ready" };
  try {
    const value = JSON.parse(raw);
    if (!isPreferences(value))
      return { value: { ...DEFAULT_PREFERENCES }, persistence: "incompatible" };
    return { value, persistence: "ready" };
  } catch {
    return { value: { ...DEFAULT_PREFERENCES }, persistence: "incompatible" };
  }
}

export function writePreferences(storage, value, persistence) {
  if (persistence === "incompatible") return "incompatible";
  if (!isPreferences(value))
    throw new TypeError("Preferências incompatíveis com o contrato v1.");
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(value));
    return "ready";
  } catch {
    return "unavailable";
  }
}

// Compatibility view used by the mural; validation lives in lib/mission/progress.js.
export function readMissionProgress(storage, missions) {
  const { record, persistence } = readProgress(storage, missions);
  return persistence === "ready"
    ? { completed: [...record.completedMissionIds], persistence }
    : { completed: [], persistence: "unavailable" };
}
