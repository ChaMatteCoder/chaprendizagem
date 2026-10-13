export default function ConvolutionLoading() {
  return <div className="conv-loading" role="status">
    <div className="conv-loading__grid" aria-hidden="true">
      {Array.from({ length: 25 }, (_, index) => <i key={index} style={{ '--cell': index }} />)}
      <span className="conv-loading__window" />
    </div>
    <strong>Aplicando convolução…</strong>
    <p>Calculando as respostas em RGB e escala de cinza.</p>
    <div className="conv-loading__track" aria-hidden="true"><span /></div>
  </div>;
}
