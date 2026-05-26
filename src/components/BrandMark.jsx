import { FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BrandMark() {
  return (
    <Link className="brand" to="/" aria-label="Ir para a página inicial">
      <span className="brand__icon">
        <FlaskConical size={28} strokeWidth={1.8} />
      </span>
      <span>
        <strong>Chaprendizagem</strong>
        <small>Laboratório de Aprendizagem de Máquina</small>
      </span>
    </Link>
  );
}
