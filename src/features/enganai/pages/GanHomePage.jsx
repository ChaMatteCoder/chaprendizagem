import { ArrowRight, FlaskConical, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Character, PixelPreview } from "../components/GanUI.jsx";

export default function GanHomePage() {
  return (
    <section className="gan-home-stage" aria-labelledby="gan-home-title">
      <div className="gan-home-center">
        <p className="gan-home-overline">
          UM ATELIÊ. DUAS RIVAIS. MUITAS DESCOBERTAS.
        </p>
        <h1 id="gan-home-title" className="gan-wordmark" tabIndex={-1}>
          enGAN<span>.AI</span>
        </h1>
        <p className="gan-ribbon">A GUERRA DOS PIXELS</p>
        <div className="gan-home-pitch">
          <p>Uma cria. A outra investiga.</p>
          <p>E você entra nessa disputa.</p>
        </div>
        <Link
          className="gan-button is-primary gan-start-button"
          to="/enganai/missoes"
        >
          <Play size={25} fill="currentColor" />
          Começar missão
          <ArrowRight size={20} />
        </Link>
        <Link className="gan-home-lab-link" to="/enganai/lab">
          <FlaskConical size={19} />
          Explorar o GANLab
        </Link>
        <p className="gan-home-availability">
          <span />
          Aquecimento disponível · experimento em preparação
        </p>
      </div>
      <div className="gan-home-actor gan-home-fifi">
        <Character name="fifi" fetchPriority="high" />
        <span className="gan-name-tag">
          <strong>Fifi</strong>
          <span>Gerador</span>
        </span>
      </div>
      <div className="gan-home-actor gan-home-lupa">
        <Character name="lupa" fetchPriority="high" />
        <span className="gan-name-tag">
          <strong>Lupa</strong>
          <span>Discriminador</span>
        </span>
      </div>
      <div className="gan-table-evidence" aria-hidden="true">
        <div className="gan-loose-photo">
          <PixelPreview kind={0} />
          <span>estudo de pixels</span>
        </div>
        <div className="gan-projector">
          <span />
          <PixelPreview kind={0} />
        </div>
        <div className="gan-loose-photo">
          <PixelPreview kind={2} />
          <span>28 × 28</span>
        </div>
      </div>
      <p className="gan-home-signature">Engana aí. Aprende aqui.</p>
    </section>
  );
}
