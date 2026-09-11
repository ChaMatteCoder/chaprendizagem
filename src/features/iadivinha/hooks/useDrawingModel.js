import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDrawingModel } from '../lib/loadDrawingModel.js';
import { CLASS_CATALOG } from '../data/classCatalog.js';
import { createMockDrawingClassifier } from '../lib/mockDrawingClassifier.js';

export default function useDrawingModel(preview = false) {
  const service = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading', classes: [], error: '' });
  useEffect(() => {
    const controller = new AbortController();
    let owned;
    const loading = preview
      ? Promise.resolve({ classes: CLASS_CATALOG, classify: createMockDrawingClassifier(CLASS_CATALOG), dispose() {} })
      : loadDrawingModel(controller.signal);
    loading.then(value => {
      owned = value;
      if (controller.signal.aborted) { value.dispose(); return; }
      service.current = value;
      setState({ status: 'ready', classes: value.classes, error: '' });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error', classes: [], error: 'Não foi possível carregar a IA. Verifique a conexão e tente novamente.' });
    });
    return () => { controller.abort(); service.current = null; owned?.dispose(); };
  }, [attempt, preview]);
  const classify = useCallback((image, options) => {
    if (!service.current) throw new Error('A IA ainda não está pronta.');
    return service.current.classify(image, options);
  }, []);
  function retry() {
    setState({ status: 'loading', classes: [], error: '' });
    setAttempt(value => value + 1);
  }
  return { ...state, classify, retry };
}
