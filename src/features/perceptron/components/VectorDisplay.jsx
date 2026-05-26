import { matrixToVector } from '../data/digits.js';

export default function VectorDisplay({ matrix }) {
  const vector = matrixToVector(matrix);

  return (
    <div className="vector-display">
      {vector.map((value, index) => (
        <span className={value === 1 ? 'is-active' : ''} key={`${index}-${value}`}>
          {value}
        </span>
      ))}
    </div>
  );
}
