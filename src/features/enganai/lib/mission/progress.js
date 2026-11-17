import { ROUND_COUNT, sessionErrors } from "./session.js";

export const PROGRESS_KEY = "enganai.progress.v1";
const ID = /^[a-z0-9][a-z0-9._-]{0,95}$/;

export function emptyProgress() {
  return { schemaVersion: 1, kind: "progress", dataMode: "recorded", completedMissionIds: [], missions: [], badges: [], completedSessionIds: [] };
}

function expectedBadges(completed, missions) {
  return [...(completed.size ? ["first-mission"] : []), ...(completed.size === missions.length ? ["all-missions"] : [])];
}

// Stage-01 progress rules: coherent records, prerequisites, derived badges, one count per session.
export function isProgress(progress, missions) {
  if (!progress || typeof progress !== "object" || Array.isArray(progress) || Object.keys(progress).length !== 7) return false;
  if (progress.schemaVersion !== 1 || progress.kind !== "progress" || progress.dataMode !== "recorded") return false;
  const { completedMissionIds, missions: records, completedSessionIds, badges } = progress;
  if (![completedMissionIds, records, completedSessionIds, badges].every(Array.isArray)) return false;
  const known = new Set(missions.map(({ id }) => id));
  const completed = new Set(completedMissionIds);
  if (completed.size !== completedMissionIds.length || [...completed].some((id) => !known.has(id))) return false;
  if (new Set(completedSessionIds).size !== completedSessionIds.length || completedSessionIds.some((id) => typeof id !== "string" || !ID.test(id))) return false;
  if (records.length !== completed.size || new Set(records.map((item) => item.missionId)).size !== completed.size) return false;
  for (const item of records) {
    if (
      !item || Object.keys(item).length !== 4 || !completed.has(item.missionId) ||
      !Number.isInteger(item.bestCorrect) || item.bestCorrect < 0 || item.bestCorrect > ROUND_COUNT ||
      item.bestScore !== item.bestCorrect * 100 || !Number.isInteger(item.completions) || item.completions < 1
    )
      return false;
  }
  if (records.reduce((total, item) => total + item.completions, 0) !== completedSessionIds.length) return false;
  if (missions.some((mission) => completed.has(mission.id) && mission.requires && !completed.has(mission.requires))) return false;
  const badgesExpected = expectedBadges(completed, missions);
  return badgesExpected.length === badges.length && badgesExpected.every((id) => badges.includes(id));
}

// `incompatible` data is preserved: it is never overwritten by a newer session.
export function readProgress(storage, missions) {
  let raw;
  try {
    raw = storage.getItem(PROGRESS_KEY);
  } catch {
    return { record: emptyProgress(), persistence: "unavailable" };
  }
  if (raw === null) return { record: emptyProgress(), persistence: "ready" };
  try {
    const record = JSON.parse(raw);
    return isProgress(record, missions) ? { record, persistence: "ready" } : { record: emptyProgress(), persistence: "incompatible" };
  } catch {
    return { record: emptyProgress(), persistence: "incompatible" };
  }
}

export function isUnlocked(record, mission) {
  return !mission.requires || record.completedMissionIds.includes(mission.requires);
}

// Pure: returns the same record when the session was already counted or cannot count.
export function applySession(record, session, missions) {
  const mission = missions.find((item) => item.id === session.missionId);
  if (!mission) return { record, status: "invalid" };
  if (session.phase !== "summary" || session.dataMode !== "recorded" || sessionErrors(session).length) return { record, status: "invalid" };
  if (record.completedSessionIds.includes(session.id)) return { record, status: "duplicate" };
  if (!isUnlocked(record, mission)) return { record, status: "locked" };
  const correct = session.answers.filter((answer) => answer.correct).length;
  const previous = record.missions.find((item) => item.missionId === mission.id);
  const updated = previous
    ? { ...previous, completions: previous.completions + 1, bestCorrect: Math.max(previous.bestCorrect, correct), bestScore: Math.max(previous.bestCorrect, correct) * 100 }
    : { missionId: mission.id, bestScore: correct * 100, bestCorrect: correct, completions: 1 };
  const completed = new Set([...record.completedMissionIds, mission.id]);
  const order = missions.map((item) => item.id);
  const next = {
    ...record,
    completedMissionIds: order.filter((id) => completed.has(id)),
    missions: [...record.missions.filter((item) => item.missionId !== mission.id), updated].sort((a, b) => order.indexOf(a.missionId) - order.indexOf(b.missionId)),
    completedSessionIds: [...record.completedSessionIds, session.id],
  };
  next.badges = expectedBadges(completed, missions);
  return { record: next, status: "saved", newlyUnlocked: missions.filter((item) => item.requires === mission.id && !record.completedMissionIds.includes(mission.id)).map((item) => item.id) };
}

export function saveCompletedSession(storage, session, missions) {
  const { record, persistence } = readProgress(storage, missions);
  if (persistence !== "ready") return { status: persistence, record };
  const result = applySession(record, session, missions);
  if (result.status !== "saved") return result;
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(result.record));
    return result;
  } catch {
    return { ...result, status: "unavailable" };
  }
}
