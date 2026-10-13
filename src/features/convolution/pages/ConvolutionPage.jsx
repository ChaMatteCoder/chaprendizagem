import { useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCheck, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConvolutionHero from '../components/ConvolutionHero.jsx';
import ConvolutionTheory from '../components/ConvolutionTheory.jsx';
import ConvolutionControls from '../components/ConvolutionControls.jsx';
import ConvolutionComparison from '../components/ConvolutionComparison.jsx';
import PixelInspector from '../components/PixelInspector.jsx';
import useConvolutionLab from '../hooks/useConvolutionLab.js';
import '../styles/convolution.css';

function ConvolutionLab() {
  const lab = useConvolutionLab();
  const [view, setView] = useState('both');
  const [selected, setSelected] = useState(null);
  const grayInput = lab.grayInput;
  const pixel = useMemo(() => lab.image ? { x: Math.min(lab.image.width - 1, selected?.x ?? Math.floor(lab.image.width / 2)), y: Math.min(lab.image.height - 1, selected?.y ?? Math.floor(lab.image.height / 2)) } : null, [lab.image, selected]);
  return <>
    <ConvolutionTheory />
    <section id="conv-laboratory" className="conv-section" aria-labelledby="conv-lab-title" tabIndex="-1">
      <div className="section-heading"><p className="eyebrow">Laboratório interativo</p><h2 id="conv-lab-title" tabIndex="-1">Aplicação de filtros</h2><p>Configure a imagem e os pesos, depois aplique o filtro. Alterar a entrada ou um parâmetro prepara uma nova execução.</p></div>
      <ConvolutionControls lab={lab} />
      <div className="conv-status" role="status">{lab.status === 'loading' ? <><LoaderCircle className="conv-spinner" size={18} /> Carregando imagem…</> : lab.status === 'processing' ? <><LoaderCircle className="conv-spinner" size={18} /> Aplicando o kernel em RGB e escala de cinza…</> : lab.result ? <><CheckCheck size={18} /> Convolução concluída. Compare as imagens e explore um pixel.</> : lab.image ? 'Imagem pronta. Aplique a convolução para revelar os resultados.' : 'Escolha um exemplo ou envie uma imagem para começar.'}</div>
      {lab.error && <p className="conv-error" role="alert">{lab.error}</p>}
    </section>
    {lab.image && <ConvolutionComparison processing={lab.status === 'processing'} image={lab.image} grayInput={grayInput} result={lab.result} view={view} onViewChange={setView} selected={pixel} onSelect={setSelected} />}
    {lab.result && <PixelInspector result={lab.result} selected={pixel} onSelect={setSelected} />}
    <section className="conv-assignment"><CheckCheck size={27} /><div><p className="eyebrow">Análise dos resultados</p><h3>Roteiro de experimentação e apresentação</h3><p>Use a mesma entrada para comparar identidade, média, nitidez e Sobel. Em cada execução, registre o kernel, divisor, deslocamento e tratamento de borda. Compare RGB e cinza, selecione um pixel para justificar a resposta e exporte os resultados em PNG.</p><ol className="conv-review-list"><li><strong>Valide:</strong> identidade deve preservar a entrada; média deve suavizar transições.</li><li><strong>Explique:</strong> apresente os produtos de uma vizinhança, sua soma e o valor exibido.</li><li><strong>Compare:</strong> teste Sobel X e Y e observe a orientação das bordas; compare reflexão e zeros nos cantos.</li><li><strong>Conclua:</strong> relacione pesos compartilhados e padrões locais às características aprendidas em CNNs. Percentual de alteração não mede qualidade nem acurácia.</li></ol></div></section>
    <Link className="text-link conv-followup" to="/iadivinha">Explore uma CNN no IAdivinha <ArrowRight size={17} /></Link>
  </>;
}

export default function ConvolutionPage() {
  const content = useRef(null);
  function scrollToLab() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = content.current?.querySelector('#conv-laboratory');
    target?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  }
  return <div className="page conv-page">
    <ConvolutionHero onOpenLab={scrollToLab} />
    <div id="convolution-content" className="conv-content" ref={content} tabIndex="-1"><ConvolutionLab /></div>
  </div>;
}
