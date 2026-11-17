// Mission session: a pure state machine over the stage-01 `session` contract.
// The answer key lives in the sample provenance and is only projected after an answer.

export const ROUND_COUNT = 5;
export const POINTS_CORRECT = 100;
export const SELECTION_RNG = "mulberry32-v1";
const ID = /^[a-z0-9][a-z0-9._-]{0,95}$/;
const ORIGINS = new Set(["real", "synthetic"]);

// Selection only: decides which pool entries enter the session. Latent values come from the recorded pool.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDistinct(random, size, count) {
  const chosen = new Set();
  while (chosen.size < count) chosen.add(Math.floor(random() * size));
  return [...chosen];
}

// Five rounds, 2 or 3 of each origin, no repeated sample, order shuffled; reproducible from the seed.
export function planRounds(seed, { realCount, latentCount }) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError("Semente de seleção inválida.");
  if (realCount < 3 || latentCount < 3) throw new RangeError("O conjunto da arena é pequeno demais.");
  const random = mulberry32(seed);
  const reals = random() < 0.5 ? 2 : 3;
  const origins = [...Array(reals).fill("real"), ...Array(ROUND_COUNT - reals).fill("synthetic")];
  for (let i = origins.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [origins[i], origins[j]] = [origins[j], origins[i]];
  }
  const realIndices = pickDistinct(random, realCount, reals);
  const latentIndices = pickDistinct(random, latentCount, ROUND_COUNT - reals);
  return origins.map((origin) => ({ origin, index: origin === "real" ? realIndices.shift() : latentIndices.shift() }));
}

export function createSession({ id, missionId, selectionSeed }) {
  if (!ID.test(id) || !ID.test(missionId)) throw new TypeError("Identificador de sessão inválido.");
  if (!Number.isInteger(selectionSeed) || selectionSeed < 0 || selectionSeed > 0xffffffff) throw new RangeError("Semente inválida.");
  return {
    session: {
      schemaVersion: 1,
      kind: "session",
      dataMode: "recorded",
      id,
      missionId,
      phase: "briefing",
      roundCount: ROUND_COUNT,
      currentRoundIndex: 0,
      sampleIds: [],
      answers: [],
      score: 0,
      selectionSeed,
      error: null,
    },
    rounds: [],
  };
}

export const sampleIdFor = (sessionId, index) => `${sessionId}-${index + 1}`;

export function sampleRecord({ sessionId, index, provenance, imageAsset }) {
  return {
    schemaVersion: 1,
    kind: "sample",
    dataMode: "recorded",
    id: sampleIdFor(sessionId, index),
    image: { asset: imageAsset, width: 28, height: 28, channels: 1, encoding: "png" },
    provenance,
  };
}

function checkRounds(state, rounds) {
  if (!Array.isArray(rounds) || rounds.length !== ROUND_COUNT) return false;
  const ids = rounds.map((round) => round.sample?.id);
  if (new Set(ids).size !== ROUND_COUNT || ids.some((id, index) => id !== sampleIdFor(state.session.id, index))) return false;
  const reals = rounds.filter((round) => round.sample.provenance?.origin === "real");
  if (reals.length < 2 || reals.length > 3) return false;
  return rounds.every(
    (round) =>
      ORIGINS.has(round.sample.provenance?.origin) &&
      (round.sample.provenance.origin !== "real" || round.sample.provenance.partition === "arena") &&
      round.sample.dataMode === "recorded" &&
      round.discriminator && typeof round.discriminator.status === "string",
  );
}

export function sessionReducer(state, action) {
  const { session } = state;
  switch (action.type) {
    case "prepare":
      if (session.phase !== "briefing" && !(session.phase === "error" && session.error?.recoverTo === "preparing")) return state;
      return { session: { ...session, phase: "preparing", currentRoundIndex: 0, sampleIds: [], answers: [], score: 0, error: null }, rounds: [] };
    case "prepared":
      if (session.phase !== "preparing" || !checkRounds(state, action.rounds)) return state;
      return { session: { ...session, phase: "investigating", sampleIds: action.rounds.map((round) => round.sample.id) }, rounds: action.rounds };
    case "fail":
      if (session.phase !== "preparing") return state;
      return {
        session: { ...session, phase: "error", sampleIds: [], answers: [], score: 0, currentRoundIndex: 0, error: { code: action.code, message: action.message, recoverTo: "preparing" } },
        rounds: [],
      };
    case "answer": {
      const index = session.currentRoundIndex;
      // One answer per round: repeated clicks, late events and other rounds are ignored.
      if (session.phase !== "investigating" || action.roundIndex !== index || session.answers.length !== index || !ORIGINS.has(action.choice)) return state;
      const { sample, discriminator } = state.rounds[index];
      const correctOrigin = sample.provenance.origin;
      const correct = action.choice === correctOrigin;
      const reveal = {
        schemaVersion: 1,
        kind: "round-reveal",
        dataMode: "recorded",
        sampleId: sample.id,
        roundIndex: index,
        playerChoice: action.choice,
        correctOrigin,
        correct,
        points: correct ? POINTS_CORRECT : 0,
        provenance: sample.provenance,
        discriminator,
      };
      const answers = [...session.answers, reveal];
      return { ...state, session: { ...session, phase: "revealed", answers, score: answers.reduce((sum, item) => sum + item.points, 0) } };
    }
    case "next":
      if (session.phase !== "revealed") return state;
      if (session.currentRoundIndex === ROUND_COUNT - 1) return { ...state, session: { ...session, phase: "summary" } };
      return { ...state, session: { ...session, phase: "investigating", currentRoundIndex: session.currentRoundIndex + 1 } };
    default:
      return state;
  }
}

// The only view of a round before the answer: no origin, provenance or D reading.
export function questionFor(state) {
  const { session, rounds } = state;
  if (session.phase !== "investigating") return null;
  const sample = rounds[session.currentRoundIndex].sample;
  return {
    schemaVersion: 1,
    kind: "question",
    dataMode: "recorded",
    sessionId: session.id,
    missionId: session.missionId,
    sampleId: sample.id,
    roundIndex: session.currentRoundIndex,
    roundCount: ROUND_COUNT,
    image: sample.image,
  };
}

// Mirrors the session rules of docs/enganai/etapa-01/validate.py.
export function sessionErrors(session) {
  const errors = [];
  const check = (condition, message) => condition || errors.push(message);
  const { phase, answers, sampleIds, currentRoundIndex: index } = session;
  check(session.score === answers.reduce((sum, answer) => sum + answer.points, 0), "score");
  check(new Set(answers.map((answer) => answer.sampleId)).size === answers.length, "duplicate-answer");
  check((session.error !== null) === (phase === "error"), "error-phase");
  if (phase === "briefing" || phase === "preparing") check(!answers.length && !sampleIds.length && index === 0, "pre-game");
  else if (phase === "error") check([0, ROUND_COUNT].includes(sampleIds.length) && answers.length <= index + 1, "error-recovery");
  else {
    check(sampleIds.length === ROUND_COUNT, "sample-count");
    check(answers.length === (phase === "investigating" ? index : index + 1), "answer-count");
    if (phase === "summary") check(index === ROUND_COUNT - 1 && answers.length === ROUND_COUNT, "summary");
  }
  answers.forEach((answer, round) => {
    check(answer.sampleId === sampleIds[round] && answer.roundIndex === round, "order");
    check(answer.correct === (answer.playerChoice === answer.correctOrigin) && answer.correctOrigin === answer.provenance.origin, "answer-key");
    check(answer.points === (answer.correct ? POINTS_CORRECT : 0), "points");
  });
  return errors;
}

export function lupaTally(answers) {
  const ready = answers.filter((answer) => answer.discriminator.status === "ready");
  return { analysed: ready.length, correct: ready.filter((answer) => answer.discriminator.predictedOrigin === answer.correctOrigin).length };
}
