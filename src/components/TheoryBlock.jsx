export default function TheoryBlock({ title, children }) {
  return (
    <section className="theory-block">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
