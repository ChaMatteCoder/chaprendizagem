import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function AdalineScatterChart({ dataset, boundary }) {
  return (
    <div className="chart-frame" data-chart="adaline-scatter">
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={boundary} margin={{ top: 18, right: 22, bottom: 8, left: 6 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis
            dataKey="s1"
            domain={['dataMin - 0.2', 'dataMax + 0.2']}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#59615d', fontSize: 12 }}
            type="number"
          />
          <YAxis
            dataKey="boundary"
            domain={['dataMin - 0.3', 'dataMax + 0.3']}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#59615d', fontSize: 12 }}
            type="number"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #ddd5c4',
              boxShadow: '0 12px 30px rgba(28, 38, 35, 0.08)',
            }}
            formatter={(value, name) => [value, name === 'boundary' ? 'Fronteira' : name]}
          />
          <Line dataKey="boundary" dot={false} name="Fronteira de decisão" stroke="#d89b18" strokeWidth={3} />
          {dataset.map((sample, index) => (
            <ReferenceDot
              fill={sample.t === 1 ? '#00575b' : '#8a3ffc'}
              ifOverflow="extendDomain"
              key={`${sample.s1}-${sample.s2}-${sample.s3 ?? 'x'}-${index}`}
              r={6}
              stroke="#ffffff"
              strokeWidth={2}
              x={sample.s1}
              y={sample.s2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
