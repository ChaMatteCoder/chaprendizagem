import { validateTrainingConfig } from '../model/createSonarModel.js';

export const EMPTY_LAB_STATE = Object.freeze({ status: 'loading', error: null, data: null,
  selection: null, experimental: null, training: { status: 'idle', history: [], error: null },
  inspection: { status: 'idle', result: null, error: null } });

/** Owns resources and invalidates async work on selection, retry, cancel or exit. */
export function createSonarLabSession({ loadData, loadOfficial, makeTrainer, onChange = () => {} }) {
  let state = EMPTY_LAB_STATE, closed = false, official, experimental, trainer;
  let loadSerial = 0, trainSerial = 0, inspectionSerial = 0;
  let loadAbort, trainAbort, inspectionAbort;
  const update = patch => { if (!closed) { state = { ...state, ...patch }; onChange(state); } };
  const invalidateInspection = () => { inspectionSerial++; inspectionAbort?.abort(); update({ inspection: { status: 'idle', result: null, error: null } }); };
  const api = {
    get state() { return state; },
    async load() {
      if (closed) return;
      const serial = ++loadSerial;
      loadAbort?.abort(); loadAbort = new globalThis.AbortController();
      update({ status: 'loading', error: null });
      const outcomes = await Promise.allSettled([loadData({ signal: loadAbort.signal }), loadOfficial({ signal: loadAbort.signal })]);
      const predictor = outcomes[1].status === 'fulfilled' ? outcomes[1].value : null;
      if (closed || serial !== loadSerial) { predictor?.dispose(); return; }
      const failure = outcomes.find(result => result.status === 'rejected');
      if (failure) { predictor?.dispose(); update({ status: 'error', error: failure.reason.name === 'TypeError'
        ? 'Falha de conexão ao carregar os dados ou o modelo. Tente novamente.' : failure.reason.message }); return; }
      const data = outcomes[0].value;
      if (predictor.metadata.modelId !== data.manifest.modelId) {
        predictor.dispose(); update({ status: 'error', error: 'Modelo e resultados pertencem a experimentos diferentes.' }); return;
      }
      official?.dispose(); official = predictor;
      update({ status: 'ready', data, selection: { sampleId: data.development[0].id, modelKind: 'official' } });
    },
    select(sampleId, modelKind) {
      if (closed || state.status !== 'ready') return;
      if (!state.data.development.some(sample => sample.id === sampleId)) throw new Error('Exploração permitida somente no desenvolvimento.');
      if (!['official', 'experimental'].includes(modelKind) || (modelKind === 'experimental' && !experimental)) {
        throw new Error('Modelo selecionado indisponível.');
      }
      invalidateInspection(); update({ selection: { sampleId, modelKind } });
    },
    async inspect({ trace = false } = {}) {
      if (closed || state.status !== 'ready') return;
      const serial = ++inspectionSerial;
      inspectionAbort?.abort(); inspectionAbort = new globalThis.AbortController();
      const sample = state.data.development.find(row => row.id === state.selection.sampleId);
      const predictor = state.selection.modelKind === 'official' ? official : experimental;
      update({ inspection: { status: 'loading', result: null, error: null } });
      try {
        const result = await predictor.predict(sample.features, { trace, signal: inspectionAbort.signal });
        if (!closed && serial === inspectionSerial) update({ inspection: { status: 'ready', result, error: null } });
      } catch (error) {
        if (!closed && serial === inspectionSerial) update({ inspection: { status: 'error', result: null, error: error.message } });
      }
    },
    async train(config) {
      if (closed || state.status !== 'ready') return;
      if (['loading', 'training'].includes(state.training.status)) throw new Error('Já existe um treino em andamento.');
      const settings = validateTrainingConfig(config);
      if (!settings.hiddenUnits.length) throw new Error('O experimento deve ter ao menos uma camada oculta.');
      const serial = ++trainSerial;
      trainAbort = new globalThis.AbortController();
      experimental?.dispose(); experimental = null;
      if (state.selection.modelKind === 'experimental') {
        invalidateInspection(); update({ selection: { ...state.selection, modelKind: 'official' } });
        api.inspect(); // Refresh the frozen model when the previous experiment is discarded.
      }
      update({ experimental: null, training: { status: 'loading', history: [], settings, error: null, cancelRequested: false } });
      try {
        trainer?.dispose();
        const created = await makeTrainer(state.data);
        if (closed || serial !== trainSerial) { created.dispose(); return; }
        trainer = created;
        update({ training: { ...state.training, status: 'training' } });
        const result = await trainer.train({ config: settings, signal: trainAbort.signal, onEpoch: event => {
          if (!closed && serial === trainSerial && !trainAbort.signal.aborted) {
            update({ training: { ...state.training, runId: event.runId, history: [...state.training.history, event] } });
          }
        } });
        if (closed || serial !== trainSerial) { result.predictor?.dispose(); return; }
        if (trainAbort.signal.aborted || result.status !== 'completed') {
          result.predictor?.dispose(); update({ training: { ...state.training, status: 'cancelled', history: result.history, runId: result.runId } });
          return;
        }
        experimental = result.predictor;
        update({ experimental: experimental.metadata, training: { ...state.training, status: 'completed', history: result.history, runId: result.runId } });
      } catch (error) {
        if (!closed && serial === trainSerial) update({ training: { ...state.training,
          status: trainAbort.signal.aborted ? 'cancelled' : 'error', error: trainAbort.signal.aborted ? null : error.message } });
      }
    },
    cancelTraining() {
      if (closed || !['loading', 'training'].includes(state.training.status)) return;
      trainAbort?.abort(); trainer?.cancel();
      update({ training: { ...state.training, cancelRequested: true } });
    },
    dispose() {
      if (closed) return;
      closed = true; loadSerial++; trainSerial++; inspectionSerial++;
      loadAbort?.abort(); trainAbort?.abort(); inspectionAbort?.abort();
      trainer?.dispose(); official?.dispose(); experimental?.dispose();
    },
  };
  return api;
}
