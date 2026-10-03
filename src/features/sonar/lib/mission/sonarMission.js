export const EMPTY_MISSION = Object.freeze({ status: 'idle', error: null, model: null,
  encounter: null, index: 0, score: { user: 0, ai: 0 }, history: [], contextIndex: null });

/** Partial Fisher–Yates: no weighting by label, prediction or previous accuracy. */
export function drawMissionIds(ids, random = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) {
  if (ids.length < 5 || new Set(ids).size !== ids.length) throw new Error('Teste inválido para uma missão de cinco encontros.');
  const pool = [...ids];
  for (let i = 0; i < 5; i++) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Fonte de sorteio inválida.');
    const j = i + Math.floor(value * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5);
}

function checkedPrediction(result, modelId) {
  const p = result?.probabilities;
  if (result?.modelKind !== 'official' || result.modelId !== modelId || !result.trace ||
      JSON.stringify(result.classOrder) !== '["R","M"]' || p?.length !== 2 ||
      p.some(value => !Number.isFinite(value) || value < 0 || value > 1) || Math.abs(p[0] + p[1] - 1) > 1e-5 ||
      result.predictedIndex !== (p[1] > p[0] ? 1 : 0) || result.predictedLabel !== ['R', 'M'][result.predictedIndex]) {
    throw new Error('A previsão não pertence ao modelo oficial ou está incompleta.');
  }
  return structuredClone(result);
}

/** Raw labels remain private to this controller until reveal. No competitive secrecy is claimed. */
export function createSonarMission({ loadData, loadOfficial, random, onChange = () => {} }) {
  let state = EMPTY_MISSION, data, predictor, encounters = [], closed = false, serial = 0, abort;
  const update = patch => {
    if (closed) return;
    state = { ...state, ...patch };
    onChange(structuredClone(state));
  };
  const invalidate = () => { serial++; abort?.abort(); };
  const neutral = sample => ({ sample: { id: sample.id, features: [...sample.features] }, choice: null, prediction: null });
  const api = {
    get state() { return structuredClone(state); },
    async start({ restart = false } = {}) {
      if (closed || state.status === 'loading' || (!restart && !['idle', 'blocked'].includes(state.status))) return;
      invalidate();
      const operation = serial;
      encounters = [];
      update({ ...EMPTY_MISSION, status: 'loading', model: predictor?.metadata ?? null });
      if (!predictor) {
        abort = new globalThis.AbortController();
        const results = await Promise.allSettled([loadData({ signal: abort.signal }), loadOfficial({ signal: abort.signal })]);
        const loaded = results[1].status === 'fulfilled' ? results[1].value : null;
        if (closed || serial !== operation) { loaded?.dispose(); return; }
        const failure = results.find(result => result.status === 'rejected');
        if (failure) {
          loaded?.dispose(); update({ status: 'blocked', error: 'O modelo oficial ou seus dados não puderam ser carregados. Confira a conexão e tente carregar novamente.' }); return;
        }
        const candidate = results[0].value;
        if (loaded.metadata.kind !== 'official' || loaded.metadata.modelId !== candidate.manifest.modelId ||
            candidate.manifest.evaluation?.status !== 'completed') {
          loaded.dispose(); update({ status: 'blocked', error: 'O modelo oficial congelado é incompatível com os dados. Restaure os artefatos oficiais e tente novamente.' }); return;
        }
        data = candidate; predictor = loaded;
      }
      try {
        const ids = drawMissionIds(data.partitions.testIds, random);
        encounters = ids.map(id => {
          const sample = data.samples.find(row => row.id === id);
          if (!sample) throw new Error('Amostra de teste ausente.');
          return sample;
        });
        update({ status: 'guessing', model: predictor.metadata, encounter: neutral(encounters[0]) });
      } catch (error) { update({ status: 'blocked', error: error.message }); }
    },
    async guess(choice) {
      if (closed || state.status !== 'guessing' || !['R', 'M'].includes(choice)) return false;
      update({ encounter: { ...state.encounter, choice } });
      return api.retryPrediction();
    },
    async retryPrediction() {
      if (closed || !['guessing', 'prediction-error'].includes(state.status) || !state.encounter?.choice) return false;
      invalidate(); const operation = serial;
      abort = new globalThis.AbortController();
      update({ status: 'predicting', error: null });
      try {
        // The only classifier input is a fresh 60-number vector, never a sample object or label.
        const result = await predictor.predict([...state.encounter.sample.features], { signal: abort.signal, trace: true });
        if (closed || serial !== operation) return false;
        const prediction = checkedPrediction(result, state.model.modelId);
        update({ status: 'comparing', encounter: { ...state.encounter, prediction } });
        return true;
      } catch {
        if (!closed && serial === operation) update({ status: 'prediction-error', error: 'A inferência falhou. Seu palpite foi preservado; tente novamente para continuar este encontro.' });
        return false;
      }
    },
    reveal() {
      if (closed || state.status !== 'comparing') return false;
      const label = encounters[state.index].label;
      const encounter = { ...state.encounter, sample: { ...state.encounter.sample, label },
        userCorrect: state.encounter.choice === label, aiCorrect: state.encounter.prediction.predictedLabel === label };
      update({ status: 'revealed', encounter, history: [...state.history, structuredClone(encounter)],
        score: { user: state.score.user + Number(encounter.userCorrect), ai: state.score.ai + Number(encounter.aiCorrect) } });
      return true;
    },
    next() {
      if (closed || state.status !== 'revealed') return false;
      if (state.index === 4) { update({ status: 'finished', contextIndex: null }); return true; }
      update({ status: 'guessing', index: state.index + 1, encounter: neutral(encounters[state.index + 1]), contextIndex: null });
      return true;
    },
    openContext(index = state.index) {
      if (closed) return false;
      const encounter = state.status === 'finished' ? state.history[index] : index === state.index && state.encounter;
      if (!encounter?.prediction) return false;
      update({ contextIndex: index }); return true;
    },
    get context() {
      if (closed || state.contextIndex === null) return null;
      const encounter = state.status === 'finished' ? state.history[state.contextIndex] : state.encounter;
      if (!encounter?.prediction) return null;
      return structuredClone({ ...encounter, index: state.contextIndex, model: state.model, revealed: Boolean(encounter.sample.label) });
    },
    pause() {
      if (closed || state.status !== 'predicting') return;
      invalidate(); update({ status: 'prediction-error', error: 'A inferência foi interrompida ao sair. Tente novamente neste encontro.' });
    },
    leave() { if (closed) return; invalidate(); encounters = []; update({ ...EMPTY_MISSION, model: predictor?.metadata ?? null }); },
    dispose() { if (closed) return; closed = true; invalidate(); predictor?.dispose(); encounters = []; data = null; },
  };
  return api;
}
