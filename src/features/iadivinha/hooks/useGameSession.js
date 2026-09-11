import { useCallback, useEffect, useRef, useState } from 'react';
import { gameReducer, initialGameState } from '../lib/gameReducer.js';
import { createGameSequence } from '../lib/gameSequence.js';
import { hasDrawingInk } from '../lib/drawingImage.js';

export default function useGameSession(classes, classify) {
  const [state, setState] = useState(initialGameState);
  const current = useRef(initialGameState);
  const request = useRef(null);
  const token = useRef(0);
  const lastImage = useRef(null);

  const send = useCallback((action) => {
    // Update the guard synchronously so click + timeout cannot submit the same round twice.
    current.current = gameReducer(current.current, action);
    setState(current.current);
  }, []);

  useEffect(() => () => request.current?.abort(), []);

  const runPrediction = useCallback(async (image, requestToken) => {
    const controller = new AbortController();
    request.current = controller;
    try {
      const prediction = await classify(image, { signal: controller.signal });
      if (!controller.signal.aborted) send({ type: 'RESOLVE', token: requestToken, prediction });
    } catch {
      if (!controller.signal.aborted) send({ type: 'FAIL', token: requestToken });
    }
  }, [classify, send]);

  const submit = useCallback((snapshot, reason = 'manual') => {
    if (current.current.phase !== 'drawing' || !snapshot) return;
    const hasInk = hasDrawingInk(snapshot.image);
    if (!hasInk && reason === 'manual') return;
    const requestToken = ++token.current;
    lastImage.current = snapshot.image;
    send({ type: 'SUBMIT', token: requestToken, hasInk, imageUrl: hasInk ? snapshot.imageUrl : null, reason });
    if (hasInk) void runPrediction(snapshot.image, requestToken);
  }, [runPrediction, send]);

  function start() {
    if (!classes.length) return;
    request.current?.abort();
    lastImage.current = null;
    send({ type: 'START', sequence: createGameSequence(classes) });
  }

  function home() {
    request.current?.abort();
    lastImage.current = null;
    send({ type: 'HOME' });
  }

  function retry() {
    if (current.current.phase !== 'error') return;
    const requestToken = current.current.pending.token;
    send({ type: 'RETRY' });
    void runPrediction(lastImage.current, requestToken);
  }

  const revealDone = useCallback((round) => send({ type: 'REVEAL_DONE', round, now: performance.now() }), [send]);
  return { state, start, home, retry, submit, revealDone, begin: () => send({ type: 'BEGIN', now: performance.now() }), next: () => send({ type: 'NEXT' }) };
}
