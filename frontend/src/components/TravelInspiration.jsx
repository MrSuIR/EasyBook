import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";

import "../styles/travel-inspiration.css";

const escapes = [
  {
    title: "К морю",
    description: "Сменить городской шум на шум волн. И никуда не спешить.",
    image: "/images/travel-sea.jpg",
    imageAlt: "Деревянные бунгало над прозрачной морской водой",
    caption: "Солнце. Вода. Никаких дел.",
    destinations: ["Сочи", "Мальдивы"],
  },
  {
    title: "В город на выходные",
    description: "Гулять по новым улицам, пробовать местное и находить своё.",
    image: "/images/travel-city.jpg",
    imageAlt: "Исторический кирпичный фасад на городской улице",
    caption: "Новый город — новая история",
    destinations: ["Санкт-Петербург", "Казань", "Стамбул"],
  },
  {
    title: "Ближе к природе",
    description: "Больше воздуха, меньше планов. Время просто выдохнуть.",
    image: "/images/travel-nature.jpg",
    imageAlt: "Уютные домики для отдыха у зелёного леса",
    caption: "Наедине с большим миром",
    destinations: ["Байкал"],
  },
];

export default function TravelInspiration({ onDestination }) {
  const sectionRef = useRef(null);
  const backgroundRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const background = backgroundRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const forcedColors = window.matchMedia("(forced-colors: active)");
    let frame = 0;
    let visible = false;

    const update = () => {
      frame = 0;
      if (reducedMotion.matches || forcedColors.matches) {
        background.style.transform = "none";
        return;
      }
      const bounds = section.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height)),
      );
      const amplitude = (window.innerWidth <= 720 ? 28 : 80) * 1.1;
      background.style.transform = `translate3d(0, ${(1 - 2 * progress) * amplitude}px, 0)`;
    };
    const schedule = () => {
      if (visible && !frame) frame = window.requestAnimationFrame(update);
    };
    const reset = () => {
      update();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", reset);
    forcedColors.addEventListener("change", reset);
    update();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", reset);
      forcedColors.removeEventListener("change", reset);
    };
  }, []);

  return (
    <section className="travel-inspiration" ref={sectionRef} aria-labelledby="travel-heading">
      <div className="travel-background" ref={backgroundRef} aria-hidden="true" />
      <div className="travel-overlay" aria-hidden="true" />
      <div className="travel-content">
        <header className="travel-heading">
          <p className="eyebrow">Планы могут подождать</p>
          <h2 id="travel-heading">Куда хочется сбежать?</h2>
          <p>Начните с настроения. Место найдётся.</p>
        </header>
        <div className="travel-grid">
          {escapes.map(({ title, description, image, imageAlt, caption, destinations }) => (
            <article className="travel-card" key={title}>
              <img className="travel-card-image" src={image} alt={imageAlt} loading="lazy" />
              <div className="travel-card-shade" aria-hidden="true" />
              <div className="travel-card-topline">
                <span>{caption}</span>
              </div>
              <div className="travel-card-copy">
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="travel-destinations">
                  {destinations.map((destination) => (
                    <button type="button" key={destination} onClick={() => onDestination(destination)}>
                      {destination}
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
