import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_RESTORATION_TOOLS } from '../data/cifar10Schema.js';
import { loadPixelBundle } from '../lib/loadPixelArtifacts.js';
import {
  applyInterference,
  applyRestorationTools,
  computePixelDiffStats,
} from '../lib/pixelOps.js';

const DEFAULT_PERTURBATION = Object.freeze({
  contrast: 1.0,
  brightness: 0,
  noiseStd: 0,
  seed: 2026,
  smoothing: 0,
});

export default function usePixelLab({ initialContext = null } = {}) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [selectedSampleId, setSelectedSampleId] = useState(
    initialContext?.sampleId ?? null,
  );
  const [replayContext, setReplayContext] = useState(initialContext);
  const [perturbation, setPerturbation] = useState(DEFAULT_PERTURBATION);
  const [inspection, setInspection] = useState({
    status: 'idle',
    cleanResult: null,
    transformedResult: null,
    error: null,
  });

  const bundleRef = useRef(null);
  const loadAbortRef = useRef(null);
  const predictAbortRef = useRef(null);
  const opSerialRef = useRef(0);

  const loadDataAndModel = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setStatus('loading');
    setError(null);

    try {
      const loaded = await loadPixelBundle({ signal: controller.signal });
      if (controller.signal.aborted) {
        loaded.predictor.dispose();
        return;
      }
      bundleRef.current?.predictor?.dispose();
      bundleRef.current = loaded;
      setBundle(loaded);
      setSelectedSampleId((prev) => prev || loaded.samples[0]?.id || null);
      setStatus('ready');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setStatus('error');
      setError(
        err.message || 'Não foi possível carregar os artefatos do PixelLab.',
      );
    }
  }, []);

  useEffect(() => {
    loadDataAndModel();
    return () => {
      loadAbortRef.current?.abort();
      predictAbortRef.current?.abort();
      bundleRef.current?.predictor?.dispose();
      bundleRef.current = null;
    };
  }, [loadDataAndModel]);

  const currentSample = useMemo(() => {
    if (!bundle || !selectedSampleId) return null;
    return (
      bundle.samples.find((s) => s.id === selectedSampleId) ??
      bundle.samples[0] ??
      null
    );
  }, [bundle, selectedSampleId]);

  const processedImages = useMemo(() => {
    if (!currentSample) return null;
    const originalPixels = currentSample.pixels;
    if (replayContext?.sampleId === currentSample.id) {
      const transformedPixels = replayContext.testedPixels;
      const diffStats = computePixelDiffStats(
        originalPixels,
        transformedPixels,
      );
      return {
        originalPixels,
        interferedPixels: replayContext.corruptedPixels,
        transformedPixels,
        isModified: diffStats.changedPixels > 0,
        diffStats,
        clippedCount: null,
      };
    }
    const interfered = applyInterference(originalPixels, {
      contrast: perturbation.contrast,
      brightness: perturbation.brightness,
      noiseStd: perturbation.noiseStd,
      seed: perturbation.seed,
    });
    const restored = applyRestorationTools(interfered.pixels, {
      smoothing: perturbation.smoothing,
      contrast: DEFAULT_RESTORATION_TOOLS.contrast,
      brightness: DEFAULT_RESTORATION_TOOLS.brightness,
    });
    const isModified =
      Math.abs(perturbation.contrast - 1.0) > 1e-6 ||
      Math.abs(perturbation.brightness) > 1e-6 ||
      perturbation.noiseStd > 0 ||
      perturbation.smoothing > 0;
    const diffStats = computePixelDiffStats(originalPixels, restored.pixels);

    return {
      originalPixels,
      interferedPixels: interfered.pixels,
      transformedPixels: restored.pixels,
      isModified,
      diffStats,
      clippedCount: interfered.clippedCount + restored.clippedCount,
    };
  }, [currentSample, perturbation, replayContext]);

  const runInspection = useCallback(async () => {
    if (!bundleRef.current || !processedImages) return;

    predictAbortRef.current?.abort();
    const controller = new AbortController();
    predictAbortRef.current = controller;
    opSerialRef.current += 1;
    const serial = opSerialRef.current;

    setInspection({
      status: 'loading',
      cleanResult: null,
      transformedResult: null,
      error: null,
    });

    try {
      const predictor = bundleRef.current.predictor;
      const cleanResult = await predictor.predict(
        processedImages.originalPixels,
        {
          signal: controller.signal,
          includeActivations: true,
        },
      );
      if (controller.signal.aborted || serial !== opSerialRef.current) return;

      const transformedResult = processedImages.isModified
        ? await predictor.predict(processedImages.transformedPixels, {
            signal: controller.signal,
            includeActivations: true,
          })
        : cleanResult;
      if (controller.signal.aborted || serial !== opSerialRef.current) return;

      setInspection({
        status: 'ready',
        sourceImages: processedImages,
        cleanResult,
        transformedResult,
        error: null,
      });
    } catch (err) {
      if (err?.name === 'AbortError' || serial !== opSerialRef.current) return;
      setInspection((prev) => ({
        ...prev,
        status: 'error',
        sourceImages: processedImages,
        error:
          err.message ||
          'Falha ao executar inferência e extrair ativações no PixelLab.',
      }));
    }
  }, [processedImages]);

  useEffect(() => {
    if (status === 'ready' && processedImages) {
      predictAbortRef.current?.abort();
      const timer = setTimeout(runInspection, 140);
      return () => {
        clearTimeout(timer);
        predictAbortRef.current?.abort();
      };
    }
  }, [status, processedImages, runInspection]);

  const selectSample = useCallback((sampleId) => {
    setReplayContext(null);
    setPerturbation(DEFAULT_PERTURBATION);
    setSelectedSampleId(sampleId);
  }, []);

  const updatePerturbation = useCallback((partial) => {
    setReplayContext(null);
    setPerturbation((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetPerturbation = useCallback(() => {
    setReplayContext(null);
    setPerturbation(DEFAULT_PERTURBATION);
  }, []);

  return {
    status,
    error,
    bundle,
    currentSample,
    selectedSampleId,
    selectSample,
    perturbation,
    updatePerturbation,
    resetPerturbation,
    processedImages,
    inspection:
      inspection.sourceImages === processedImages
        ? inspection
        : {
            status: 'loading',
            cleanResult: null,
            transformedResult: null,
            error: null,
          },
    replayContext,
    retryLoad: loadDataAndModel,
    retryInspection: runInspection,
  };
}
