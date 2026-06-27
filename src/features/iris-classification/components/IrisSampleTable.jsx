import { memo } from 'react';
function IrisSampleTable({ dataset }) {
  return (
    <section className="wide-panel iris-table-section reveal-up">
      <div className="section-heading">
        <p className="eyebrow">Amostras do dataset</p>
        <h2>Registros usados no treinamento.</h2>
        <p>A tabela exibe uma prévia das 150 flores carregadas localmente no front-end.</p>
      </div>
      <div className="iris-table-wrap">
        <table className="iris-sample-table">
          <thead>
            <tr>
              <th>Sepal length</th>
              <th>Sepal width</th>
              <th>Petal length</th>
              <th>Petal width</th>
              <th>Espécie</th>
            </tr>
          </thead>
          <tbody>
            {dataset.slice(0, 18).map((row, index) => (
              <tr key={`${row.species}-${index}`}>
                <td>{row.sepalLength.toFixed(1)}</td>
                <td>{row.sepalWidth.toFixed(1)}</td>
                <td>{row.petalLength.toFixed(1)}</td>
                <td>{row.petalWidth.toFixed(1)}</td>
                <td>{row.species}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default memo(IrisSampleTable);
