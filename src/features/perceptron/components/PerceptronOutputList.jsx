export default function PerceptronOutputList({ outputs, predictedDigit }) {
  return (
    <div className="output-list">
      {outputs.map((item) => {
        const width = `${Math.max(4, ((item.activation + 1) / 2) * 100)}%`;
        return (
          <div className={`output-row ${item.digit === predictedDigit ? 'is-winner' : ''}`} key={item.digit}>
            <span className="output-row__digit">{item.digit}</span>
            <span className="output-row__track">
              <span style={{ width }} />
            </span>
            <strong>{item.activation.toFixed(2)}</strong>
          </div>
        );
      })}
    </div>
  );
}
