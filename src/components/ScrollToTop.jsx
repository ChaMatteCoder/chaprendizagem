import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsVisible(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 520);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  return (
    <button
      aria-label="Voltar ao topo"
      className={`scroll-to-top${isVisible ? ' is-visible' : ''}`}
      onClick={scrollToTop}
      title="Voltar ao topo"
      type="button"
    >
      <ArrowUp size={21} />
    </button>
  );
}
