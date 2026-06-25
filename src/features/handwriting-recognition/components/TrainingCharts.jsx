import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useEffect, useRef, useState } from 'react';

function ChartCard({ children, description, title }) {
  return (
    <article className="regression-chart-card handwriting-chart-card">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="chart-frame">{children}</div>
    </article>
  );
}

export default function TrainingCharts({ history = [] }) {
  const [visible, setVisible] = useState(false);
  const chartRef = useRef(null);
  const data = history.length ? history : [{ epoch: 0, loss: 0, accuracy: 0 }];

  useEffect(() => {
    const target = chartRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`handwriting-chart-grid ${visible ? 'is-visible' : ''}`} ref={chartRef}>
      <ChartCard description="Entropia cruzada categórica calculada a cada época." title="Loss por época">
        <ResponsiveContainer height={280} width="100%">
          <LineChart data={data} margin={{ top: 14, right: 24, bottom: 38, left: 48 }}>
            <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
            <XAxis dataKey="epoch" tick={{ fill: '#59615d', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#59615d', fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip />
            <Line dataKey="loss" dot={false} stroke="#c65f45" strokeWidth={3} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard description="Percentual de exemplos classificados corretamente no subconjunto didático." title="Acurácia por época">
        <ResponsiveContainer height={280} width="100%">
          <LineChart data={data} margin={{ top: 14, right: 24, bottom: 38, left: 48 }}>
            <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
            <XAxis dataKey="epoch" tick={{ fill: '#59615d', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 1]} tick={{ fill: '#59615d', fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
            <Line dataKey="accuracy" dot={false} stroke="#00575b" strokeWidth={3} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
