import { useEffect, useRef, useState } from 'react';
import { optionsFromPreset, sampleImages } from '../data/kernels.js';
import { validateOptions } from '../lib/convolution.js';
import { loadSampleImage, loadUploadedImage } from '../lib/imageIO.js';

export default function useConvolutionLab() {
  const [image, setImage] = useState(null);
  const [options, setOptions] = useState(optionsFromPreset);
  const [presetId, setPresetId] = useState('sharpen');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const request = useRef(0);
  const worker = useRef(null);

  useEffect(() => {
    let active = true;
    loadSampleImage(sampleImages[0]).then(next => {
      if (active) { setImage(next); setStatus('ready'); }
    }).catch(reason => { if (active) { setError(reason.message); setStatus('error'); } });
    return () => { active = false; request.current += 1; worker.current?.terminate(); };
  }, []);

  function cancelWork() {
    request.current += 1;
    worker.current?.terminate(); worker.current = null;
    setResult(null); setError('');
  }

  function updateOptions(next, id = 'custom') {
    cancelWork(); setOptions(next); setPresetId(id);
    setStatus(image ? 'ready' : 'error');
  }

  async function selectImage(source, isUpload = false) {
    cancelWork(); setStatus('loading');
    const id = request.current;
    try {
      const next = await (isUpload ? loadUploadedImage(source) : loadSampleImage(source));
      if (id !== request.current) return;
      setImage(next); setStatus('ready');
    } catch (reason) {
      if (id === request.current) { setError(reason.message); setStatus(image ? 'ready' : 'error'); }
    }
  }

  function apply() {
    if (!image) return;
    cancelWork();
    try { validateOptions(options); } catch (reason) { setError(reason.message); setStatus('ready'); return; }
    setStatus('processing');
    const id = request.current;
    try {
      const current = new Worker(new URL('../lib/convolution.worker.js', import.meta.url), { type: 'module' });
      worker.current = current;
      current.onmessage = ({ data }) => {
        if (id !== request.current) return;
        current.terminate(); worker.current = null;
        if (data.error) { setError(data.error); setStatus('ready'); }
        else { setResult({ ...data, image, options: { ...options, kernel: options.kernel.map(row => [...row]) }, presetId }); setStatus('done'); }
      };
      current.onerror = () => {
        if (id !== request.current) return;
        current.terminate(); worker.current = null;
        setError('O processamento falhou. Tente aplicar novamente.'); setStatus('ready');
      };
      current.postMessage({ image, options });
    } catch {
      setError('Não foi possível iniciar o processamento. Tente novamente.'); setStatus('ready');
    }
  }

  return { image, options, presetId, result, status, error, selectImage, updateOptions, apply };
}
