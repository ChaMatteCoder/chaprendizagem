import ClassDoodle from './ClassDoodle.jsx';
import { topProbabilities, classById } from '../data/classCatalog.js';

export default function ProbabilityBars({ probabilities }) {
  return <ul className="iad-probabilities" aria-label="Três maiores probabilidades">
    {topProbabilities(probabilities).map((item) => <li key={item.id}>
      <ClassDoodle kind={item.id} /><span>{item.label}</span>
      <span className="iad-probability-track" aria-hidden="true"><span className="iad-probability-fill" style={{ width: `${item.probability * 100}%`, background: classById(item.id)?.color }} /></span>
      <strong>{Math.round(item.probability * 100)}%</strong>
    </li>)}
  </ul>;
}
