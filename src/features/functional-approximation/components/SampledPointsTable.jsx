import { Plus, Trash2 } from 'lucide-react';

export default function SampledPointsTable({ onAddPoint, onRemovePoint, onUpdatePoint, rows }) {
  return (
    <section className="tool-panel">
      <div className="panel-heading">
        <div>
          <h2>Base amostrada</h2>
          <p>Valores editaveis de x e t</p>
        </div>
        <button className="button button--ghost compact-button" onClick={onAddPoint} type="button">
          <Plus size={16} /> Ponto
        </button>
      </div>
      <div className="table-wrap functional-table-wrap">
        <table className="results-table editable-table">
          <thead>
            <tr>
              <th>#</th>
              <th>x</th>
              <th>t</th>
              <th aria-label="Acoes" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>
                  <input
                    onChange={(event) => onUpdatePoint(row.id, 'x', event.target.value)}
                    step="0.0001"
                    type="number"
                    value={row.x}
                  />
                </td>
                <td>
                  <input
                    onChange={(event) => onUpdatePoint(row.id, 't', event.target.value)}
                    step="0.0001"
                    type="number"
                    value={row.t}
                  />
                </td>
                <td>
                  <button className="table-action" onClick={() => onRemovePoint(row.id)} title="Remover ponto" type="button">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
