import { isSpecial } from '../data/classCatalog.js';
export const ROUND_DURATION_MS = 10_000;
export const initialGameState = { phase: 'home', sequence: [], round: 0, results: [], score: 0, pending: null };

function appendResult(state, prediction, empty = false) {
  const challenge = state.sequence[state.round];
  const correct = !empty && prediction.id === challenge.id;
  const result = {
    challenge, prediction, correct, empty, points: correct ? 100 : 0,
    imageUrl: state.pending.imageUrl, reason: state.pending.reason,
  };
  return { ...state, phase: 'result', results: [...state.results, result], score: state.score + result.points, pending: null };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...initialGameState, phase: 'preparing', sequence: action.sequence };
    case 'HOME':
      return initialGameState;
    case 'BEGIN':
      return state.phase === 'preparing' ? isSpecial(state.sequence[state.round])
        ? { ...state, phase: 'revealing', deadline: undefined }
        : { ...state, phase: 'drawing', deadline: action.now + ROUND_DURATION_MS } : state;
    case 'REVEAL_DONE':
      return state.phase === 'revealing' && state.round === action.round
        ? { ...state, phase: 'drawing', deadline: action.now + ROUND_DURATION_MS } : state;
    case 'SUBMIT': {
      if (state.phase !== 'drawing') return state;
      if (!action.hasInk && action.reason !== 'timeout') return state;
      const next = { ...state, phase: 'processing', pending: { token: action.token, imageUrl: action.imageUrl, reason: action.reason } };
      return action.hasInk ? next : appendResult(next, null, true);
    }
    case 'RESOLVE':
      return state.phase === 'processing' && state.pending.token === action.token
        ? appendResult(state, action.prediction) : state;
    case 'FAIL':
      return state.phase === 'processing' && state.pending.token === action.token
        ? { ...state, phase: 'error' } : state;
    case 'RETRY':
      return state.phase === 'error' ? { ...state, phase: 'processing' } : state;
    case 'NEXT':
      if (state.phase !== 'result') return state;
      return state.round === state.sequence.length - 1
        ? { ...state, phase: 'finished' }
        : { ...state, phase: 'preparing', round: state.round + 1, deadline: undefined };
    default:
      return state;
  }
}
