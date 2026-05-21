export default function MatrixGrid({ matrix, onToggle, compact = false, label = 'Matriz 5 por 4' }) {
  return (
    <div className={`matrix-grid ${compact ? 'matrix-grid--compact' : ''}`} role="group" aria-label={label}>
      {matrix.map((row, rowIndex) =>
        row.map((value, columnIndex) => {
          const active = value === 1;
          return (
            <button
              className={`matrix-cell ${active ? 'is-active' : ''}`}
              disabled={!onToggle}
              key={`${rowIndex}-${columnIndex}`}
              onClick={() => onToggle?.(rowIndex, columnIndex)}
              type="button"
              aria-label={`Linha ${rowIndex + 1}, coluna ${columnIndex + 1}: ${active ? 1 : -1}`}
            >
              {active ? 1 : -1}
            </button>
          );
        }),
      )}
    </div>
  );
}
