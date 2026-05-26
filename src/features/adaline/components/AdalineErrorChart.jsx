import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function AdalineErrorChart({ data }) {
  return (
    <div className="chart-frame adaline-error-chart" data-chart="adaline-error">
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={data} margin={{ top: 18, right: 22, bottom: 8, left: 6 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis dataKey="epoch" tickLine={false} axisLine={false} tick={{ fill: '#59615d', fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#59615d', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #ddd5c4',
              boxShadow: '0 12px 30px rgba(28, 38, 35, 0.08)',
            }}
            formatter={(value) => [value, 'Erro quadrático total']}
            labelFormatter={(value) => `Época ${value}`}
          />
          <Line type="monotone" dataKey="error" name="Erro" stroke="#00575b" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
