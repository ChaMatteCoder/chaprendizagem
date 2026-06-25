import { ImagePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function ImageUploadPanel({ onImageReady, warnings = [] }) {
  const inputRef = useRef(null);
  const objectUrlRef = useRef('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = url;
      setPreview(url);
      onImageReady(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  return (
    <article className="tool-panel handwriting-panel">
      <div className="panel-heading">
        <div>
          <h3>Upload de imagem</h3>
          <p>Use PNG ou JPG com um caractere isolado. A imagem entra no mesmo pipeline da lousa.</p>
        </div>
      </div>
      <button className="upload-dropzone" onClick={() => inputRef.current?.click()} type="button">
        {preview ? <img alt="Preview da imagem enviada" src={preview} /> : <ImagePlus size={34} />}
        <span>{preview ? 'Trocar imagem' : 'Selecionar PNG ou JPG'}</span>
      </button>
      <input accept="image/png,image/jpeg" hidden onChange={handleFileChange} ref={inputRef} type="file" />
      {warnings.length ? (
        <div className="quality-alert">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : (
        <p className="quiet-note">Dica: fotos com papel branco, boa luz e pouco fundo funcionam melhor.</p>
      )}
    </article>
  );
}
