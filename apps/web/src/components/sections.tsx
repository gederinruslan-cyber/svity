import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CountUp } from "./CountUp";
import { DeckGallery } from "./DeckGallery";
import { HeroFan } from "./HeroFan";
import { HeroCtas } from "./HeroCtas";
import { HeroQuestions } from "./HeroQuestions";
import { RoomMock } from "./RoomMock";
import { HelpMock } from "./HelpMock";
import { LangWord } from "./LangWord";
import {
  Calendar,
  Check,
  DoorClose,
  Eye,
  Globe,
  Heart,
  Leaf,
  Lifebuoy,
  Cards,
  Lock,
  Mirror,
  Ornament,
  Pen,
  Star4,
} from "./icons";

// [left %, top %, size px] for the gold stars in the hero sky.
const TWINKLES: [number, number, number][] = [
  [6, 18, 9],
  [14, 62, 6],
  [22, 30, 12],
  [31, 82, 7],
  [44, 12, 8],
  [52, 70, 6],
  [58, 26, 10],
  [66, 88, 8],
  [73, 14, 6],
  [81, 52, 12],
  [88, 22, 7],
  [93, 74, 9],
  [37, 46, 6],
  [8, 90, 8],
];
// Indexes into TWINKLES, joined by a faint line that draws itself on load.
const CONSTELLATION = [0, 2, 4, 6, 8, 10, 9];

function Head({
  eyebrow,
  title,
  sub,
  id,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  id: string;
}) {
  return (
    <header className="section-head reveal">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="h2">
        {title}
      </h2>
      <Ornament />
      {sub && <p className="lead">{sub}</p>}
    </header>
  );
}

export async function Hero() {
  const t = await getTranslations("hero");
  return (
    <section className="hero" id="top">
      <div className="hero__sky" aria-hidden="true">
        <span className="cloud cloud--1" />
        <span className="cloud cloud--2" />
        <span className="cloud cloud--3" />
        <svg
          className="constellation"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={CONSTELLATION.map(
              (i) => `${TWINKLES[i]![0]},${TWINKLES[i]![1]}`,
            ).join(" ")}
            pathLength={1}
          />
        </svg>
        {TWINKLES.map(([x, y, s], i) => (
          <span
            key={i}
            className="twinkle"
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${(i * 0.7) % 5}s`,
              } as React.CSSProperties
            }
          >
            <Star4 size={s} />
          </span>
        ))}
      </div>
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="eyebrow reveal">{t("eyebrow")}</p>
          <h1 className="h1 hero__title reveal">{t("title")}</h1>
          <p className="lead hero__lead reveal">{t("sub")}</p>
          <HeroCtas />
          <dl className="hero__facts reveal">
            {(["cards", "questions", "minutes"] as const).map((k) => (
              <div key={k}>
                <dt>{t(`facts.${k}N`)}</dt>
                <dd>{t(`facts.${k}`)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="hero__art">
          <HeroFan label={t("tryCard")} />
          <HeroQuestions />
        </div>
      </div>
    </section>
  );
}

export async function Principles() {
  const t = await getTranslations("principles");
  const tc = await getTranslations("cards");
  const td = await getTranslations("demo");
  const question = (tc.raw("21") as string[])[0];
  const items = [
    [Mirror, t("p1t"), t("p1")],
    [Leaf, t("p2t"), t("p2")],
    [Lock, t("p3t"), t("p3")],
    [Lifebuoy, t("p4t"), t("p4")],
  ] as const;
  return (
    // id="how": the header's and footer's "How it works" links land here.
    <section className="section about" id="how" aria-labelledby="principles-title">
      <div className="container">
        <Head id="principles-title" eyebrow={t("eyebrow")} title={t("title")} sub={t("lead")} />

        {/* How the mirror works: a real card, its question, your answer. */}
        <div className="about__mirror reveal">
          <div className="about__card">
            <Image src="/cards/demo-21.webp" alt={td("cardAlt", { n: 21 })} fill sizes="(max-width: 800px) 46vw, 240px" />
          </div>
          <ol className="about__steps">
            <li>
              <span className="about__n">1</span>
              <div>
                <h3 className="about__t">{t("a1t")}</h3>
                <p>{t("a1")}</p>
              </div>
            </li>
            <li>
              <span className="about__n">2</span>
              <div>
                <h3 className="about__t">{t("a2t")}</h3>
                <p className="about__q">{question}</p>
              </div>
            </li>
            <li>
              <span className="about__n">3</span>
              <div>
                <h3 className="about__t">{t("a3t")}</h3>
                <p>{t("a3")}</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="about__grid">
          {items.map(([Icon, title, body], i) => (
            <article key={i} className="panel glass reveal about__item" style={{ "--d": i } as React.CSSProperties}>
              <span className="about__icon">
                <Icon size={22} />
              </span>
              <h3 className="h3">{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <p className="about__note reveal">
          <Star4 size={10} className="about__note-star" /> {t("mak")}
        </p>
      </div>
    </section>
  );
}

export async function Deck() {
  const t = await getTranslations("deck");
  return (
    <section className="section deck" id="deck" aria-labelledby="deck-title">
      <div className="container">
        <Head
          id="deck-title"
          eyebrow={t("eyebrow")}
          title={t("title")}
          sub={t("sub")}
        />
      </div>
      <DeckGallery />
      <div className="container">
        <div className="deck-features">
          {(
            [
              [Cards, <><CountUp to={117} /> {t("f1t")}</>, t("f1")],
              [Lock, t("f2t"), t("f2")],
              [Globe, t("f3t"), t("f3")],
            ] as const
          ).map(([Icon, title, body], i) => (
            <article key={i} className="deck-feature reveal" style={{ "--d": i } as React.CSSProperties}>
              <span className="about__icon">
                <Icon size={22} />
              </span>
              <h3 className="h3">{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function Diary() {
  const t = await getTranslations("diary");
  // A sample November 2026 (starts on a Sunday; Monday-first grid → 6 leading blanks).
  // Day → gallery image.
  const withCards: Record<number, number> = { 2: 1, 3: 2, 5: 4, 6: 6, 7: 7, 9: 8, 10: 9, 12: 3, 14: 10, 16: 5, 18: 11, 19: 12 };
  const today = 20;
  const lighter = 9;
  const total = Object.keys(withCards).length;
  const weekdays = (t.raw("weekdays") as string[]).slice(0, 7);
  const features = [
    [Cards, t("f1t"), t("f1")],
    [Heart, t("f2t"), t("f2")],
    [Lock, t("f3t"), t("f3")],
  ] as const;
  return (
    <section className="section" id="diary" aria-labelledby="diary-title">
      <div className="container diary">
        <div className="diary__copy">
          <Head id="diary-title" eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />

          {/* A page from the diary. The card's question stays private, even in the sample. */}
          <article className="diary-sample glass reveal">
            <span className="diary-sample__card">
              <Image src="/cards/demo-25.webp" alt="" fill sizes="96px" />
            </span>
            <div className="diary-sample__body">
              <p className="diary-sample__meta">
                <span>
                  {t("entryDate")} · {t("entryCard")}
                </span>
                <Heart size={18} filled className="diary-sample__fav" />
              </p>
              <p className="diary-sample__private">
                <Lock size={14} /> {t("entryPrivate")}
              </p>
              <p className="diary-sample__note">{t("entryNote")}</p>
              <p className="entry__feel">
                <span className="chip chip--sm">{t("entryBefore")}</span>
                <span aria-hidden="true">→</span>
                <span className="chip chip--sm chip--sage">{t("entryAfter")}</span>
              </p>
            </div>
          </article>

          <ul className="diary-features">
            {features.map(([Icon, title, body], i) => (
              <li key={i} className="reveal" style={{ "--d": i } as React.CSSProperties}>
                <span className="about__icon">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="diary-features__t">{title}</p>
                  <p className="diary-features__b">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mosaic glass reveal">
          <p className="mosaic__month">{t("month")}</p>
          <div className="mosaic__grid mosaic__grid--week" aria-hidden="true">
            {weekdays.map((d) => (
              <span key={d} className="mosaic__weekday">
                {d}
              </span>
            ))}
          </div>
          <div className="mosaic__grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: 30 }, (_, i) => {
              const day = i + 1;
              const card = withCards[day];
              return (
                <span
                  key={day}
                  style={{ "--i": day } as React.CSSProperties}
                  className={`mosaic__day ${card ? "has-card" : ""} ${day === today ? "is-today" : ""} ${day > today ? "is-future" : ""}`}
                >
                  {card ? <Image src={`/cards/gallery-${card}.webp`} alt="" fill sizes="48px" /> : day}
                </span>
              );
            })}
          </div>
          <p className="mosaic__count">{t("monthCount", { n: total })}</p>
          <div className="mosaic__lighter">
            <span className="mosaic__bar" aria-hidden="true">
              <span style={{ width: `${(lighter / total) * 100}%` }} />
            </span>
            <span className="mosaic__insight">{t("insight", { n: lighter, total })}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function Shadow() {
  const t = await getTranslations("shadow");
  const steps = (["s1", "s2", "s3", "s4"] as const).map((k) => [t(`${k}t`), t(k)] as const);
  return (
    <section className="section shadow" id="shadow" data-theme="evening" aria-labelledby="shadow-title">
      <div className="container">
        <div className="shadow__grid">
          <div className="shadow__art reveal" aria-hidden="true">
            <Image src="/brand/door.webp" alt="" width={320} height={320} />
          </div>
          <Head id="shadow-title" eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />
        </div>

        {/* The way in: practice, consent, the card, back to the body. */}
        <ol className="shadow-path">
          {steps.map(([title, body], i) => (
            <li key={i} className="reveal" style={{ "--d": i } as React.CSSProperties}>
              <span className="shadow-path__n">{i + 1}</span>
              <h3 className="shadow-path__t">{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>

        <div className="shadow-care glass reveal">
          <div className="shadow-care__modes">
            <p className="shadow-care__label">{t("modesLabel")}</p>
            <div className="shadow-care__chips">
              <span className="chip chip--sm">{t("mode1")}</span>
              <span className="chip chip--sm">{t("mode2")}</span>
              <span className="chip chip--sm">{t("mode3")}</span>
            </div>
          </div>
          <p className="shadow-care__note">
            <Lifebuoy size={20} />
            <span>{t("care")}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

export async function Pros() {
  const t = await getTranslations("pros");
  const steps = (["s1", "s2", "s3"] as const).map((k) => [t(`${k}t`), t(k)] as const);
  const features = [
    [Cards, t("f1t"), t("f1")],
    [Eye, t("f2t"), t("f2")],
    [Star4, t("f3t"), t("f3")],
    [Pen, t("f4t"), t("f4")],
    [Calendar, t("f5t"), t("f5")],
    [Lock, t("f6t"), t("f6")],
  ] as const;
  return (
    <section className="section" id="pros" aria-labelledby="pros-title">
      <div className="container">
        <div className="pros">
          <div>
            <Head id="pros-title" eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />
            <ol className="pros-steps reveal">
              {steps.map(([title, body], i) => (
                <li key={i}>
                  <span className="pros-steps__n">{i + 1}</span>
                  <div>
                    <p className="pros-steps__t">{title}</p>
                    <p className="pros-steps__b">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="pros-cta reveal">
              <a href="#join-pro" className="btn">
                {t("cta")}
              </a>
              <span className="pros-cta__note">{t("beta")}</span>
            </div>
          </div>
          <RoomMock />
        </div>

        <div className="pros-features">
          {features.map(([Icon, title, body], i) => (
            <article key={i} className="deck-feature reveal" style={{ "--d": i % 3 } as React.CSSProperties}>
              <span className="about__icon">
                <Icon size={22} />
              </span>
              <h3 className="h3">{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function Safety() {
  const t = await getTranslations("safety");
  const items = [
    [Lifebuoy, t("s1t"), t("s1")],
    [Leaf, t("s2t"), t("s2")],
    [DoorClose, t("s3t"), t("s3")],
    [Lock, t("s4t"), t("s4")],
  ] as const;
  return (
    <section className="section" id="safety" aria-labelledby="safety-title">
      <div className="container safety">
        <div>
          <Head id="safety-title" eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />
          <ul className="safety__list">
            {items.map(([Icon, title, body], i) => (
              <li key={i} className="reveal" style={{ "--d": i } as React.CSSProperties}>
                <span className="about__icon">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="safety__t">{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <HelpMock />
      </div>
    </section>
  );
}

const LANGS: [string, boolean][] = [
  ["Українська", true],
  ["English", true],
  ["Deutsch", false],
  ["Polski", false],
  ["Čeština", false],
  ["Italiano", false],
  ["Español", false],
  ["Français", false],
];

export async function Languages() {
  const t = await getTranslations("langs");
  const points = [
    [Globe, t("p1t"), t("p1")],
    [Heart, t("p2t"), t("p2")],
    [Cards, t("p3t"), t("p3")],
  ] as const;
  return (
    <section className="section" id="langs" aria-labelledby="langs-title">
      <div className="container langs-wrap">
        <div>
          <Head id="langs-title" eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />
          <ul className="safety__list">
            {points.map(([Icon, title, body], i) => (
              <li key={i} className="reveal" style={{ "--d": i } as React.CSSProperties}>
                <span className="about__icon">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="safety__t">{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="langs-panel glass reveal">
          <LangWord />
          <ul className="langs">
            {LANGS.map(([name, live]) => (
              <li key={name} className={`lang ${live ? "is-live" : ""}`}>
                {name}
                {!live && <span className="lang__soon">{t("soon")}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export async function Faq() {
  const t = await getTranslations("faq");
  const qs = [1, 2, 3, 4, 5, 6, 7] as const;
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="container container--narrow">
        <Head id="faq-title" eyebrow={t("eyebrow")} title={t("title")} />
        <div className="faq reveal">
          {qs.map((n) => (
            <details key={n} className="faq__item">
              <summary>{t(`q${n}`)}</summary>
              <p>{t(`a${n}`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
