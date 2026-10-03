export function SonarSubmarine() {
  return <img src="/images/sonar/submarine.png" width="1536" height="1024" className="sonarlab-submarine" alt="" aria-hidden="true" />;
}

export function SonarChoiceArt({ label }) {
  return <span className={`sonar-choice-art is-${label}`} aria-hidden="true" />;
}

export function SonarReef() {
  return <svg className="sonarlab-reef" viewBox="0 0 260 230" aria-hidden="true">
    <path d="M0 99q32-38 61 13t62 19 52 47 85 9v43H0" fill="#06445b" />
    <path d="M0 141q37-40 63 18t59 24 70 34h68v13H0" fill="#087487" opacity=".6" />
    <g stroke="#08bdb5" strokeWidth="9" fill="none" strokeLinecap="round">
      <path d="M57 212q-25-48-16-100m16 70q30-34 19-53m-21 70q-38-18-38-53" />
      <path d="M119 224q-19-24-10-63m10 49q24-24 18-53" />
    </g>
    <g stroke="#ff806e" strokeWidth="8" fill="none" strokeLinecap="round">
      <path d="M211 227q-14-51-10-94m6 53q23-21 18-49m-23 52q-20-21-21-42m25 60q26-13 32-32" />
    </g>
    <g fill="#07bcb7"><circle cx="32" cy="78" r="5" /><circle cx="45" cy="56" r="3" /><circle cx="183" cy="115" r="4" /></g>
  </svg>;
}
