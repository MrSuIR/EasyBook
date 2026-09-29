import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, LoaderCircle, Quote, Star } from "lucide-react";

import { loadGuestImpressions } from "../guestImpressions.js";
import "../styles/guest-impressions.css";

const reviewDate = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric", month: "long", year: "numeric",
});

function Impression({ review, hotel, dates, index, total }) {
  const [expanded, setExpanded] = useState(false);
  const params = new URLSearchParams({ date_from: dates.date_from, date_to: dates.date_to });
  const longComment = review.comment.length > 240;
  return (
    <article className="impression-card" role="group" aria-roledescription="слайд" aria-label={`Отзыв ${index + 1} из ${total}`}>
      <div className="impression-rating">
        <span role="img" aria-label={`Оценка ${review.rating} из 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Star key={index} size={16} fill={index < review.rating ? "currentColor" : "none"} aria-hidden="true" />
          ))}
        </span>
        <time dateTime={review.created_at}>{reviewDate.format(new Date(review.created_at))}</time>
      </div>
      <Quote className="impression-quote-icon" size={32} strokeWidth={1.25} aria-hidden="true" />
      <blockquote className={expanded || !longComment ? "expanded" : ""}>
        <p>{review.comment}</p>
      </blockquote>
      {longComment && (
        <button className="impression-expand" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Свернуть" : "Читать полностью"}
        </button>
      )}
      <div className="impression-author">
        <span>{review.author_first_name || "Гость отеля"}</span>
      </div>
      <a className="impression-hotel" href={`/hotels/${hotel.id}?${params}`}>
        {hotel.image && <img src={hotel.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
        <span><strong>{hotel.title}</strong><small>{hotel.location}</small></span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </a>
    </article>
  );
}

function ImpressionsCarousel({ items, dates }) {
  const trackRef = useRef(null);
  const [position, setPosition] = useState({ atStart: true, atEnd: true });

  useEffect(() => {
    const track = trackRef.current;
    const update = () => {
      setPosition({
        atStart: track.scrollLeft <= 2,
        atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", update);
    };
  }, [items]);

  const move = (direction) => {
    const track = trackRef.current;
    const step = track.children[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
    track.scrollBy({ left: direction * step, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return (
    <div className="impressions-carousel" role="region" aria-roledescription="карусель" aria-label="Отзывы гостей">
      <div
        id="impressions-track"
        className="impressions-grid"
        ref={trackRef}
        tabIndex={0}
        aria-label="Используйте стрелки влево и вправо для переключения отзывов"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }}
      >
        {items.map(({ review, hotel }, index) => <Impression key={review.id} review={review} hotel={hotel} dates={dates} index={index} total={items.length} />)}
      </div>
      <div className="impressions-controls">
        <div className="impressions-arrows">
          <button type="button" aria-label="Предыдущий отзыв" aria-controls="impressions-track" disabled={position.atStart} onClick={() => move(-1)}><ArrowLeft size={20} aria-hidden="true" /></button>
          <button type="button" aria-label="Следующий отзыв" aria-controls="impressions-track" disabled={position.atEnd} onClick={() => move(1)}><ArrowRight size={20} aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  );
}

export default function GuestImpressions({ hotels, dates, catalogLoading, catalogError }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: "", items: [], error: false, partialError: false });
  const key = `${hotels.map((hotel) => hotel.id).join(",")}:${attempt}`;

  useEffect(() => {
    if (catalogLoading || catalogError) return undefined;
    const controller = new AbortController();
    loadGuestImpressions(hotels, { signal: controller.signal })
      .then((result) => setState({ key, ...result, error: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ key, items: [], error: true, partialError: false });
      });
    return () => controller.abort();
  }, [hotels, key, catalogLoading, catalogError]);

  const pending = catalogLoading || state.key !== key;
  const retry = <button type="button" onClick={() => setAttempt((value) => value + 1)}>Попробовать ещё раз <ArrowUpRight size={16} /></button>;

  return (
    <section id="reviews" className="guest-impressions" aria-labelledby="impressions-heading">
      <div className="impressions-inner">
        <header className="impressions-heading">
          <div>
            <p className="eyebrow">Путешествия остаются с нами</p>
            <h2 id="impressions-heading">Впечатления<br />после поездки</h2>
          </div>
        </header>
        {catalogError ? (
          <div className="impressions-state" role="status">
            <p>Отзывы сейчас недоступны. Попробуйте повторить поиск отелей.</p>
            <a href="#catalog">Вернуться к поиску <ArrowUpRight size={16} /></a>
          </div>
        ) : pending ? (
          <div className="impressions-state" role="status"><LoaderCircle className="spin" /><p>Загружаем впечатления гостей…</p></div>
        ) : state.error ? (
          <div className="impressions-state" role="status"><p>Не удалось загрузить отзывы гостей.</p>{retry}</div>
        ) : !state.items.length ? (
          <div className="impressions-state" role="status">
            <p>{state.partialError ? "Часть отзывов сейчас недоступна." : "В этой подборке пока нет отзывов."}</p>
            {state.partialError ? retry : <a href="#catalog">Выбрать другое направление <ArrowUpRight size={16} /></a>}
          </div>
        ) : (
          <>
            <ImpressionsCarousel key={state.key} items={state.items} dates={dates} />
            {state.partialError && <div className="impressions-bottom" role="status"><span>Часть отзывов не загрузилась.</span>{retry}</div>}
          </>
        )}
      </div>
    </section>
  );
}
