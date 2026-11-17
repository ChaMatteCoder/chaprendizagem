import { useCallback, useEffect, useRef, useState } from "react";
import { sha256Hex } from "../lib/inference/contract.js";
import { getInferenceClient } from "../lib/inference/browserClient.js";
import { encodeGrayPng } from "../lib/mission/png.js";
import { saveCompletedSession } from "../lib/mission/progress.js";
import { createSession, planRounds, questionFor, sampleRecord, sessionReducer } from "../lib/mission/session.js";
import { missions } from "../data/atelier.js";

const ACTIVE_PHASES = new Set(["preparing", "investigating", "revealed"]);
const ERROR_CODES = { network: "asset-load", unavailable: "model-load", integrity: "invalid-artifact", contract: "invalid-artifact", fixture: "invalid-artifact", timeout: "generation", worker: "generation" };

function randomUint32() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
}

function newSession(missionId, seed) {
  const id = `s-${randomUint32().toString(16).padStart(8, "0")}${randomUint32().toString(16).padStart(8, "0")}`;
  return createSession({ id, missionId, selectionSeed: seed ?? randomUint32() });
}

export function parseSeed(value) {
  if (value === null || !/^\d{1,10}$/.test(value)) return null;
  const seed = Number(value);
  return seed <= 0xffffffff ? seed : null;
}

// Runs one mission: plan -> worker rounds -> PNG/sha -> answers -> summary -> progress.
export function useMissionSession(mission, bench, seed = null) {
  const [state, setState] = useState(() => newSession(mission.id, seed));
  const [images, setImages] = useState({});
  const [saved, setSaved] = useState(null);
  const controller = useRef(null);
  const urls = useRef([]);
  // Every transition goes through dispatch/restart, which keep this ref in sync synchronously,
  // so a double click cannot apply two answers from the same rendered state.
  const stateRef = useRef(state);

  const dispatch = useCallback((action) => {
    const next = sessionReducer(stateRef.current, action);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const releaseImages = useCallback(() => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = [];
  }, []);

  useEffect(
    () => () => {
      controller.current?.abort();
      releaseImages();
    },
    [releaseImages],
  );

  const ready = bench.phase === "ready";
  const checkpointId = bench.prepared?.checkpointId;

  const start = useCallback(async () => {
    if (!ready) return;
    const preparing = dispatch({ type: "prepare" });
    if (preparing.session.phase !== "preparing") return;
    const { id: sessionId, selectionSeed } = preparing.session;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const client = getInferenceClient();
    try {
      const info = await client.request("arenaInfo", {}, { signal: abort.signal });
      const plan = planRounds(selectionSeed, info);
      const built = await client.request("buildRounds", { checkpointId, plan }, { signal: abort.signal });
      if (built.checkpointId !== checkpointId) throw Object.assign(new Error("As rodadas vieram de outro checkpoint."), { code: "contract" });
      const rounds = [];
      const created = {};
      for (const [index, round] of built.rounds.entries()) {
        const png = encodeGrayPng(round.pixels);
        const sample = sampleRecord({
          sessionId,
          index,
          provenance: round.provenance,
          imageAsset: { path: `sessions/${sessionId}/round-${index + 1}.png`, sha256: await sha256Hex(png), bytes: png.byteLength },
        });
        created[sample.id] = URL.createObjectURL(new Blob([png], { type: "image/png" }));
        rounds.push({ sample, discriminator: round.discriminator });
      }
      if (abort.signal.aborted || stateRef.current.session.id !== sessionId) {
        Object.values(created).forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      releaseImages();
      urls.current = Object.values(created);
      setImages(created);
      dispatch({ type: "prepared", rounds });
    } catch (error) {
      if (abort.signal.aborted || error?.code === "aborted" || stateRef.current.session.id !== sessionId) return;
      dispatch({ type: "fail", code: ERROR_CODES[error?.code] ?? "generation", message: error?.message || "Não foi possível preparar as rodadas." });
    }
  }, [ready, checkpointId, dispatch, releaseImages]);

  const answer = useCallback((choice) => dispatch({ type: "answer", roundIndex: stateRef.current.session.currentRoundIndex, choice }), [dispatch]);

  const next = useCallback(() => {
    const after = dispatch({ type: "next" });
    if (after.session.phase === "summary") {
      let result;
      try {
        result = saveCompletedSession(window.localStorage, after.session, missions);
      } catch {
        result = { status: "unavailable" };
      }
      setSaved({ sessionId: after.session.id, ...result });
    }
    return after;
  }, [dispatch]);

  const restart = useCallback(() => {
    controller.current?.abort();
    releaseImages();
    setImages({});
    setSaved(null);
    const fresh = newSession(mission.id, null);
    stateRef.current = fresh;
    setState(fresh);
  }, [mission.id, releaseImages]);

  const active = ACTIVE_PHASES.has(state.session.phase);
  useEffect(() => {
    if (!active) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  return { state, session: state.session, question: questionFor(state), images, saved, active, start, answer, next, restart };
}
