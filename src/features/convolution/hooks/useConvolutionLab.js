import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { optionsFromPreset, sampleImages } from '../data/kernels.js';
import { toGrayscale, validateOptions } from '../lib/convolution.js';
import { loadSampleImage, loadUploadedImage } from '../lib/imageIO.js';
import { createConvolutionProcessor } from '../lib/convolutionProcessor.js';
import { createImageFrame } from '../lib/imageFrame.js';

export default function useConvolutionLab() {
  const [image, setImage] = useState(null);
  const [options, setOptions] = useState(optionsFromPreset);
  const [presetId, setPresetId] = useState('sharpen');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const request = useRef(0);
  const processor = useRef(null);
  const imageLoad = useRef(null);
  const grayInput = useMemo(() => image ? createImageFrame(toGrayscale(image)) : null, [image]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    imageLoad.current = controller;
    loadSampleImage(sampleImages[0], { signal: controller.signal }).then(next => {
      if (active) { setImage(createImageFrame(next)); setStatus('ready'); }
    }).catch(reason => { if (active && reason.name !== 'AbortError') { setError(reason.message); setStatus('error'); } });
    return () => {
      active = false;
      request.current += 1;
      imageLoad.current?.abort();
      processor.current?.dispose();
      processor.current = null;
    };
  }, []);

  const cancelWork = useCallback((releaseInput = false) => {
    request.current += 1;
    processor.current?.cancel({ releaseInput });
    setResult(null); setError('');
  }, []);

  const updateOptions = useCallback((next, id = 'custom') => {
    cancelWork(); setOptions(next); setPresetId(id);
    setStatus(image ? 'ready' : 'error');
  }, [cancelWork, image]);

  const selectImage = useCallback(async (source, isUpload = false) => {
    imageLoad.current?.abort();
    const controller = new AbortController();
    imageLoad.current = controller;
    cancelWork(true); setStatus('loading');
    const id = request.current;
    try {
      const next = await (isUpload ? loadUploadedImage(source, { signal: controller.signal }) : loadSampleImage(source, { signal: controller.signal }));
      if (id !== request.current) return;
      setImage(createImageFrame(next)); setStatus('ready');
    } catch (reason) {
      if (id === request.current && reason.name !== 'AbortError') { setError(reason.message); setStatus(image ? 'ready' : 'error'); }
    }
  }, [cancelWork, image]);

  const apply = useCallback(async () => {
    if (!image || status === 'loading' || status === 'processing') return;
    cancelWork();
    try { validateOptions(options); } catch (reason) { setError(reason.message); setStatus('ready'); return; }
    setStatus('processing');
    const id = request.current;
    try {
      processor.current ??= createConvolutionProcessor(() => new Worker(new URL('../lib/convolution.worker.js', import.meta.url), { type: 'module' }));
      const data = await processor.current.run(image, grayInput, options);
      if (id !== request.current) return;
      setResult({ ...data, color: createImageFrame(data.color), gray: createImageFrame(data.gray), image, grayInput, options: { ...options, kernel: options.kernel.map(row => [...row]) }, presetId });
      setStatus('done');
    } catch (reason) {
      if (id !== request.current || reason.name === 'AbortError') return;
      setError(reason.message || 'Não foi possível iniciar o processamento. Tente novamente.'); setStatus('ready');
    }
  }, [cancelWork, grayInput, image, options, presetId, status]);

  return useMemo(() => ({ image, grayInput, options, presetId, result, status, error, selectImage, updateOptions, apply }), [image, grayInput, options, presetId, result, status, error, selectImage, updateOptions, apply]);
}
