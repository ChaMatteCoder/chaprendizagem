export default function StudyStepCard({ icon: Icon, title, description, number }) {
  return (
    <article className="study-step">
      <div className="study-step__icon">
        <Icon size={30} strokeWidth={1.7} />
      </div>
      <div>
        <span>{number}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </article>
  );
}
