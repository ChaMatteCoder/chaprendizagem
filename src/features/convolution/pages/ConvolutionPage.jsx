import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCheck, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConvolutionHero from '../components/ConvolutionHero.jsx';
import ConvolutionTheory from '../components/ConvolutionTheory.jsx';
import ConvolutionControls from '../components/ConvolutionControls.jsx';
import ConvolutionComparison from '../components/ConvolutionComparison.jsx';
import PixelInspector from '../components/PixelInspector.jsx';
import useConvolutionLab from '../hooks/useConvolutionLab.js';
import { toGrayscale } from '../lib/convolution.js';
import '../styles/convolution.css';

function ConvolutionLab() {
  const lab = useConvolutionLab();
  const [view, setView] = useState('both');
  const [selected, setSelected] = useState(null);
  const grayInput = useMemo(() => lab.image ? toGrayscale(lab.image) : null, [lab.image]);
  const pixel = lab.image ? { x: Math.min(lab.image.width - 1, selected?.x ?? Math.floor(lab.image.width / 2)), y: Math.min(lab.image.height - 1, selected?.y ?? Math.floor(lab.image.height / 2)) } : null;
  return <>
    <ConvolutionTheory />
    <section className="conv-section" aria-labelledby="conv-lab-title">
      <div className="section-heading"><p className="eyebrow">Laboratório interativo</p><h2 id="conv-lab-title" tabIndex="-1">Escolha. Transforme. Compare.</h2><p>Configure a imagem e os pesos, depois aplique o filtro. Alterar a entrada ou um parâmetro prepara uma nova execução.</p></div>
      <ConvolutionControls lab={lab} />
      <div className="conv-status" role="status">{lab.status === 'loading' ? <><LoaderCircle className="conv-spinner" size={18} /> Carregando imagem…</> : lab.status === 'processing' ? <><LoaderCircle className="conv-spinner" size={18} /> Aplicando o kernel em RGB e escala de cinza…</> : lab.result ? <><CheckCheck size={18} /> Convolução concluída. Compare as imagens e explore um pixel.</> : lab.image ? 'Imagem pronta. Aplique a convolução para revelar os resultados.' : 'Escolha um exemplo ou envie uma imagem para começar.'}</div>
      {lab.error && <p className="conv-error" role="alert">{lab.error}</p>}
    </section>
    {lab.image && <ConvolutionComparison image={lab.image} grayInput={grayInput} result={lab.result} view={view} onViewChange={setView} selected={pixel} onSelect={setSelected} />}
    {lab.result && <PixelInspector result={lab.result} selected={pixel} onSelect={setSelected} />}
    <section className="conv-assignment"><CheckCheck size={27} /><div><p className="eyebrow">Trabalho 05 · Roteiro de estudo</p><h3>Do enunciado à experimentação.</h3><p>Aplique um filtro em uma imagem colorida e em uma imagem em escala de cinza. Compare cada resultado com sua entrada, exporte os PNGs e explique como os pesos mudaram os pixels. Experimente média, nitidez e Sobel para observar efeitos diferentes.</p></div></section>
    <Link className="text-link conv-followup" to="/iadivinha">Explore uma CNN no IAdivinha <ArrowRight size={17} /></Link>
  </>;
}

export default function ConvolutionPage() {
  const [isOpen, setIsOpen] = useState(false);
  const content = useRef(null);
  function scrollToLab() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    content.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    content.current?.focus({ preventScroll: true });
  }
  useEffect(() => { if (isOpen) scrollToLab(); }, [isOpen]);
  return <div className="page conv-page">
    <ConvolutionHero isOpen={isOpen} onOpenLab={() => { if (isOpen) scrollToLab(); else setIsOpen(true); }} />
    {isOpen && <div id="convolution-content" className="conv-content" ref={content} tabIndex="-1"><ConvolutionLab /></div>}
  </div>;
}
