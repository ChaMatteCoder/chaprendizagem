export default function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="metric-card">
      {Icon ? <Icon size={24} strokeWidth={1.8} /> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
