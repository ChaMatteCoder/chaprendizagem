import {
  CIFAR10_CLASSES,
  DEFAULT_RESTORATION_TOOLS,
  PIXEL_GAME_RULES,
  PIXEL_INTERFERENCE_PRESETS,
} from '../data/cifar10Schema.js';
import { explainCrossEntropy } from './cnnMath.js';
import {
  applyInterference,
  applyRestorationTools,
  mulberry32,
  validateRestorationTools,
} from './pixelOps.js';

export const EMPTY_PIXEL_GAME_STATE = Object.freeze({
  status: 'idle', // 'idle' | 'loading' | 'playing' | 'querying' | 'query-error' | 'round-error' | 'revealed' | 'finished' | 'blocked'
  roundIndex: 0,
  totalRounds: PIXEL_GAME_RULES.roundsPerMatch,
  score: 0,
  maxScore: PIXEL_GAME_RULES.maxMatchScore,
  outcomes: Object.freeze({
    keptCorrect: 0,
    fixedError: 0,
    brokeCorrect: 0,
    keptError: 0,
  }),
  model: null,
  round: null,
  history: [],
  error: null,
});

export function classifyRoundOutcome(initialCorrect, finalCorrect) {
  if (initialCorrect && finalCorrect) {
    return {
      kind: 'keptCorrect',
      label: 'Acertou antes e depois',
      shortLabel: 'Acerto mantido',
      points: PIXEL_GAME_RULES.pointsPerCorrectFinal,
    };
  }
  if (!initialCorrect && finalCorrect) {
    return {
      kind: 'fixedError',
      label: 'Passou de erro para acerto',
      shortLabel: 'Recuperado (erro → acerto)',
      points: PIXEL_GAME_RULES.pointsPerCorrectFinal,
    };
  }
  if (initialCorrect && !finalCorrect) {
    return {
      kind: 'brokeCorrect',
      label: 'Passou de acerto para erro',
      shortLabel: 'Degradado (acerto → erro)',
      points: 0,
    };
  }
  return {
    kind: 'keptError',
    label: 'Errou nas duas condições',
    shortLabel: 'Erro mantido',
    points: 0,
  };
}

function defaultRandomUint32() {
  if (globalThis.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return arr[0] >>> 0;
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/**
 * Seleciona 5 amostras distintas sem filtrar por acerto prévio da rede,
 * acompanhadas de interferências reproduzíveis com seed fixa por rodada.
 */
export function selectMatchRounds(samples, { matchSeed = defaultRandomUint32() } = {}) {
  if (!Array.isArray(samples) || samples.length < PIXEL_GAME_RULES.roundsPerMatch) {
    throw new Error(`São necessárias pelo menos ${PIXEL_GAME_RULES.roundsPerMatch} amostras para iniciar uma partida.`);
  }
  const rng = mulberry32(matchSeed);
  const pool = [...samples];
  const selected = [];

  for (let i = 0; i < PIXEL_GAME_RULES.roundsPerMatch; i += 1) {
    const pickIdx = i + Math.floor(rng() * (pool.length - i));
    const temp = pool[i];
    pool[i] = pool[pickIdx];
    pool[pickIdx] = temp;

    const presetIdx = Math.floor(rng() * PIXEL_INTERFERENCE_PRESETS.length);
    const preset = PIXEL_INTERFERENCE_PRESETS[presetIdx];
    const noiseSeed = ((matchSeed + (i + 1) * 7919) >>> 0) || 1;

    selected.push({
      roundIndex: i,
      roundNumber: i + 1,
      sample: pool[i],
      interference: {
        ...preset,
        seed: noiseSeed,
      },
    });
  }

  return selected;
}

function toolsEqual(a, b) {
  return (
    Math.abs((a?.smoothing ?? 0) - (b?.smoothing ?? 0)) < 1e-6 &&
    Math.abs((a?.contrast ?? 1) - (b?.contrast ?? 1)) < 1e-6 &&
    Math.abs((a?.brightness ?? 0) - (b?.brightness ?? 0)) < 1e-6
  );
}

function clonePublicRound(privateRound) {
  if (!privateRound) return null;
  return {
    roundIndex: privateRound.roundIndex,
    roundNumber: privateRound.roundNumber,
    sampleId: privateRound.sample.id,
    partition: privateRound.sample.partition,
    interference: structuredClone(privateRound.interference),
    corruptedPixels: Uint8Array.from(privateRound.corruptedPixels),
    previewPixels: Uint8Array.from(privateRound.previewPixels),
    testedPixels: Uint8Array.from(privateRound.testedPixels),
    tools: structuredClone(privateRound.tools),
    testedTools: structuredClone(privateRound.testedTools),
    hasUncheckedChanges: !toolsEqual(privateRound.tools, privateRound.testedTools),
    queriesUsed: privateRound.queriesUsed,
    maxQueries: PIXEL_GAME_RULES.maxQueriesPerRound,
    queriesRemaining: PIXEL_GAME_RULES.maxQueriesPerRound - privateRound.queriesUsed,
    mustConclude: privateRound.queriesUsed >= PIXEL_GAME_RULES.maxQueriesPerRound,
    initialPrediction: structuredClone(privateRound.initialPrediction),
    currentPrediction: structuredClone(privateRound.currentPrediction),
    queryHistory: structuredClone(privateRound.queryHistory),
    revealed: privateRound.revealed
      ? {
          ...structuredClone(privateRound.revealed),
          originalPixels: Uint8Array.from(privateRound.originalPixels),
        }
      : null,
  };
}

/**
 * Controlador de estado de Pixel em Pânico!.
 * Preserva a imagem original e o rótulo verdadeiro em memória privada até a conclusão da rodada.
 */
export function createPixelGame({
  loadBundle,
  randomUint32 = defaultRandomUint32,
  onChange = () => {},
} = {}) {
  if (typeof loadBundle !== 'function') {
    throw new Error('createPixelGame requer uma função loadBundle.');
  }

  let state = structuredClone(EMPTY_PIXEL_GAME_STATE);
  let bundle = null;
  let privateRounds = [];
  let activePrivateRound = null;
  let privateHistory = [];
  let labContext = null;
  let operationId = 0;
  let activeAbort = null;
  let disposed = false;

  function emit() {
    if (disposed) return;
    onChange({
      ...state,
      outcomes: { ...state.outcomes },
      round: clonePublicRound(activePrivateRound),
      history: privateHistory.map((item) => ({
        roundIndex: item.roundIndex,
        roundNumber: item.roundNumber,
        sampleId: item.sample.id,
        interference: structuredClone(item.interference),
        corruptedPixels: Uint8Array.from(item.corruptedPixels),
        finalPixels: Uint8Array.from(item.testedPixels),
        originalPixels: Uint8Array.from(item.originalPixels),
        finalTools: structuredClone(item.testedTools),
        queriesUsed: item.queriesUsed,
        initialPrediction: structuredClone(item.initialPrediction),
        finalPrediction: structuredClone(item.currentPrediction),
        revealed: {
          ...structuredClone(item.revealed),
          originalPixels: Uint8Array.from(item.originalPixels),
        },
      })),
    });
  }

  function cancelPending() {
    operationId += 1;
    if (activeAbort) {
      activeAbort.abort();
      activeAbort = null;
    }
    return operationId;
  }

  async function ensureLoaded(opId, signal) {
    if (bundle) return bundle;
    const loaded = await loadBundle({ signal });
    if (disposed || opId !== operationId) {
      loaded?.predictor?.dispose();
      return null;
    }
    bundle = loaded;
    return bundle;
  }

  async function prepareRoundAtIndex(index, opId, signal) {
    const entry = privateRounds[index];
    const originalPixels = Uint8Array.from(entry.sample.pixels);
    const interfered = applyInterference(originalPixels, entry.interference);
    const initialTools = { ...DEFAULT_RESTORATION_TOOLS };

    activePrivateRound = {
      roundIndex: index,
      roundNumber: index + 1,
      sample: entry.sample,
      interference: entry.interference,
      originalPixels,
      corruptedPixels: interfered.pixels,
      previewPixels: Uint8Array.from(interfered.pixels),
      testedPixels: Uint8Array.from(interfered.pixels),
      tools: initialTools,
      testedTools: { ...initialTools },
      queriesUsed: 0,
      initialPrediction: null,
      currentPrediction: null,
      queryHistory: [],
      revealed: null,
    };

    state = {
      ...state,
      status: 'loading',
      roundIndex: index,
      error: null,
    };
    emit();

    try {
      // Envia exclusivamente os pixels corrompidos, sem rótulo ou metadados
      const prediction = await bundle.predictor.predict(Uint8Array.from(interfered.pixels), {
        signal,
        includeActivations: false,
      });
      if (disposed || opId !== operationId) return;

      if (prediction.modelId !== bundle.manifest.modelId) {
        throw new Error('Identidade do modelo da previsão não corresponde ao manifesto oficial.');
      }

      activePrivateRound.initialPrediction = prediction;
      activePrivateRound.currentPrediction = prediction;
      state = {
        ...state,
        status: 'playing',
        error: null,
      };
      emit();
    } catch (error) {
      if (disposed || opId !== operationId || error?.name === 'AbortError') return;
      state = {
        ...state,
        status: 'round-error',
        error: error.message || 'Falha ao calcular a previsão inicial da rodada.',
      };
      emit();
    }
  }

  return {
    get state() {
      return {
        ...state,
        outcomes: { ...state.outcomes },
        round: clonePublicRound(activePrivateRound),
      };
    },
    get context() {
      return labContext ? structuredClone(labContext) : null;
    },
    async start({ restart = false, matchSeed } = {}) {
      if (disposed) return;
      if (!restart && state.status !== 'idle' && state.status !== 'blocked') {
        return;
      }

      const opId = cancelPending();
      const controller = new AbortController();
      activeAbort = controller;

      privateRounds = [];
      activePrivateRound = null;
      privateHistory = [];
      labContext = null;

      state = {
        ...structuredClone(EMPTY_PIXEL_GAME_STATE),
        status: 'loading',
      };
      emit();

      try {
        const loaded = await ensureLoaded(opId, controller.signal);
        if (!loaded || disposed || opId !== operationId) return;

        const seed = Number.isInteger(matchSeed) ? matchSeed : randomUint32();
        privateRounds = selectMatchRounds(loaded.samples, { matchSeed: seed });
        state = {
          ...state,
          model: {
            modelId: loaded.manifest.modelId,
            parameterCount: loaded.manifest.parameterCount,
          },
        };
        await prepareRoundAtIndex(0, opId, controller.signal);
      } catch (error) {
        if (disposed || opId !== operationId || error?.name === 'AbortError') return;
        state = {
          ...state,
          status: 'blocked',
          error: error.message || 'Não foi possível iniciar a estação Pixel em Pânico!.',
        };
        emit();
      }
    },

    updateTools(partialTools) {
      if (disposed || !activePrivateRound) return;
      if (!['playing', 'query-error'].includes(state.status)) return;
      if (activePrivateRound.queriesUsed >= PIXEL_GAME_RULES.maxQueriesPerRound) return;

      const merged = validateRestorationTools({
        ...activePrivateRound.tools,
        ...partialTools,
      });
      // Sempre recalcula a partir da imagem corrompida recebida, sem acumular erros
      const restored = applyRestorationTools(activePrivateRound.corruptedPixels, merged);
      activePrivateRound.tools = merged;
      activePrivateRound.previewPixels = restored.pixels;
      if (state.status === 'query-error') {
        state = { ...state, status: 'playing', error: null };
      }
      emit();
    },

    resetTools() {
      if (disposed || !activePrivateRound) return;
      if (!['playing', 'query-error'].includes(state.status)) return;
      if (activePrivateRound.queriesUsed >= PIXEL_GAME_RULES.maxQueriesPerRound) return;

      // Redefinir volta à imagem corrompida recebida, nunca ao original oculto
      activePrivateRound.tools = { ...DEFAULT_RESTORATION_TOOLS };
      activePrivateRound.previewPixels = Uint8Array.from(activePrivateRound.corruptedPixels);
      if (state.status === 'query-error') {
        state = { ...state, status: 'playing', error: null };
      }
      emit();
    },

    async testAdjustments() {
      if (disposed || !activePrivateRound || !bundle) return;
      if (!['playing', 'query-error'].includes(state.status)) return;
      if (activePrivateRound.queriesUsed >= PIXEL_GAME_RULES.maxQueriesPerRound) return;

      const opId = cancelPending();
      const controller = new AbortController();
      activeAbort = controller;

      const candidateTools = { ...activePrivateRound.tools };
      const candidatePixels = applyRestorationTools(activePrivateRound.corruptedPixels, candidateTools).pixels;

      state = {
        ...state,
        status: 'querying',
        error: null,
      };
      emit();

      try {
        const prediction = await bundle.predictor.predict(Uint8Array.from(candidatePixels), {
          signal: controller.signal,
          includeActivations: false,
        });
        if (disposed || opId !== operationId) return;

        if (prediction.modelId !== bundle.manifest.modelId) {
          throw new Error('Modelo inválido na resposta da consulta.');
        }

        // Consome tentativa somente após previsão válida
        activePrivateRound.queriesUsed += 1;
        activePrivateRound.testedTools = candidateTools;
        activePrivateRound.testedPixels = Uint8Array.from(candidatePixels);
        activePrivateRound.previewPixels = Uint8Array.from(candidatePixels);
        activePrivateRound.currentPrediction = prediction;
        activePrivateRound.queryHistory.push({
          queryNumber: activePrivateRound.queriesUsed,
          tools: structuredClone(candidateTools),
          prediction: structuredClone(prediction),
        });

        state = {
          ...state,
          status: 'playing',
          error: null,
        };
        emit();
      } catch (error) {
        if (disposed || opId !== operationId || error?.name === 'AbortError') return;
        state = {
          ...state,
          status: 'query-error',
          error: error.message || 'Falha técnica ao consultar a CNN. Sua tentativa não foi consumida.',
        };
        emit();
      }
    },

    async retryRound() {
      if (disposed || !activePrivateRound || !bundle) return;
      if (state.status === 'query-error') {
        await this.testAdjustments();
        return;
      }
      if (state.status !== 'round-error') return;
      const opId = cancelPending();
      const controller = new AbortController();
      activeAbort = controller;
      await prepareRoundAtIndex(activePrivateRound.roundIndex, opId, controller.signal);
    },

    concludeRound() {
      if (disposed || !activePrivateRound) return;
      if (!['playing', 'query-error'].includes(state.status)) return;
      if (!activePrivateRound.initialPrediction || !activePrivateRound.currentPrediction) return;

      cancelPending();

      const trueLabel = activePrivateRound.sample.label;
      const trueClass = CIFAR10_CLASSES[trueLabel];
      const initialCorrect = activePrivateRound.initialPrediction.winnerIndex === trueLabel;
      const finalCorrect = activePrivateRound.currentPrediction.winnerIndex === trueLabel;
      const outcome = classifyRoundOutcome(initialCorrect, finalCorrect);

      const initialCe = explainCrossEntropy(
        activePrivateRound.initialPrediction.logits,
        activePrivateRound.initialPrediction.probabilities,
        trueLabel,
      );
      const finalCe = explainCrossEntropy(
        activePrivateRound.currentPrediction.logits,
        activePrivateRound.currentPrediction.probabilities,
        trueLabel,
      );

      // Reverte a prévia para os pixels efetivamente avaliados na previsão final
      activePrivateRound.tools = { ...activePrivateRound.testedTools };
      activePrivateRound.previewPixels = Uint8Array.from(activePrivateRound.testedPixels);

      activePrivateRound.revealed = {
        trueLabelIndex: trueLabel,
        trueClass,
        sourceBatch: activePrivateRound.sample.sourceBatch,
        sourceFilename: activePrivateRound.sample.sourceFilename,
        initialCorrect,
        finalCorrect,
        outcomeKind: outcome.kind,
        outcomeLabel: outcome.label,
        outcomeShortLabel: outcome.shortLabel,
        pointsEarned: outcome.points,
        initialCrossEntropy: initialCe.exactCrossEntropy,
        finalCrossEntropy: finalCe.exactCrossEntropy,
      };

      const updatedOutcomes = {
        ...state.outcomes,
        [outcome.kind]: state.outcomes[outcome.kind] + 1,
      };

      privateHistory.push(activePrivateRound);

      state = {
        ...state,
        status: 'revealed',
        score: state.score + outcome.points,
        outcomes: updatedOutcomes,
        error: null,
      };
      emit();
    },

    async nextRound() {
      if (disposed || state.status !== 'revealed' || !activePrivateRound) return;
      const nextIdx = activePrivateRound.roundIndex + 1;
      if (nextIdx >= PIXEL_GAME_RULES.roundsPerMatch) {
        state = {
          ...state,
          status: 'finished',
          error: null,
        };
        emit();
        return;
      }
      const opId = cancelPending();
      const controller = new AbortController();
      activeAbort = controller;
      await prepareRoundAtIndex(nextIdx, opId, controller.signal);
    },

    openLabContext(roundIdx = null) {
      if (disposed) return;
      const target =
        Number.isInteger(roundIdx) && privateHistory[roundIdx]
          ? privateHistory[roundIdx]
          : activePrivateRound;
      if (!target) {
        labContext = null;
        return;
      }
      const isRevealed = Boolean(target.revealed);
      labContext = {
        roundNumber: target.roundNumber,
        sampleId: target.sample.id,
        revealed: isRevealed,
        interference: structuredClone(target.interference),
        corruptedPixels: Uint8Array.from(target.corruptedPixels),
        testedPixels: Uint8Array.from(target.testedPixels),
        testedTools: structuredClone(target.testedTools),
        initialPrediction: structuredClone(target.initialPrediction),
        finalPrediction: structuredClone(target.currentPrediction),
        ...(isRevealed
          ? {
              originalPixels: Uint8Array.from(target.originalPixels),
              trueLabelIndex: target.sample.label,
              trueClass: CIFAR10_CLASSES[target.sample.label],
              outcomeLabel: target.revealed.outcomeLabel,
            }
          : {}),
      };
    },

    clearLabContext() {
      labContext = null;
    },

    pause() {
      if (disposed) return;
      if (state.status === 'querying') {
        cancelPending();
        state = { ...state, status: 'playing', error: null };
        emit();
      }
    },

    leave() {
      if (disposed) return;
      cancelPending();
      privateRounds = [];
      activePrivateRound = null;
      privateHistory = [];
      labContext = null;
      state = structuredClone(EMPTY_PIXEL_GAME_STATE);
      emit();
    },

    dispose() {
      if (disposed) return;
      cancelPending();
      disposed = true;
      bundle?.predictor?.dispose();
      bundle = null;
    },
  };
}
